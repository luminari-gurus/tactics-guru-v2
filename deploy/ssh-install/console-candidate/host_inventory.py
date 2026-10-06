"""Actual host producer: recursive policy, native records, Docker and artifacts.

All names/paths originate in a root-owned operator input, not fixture metadata.
Only the target container ID is inspected. No Docker-wide discovery occurs.
"""
import base64
import copy
import os
from pathlib import Path
import re
import subprocess
import time
import candidate_plan as p
import bootstrap_stage as bootstrap
import host_policy as policy

CANDIDATE=Path(__file__).absolute().parent
EXTERNAL=CANDIDATE.parent
PACKAGE_NAMES=('forced_publish.py','release.py','artifact_health.py')
DEPENDENCIES=('host_adapters.py','host_account_engine.py','host_backend.py','docker_mount_tx.py','offline_transaction.py','durable_files.py','session_barrier.py')
CANDIDATE_NAMES=('candidate_plan.py','bootstrap_stage.py','host_policy.py','host_inventory.py','console_lifecycle.py','host_console_backend.py','console_cli.py','ssh_acceptance.py')
OLD='/root/.hermes/tactics-guru-v2-beta/signed-deploy'
CONFIG='/root/.hermes/tactics-guru-v2-beta/signed-nginx.conf'
NEW='/var/lib/tg-deploy'
MAIN='/etc/ssh/sshd_config'
SNIPPET='/etc/ssh/sshd_config.d/policy.conf'
CONTROL='/etc/tg-deploy'

def validate_input(v):
 fields={'schema','repository','package','public_key','container_id','container_name','backup_name','contexts','maintenance'}
 if not isinstance(v,dict) or set(v)!=fields or v['schema']!=1:raise p.Invalid('exact root-owned operator input schema')
 for k in ('repository','package','public_key','maintenance'):
  if not isinstance(v[k],str) or not Path(v[k]).is_absolute() or '..' in Path(v[k]).parts:raise p.Invalid('canonical operator path')
 if not re.fullmatch('[0-9a-f]{64}',v['container_id']):raise p.Invalid('exact target Docker ID')
 for k in ('container_name','backup_name'):
  if not isinstance(v[k],str) or not re.fullmatch('[A-Za-z0-9][A-Za-z0-9_.-]{0,127}',v[k]):raise p.Invalid('container name token')
 if v['container_name']==v['backup_name']:raise p.Invalid('distinct container backup')
 policy.contexts(v['contexts']);return v

def read_input(path):return validate_input(p.decode(p.read(path)[0]))

def sources(config,input_path):
 result={n.replace('.','_'):CANDIDATE/n for n in CANDIDATE_NAMES}
 result.update({'external_'+n.replace('.','_'):EXTERNAL/n for n in DEPENDENCIES})
 result.update({'publisher_'+n.replace('.','_'):Path(config['package'])/n for n in PACKAGE_NAMES})
 result.update(operator_input=Path(input_path),public_key=Path(config['public_key']))
 return result

def public_key(path):
 raw,meta=p.read(path)
 # Only raw OpenSSH public data; options/private-key framing are forbidden.
 words=raw.decode().strip().split()
 if len(words)<2 or words[0]!='ssh-ed25519' or len(raw)>4096 or b'\n' in raw.rstrip(b'\n'):raise p.Invalid('one raw Ed25519 public key required')
 try:
  blob=base64.b64decode(words[1],validate=True)
 except ValueError as e:raise p.Invalid('public key base64') from e
 tag=b'ssh-ed25519'
 if blob!=len(tag).to_bytes(4,'big')+tag+(32).to_bytes(4,'big')+blob[-32:] or len(blob)!=51:raise p.Invalid('public key wire structure')
 r=policy.run(['/usr/bin/ssh-keygen','-l','-E','sha256','-f',str(path)],time.monotonic()+5)
 return {'file':meta,'fingerprint':r.decode().split()[1],'line':words[0]+' '+words[1]}

def maintenance(path):
 raw,meta=p.read(path)
 if meta['mode']!=0o600:raise p.Invalid('private native/deploy maintenance lease')
 v=p.decode(raw)
 wanted={'schema','boot','created','expires','exclusive_native_writers','exclusive_deploy_writers','legacy_admission_excluded'}
 if set(v)!=wanted or v['schema']!=1 or any(v[k] is not True for k in ('exclusive_native_writers','exclusive_deploy_writers','legacy_admission_excluded')):raise p.Invalid('explicit native/deploy/legacy admission exclusion prerequisite')
 if v['boot']!=Path('/proc/sys/kernel/random/boot_id').read_text().strip() or type(v['created']) not in (float,int) or type(v['expires']) not in (float,int) or not v['created']<=time.time()<v['expires'] or not 0<v['expires']-v['created']<=300:raise p.Invalid('maintenance lease expired')
 return {'file':meta,'lease':v}

def native_accounts():
 descriptions={};users=[]
 for n in ('passwd','shadow','group','gshadow'):
  raw,meta=p.read('/etc/'+n);descriptions[n]=meta
  for line in raw.decode().splitlines():
   fields=line.split(':')
   if fields[0]=='tgdeploy':raise p.Invalid('dedicated account/group must be absent')
   if n in ('passwd','group') and len(fields)>=4 and fields[2]=='11002':raise p.Invalid('dedicated UID/GID alias')
   if n=='passwd':
    if len(fields)!=7 or not fields[2].isdecimal() or not fields[3].isdecimal():raise p.Invalid('native passwd structure')
    if fields[3]=='11002':raise p.Invalid('dedicated supplementary/primary GID collision')
    users.append(fields[0])
 for kind in ('passwd','group'):
  for token in ('tgdeploy','11002'):
   r=subprocess.run(['/usr/bin/getent',kind,token],stdin=subprocess.DEVNULL,capture_output=True,env={'PATH':'/usr/bin:/bin','LANG':'C'},timeout=3)
   if r.returncode!=2 or r.stdout:raise p.Invalid('NSS dedicated identity is not known absent')
 return {'databases':descriptions,'known_absent':True,'uid':11002,'gid':11002,'users':sorted(users)}

def directories():
 result={}
 for n in ('/home/tgdeploy','/usr/local/lib/tg-deploy',NEW):
  fd,leaf=p.parent_fd(n,0,Path('/'))
  try:
   try:os.stat(leaf,dir_fd=fd,follow_symlinks=False)
   except FileNotFoundError:result[n]=None
   else:raise p.Invalid('new target area must be known absent: '+n)
  finally:os.close(fd)
 return result

class HostInventory:
 def __init__(self,config,api,input_path):self.config=validate_input(config);self.api=api;self.input_path=Path(input_path)
 def __call__(self):
  # Production entry point invokes the console guard before constructing us.
  config=self.config;deadline=time.monotonic()+30
  lease=maintenance(config['maintenance']);accounts=native_accounts();ssh=policy.includes(MAIN);pam=policy.pam_inventory()
  for n in ('/etc/nsswitch.conf','/etc/login.defs','/etc/shells'):
   accounts[n]=p.read(n)[1]
  areas=directories()
  for n in ('admission.gate','publication.lock','authorized_keys'):
   raw,meta=p.read(Path(CONTROL)/n)
   if meta['mode']!=0o644 or meta['gid']!=0:raise p.Invalid('root-only publication controls prerequisite')
   if n=='admission.gate' and raw!=b'maintenance\n':raise p.Invalid('initial admission must already be CLOSED')
   if n=='authorized_keys' and raw:raise p.Invalid('initial new authorized keys must be empty')
  if Path(SNIPPET).exists() or Path(SNIPPET).is_symlink():raise p.Invalid('owned snippet must be absent')
  commit=policy.run(['/usr/bin/git','-C',config['repository'],'rev-parse','HEAD'],deadline).decode().strip()
  clean=not policy.run(['/usr/bin/git','-C',config['repository'],'status','--porcelain','--untracked-files=all'],deadline)
  if not re.fullmatch('[0-9a-f]{40}',commit) or not clean:raise p.Invalid('clean reviewed repository prerequisite')
  baseline=self.api.inspect(config['container_id'],deadline)
  if baseline is None or baseline['Name']!='/'+config['container_name'] or not baseline['State']['Running']:raise p.Invalid('exact running target baseline')
  if self.api.inspect(config['backup_name'],deadline) is not None:raise p.Invalid('container backup name collision')
  from host_backend import migrated_signature,signature
  migrated_signature(baseline,OLD,CONFIG,NEW)
  info=self.api.request('GET','/info',deadline=deadline)
  config_raw,config_meta=p.read(CONFIG)
  if not re.search(rb'listen\s+127\.0\.0\.1:9122\s*;',config_raw):raise p.Invalid('fixed loopback nginx origin')
  origin=bootstrap.original(OLD)
  effective={}
  policy.run(['/usr/sbin/sshd','-t','-f',MAIN],deadline)
  for i,c in enumerate(config['contexts']):
   for user in accounts['users']:effective[str(i)+':'+user]=policy.effective(MAIN,user,c,deadline)
  ssh.update(contexts=config['contexts'],effective_others=effective,users=accounts['users'],target_absence=areas,key=public_key(config['public_key']))
  locks={}
  for name,path in (('legacy',Path(OLD)/'.lock'),('publication',Path(CONTROL)/'publication.lock')):
   raw,meta=p.read(path);locks[name]={'path':str(path),'file':meta}
  # Unordered effective mount set is canonicalized; retain complete exact Config/
  # HostConfig and image/ID, not transient State timestamps or response ordering.
  container={'daemon_id':info['ID'],'baseline':baseline,'signature':signature(baseline),'config':config_meta,'backup_name':config['backup_name']}
  normalized_baseline=dict(baseline);normalized_baseline['Mounts']=sorted(baseline['Mounts'],key=lambda x:p.encoded(x));container['baseline']=normalized_baseline
  return {'repository':{'commit':commit,'clean':True},'accounts':accounts,'sshd':ssh,'pam':pam,'container':container,'artifacts':origin,'locks':locks,'maintenance':lease,'boot':Path('/proc/sys/kernel/random/boot_id').read_text().strip()}
 def targets(self):
  ssh=policy.includes(MAIN);pam=policy.pam_inventory()
  result={'database_'+n:Path('/etc')/n for n in ('passwd','shadow','group','gshadow')}
  result.update({'sshd_'+str(i):Path(n) for i,n in enumerate(sorted(ssh['files']))})
  result.update({'pam_'+str(i):Path(n) for i,n in enumerate(sorted(pam))})
  result.update(nginx_config=Path(CONFIG),authorized_keys=Path(CONTROL)/'authorized_keys',gate=Path(CONTROL)/'admission.gate',publication_lock=Path(CONTROL)/'publication.lock',snippet=Path(SNIPPET),nsswitch=Path('/etc/nsswitch.conf'))
  return result

 def activation(self,saved):
  """Re-read every nonowned approval input; validate owned SSH expansion exactly.

  Accounts/installed directories/new mount ownership are checked by the native
  transaction verifier, NOT inferred from their names. Database unrelated bytes
  are independently checked against the plan's private backups at activation.
  """
  value=copy.deepcopy(saved['snapshot']);deadline=time.monotonic()+30
  value['maintenance']=maintenance(self.config['maintenance'])
  value['boot']=Path('/proc/sys/kernel/random/boot_id').read_text().strip()
  commit=policy.run(['/usr/bin/git','-C',self.config['repository'],'rev-parse','HEAD'],deadline).decode().strip()
  clean=not policy.run(['/usr/bin/git','-C',self.config['repository'],'status','--porcelain','--untracked-files=all'],deadline)
  value['repository']={'commit':commit,'clean':clean}
  value['pam']=policy.pam_inventory()
  for n in ('/etc/nsswitch.conf','/etc/login.defs','/etc/shells'):value['accounts'][n]=p.read(n)[1]
  value['artifacts']=bootstrap.original(OLD)
  value['sshd']['key']=public_key(self.config['public_key'])
  current=policy.includes(MAIN);baseline=saved['snapshot']['sshd']
  # The sole admitted extra Include is the exact installer-owned snippet. No
  # generic ignore set: all original file identities and glob expansions bind.
  snippet=current['files'].pop(SNIPPET,None)
  if snippet is None or snippet['raw_sha256']!=p.digest(policy.render().encode()):raise p.Invalid('activation owned SSH include')
  expected_patterns={pattern:sorted(set(matches)|({SNIPPET} if __import__('fnmatch').fnmatch(SNIPPET,pattern) else set())) for pattern,matches in baseline['patterns'].items()}
  if current['files']!=baseline['files'] or current['patterns']!=expected_patterns:raise p.Invalid('activation SSH inventory drift')
  for i,c in enumerate(self.config['contexts']):
   for user in baseline['users']:value['sshd']['effective_others'][str(i)+':'+user]=policy.effective(MAIN,user,c,deadline)
  value['locks']={name:{'path':item['path'],'file':p.read(item['path'])[1]} for name,item in value['locks'].items()}
  value['container']['config']=p.read(CONFIG)[1]
  value['container']['daemon_id']=self.api.request('GET','/info',deadline=deadline)['ID']
  from host_backend import signature
  old=self.api.inspect(self.config['container_id'],deadline)
  if old is None or old['Id']!=saved['snapshot']['container']['baseline']['Id'] or old['Name']!='/'+self.config['backup_name'] or old['State']['Running'] or signature(old)!=saved['snapshot']['container']['signature']:raise p.Invalid('activation original container identity/config drift')
  return value
