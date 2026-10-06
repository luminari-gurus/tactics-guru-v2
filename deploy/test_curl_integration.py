"""Exercise the production curl subprocess over real TLS without Cloudflare."""
import http.server
import json
import os
from pathlib import Path
import ssl
import subprocess
import tempfile
import threading
import unittest
from unittest.mock import patch
import upload


class CurlIntegrationTests(unittest.TestCase):
    def test_real_tls_headers_body_redirect_and_response_redaction(self):
        seen = []
        class Handler(http.server.BaseHTTPRequestHandler):
            status = 200
            def do_POST(self):
                body = self.rfile.read(int(self.headers['Content-Length']))
                seen.append((dict(self.headers), body))
                response = json.dumps({'status':'published', 'sha':'a'*40, 'secret':'must-not-print'}).encode()
                self.send_response(self.status)
                self.send_header('Content-Length', str(len(response)))
                self.send_header('Location', 'https://localhost:1/leak')
                self.end_headers()
                self.wfile.write(response)
            def log_message(self, format, *args):
                pass
        with tempfile.TemporaryDirectory() as directory:
            cert, key = Path(directory)/'cert.pem', Path(directory)/'key.pem'
            subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(key),'-out',str(cert),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            server = http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain(cert,key)
            server.socket = context.wrap_socket(server.socket,server_side=True)
            thread = threading.Thread(target=server.serve_forever)
            thread.start()
            try:
                endpoint = f'https://localhost:{server.server_port}/_deploy'
                with patch.object(upload,'ENDPOINT',endpoint), patch.dict(os.environ,{'CURL_CA_BUNDLE':str(cert)}):
                    result = upload.deliver(b'actual archive',{'sha':'a'*40},b'x'*32,'local-id','local-secret')
                    self.assertEqual(result,{'status':'published','sha':'a'*40})
                    self.assertEqual(seen[0][1],b'actual archive')
                    self.assertEqual(seen[0][0]['CF-Access-Client-Id'],'local-id')
                    self.assertEqual(seen[0][0]['CF-Access-Client-Secret'],'local-secret')
                    self.assertTrue(seen[0][0]['User-Agent'].startswith('curl/'))
                    self.assertIn('X-TG-Signature',seen[0][0])
                    Handler.status = 302
                    with self.assertRaises(RuntimeError):
                        upload.deliver(b'zip',{'sha':'a'*40},b'x'*32,'local-id','local-secret')
                    self.assertEqual(len(seen),2)
            finally:
                server.shutdown(); server.server_close(); thread.join(timeout=5)
