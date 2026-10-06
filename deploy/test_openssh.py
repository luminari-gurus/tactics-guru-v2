"""Real SSH integration inside the disposable test image (never host sshd)."""
import io
import hashlib
import json
import os
import socket
import subprocess
import tempfile
import time
import unittest
import zipfile
from pathlib import Path
import release
import ssh_upload

@unittest.skipUnless(os.environ.get('TG_SSH_INTEGRATION') == '1', 'run in deploy/Dockerfile.ssh-test')
class OpenSSHTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base = ['ssh','-F','/dev/null','-T','-i','/tmp/test-key','-o','BatchMode=yes',
                    '-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes',
                    '-o','UserKnownHostsFile=/tmp/test-known-hosts','-o','GlobalKnownHostsFile=/dev/null',
                    '-o','ConnectTimeout=3','tgdeploy@127.0.0.1']
        cls.server = subprocess.Popen(['/usr/sbin/sshd','-D','-e','-f','/etc/ssh/test_sshd_config'],stderr=subprocess.DEVNULL)
        cls.origin = subprocess.Popen(['python3','-m','http.server','9122','--bind','127.0.0.1',
                                      '--directory','/var/lib/tg-deploy/current'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for port in (22,9122):
            deadline = time.monotonic()+5
            while True:
                try:
                    with socket.create_connection(('127.0.0.1',port),timeout=.1): break
                except OSError:
                    if time.monotonic()>deadline: raise RuntimeError('fixture not ready')
                    time.sleep(.05)

    @classmethod
    def tearDownClass(cls):
        for process in (cls.server,cls.origin):
            process.terminate(); process.wait(timeout=5)

    def send(self, command, payload=b''):
        return subprocess.run(self.base+[command],input=payload,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=25)

    def assert_rejected_with_stdin_open(self, command, code):
        process=subprocess.Popen(self.base+[command],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        try:
            # Do not send EOF: rejection must precede frame consumption.
            process.wait(timeout=3)
            self.assertIsNotNone(process.stderr)
            self.assertEqual(process.returncode,code,process.stderr.read().decode())
        finally:
            if process.poll() is None:process.kill()
            process.communicate(timeout=3)

    def test_fifo_admission_files_root_owned_rejected_with_stdin_open(self):
        store=Path('/var/lib/tg-deploy')
        before=sorted(str(p.relative_to(store)) for p in store.rglob('*'))
        for name in ('admission.gate','publication.lock'):
            with self.subTest(name=name):
                path=Path('/etc/tg-deploy')/name; original=path.read_bytes()
                path.unlink();os.mkfifo(path,0o644);path.chmod(0o644)
                try:
                    self.assertEqual(path.stat().st_uid,0)
                    self.assert_rejected_with_stdin_open('tg-publish-v1',75)
                finally:
                    path.unlink();path.write_bytes(original);path.chmod(0o644)
        self.assertEqual(sorted(str(p.relative_to(store)) for p in store.rglob('*')),before)

    def test_unknown_command_rejected_with_stdin_open(self):
        self.assert_rejected_with_stdin_open('not-a-publisher-command',1)

    def test_z_maximum_archive_real_http_publication(self):
        raw=io.BytesIO()
        names=('index.html','app.js','style.css','assets/data.json')
        with zipfile.ZipFile(raw,'w',compression=zipfile.ZIP_DEFLATED) as archive:
            for name in names:archive.writestr(name,b'x'*release.MAX_MEMBER)
        body=raw.getvalue()
        meta=dict(repository=release.REPOSITORY,ref='refs/heads/main',sha='c'*40,
                  event='push',timestamp=int(time.time()),run_number=2,run_attempt=1,deployment_id='9'*20)
        result=self.send('tg-publish-v1',ssh_upload.frame(body,meta))
        self.assertEqual(result.returncode,0,result.stderr.decode())
        self.assertEqual(json.loads(result.stdout),{'status':'published','sha':meta['sha']})
        current=Path('/var/lib/tg-deploy/current')
        manifest=json.loads((current/'manifest.json').read_bytes())
        self.assertEqual(sum((current/name).stat().st_size for name in names),release.MAX_EXPANDED)
        for name,digest in manifest['hashes'].items():
            self.assertEqual(hashlib.sha256((current/name).read_bytes()).hexdigest(),digest)
        self.assertEqual(json.loads((current/'_deployment.json').read_bytes())['deployment_id'],meta['deployment_id'])

    def test_publish_real_key_auth_hash_probe_retry_and_stale(self):
        meta = dict(repository=release.REPOSITORY,ref='refs/heads/main',sha='a'*40,
                    event='push',timestamp=int(time.time()),run_number=1,run_attempt=1,deployment_id='1')
        with tempfile.TemporaryDirectory() as directory:
            Path(directory,'index.html').write_text('<html>SSH</html>')
            body = ssh_upload.package(directory)
        payload = ssh_upload.frame(body,meta)
        for status in ('published','idempotent'):
            result = self.send('tg-publish-v1',payload)
            self.assertEqual(result.returncode,0,result.stderr.decode())
            self.assertEqual(json.loads(result.stdout),{'status':status,'sha':meta['sha']})
        bad = self.send('tg-publish-v1',ssh_upload.frame(body,{**meta,'sha':'b'*40}))
        self.assertNotEqual(bad.returncode,0)
        self.assertEqual(Path('/var/lib/tg-deploy/current/index.html').read_text(),'<html>SSH</html>')

    def test_shell_scp_sftp_and_injection_rejected(self):
        for command in ('id','scp -t /tmp/escape','sftp','tg-publish-v1; touch /tmp/escaped',''):
            with self.subTest(command=command):
                result = self.send(command)
                self.assertNotEqual(result.returncode,0)
                self.assertNotIn(b'uid=',result.stdout)
        self.assertFalse(Path('/tmp/escaped').exists())
        subsystem = subprocess.run(self.base[:-1]+['-s',self.base[-1],'sftp'],input=b'',capture_output=True,timeout=5)
        self.assertNotEqual(subsystem.returncode,0)

    def test_pty_and_remote_forwarding_denied(self):
        pty = subprocess.run(self.base[:-1]+['-tt',self.base[-1],'id'],input=b'',capture_output=True,timeout=5)
        self.assertIn(b'PTY allocation request failed',pty.stderr)
        forward = subprocess.run(self.base[:-1]+['-o','ExitOnForwardFailure=yes','-N','-R','127.0.0.1:19093:127.0.0.1:9122',self.base[-1]],capture_output=True,timeout=5)
        self.assertNotEqual(forward.returncode,0)
        self.assertIn(b'remote port forwarding failed',forward.stderr)

    def test_storage_and_key_code_permissions(self):
        self.assertEqual(Path('/var/lib/tg-deploy').stat().st_uid,10001)
        for path in ('/usr/local/lib/tg-deploy','/usr/local/lib/tg-deploy/forced_publish.py',
                     '/home/tgdeploy','/home/tgdeploy/.ssh','/home/tgdeploy/.ssh/authorized_keys'):
            info = Path(path).stat()
            self.assertEqual(info.st_uid,0)
            self.assertEqual(info.st_mode & 0o022,0)
        self.assertNotIn('docker',subprocess.check_output(['id','tgdeploy']).decode())

if __name__ == '__main__': unittest.main()
