"""Durable OFFLINE filesystem backend; no host adapter or installer CLI.

Fixed disposable /fixture tree only. Root/trusted administrator owns the evidence
and lock; deploy UID writers cannot replace ancestors/evidence/code/key/policy.
Malicious root/same-UID writers and power-loss filesystem semantics are NOT
claimed. No ACL/xattr support: reject rather than silently lose attributes.
"""
import fcntl
import glob
import json
import os
from pathlib import Path
import shlex
import stat
from offline_transaction import Blocked, digest, sync

BASE = Path('/fixture/offline-files')
AREAS = {'code', 'keys', 'releases', 'nginx', 'ssh'}
LIMIT = 1024 * 1024
MAX_ENTRIES = 4096


def encode(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()


class Files:
    def __init__(self, root, fault=None):
        self.root = Path(root)
        self.fault = fault or (lambda point: None)
        self.fd = None
        self.identity = None
        self.tree_identity = None
        self._active_install = None

    def __enter__(self):
        if self.fd is not None or os.geteuid() != 0 or self.root.parent != BASE or not self.root.name.startswith('fs-'):
            raise Blocked('fixed disposable root-owned fixture required')
        for p in (self.root, *self.root.parents):
            s = p.lstat()
            if not stat.S_ISDIR(s.st_mode) or s.st_uid != 0 or s.st_mode & 0o022:
                raise Blocked('root-owned nonwritable nonsymlink ancestors required')
        if stat.S_IMODE(self.root.stat().st_mode) != 0o700:
            raise Blocked('private evidence root required')
        fd = os.open(self.root/'.lock', os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        try:
            s = os.fstat(fd)
            if not stat.S_ISREG(s.st_mode) or s.st_nlink != 1 or s.st_uid != 0 or s.st_gid != 0 or stat.S_IMODE(s.st_mode) != 0o600:
                raise Blocked('private root lock required')
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BaseException:
            os.close(fd)
            raise
        self.fd = fd
        self.identity = (self.root, self.root.stat().st_dev, self.root.stat().st_ino, s.st_dev, s.st_ino)
        try:
            self.check()
            s = (self.root/'tree').lstat()
            if not stat.S_ISDIR(s.st_mode) or s.st_uid != 0 or stat.S_IMODE(s.st_mode) != 0o700 or s.st_dev != self.identity[1]:
                raise Blocked('private same-filesystem fixture tree required')
            self.tree_identity = (s.st_dev,s.st_ino)
        except BaseException:
            self.__exit__()
            raise
        return self

    def __exit__(self, *args):
        if self.fd is not None:
            os.close(self.fd)
        self.fd = None
        self.identity = None

    def check(self):
        self._check_identity()

    def _check_identity(self):
        if self.fd is None or self.identity is None or self.root != self.identity[0]:
            raise Blocked('validated lock required')
        s = self.root.lstat(); lock = (self.root/'.lock').lstat(); fd = os.fstat(self.fd)
        if (s.st_dev, s.st_ino, lock.st_dev, lock.st_ino) != self.identity[1:] or (fd.st_dev, fd.st_ino) != self.identity[3:]:
            raise Blocked('root/lock identity drift')
        if not stat.S_ISDIR(s.st_mode) or s.st_uid != 0 or stat.S_IMODE(s.st_mode) != 0o700:
            raise Blocked('root metadata drift')
        if self.tree_identity is not None:
            tree=(self.root/'tree').lstat()
            if (tree.st_dev,tree.st_ino)!=self.tree_identity or not stat.S_ISDIR(tree.st_mode) or tree.st_uid!=0 or stat.S_IMODE(tree.st_mode)!=0o700:
                raise Blocked('tree identity/metadata drift')

    def path(self, name):
        self.check()
        if not isinstance(name, str) or not name or any(x in ('', '.', '..') for x in name.split('/')) or name.split('/')[0] not in AREAS:
            raise Blocked('explicit fixture area/path required')
        p = self.root/'tree'/name
        for parent in p.parents:
            if parent == self.root: break
            if parent.exists() or parent.is_symlink():
                s = parent.lstat()
                if not stat.S_ISDIR(s.st_mode) or s.st_uid != 0 or s.st_mode & 0o022:
                    raise Blocked('target ancestor owner/write/symlink drift')
        return p

    def read(self, p, private=False):
        p=Path(p)
        if not p.is_relative_to(self.root) or '..' in p.parts: raise Blocked('confined read required')
        self.check()
        for parent in p.parents:
            if parent == self.root: break
            s = parent.lstat()
            if not stat.S_ISDIR(s.st_mode) or s.st_uid != 0 or s.st_mode & 0o022:
                raise Blocked('evidence ancestor drift')
        fd = os.open(p, os.O_RDONLY | os.O_NOFOLLOW)
        try:
            s = os.fstat(fd)
            if not stat.S_ISREG(s.st_mode) or s.st_nlink != 1 or s.st_size > LIMIT:
                raise Blocked('bounded single-link regular file required')
            if private and (s.st_uid != 0 or s.st_gid != 0 or stat.S_IMODE(s.st_mode) != 0o600):
                raise Blocked('root-private evidence required')
            with os.fdopen(fd, 'rb', closefd=False) as f: data = f.read(LIMIT + 1)
            if len(data) > LIMIT: raise Blocked('size limit')
            return data
        finally:
            os.close(fd)

    def describe(self, name):
        p = self.path(name)
        try: s = p.lstat()
        except FileNotFoundError: return None
        if os.listxattr(p, follow_symlinks=False):
            raise Blocked('ACL/xattr metadata unsupported')
        d = {'uid':s.st_uid, 'gid':s.st_gid, 'mode':stat.S_IMODE(s.st_mode)}
        if stat.S_ISREG(s.st_mode):
            d.update(kind='file', sha=digest(self.read(p)))
        elif stat.S_ISDIR(s.st_mode):
            if s.st_uid != 0 or s.st_mode & 0o022: raise Blocked('nonwritable root directories required')
            d.update(kind='dir')
        elif stat.S_ISLNK(s.st_mode):
            target = os.readlink(p)
            if name.startswith('ssh/') or Path(target).is_absolute(): raise Blocked('SSH/absolute symlinks forbidden')
            resolved = (p.parent/target).resolve()
            if not resolved.is_relative_to(self.root/'tree'): raise Blocked('escaping symlink')
            d.update(kind='link', link=target)
        else: raise Blocked('special file unsupported')
        return d

    def inventory(self):
        self.check()
        result = {}
        def visit(p):
            for item in sorted(p.iterdir()):
                name = item.relative_to(self.root/'tree').as_posix()
                result[name] = self.describe(name)
                if len(result) > MAX_ENTRIES: raise Blocked('inventory limit')
                if result[name]['kind'] == 'dir': visit(item)
        visit(self.root/'tree')
        return result

    def ssh_inventory(self):
        self.check()
        seen = {}; active = set()
        def visit(name):
            if name in active: raise Blocked('cyclic SSH Include')
            if name in seen: return
            if len(active)>128 or len(seen)>MAX_ENTRIES: raise Blocked('SSH recursion limit')
            p = self.path(name); desc = self.describe(name)
            if desc is None or desc['kind'] != 'file': raise Blocked('SSH Include file required')
            seen[name] = desc; active.add(name)
            text = self.read(p).decode('utf-8', errors='strict')
            for line in text.splitlines():
                words = shlex.split(line, comments=True)
                if words and words[0].lower() == 'include':
                    if len(words) < 2: raise Blocked('empty Include')
                    for pattern in words[1:]:
                        if Path(pattern).is_absolute(): raise Blocked('fixture relative SSH Include only')
                        candidate = Path(os.path.normpath(self.root/'tree/ssh'/pattern))
                        if not candidate.is_relative_to(self.root/'tree/ssh'): raise Blocked('Include outside SSH fixture')
                        for match in sorted(glob.glob(str(candidate))):
                            visit(Path(match).relative_to(self.root/'tree').as_posix())
            active.remove(name)
        visit('ssh/sshd_config')
        return seen

    def _write(self, destination, data, label):
        self.check()
        if len(data) > LIMIT: raise Blocked('bounded evidence bytes required')
        # No public arbitrary destination helper: all evidence stays in state.
        if destination.parent not in (self.root/'state', self.root/'state/blobs') or destination.is_symlink():
            raise Blocked('confined evidence destination required')
        self.read_parents(destination)
        temporary = destination.parent/('.pending-'+destination.name)
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        try:
            with os.fdopen(fd, 'wb') as f:
                f.write(data); f.flush(); os.fsync(f.fileno())
            self.fault(label+'-file-fsync')
            os.replace(temporary, destination); sync(destination.parent)
            self.fault(label+'-directory-fsync')
        finally:
            temporary.unlink(missing_ok=True)

    def read_parents(self, p):
        self.check()
        for parent in p.parents:
            if parent == self.root: break
            s = parent.lstat()
            if not stat.S_ISDIR(s.st_mode) or s.st_uid != 0 or s.st_gid != 0 or stat.S_IMODE(s.st_mode) != 0o700:
                raise Blocked('private evidence directories required')

    def _save(self, state):
        self._write(self.root/'state/journal.json', encode(state), 'journal')

    def original(self):
        self.check()
        raw = self.read(self.root/'state/original.json', True)
        value = json.loads(raw)
        if encode(value) != raw or value.get('root') != str(self.root): raise Blocked('original binding')
        return value['inventory']

    def blob(self, entry):
        self.check()
        sha = entry.get('sha')
        if not isinstance(sha, str) or len(sha) != 64 or any(c not in '0123456789abcdef' for c in sha): raise Blocked('invalid digest')
        data = self.read(self.root/'state/blobs'/sha, True)
        if digest(data) != sha: raise Blocked('corrupt independent blob')
        return data

    def _candidate(self, spec):
        if not isinstance(spec, dict) or spec.get('kind') not in ('file', 'dir','link'):
            raise Blocked('file/directory candidate required')
        fields={'kind','uid','gid','mode'}
        if spec['kind']=='file': fields.add('data')
        if spec['kind']=='link': fields.add('link')
        if set(spec) != fields:
            raise Blocked('exact candidate fields')
        modes=(0o777,) if spec['kind']=='link' else (0o600,0o640,0o644,0o700,0o750,0o755)
        if any(type(spec[k]) is not int or not 0 <= spec[k] <= 2147483647 for k in ('uid','gid','mode')) or spec['uid'] != 0 or spec['mode'] not in modes:
            raise Blocked('root-owned nonwritable public/private candidate required')
        if spec['kind']=='link' and (not isinstance(spec['link'],str) or not spec['link'] or Path(spec['link']).is_absolute() or '\x00' in spec['link']): raise Blocked('bounded relative symlink required')
        d = {k:v for k,v in spec.items() if k!='data'}
        if spec['kind']=='file':
            if not isinstance(spec['data'], bytes) or len(spec['data']) > LIMIT: raise Blocked('bounded candidate bytes')
            d['sha'] = digest(spec['data'])
        return d

    def apply(self, changes):
        self.check()
        if (self.root/'state').exists() or (self.root/'state').is_symlink(): raise Blocked('existing transaction must be recovered')
        if not isinstance(changes, dict) or not changes or len(changes)>MAX_ENTRIES: raise Blocked('bounded changes required')
        before = self.inventory(); ssh = self.ssh_inventory()
        entries = []
        for name in sorted(changes, key=lambda n:(n.count('/'),n)):
            self.path(name); after = self._candidate(changes[name]); original = before.get(name)
            if after['kind']=='link':
                p=self.path(name)
                if not name.startswith('releases/') or not (p.parent/after['link']).resolve().is_relative_to(self.root/'tree/releases'):
                    raise Blocked('only confined release links supported')
            if original is not None and (original['kind'] not in ('file','link') or after['kind'] != original['kind']):
                raise Blocked('only file replacement or new directories/files supported')
            parent = str(Path(name).parent)
            if parent != '.' and parent not in before and (parent not in changes or changes[parent]['kind']!='dir'):
                raise Blocked('missing planned ancestor')
            entries.append({'name':name, 'before':original, 'after':after, 'started':False, 'complete':False})
        original_raw = encode({'root':str(self.root), 'inventory':before, 'ssh':ssh})
        state = {'schema':1, 'root':str(self.root), 'original_sha':digest(original_raw), 'entries':entries, 'rolled_back':False}
        # Only the boolean progress flags change. JSON false is longer than true,
        # so the initial all-false journal bounds every forward/restore save.
        if len(original_raw) > LIMIT or len(encode(state)) > LIMIT:
            raise Blocked('bounded original and largest journal required')
        (self.root/'state').mkdir(mode=0o700); sync(self.root)
        (self.root/'state/blobs').mkdir(mode=0o700); sync(self.root/'state')
        for name, entry in before.items():
            if entry['kind']=='file':
                destination = self.root/'state/blobs'/entry['sha']
                if not destination.exists(): self._write(destination, self.read(self.path(name)), 'backup')
        # Candidate hashes are already bound in intent's after descriptions.
        # Independent root-private bytes must be durable and validated before
        # intent publication or any target mutation, including partial staging.
        for entry in entries:
            if entry['after']['kind']=='file':
                destination = self.root/'state/blobs'/entry['after']['sha']
                if not destination.exists():
                    self._write(destination, changes[entry['name']]['data'], 'candidate')
                self.blob(entry['after'])
        self._write(self.root/'state/original.json', original_raw, 'backup')
        self._save(state); self.fault('intent-durable')
        expected = dict(before)
        for entry in entries:
            if self.inventory()!=expected or self.ssh_inventory()!={k:v for k,v in ssh.items()}:
                # After our own SSH changes, inventory remains authoritative; includes
                # may change only on the LAST owned policy file mutation below.
                raise Blocked('mutation-boundary inventory/SSH drift')
            entry['started']=True; self._save(state)
            self._active_install=(entry['name'],entry['after'],False)
            try: self._install(entry['name'], entry['after'], changes[entry['name']].get('data'))
            finally: self._active_install=None
            if self.describe(entry['name'])!=entry['after']: raise Blocked('completion metadata/bytes readback')
            expected[entry['name']]=entry['after']; ssh=self.ssh_inventory()
            entry['complete']=True; self._save(state); self.fault('completion-durable')

    def _install(self, name, entry, data=None, restore=False):
        self.check()
        if self._active_install!=(name,entry,restore): raise Blocked('journal-bound installation required')
        if entry['kind']=='file' and (not isinstance(data,bytes) or digest(data)!=entry['sha']): raise Blocked('candidate bytes/hash mismatch')
        p = self.path(name)
        if entry['kind']=='dir':
            p.mkdir(mode=0o700); self.fault('mkdir')
            os.chown(p,entry['uid'],entry['gid']); self.fault('directory-chown')
            p.chmod(entry['mode']); self.fault('directory-chmod')
            sync(p); sync(p.parent); self.fault('directory-fsync')
            return
        stage = self.root/'state'/('stage-'+digest(name.encode()))
        self.read_parents(stage)
        if entry['kind']=='link':
            os.symlink(entry['link'],stage); self.fault('link-write')
            os.chown(stage,entry['uid'],entry['gid'],follow_symlinks=False); self.fault('link-chown')
            sync(stage.parent); self.fault('link-directory-fsync')
            os.replace(stage,p); self.fault('restore-replace' if restore else 'replace')
            sync(p.parent); self.fault('restore-directory-fsync' if restore else 'target-directory-fsync')
            return
        fd = os.open(stage, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd,'wb') as f:
            self.fault('file-stage-open')
            f.write(data); f.flush(); self.fault('file-write')
            os.fchown(f.fileno(),entry['uid'],entry['gid']); self.fault('file-chown')
            os.fchmod(f.fileno(),entry['mode']); self.fault('file-chmod')
            os.fsync(f.fileno()); self.fault('file-fsync')
        os.replace(stage,p); self.fault('restore-replace' if restore else 'replace')
        sync(p.parent); self.fault('restore-directory-fsync' if restore else 'target-directory-fsync')

    def rollback(self):
        self.check()
        journal=self.root/'state/journal.json'
        if not journal.exists() and not journal.is_symlink(): return
        state=json.loads(self.read(journal,True))
        if state.get('schema')!=1 or state.get('root')!=str(self.root) or not isinstance(state.get('entries'),list): raise Blocked('journal binding')
        raw=self.read(self.root/'state/original.json',True)
        if digest(raw)!=state.get('original_sha'): raise Blocked('corrupt original manifest')
        original=self.original()
        # Verify ALL backup artifacts and ALL owned targets before any restore.
        for entry in original.values():
            if entry['kind']=='file': self.blob(entry)
        names=set(); entries=state['entries']
        for entry in entries:
            name=entry['name']; self.path(name)
            if name in names or entry['before']!=original.get(name): raise Blocked('journal ownership')
            names.add(name)
            if entry['after']['kind']=='file': self.blob(entry['after'])
            if not entry['started']: continue
            current=self.describe(name); permitted=[entry['before'],entry['after']]
            if entry['before'] is None and entry['after']['kind']=='dir':
                permitted += [dict(entry['after'],mode=0o700,gid=0),dict(entry['after'],mode=0o700)]
                # New directories containing unowned children cannot be removed.
                if current is not None:
                    for child in self.path(name).rglob('*'):
                        if child.relative_to(self.root/'tree').as_posix() not in names.union(e['name'] for e in entries):
                            raise Blocked('unowned child in created directory')
            if current not in permitted: raise Blocked('owned bytes/metadata drift; preserve unrelated changes')
        self._clean_stages(state,original)
        for entry in reversed(entries):
            if not entry['started']: continue
            name=entry['name']; before=entry['before']; current=self.describe(name)
            if current != before:
                if before is None:
                    p=self.path(name)
                    if current['kind']=='dir': p.rmdir()
                    else: p.unlink()
                    sync(p.parent)
                else:
                    self._active_install=(name,before,True)
                    try: self._install(name,before,self.blob(before) if before['kind']=='file' else None,restore=True)
                    finally: self._active_install=None
            if self.describe(name)!=before: raise Blocked('restore readback')
            # Also fence an already-restored target after a lost replace response.
            if self.path(name).parent.exists(): sync(self.path(name).parent)
        state['rolled_back']=True; self._save(state); self.fault('restore-completion')
        self._clean_stages(state,original)

    def _clean_stages(self,state,original):
        self.check()
        for entry in state['entries']:
            p=self.root/'state'/('stage-'+digest(entry['name'].encode()))
            if not p.exists() and not p.is_symlink(): continue
            if not entry['started']: raise Blocked('unowned stage')
            s=p.lstat(); choices=[e for e in (entry['before'],entry['after']) if e is not None]
            valid=False
            for e in choices:
                metadata=(s.st_uid,s.st_gid,stat.S_IMODE(s.st_mode))
                allowed=((0,0,0o600),(e['uid'],e['gid'],0o600),(e['uid'],e['gid'],e['mode']))
                if e['kind']=='link': allowed+=((0,0,0o777),)
                if metadata not in allowed: continue
                if e['kind']=='link' and stat.S_ISLNK(s.st_mode) and os.readlink(p)==e['link']: valid=True
                elif e['kind']=='file' and stat.S_ISREG(s.st_mode):
                    data=self.read(p)
                    if self.blob(e).startswith(data): valid=True
            if not valid: raise Blocked('unowned/corrupt stage')
            p.unlink()
        p=self.root/'state/.pending-journal.json'
        if p.exists() or p.is_symlink(): self.read(p,True); p.unlink()
        sync(self.root/'state'); sync(self.root/'state/blobs')
