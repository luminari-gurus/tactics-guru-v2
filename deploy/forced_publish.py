"""Fixed authorized_keys command: bounded JSON line + ZIP bytes + EOF."""
from contextlib import contextmanager
import fcntl
import hashlib
import io
import json
import os
import re
import select
import signal
import stat
import sys
import time
from pathlib import Path

COMMAND = 'tg-publish-v1'
ROOT = Path('/var/lib/tg-deploy')
ORIGIN = 'http://127.0.0.1:9122'
ADMIN_UID = 0
Rejected = ValueError  # Bootstrap errors never need an unverified sibling import.


def check_code(script, boundary=None):
    script = Path(script).absolute()
    for path in [script, *script.parents]:
        info = path.lstat()
        if (info.st_uid != ADMIN_UID or info.st_mode & 0o022
                or stat.S_ISLNK(info.st_mode)
                or not (stat.S_ISREG(info.st_mode) if path == script else stat.S_ISDIR(info.st_mode))):
            raise Rejected('code permissions')
        if path == boundary:
            break


if __name__ == '__main__':
    check_code(Path(__file__))
    check_code(Path(__file__).with_name('release.py'))
# -I ignores PYTHONPATH/user site; only our admin-controlled sibling is imported.
sys.path.insert(0, str(Path(__file__).absolute().parent))
from release import MAX_MEMBER, MAX_UPLOAD, Rejected, publish, validate_metadata


class AdmissionClosed(RuntimeError):
    """Temporary maintenance denial; the SSH command returns EX_TEMPFAIL."""


class PublicationGate:
    """Root-controlled fixed inode lock outside deploy-writable release storage.

    Explicit owner/boundary injection is for pure tests only. main fixes both
    paths and UID0; no environment, argv or configuration bypass exists.
    """
    def __init__(self, gate='/etc/tg-deploy/admission.gate',
                 lock='/etc/tg-deploy/publication.lock', *, owner=0, boundary=Path('/')):
        self.gate=Path(gate); self.lock=Path(lock)
        self.owner=owner; self.boundary=Path(boundary)

    def open(self, path):
        path=Path(path)
        try: parts=path.relative_to(self.boundary).parts
        except ValueError: raise AdmissionClosed('path boundary') from None
        if not parts or any(p in ('','..','.') for p in parts):
            raise AdmissionClosed('path components')
        fd=os.open(self.boundary,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
        try:
            for i,part in enumerate(parts):
                s=os.fstat(fd)
                if s.st_uid!=self.owner or s.st_mode & 0o022:
                    raise AdmissionClosed('unsafe admission ancestor')
                following=os.open(part,os.O_RDONLY|os.O_NOFOLLOW |
                                  (os.O_DIRECTORY if i<len(parts)-1 else os.O_NONBLOCK),dir_fd=fd)
                os.close(fd); fd=following
            s=os.fstat(fd)
            if (not stat.S_ISREG(s.st_mode) or s.st_uid!=self.owner
                    or s.st_nlink!=1 or stat.S_IMODE(s.st_mode)!=0o644):
                raise AdmissionClosed('unsafe admission inode')
            result=fd; fd=None; return result
        finally:
            if fd is not None: os.close(fd)

    def enabled(self):
        fd=self.open(self.gate)
        try:
            if os.read(fd,32)!=b'enabled\n': raise AdmissionClosed('maintenance')
        finally: os.close(fd)

    @contextmanager
    def publication(self, deadline):
        self.enabled()
        fd=self.open(self.lock)
        try:
            while True:
                if time.monotonic()>=deadline: raise AdmissionClosed('admission deadline')
                try: fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB); break
                except BlockingIOError: time.sleep(min(.01,max(0,deadline-time.monotonic())))
            def verify():
                other=self.open(self.lock)
                try:
                    a,b=os.fstat(fd),os.fstat(other)
                    if (a.st_dev,a.st_ino)!=(b.st_dev,b.st_ino):
                        raise AdmissionClosed('canonical lock replaced')
                finally: os.close(other)
            verify(); self.enabled()
            yield
            verify()
        finally: os.close(fd)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise Rejected('duplicate field')
        result[key] = value
    return result


def read_frame(stream, timeout=15):
    deadline = time.monotonic() + timeout
    def read(size):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise Rejected('deadline')
        if isinstance(stream, io.BytesIO):
            return stream.read(size)
        if not select.select([stream.fileno()], [], [], remaining)[0]:
            raise Rejected('deadline')
        return os.read(stream.fileno(), size)
    header = bytearray()
    while True:
        char = read(1)
        if char == b'\n':
            break
        if not char or len(header) >= 4096:
            raise Rejected('header bounds')
        header.extend(char)
    try:
        value = json.loads(header, object_pairs_hook=unique_object)
        if (not isinstance(value, dict) or set(value) != {'metadata', 'size', 'sha256'}
                or type(value['size']) is not int or not 0 < value['size'] <= MAX_UPLOAD
                or not isinstance(value['sha256'], str)
                or not re.fullmatch('[0-9a-f]{64}', value['sha256'])):
            raise Rejected('frame')
        metadata = validate_metadata(value['metadata'])
    except (ValueError, TypeError, KeyError, UnicodeError, RecursionError):
        raise Rejected('frame') from None
    body = bytearray()
    while len(body) < value['size']:
        chunk = read(min(65536, value['size'] - len(body)))
        if not chunk:
            raise Rejected('short body')
        body.extend(chunk)
    if read(1) or hashlib.sha256(body).hexdigest() != value['sha256']:
        raise Rejected('body')
    return metadata, bytes(body)


def origin_probe(hashes):
    check_code(Path(__file__).with_name('artifact_health.py'))
    from artifact_health import probe
    probe(hashes, time.monotonic()+30)

def receive(command, stream, root, probe):
    if command != COMMAND:
        raise Rejected('command')
    metadata, body = read_frame(stream)
    return publish(root, metadata, body, probe)


def main():
    try:
        # No arguments, arbitrary paths, shell evaluation, or artifact execution.
        if len(sys.argv) != 1:
            raise Rejected('arguments')
        info = ROOT.lstat()
        if info.st_uid != os.getuid() or info.st_mode & 0o022 or not stat.S_ISDIR(info.st_mode):
            raise Rejected('storage ownership')
        # Gate and canonical root-controlled publication lock precede every
        # release mutation, including creation of releases/ and its .lock.
        with PublicationGate().publication(time.monotonic()+20):
            result = receive(os.environ.get('SSH_ORIGINAL_COMMAND', ''), sys.stdin.buffer, ROOT, origin_probe)
        print(json.dumps(result, sort_keys=True))
        return 0
    except AdmissionClosed:
        print('{"status":"maintenance"}')
        return 75
    except Exception:
        print('{"status":"rejected"}')
        return 1


if __name__ == '__main__':
    sys.exit(main())
