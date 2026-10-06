"""Pure filesystem acceptance; native SSH acceptance is a separate actor."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import time
import unittest

class CandidateTests(unittest.TestCase):
 def setUp(self):
  self.assertIsNotNone(importlib.util.find_spec('candidate_plan'), 'coherent host-plan producer/consumer missing')
  import candidate_plan as p
  self.p=p
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
  self.root=Path(self.temp.name);self.root.chmod(0o700)
  self.source=self.root/'source';self.source.write_bytes(b'reviewed source');self.source.chmod(0o600)
  self.target=self.root/'target';self.target.write_bytes(b'original');self.target.chmod(0o640)
  self.absent=self.root/'absent'
  self.state={'boot':'test-boot','accounts':{'known_absent':True},'sshd':{'main':'test'},'pam':{'sshd':'test'},'container':{'Id':'1'*64},'artifacts':{'order':[123,1]},'maintenance':{'native_writers_excluded':True},'repository':{'commit':'a'*40,'clean':True},'locks':{}}
  self.collect=lambda: self.state
  self.plan=self.root/'plan.json'
 def prepare(self):
  return self.p.prepare(self.plan,{'engine':self.source},{'target':self.target,'new':self.absent},self.collect,owner=os.getuid(),boundary=self.root)
 def check(self,**kw):
  return self.p.check(self.plan,{'engine':self.source},{'target':self.target,'new':self.absent},self.collect,owner=os.getuid(),boundary=self.root,**kw)
 def test_roundtrip_exact_absence_metadata_and_approval_bytes(self):
  v=self.prepare();self.assertEqual(self.check(),v)
  self.assertIsNone(v['targets']['new']['file'])
  self.assertEqual(v['targets']['target']['file']['mode'],0o640)
  self.assertNotEqual((self.root/'plan.json.backups/target').stat().st_ino,self.target.stat().st_ino)
  self.assertEqual(self.p.approval(self.plan,owner=os.getuid(),boundary=self.root),hashlib.sha256(self.plan.read_bytes()).hexdigest())
 def test_read_induced_atime_update_is_not_concurrent_content_drift(self):
  os.utime(self.target,ns=(0,self.target.stat().st_mtime_ns))
  raw,meta=self.p.read(self.target,owner=os.getuid(),boundary=self.root)
  self.assertEqual(raw,b'original')
 def test_created_absence_blocks(self):
  self.prepare();self.absent.write_bytes(b'foreign')
  with self.assertRaises(self.p.Invalid):self.check()
 def test_snapshot_drift_blocks(self):
  self.prepare();self.state['pam']['sshd']='changed'
  with self.assertRaises(self.p.Invalid):self.check()
 def test_snapshot_capture_window_drift_blocks(self):
  n=[0]
  def changing():
   n[0]+=1;return dict(self.state,boot=str(n[0]))
  with self.assertRaises(self.p.Invalid):self.p.prepare(self.plan,{'engine':self.source},{'target':self.target},changing,owner=os.getuid(),boundary=self.root)
 def test_independent_backup_metadata_and_bytes_blocks(self):
  self.prepare();(self.root/'plan.json.backups/target').chmod(0o644)
  with self.assertRaises(self.p.Invalid):self.check()
 def test_expiry_source_and_target_drift_blocks(self):
  self.prepare()
  with self.assertRaises(self.p.Invalid):self.check(now=time.time()+301)
  self.source.write_bytes(b'changed')
  with self.assertRaises(self.p.Invalid):self.check()
 def test_symlink_parent_blocks_even_absent_leaf(self):
  self.prepare();other=self.root/'other';other.mkdir();self.absent.symlink_to(other/'missing')
  with self.assertRaises((self.p.Invalid,OSError)):self.check()

class BootstrapTests(unittest.TestCase):
 def test_bootstrap_reads_do_not_treat_atime_as_content_drift(self):
  target=self.root/'atime-member';target.write_bytes(b'fixture');target.chmod(0o444)
  os.utime(target,ns=(0,target.stat().st_mtime_ns))
  description=self.b.tree(target,owner=os.getuid())
  self.assertEqual(description['']['sha256'],hashlib.sha256(b'fixture').hexdigest())
 def setUp(self):
  self.assertIsNotNone(importlib.util.find_spec('bootstrap_stage'),'original immutable bootstrap transaction missing')
  import bootstrap_stage as b
  self.b=b
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
  self.root=Path(self.temp.name);self.root.chmod(0o700)
  self.old=self.root/'original';self.old.mkdir();(self.old/'releases').mkdir()
  rel=self.old/'releases/original';rel.mkdir()
  metadata=dict(repository='luminari-gurus/tactics-guru-v2',ref='refs/heads/main',sha='a'*40,event='push',timestamp=1,run_number=123,run_attempt=1,deployment_id='456')
  artifacts={'index.html':b'original index','app.js':b'original js','style.css':b'original css','_deployment.json':json.dumps({k:metadata[k] for k in ('sha','repository','deployment_id')},sort_keys=True).encode()}
  for n,data in artifacts.items():(rel/n).write_bytes(data);(rel/n).chmod(0o444)
  self.manifest={'metadata':metadata,'order':[123,1],'body_sha256':'b'*64,'hashes':{n:hashlib.sha256(d).hexdigest() for n,d in artifacts.items()}}
  (rel/'manifest.json').write_bytes(json.dumps(self.manifest,sort_keys=True).encode());(rel/'manifest.json').chmod(0o600)
  (self.old/'current').symlink_to('releases/original')
  self.new=self.root/'new';self.journal=self.root/'journal';self.journal.mkdir(mode=0o700)
 def stage(self,**kw):return self.b.Bootstrap(self.journal,self.old,self.new,'c'*64,owner=os.getuid(),boundary=self.root,storage_uid=os.getuid(),storage_gid=os.getgid(),**kw)
 def test_bootstrap_exact_original_bytes_order_rootowned_artifacts(self):
  s=self.stage();s.preflight(time.monotonic()+5);s.apply(time.monotonic()+5)
  self.assertEqual(os.readlink(self.new/'current'),'releases/original')
  self.assertEqual((self.new/'current/manifest.json').read_bytes(),(self.old/'current/manifest.json').read_bytes())
  for n,d in self.manifest['hashes'].items():self.assertEqual(hashlib.sha256((self.new/'current'/n).read_bytes()).hexdigest(),d)
  s.rollback(time.monotonic()+5);self.assertFalse(self.new.exists());self.assertTrue(self.old.exists())
 def test_foreign_changes_preserved_on_recovery(self):
  s=self.stage();s.apply(time.monotonic()+5);(self.new/'current/app.js').chmod(0o644);(self.new/'current/app.js').write_bytes(b'foreign')
  with self.assertRaises(self.b.Invalid):self.stage().rollback(time.monotonic()+5)
  self.assertEqual((self.new/'current/app.js').read_bytes(),b'foreign')
 def test_crash_after_effect_recovers_fresh_instance(self):
  def fault(phase):
   if phase=='bootstrap-effect':raise RuntimeError('simulated death after atomic rename')
  with self.assertRaises(RuntimeError):self.stage(fault=fault).apply(time.monotonic()+5)
  self.stage().rollback(time.monotonic()+5);self.assertFalse(self.new.exists())
 def test_source_hash_drift_before_mutation_blocks(self):
  s=self.stage();s.preflight(time.monotonic()+5)
  (self.old/'current/app.js').chmod(0o644);(self.old/'current/app.js').write_bytes(b'changed')
  with self.assertRaises(self.b.Invalid):s.apply(time.monotonic()+5)
  self.assertFalse(self.new.exists())
 def test_bad_current_or_manifest_rejected(self):
  (self.old/'current').unlink();(self.old/'current').symlink_to('../outside')
  with self.assertRaises(self.b.Invalid):self.stage().preflight(time.monotonic()+5)

if __name__=='__main__':unittest.main(verbosity=2)
