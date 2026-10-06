"""Trusted-context account engine derived from reviewed native reconciliation.

Trusted fixture owner and cooperating dedicated-identity writers only. Unrelated
native writers use shadow-utils *.lock exclusion. Native tools remove complete
records; orphan-only residues require exact-record surgery under those locks.
No complete database snapshot is ever restored. No process/session cleanup here.
"""
from contextlib import contextmanager
import fcntl
import json
import os
from pathlib import Path
import stat
import tempfile
import time
import uuid

NAME = 'tgdeploy'
ID = 11002
MAX_ACCOUNT_ID = 4294967294  # Linux uid_t/gid_t: all-ones is reserved.
MAX_ACCOUNT_ID_DIGITS = len(str(MAX_ACCOUNT_ID))
FILES = ('passwd', 'shadow', 'group', 'gshadow')

class Blocked(RuntimeError):
    pass

def account_id(text):
    if (not text or len(text) > MAX_ACCOUNT_ID_DIGITS
            or any(c < '0' or c > '9' for c in text)
            or (len(text) > 1 and text[0] == '0')):
        raise Blocked('noncanonical account ID')
    value = int(text)
    if value > MAX_ACCOUNT_ID:
        raise Blocked('account ID out of range')
    return value

class AccountEngine:
    def __init__(self, context):
        self.context = context
        self.root = context.account_journal
        self.database_dir = context.database_dir
        self.identity = (self.root.stat().st_dev, self.root.stat().st_ino)
        self.check_root()

    def check_root(self):
        self.context.check()
        if self.identity != (self.root.stat().st_dev, self.root.stat().st_ino):
            raise Blocked('account journal replaced')

    def confined(self, p):
        p = Path(p)
        if p not in [self.root/'intent.json', self.root/'lock-intent.json', *[self.database_dir/n for n in FILES]]:
            raise Blocked('file outside account allowlist')
        self.check_root()
        if p.is_symlink(): raise Blocked('symlink account target')
        return p

    def read(self, p):
        p=self.confined(p)
        fd = os.open(p, os.O_RDONLY | os.O_NOFOLLOW)
        try:
            s = os.fstat(fd)
            if not stat.S_ISREG(s.st_mode) or s.st_nlink != 1 or s.st_uid != os.getuid():
                raise Blocked('unsafe account file')
            if s.st_size>4*1024*1024 or s.st_mode&0o022 or os.listxattr(p,follow_symlinks=False):raise Blocked('account size/mode/xattrs unsupported')
            if p.parent==self.root and (s.st_gid!=0 or stat.S_IMODE(s.st_mode)!=0o600):raise Blocked('root-private account intent required')
            with os.fdopen(os.dup(fd), 'rb') as f:
                return f.read()
        finally:
            os.close(fd)

    def sync_directory(self, path):
        fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try: os.fsync(fd)
        finally: os.close(fd)

    def process_identity(self):
        # The final ')' handles comm fields containing spaces or parentheses.
        fields = Path('/proc/self/stat').read_text().rsplit(')', 1)[1].split()
        return (Path('/proc/sys/kernel/random/boot_id').read_text().strip(),
                os.getpid(), fields[19])

    def lock_boundary(self, stage, name):
        """Fault-injection boundary; never an ownership authority."""

    def lock_record(self, record=None):
        p = self.root/'lock-intent.json'
        if record is not None:
            self.atomic(p, json.dumps(record, sort_keys=True).encode())
        if not p.exists() and not p.is_symlink():
            if record is not None: raise Blocked('missing lock intent readback')
            return None
        try:
            value = json.loads(self.read(p))
            if record is not None and value != record:
                raise Blocked('lock intent readback mismatch')
            if (set(value) != {'version','root','boot','pid','start','token','absent','locks'}
                    or type(value['version']) is not int or value['version'] != 1
                    or value['root'] != list(self.identity)
                    or type(value['root']) is not list
                    or any(type(n) is not int for n in value['root'])
                    or type(value['pid']) is not int or value['pid'] <= 0
                    or type(value['boot']) is not str or not value['boot']
                    or type(value['start']) is not str or not value['start'].isdigit()
                    or type(value['token']) is not str or len(value['token']) != 32
                    or any(c not in '0123456789abcdef' for c in value['token'])
                    or value['absent'] != list(FILES)
                    or type(value['locks']) is not dict
                    or any(n not in FILES for n in value['locks'])):
                raise Blocked('bad lock ownership intent')
            for item in value['locks'].values():
                if (type(item) is not list or len(item) != 5
                        or any(type(n) is not int or n < 0 for n in item)):
                    raise Blocked('bad lock inode metadata')
            return value
        except (OSError, ValueError, TypeError, KeyError) as exc:
            raise Blocked('unreadable lock intent') from exc

    def anchor(self, record, name):
        return self.root/('.owned-lock-'+record['token']+'-'+name)

    def lock_snapshot(self, path):
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
        try:
            s = os.fstat(fd)
            if (not stat.S_ISREG(s.st_mode) or s.st_uid != os.getuid()
                    or stat.S_IMODE(s.st_mode) != 0o600 or s.st_nlink not in (1, 2)):
                raise Blocked('unsafe owned lock')
            data = os.read(fd, 128)
            return [s.st_dev, s.st_ino, s.st_uid, s.st_mode, s.st_size], data
        finally: os.close(fd)

    def verify_owned_lock(self, record, name):
        expected = record['locks'][name]
        data = str(record['pid']).encode()+b'\0'
        anchor = self.anchor(record, name)
        if self.lock_snapshot(anchor) != (expected, data):
            raise Blocked('owned anchor changed')
        p = self.database_dir/(name+'.lock')
        if p.exists() or p.is_symlink():
            if self.lock_snapshot(p) != (expected, data):
                raise Blocked('foreign or replaced native lock')
            return True
        return False

    def finish_owned_locks(self, record):
        # Native stale-lock removal does not honor flock. Caller MUST exclude
        # every native writer during this entire operation. No atomic CAS-unlink
        # exists; this is NOT an online host reconciliation primitive.
        for name in record['locks']: self.verify_owned_lock(record, name)
        for name in reversed(list(record['locks'])):
            if self.verify_owned_lock(record, name):
                (self.database_dir/(name+'.lock')).unlink()
                self.sync_directory(self.database_dir)
            # Leave anchors until journal clearance is durable: interrupted
            # cleanup remains provable and cannot suffer inode reuse.
        (self.root/'lock-intent.json').unlink()
        self.sync_directory(self.root)
        for name in record['locks']:
            self.anchor(record, name).unlink()
        self.sync_directory(self.root)

    def reconcile_owned_locks(self, *, native_writers_excluded=False):
        """Explicit OFFLINE maintenance only, NOT automatic stale-PID cleanup.

        The trusted fixture operator must exclude ALL native writers (including
        independent shadow-utils processes) before passing the literal True.
        operation/transaction flock alone cannot establish that exclusion.
        Native-tool locks without prepublished inode anchors stay BLOCKED.
        """
        if native_writers_excluded is not True:
            raise Blocked('explicit offline native-writer exclusion required')
        with self.operation():
            with self.locked():
                record = self.lock_record()
                present = [n for n in FILES if os.path.lexists(self.database_dir/(n+'.lock'))]
                if record is None:
                    if present: raise Blocked('unproven native locks')
                    return
                boot, _, _ = self.process_identity()
                if record['boot'] != boot: raise Blocked('boot identity changed')
                # A live PID, even with different starttime, is a conservative
                # refusal. Never infer stale ownership from PID reuse.
                try: pidfd = os.pidfd_open(record['pid'], 0)
                except ProcessLookupError: pidfd = None
                if pidfd is not None:
                    try:
                        fields = Path('/proc/'+str(record['pid'])+'/stat').read_text().rsplit(')',1)[1].split()
                        if fields[19] != record['start']: raise Blocked('PID identity changed')
                        import select
                        poller = select.poll(); poller.register(pidfd, select.POLLIN)
                        if not poller.poll(0): raise Blocked('owned process still alive')
                    finally: os.close(pidfd)
                if any(n not in record['locks'] for n in present):
                    raise Blocked('lock without recorded inode evidence')
                self.finish_owned_locks(record)

    @contextmanager
    def locked(self, databases=False):
        self.check_root()
        fd = os.open(self.root/'transaction.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
        record = None
        try:
            s=os.fstat(fd)
            if not stat.S_ISREG(s.st_mode) or s.st_nlink != 1 or s.st_uid != os.getuid():
                raise Blocked('unsafe transaction lock')
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            if databases:
                if self.lock_record() is not None: raise Blocked('owned locks require explicit offline reconciliation')
                if any(os.path.lexists(self.database_dir/(n+'.lock')) for n in FILES):
                    raise Blocked('foreign native lock')
                boot, pid, start = self.process_identity()
                record = {'version':1, 'root':list(self.identity), 'boot':boot,
                          'pid':pid, 'start':start, 'token':uuid.uuid4().hex,
                          'absent':list(FILES), 'locks':{}}
                self.lock_record(record)
                self.lock_boundary('intent', None)
                for name in FILES:
                    anchor = self.anchor(record, name)
                    lock=os.open(anchor, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
                    try:
                        data=str(pid).encode()+b'\0'
                        if os.write(lock, data) != len(data): raise Blocked('short lock write')
                        os.fsync(lock)
                    finally: os.close(lock)
                    self.sync_directory(self.root)
                    self.lock_boundary('anchor', name)
                    record['locks'][name] = self.lock_snapshot(anchor)[0]
                    self.lock_record(record)  # fsync + exact readback BEFORE link
                    self.lock_boundary('record', name)
                    os.link(anchor, self.database_dir/(name+'.lock'), follow_symlinks=False)
                    self.sync_directory(self.database_dir)
                    self.verify_owned_lock(record, name)
                    self.lock_boundary('published', name)
            yield
        except (OSError, ValueError, UnicodeError) as exc:
            raise Blocked(str(exc)) from exc
        finally:
            try:
                if record is not None and (self.root/'lock-intent.json').exists():
                    self.finish_owned_locks(record)
            finally: os.close(fd)

    def atomic(self, p, data, mode=0o600):
        p=self.confined(p)
        fd, temp = tempfile.mkstemp(prefix='.account-',dir=p.parent)
        try:
            if p.exists():
                old = p.stat(follow_symlinks=False)
                os.fchown(fd, old.st_uid, old.st_gid)
            os.fchmod(fd, mode)
            with os.fdopen(fd,'wb') as f:
                f.write(data); f.flush(); os.fsync(f.fileno())
            os.replace(temp,p)
            directory=os.open(p.parent, os.O_RDONLY | os.O_DIRECTORY)
            try: os.fsync(directory)
            finally: os.close(directory)
        finally:
            if os.path.exists(temp): os.unlink(temp)

    def state(self):
        p=self.root/'intent.json'
        if not p.exists() and not p.is_symlink(): return None
        try:
            value=json.loads(self.read(p))
            if set(value) != {'name','uid','gid','day','stage','root'}:
                raise Blocked('bad intent schema')
            if (type(value['uid']) is not int or type(value['gid']) is not int
                    or type(value['root']) is not list or len(value['root']) != 2
                    or any(type(n) is not int for n in value['root'])):
                raise Blocked('bad intent numeric identity')
            if value['name'] != NAME or value['uid'] != ID or value['gid'] != ID or value['root'] != list(self.identity):
                raise Blocked('intent identity mismatch')
            if type(value['day']) is not int or value['day'] < 0 or value['stage'] not in ('group','user','removed'):
                raise Blocked('bad intent values')
            return value
        except (OSError, ValueError, TypeError) as exc:
            raise Blocked('unreadable intent') from exc

    def save(self, state):
        self.atomic(self.root/'intent.json',json.dumps(state,sort_keys=True).encode())

    def expected(self, state):
        day=state['day'] if state else 0
        return {'passwd':f'{NAME}:x:{ID}:{ID}:Tactics Guru deploy:/home/tgdeploy:/bin/sh\n'.encode(),
                'shadow':f'{NAME}:!:{day}::::::\n'.encode(),
                'group':f'{NAME}:x:{ID}:\n'.encode(),
                'gshadow':f'{NAME}:!::\n'.encode()}

    def records(self, state):
        expected=self.expected(state)
        result={}
        widths={'passwd':7,'shadow':9,'group':4,'gshadow':4}
        for name in FILES:
            raw=self.read(self.database_dir/name)
            lines=raw.splitlines(keepends=True)
            dedicated=[]
            seen=set()
            for line in lines:
                if not line.endswith(b'\n'): raise Blocked('unterminated account row')
                fields=line[:-1].decode().split(':')
                if len(fields)!=widths[name] or fields[0] in seen: raise Blocked('malformed/duplicate account row')
                seen.add(fields[0])
                if name == 'passwd':
                    uid, gid = account_id(fields[2]), account_id(fields[3])
                elif name == 'group':
                    gid = account_id(fields[2])
                if fields[0]==NAME:
                    allowed = state and state['stage'] in ('group','user') and (name in ('group','gshadow') or state['stage']=='user')
                    if not allowed or line != expected[name]: raise Blocked('unowned or drifted dedicated row')
                    dedicated.append(line)
                elif name=='passwd' and (uid==ID or gid==ID):
                    raise Blocked('foreign UID or primary GID')
                elif name=='group' and (gid==ID or NAME in fields[3].split(',')):
                    raise Blocked('foreign GID or supplementary membership')
                elif name=='gshadow' and (NAME in fields[2].split(',') or NAME in fields[3].split(',')):
                    raise Blocked('foreign membership/admin')
            result[name]=(raw, bool(dedicated))
        return result

    def invoke(self, command, runner):
        failure=None
        try:
            if runner(command)!=0: failure='native tool failed: '+command[0]
        except Exception as exc:
            failure='native response lost: '+str(exc)
        # Validate actual state even on nonzero/exception, before caller retries.
        with self.locked(databases=True): self.records(self.state())
        if failure: raise Blocked(failure)

    @contextmanager
    def operation(self):
        self.check_root()
        fd=os.open(self.root/'operation.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
        try:
            s=os.fstat(fd)
            if not stat.S_ISREG(s.st_mode) or s.st_nlink!=1 or s.st_uid!=os.getuid():
                raise Blocked('unsafe operation lock')
            try: fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            except OSError as exc: raise Blocked('competing account operation') from exc
            yield
        finally: os.close(fd)

    def create(self, runner):
        with self.operation(): self._create(runner)

    def _create(self, runner):
        with self.locked(databases=True):
            state=self.state()
            self.records(state)
            if state: raise Blocked('existing intent: reconcile rollback first')
            state={'name':NAME,'uid':ID,'gid':ID,'day':int(time.time()//86400), 'stage':'group','root':list(self.identity)}
            self.save(state)
        self.invoke(['groupadd','--gid',str(ID),NAME],runner)
        with self.locked(databases=True):
            actual=self.records(state)
            if not all(actual[n][1] for n in ('group','gshadow')): raise Blocked('incomplete native group')
            state['stage']='user'; self.save(state)
        self.invoke(['useradd','--uid',str(ID),'--gid',str(ID),'--no-user-group','--no-create-home','--no-log-init','--home-dir','/home/tgdeploy','--shell','/bin/sh','--comment','Tactics Guru deploy','--password','!','--key','PASS_MAX_DAYS=-1','--key','PASS_MIN_DAYS=-1','--key','PASS_WARN_AGE=-1',NAME],runner)
        with self.locked(databases=True):
            if not all(v[1] for v in self.records(state).values()): raise Blocked('incomplete native user')

    def rollback(self, runner):
        with self.operation(): self._rollback(runner)

    def _rollback(self, runner):
        with self.locked(databases=True):
            state=self.state()
            actual=self.records(state)
            if not state: return
        for tool, primary in (('userdel','passwd'),('groupdel','group')):
            with self.locked(databases=True):
                actual=self.records(state)
            if actual[primary][1]: self.invoke([tool,NAME],runner)
        # Native userdel/groupdel cannot address orphan shadow/gshadow records.
        # Remove only exact owned remnants under native shadow-utils lock names.
        with self.locked(databases=True):
            actual=self.records(state)  # validate ALL four before ANY surgery
            for name,(raw,present) in actual.items():
                if present:
                    p=self.database_dir/name
                    mode=stat.S_IMODE(p.stat().st_mode)
                    self.atomic(p,b''.join(line for line in raw.splitlines(keepends=True) if not line.startswith(NAME.encode()+b':')),mode)
            if any(v[1] for v in self.records(state).values()): raise Blocked('residual dedicated records')
            state['stage']='removed'; self.save(state)

    def _fixture_reset(self):
        """Test-only start of a fresh transaction, after verified removal."""
        with self.operation(): self._reset()

    def _reset(self):
        with self.locked(databases=True):
            state=self.state()
            if not state or state['stage']!='removed' or any(v[1] for v in self.records(state).values()):
                raise Blocked('cannot reset unfinished transaction')
            (self.root/'intent.json').unlink()
