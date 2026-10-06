import hashlib
import http.client
import io
import json
import tempfile
import threading
import time
import unittest
import zipfile
from pathlib import Path
import release
try:
    import receiver
except ImportError:
    receiver = None


class ReceiverTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(receiver, 'HTTP receiver implementation missing')
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.key = b'k' * 32
        self.server = receiver.make_server(self.root, self.key, 'http://127.0.0.1:1', port=0,
                                          probe=lambda hashes: None)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop)
        self.meta = dict(repository=release.REPOSITORY, ref='refs/heads/main', sha='c' * 40,
                         event='push', timestamp=int(time.time()), run_number=1, run_attempt=1, deployment_id='12')
        out = io.BytesIO()
        with zipfile.ZipFile(out, 'w') as archive:
            archive.writestr('index.html', b'<html>receiver test</html>')
        self.body = out.getvalue()

    def stop(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(3)

    def send(self, method='POST', path='/_deploy', headers=None):
        signed = release.signed_headers(self.key, self.meta, self.body)
        values = {'Content-Type': 'application/zip', 'X-TG-Metadata': signed['metadata'],
                  'X-TG-Signature': signed['signature'], 'Content-Length': str(len(self.body))}
        values.update(headers or {})
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=3)
        self.addCleanup(conn.close)
        conn.request(method, path, self.body, values)
        response = conn.getresponse()
        return response.status, response.read()

    def test_signed_http_publish_and_retry(self):
        self.assertEqual(self.send()[0], 200)
        self.assertEqual(json.loads(self.send()[1])['status'], 'idempotent')

    def test_exact_path_method_and_header_validation(self):
        for method, path, headers in [('GET', '/_deploy', {}), ('POST', '/_deploy/', {}),
                                      ('POST', '/_deploy?x', {}), ('POST', '/', {}),
                                      ('POST', '/_deploy', {'Content-Type': 'text/plain'}),
                                      ('POST', '/_deploy', {'Transfer-Encoding': 'chunked'}),
                                      ('POST', '/_deploy', {'Content-Length': '-1'}),
                                      ('POST', '/_deploy', {'Content-Length': str(release.MAX_UPLOAD + 1)}),
                                      ('POST', '/_deploy', {'X-TG-Signature': '0' * 64})]:
            with self.subTest(method=method, path=path, headers=headers):
                self.assertGreaterEqual(self.send(method, path, headers)[0], 400)
        self.assertFalse((self.root / 'current').exists())

    def raw_request(self, extra='', signature=None, metadata=None):
        signed = release.signed_headers(self.key, self.meta, self.body)
        return (f'POST /_deploy HTTP/1.1\r\nHost: localhost\r\n'
                f'Content-Type: application/zip\r\nContent-Length: {len(self.body)}\r\n'
                f'X-TG-Metadata: {signed["metadata"] if metadata is None else metadata}\r\n'
                f'X-TG-Signature: {signed["signature"] if signature is None else signature}\r\n'
                f'{extra}\r\n').encode()

    def test_malformed_auth_headers_rejected_before_body_read(self):
        import base64
        import socket
        from unittest.mock import patch
        malformed_meta = base64.b64encode(json.dumps({**self.meta, 'run_number': True}).encode()).decode()
        for values in ({'signature': 'bad'}, {'metadata': '!not-base64!'},
                       {'metadata': 'A' * 2049}, {'metadata': malformed_meta},
                       {'metadata': base64.b64encode(b'[]').decode()}):
            with self.subTest(values=values), patch.object(receiver, 'REQUEST_TIMEOUT', 2):
                with socket.create_connection(self.server.server_address, timeout=0.6) as conn:
                    conn.sendall(self.raw_request(**values))
                    try:
                        response = conn.recv(4096)
                    except socket.timeout:
                        self.fail('malformed headers waited for the upload body')
                    self.assertIn(b' 400 ', response)
        self.assertFalse((self.root / 'current').exists())

    def test_absolute_deadline_stops_header_and_body_trickle_then_valid_deploy(self):
        import socket
        from unittest.mock import patch
        for phase in ('headers', 'body'):
            with self.subTest(phase=phase), patch.object(receiver, 'REQUEST_TIMEOUT', 0.25):
                stopped = threading.Event()
                with socket.create_connection(self.server.server_address, timeout=2) as conn:
                    prefix = b'POST /_deploy HTTP/1.1\r\nX-Slow: ' if phase == 'headers' else self.raw_request()
                    conn.sendall(prefix)
                    def trickle():
                        try:
                            for _ in range(40):
                                if stopped.wait(0.04):
                                    return
                                conn.sendall(b'x')
                        except OSError:
                            pass
                    sender = threading.Thread(target=trickle)
                    sender.start()
                    try:
                        time.sleep(0.06)
                        started = time.monotonic()
                        self.assertEqual(self.send()[0], 200)
                        self.assertLess(time.monotonic() - started, 0.9,
                                        'trickle held the single receiver past its absolute deadline')
                        conn.settimeout(0.6)
                        response = conn.recv(4096)
                        self.assertNotIn(b' 200 ', response)
                    finally:
                        stopped.set()
                        sender.join(2)

    def test_duplicate_header_and_truncated_body_rejected(self):
        import socket
        for extra, body in [('Content-Length: 1\r\n', self.body),
                            ('X-TG-Signature: ' + '0' * 64 + '\r\n', self.body),
                            ('', self.body[:5])]:
            with self.subTest(extra=extra), socket.create_connection(self.server.server_address, timeout=2) as conn:
                conn.sendall(self.raw_request(extra=extra) + body)
                conn.shutdown(socket.SHUT_WR)
                self.assertIn(b' 400 ', conn.recv(4096))
        self.assertFalse((self.root / 'current').exists())

    def test_deadline_cancelled_before_probe_and_no_reused_connection(self):
        from unittest.mock import patch
        real_publish = receiver.publish
        def delayed(*args, **kwargs):
            time.sleep(0.35)
            return real_publish(*args, **kwargs)
        with patch.object(receiver, 'REQUEST_TIMEOUT', 0.2), patch.object(receiver, 'publish', side_effect=delayed):
            status, body = self.send()
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(body)['status'], 'published')
        self.assertEqual(self.send()[0], 200)

    def test_deadline_expiring_during_cancellation_never_publishes(self):
        from unittest.mock import patch
        # Deterministically model a callback already scheduled as cancellation
        # starts, after the body read completed. Joining alone is insufficient.
        class RacingTimer:
            def __init__(self, interval, callback):
                self.callback = callback
                self.fired = False
            def start(self):
                pass
            def cancel(self):
                if not self.fired:
                    self.fired = True
                    self.callback()
            def join(self):
                pass
        with patch.object(receiver.threading, 'Timer', RacingTimer), \
                patch.object(receiver, 'publish') as publish:
            try:
                self.send()
            except (OSError, http.client.RemoteDisconnected):
                pass
            publish.assert_not_called()
        self.assertFalse((self.root / 'current').exists())
        self.assertEqual(self.send()[0], 200)

    def test_timers_joined_and_pipelined_connection_not_reused(self):
        import socket
        from unittest.mock import patch
        timers = []
        real_timer = threading.Timer
        def timer(*args, **kwargs):
            result = real_timer(*args, **kwargs)
            timers.append(result)
            return result
        with patch.object(receiver.threading, 'Timer', side_effect=timer):
            with socket.create_connection(('127.0.0.1', self.server.server_port), timeout=2) as conn:
                conn.sendall((self.raw_request() + self.body) * 2)
                response = b''
                while True:
                    chunk = conn.recv(4096)
                    if not chunk:
                        break
                    response += chunk
            self.assertEqual(response.count(b'HTTP/1.0 200'), 1)
            self.assertEqual(self.send()[0], 200)
        self.assertTrue(timers)
        self.assertTrue(all(not timer.is_alive() for timer in timers))

    def test_hmac_verified_before_archive_parsing(self):
        from unittest.mock import patch
        with patch.object(release, 'validate_archive', side_effect=AssertionError('must not parse')) as parse:
            self.assertEqual(self.send(headers={'X-TG-Signature': '0' * 64})[0], 400)
            parse.assert_not_called()

    def test_probe_hash_mismatch_and_404(self):
        from http.server import BaseHTTPRequestHandler, HTTPServer
        from urllib.error import HTTPError
        class Origin(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(404 if self.path == '/missing' else 200)
                self.end_headers()
                self.wfile.write(b'wrong content')
            def log_message(self, *args):
                pass
        server = HTTPServer(('127.0.0.1', 0), Origin)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            origin = f'http://127.0.0.1:{server.server_port}'
            with self.assertRaisesRegex(OSError, 'origin hash mismatch'):
                receiver.origin_probe(origin, {'index.html': hashlib.sha256(b'expected').hexdigest()})
            digest = hashlib.sha256(b'wrong content').hexdigest()
            with self.assertRaises(HTTPError) as raised:
                receiver.origin_probe(origin, {'index.html': digest, 'missing': digest})
            self.assertEqual(raised.exception.code, 404)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(3)


if __name__ == '__main__':
    unittest.main()
