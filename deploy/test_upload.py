import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import release
import json
import subprocess


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.value = dict(repository=release.REPOSITORY, ref='refs/heads/main', sha='a'*40,
                          event='push', timestamp=1, run_number=1, run_attempt=1, deployment_id='1')

    def test_curl_credentials_not_in_argv_and_redirects_disabled(self):
        def run(args, **kwargs):
            self.assertEqual(args[:2], ['curl', '--disable'])
            self.assertNotIn('--location', args)
            self.assertNotIn('-L', args)
            self.assertIn('--max-time', args)
            self.assertEqual(args[args.index('--max-time')+1], '120')
            self.assertIn('--connect-timeout', args)
            self.assertNotIn('client-id', ' '.join(args))
            self.assertNotIn('client-secret', ' '.join(args))
            header_path = args[args.index('--header')+1][1:]
            self.assertEqual(Path(header_path).stat().st_mode & 0o777, 0o600)
            headers = Path(header_path).read_text()
            self.assertIn('CF-Access-Client-Id: client-id', headers)
            self.assertIn('CF-Access-Client-Secret: client-secret', headers)
            self.assertIn('X-TG-Signature:', headers)
            self.assertEqual(kwargs['input'], b'zip')
            Path(args[args.index('--output')+1]).write_text(json.dumps({'status':'published','sha':'a'*40}))
            return subprocess.CompletedProcess(args, 0, b'200', b'')
        with patch('subprocess.run', side_effect=run):
            self.assertEqual(upload.deliver(b'zip', self.value, b'x'*32, 'client-id', 'client-secret')['status'], 'published')

    def test_invalid_credentials_fail_before_network(self):
        for credential in ['', 'x\nInjected: secret', 'x\r', 'x\x00']:
            with self.subTest(credential=repr(credential)), patch('subprocess.run') as run:
                with self.assertRaises(ValueError):
                    upload.deliver(b'zip', self.value, b'x'*32, 'id', credential)
                run.assert_not_called()

    def test_redirect_error_and_timeout_do_not_leak(self):
        for code, status in [(0,b'302'), (0,b'403'), (28,b'000')]:
            with self.subTest(code=code,status=status), patch('subprocess.run', return_value=subprocess.CompletedProcess([],code,status,b'client-secret')), patch('time.sleep'):
                with self.assertRaises(RuntimeError) as error:
                    upload.deliver(b'zip',self.value,b'x'*32,'id','client-secret')
                self.assertNotIn('client-secret',str(error.exception))

    def test_descendant_deny_present_before_spa(self):
        config = Path(__file__).with_name('nginx.conf').read_text()
        self.assertIn('location ^~ /_deploy/ { return 404; }', config)
        self.assertIn('if ($request_uri ~* "%25") { return 400; }', config)
        self.assertIn('(?:d|%64)', config)
import upload


class UploadTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(upload, 'release uploader implementation missing')

    def test_pack_round_trip_and_deterministic_archive(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'index.html').write_text('<html>ok</html>')
            (root / 'assets').mkdir()
            (root / 'assets' / 'a.js').write_text('game')
            body = upload.package(root)
            self.assertEqual(body, upload.package(root))
            self.assertEqual(release.validate_archive(body)['assets/a.js'], b'game')
            (root / 'assets' / 'link.js').symlink_to('/etc/passwd')
            with self.assertRaises(ValueError):
                upload.package(root)

    def test_github_metadata_bound_to_approved_context(self):
        env = dict(GITHUB_REPOSITORY=release.REPOSITORY, GITHUB_REF='refs/heads/main',
                   GITHUB_SHA='a' * 40, GITHUB_EVENT_NAME='push', GITHUB_RUN_NUMBER='1',
                   GITHUB_RUN_ATTEMPT='1', GITHUB_RUN_ID='123')
        with patch.dict(os.environ, env):
            metadata = upload.metadata()
            self.assertEqual(metadata['repository'], release.REPOSITORY)
            headers = release.signed_headers(b'x' * 32, metadata, b'zip')
            self.assertEqual(release.authenticate(b'x' * 32, headers, b'zip'), metadata)
        with patch.dict(os.environ, {**env, 'GITHUB_REF': 'refs/heads/feature'}):
            with self.assertRaises(release.Rejected):
                upload.metadata()


if __name__ == '__main__':
    unittest.main()
