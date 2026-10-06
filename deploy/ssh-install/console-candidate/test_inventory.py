import importlib.util
import os
from pathlib import Path
import tempfile
import unittest

class InventoryTests(unittest.TestCase):
 def setUp(self):
  self.assertIsNotNone(importlib.util.find_spec('host_inventory'),'actual recursive host inventory producer missing')
  import host_inventory as m
  self.m=m;self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name);self.root.chmod(0o700)
 def test_recursive_ssh_include_empty_glob_then_drift(self):
  main=self.root/'main';inc=self.root/'includes';inc.mkdir();child=inc/'child.conf'
  main.write_text('Include '+str(inc/'*.conf')+'\nUsePAM yes\n')
  before=self.m.policy.includes(main,owner=os.getuid(),boundary=self.root)
  self.assertEqual(before['patterns'][str(inc/'*.conf')],[])
  child.write_text('PasswordAuthentication no\n')
  after=self.m.policy.includes(main,owner=os.getuid(),boundary=self.root)
  self.assertNotEqual(before,after);self.assertIn(str(child),after['files'])
 def test_recursive_pam_includes_and_cycle_denial(self):
  main=self.root/'sshd';child=self.root/'common-auth';main.write_text('@include common-auth\n');child.write_text('auth required pam_unix.so\n')
  v=self.m.policy.pam_inventory(main,owner=os.getuid(),boundary=self.root);self.assertEqual(len(v),2)
  child.write_text('@include sshd\n')
  with self.assertRaises(self.m.p.Invalid):self.m.policy.pam_inventory(main,owner=os.getuid(),boundary=self.root)
 def test_unknown_input_fields_and_unsafe_context_denied(self):
  with self.assertRaises(self.m.p.Invalid):self.m.validate_input({'schema':1,'arbitrary_cmd':'id'})
  with self.assertRaises(self.m.p.Invalid):self.m.policy.contexts([dict(host='x,evil=yes',addr='127.0.0.1',laddr='127.0.0.1',lport='22')])

if __name__=='__main__':unittest.main(verbosity=2)
