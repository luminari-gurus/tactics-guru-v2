"""OFFLINE filesystem checkpoint ONLY; never an installer backend.

Actual replacement/rollback of explicit disposable fixture files. No host tools,
credentials, account records, Docker/socket, SSH, chown, or network operations.
The fixture lock serializes cooperating processes; hostile same-UID writers are
out of scope. This module is deliberately confined to its offline-fixtures tree.
"""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile

BASE = Path('/opt/data/writeups/tactics-guru/ssh-install/offline-fixtures')
NAMES = frozenset({'accounts.fixture', 'sshd.fixture', 'container.fixture', 'manifest.fixture'})
LIMIT = 65536


class Blocked(Exception):
    pass


def digest(data):
    return hashlib.sha256(data).hexdigest()


def sync(path):
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def read_file(path, limit=LIMIT):
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    except OSError as error:
        raise Blocked('fixture file cannot be opened safely') from error
    try:
        s = os.fstat(fd)
        if not stat.S_ISREG(s.st_mode) or s.st_nlink != 1 or s.st_uid != os.getuid() or s.st_size > limit:
            raise Blocked('fixture file identity/type/size')
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            data = stream.read(limit + 1)
        if len(data) > limit:
            raise Blocked('fixture file too large')
        return data, stat.S_IMODE(s.st_mode)
    finally:
        os.close(fd)


class Transaction:
    def __init__(self, root, fault=None):
        self.root = Path(root).absolute()
        self.fault = fault or (lambda label: None)
        self.lock = None
        self._locked_state = None

    def __enter__(self):
        if self.lock is not None:
            raise Blocked('fixture transaction already locked')
        # Validate BEFORE opening/creating anything. No configurable host root.
        if self.root.parent != BASE or not self.root.name.startswith('tx-'):
            raise Blocked('offline fixture root required')
        for path in [self.root, *self.root.parents]:
            if path.is_symlink():
                raise Blocked('symlink fixture ancestor')
        s = self.root.stat()
        if not stat.S_ISDIR(s.st_mode) or s.st_uid != os.getuid() or stat.S_IMODE(s.st_mode) != 0o700:
            raise Blocked('private owned fixture directory required')
        fd = os.open(self.root / '.lock', os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        try:
            s = os.fstat(fd)
            if not stat.S_ISREG(s.st_mode) or s.st_nlink != 1 or s.st_uid != os.getuid() or stat.S_IMODE(s.st_mode) != 0o600:
                raise Blocked('fixture lock identity')
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BaseException:
            os.close(fd)
            raise
        self.lock = fd
        self._locked_state = (self.root, fd, os.fstat(fd))
        return self

    def __exit__(self, *args):
        if self.lock is not None:
            os.close(self.lock)
            self.lock = None
        self._locked_state = None

    def require_lock(self):
        if self.lock is None or self._locked_state is None:
            raise Blocked('fixture lock required')
        root, fd, identity = self._locked_state
        if self.root != root or self.lock != fd:
            raise Blocked('validated fixture root/lock changed')
        try:
            current = os.fstat(fd)
            if (current.st_dev, current.st_ino) != (identity.st_dev, identity.st_ino):
                raise Blocked('fixture lock identity changed')
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as error:
            raise Blocked('active fixture lock required') from error

    def atomic(self, name, data, mode, prefix):
        self.require_lock()
        if not isinstance(name, str) or (name not in NAMES and name != 'journal.json'):
            raise Blocked('only explicit fixture filenames or journal.json allowed')
        root = self._locked_state[0]
        fd, name_tmp = tempfile.mkstemp(prefix='.tmp-', dir=root)
        temp = Path(name_tmp)
        try:
            with os.fdopen(fd, 'wb') as out:
                os.fchmod(out.fileno(), mode)
                out.write(data)
                out.flush()
                os.fsync(out.fileno())
            self.fault(prefix + '-file-fsync')
            self.require_lock()
            os.replace(temp, root / name)
            self.fault(prefix + '-replace')
            sync(root)
            self.fault(prefix + '-directory-fsync')
        finally:
            temp.unlink(missing_ok=True)

    def save(self, state):
        self.require_lock()
        self.atomic('journal.json', json.dumps(state, sort_keys=True).encode(), 0o600, 'journal')

    def apply(self, changes):
        self.require_lock()
        if (self.root / 'journal.json').exists() or (self.root / 'journal.json').is_symlink():
            raise Blocked('existing transaction must be reconciled, not overwritten')
        if not isinstance(changes, dict) or not changes or not changes.keys() <= NAMES:
            raise Blocked('only explicit fixture filenames allowed')
        prepared = {}
        for name, after in changes.items():
            if not isinstance(after, bytes) or len(after) > LIMIT:
                raise Blocked('bounded fixture bytes required')
            before, mode = read_file(self.root / name)
            if mode != 0o600:
                raise Blocked('private fixture file mode required')
            prepared[name] = (before, after, mode)
        state = {'schema': 1, 'root': str(self.root), 'entries': [], 'rolled_back': False}
        for name, (before, after, mode) in prepared.items():
            # Independent original bytes durable BEFORE intent/target mutation.
            backup = self.root / ('.before-' + name)
            fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
            with os.fdopen(fd, 'wb') as out:
                out.write(before)
                out.flush()
                os.fsync(out.fileno())
            sync(self.root)
            self.fault('backup-durable')
            state['entries'].append({'name': name, 'before': digest(before),
                                     'after': digest(after), 'mode': mode, 'complete': False})
            self.save(state)
            self.fault('intent-durable')
            # Reconcile exact input immediately before replacing it.
            current, current_mode = read_file(self.root / name)
            if current != before or current_mode != mode:
                raise Blocked('fixture mutation-boundary drift')
            self.atomic(name, after, mode, 'target')
            if read_file(self.root / name) != (after, mode):
                raise Blocked('fixture completion readback')
            state['entries'][-1]['complete'] = True
            self.save(state)
            self.fault('completion-durable')

    def rollback(self):
        self.require_lock()
        journal = self.root / 'journal.json'
        if not journal.exists() and not journal.is_symlink():
            # No durable intent means no target mutation was started.
            return
        raw, mode = read_file(journal)
        if mode != 0o600:
            raise Blocked('private journal mode required')
        state = json.loads(raw)
        if state.get('schema') != 1 or state.get('root') != str(self.root) or not isinstance(state.get('entries'), list):
            raise Blocked('fixture journal binding')
        names = [entry.get('name') for entry in state['entries']]
        if not names or len(set(names)) != len(names) or not set(names) <= NAMES:
            raise Blocked('fixture journal entries')
        for entry in reversed(state['entries']):
            name = entry['name']
            before, backup_mode = read_file(self.root / ('.before-' + name))
            if backup_mode != 0o600 or digest(before) != entry['before'] or entry['mode'] != 0o600:
                raise Blocked('independent fixture backup corrupt')
            current, current_mode = read_file(self.root / name)
            if current_mode != entry['mode'] or digest(current) not in (entry['before'], entry['after']):
                raise Blocked('unrelated fixture drift; do not overwrite')
            # Current bytes may already be original after a lost restore response.
            if current != before:
                self.atomic(name, before, entry['mode'], 'restore')
            if read_file(self.root / name) != (before, entry['mode']):
                raise Blocked('fixture restore readback')
            sync(self.root)
        state['rolled_back'] = True
        self.save(state)
        # Crashed atomic writes are fixture-only remnants; never remove directories.
        for temp in self.root.glob('.tmp-*'):
            read_file(temp)
            temp.unlink()
        sync(self.root)
