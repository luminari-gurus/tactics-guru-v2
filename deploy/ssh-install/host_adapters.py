"""Genuine host account/files adapters; pure engines have explicit trusted context.

Production construction requires the real host console and exclusive operator
maintenance. No CLI fixture switch. This is NOT a complete SSH installer:
PAM/session/admission fencing and full host plan verification remain required.
"""
from contextlib import contextmanager
import fcntl
import hashlib
import json
from offline_transaction import sync
import os
from pathlib import Path
import stat
import subprocess
import time
from host_account_engine import AccountEngine, FILES, Blocked
from durable_files import Files, LIMIT, MAX_ENTRIES
from host_backend import require_host_console, secure_directory
from docker_mount_tx import remaining
from offline_transaction import digest

def bind_private(path,data):
    """Durable bounded context binding; interrupted unpublished binding blocks."""
    if len(data)>4096:raise Blocked('context binding limit')
    if not path.exists():
        temporary=path.with_suffix('.pending')
        fd=os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
        with os.fdopen(fd,'wb') as stream:
            stream.write(data);stream.flush();os.fsync(stream.fileno())
        os.replace(temporary,path);sync(path.parent)
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
    try:
        s=os.fstat(fd)
        if not stat.S_ISREG(s.st_mode) or s.st_nlink!=1 or s.st_uid!=0 or s.st_gid!=0 or stat.S_IMODE(s.st_mode)!=0o600 or s.st_size>4096:raise Blocked('unsafe saved context')
        if os.read(fd,4097)!=data:raise Blocked('saved context drift')
    finally:os.close(fd)

class TrustedRootBackend:
    """Root-owned typed dependency injection; not an operator authorization API.

    maintenance must establish independent writer exclusion for the entire
    transaction. Production uses an authenticated console/operator contract;
    isolated tests supply an owned socket-free container context separately.
    """
    def __init__(self,account_journal,database_dir,targets,maintenance):
        if os.geteuid()!=0: raise Blocked('root engine required')
        if set(targets)!={'home','code','keys','releases','ssh'} or not callable(maintenance):
            raise Blocked('exact target areas and maintenance authority required')
        self.account_journal=Path(account_journal); self.database_dir=Path(database_dir)
        self.targets={k:Path(v) for k,v in targets.items()}; self.maintenance=maintenance
        paths=[self.account_journal,self.database_dir,*self.targets.values()]
        if any(not p.is_absolute() or '..' in p.parts for p in paths): raise Blocked('absolute canonical roots required')
        if len(set(paths))!=len(paths):raise Blocked('distinct roots required')
        confined=[self.account_journal,*self.targets.values()]
        for i,p in enumerate(confined):
            if any(p.is_relative_to(q) or q.is_relative_to(p) for q in confined[i+1:]):raise Blocked('overlapping roots forbidden')
        if any(t==self.database_dir/n or (self.database_dir/n).is_relative_to(t) for t in self.targets.values() for n in FILES):raise Blocked('database/target overlap')
        self.identities={p:(p.stat().st_dev,p.stat().st_ino) for p in (self.account_journal,self.database_dir)}
        self.check()
        binding=json.dumps({'schema':1,'database':str(self.database_dir),'database_identity':self.identities[self.database_dir],'targets':{k:str(v) for k,v in self.targets.items()}},sort_keys=True).encode()
        bind_private(self.account_journal/'context.json',binding)
    def check(self):
        if os.geteuid()!=0:raise Blocked('root engine required')
        self.maintenance()
        for p in (self.account_journal,self.database_dir):
            secure_directory(p,private=p==self.account_journal)
            if (p.stat().st_dev,p.stat().st_ino)!=self.identities[p]:raise Blocked('trusted root identity drift')
        for p in self.targets.values():secure_directory(p.parent)

class AccountStage:
    def __init__(self,context,runner):self.context=context;self.runner=runner
    def engine(self):return AccountEngine(self.context)
    def preflight(self,deadline):
        remaining(deadline)
        with self.engine().locked(databases=True):
            if self.engine().state() is not None:raise Blocked('existing account intent')
            self.engine().records(None)
    def apply(self,deadline):
        self.context.check();remaining(deadline)
        self.engine().create(lambda command:self.runner(command,deadline) if getattr(self.runner,'deadline_bound',False) else self.runner(command))
        remaining(deadline)
    def rollback(self,deadline):
        self.context.check();remaining(deadline)
        engine=self.engine()
        engine.reconcile_owned_locks(native_writers_excluded=True)
        engine.rollback(lambda command:self.runner(command,deadline) if getattr(self.runner,'deadline_bound',False) else self.runner(command))
        remaining(deadline)

class MappedFiles(Files):
    """Reuse durable backups/reconciliation with explicit real target mapping.

    Only release storage may be deploy-owned. No symlinks, xattrs, arbitrary
    policies or code names accepted. Cross-filesystem staging is refused.
    """
    def __init__(self,context,root,fault=None):
        super().__init__(root,fault);self.context=context
    def __enter__(self):
        self.context.check();secure_directory(self.root,private=True)
        for target in self.context.targets.values():
            if self.root.is_relative_to(target) or target.is_relative_to(self.root):raise Blocked('evidence/target overlap')
        if self.fd is not None:raise Blocked('already open')
        fd=os.open(self.root/'.lock',os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW,0o600)
        try:
            s=os.fstat(fd)
            if not stat.S_ISREG(s.st_mode) or s.st_nlink!=1 or s.st_uid!=0 or s.st_gid!=0 or stat.S_IMODE(s.st_mode)!=0o600:raise Blocked('root private lock')
            fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            self.fd=fd;self.identity=(self.root,self.root.stat().st_dev,self.root.stat().st_ino,s.st_dev,s.st_ino)
            self.check()
            binding=json.dumps({'schema':1,'database':str(self.context.database_dir),'targets':{k:str(v) for k,v in self.context.targets.items()}},sort_keys=True).encode()
            destination=self.root/'context.json'
            if not destination.exists():
                pending=self.root/'context.pending'
                out=os.open(pending,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
                with os.fdopen(out,'wb') as stream:
                    stream.write(binding);stream.flush();os.fsync(stream.fileno())
                os.replace(pending,destination);sync(self.root)
            if self.read(destination,True)!=binding:raise Blocked('saved target mapping drift')
        except BaseException:
            os.close(fd);self.fd=None;raise
        return self
    def check(self):
        self.context.check();self._check_identity()
    def path(self,name):
        self.check()
        if not isinstance(name,str) or any(x in ('','.','..') for x in name.split('/')):raise Blocked('canonical target name')
        area,*parts=name.split('/')
        if area not in self.context.targets:raise Blocked('unknown target area')
        fixed={'home':{''},'code':{'','wrapper'},'keys':{'','authorized_keys'},'ssh':{'','policy.conf'}}
        suffix='/'.join(parts)
        if area!='releases' and suffix not in fixed[area]:raise Blocked('exact target allowlist')
        if len(name)>512 or len(parts)>32:raise Blocked('bounded target path')
        p=self.context.targets[area].joinpath(*parts)
        for parent in p.parents:
            if area=='releases' and parent.is_relative_to(self.context.targets['releases']):
                if not parent.exists() and not parent.is_symlink():continue
                s=parent.lstat()
                if not stat.S_ISDIR(s.st_mode) or s.st_uid not in (0,11002) or s.st_gid not in (0,11002) or s.st_mode&0o022:raise Blocked('release ancestor drift')
            else:
                if parent.exists() or parent.is_symlink():secure_directory(parent)
        existing=p.parent
        while not existing.exists():existing=existing.parent
        if existing.stat().st_dev!=self.root.stat().st_dev:raise Blocked('same-filesystem durable staging required')
        return p
    def read(self,p,private=False):
        p=Path(p)
        if p.is_relative_to(self.root):return super().read(p,private)
        matches=[area for area,base in self.context.targets.items() if p==base or p.is_relative_to(base)]
        if len(matches)!=1:raise Blocked('allowlisted read required')
        area=matches[0];suffix=p.relative_to(self.context.targets[area]).as_posix()
        if self.path(area+('' if suffix=='.' else '/'+suffix))!=p:raise Blocked('path mismatch')
        fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
        try:
            s=os.fstat(fd)
            if not stat.S_ISREG(s.st_mode) or s.st_nlink!=1 or s.st_size>LIMIT:raise Blocked('bounded regular target')
            with os.fdopen(os.dup(fd),'rb') as f:data=f.read(LIMIT+1)
            if len(data)>LIMIT:raise Blocked('target limit')
            return data
        finally:os.close(fd)
    def describe(self,name):
        p=self.path(name)
        try:s=p.lstat()
        except FileNotFoundError:return None
        if os.listxattr(p,follow_symlinks=False):raise Blocked('ACL/xattrs unsupported')
        allowed=(0,11002) if name=='releases' or name.startswith('releases/') else (0,)
        if s.st_uid not in allowed or s.st_gid not in allowed or s.st_mode&0o022:raise Blocked('target owner/write drift')
        d={'uid':s.st_uid,'gid':s.st_gid,'mode':stat.S_IMODE(s.st_mode),'device':s.st_dev,'inode':s.st_ino}
        if stat.S_ISREG(s.st_mode):d.update(kind='file',sha=digest(self.read(p)))
        elif stat.S_ISDIR(s.st_mode):d.update(kind='dir')
        else:raise Blocked('symlink/special target unsupported')
        return d
    def inventory(self):
        result={}
        def visit(name):
            desc=self.describe(name)
            if desc is None:return
            result[name]=desc
            if len(result)>MAX_ENTRIES:raise Blocked('inventory limit')
            if desc['kind']=='dir':
                for child in sorted(self.path(name).iterdir()):visit(name+'/'+child.name)
        for area in sorted(self.context.targets):visit(area)
        return result
    def ssh_inventory(self):
        # Inventory only the owned snippet. Full sshd Include/PAM barrier is a
        # separate remaining whole-installer requirement, never claimed here.
        value=self.describe('ssh/policy.conf')
        return {} if value is None else {'ssh/policy.conf':value}
    def _candidate(self,spec):
        if spec.get('uid')==11002:
            if spec.get('gid')!=11002:raise Blocked('dedicated release group required')
            return dict(super()._candidate(dict(spec,uid=0)),uid=11002)
        return super()._candidate(spec)
    def apply(self,changes):
        for name,spec in changes.items():
            self.path(name)
            if spec.get('uid')==11002 and not (name=='releases' or name.startswith('releases/')):raise Blocked('deploy ownership confined to releases')
            if spec.get('kind')=='link':raise Blocked('links unsupported')
        return super().apply(changes)

    def _save(self,state):
        self._mapped_state=state
        return super()._save(state)

    def _install(self,name,entry,data=None,restore=False):
        self.check()
        if self._active_install!=(name,entry,restore):raise Blocked('journal-bound installation required')
        if entry['kind']=='file' and (not isinstance(data,bytes) or digest(data)!=entry['sha']):raise Blocked('candidate bytes/hash mismatch')
        target=self.path(name);stage=self.root/'state'/('stage-'+digest(name.encode()))
        self.read_parents(stage)
        # Allocate privately, then persist its identity BEFORE publishing it.
        # Lost mkdir/replace responses therefore never require content ownership.
        if entry['kind']=='dir':
            stage.mkdir(mode=0o700);fd=None
        else:fd=os.open(stage,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
        try:
            s=stage.lstat();entry.update(device=s.st_dev,inode=s.st_ino)
            state=self._mapped_state
            self._save(state)
            if fd is not None:
                self.fault('file-stage-open')
                with os.fdopen(fd,'wb') as stream:
                    fd=None;stream.write(data);stream.flush();self.fault('file-write')
                    os.fchown(stream.fileno(),entry['uid'],entry['gid']);self.fault('file-chown')
                    os.fchmod(stream.fileno(),entry['mode']);self.fault('file-chmod')
                    os.fsync(stream.fileno());self.fault('file-fsync')
            else:
                os.chown(stage,entry['uid'],entry['gid']);self.fault('directory-chown')
                stage.chmod(entry['mode']);self.fault('directory-chmod');sync(stage)
            sync(stage.parent)
            os.replace(stage,target);self.fault('restore-replace' if restore else ('mkdir' if entry['kind']=='dir' else 'replace'))
            sync(target.parent);self.fault('restore-directory-fsync' if restore else ('directory-fsync' if entry['kind']=='dir' else 'target-directory-fsync'))
        finally:
            if fd is not None:os.close(fd)

    def verify_owned(self,name):
        state=json.loads(self.read(self.root/'state/journal.json',True))
        entries=[e for e in state['entries'] if e['name']==name]
        if len(entries)!=1 or not entries[0]['complete'] or self.describe(name)!=entries[0]['after']:
            raise Blocked('installed target identity/bytes/metadata drift')
        return entries[0]['after']

    def remove_owned(self,name):
        self.verify_owned(name)
        state=json.loads(self.read(self.root/'state/journal.json',True))
        entry=next(e for e in state['entries'] if e['name']==name)
        if entry['before'] is not None:raise Blocked('only new policy target removal')
        # Durable deletion intent precedes unlink; recovery accepts absent only
        # for this exact explicitly removed member, not a missing owned file.
        entry['removed']=True;self._save(state)
        self.path(name).unlink();sync(self.path(name).parent)

    def _clean_stages(self,state,original):
        for entry in state['entries']:
            stage=self.root/'state'/('stage-'+digest(entry['name'].encode()))
            if not stage.exists() and not stage.is_symlink():continue
            s=stage.lstat()
            choices=[e for e in (entry.get('restored'),entry['after']) if e is not None]
            if not any((s.st_dev,s.st_ino)==(e.get('device'),e.get('inode')) for e in choices):raise Blocked('foreign staging inode; preserve')
            if stat.S_ISDIR(s.st_mode):
                stage.rmdir();sync(stage.parent)
        super()._clean_stages(state,original)

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
            if entry.get('restored') is not None:permitted.append(entry['restored'])
            if entry.get('removed') is True and entry['before'] is None:permitted.append(None)
            if name=='keys/authorized_keys' and 'inode' in entry['after']:
                permitted.append(dict(entry['after'],sha=digest(b'')))
            if entry['before'] is None and entry['after']['kind']=='dir':
                permitted += [dict(entry['after'],uid=0,gid=0,mode=0o700),dict(entry['after'],mode=0o700,gid=0),dict(entry['after'],mode=0o700)]
                # New directories containing unowned children cannot be removed.
                if current is not None:
                    for child in self.path(name).rglob('*'):
                        if self.target_name(child) not in names.union(e['name'] for e in entries):
                            raise Blocked('unowned child in created directory')
            if current not in permitted: raise Blocked('owned bytes/metadata drift; preserve unrelated changes')
        self._clean_stages(state,original)
        for entry in reversed(entries):
            if not entry['started']: continue
            name=entry['name']; before=entry.get('restored',entry['before']); current=self.describe(name)
            if current != before:
                if before is None:
                    p=self.path(name)
                    if current['kind']=='dir': p.rmdir()
                    else: p.unlink()
                    sync(p.parent)
                else:
                    before=dict(entry['before']);entry['restored']=before;self._save(state)
                    self._active_install=(name,before,True)
                    try: self._install(name,before,self.blob(before) if before['kind']=='file' else None,restore=True)
                    finally: self._active_install=None
            if self.describe(name)!=before: raise Blocked('restore readback')
            # Also fence an already-restored target after a lost replace response.
            if self.path(name).parent.exists(): sync(self.path(name).parent)
        state['rolled_back']=True; self._save(state); self.fault('restore-completion')
        self._clean_stages(state,original)

    def target_name(self,p):
        for area,base in self.context.targets.items():
            if p.is_relative_to(base):return area+'/'+p.relative_to(base).as_posix()
        raise Blocked('child outside targets')

class FileStage:
    def __init__(self,context,journal,changes):self.context=context;self.journal=Path(journal);self.changes=changes
    def preflight(self,deadline):
        remaining(deadline)
        with MappedFiles(self.context,self.journal) as f:
            before=f.inventory();f.ssh_inventory()
            if (f.root/'state').exists():raise Blocked('existing file transaction')
            if not isinstance(self.changes,dict) or not self.changes or len(self.changes)>MAX_ENTRIES:raise Blocked('bounded file plan required')
            descriptions={}
            for name,spec in self.changes.items():
                f.path(name);after=f._candidate(spec);descriptions[name]=after
                if spec.get('uid')==11002 and not (name=='releases' or name.startswith('releases/')):raise Blocked('deploy ownership confined to releases')
                if after['kind']=='link':raise Blocked('links unsupported')
                original=before.get(name)
                if original is not None and (original['kind']!='file' or after['kind']!='file'):raise Blocked('only file replacements or new targets')
                parent=str(Path(name).parent)
                if parent!='.' and parent not in before and (parent not in self.changes or self.changes[parent]['kind']!='dir'):raise Blocked('missing planned ancestor')
            if len(json.dumps({'before':before,'after':descriptions},sort_keys=True).encode())>LIMIT//2:raise Blocked('bounded plan and manifest required')
    def apply(self,deadline):
        remaining(deadline)
        with MappedFiles(self.context,self.journal) as f:f.apply(self.changes)
        remaining(deadline)
    def rollback(self,deadline):
        remaining(deadline)
        with MappedFiles(self.context,self.journal) as f:f.rollback()
        remaining(deadline)

class HostMaintenance:
    """Explicit authenticated-console maintenance lease, not a global lock claim.

    Operator must disable independent schedulers/accounts/publishers and prevent
    new writers throughout the lease. /proc checks detect active tools but do
    not prove absence of future writers. Orphan tools without anchors still
    require manual operator evidence; never delete them automatically.
    """
    def __init__(self,evidence):self.evidence=Path(evidence)
    def __call__(self):
        require_host_console();secure_directory(self.evidence.parent,private=True)
        fd=os.open(self.evidence,os.O_RDONLY|os.O_NOFOLLOW)
        try:
            s=os.fstat(fd)
            if not stat.S_ISREG(s.st_mode) or s.st_uid!=0 or s.st_gid!=0 or s.st_nlink!=1 or stat.S_IMODE(s.st_mode)!=0o600 or s.st_size>4096:raise Blocked('root-private maintenance lease')
            value=json.loads(os.read(fd,4097))
        finally:os.close(fd)
        if set(value)!={'schema','boot','created','expires','exclusive_native_writers','exclusive_deploy_writers'} or value['schema']!=1 or value['exclusive_native_writers'] is not True or value['exclusive_deploy_writers'] is not True:raise Blocked('maintenance lease schema')
        if value['boot']!=Path('/proc/sys/kernel/random/boot_id').read_text().strip() or not (value['created']<=time.time()<value['expires'] and 0<value['expires']-value['created']<=300):raise Blocked('maintenance lease stale')
        writers={'useradd','usermod','userdel','groupadd','groupmod','groupdel','passwd','chpasswd','gpasswd','vipw','vigr','newusers','pwconv','pwunconv','grpconv','grpunconv'}
        for entry in Path('/proc').iterdir():
            if not entry.name.isdigit() or int(entry.name)==os.getpid():continue
            try:name=(entry/'comm').read_text().strip()
            except FileNotFoundError:continue
            except OSError as exc:raise Blocked('cannot inventory native writers') from exc
            if name in writers:raise Blocked('active independent native writer')

def host_combined_transaction(journal,identity,changes,mounts,maintenance):
    """Production factory. Caller must supply reviewed whole-maintenance guard.

    There is intentionally no apply CLI until PAM/admission/full-plan gates are
    integrated. Invoking this factory from a container is always refused.
    """
    require_host_console()
    if type(maintenance) is not HostMaintenance:raise Blocked('production maintenance lease required')
    maintenance()
    journal=secure_directory(journal,private=True)
    context=TrustedRootBackend(journal/'accounts',Path('/etc'),{
        'home':Path('/home/tgdeploy'),'code':Path('/usr/local/lib/tg-deploy'),
        'keys':Path('/etc/tg-deploy'),'releases':Path('/var/lib/tg-deploy'),
        'ssh':Path('/etc/ssh/sshd_config.d/tg-deploy-owned')},maintenance)
    def runner(command,deadline):
        context.check()
        if command[0] not in ('groupadd','useradd','groupdel','userdel'):raise Blocked('native tool allowlist')
        binary=Path('/usr/sbin')/command[0];s=binary.lstat()
        if not stat.S_ISREG(s.st_mode) or s.st_uid!=0 or s.st_mode&0o022:raise Blocked('trusted native binary required')
        return subprocess.run([str(binary),*command[1:]],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env={'PATH':'/usr/sbin:/usr/bin:/sbin:/bin','LANG':'C'},timeout=remaining(deadline)).returncode
    runner.deadline_bound=True
    from combined_transaction import CombinedTransaction
    return CombinedTransaction(journal/'combined',identity,AccountStage(context,runner),FileStage(context,journal/'files',changes),mounts)
