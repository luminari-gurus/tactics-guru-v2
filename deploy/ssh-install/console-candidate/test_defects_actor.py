"""R1/R2 regressions: explicit owned, socket-free Docker driver only."""
import os
from pathlib import Path
import sys
import time
import unittest
from unittest.mock import patch
sys.path[:0]=['/fixture','/fixture/console-candidate','/fixture/package']
from test_native_actor import NativeSSH, ROOT
from host_console_backend import HostFiles, InstalledFiles, Fence
from host_adapters import TrustedRootBackend
from console_lifecycle import Lifecycle, PHASES
import candidate_plan as p
import host_policy as policy
import session_barrier as session

class Defects(NativeSSH):
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  # These tests use real SSH daemon stamps but no HTTP; stop the inherited
  # server before hard-death forks so the child has no inherited Python threads.
  cls.http.shutdown();cls.http.server_close();cls.thread.join(3)
 def setUp(self):
  import uuid
  self.base=ROOT/uuid.uuid4().hex;self.base.mkdir(mode=0o700)
  for n in ('accounts','database','files','lifecycle','sshjournal','keys','ssh'):(self.base/n).mkdir(mode=0o700)
  self.context=TrustedRootBackend(self.base/'accounts',self.base/'database',{n:self.base/n for n in ('home','code','keys','releases','ssh')},lambda:None)
  self.spec={'kind':'file','uid':0,'gid':0,'mode':0o644,'data':b'owned bytes\n'}
  self.directory={'kind':'dir','uid':0,'gid':0,'mode':0o755}
 def target_case(self,name,lost=None,foreign=True):
  changes={name:self.directory if name in ('home','code') else dict(self.spec,data=policy.render().encode() if name=='ssh/policy.conf' else self.spec['data'])}
  if name.startswith('code/'):changes['code']=self.directory
  installed=InstalledFiles(self.context,self.base/'files',changes)
  if lost:
   child=os.fork()
   if child==0:
    def die(point):
     if point==lost:os._exit(77)
    with HostFiles(self.context,installed.journal,fault=die) as f:f.apply(changes)
    os._exit(78)
   _,status=os.waitpid(child,0);self.assertEqual(os.waitstatus_to_exitcode(status),77)
  else:installed.apply(time.monotonic()+10)
  target=self.context.targets[name.split('/')[0]].joinpath(*name.split('/')[1:])
  if foreign:
   saved=self.base/'retained';target.rename(saved)
   if saved.is_dir():target.mkdir(mode=saved.stat().st_mode&0o777)
   else:target.write_bytes(saved.read_bytes());target.chmod(saved.stat().st_mode&0o777)
   identity=(target.stat().st_dev,target.stat().st_ino)
   with self.assertRaises(RuntimeError):installed.verify(name)
   if name=='keys/authorized_keys':
    with self.assertRaises(RuntimeError):installed.key_identity()
   with self.assertRaises(RuntimeError):installed.rollback(time.monotonic()+10)
   self.assertEqual((target.stat().st_dev,target.stat().st_ino),identity)
  else:
   installed.rollback(time.monotonic()+10);installed.rollback(time.monotonic()+10)
   self.assertFalse(target.exists())
 def test_foreign_code_file(self):self.target_case('code/release.py')
 def test_foreign_home(self):self.target_case('home')
 def test_foreign_code_directory(self):self.target_case('code')
 def test_foreign_snippet(self):self.target_case('ssh/policy.conf')
 def test_foreign_key(self):self.target_case('keys/authorized_keys')
 def test_lost_mkdir_foreign(self):self.target_case('home','mkdir')
 def test_lost_replace_foreign(self):self.target_case('keys/authorized_keys','replace')
 def test_lost_mkdir_owned(self):self.target_case('home','mkdir',False)
 def test_lost_replace_owned(self):self.target_case('keys/authorized_keys','replace',False)
 def test_policy_preserves_foreign_inode(self):
  installed=InstalledFiles(self.context,self.base/'files',{'ssh/policy.conf':dict(self.spec,data=policy.render().encode())})
  installed.apply(time.monotonic()+10)
  target=self.base/'ssh/policy.conf';target.rename(self.base/'retained');target.write_bytes(policy.render().encode());target.chmod(0o644)
  stage=policy.PolicyStage(self.base/'sshjournal',self.main,target,self.contexts,['fixtureother'],self.baseline,self.reload)
  stage.files=installed
  with self.assertRaises(RuntimeError):stage.rollback(time.monotonic()+10)
  self.assertTrue(target.exists())
 def activation_case(self,point,uncertain=False):
  gate=Path('/etc/tg-deploy/admission.gate');key=Path('/etc/tg-deploy/authorized_keys')
  gate.write_bytes(b'maintenance\n');key.write_bytes(self.key)
  def maintenance():
   if point=='lease-expiry' and (fired or gate.read_bytes()==b'enabled\n'):
    if not fired:fired.append(point)
    raise p.Invalid('maintenance lease expired')
  fence=Fence(maintenance,session.stamp(self.daemon.pid),self.original/'.lock',approved_key=self.key)
  # Real installed-file identity checks also require the maintenance lease.
  def key_check():
   maintenance();s=key.stat();return s.st_dev,s.st_ino
  fence.key_check=key_check
  class Stage:
   def apply(s,d):pass
  engine=Lifecycle(self.base/'lifecycle','a'*64,{n:Stage() for n in PHASES},fence)
  v={'schema':1,'identity':'a'*64,'started':list(PHASES),'complete':list(PHASES),'restored':[],'status':'verified-closed'};engine.save(v)
  original_sync=p.sync;original_read=p.read;original_fsync=os.fsync;original_save=engine.save;original_verify=session.Held.verify
  fired=[];checks=[]
  def fail():fired.append(point);raise OSError('injected '+point)
  def sync(path):
   if point=='parent-fsync' and not fired and Path(path)==gate.parent and gate.read_bytes()==b'enabled\n':fail()
   return original_sync(path)
  def read(path,**kw):
   if point=='readback' and not fired and Path(path)==gate and gate.read_bytes()==b'enabled\n':fail()
   return original_read(path,**kw)
  def fsync(fd):
   if point=='file-fsync' and not fired and os.readlink('/proc/self/fd/'+str(fd))==str(gate) and gate.read_bytes()==b'enabled\n':fail()
   return original_fsync(fd)
  def save(value):
   if point=='final-save' and not fired and value['status']=='activated':fail()
   return original_save(value)
  def verify(held):
   checks.append(gate.read_bytes())
   if point=='context-exit' and not fired and gate.read_bytes()==b'enabled\n':fail()
   return original_verify(held)
  locks=[];original_disable=fence.disable
  def disable(d):
   import fcntl
   for path in (fence.publication,fence.legacy):
    fd=os.open(path,os.O_RDWR)
    try:
     with self.assertRaises(BlockingIOError):fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
    finally:os.close(fd)
   locks.append(True)
   if uncertain:raise OSError('closure unavailable')
   return original_disable(d)
  with patch.object(p,'sync',sync),patch.object(p,'read',read),patch.object(os,'fsync',fsync),patch.object(engine,'save',save),patch.object(session.Held,'verify',verify),patch.object(fence,'disable',disable):
   with self.assertRaises((OSError,p.Invalid)):engine.activate(time.monotonic()+10,lambda:None,lambda d:None,'ACTIVATE '+'a'*64)
  self.assertEqual(locks,[True])
  self.assertEqual(fired,[point])
  if uncertain:self.assertEqual(engine.state()['status'],'activation-uncertain')
  else:
   self.assertEqual(gate.read_bytes(),b'maintenance\n');self.assertEqual(key.read_bytes(),b'')
   self.assertEqual(engine.state()['status'],'activation-uncertain' if point=='lease-expiry' else 'activation-failed-closed')
 def test_lease_expiry_after_enable_closes_gate_and_revokes_owned_key(self):self.activation_case('lease-expiry')
 def test_gate_file_fsync(self):self.activation_case('file-fsync')
 def test_gate_parent_fsync(self):self.activation_case('parent-fsync')
 def test_gate_readback(self):self.activation_case('readback')
 def test_final_lifecycle_save(self):self.activation_case('final-save')
 def test_activation_context_exit(self):self.activation_case('context-exit')
 def test_activation_revoke_preserves_foreign_same_byte_key(self):
  gate=Path('/etc/tg-deploy/admission.gate');key=Path('/etc/tg-deploy/authorized_keys')
  gate.write_bytes(b'maintenance\n');key.write_bytes(self.key)
  fence=Fence(lambda:None,session.stamp(self.daemon.pid),self.original/'.lock',approved_key=self.key)
  with fence.activation_held(time.monotonic()+5):fence.enable(time.monotonic()+5)
  key.rename(self.base/'retained-key');key.write_bytes(self.key);key.chmod(0o644)
  with self.assertRaises(RuntimeError):fence.disable(time.monotonic()+5)
  self.assertEqual(key.read_bytes(),self.key);self.assertEqual(gate.read_bytes(),b'maintenance\n')
 def test_gate_parent_failure_still_revokes_owned_key(self):
  gate=Path('/etc/tg-deploy/admission.gate');key=Path('/etc/tg-deploy/authorized_keys')
  gate.write_bytes(b'maintenance\n');key.write_bytes(self.key)
  fence=Fence(lambda:None,session.stamp(self.daemon.pid),self.original/'.lock',approved_key=self.key)
  with patch.object(p,'sync',side_effect=OSError('persistent sync failure')):
   with self.assertRaises(OSError):fence.disable(time.monotonic()+5)
  self.assertEqual(key.read_bytes(),b'')
 def test_verify_rejects_foreign_code_inode(self):
  from host_console_backend import VerifyStage
  installed=InstalledFiles(self.context,self.base/'files',{'code':self.directory,'code/release.py':self.spec})
  installed.apply(time.monotonic()+10)
  target=self.base/'code/release.py';target.rename(self.base/'retained');target.write_bytes(self.spec['data']);target.chmod(0o644)
  with self.assertRaises(RuntimeError):installed.verify('code/release.py')
 def test_lost_code_replace_foreign(self):self.target_case('code/release.py','replace')
 def test_lost_snippet_replace_foreign(self):self.target_case('ssh/policy.conf','replace')
 def test_lost_code_directory_foreign(self):self.target_case('code','mkdir')
 def test_lost_code_replace_owned(self):self.target_case('code/release.py','replace',False)
 def test_lost_snippet_replace_owned(self):self.target_case('ssh/policy.conf','replace',False)
 def test_lost_code_directory_owned(self):self.target_case('code','mkdir',False)
 def test_unconfirmed_closure_journal(self):self.activation_case('final-save',True)

if __name__=='__main__':
 names=unittest.TestLoader().getTestCaseNames(Defects)
 names=[n for n in names if not n.startswith('test_0')]
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Defects(n) for n in names))
 raise SystemExit(not result.wasSuccessful())
