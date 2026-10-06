"""Identity-bound barrier prototype, ONLY /fixture Ubuntu24.04 containers.

No installer integration, restoration implementation, or auth re-enable API.
Caller must prove SSH admission denial before quiesce; held lock verification
is required immediately surrounding its fixture critical operations. Same UID
alone is never ownership. Namespace/starttime stamps are not host provenance.
"""
from contextlib import contextmanager
from dataclasses import dataclass, field
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path
import pwd
import select
import signal
import stat
import time

KEY='/home/tgdeploy/.ssh/authorized_keys'
JOURNAL='/fixture/quiescence.json'
LOCKS=('/fixture/locks/installer.lock','/fixture/locks/new.lock','/fixture/locks/old.lock')

class Unsafe(RuntimeError): pass


def secure_open(path, flags=os.O_RDONLY, mode=0o600):
    """Walk root-owned non-writable parents with dirfds; never follow symlinks."""
    parts=Path(path).parts
    if not path.startswith('/') or '..' in parts: raise Unsafe('absolute confined path required')
    fd=os.open('/',os.O_RDONLY|os.O_DIRECTORY)
    try:
        for part in parts[1:-1]:
            child=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd)
            os.close(fd); fd=child
            s=os.fstat(fd)
            if s.st_uid!=0 or s.st_gid!=0 or s.st_mode&0o022: raise Unsafe('unsafe parent')
        result=os.open(parts[-1],flags|os.O_NOFOLLOW|os.O_CLOEXEC,mode,dir_fd=fd)
        s=os.fstat(result)
        if not stat.S_ISREG(s.st_mode) or s.st_uid!=0 or s.st_gid!=0 or s.st_nlink!=1 or s.st_mode&0o022:
            os.close(result); raise Unsafe('unsafe file')
        return result
    finally: os.close(fd)


def fixture():
    if os.geteuid()!=0 or not Path('/.dockerenv').is_file(): raise Unsafe('container fixture only')
    if 'VERSION_ID="24.04"' not in Path('/etc/os-release').read_text(): raise Unsafe('Ubuntu fixture only')
    fd=secure_open('/fixture/.owned-session-fixture')
    try: token=os.read(fd,128).decode()
    finally: os.close(fd)
    if not token.startswith('tg-session-fixture-') or len(token)!=51: raise Unsafe('fixture identity missing')
    if b'/fixture/test_session_barrier.py' not in Path('/proc/1/cmdline').read_bytes(): raise Unsafe('fixture PID1 missing')
    return token


@dataclass(frozen=True)
class Stamp:
    pid:int
    start:int
    ppid:int
    uid:tuple
    gid:tuple
    namespaces:tuple
    state:str=field(compare=False)


def stamp(pid):
    raw=Path(f'/proc/{pid}/stat').read_text().rsplit(')',1)[1].split()
    status=Path(f'/proc/{pid}/status').read_text().splitlines()
    fields={s.split(':',1)[0]:s.split(':',1)[1].split() for s in status if ':' in s}
    ns=tuple(os.readlink(f'/proc/{pid}/ns/{n}') for n in ('pid','mnt','user'))
    return Stamp(pid,int(raw[19]),int(raw[1]),tuple(map(int,fields['Uid'])),tuple(map(int,fields['Gid'])),ns,raw[0])


def dedicated_processes():
    fixture()
    result=[]
    for p in Path('/proc').iterdir():
        if not p.name.isdecimal(): continue
        try:
            # First read UID before namespace links of unrelated/protected actors.
            status=(p/'status').read_text()
            if 'Uid:\t11002\t11002\t11002\t11002' not in status: continue
            s=stamp(int(p.name))
            if s.state!='Z': result.append(s)
        except (FileNotFoundError,ProcessLookupError): continue
    return result


def terminate(expected, deadline, daemon=None):
    """pidfd pins target; immediately revalidate exact stamp before signalling."""
    fixture()
    if daemon is None: raise Unsafe('SSH ancestry authority required')
    if daemon.uid!=(0,)*4 or daemon.gid!=(0,)*4 or stamp(daemon.pid)!=daemon:
        raise Unsafe('root daemon authority changed')
    if os.readlink(f'/proc/{daemon.pid}/exe')!='/usr/sbin/sshd': raise Unsafe('not SSH daemon')
    own=stamp(os.getpid())
    if expected.uid!=(11002,)*4 or expected.gid!=(11002,)*4 or expected.namespaces!=own.namespaces:
        raise Unsafe('not dedicated fixture identity')
    if time.monotonic()>=deadline: raise TimeoutError('signal deadline')
    try: fd=os.pidfd_open(expected.pid)
    except OSError as error:
        # Kernel may report EINVAL for a task exiting between scan and pidfd.
        if error.errno!=errno.EINVAL: raise
        try: dead=stamp(expected.pid).state in ('Z','X')
        except (FileNotFoundError,ProcessLookupError): dead=True
        if dead: raise ProcessLookupError('actor already exited') from error
        raise
    try:
        actual=stamp(expected.pid)
        if actual!=expected: raise Unsafe('process identity changed')
        node=actual
        for _ in range(64):
            if node.pid==daemon.pid:
                if node!=daemon: raise Unsafe('daemon reused')
                break
            if node.ppid<=1: raise Unsafe('actor outside SSH ancestry')
            node=stamp(node.ppid)
        else: raise Unsafe('ancestry too deep')
        signal.pidfd_send_signal(fd,signal.SIGTERM)
        poll=select.poll(); poll.register(fd,select.POLLIN)
        remaining=max(0,deadline-time.monotonic())
        if not poll.poll(int(min(.3,remaining)*1000)):
            signal.pidfd_send_signal(fd,signal.SIGKILL)
            if not poll.poll(int(max(0,deadline-time.monotonic())*1000)): raise TimeoutError('actor did not exit')
    finally: os.close(fd)


class Held:
    def __init__(self, descriptors): self.descriptors=descriptors
    def verify(self):
        for path,fd in self.descriptors:
            probe=secure_open(path)
            try:
                a,b=os.fstat(fd),os.fstat(probe)
                if (a.st_dev,a.st_ino)!=(b.st_dev,b.st_ino): raise Unsafe('lock path replaced')
            finally: os.close(probe)


class Barrier:
    def __init__(self):
        self.token=fixture()
        entry=pwd.getpwnam('tgdeploy')
        if (entry.pw_uid,entry.pw_gid)!=(11002,11002): raise Unsafe('dedicated identity mismatch')
        if sum(e.pw_uid==11002 for e in pwd.getpwall())!=1: raise Unsafe('UID alias')

    def disabled(self):
        fd=secure_open(KEY)
        try:
            if os.read(fd,1): raise Unsafe('auth not disabled')
        finally: os.close(fd)

    def disable_auth(self):
        """Durable owned intent precedes key truncation; all failure paths disable.

        Recovery never re-enables. A durable intent + empty key is reconciled.
        Unexpected nonempty key with an existing journal is cleared and refused.
        """
        fixture()
        fd=secure_open(KEY,os.O_RDWR)
        try:
            prior=os.read(fd,65537)
            if len(prior)>65536: raise Unsafe('key file oversized')
            try:
                jfd=secure_open(JOURNAL,os.O_RDWR|os.O_CREAT|os.O_EXCL)
                try:
                    payload=json.dumps({'fixture':self.token,'state':'disable-intent','key_sha256':hashlib.sha256(prior).hexdigest()},sort_keys=True).encode()
                    os.write(jfd,payload); os.fsync(jfd)
                    parent=os.open('/fixture',os.O_DIRECTORY); os.fsync(parent); os.close(parent)
                finally: os.close(jfd)
            except FileExistsError:
                jfd=secure_open(JOURNAL)
                try: data=json.loads(os.read(jfd,4096))
                finally: os.close(jfd)
                if data.get('fixture')!=self.token or data.get('state')!='disable-intent' or prior:
                    raise Unsafe('unreconciled disable journal/key')
        finally:
            # Even corrupt/inaccessible journal never leaves authentication active.
            os.ftruncate(fd,0); os.fsync(fd); os.close(fd)
        self.disabled()

    def quiesce(self, daemon, deadline):
        self.disabled()
        if stamp(daemon.pid)!=daemon or daemon.uid!=(0,)*4 or daemon.namespaces!=stamp(os.getpid()).namespaces:
            raise Unsafe('sshd root identity mismatch')
        if os.readlink(f'/proc/{daemon.pid}/exe')!='/usr/sbin/sshd': raise Unsafe('not fixture sshd')
        quiet=None
        while time.monotonic()<deadline:
            self.disabled()
            actors=dedicated_processes()
            if not actors:
                if quiet is None: quiet=time.monotonic()
                if time.monotonic()-quiet>=.2: return
                time.sleep(.02); continue
            quiet=None
            # Validate ALL actors before signalling any; same UID unrelated aborts.
            depths={}
            for actor in actors:
                node=actor
                for depth in range(64):
                    if node.pid==daemon.pid:
                        depths[actor.pid]=depth
                        if node!=daemon: raise Unsafe('daemon reused')
                        break
                    if node.ppid<=1: raise Unsafe('actor outside SSH ancestry')
                    node=stamp(node.ppid)
                else: raise Unsafe('ancestry too deep')
            for actor in sorted(actors,key=lambda s:depths[s.pid],reverse=True):
                try: terminate(actor,deadline,daemon)
                except (FileNotFoundError,ProcessLookupError): pass
        raise TimeoutError('quiescence deadline')

    @contextmanager
    def locks(self,deadline):
        """Fixed installer-first then canonical new/old order; bounded acquisition.

        No lock stealing/deleting. Auth remains disabled on timeout/crash.
        """
        self.disabled()
        if dedicated_processes(): raise Unsafe('live dedicated actors before critical section')
        descriptors=[]
        try:
            for path in LOCKS:
                fd=secure_open(path,os.O_RDWR); descriptors.append((path,fd))
                while True:
                    if time.monotonic()>=deadline: raise TimeoutError('lock acquisition deadline')
                    try: fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB); break
                    except BlockingIOError:
                        if time.monotonic()>=deadline: raise TimeoutError('lock acquisition deadline')
                        time.sleep(.01)
                self.disabled()
            if time.monotonic()>=deadline: raise TimeoutError('critical admission deadline')
            held=Held(descriptors); held.verify()
            yield held
            held.verify(); self.disabled()
        finally:
            for _,fd in reversed(descriptors): os.close(fd)
