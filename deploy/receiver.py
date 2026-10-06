"""Single-request loopback receiver; run behind an exact edge-only proxy route."""
import argparse
import fcntl
import hashlib
import json
import re
import socket
import stat
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from release import MAX_MEMBER, MAX_UPLOAD, Rejected, publish, recover, validate_headers

REQUEST_TIMEOUT = 15
PROBE_TIMEOUT = 3


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def origin_probe(origin, hashes):
    if not re.fullmatch(r'http://127\.0\.0\.1:[0-9]{1,5}', origin):
        raise ValueError('origin must be host loopback')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    # Root must match index (no SPA-fallback false positives), then every artifact.
    for name, digest in [('', hashes['index.html']), *hashes.items()]:
        request = urllib.request.Request(origin + '/' + name, headers={'Cache-Control': 'no-cache'})
        with opener.open(request, timeout=PROBE_TIMEOUT) as response:
            data = response.read(MAX_MEMBER + 1)
            if response.status != 200 or hashlib.sha256(data).hexdigest() != digest:
                raise OSError('origin hash mismatch')


def make_server(root, key, origin, port=9123, probe=None):
    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(REQUEST_TIMEOUT)

        def expire_request(self):
            # Inactivity timeouts do not stop a continuously fed buffered read.
            self.expired.set()
            try:
                self.connection.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass

        def stop_deadline(self):
            self.deadline.cancel()
            self.deadline.join()

        def handle(self):
            self.expired = threading.Event()
            self.deadline = threading.Timer(REQUEST_TIMEOUT, self.expire_request)
            self.deadline.daemon = True
            self.deadline.start()
            try:
                # Exactly one request per socket: no timer can affect reuse.
                self.handle_one_request()
            except OSError:
                pass
            finally:
                self.close_connection = True
                self.stop_deadline()

        def log_message(self, format, *args):
            # No headers, request bodies, secrets or artifact-controlled text in logs.
            pass

        def respond(self, code, payload):
            self.stop_deadline()
            body = json.dumps(payload).encode()
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Connection', 'close')
            self.end_headers()
            self.wfile.write(body)
            self.close_connection = True

        def send_error(self, code, message=None, explain=None):
            # Parser errors must not echo attacker-controlled request text.
            self.respond(code, {'status': 'rejected'})

        def do_GET(self):
            self.respond(405, {'status': 'rejected'})

        do_HEAD = do_GET
        do_PUT = do_GET
        do_DELETE = do_GET
        do_OPTIONS = do_GET
        do_PATCH = do_GET

        def do_POST(self):
            try:
                if self.path != '/_deploy':
                    self.respond(404, {'status': 'rejected'})
                    return
                required = ('Content-Length', 'Content-Type', 'X-TG-Metadata', 'X-TG-Signature')
                if any(len(self.headers.get_all(name, [])) != 1 for name in required):
                    raise Rejected('headers')
                length = self.headers['Content-Length']
                if (self.headers.get('Transfer-Encoding') is not None
                        or self.headers.get('Content-Encoding') is not None
                        or self.headers['Content-Type'] != 'application/zip'
                        or not re.fullmatch(r'[1-9][0-9]{0,8}', length)
                        or int(length) > MAX_UPLOAD):
                    raise Rejected('headers')
                headers = {'metadata': self.headers['X-TG-Metadata'], 'signature': self.headers['X-TG-Signature']}
                validate_headers(headers)
                body = self.rfile.read(int(length))
                if len(body) != int(length):
                    raise Rejected('short body')
                self.stop_deadline()
                if self.expired.is_set():
                    raise Rejected('deadline')
                result = publish(root, key, headers, body, probe or (lambda hashes: origin_probe(origin, hashes)))
                self.respond(200, result)
            except (Rejected, ValueError, UnicodeError, socket.timeout):
                self.respond(400, {'status': 'rejected'})
            except Exception:
                self.respond(503, {'status': 'unavailable'})
    # Bounded memory and work: one active request, finite listen backlog and timeout.
    class Server(HTTPServer):
        request_queue_size = 4
    return Server(('127.0.0.1', port), Handler)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--key-file', type=Path, required=True)
    parser.add_argument('--origin', default='http://127.0.0.1:9122')
    parser.add_argument('--port', type=int, default=9123)
    args = parser.parse_args()
    info = args.key_file.lstat()
    if not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600:
        raise ValueError('key must be regular mode 0600')
    key = args.key_file.read_bytes().strip()
    if len(key) < 32:
        raise ValueError('key too short')
    if args.root.is_symlink() or args.root.stat().st_mode & 0o022:
        raise ValueError('unsafe root')
    with (args.root / '.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        recover(args.root)
    make_server(args.root, key, args.origin, args.port).serve_forever()


if __name__ == '__main__':
    main()
