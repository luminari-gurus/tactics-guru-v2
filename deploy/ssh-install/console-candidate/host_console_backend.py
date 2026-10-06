"""Concrete fixed host adapters for the console lifecycle.

The pure engine supports separately injected owned fixtures; this factory always
requires the authentic host console. No generic commands or guard bypass exist.
"""
from contextlib import contextmanager
import fcntl
import importlib.util
import os
from pathlib import Path
import select
import signal
import stat
import subprocess
import time
import candidate_plan as p
import host_inventory as inventory
import host_policy as policy
from bootstrap_stage import Bootstrap,tree,original
from console_lifecycle import Lifecycle

# Root-console package deployment must preserve this authenticated dependency
# layout until public packaging is independently reviewed.
import sys
sys.path.insert(0,str(Path(__file__).absolute().parent.parent))
from host_adapters import TrustedRootBackend,AccountStage,MappedFiles
from host_account_engine import AccountEngine
from host_backend import MountTransaction,require_host_console,secure_directory,signature
import session_barrier as session

class HostFiles(MappedFiles):
 ALLOWED={'home':{''},'code':{'','ssh-bootstrap','forced_publish.py','release.py','artifact_health.py'},'keys':{'','authorized_keys','admission.gate','publication.lock'},'ssh':{'','policy.conf'}}
 def path(self,name):
  self.check()
  if not isinstance(name,str) or any(x in ('','.','..') for x in name.split('/')):raise p.Invalid('fixed target name')
  area,*parts=name.split('/');suffix='/'.join(parts)
  if area not in self.ALLOWED or suffix not in self.ALLOWED[area]:raise p.Invalid('fixed installed-code/control allowlist')
  path=self.context.targets[area].joinpath(*parts)
  for parent in path.parents:
   if parent.exists() or parent.is_symlink():secure_directory(parent)
  existing=path.parent
  while not existing.exists():existing=existing.parent
  if existing.stat().st_dev!=self.root.stat().st_dev:raise p.Invalid('same filesystem file journaling prerequisite')
  return path
 def inventory(self):
  result={}
  for area,names in self.ALLOWED.items():
   for suffix in sorted(names):
    name=area+('/'+suffix if suffix else '')
    # Known-absent roots imply known-absent child files.
    if suffix and not self.context.targets[area].exists():continue
    d=self.describe(name)
    if d is not None:result[name]=d
  return result

class InstalledFiles:
 def __init__(self,context,journal,changes):self.context=context;self.journal=Path(journal);self.changes=changes
 def preflight(self,d):
  with HostFiles(self.context,self.journal) as files:
   before=files.inventory()
   if (files.root/'state').exists():raise p.Invalid('existing installed-files state')
   for name,spec in self.changes.items():
    files.path(name);after=files._candidate(spec)
    if before.get(name) is not None and (before[name]['kind']!='file' or after['kind']!='file'):raise p.Invalid('only new directories or exact file replacements')
    parent=str(Path(name).parent)
    if parent!='.' and parent not in before and parent not in self.changes:raise p.Invalid('missing planned ancestor')
  if time.monotonic()>=d:raise p.Invalid('files preflight deadline')
 def apply(self,d):
  with HostFiles(self.context,self.journal) as files:files.apply(self.changes)
  if time.monotonic()>=d:raise p.Invalid('files deadline')
 def rollback(self,d):
  with HostFiles(self.context,self.journal) as files:files.rollback()
  if time.monotonic()>=d:raise p.Invalid('files recovery deadline')
 def verify(self,name):
  with HostFiles(self.context,self.journal) as files:return files.verify_owned(name)
 def key_identity(self):
  with HostFiles(self.context,self.journal) as files:
   current=files.describe('keys/authorized_keys')
   if current is None:raise p.Invalid('missing authorized key')
   journal=files.root/'state/journal.json'
   if journal.exists():
    state=__import__('json').loads(files.read(journal,True))
    choices=[files.original().get('keys/authorized_keys')]
    for entry in state['entries']:
     if entry['name']=='keys/authorized_keys':choices.extend((entry['after'],entry.get('restored')))
    if not any(e is not None and (e.get('device'),e.get('inode'))==(current['device'],current['inode']) for e in choices):raise p.Invalid('foreign authorized-key inode; preserve')
   return current['device'],current['inode']
 def remove_policy(self):
  with HostFiles(self.context,self.journal) as files:files.remove_owned('ssh/policy.conf')

class Fence:
 def __init__(self,maintenance,daemon,legacy,*,key=Path(inventory.CONTROL)/'authorized_keys',gate=Path(inventory.CONTROL)/'admission.gate',publication=Path(inventory.CONTROL)/'publication.lock',approved_key=None):
  self.maintenance=maintenance;self.daemon=daemon;self.legacy=Path(legacy);self.key=Path(key);self.gate=Path(gate);self.publication=Path(publication);self.approved_key=approved_key
 def controls(self):
  raw,meta=p.read(self.gate)
  if raw!=b'maintenance\n' or meta['mode']!=0o644:raise p.Invalid('publication gate must remain CLOSED')
  self.maintenance()
 def disable(self,d):
  self.maintenance();errors=[]
  try:
   fd=session.secure_open(str(self.gate),os.O_RDWR)
   try:
    raw=os.read(fd,32)
    if raw not in (b'maintenance\n',b'enabled\n'):raise p.Invalid('foreign admission gate bytes')
    os.lseek(fd,0,os.SEEK_SET);os.write(fd,b'maintenance\n');os.ftruncate(fd,12);os.fsync(fd)
   finally:os.close(fd)
   p.sync(self.gate.parent);self.controls()
  except Exception as exc:errors.append(exc)
  # Gate durability failure must not prevent an independent owned-key revoke.
  try:
   if time.monotonic()>=d:raise p.Invalid('closure deadline')
   check=getattr(self,'key_check',None)
   if check is not None:self.activation_key_identity=check()
   fd=session.secure_open(str(self.key),os.O_RDWR)
   try:
    s=os.fstat(fd);identity=getattr(self,'activation_key_identity',None)
    if identity is not None and (s.st_dev,s.st_ino)!=identity:raise p.Invalid('foreign authorized-key inode; preserve')
    raw=os.read(fd,65537)
    if raw not in (b'',self.approved_key):raise p.Invalid('foreign authorized keys; gate closed, preserve key')
    os.ftruncate(fd,0);os.fsync(fd)
   finally:os.close(fd)
   p.sync(self.key.parent)
   if p.read(self.key)[0]!=b'':raise p.Invalid('key revoke readback')
  except Exception as exc:errors.append(exc)
  if errors:raise errors[0]
 def actors(self):
  result=[]
  for path in Path('/proc').iterdir():
   if not path.name.isdecimal():continue
   try:
    status=(path/'status').read_text();values={line.split(':',1)[0]:line.split(':',1)[1].split() for line in status.splitlines() if ':' in line}
    if 11002 not in tuple(map(int,values['Uid'])):continue
    actor=session.stamp(int(path.name))
    if actor.state not in ('Z','X'):result.append(actor)
   except (FileNotFoundError,ProcessLookupError):continue
  return result
 def authority(self,actor):
  if actor.uid!=(11002,)*4 or actor.gid!=(11002,)*4 or actor.namespaces!=self.daemon.namespaces:raise p.Invalid('unknown same-UID actor; no signals')
  node=actor
  for depth in range(64):
   if node==self.daemon:return depth
   if node.ppid<=1:raise p.Invalid('unknown same-UID ancestry; no signals')
   node=session.stamp(node.ppid)
  raise p.Invalid('SSH ancestry depth')
 def quiesce(self,d):
  if session.stamp(self.daemon.pid)!=self.daemon or self.daemon.uid!=(0,)*4 or os.readlink('/proc/'+str(self.daemon.pid)+'/exe')!='/usr/sbin/sshd':raise p.Invalid('SSH daemon identity drift')
  quiet=None
  while time.monotonic()<d:
   self.controls();actors=self.actors()
   if not actors:
    quiet=quiet or time.monotonic()
    if time.monotonic()-quiet>=.2:return
    time.sleep(.02);continue
   quiet=None;depth={actor.pid:self.authority(actor) for actor in actors}
   for actor in sorted(actors,key=lambda a:depth[a.pid],reverse=True):
    try:fd=os.pidfd_open(actor.pid)
    except ProcessLookupError:continue
    try:
     if session.stamp(actor.pid)!=actor:raise p.Invalid('SSH actor identity drift')
     self.authority(actor);signal.pidfd_send_signal(fd,signal.SIGTERM)
     poll=select.poll();poll.register(fd,select.POLLIN)
     if not poll.poll(int(max(0,min(.3,d-time.monotonic()))*1000)):
      signal.pidfd_send_signal(fd,signal.SIGKILL)
      if not poll.poll(int(max(0,d-time.monotonic())*1000)):raise p.Invalid('SSH actor did not exit')
    except (FileNotFoundError,ProcessLookupError):pass
    finally:os.close(fd)
  raise p.Invalid('SSH quiesce deadline')
 @contextmanager
 def held(self,d,activation=False):
  self.controls();self.quiesce(d);descriptors=[]
  try:
   for path in (self.publication,self.legacy):
    fd=session.secure_open(str(path),os.O_RDWR);descriptors.append((str(path),fd))
    while True:
     if time.monotonic()>=d:raise p.Invalid('publication/legacy lock deadline')
     try:fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB);break
     except BlockingIOError:time.sleep(.01)
   held=session.Held(descriptors);held.verify();self.controls()
   if self.actors():raise p.Invalid('dedicated actors after publication lock acquisition')
   yield
   held.verify()
   if activation:
    raw,meta=p.read(self.gate)
    if raw not in (b'maintenance\n',b'enabled\n') or meta['mode']!=0o644:raise p.Invalid('activation gate readback')
    self.maintenance()
   else:self.controls()
  except Exception:
   # Both locks remain held through compensation, including exit validation.
   if activation:
    callback=getattr(self,'activation_failure',None)
    if callback is not None:callback()
    else:
     try:self.disable(time.monotonic()+5)
     except Exception:pass
   raise
  finally:
   for _,fd in reversed(descriptors):os.close(fd)

 def activation_held(self,d):return self.held(d,activation=True)
 def enable(self,d):
  self.controls()
  raw,meta=p.read(self.key)
  if raw!=self.approved_key or meta['mode']!=0o644:raise p.Invalid('approved immutable authorized key required for activation')
  self.activation_key_identity=(meta['device'],meta['inode'])
  if time.monotonic()>=d:raise p.Invalid('activation deadline')
  fd=session.secure_open(str(self.gate),os.O_RDWR)
  try:
   if os.read(fd,32)!=b'maintenance\n':raise p.Invalid('activation gate drift')
   os.lseek(fd,0,os.SEEK_SET);os.write(fd,b'enabled\n');os.ftruncate(fd,8);os.fsync(fd)
  finally:os.close(fd)
  p.sync(self.gate.parent)
  if p.read(self.gate)[0]!=b'enabled\n':raise p.Invalid('activation gate durability readback')

class VerifyStage:
 def __init__(self,context,bootstrap,files,ssh,mounts,probe,hashes):self.context=context;self.bootstrap=bootstrap;self.files=files;self.ssh=ssh;self.mounts=mounts;self.probe=probe;self.hashes=hashes
 def preflight(self,d):self.probe(self.hashes,d)
 def apply(self,d):
  self.context.check()
  engine=AccountEngine(self.context)
  with engine.locked(databases=True):
   state=engine.state()
   if state is None or state['stage']!='user':raise p.Invalid('account verification state')
   if not all(item[1] for item in engine.records(state).values()):raise p.Invalid('native dedicated account records missing')
  v=self.bootstrap.state()
  if v['state']!='installed' or tree(self.bootstrap.destination,0,11002,11002)!=v['tree']:raise p.Invalid('bootstrap artifact identity readback')
  with HostFiles(self.context,self.files.journal) as files:
   for name,spec in self.files.changes.items():
    files.verify_owned(name)
  self.ssh.check_effective(self.ssh.main,d)
  with self.mounts.locked():
   old,new=self.mounts.reconcile(d)
   if new is None or not new['State']['Running'] or old['State']['Running']:raise p.Invalid('migration running-state readback')
   self.mounts.health(new,self.hashes['index.html'],'new',d)
  self.probe(self.hashes,d)
 def rollback(self,d):pass

def factory(journal,plan_path,config,input_path,api,saved):
 require_host_console();journal=secure_directory(journal,private=True)
 maintenance=lambda:inventory.maintenance(config['maintenance'])
 maintenance()
 for name in ('accounts','files','bootstrap','ssh','mounts','lifecycle'):
  path=journal/name
  if not path.exists():path.mkdir(mode=0o700);p.sync(journal)
  secure_directory(path,private=True)
 identity=p.approval(plan_path);snapshot=saved['snapshot']
 ctx=TrustedRootBackend(journal/'accounts',Path('/etc'),{'home':Path('/home/tgdeploy'),'code':Path('/usr/local/lib/tg-deploy'),'keys':Path(inventory.CONTROL),'releases':Path(inventory.NEW),'ssh':Path(inventory.SNIPPET).parent},maintenance)
 def native(command,deadline):
  ctx.check()
  if command[0] not in ('groupadd','groupdel','useradd','userdel'):raise p.Invalid('native account binary allowlist')
  binary=Path('/usr/sbin')/command[0];p.read(binary)
  r=subprocess.run([str(binary),*command[1:]],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env={'PATH':'/usr/sbin:/usr/bin:/sbin:/bin','LANG':'C'},timeout=max(.001,deadline-time.monotonic()))
  return r.returncode
 native.deadline_bound=True
 accounts=AccountStage(ctx,native)
 key=('restrict,command="'+policy.COMMAND+'" '+snapshot['sshd']['key']['line']+'\n').encode()
 changes={'home':{'kind':'dir','uid':0,'gid':0,'mode':0o755},'code':{'kind':'dir','uid':0,'gid':0,'mode':0o755},'code/ssh-bootstrap':{'kind':'file','uid':0,'gid':0,'mode':0o755,'data':policy.WRAPPER.encode()},'keys/authorized_keys':{'kind':'file','uid':0,'gid':0,'mode':0o644,'data':key},'ssh/policy.conf':{'kind':'file','uid':0,'gid':0,'mode':0o644,'data':policy.render().encode()}}
 for n in inventory.PACKAGE_NAMES:changes['code/'+n]={'kind':'file','uid':0,'gid':0,'mode':0o644,'data':p.read(Path(config['package'])/n)[0]}
 files=InstalledFiles(ctx,journal/'files',changes)
 boot=Bootstrap(journal/'bootstrap',inventory.OLD,inventory.NEW,identity)
 ssh=policy.PolicyStage(journal/'ssh',inventory.MAIN,inventory.SNIPPET,config['contexts'],snapshot['sshd']['users'],snapshot['sshd']['effective_others'],policy.reload_host);ssh.files=files
 module_path=Path(config['package'])/'artifact_health.py';spec=importlib.util.spec_from_file_location('trusted_artifact_health',module_path);health=importlib.util.module_from_spec(spec);spec.loader.exec_module(health)
 hashes=snapshot['artifacts']['manifest']['hashes']
 def fullhealth(cid,d):health.probe(hashes,d);return hashes['index.html']
 baseline=snapshot['container']['baseline']
 mountcontext={'baseline':baseline,'old_source':inventory.OLD,'config_source':inventory.CONFIG,'new_source':inventory.NEW,'network':'host','old_hash':hashes['index.html'],'new_hash':hashes['index.html'],'name':config['container_name'],'backup':config['backup_name']}
 mounts=MountTransaction(journal/'mounts',api,mountcontext,fullhealth)
 daemon_pid=int(policy.run(['/usr/bin/systemctl','show','ssh','--property=MainPID','--value'],time.monotonic()+5))
 daemon=session.stamp(daemon_pid)
 fence=Fence(maintenance,daemon,Path(inventory.OLD)/'.lock',approved_key=key);fence.key_check=files.key_identity
 verify=VerifyStage(ctx,boot,files,ssh,mounts,health.probe,hashes)
 stages=dict(accounts=accounts,files=files,bootstrap=boot,ssh=ssh,mounts=mounts,verify=verify)
 return Lifecycle(journal/'lifecycle',identity,stages,fence),stages
