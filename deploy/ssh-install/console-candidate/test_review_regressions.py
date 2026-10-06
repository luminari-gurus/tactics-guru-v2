"""Independent-review regressions: owned private files, no production effects."""
import json
import os
from pathlib import Path
import time
import unittest
from unittest.mock import patch
import test_candidate as fixtures

class ActivationBinding(unittest.TestCase):
 setUp=fixtures.CandidateTests.setUp
 prepare=fixtures.CandidateTests.prepare
 check=fixtures.CandidateTests.check
 def activation(self,**kw):
  return self.p.check_activation(self.plan,{'engine':self.source},{'target':self.target,'new':self.absent},self.collect,owner=os.getuid(),boundary=self.root,**kw)
 def test_postapproval_pam_nss_and_arbitrary_target_drift_rejected(self):
  for category in ('pam','accounts','target'):
   with self.subTest(category=category):
    self.setUp();self.prepare()
    if category=='target':self.target.write_bytes(b'arbitrary')
    else:self.state[category]['sshd' if category=='pam' else 'nss']='postapproval drift'
    with self.assertRaises(self.p.Invalid):self.check()
    with self.assertRaises(self.p.Invalid):self.activation()
 def test_activation_unchanged_inputs_positive(self):
  self.prepare();self.activation()
 def test_activation_expiry_source_and_backups_still_bound(self):
  self.prepare()
  with self.assertRaises(self.p.Invalid):self.activation(now=time.time()+301)
  self.source.write_bytes(b'changed')
  with self.assertRaises(self.p.Invalid):self.activation()
 def test_cli_uses_separate_activation_collector(self):
  raw=Path(__file__).with_name('console_cli.py').read_text()
  self.assertIn('p.check_activation(planpath,sources,targets,lambda:collector.activation(value))',raw)

class HistoricalMetadata(unittest.TestCase):
 setUp=fixtures.BootstrapTests.setUp
 stage=fixtures.BootstrapTests.stage
 def valid_history(self):
  metadata=dict(repository='luminari-gurus/tactics-guru-v2',ref='refs/heads/main',sha='a'*40,event='push',timestamp=1,run_number=123,run_attempt=1,deployment_id='456')
  self.manifest['metadata']=metadata
  self.rewrite_marker({k:metadata[k] for k in ('sha','repository','deployment_id')})
  return metadata
 def rewrite_manifest(self):
  path=self.old/'current/manifest.json';path.chmod(0o600);path.write_bytes(json.dumps(self.manifest,sort_keys=True).encode())
 def rewrite_marker(self,marker):
  path=self.old/'current/_deployment.json';path.chmod(0o644);raw=json.dumps(marker,sort_keys=True).encode();path.write_bytes(raw);path.chmod(0o444)
  self.manifest['hashes']['_deployment.json']=self.b.p.digest(raw);self.rewrite_manifest()
 def test_malformed_historical_metadata_rejected(self):
  self.valid_history();self.manifest['metadata'].update(repository='WRONG',sha='not-a-sha',run_number=999);self.manifest['order']=[1,1];self.rewrite_manifest()
  with self.assertRaises(self.b.Invalid):self.stage().preflight(time.monotonic()+5)
 def test_historical_schema_each_field_and_order_validated(self):
  changes=[('repository','WRONG'),('sha','not-a-sha'),('run_number',True),('run_attempt',0),('timestamp',False),('ref','refs/pull/1'),('event','pull_request'),('deployment_id',123),('deployment_id','bad'),('run_number',999)]
  for field,value in changes:
   with self.subTest(field=field,value=value):
    self.valid_history();self.manifest['metadata'][field]=value;self.rewrite_manifest()
    with self.assertRaises(self.b.Invalid):self.stage().preflight(time.monotonic()+5)
  self.valid_history();self.manifest['metadata']['extra']=1;self.rewrite_manifest()
  with self.assertRaises(self.b.Invalid):self.stage().preflight(time.monotonic()+5)
 def test_historical_timestamp_not_fresh_upload(self):
  self.valid_history();self.stage().apply(time.monotonic()+5);self.stage().rollback(time.monotonic()+5)
 def test_marker_metadata_mismatch_rejected(self):
  self.valid_history();self.rewrite_marker(dict(sha='b'*40,repository='luminari-gurus/tactics-guru-v2',deployment_id='456'))
  with self.assertRaises(self.b.Invalid):self.stage().preflight(time.monotonic()+5)

class DeletionRecovery(unittest.TestCase):
 setUp=fixtures.BootstrapTests.setUp
 stage=fixtures.BootstrapTests.stage
 valid_history=HistoricalMetadata.valid_history
 rewrite_manifest=HistoricalMetadata.rewrite_manifest
 rewrite_marker=HistoricalMetadata.rewrite_marker
 def interrupt_unlink(self):
  original=Path.unlink;calls=[]
  def interrupted(path,*a,**kw):
   result=original(path,*a,**kw)
   if path.is_relative_to(self.new):calls.append(str(path));raise RuntimeError('death after unlink')
   return result
  with patch.object(Path,'unlink',interrupted):
   with self.assertRaisesRegex(RuntimeError,'death after unlink'):self.stage().rollback(time.monotonic()+5)
  self.assertEqual(len(calls),1)
 def test_interrupted_first_unlink_resumes_fresh(self):
  self.valid_history();self.stage().apply(time.monotonic()+5);self.interrupt_unlink()
  self.stage().rollback(time.monotonic()+5);self.stage().rollback(time.monotonic()+5)
  self.assertFalse(self.new.exists());self.assertTrue(self.old.exists())
 def test_all_member_intent_effect_fsync_durable_hard_deaths_resume(self):
  self.valid_history();self.stage().apply(time.monotonic()+5)
  members=sorted(self.stage().state()['tree'])
  self.stage().rollback(time.monotonic()+5)
  count=0
  for member in members:
   for boundary in ('intent','effect','sync','durable'):
    with self.subTest(member=member,boundary=boundary):
     self.setUp();self.valid_history();self.stage().apply(time.monotonic()+5)
     phase='bootstrap-delete-'+boundary+':'+member
     child=os.fork()
     if child==0:
      def fault(actual):
       if actual==phase:os._exit(77)
      try:self.stage(fault=fault).rollback(time.monotonic()+5)
      finally:os._exit(78)
     _,status=os.waitpid(child,0);self.assertEqual(os.waitstatus_to_exitcode(status),77)
     self.stage().rollback(time.monotonic()+5);self.stage().rollback(time.monotonic()+5)
     self.assertEqual(self.stage().state()['state'],'recovered');self.assertFalse(self.new.exists());count+=1
  self.assertEqual(count,len(members)*4)
  Path(__file__).with_name('review-deletion-boundaries.json').write_text(json.dumps({'members':members,'boundaries':['intent','effect','sync','durable'],'hard_death_cases':count,'passed':count},indent=2))
 def test_foreign_addition_after_partial_deletion_preserved(self):
  self.valid_history();self.stage().apply(time.monotonic()+5);self.interrupt_unlink()
  foreign=self.new/'foreign';foreign.write_bytes(b'foreign');foreign.chmod(0o444)
  with self.assertRaises(self.b.Invalid):self.stage().rollback(time.monotonic()+5)
  self.assertEqual(foreign.read_bytes(),b'foreign');self.assertEqual(self.stage().state()['state'],'deleting')
 def test_conflicting_inode_after_partial_deletion_preserved(self):
  self.valid_history();self.stage().apply(time.monotonic()+5);self.interrupt_unlink()
  path=self.new/'releases/original/app.js';path.rename(self.root/'held-original')
  path.write_bytes(b'original js');path.chmod(0o444)
  with self.assertRaises(self.b.Invalid):self.stage().rollback(time.monotonic()+5)
  self.assertEqual(path.read_bytes(),b'original js');self.assertEqual(self.stage().state()['state'],'deleting')

if __name__=='__main__':unittest.main(verbosity=2)
