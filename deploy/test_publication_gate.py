import fcntl
import hashlib
import io
import multiprocessing
import os
from pathlib import Path
import tempfile
import time
import unittest
import forced_publish as forced
import release
import ssh_upload

class GateTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.gate=self.root/'admission.gate'; self.gate.write_bytes(b'enabled\n'); self.gate.chmod(0o644)
        self.lock=self.root/'publication.lock'; self.lock.touch(mode=0o644)
    def guard(self):
        return forced.PublicationGate(self.gate,self.lock,owner=os.getuid(),boundary=self.root)
    def assert_fifo_rejected(self, path):
        path.unlink(); os.mkfifo(path,0o644); path.chmod(0o644)
        ready=multiprocessing.Event(); outcome=multiprocessing.Queue()
        def child():
            ready.set()
            try:
                with self.guard().publication(time.monotonic()+.05):
                    outcome.put('admitted')
            except forced.AdmissionClosed: outcome.put('closed')
        process=multiprocessing.Process(target=child); process.start()
        try:
            self.assertTrue(ready.wait(1))
            process.join(.3)
            self.assertFalse(process.is_alive(),'FIFO open exceeded admission deadline')
            self.assertEqual(process.exitcode,0)
            self.assertEqual(outcome.get(timeout=1),'closed')
        finally:
            if process.is_alive(): process.terminate()
            process.join(2); outcome.close(); outcome.join_thread()
    def test_fifo_gate_rejected_without_waiting_for_writer(self):
        self.assert_fifo_rejected(self.gate)
    def test_fifo_lock_rejected_without_waiting_for_writer(self):
        self.assert_fifo_rejected(self.lock)
    def test_closed_gate_no_publication_effect(self):
        self.gate.write_bytes(b'maintenance\n')
        with self.assertRaises(forced.AdmissionClosed):
            with self.guard().publication(time.monotonic()+1): self.fail('admitted')
    def test_gate_rechecked_after_wait_before_any_file_effect(self):
        fd=os.open(self.lock,os.O_RDONLY); fcntl.flock(fd,fcntl.LOCK_EX)
        entered=multiprocessing.Event(); outcome=multiprocessing.Queue()
        class ObservedGate(forced.PublicationGate):
            def enabled(inner):
                super().enabled(); entered.set()
        def child():
            os.close(fd)
            try:
                with ObservedGate(self.gate,self.lock,owner=os.getuid(),boundary=self.root).publication(time.monotonic()+2):
                    (self.root/'should-not-exist').write_bytes(b'bad'); outcome.put('admitted')
            except forced.AdmissionClosed: outcome.put('closed')
        p=multiprocessing.Process(target=child); p.start()
        try:
            self.assertTrue(entered.wait(1)); self.gate.write_bytes(b'maintenance\n')
            fcntl.flock(fd,fcntl.LOCK_UN); p.join(3)
            self.assertEqual(p.exitcode,0); self.assertEqual(outcome.get(timeout=1),'closed')
            self.assertFalse((self.root/'should-not-exist').exists())
        finally:
            os.close(fd)
            if p.is_alive(): p.terminate(); p.join()
    def test_fixed_inode_replacement_denied(self):
        with self.assertRaises(forced.AdmissionClosed):
            with self.guard().publication(time.monotonic()+1):
                self.lock.unlink(); self.lock.touch(mode=0o644)
    def test_unsafe_gate_and_symlink_denied(self):
        self.gate.chmod(0o666)
        with self.assertRaises(forced.AdmissionClosed):
            with self.guard().publication(time.monotonic()+1): pass
        self.gate.unlink(); self.gate.symlink_to(self.lock)
        with self.assertRaises((forced.AdmissionClosed,OSError)):
            with self.guard().publication(time.monotonic()+1): pass
    def test_actual_archive_published_inside_guard(self):
        src=self.root/'src'; src.mkdir(); (src/'index.html').write_bytes(b'fixture only')
        body=ssh_upload.package(src)
        meta=dict(repository=release.REPOSITORY,ref='refs/heads/main',sha='b'*40,event='push',timestamp=int(time.time()),run_number=1,run_attempt=1,deployment_id='1')
        dest=self.root/'store'; dest.mkdir()
        with self.guard().publication(time.monotonic()+2):
            result=forced.receive(forced.COMMAND,io.BytesIO(ssh_upload.frame(body,meta)),dest,lambda hashes:self.assertEqual(hashes['index.html'],hashlib.sha256(b'fixture only').hexdigest()))
        self.assertEqual(result['status'],'published')
        self.assertEqual((dest/'current/index.html').read_bytes(),b'fixture only')

if __name__=='__main__': unittest.main()
