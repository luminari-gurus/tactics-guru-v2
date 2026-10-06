"""Durable typed lifecycle; no arbitrary command adapters exposed by CLI.

Admission stays CLOSED after apply/recovery. Independent review and explicit
operator activation are separate from successful byte/configuration verification.
"""
from contextlib import contextmanager
import fcntl
import os
from pathlib import Path
import stat
import time
import candidate_plan as p

PHASES=('accounts','files','bootstrap','ssh','mounts','verify')
class Lifecycle:
 def __init__(self,root,identity,stages,fence,*,owner=0,boundary=Path('/'),fault=None):
  if set(stages)!=set(PHASES):raise p.Invalid('exact lifecycle stages')
  self.root=Path(root);self.identity=identity;self.stages=stages;self.fence=fence;self.owner=owner;self.boundary=Path(boundary);self.fault=fault or (lambda phase:None)
  self.file=self.root/'lifecycle.json';p.private(self.file,owner,boundary)
 def save(self,v):
  pending=self.root/'lifecycle.pending';p.write_new(pending,p.encoded(v));os.replace(pending,self.file);p.sync(self.root)
 def state(self):
  raw,meta=p.read(self.file,owner=self.owner,boundary=self.boundary)
  if meta['mode']!=0o600:raise p.Invalid('lifecycle private journal')
  v=p.decode(raw)
  if set(v)!={'schema','identity','started','complete','restored','status'} or v['schema']!=1 or v['identity']!=self.identity:raise p.Invalid('lifecycle binding')
  if v['started']!=list(PHASES[:len(v['started'])]) or v['complete']!=list(PHASES[:len(v['complete'])]) or len(v['complete'])>len(v['started']):raise p.Invalid('lifecycle phase trace')
  if v['restored']!=list(reversed(v['started']))[:len(v['restored'])] or v['status'] not in ('applying-closed','verified-closed','recovering-closed','recovered-closed','activating','activated','activation-uncertain','activation-failed-closed'):raise p.Invalid('lifecycle recovery trace')
  return v
 @contextmanager
 def locked(self):
  fd=os.open(self.root/'lifecycle.lock',os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW,0o600)
  try:
   s=os.fstat(fd)
   if s.st_uid!=self.owner or s.st_nlink!=1 or not stat.S_ISREG(s.st_mode) or stat.S_IMODE(s.st_mode)!=0o600:raise p.Invalid('lifecycle lock')
   fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB);yield
  finally:os.close(fd)
 def apply(self,deadline,recheck):
  with self.locked():
   if self.file.exists() or self.file.is_symlink():raise p.Invalid('existing lifecycle; recover first')
   recheck()
   for n in PHASES:self.stages[n].preflight(deadline)
   recheck()
   if time.monotonic()>=deadline:raise p.Invalid('lifecycle deadline')
   # Any SSH/key mutation has a plan-bound durable intent first.
   v={'schema':1,'identity':self.identity,'started':[],'complete':[],'restored':[],'status':'applying-closed'};self.save(v)
   self.fence.disable(deadline)
   with self.fence.held(deadline):
    for n in PHASES:
     if time.monotonic()>=deadline:raise p.Invalid('lifecycle phase deadline')
     v['started'].append(n);self.save(v);self.fault(n+'-before')
     self.stages[n].apply(deadline);self.fault(n+'-effect')
     v['complete'].append(n);self.save(v);self.fault(n+'-durable')
    v['status']='verified-closed';self.save(v)
 def activate(self,deadline,recheck,acceptance,acknowledgment):
  with self.locked():
   if acknowledgment!='ACTIVATE '+self.identity:raise p.Invalid('exact operator activation acknowledgment missing')
   v=self.state()
   if v['status']!='verified-closed' or v['complete']!=list(PHASES):raise p.Invalid('activation requires complete verified-closed lifecycle')
   recheck()
   with self.fence.held(deadline):
    self.stages['verify'].apply(deadline);acceptance(deadline)
   # Revalidate after acquiring both locks again; no admission effect before
   # policy, native identity, all-artifact health and real SSH acceptance.
   failed=[]
   def compensate():
    if failed:return
    failed.append(True)
    v['status']='activation-uncertain'
    try:
     self.fence.disable(time.monotonic()+5)
    except Exception:pass
    else:v['status']='activation-failed-closed'
    # The previous activating intent remains truthful if journal I/O also fails.
    try:self.save(v)
    except Exception:pass
   self.fence.activation_failure=compensate
   try:
    with self.fence.activation_held(deadline):
     recheck();self.stages['verify'].apply(deadline);acceptance(deadline)
     if time.monotonic()>=deadline:raise p.Invalid('activation deadline')
     v['status']='activating';self.save(v);self.fault('activation-intent')
     self.fence.enable(deadline);self.fault('activation-effect')
     v['status']='activated';self.save(v)
   except Exception:
    compensate();raise
   finally:self.fence.activation_failure=None
 def recover(self,deadline,recheck):
  with self.locked():
   recheck()
   if not self.file.exists():raise p.Invalid('no durable lifecycle intent')
   v=self.state();self.fence.disable(deadline)
   with self.fence.held(deadline):
    v['status']='recovering-closed';self.save(v)
    # Do not skip an already-restored phase: recheck its idempotent adapter.
    for n in reversed(v['started']):
     self.stages[n].rollback(deadline);self.fault(n+'-restore-effect')
     if n not in v['restored']:v['restored'].append(n)
     self.save(v);self.fault(n+'-restore-durable')
    v['status']='recovered-closed';self.save(v)
