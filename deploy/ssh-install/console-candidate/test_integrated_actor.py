"""Owned native actor plus serialized outside-Docker fixture transport."""
import json
import sys
from pathlib import Path
import time
import unittest
import http.client
import http.server
import threading
import test_native_actor as native
# Journal and native database locks stay on the actor filesystem.
import candidate_plan as p
from console_lifecycle import Lifecycle
from bootstrap_stage import original

# stdout is a bounded, allowlisted fixture protocol, never a production API.
def rpc(action, **data):
 print(json.dumps({'action':action, **data}), flush=True)
 line=sys.stdin.readline(8*1024*1024+1)
 if not line or len(line)>8*1024*1024:raise RuntimeError('fixture transport framing')
 result=json.loads(line)
 if set(result)!={'ok','value'} or not result['ok']:raise RuntimeError('outside fixture operation failed: '+str(result['value']))
 return result['value']

class Integrated(native.NativeSSH):
 ORIGINAL_PATH=Path('/fixture/storage/original')
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.http.shutdown();cls.http.server_close();cls.thread.join(3)
  origin=rpc('initialize',hashes=cls.original_snapshot['manifest']['hashes'])
  class Proxy(http.server.BaseHTTPRequestHandler):
   def do_GET(s):
    conn=http.client.HTTPConnection(origin,8080,timeout=3)
    try:
     conn.request('GET',s.path,headers={'Connection':'close'});response=conn.getresponse();body=response.read(65537)
     if len(body)>65536:raise RuntimeError('fixture HTTP bound')
     s.send_response(response.status);s.send_header('Content-Length',str(len(body)));s.end_headers();s.wfile.write(body)
    finally:conn.close()
   def log_message(s,*a):pass
  cls.http=http.server.ThreadingHTTPServer(('127.0.0.1',9122),Proxy);cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True);cls.thread.start()
  class Mount:
   def preflight(s,d):rpc('preflight')
   def apply(s,d):rpc('apply')
   def rollback(s,d):rpc('rollback')
  class Verify:
   def preflight(s,d):rpc('health')
   def apply(s,d):
    engine=native.AccountEngine(cls.ctx)
    with engine.locked(databases=True):
     if not all(v[1] for v in engine.records(engine.state()).values()):raise RuntimeError('native records incomplete')
    cls.policy.check_effective(cls.main,d);rpc('health')
   def rollback(s,d):pass
  cls.stages['mounts']=Mount();cls.stages['verify']=Verify()
  cls.planpath=native.ROOT/'whole-plan.json'
  cls.sources={('candidate_'+str(i)):f for i,f in enumerate(sorted(Path('/fixture/console-candidate').glob('*.py')))}
  cls.sources.update({('package_'+f.stem):f for f in Path('/fixture/package').glob('*.py')})
  cls.sources.update({'external_'+f.stem:f for f in Path('/fixture').glob('*.py')})
  cls.targets={'database_'+n:Path('/etc')/n for n in ('passwd','shadow','group','gshadow')}
  cls.targets['ssh_main']=cls.main;cls.targets['snippet']=cls.snippet
  cls.targets['authorized_keys']=Path('/etc/tg-deploy/authorized_keys')
  cls.targets['nsswitch']=Path('/etc/nsswitch.conf')
  cls.targets['gate']=Path('/etc/tg-deploy/admission.gate')
  def collect():
   return dict(repository={'commit':'a'*40,'clean':True},accounts={n:p.digest(Path('/etc',n).read_bytes()) for n in ('passwd','shadow','group','gshadow')},container=rpc('inventory'),artifacts=original(cls.original),sshd={'main':p.digest(cls.main.read_bytes()),'others':cls.baseline,'key':{'line':' '.join(Path('/fixture/client.pub').read_text().split()[:2])}},pam={n:p.digest(f.read_bytes()) for n,f in sorted((f.name,f) for f in Path('/etc/pam.d').iterdir() if f.is_file())},locks={'gate':Path('/etc/tg-deploy/admission.gate').read_text()},maintenance={'fixture':cls.uuid},boot={'fixture':cls.uuid})
  cls.collect=staticmethod(collect)
  p.prepare(cls.planpath,cls.sources,cls.targets,cls.collect)
  cls.identity=p.approval(cls.planpath)
  cls.boot=native.Bootstrap(native.ROOT/'bootstrap',cls.original,'/var/lib/tg-deploy',cls.identity);cls.stages['bootstrap']=cls.boot
  cls.engine=Lifecycle(native.ROOT/'lifecycle',cls.identity,cls.stages,cls.fence)
 @classmethod
 def activation_check(cls):
  def invariants():
   current=cls.collect();baseline=p.load(cls.planpath)['snapshot']
   # Fixture topology differs from host collector; unchanged fields are actual
   # reads. ONLY native DB transforms and stop+rename of exact old origin differ.
   if current['container']['signature']!=baseline['container']['signature'] or current['container']['running'] or current['container']['name']!=baseline['container']['name'].removesuffix('-origin')+'-backup':raise p.Invalid('fixture activation container drift')
   current['container']=baseline['container'];current['accounts']=baseline['accounts']
   return current
  return p.check_activation(cls.planpath,cls.sources,cls.targets,invariants)
 @classmethod
 def tearDownClass(cls):
  if hasattr(cls,'http'):cls.http.shutdown();cls.http.server_close();cls.thread.join(3)
  # The loopback proxy forwards only real nginx bytes on the owned internal net.
  if hasattr(cls,'daemon'):cls.daemon.terminate();cls.daemon.wait(5);cls.log.close()
 def test_combined(self):
  p.check(self.planpath,self.sources,self.targets,self.collect)
  fault=native.FAULT
  if fault and fault.startswith('lost-'):rpc('inject',operation=fault[5:]);fault=None
  def die(phase):
   if phase==fault:raise RuntimeError('fixture boundary '+phase)
  engine=Lifecycle(native.ROOT/'lifecycle',self.identity,self.stages,self.fence,fault=die)
  if native.FAULT in ('activation-intent','activation-effect'):
   from ssh_acceptance import SSHAcceptance
   import os
   class FixtureAcceptance(SSHAcceptance):
    PORT=2222
    HOST_PUBLIC=Path('/fixture/host.pub')
   engine.apply(time.monotonic()+90,lambda:p.check(self.planpath,self.sources,self.targets,self.collect))
   child=os.fork()
   if child==0:
    def abrupt(phase):
     if phase==native.FAULT:os._exit(77)
    try:
     candidate=Lifecycle(native.ROOT/'lifecycle',self.identity,self.stages,self.fence,fault=abrupt)
     candidate.activate(time.monotonic()+90,self.activation_check,FixtureAcceptance('/fixture/client',native.ROOT,Path('/fixture/client.pub').read_text()),'ACTIVATE '+self.identity)
    finally:os._exit(78)
   _,status=os.waitpid(child,0);self.assertEqual(os.waitstatus_to_exitcode(status),77)
   self.assertEqual(engine.state()['status'],'activating')
   self.assertEqual(Path('/etc/tg-deploy/admission.gate').read_bytes(),b'enabled\n' if native.FAULT=='activation-effect' else b'maintenance\n')
  elif native.FAULT and native.FAULT.startswith('activation-drift-'):
   engine.apply(time.monotonic()+90,lambda:p.check(self.planpath,self.sources,self.targets,self.collect))
   kind=native.FAULT.removeprefix('activation-drift-')
   target={'pam':Path('/etc/pam.d/sshd'),'nss':Path('/etc/nsswitch.conf'),'target':self.main}[kind]
   raw=target.read_bytes();target.write_bytes(raw+b'\n# independently reproduced postapproval drift\n' if kind!='target' else b'arbitrary target bytes\n')
   self.assertEqual(self.ssh().returncode,75) # real successful SSH/PAM auth, gate CLOSED
   with self.assertRaises(p.Invalid):p.check(self.planpath,self.sources,self.targets,self.collect)
   with self.assertRaises(p.Invalid):engine.activate(time.monotonic()+90,self.activation_check,lambda d:None,'ACTIVATE '+self.identity)
   self.assertEqual(engine.state()['status'],'verified-closed');self.assertEqual(Path('/etc/tg-deploy/admission.gate').read_bytes(),b'maintenance\n')
   target.write_bytes(raw)
  elif native.FAULT and native.FAULT.startswith('delete-'):
   import os
   engine.apply(time.monotonic()+90,lambda:p.check(self.planpath,self.sources,self.targets,self.collect))
   _,member_kind,boundary=native.FAULT.split('-')
   binding=self.boot.state()['tree'];order=sorted(binding,key=lambda n:(len(Path(n).parts),n),reverse=True)
   member='' if member_kind=='root' else next(n for n in order if binding[n]['kind']==('dir' if member_kind=='dir' else 'file'))
   child=os.fork()
   if child==0:
    def abrupt(phase):
     if phase=='bootstrap-delete-'+boundary+':'+member:os._exit(77)
    stages=dict(self.stages);stages['bootstrap']=native.Bootstrap(native.ROOT/'bootstrap',self.original,'/var/lib/tg-deploy',self.identity,fault=abrupt)
    try:Lifecycle(native.ROOT/'lifecycle',self.identity,stages,self.fence).recover(time.monotonic()+90,lambda:p.check(self.planpath,self.sources,self.targets,self.collect,recovery=True))
    finally:os._exit(78)
   _,status=os.waitpid(child,0);self.assertEqual(os.waitstatus_to_exitcode(status),77)
   self.assertEqual(self.boot.state()['state'],'deleting')
  elif native.FAULT and native.FAULT.startswith('crash-'):
   import os
   child=os.fork()
   if child==0:
    def abrupt(phase):
     if phase==native.FAULT[6:]:os._exit(77)
    try:Lifecycle(native.ROOT/'lifecycle',self.identity,self.stages,self.fence,fault=abrupt).apply(time.monotonic()+90,lambda:p.check(self.planpath,self.sources,self.targets,self.collect))
    finally:os._exit(78)
   _,status=os.waitpid(child,0);self.assertEqual(os.waitstatus_to_exitcode(status),77)
  elif native.FAULT:
   with self.assertRaises(RuntimeError) as caught:engine.apply(time.monotonic()+90,lambda:p.check(self.planpath,self.sources,self.targets,self.collect))
   if native.FAULT.startswith('lost-'):self.assertIn('lost response after successful '+native.FAULT[5:],str(caught.exception))
   else:self.assertEqual(str(caught.exception),'fixture boundary '+native.FAULT)
  else:
   engine.apply(time.monotonic()+90,lambda:p.check(self.planpath,self.sources,self.targets,self.collect))
   self.assertEqual(engine.state()['status'],'verified-closed')
   self.assertEqual(self.ssh().returncode,75)
   from ssh_acceptance import SSHAcceptance
   class FixtureAcceptance(SSHAcceptance):
    PORT=2222
    HOST_PUBLIC=Path('/fixture/host.pub')
   native_acceptance=FixtureAcceptance('/fixture/client',native.ROOT,Path('/fixture/client.pub').read_text())
   def acceptance(d):
    native_acceptance(d)
    shell=self.ssh(command='printf fixture-shell-escape');self.assertEqual(shell.returncode,64);self.assertNotIn(b'fixture-shell-escape',shell.stdout)
    subsystem=self.ssh(command='sftp',options=('-s',));self.assertEqual(subsystem.returncode,64)
    pty=self.ssh(options=('-tt',));self.assertIn(b'PTY allocation request failed',pty.stderr)
    forward=self.ssh(options=('-N','-R','0:127.0.0.1:2222','-o','ExitOnForwardFailure=yes'));self.assertEqual(forward.returncode,255);self.assertIn(b'remote port forwarding failed',forward.stderr)
    self.policy.check_effective(self.main,d);rpc('health')
   engine.activate(time.monotonic()+90,self.activation_check,acceptance,'ACTIVATE '+self.identity)
   self.assertEqual(engine.state()['status'],'activated')
   self.test_04_root_cli_rejects_container_before_inputs()
   # Own fixture key is used for actual PAM authentication and publication.
   self.test_02_fixture_only_activation_auth_invalid_frame_and_positive_publication()
   rpc('health_current',hashes=json.loads(Path('/var/lib/tg-deploy/current/manifest.json').read_bytes())['hashes'])
   self.test_03_unknown_same_uid_preserved()
   for i,c in enumerate(self.contexts):self.assertEqual(native.policy.effective(self.main,'fixtureother',c,time.monotonic()+5),self.baseline[str(i)+':fixtureother'])
   return
  for _ in range(2):
   ctx=native.TrustedRootBackend(native.ROOT/'accounts',Path('/etc'),self.ctx.targets,lambda:None)
   stages=dict(accounts=native.AccountStage(ctx,self.accounts.runner),files=native.InstalledFiles(ctx,native.ROOT/'files',self.changes),bootstrap=native.Bootstrap(native.ROOT/'bootstrap',self.original,'/var/lib/tg-deploy',self.identity),ssh=native.policy.PolicyStage(native.ROOT/'ssh',self.main,self.snippet,self.contexts,['fixtureother'],self.baseline,self.reload),mounts=type(self.stages['mounts'])(),verify=type(self.stages['verify'])())
   stages['ssh'].files=stages['files']
   fence=native.Fence(lambda:None,native.session.stamp(self.daemon.pid),self.original/'.lock',approved_key=self.key);fence.key_check=stages['files'].key_identity
   fresh=Lifecycle(native.ROOT/'lifecycle',self.identity,stages,fence)
   fresh.recover(time.monotonic()+90,lambda:p.check(self.planpath,self.sources,self.targets,self.collect,recovery=True))
  self.assertEqual(fresh.state()['status'],'recovered-closed')
  for n,raw in self.databases.items():self.assertEqual(Path('/etc/'+n).read_bytes(),raw)
  for path in ('/home/tgdeploy','/usr/local/lib/tg-deploy','/var/lib/tg-deploy'):self.assertFalse(Path(path).exists())
  self.assertFalse(self.snippet.exists());self.assertEqual(original(self.original),self.original_snapshot)
  self.assertEqual(Path('/etc/tg-deploy/admission.gate').read_bytes(),b'maintenance\n');self.assertEqual(Path('/etc/tg-deploy/authorized_keys').read_bytes(),b'')
  for i,c in enumerate(self.contexts):self.assertEqual(native.policy.effective(self.main,'fixtureother',c,time.monotonic()+5),self.baseline[str(i)+':fixtureother'])
  rpc('restored')

if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Integrated('test_combined')]))
 verification={}
 if (native.ROOT/'lifecycle/lifecycle.json').exists():verification['lifecycle']=p.decode((native.ROOT/'lifecycle/lifecycle.json').read_bytes())
 if (native.ROOT/'whole-plan.json').exists():verification['plan_sha256']=p.approval(native.ROOT/'whole-plan.json');verification['snapshot_sha256']=p.load(native.ROOT/'whole-plan.json')['snapshot_sha256']
 rpc('finished',passed=result.wasSuccessful(),tests=result.testsRun,verification=verification)
 raise SystemExit(not result.wasSuccessful())
