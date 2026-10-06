"""Coherent producer/consumer with exact absence and independent private backups.

Pure dependency injection is intentionally not exposed by the host console CLI.
This is byte approval plumbing, never a claim of independent reviewer approval.
"""
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat
import time

LIMIT=8*1024*1024
CATEGORIES={'repository','accounts','container','artifacts','sshd','pam','locks','maintenance','boot'}
class Invalid(RuntimeError):pass

def encoded(value):
 try:return json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False).encode()
 except (ValueError,TypeError,RecursionError) as e:raise Invalid('JSON binding') from e

def digest(raw):return hashlib.sha256(raw).hexdigest()
def sync(path):
 fd=os.open(path,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
 try:os.fsync(fd)
 finally:os.close(fd)

def unique(pairs):
 d={}
 for k,v in pairs:
  if k in d:raise Invalid('duplicate JSON key')
  d[k]=v
 return d

def decode(raw):
 try:return json.loads(raw,object_pairs_hook=unique)
 except (ValueError,TypeError,RecursionError) as e:raise Invalid('JSON encoding') from e

def parent_fd(path,owner,boundary):
 path=Path(path);boundary=Path(boundary)
 if not path.is_absolute() or '..' in path.parts or not boundary.is_absolute():raise Invalid('canonical absolute path')
 try:parts=path.relative_to(boundary).parts
 except ValueError as e:raise Invalid('boundary') from e
 if not parts:raise Invalid('leaf required')
 fd=os.open(boundary,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
 try:
  for part in parts[:-1]:
   s=os.fstat(fd)
   if s.st_uid!=owner or s.st_mode&0o022:raise Invalid('untrusted ancestor')
   n=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd);os.close(fd);fd=n
  s=os.fstat(fd)
  if s.st_uid!=owner or s.st_mode&0o022:raise Invalid('untrusted parent')
  result=fd;fd=None;return result,parts[-1]
 finally:
  if fd is not None:os.close(fd)

def read(path,*,owner=0,boundary=Path('/'),missing=False):
 fd,name=parent_fd(path,owner,boundary)
 try:
  try:leaf=os.open(name,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=fd)
  except FileNotFoundError:
   if missing:return None,None
   raise
  try:
   s=os.fstat(leaf)
   if not stat.S_ISREG(s.st_mode) or s.st_uid!=owner or s.st_nlink!=1 or s.st_mode&0o022 or s.st_size>LIMIT or os.listxattr(leaf):raise Invalid('unsafe regular file')
   data=bytearray()
   while len(data)<=LIMIT:
    chunk=os.read(leaf,min(65536,LIMIT+1-len(data)))
    if not chunk:break
    data.extend(chunk)
   after=os.fstat(leaf)
   if any(getattr(s,k)!=getattr(after,k) for k in ('st_dev','st_ino','st_size','st_mtime_ns','st_ctime_ns','st_mode','st_uid','st_gid','st_nlink')) or len(data)>LIMIT:raise Invalid('concurrent file drift')
   return bytes(data),{'sha256':digest(data),'uid':s.st_uid,'gid':s.st_gid,'mode':stat.S_IMODE(s.st_mode),'device':s.st_dev,'inode':s.st_ino,'size':s.st_size,'mtime_ns':s.st_mtime_ns,'ctime_ns':s.st_ctime_ns}
  finally:os.close(leaf)
 finally:os.close(fd)

def private(path,owner,boundary):
 fd,_=parent_fd(path,owner,boundary)
 try:
  if stat.S_IMODE(os.fstat(fd).st_mode)!=0o700:raise Invalid('private parent required')
 finally:os.close(fd)

def write_new(path,raw):
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
 try:
  with os.fdopen(os.dup(fd),'wb') as f:f.write(raw);f.flush();os.fsync(f.fileno())
 finally:os.close(fd)
 sync(Path(path).parent)

def mapping(paths,owner,boundary,missing=False):
 if not isinstance(paths,dict) or not paths or len(paths)>512 or any(not isinstance(k,str) or not re.fullmatch('[A-Za-z0-9_-]{1,80}',k) for k in paths):raise Invalid('bounded named path map')
 result={}
 for k,p in sorted(paths.items()):result[k]={'path':str(p),'file':read(p,owner=owner,boundary=boundary,missing=missing)[1]}
 return result

def snapshot(collect):
 v=collect()
 if not isinstance(v,dict) or set(v)!=CATEGORIES:raise Invalid('complete host inventory')
 r=v['repository']
 if not isinstance(r,dict) or set(r)!={'commit','clean'} or r['clean'] is not True or not re.fullmatch('[0-9a-f]{40}',r['commit']):raise Invalid('exact clean repository')
 raw=encoded(v)
 if len(raw)>LIMIT:raise Invalid('snapshot size')
 # Return a detached copy: a producer cannot retroactively mutate our binding.
 return decode(raw)

def prepare(path,sources,targets,collect,*,owner=0,boundary=Path('/'),lifetime=300):
 path=Path(path);private(path,owner,boundary)
 if type(lifetime) is not int or not 0<lifetime<=300:raise Invalid('lifetime')
 state=snapshot(collect);src=mapping(sources,owner,boundary);dst=mapping(targets,owner,boundary,True)
 srcids={(v['file']['device'],v['file']['inode']) for v in src.values()}
 dstids={(v['file']['device'],v['file']['inode']) for v in dst.values() if v['file'] is not None}
 if srcids&dstids or len(srcids)!=len(src) or len(dstids)!=sum(v['file'] is not None for v in dst.values()):raise Invalid('aliased source/target')
 backups=path.with_name(path.name+'.backups');backups.mkdir(mode=0o700);sync(backups.parent)
 bound={}
 for name,item in dst.items():
  raw,desc=read(item['path'],owner=owner,boundary=boundary,missing=True)
  if desc!=item['file']:raise Invalid('backup capture drift')
  if desc is not None:
   write_new(backups/name,raw);bound[name]=read(backups/name,owner=owner,boundary=boundary)[1]
 now=time.time();v={'schema':2,'created':now,'expires':now+lifetime,'snapshot':state,'snapshot_sha256':digest(encoded(state)),'sources':src,'targets':dst,'backups':bound}
 if snapshot(collect)!=state or mapping(sources,owner,boundary)!=src or mapping(targets,owner,boundary,True)!=dst:raise Invalid('coherent capture drift')
 write_new(path,encoded(v));return v

def load(path,*,owner=0,boundary=Path('/')):
 private(path,owner,boundary);raw,meta=read(path,owner=owner,boundary=boundary)
 if meta['mode']!=0o600:raise Invalid('plan mode')
 v=decode(raw)
 if not isinstance(v,dict) or set(v)!={'schema','created','expires','snapshot','snapshot_sha256','sources','targets','backups'} or v['schema']!=2:raise Invalid('plan schema')
 if snapshot(lambda:v['snapshot'])!=v['snapshot'] or digest(encoded(v['snapshot']))!=v['snapshot_sha256']:raise Invalid('snapshot digest')
 if any(type(v[k]) not in (float,int) or not math.isfinite(v[k]) for k in ('created','expires')) or not 0<v['expires']-v['created']<=300:raise Invalid('plan time schema')
 return v

def check(path,sources,targets,collect,*,owner=0,boundary=Path('/'),now=None,recovery=False):
 path=Path(path);v=load(path,owner=owner,boundary=boundary)
 if mapping(sources,owner,boundary)!=v['sources']:raise Invalid('source/self hash drift')
 if {k:str(p) for k,p in targets.items()}!={k:x['path'] for k,x in v['targets'].items()}:raise Invalid('target map drift')
 wanted={k for k,x in v['targets'].items() if x['file'] is not None}
 if set(v['backups'])!=wanted:raise Invalid('backup set')
 identities=set()
 for name,desc in v['backups'].items():
  _,actual=read(path.with_name(path.name+'.backups')/name,owner=owner,boundary=boundary)
  if actual!=desc or actual['mode']!=0o600 or actual['sha256']!=v['targets'][name]['file']['sha256']:raise Invalid('backup binding drift')
  identity=actual['device'],actual['inode']
  if identity in identities or identity==(v['targets'][name]['file']['device'],v['targets'][name]['file']['inode']):raise Invalid('nonindependent backup')
  identities.add(identity)
 if not recovery:
  current=time.time() if now is None else now
  if not v['created']<=current<v['expires']:raise Invalid('expired plan')
  if snapshot(collect)!=v['snapshot'] or mapping(targets,owner,boundary,True)!=v['targets']:raise Invalid('whole snapshot/baseline drift')
 return v

def approval(path,*,owner=0,boundary=Path('/')):
 load(path,owner=owner,boundary=boundary)
 return digest(read(path,owner=owner,boundary=boundary)[0])

def check_activation(path,sources,targets,collect,*,owner=0,boundary=Path('/'),now=None):
 """Fresh approval invariants, with ONLY fixed installer-owned transformations.

 collect returns the unchanged host inventory; production uses HostInventory's
 explicit activation collector. Native account records and new directories are
 additionally verified from transaction ownership journals by VerifyStage.
 """
 path=Path(path);v=check(path,sources,targets,collect,owner=owner,boundary=boundary,recovery=True)
 current=time.time() if now is None else now
 if not v['created']<=current<v['expires']:raise Invalid('activation plan expired')
 if snapshot(collect)!=v['snapshot']:raise Invalid('activation invariant snapshot drift')
 for name,item in v['targets'].items():
  raw,actual=read(item['path'],owner=owner,boundary=boundary,missing=True)
  before=item['file']
  if name in {'database_passwd','database_shadow','database_group','database_gshadow'}:
   if before is None or actual is None or any(actual[k]!=before[k] for k in ('uid','gid','mode')):raise Invalid('activation database metadata')
   backup=read(path.with_name(path.name+'.backups')/name,owner=owner,boundary=boundary)[0]
   lines=raw.splitlines(keepends=True);owned=[line for line in lines if line.split(b':',1)[0]==b'tgdeploy']
   if len(owned)!=1 or b''.join(line for line in lines if line not in owned)!=backup:raise Invalid('activation nonowned account bytes drift')
  elif name=='gate':
   # Fence re-writes CLOSED during apply. Content, owner, permissions and inode
   # remain bound; only its installer-owned write timestamps may change.
   if before is None or actual is None or raw!=b'maintenance\n' or any(actual[k]!=before[k] for k in ('uid','gid','mode','device','inode','sha256','size')):raise Invalid('activation closed gate drift')
  elif name in {'authorized_keys','snippet'}:
   import host_policy
   expected=(('restrict,command="'+host_policy.COMMAND+'" '+v['snapshot']['sshd']['key']['line']+'\n').encode() if name=='authorized_keys' else host_policy.render().encode())
   if actual is None or raw!=expected or actual['uid']!=owner or actual['gid']!=(0 if owner==0 else os.getgid()) or actual['mode']!=0o644:raise Invalid('activation owned file drift')
   if name=='snippet' and before is not None:raise Invalid('activation snippet was not absent')
  elif {'path':item['path'],'file':actual}!=item:raise Invalid('activation unchanged target drift')
 return v
