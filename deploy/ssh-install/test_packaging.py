"""Nonmutating public-package portability acceptance."""
import ast
from pathlib import Path
import subprocess
import sys
import unittest

ROOT=Path(__file__).resolve().parent
class PackagingTests(unittest.TestCase):
 def test_isolated_cli_help_without_host_guard_or_inputs(self):
  result=subprocess.run([sys.executable,'-I','-B',str(ROOT/'console-candidate/console_cli.py'),'--help'],capture_output=True,text=True,timeout=10,cwd='/')
  self.assertEqual(result.returncode,0,result.stderr)
  self.assertIn('activate',result.stdout)
  self.assertNotIn('BLOCKED',result.stderr)
 def test_harness_publisher_paths_are_checkout_relative(self):
  text=(ROOT/'console-candidate/run_native_candidate.py').read_text()
  self.assertNotIn('/opt/data/repos/',text)
 def test_integrated_helpers_do_not_depend_on_obsolete_transaction(self):
  text=(ROOT/'console-candidate/run_integrated_candidate.py').read_text()
  self.assertNotIn('from test_host_combined_runtime import',text)
  self.assertIn('from fixture_support import',text)
 def test_shared_helpers_match_approved_fixture_contract(self):
  import fixture_support as f
  self.assertTrue(f.IMAGE.startswith('sha256:'))
  self.assertTrue(f.UBUNTU.startswith('sha256:'))
  self.assertIn(b'listen 8080',f.CONF)
  import io,tarfile
  with tarfile.open(fileobj=io.BytesIO(f.archive([('public.txt',b'x',0o644)]))) as tf:
   member=tf.extractfile('public.txt')
   self.assertIsNotNone(member)
   assert member is not None
   self.assertEqual(member.read(),b'x')
if __name__=='__main__':unittest.main(verbosity=2)
