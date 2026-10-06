import hashlib
import io
import json
import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
import release
try:
    import forced_publish as forced
except ImportError:
    forced = None
try:
    import ssh_upload as upload
except ImportError:
    upload = None

class SSHTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(forced, 'forced SSH publisher missing')
        self.assertIsNotNone(upload, 'SSH uploader missing')
        self.meta = dict(repository=release.REPOSITORY, ref='refs/heads/main', sha='a'*40,
                         event='push', timestamp=int(time.time()), run_number=1,
                         run_attempt=1, deployment_id='1')
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root/'index.html').write_bytes(b'<html>ok</html>')
        self.body = upload.package(self.root)

    def test_frame_roundtrip_publish_and_idempotency(self):
        frame = upload.frame(self.body, self.meta)
        meta, body = forced.read_frame(io.BytesIO(frame))
        self.assertEqual(meta, self.meta)
        self.assertEqual(body, self.body)
        dest = self.root/'store'; dest.mkdir()
        hashes = []
        self.assertEqual(forced.receive(forced.COMMAND, io.BytesIO(frame), dest, hashes.append)['status'], 'published')
        self.assertEqual(forced.receive(forced.COMMAND, io.BytesIO(frame), dest, hashes.append)['status'], 'idempotent')
        self.assertEqual(hashes[0]['index.html'], hashlib.sha256(b'<html>ok</html>').hexdigest())

    def test_unknown_commands_rejected_without_reading(self):
        class NoRead:
            def read(self, *args): raise AssertionError('must reject before read')
        for command in ['', 'sh', 'sftp', 'scp -t /tmp/x', 'tg-publish-v1; id', 'tg-publish-v1 ', 'env X=1 tg-publish-v1']:
            with self.subTest(command=command), self.assertRaises(release.Rejected):
                forced.receive(command, NoRead(), self.root, lambda _: None)

    def test_malformed_short_extra_and_hash_mismatch(self):
        frame = upload.frame(self.body, self.meta)
        header, body = frame.split(b'\n',1)
        values = [b'bad\n', b'x'*4097+b'\n', frame[:-1], frame+b'x', header+b'\n'+body[:-1]+b'x']
        h = json.loads(header)
        for field, value in [('size',True),('size',release.MAX_UPLOAD+1),('sha256','x'),('extra',1)]:
            values.append(json.dumps({**h,field:value}).encode()+b'\n'+body)
        values.append(b'{"size":1,"size":2}\nxx')
        for payload in values:
            with self.subTest(payload_len=len(payload)), self.assertRaises(release.Rejected):
                forced.read_frame(io.BytesIO(payload))

    def test_deadline_on_open_pipe(self):
        r,w = os.pipe()
        try:
            with os.fdopen(r,'rb', buffering=0) as stream:
                os.write(w,b'{')
                started = time.monotonic()
                with self.assertRaises(release.Rejected): forced.read_frame(stream, timeout=0.05)
                self.assertLess(time.monotonic()-started, 0.5)
        finally: os.close(w)

    def test_admin_owned_code_and_parent_modes(self):
        code = self.root/'code'; code.mkdir(); script = code/'forced_publish.py'; script.write_text('')
        with patch.object(forced, 'ADMIN_UID', os.getuid()):
            forced.check_code(script, boundary=self.root)
            code.chmod(0o777)
            with self.assertRaises(release.Rejected): forced.check_code(script, boundary=self.root)
            code.chmod(0o755); script.chmod(0o666)
            with self.assertRaises(release.Rejected): forced.check_code(script, boundary=self.root)
            script.unlink(); script.symlink_to('/etc/passwd')
            with self.assertRaises(release.Rejected): forced.check_code(script, boundary=self.root)

    def test_workflow_is_main_only_no_http_credentials(self):
        text = (Path(__file__).parent.parent/'.github/workflows/release.yml').read_text()
        self.assertIn('TG_DEPLOY_SSH_PRIVATE_KEY', text)
        self.assertIn("github.ref == 'refs/heads/main'", text)
        self.assertIn('contents: read', text)
        for removed in ['TG_DEPLOY_HMAC_KEY','CF_ACCESS','deploy/upload.py']: self.assertNotIn(removed,text)

    def test_deterministic_pack_and_symlink_rejection(self):
        self.assertEqual(upload.package(self.root),self.body)
        (self.root/'link.js').symlink_to('/etc/passwd')
        with self.assertRaises(ValueError): upload.package(self.root)

    def test_ssh_pinned_host_identity_no_secret_argv(self):
        key = 'test-private-key-do-not-print'
        known = '2.24.125.17 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINeTbxJxSiASXcXnI7I/9w2w9+1JQm+dl9yyHWJK7zVD'
        def run(args, **kwargs):
            self.assertEqual(args[0:3],['ssh','-F','/dev/null'])
            self.assertIn('StrictHostKeyChecking=yes',args)
            self.assertIn('IdentitiesOnly=yes',args)
            self.assertIn('tgdeploy@2.24.125.17',args)
            self.assertEqual(args[-1],forced.COMMAND)
            self.assertNotIn(key,str(args))
            self.assertNotIn('TG_DEPLOY_SSH_PRIVATE_KEY',kwargs['env'])
            self.assertEqual(Path(args[args.index('-i')+1]).stat().st_mode & 0o777,0o600)
            kwargs['stdout'].write(json.dumps({'status':'published','sha':self.meta['sha']}).encode())
            return __import__('subprocess').CompletedProcess(args,0)
        with patch('subprocess.run',side_effect=run):
            self.assertEqual(upload.deliver(self.body,self.meta,key,known)['status'],'published')
        with patch('subprocess.run',return_value=__import__('subprocess').CompletedProcess([],1,b'',key.encode())):
            with self.assertRaises(RuntimeError) as error: upload.deliver(self.body,self.meta,key,known)
            self.assertNotIn(key,str(error.exception))
