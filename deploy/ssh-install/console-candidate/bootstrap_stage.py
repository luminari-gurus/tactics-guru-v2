"""Plan-bound immutable original bootstrap, atomic link and conservative recovery.

Never invent release/workflow metadata. Only a known-absent destination is supported.
Source is preserved. Partial staging without a durable completed-tree binding is
manual recovery, not blindly removed on the basis of a filename.
"""
import os
from pathlib import Path
import re
import stat
import time
import uuid
import candidate_plan as p
Invalid=p.Invalid

def historical_metadata(metadata,order,marker):
 # Recorded signed-publisher format, identical to the current publisher schema.
 # Timestamp is historical provenance, NOT a fresh-upload admission deadline.
 required={'repository','ref','sha','event','timestamp','run_number','run_attempt','deployment_id'}
 if not isinstance(metadata,dict) or set(metadata)!=required:raise Invalid('historical metadata schema')
 if metadata['repository']!='luminari-gurus/tactics-guru-v2' or metadata['ref']!='refs/heads/main' or metadata['event'] not in ('push','workflow_dispatch'):raise Invalid('historical publication context')
 if not isinstance(metadata['sha'],str) or not re.fullmatch('[0-9a-f]{40}',metadata['sha']):raise Invalid('historical SHA')
 if not isinstance(metadata['deployment_id'],str) or not re.fullmatch('[0-9]{1,20}',metadata['deployment_id']):raise Invalid('historical deployment ID')
 if any(type(metadata[k]) is not int or not 0<metadata[k]<10**15 for k in ('timestamp','run_number','run_attempt')):raise Invalid('historical counters/timestamp')
 if order!=[metadata['run_number'],metadata['run_attempt']]:raise Invalid('historical order coherence')
 if marker!={k:metadata[k] for k in ('sha','repository','deployment_id')}:raise Invalid('historical marker coherence')

def tree(root,owner=0,storage_uid=None,storage_gid=None):
 root=Path(root);result={};total=0
 def visit(path,name):
  nonlocal total
  s=path.lstat()
  owners={(owner,os.getgid() if owner!=0 else 0)}
  if name in ('','releases') and storage_uid is not None:owners.add((storage_uid,storage_gid))
  if (s.st_uid,s.st_gid) not in owners or (not stat.S_ISLNK(s.st_mode) and s.st_mode&0o022) or os.listxattr(path,follow_symlinks=False):raise Invalid('bootstrap tree owner/mode/xattr')
  d={'uid':s.st_uid,'gid':s.st_gid,'mode':stat.S_IMODE(s.st_mode),'device':s.st_dev,'inode':s.st_ino}
  if stat.S_ISDIR(s.st_mode):
   d['kind']='dir';result[name]=d
   for c in sorted(path.iterdir()):visit(c,c.name if not name else name+'/'+c.name)
  elif stat.S_ISREG(s.st_mode):
   if s.st_nlink!=1 or s.st_size>16*1024*1024:raise Invalid('bootstrap bounded regular file')
   fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
   try:
    with os.fdopen(os.dup(fd),'rb') as f:raw=f.read(16*1024*1024+1)
    after=os.fstat(fd)
    if any(getattr(s,k)!=getattr(after,k) for k in ('st_dev','st_ino','st_size','st_mtime_ns','st_ctime_ns','st_mode','st_uid','st_gid','st_nlink')):raise Invalid('bootstrap concurrent drift')
   finally:os.close(fd)
   total+=len(raw)
   if total>64*1024*1024:raise Invalid('bootstrap tree limit')
   d.update(kind='file',sha256=p.digest(raw),size=len(raw));result[name]=d
  elif stat.S_ISLNK(s.st_mode) and name=='current':
   target=os.readlink(path)
   if not re.fullmatch(r'releases/[A-Za-z0-9_-]{1,200}',target):raise Invalid('exact current link target')
   d.update(kind='link',target=target);result[name]=d
  else:raise Invalid('bootstrap special file/link')
  if len(result)>520:raise Invalid('bootstrap member limit')
 visit(root,'');return result

def original(root,owner=0,boundary=Path('/')):
 root=Path(root)
 # Only exact live current release is copied; historical releases remain intact.
 fd,name=p.parent_fd(root,owner,boundary)
 os.close(fd)
 s=root.lstat()
 if not stat.S_ISDIR(s.st_mode) or s.st_uid!=owner or s.st_mode&0o022:raise Invalid('original root')
 link=root/'current'
 if not link.is_symlink():raise Invalid('original current symlink required')
 target=os.readlink(link)
 if not re.fullmatch(r'releases/[A-Za-z0-9_-]{1,200}',target):raise Invalid('original current target')
 releases=root/'releases';sr=releases.lstat()
 if not stat.S_ISDIR(sr.st_mode) or sr.st_uid!=owner or sr.st_mode&0o022:raise Invalid('original releases')
 desc=tree(root/target,owner)
 if desc['']['kind']!='dir':raise Invalid('original release directory')
 raw=(root/target/'manifest.json').read_bytes();manifest=p.decode(raw)
 if not isinstance(manifest,dict) or set(manifest)!={'metadata','order','body_sha256','hashes'}:raise Invalid('original release manifest schema')
 hashes=manifest['hashes']
 if not isinstance(hashes,dict) or not {'index.html','_deployment.json'}<=set(hashes) or not 4<=len(hashes)<=512:raise Invalid('four-artifact original manifest required')
 if type(manifest['order']) is not list or len(manifest['order'])!=2 or any(type(x) is not int or x<=0 for x in manifest['order']):raise Invalid('original exact order')
 if not re.fullmatch('[0-9a-f]{64}',manifest['body_sha256']):raise Invalid('original archive hash')
 if {n for n,d in desc.items() if d['kind']=='file'}!=set(hashes)|{'manifest.json'}:raise Invalid('manifest/tree equality')
 for n,h in hashes.items():
  if not re.fullmatch(r'[A-Za-z0-9_.\-/]{1,200}',n) or any(x in ('','.','..') for x in n.split('/')) or len(n.split('/'))>2 or ('/' in n and not n.startswith('assets/')) or desc[n]['sha256']!=h:raise Invalid('original artifact hash')
 historical_metadata(manifest['metadata'],manifest['order'],p.decode((root/target/'_deployment.json').read_bytes()))
 return {'target':target,'tree':desc,'manifest_sha256':p.digest(raw),'manifest':manifest,'root_identity':[s.st_dev,s.st_ino],'releases_identity':[sr.st_dev,sr.st_ino],'link_identity':[link.lstat().st_dev,link.lstat().st_ino]}

class Bootstrap:
 def __init__(self,journal,source,destination,identity,*,owner=0,boundary=Path('/'),storage_uid=11002,storage_gid=11002,fault=None):
  if not re.fullmatch('[0-9a-f]{64}',identity):raise Invalid('exact plan identity')
  self.journal=Path(journal);self.source=Path(source);self.destination=Path(destination);self.identity=identity
  self.owner=owner;self.boundary=Path(boundary);self.storage_uid=storage_uid;self.storage_gid=storage_gid
  self.fault=fault or (lambda phase:None);self.file=self.journal/'bootstrap.json'
  self.stage=self.destination.with_name('.tg-bootstrap-'+identity)
  for x in (self.journal/'leaf',self.source,self.destination):fd,_=p.parent_fd(x,owner,boundary);os.close(fd)
  p.private(self.file,owner,boundary)
  if self.source==self.destination or self.destination.is_relative_to(self.source) or self.source.is_relative_to(self.destination):raise Invalid('disjoint bootstrap paths')
  self.expected=None
 def preflight(self,deadline):
  if time.monotonic()>=deadline:raise Invalid('bootstrap deadline')
  if self.destination.exists() or self.destination.is_symlink() or self.stage.exists() or self.stage.is_symlink() or self.file.exists():raise Invalid('bootstrap known absence required')
  self.expected=original(self.source,self.owner,self.boundary)
 def save(self,v):
  pending=self.journal/('bootstrap.pending-'+uuid.uuid4().hex);p.write_new(pending,p.encoded(v));os.replace(pending,self.file);p.sync(self.journal)
 def state(self):
  raw,meta=p.read(self.file,owner=self.owner,boundary=self.boundary)
  if meta['mode']!=0o600:raise Invalid('bootstrap private journal')
  v=p.decode(raw)
  fields={'schema','identity','source','destination','original','state','tree'}
  if v.get('schema')==2:fields.add('deletion')
  if set(v)!=fields or v['schema'] not in (1,2) or v['identity']!=self.identity or v['source']!=str(self.source) or v['destination']!=str(self.destination) or v['state'] not in ('intent','built','installed','deleting','recovered'):raise Invalid('bootstrap journal binding')
  return v
 def apply(self,deadline):
  if self.expected is None:self.preflight(deadline)
  if original(self.source,self.owner,self.boundary)!=self.expected:raise Invalid('original bootstrap drift')
  if time.monotonic()>=deadline:raise Invalid('bootstrap deadline')
  v={'schema':1,'identity':self.identity,'source':str(self.source),'destination':str(self.destination),'original':self.expected,'state':'intent','tree':None};self.save(v)
  self.stage.mkdir(mode=0o700);p.sync(self.stage.parent)
  (self.stage/'releases').mkdir(mode=0o755)
  target=self.expected['target'];release=self.stage/target;release.mkdir(mode=0o755)
  for name,desc in self.expected['tree'].items():
   if not name:continue
   path=release/name
   if desc['kind']=='dir':path.mkdir(mode=0o755)
   elif desc['kind']=='file':
    data=(self.source/target/name).read_bytes()
    if p.digest(data)!=desc['sha256']:raise Invalid('copy source drift')
    p.write_new(path,data);path.chmod(0o444)
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
    try:os.fsync(fd)
    finally:os.close(fd)
   else:raise Invalid('unexpected source member')
  for path in sorted([release,*[x for x in release.rglob('*') if x.is_dir()]],key=lambda x:len(x.parts),reverse=True):p.sync(path)
  (self.stage/'current').symlink_to(target);p.sync(self.stage)
  os.chown(self.stage/'releases',self.storage_uid,self.storage_gid);os.chown(self.stage,self.storage_uid,self.storage_gid);self.stage.chmod(0o755)
  p.sync(self.stage/'releases');p.sync(self.stage)
  if original(self.source,self.owner,self.boundary)!=self.expected:raise Invalid('source changed during copy')
  v['tree']=tree(self.stage,self.owner,self.storage_uid,self.storage_gid);v['state']='built';self.save(v);self.fault('bootstrap-built')
  if time.monotonic()>=deadline:raise Invalid('bootstrap deadline')
  if self.destination.exists() or self.destination.is_symlink():raise Invalid('foreign destination')
  os.rename(self.stage,self.destination);p.sync(self.destination.parent);self.fault('bootstrap-effect')
  if tree(self.destination,self.owner,self.storage_uid,self.storage_gid)!=v['tree']:raise Invalid('bootstrap readback')
  v['state']='installed';self.save(v);self.fault('bootstrap-durable')
 def rollback(self,deadline):
  if not self.file.exists():return
  v=self.state()
  if v['state']=='recovered':
   if any(x.exists() or x.is_symlink() for x in (self.destination,self.stage)):raise Invalid('recovered bootstrap foreign path')
   return
  # Never attribute a partial or foreign tree to the installer by name alone.
  if v['tree'] is None:
   if self.stage.exists() or self.destination.exists():raise Invalid('partial bootstrap staging requires manual evidence')
   v['state']='recovered';self.save(v);return
  order=sorted(v['tree'],key=lambda n:(len(Path(n).parts),n),reverse=True)
  if v['state']!='deleting':
   found=[x for x in (self.stage,self.destination) if x.exists() or x.is_symlink()]
   if len(found)!=1:raise Invalid('bootstrap owned tree location uncertain')
   path=found[0]
   if tree(path,self.owner,self.storage_uid,self.storage_gid)!=v['tree']:raise Invalid('bootstrap foreign bytes/inode/metadata; preserve')
   v.update(schema=2,state='deleting',deletion={'path':str(path),'done':[],'pending':None});self.save(v)
  deletion=v['deletion']
  if not isinstance(deletion,dict) or set(deletion)!={'path','done','pending'} or deletion['path'] not in (str(self.stage),str(self.destination)) or not isinstance(deletion['done'],list) or deletion['done']!=order[:len(deletion['done'])]:raise Invalid('bootstrap deletion journal')
  path=Path(deletion['path']);other=self.stage if path==self.destination else self.destination
  if other.exists() or other.is_symlink():raise Invalid('bootstrap foreign alternate location')
  while len(deletion['done'])<len(order):
   if time.monotonic()>=deadline:raise Invalid('bootstrap recovery deadline')
   name=order[len(deletion['done'])];pending=deletion['pending']
   if pending is not None and pending!=name:raise Invalid('bootstrap deletion intent order')
   expected={n:d for n,d in v['tree'].items() if n not in deletion['done']}
   actual=tree(path,self.owner,self.storage_uid,self.storage_gid) if path.exists() or path.is_symlink() else {}
   removed=pending is not None and name not in actual
   if removed:expected.pop(name)
   if actual!=expected:raise Invalid('bootstrap foreign bytes/inode/metadata; preserve')
   x=path/name
   if pending is None:
    deletion['pending']=name;self.save(v);self.fault('bootstrap-delete-intent:'+name)
   if not removed:
    if v['tree'][name]['kind']=='dir':x.rmdir()
    else:x.unlink()
    self.fault('bootstrap-delete-effect:'+name)
   p.sync(x.parent);self.fault('bootstrap-delete-sync:'+name)
   deletion['done'].append(name);deletion['pending']=None;self.save(v);self.fault('bootstrap-delete-durable:'+name)
  if deletion['pending'] is not None or path.exists() or path.is_symlink():raise Invalid('bootstrap deletion completion drift')
  v['state']='recovered';self.save(v)
