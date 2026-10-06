import unittest
import time
from contextlib import contextmanager
from test_lifecycle import LifecycleTests

class ActivationTests(LifecycleTests):
 def test_host_cli_exposes_activation_without_guard_bypass(self):
  import subprocess,sys
  from pathlib import Path
  result=subprocess.run([sys.executable,str(Path(__file__).with_name('console_cli.py')),'--help'],capture_output=True)
  self.assertIn(b'activate',result.stdout);self.assertIn(b'--acceptance-key',result.stdout)
  import host_inventory
  self.assertIn('ssh_acceptance.py',host_inventory.CANDIDATE_NAMES)
 def test_requires_exact_operator_ack_and_verified_state(self):
  self.assertTrue(hasattr(self.engine(),'activate'),'explicit durable activation missing')
  self.engine().apply(time.monotonic()+5,lambda:None)
  with self.assertRaises(RuntimeError):self.engine().activate(time.monotonic()+5,lambda:None,lambda d:None,'wrong')
  self.assertEqual(self.engine().state()['status'],'verified-closed')
 def test_acceptance_denial_keeps_admission_closed(self):
  self.assertTrue(hasattr(self.engine(),'activate'),'explicit durable activation missing')
  self.engine().apply(time.monotonic()+5,lambda:None)
  def denied(d):raise RuntimeError('SSH negative test failed')
  with self.assertRaises(RuntimeError):self.engine().activate(time.monotonic()+5,lambda:None,denied,'ACTIVATE '+'a'*64)
  self.assertEqual(self.engine().state()['status'],'verified-closed')
  self.assertNotIn('gate-enable',self.events)
 def test_activation_intent_precedes_effect_and_is_recoverable(self):
  self.assertTrue(hasattr(self.engine(),'activate'),'explicit durable activation missing')
  self.engine().apply(time.monotonic()+5,lambda:None)
  @contextmanager
  def held(d):yield
  self.fence.activation_held=held
  def enable(d):
   self.assertEqual(self.engine().state()['status'],'activating');self.events.append('gate-enable')
  self.fence.enable=enable
  self.engine().activate(time.monotonic()+5,lambda:None,lambda d:self.events.append('ssh-acceptance'),'ACTIVATE '+'a'*64)
  self.assertLess(self.events.index('ssh-acceptance'),self.events.index('gate-enable'))
  self.assertEqual(self.engine().state()['status'],'activated')
  self.engine().recover(time.monotonic()+5,lambda:None)
  self.assertEqual(self.engine().state()['status'],'recovered-closed')

class LeaseExpiryTests(unittest.TestCase):
 setUp=LifecycleTests.setUp
 engine=LifecycleTests.engine
 def test_expiry_after_enable_compensates_with_owned_identity_under_locks(self):self.expiry_case()
 def test_expiry_preserves_foreign_same_byte_key(self):self.expiry_case(foreign=True)
 def expiry_case(self,foreign=False):
  import fcntl
  import os
  from unittest.mock import patch
  import candidate_plan as p
  import host_console_backend as h
  import session_barrier as session
  gate=self.root/'gate';key=self.root/'key'
  publication=self.root/'publication';legacy=self.root/'legacy'
  for path,data in ((gate,b'maintenance\n'),(key,b'approved\n'),(publication,b''),(legacy,b'')):
   path.write_bytes(data);path.chmod(0o644)
  expired=[]
  def maintenance():
   if expired:raise p.Invalid('maintenance lease expired')
  fence=h.Fence(maintenance,None,legacy,gate=gate,key=key,publication=publication,approved_key=b'approved\n')
  def key_check():
   maintenance();s=key.stat();return s.st_dev,s.st_ino
  fence.key_check=key_check
  self.fence=fence
  engine=self.engine()
  engine.save(dict(schema=1,identity='a'*64,started=list(self.l.PHASES),complete=list(self.l.PHASES),restored=[],status='verified-closed'))
  original_read=p.read;original_disable=fence.disable
  def read(path,**kw):
   kw.setdefault('owner',os.getuid());kw.setdefault('boundary',self.root)
   return original_read(path,**kw)
  closures=[]
  def disable(d):
   for path in (publication,legacy):
    with path.open('r+') as stream:
     with self.assertRaises(BlockingIOError):fcntl.flock(stream,fcntl.LOCK_EX|fcntl.LOCK_NB)
   closures.append(True);return original_disable(d)
  def fault(point):
   if point=='activation-effect':
    expired.append(True)
    if foreign:
     key.rename(self.root/'retained-key');key.write_bytes(b'approved\n');key.chmod(0o644)
  engine.fault=fault
  # Only host ownership/process adapters are injected; activation, file effects,
  # lease checks, key identity, compensation and both flock locks remain real.
  with patch.object(p,'read',read),patch.object(session,'secure_open',lambda path,flags:os.open(path,flags)),patch.object(session.Held,'verify',lambda held:None),patch.object(fence,'quiesce',lambda d:None),patch.object(fence,'actors',lambda:[]),patch.object(fence,'disable',disable):
   with self.assertRaisesRegex(p.Invalid,'maintenance lease expired'):
    engine.activate(time.monotonic()+5,maintenance,lambda d:None,'ACTIVATE '+'a'*64)
  self.assertEqual(closures,[True])
  self.assertEqual(gate.read_bytes(),b'maintenance\n')
  self.assertEqual(key.read_bytes(),b'approved\n' if foreign else b'')
  self.assertEqual(engine.state()['status'],'activation-uncertain')

if __name__=='__main__':unittest.main(verbosity=2)
