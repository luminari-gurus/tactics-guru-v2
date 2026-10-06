import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

class LifecycleTests(unittest.TestCase):
 def setUp(self):
  self.assertIsNotNone(importlib.util.find_spec('console_lifecycle'),'console lifecycle missing')
  import console_lifecycle as l
  self.l=l
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name);self.root.chmod(0o700)
  self.events=[]
  class Stage:
   def __init__(s,name):s.name=name
   def preflight(s,d):self.events.append(s.name+'-check')
   def apply(s,d):self.events.append(s.name+'-apply')
   def rollback(s,d):self.events.append(s.name+'-rollback')
  self.stages={n:Stage(n) for n in ('accounts','files','bootstrap','ssh','mounts','verify')}
  class Fence:
   def disable(s,d):self.events.append('gate-close-key-revoke')
   def held(s,d):
    from contextlib import contextmanager
    @contextmanager
    def c():
     self.events.append('quiesce-locks');yield;self.events.append('locks-release')
    return c()
  self.fence=Fence()
 def engine(self,**kw):return self.l.Lifecycle(self.root,'a'*64,self.stages,self.fence,owner=os.getuid(),boundary=self.root,**kw)
 def test_order_and_no_automatic_activation(self):
  self.engine().apply(time.monotonic()+5,lambda:self.events.append('whole-plan-recheck'))
  self.assertEqual(self.events[0],'whole-plan-recheck')
  self.assertLess(self.events.index('gate-close-key-revoke'),self.events.index('accounts-apply'))
  self.assertLess(self.events.index('ssh-apply'),self.events.index('mounts-apply'))
  self.assertNotIn('activate',self.events)
  self.assertEqual(self.engine().state()['status'],'verified-closed')
 def test_fresh_recovery_reverse_order(self):
  def crash(n):
   if n=='mounts-effect':raise RuntimeError('crash')
  with self.assertRaises(RuntimeError):self.engine(fault=crash).apply(time.monotonic()+5,lambda:None)
  self.events.clear();self.engine().recover(time.monotonic()+5,lambda:None)
  self.assertEqual([x for x in self.events if x.endswith('-rollback')],['mounts-rollback','ssh-rollback','bootstrap-rollback','files-rollback','accounts-rollback'])
  self.assertEqual(self.engine().state()['status'],'recovered-closed')
 def test_foreign_restore_failure_stops_remaining_phases(self):
  self.engine().apply(time.monotonic()+5,lambda:None)
  def denied(d):raise RuntimeError('foreign mount drift')
  self.stages['mounts'].rollback=denied;self.events.clear()
  with self.assertRaises(RuntimeError):self.engine().recover(time.monotonic()+5,lambda:None)
  self.assertNotIn('accounts-rollback',self.events)
 def test_rechecks_again_after_preflights_before_fence_mutation(self):
  calls=[]
  self.engine().apply(time.monotonic()+5,lambda:calls.append(tuple(self.events)))
  self.assertEqual(len(calls),2,'missing final whole-plan recheck')
  self.assertIn('verify-check',calls[-1]);self.assertNotIn('gate-close-key-revoke',calls[-1])
 def test_preflight_and_recheck_failure_no_mutation(self):
  def denied():raise RuntimeError('plan drift')
  with self.assertRaises(RuntimeError):self.engine().apply(time.monotonic()+5,denied)
  self.assertEqual(self.events,[])
 def test_console_cli_has_no_fixture_bypass(self):
  cli=Path(__file__).with_name('console_cli.py')
  self.assertTrue(cli.exists(),'replacement console CLI missing')
  r=subprocess.run([sys.executable,str(cli),'check','--plan','/nonexistent','--input','/nonexistent'],capture_output=True)
  self.assertNotEqual(r.returncode,0);self.assertIn(b'host root console',r.stderr)

class PolicyTests(unittest.TestCase):
 def test_policy_does_not_relax_global_and_uses_fixed_wrapper(self):
  self.assertIsNotNone(importlib.util.find_spec('host_policy'),'integrated SSH policy missing')
  import host_policy as p
  rendered=p.render()
  self.assertTrue(rendered.startswith('Match User tgdeploy\n'))
  self.assertNotIn('UsePAM',rendered)
  self.assertIn('ForceCommand /usr/local/lib/tg-deploy/ssh-bootstrap',rendered)
  self.assertIn('AuthorizedKeysFile /etc/tg-deploy/authorized_keys',rendered)

if __name__=='__main__':unittest.main(verbosity=2)
