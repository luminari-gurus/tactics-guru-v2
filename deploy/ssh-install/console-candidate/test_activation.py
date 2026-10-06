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

if __name__=='__main__':unittest.main(verbosity=2)
