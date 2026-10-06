"""Real Ubuntu native/SSH/PAM actor; HTTP root adapter is NOT Docker migration.

Own fixture-only metadata/keys. No fixture guard switch is exposed by the CLI.
"""
import functools
import hashlib
import http.server
import io
import json
import os
from pathlib import Path
import socket
import subprocess as sp
import sys
import threading
import time
import unittest
import zipfile
sys.path.insert(0,'/fixture')
sys.path.insert(0,'/fixture/console-candidate')
sys.path.insert(0,'/fixture/package')
import candidate_plan as plan
import host_policy as policy
from bootstrap_stage import Bootstrap,original,tree
from host_adapters import TrustedRootBackend,AccountStage
from host_account_engine import AccountEngine
from host_console_backend import InstalledFiles,Fence
from console_lifecycle import Lifecycle
import session_barrier as session
import release
import ssh_upload
import artifact_health

ROOT=Path('/fixture/runtime')
SCENARIO=sys.argv[1] if len(sys.argv)>1 else 'positive'
FAULT=sys.argv[2] if len(sys.argv)>2 else None
sys.argv=sys.argv[:1]

def run(args,**kw):
 return sp.run(args,stdin=kw.pop('stdin',None),stdout=sp.PIPE,stderr=sp.PIPE,timeout=kw.pop('timeout',10),**kw)

class Handler(http.server.SimpleHTTPRequestHandler):
 directory_root=None
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(self.directory_root),**kw)
 def log_message(self,*a):pass

class NativeSSH(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  if not Path('/.dockerenv').exists() or not Path('/fixture/.candidate-owned').read_text().startswith('tg-console-fixture-'):raise RuntimeError('owned fixture only')
  ROOT.mkdir(mode=0o700)
  cls.uuid=Path('/fixture/.candidate-owned').read_text().removeprefix('tg-console-fixture-')
  for name in ('accounts','files','bootstrap','ssh','lifecycle'):(ROOT/name).mkdir(mode=0o700)
  (Path('/fixture/sshd.d')).mkdir(mode=0o755)
  cls.main=Path('/fixture/sshd_config');cls.snippet=Path('/fixture/sshd.d/policy.conf')
  cls.original=getattr(cls,'ORIGINAL_PATH',ROOT/'original');cls.original.mkdir(mode=0o755)
  keyroot=Path('/etc/tg-deploy');keyroot.mkdir(mode=0o755)
  for name,data in (('admission.gate',b'maintenance\n'),('publication.lock',b''),('authorized_keys',b'')):(keyroot/name).write_bytes(data);(keyroot/name).chmod(0o644)
  for name in ('client','host'):r=run(['ssh-keygen','-q','-t','ed25519','-N','','-f','/fixture/'+name]);assert r.returncode==0,r.stderr
  public=Path('/fixture/client.pub').read_text().split();cls.key=('restrict,command="'+policy.COMMAND+'" '+public[0]+' '+public[1]+'\n').encode()
  Path('/fixture/known_hosts').write_text('[127.0.0.1]:2222 '+Path('/fixture/host.pub').read_text())
  r=run(['useradd','--no-create-home','--uid','11003','--user-group','--shell','/bin/sh','fixtureother']);assert r.returncode==0,r.stderr
  cls.databases={n:Path('/etc/'+n).read_bytes() for n in ('passwd','shadow','group','gshadow')}
  cls.main.write_text('Port 2222\nListenAddress 127.0.0.1\nHostKey /fixture/host\nPidFile /fixture/sshd.pid\nInclude /fixture/sshd.d/*.conf\nUsePAM yes\nPasswordAuthentication yes\nPermitRootLogin no\nSubsystem sftp internal-sftp\nAcceptEnv LANG LC_*\n')
  cls.contexts=[dict(host='fixture',addr='127.0.0.1',laddr='127.0.0.1',lport='2222'),dict(host='fixture',addr='192.0.2.8',laddr='127.0.0.1',lport='2222')]
  cls.baseline={str(i)+':fixtureother':policy.effective(cls.main,'fixtureother',c,time.monotonic()+5) for i,c in enumerate(cls.contexts)}
  cls.log=open('/fixture/sshd.log','wb');cls.daemon=sp.Popen(['/usr/sbin/sshd','-D','-e','-f',str(cls.main)],stderr=cls.log)
  deadline=time.monotonic()+5
  while time.monotonic()<deadline:
   try:
    with socket.create_connection(('127.0.0.1',2222),timeout=.1):break
   except OSError:time.sleep(.02)
  else:raise RuntimeError('fixture SSH not ready')
  def reload(d):
   expected=session.stamp(cls.daemon.pid)
   if os.readlink('/proc/'+str(expected.pid)+'/exe')!='/usr/sbin/sshd':raise RuntimeError('fixture SSH daemon drift')
   fd=os.pidfd_open(expected.pid)
   try:
    if session.stamp(expected.pid)!=expected:raise RuntimeError('fixture daemon stamp drift')
    signal=__import__('signal');signal.pidfd_send_signal(fd,signal.SIGHUP)
   finally:os.close(fd)
   time.sleep(.1)
  cls.reload=staticmethod(reload)
  body=cls.archive(b'original fixture artifact')
  cls.metadata=dict(repository=release.REPOSITORY,ref='refs/heads/main',sha='a'*40,event='push',timestamp=int(time.time()),run_number=1,run_attempt=1,deployment_id='1')
  release.publish(cls.original,cls.metadata,body,lambda hashes:all(hashlib.sha256((cls.original/'current'/n).read_bytes()).hexdigest()==h for n,h in hashes.items()))
  cls.original_snapshot=original(cls.original)
  Handler.directory_root=cls.original/'current'
  cls.http=http.server.ThreadingHTTPServer(('127.0.0.1',9122),Handler);cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True);cls.thread.start()
  cls.ctx=TrustedRootBackend(ROOT/'accounts',Path('/etc'),{'home':Path('/home/tgdeploy'),'code':Path('/usr/local/lib/tg-deploy'),'keys':keyroot,'releases':Path('/var/lib/tg-deploy'),'ssh':cls.snippet.parent},lambda:None)
  def native(command,d):
   r=run(['/usr/sbin/'+command[0],*command[1:]]);return r.returncode
  native.deadline_bound=True
  cls.accounts=AccountStage(cls.ctx,native)
  cls.changes={'home':{'kind':'dir','uid':0,'gid':0,'mode':0o755},'code':{'kind':'dir','uid':0,'gid':0,'mode':0o755},'code/ssh-bootstrap':{'kind':'file','uid':0,'gid':0,'mode':0o755,'data':policy.WRAPPER.encode()},'keys/authorized_keys':{'kind':'file','uid':0,'gid':0,'mode':0o644,'data':cls.key},'ssh/policy.conf':{'kind':'file','uid':0,'gid':0,'mode':0o644,'data':policy.render().encode()}}
  for name in ('forced_publish.py','release.py','artifact_health.py'):cls.changes['code/'+name]={'kind':'file','uid':0,'gid':0,'mode':0o644,'data':Path('/fixture/package/'+name).read_bytes()}
  cls.files=InstalledFiles(cls.ctx,ROOT/'files',cls.changes)
  cls.boot=Bootstrap(ROOT/'bootstrap',cls.original,'/var/lib/tg-deploy','a'*64)
  cls.policy=policy.PolicyStage(ROOT/'ssh',cls.main,cls.snippet,cls.contexts,['fixtureother'],cls.baseline,cls.reload);cls.policy.files=cls.files
  cls.fence=Fence(lambda:None,session.stamp(cls.daemon.pid),cls.original/'.lock',approved_key=cls.key);cls.fence.key_check=cls.files.key_identity
  class HTTPRoot:
   def preflight(s,d):artifact_health.probe(cls.original_snapshot['manifest']['hashes'],d)
   def apply(s,d):Handler.directory_root=Path('/var/lib/tg-deploy/current');artifact_health.probe(cls.original_snapshot['manifest']['hashes'],d)
   def rollback(s,d):Handler.directory_root=cls.original/'current';artifact_health.probe(cls.original_snapshot['manifest']['hashes'],d)
  class Verify:
   def preflight(s,d):pass
   def apply(s,d):
    engine=AccountEngine(cls.ctx)
    with engine.locked(databases=True):
     if not all(v[1] for v in engine.records(engine.state()).values()):raise RuntimeError('native records incomplete')
    cls.policy.check_effective(cls.main,d);artifact_health.probe(cls.original_snapshot['manifest']['hashes'],d)
   def rollback(s,d):pass
  cls.stages=dict(accounts=cls.accounts,files=cls.files,bootstrap=cls.boot,ssh=cls.policy,mounts=HTTPRoot(),verify=Verify())
  cls.engine=Lifecycle(ROOT/'lifecycle','a'*64,cls.stages,cls.fence)
 @classmethod
 def archive(cls,index):
  out=io.BytesIO()
  with zipfile.ZipFile(out,'w') as z:
   for n,data in (('index.html',index),('app.js',b'fixture js'),('style.css',b'fixture css')):z.writestr(n,data)
  return out.getvalue()
 @classmethod
 def tearDownClass(cls):
  if hasattr(cls,'http'):cls.http.shutdown();cls.http.server_close();cls.thread.join(3)
  if hasattr(cls,'daemon'):cls.daemon.terminate();cls.daemon.wait(5);cls.log.close()
 def ssh(self,data=b'!',command='tg-publish-v1',options=()):
  return run(['ssh','-F','/dev/null','-p','2222','-i','/fixture/client','-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile=/fixture/known_hosts',*options,'tgdeploy@127.0.0.1',command],input=data)
 def test_01_native_lifecycle_apply_preserves_original_and_closed_gate(self):
  if FAULT:
   child=os.fork()
   if child==0:
    try:
     def die(phase):
      if phase==FAULT:os._exit(77)
     engine=Lifecycle(ROOT/'lifecycle','a'*64,self.stages,self.fence,fault=die)
     engine.apply(time.monotonic()+60,lambda:None)
    finally:os._exit(78)
   _,status=os.waitpid(child,0);self.assertEqual(os.waitstatus_to_exitcode(status),77)
   self.assertEqual(Path('/etc/tg-deploy/admission.gate').read_bytes(),b'maintenance\n')
   return
  self.engine.apply(time.monotonic()+60,lambda:None)
  self.assertEqual(self.engine.state()['status'],'verified-closed')
  self.assertEqual(Path('/etc/tg-deploy/admission.gate').read_bytes(),b'maintenance\n')
  self.assertEqual(self.ssh().returncode,75)
  self.assertEqual(Path('/var/lib/tg-deploy/current/manifest.json').read_bytes(),(self.original/'current/manifest.json').read_bytes())
  self.assertEqual(original(self.original),self.original_snapshot)
 def test_02_fixture_only_activation_auth_invalid_frame_and_positive_publication(self):
  Path('/etc/tg-deploy/admission.gate').write_bytes(b'enabled\n')
  bad=self.ssh();self.assertEqual(bad.returncode,1,bad.stderr)
  self.assertEqual((Path('/var/lib/tg-deploy/current/manifest.json')).read_bytes(),(self.original/'current/manifest.json').read_bytes())
  meta=dict(self.metadata,sha='b'*40,run_number=2,deployment_id='2',timestamp=int(time.time()))
  r=self.ssh(ssh_upload.frame(self.archive(b'own fixture new artifact'),meta));self.assertEqual(r.returncode,0,r.stderr)
  self.assertEqual(json.loads(r.stdout)['status'],'published')
  # A real publication alters bootstrap-owned storage. Conservative recovery
  # must preserve this foreign/new release rather than delete it by filename.
  self.fence.disable(time.monotonic()+5)
  with self.assertRaises(plan.Invalid):self.boot.rollback(time.monotonic()+5)
 def test_03_unknown_same_uid_preserved(self):
  p=sp.Popen(['/usr/bin/setpriv','--reuid','11002','--regid','11002','--clear-groups','/usr/bin/sleep','10'])
  try:
   time.sleep(.1)
   with self.assertRaises(plan.Invalid):self.fence.quiesce(time.monotonic()+1)
   self.assertIsNone(p.poll())
  finally:p.terminate();p.wait(5)
 def test_04_root_cli_rejects_container_before_inputs(self):
  r=run(['python3','/fixture/console-candidate/console_cli.py','check','--input','/missing','--plan','/missing'])
  self.assertNotEqual(r.returncode,0);self.assertIn(b'container execution forbidden',r.stderr)

 def test_05_fresh_recovery_exact_native_policy_artifact_restore(self):
  engine=Lifecycle(ROOT/'lifecycle','a'*64,self.stages,self.fence)
  engine.recover(time.monotonic()+60,lambda:None)
  engine.recover(time.monotonic()+60,lambda:None)
  self.assertEqual(engine.state()['status'],'recovered-closed')
  for n,raw in self.databases.items():self.assertEqual(Path('/etc/'+n).read_bytes(),raw)
  self.assertFalse(Path('/home/tgdeploy').exists());self.assertFalse(Path('/usr/local/lib/tg-deploy').exists());self.assertFalse(Path('/var/lib/tg-deploy').exists());self.assertFalse(self.snippet.exists())
  self.assertEqual(original(self.original),self.original_snapshot)
  self.assertEqual(Path('/etc/tg-deploy/authorized_keys').read_bytes(),b'')
  for i,c in enumerate(self.contexts):self.assertEqual(policy.effective(self.main,'fixtureother',c,time.monotonic()+5),self.baseline[str(i)+':fixtureother'])

if __name__=='__main__':
 names=['test_01_native_lifecycle_apply_preserves_original_and_closed_gate']
 if SCENARIO=='positive':names+=['test_02_fixture_only_activation_auth_invalid_frame_and_positive_publication','test_03_unknown_same_uid_preserved','test_04_root_cli_rejects_container_before_inputs']
 elif SCENARIO=='recovery':names+=['test_05_fresh_recovery_exact_native_policy_artifact_restore']
 else:raise RuntimeError('unknown fixture-only scenario')
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(NativeSSH(n) for n in names))
 raise SystemExit(not result.wasSuccessful())
