"""Outside trusted Docker harness; inspect/remove only exact owned fixture ID."""
import hashlib
import io
import json
from pathlib import Path
import subprocess as sp
import sys
import tarfile
import uuid

ROOT=Path(__file__).absolute().parent
BASE=ROOT.parent
PUBLISHER=BASE.parent
IMAGE='sha256:3d97742a33529bb3d6a58cc8a6ba8d8fb834aa702d5cc804c78f5ddc0c161f60'

def main(actor='test_native_actor.py'):
 if actor not in ('test_native_actor.py','test_defects_actor.py'):raise RuntimeError('fixed fixture actors only')
 name='tg-console-fixture-'+uuid.uuid4().hex
 caps=('CHOWN','FOWNER','DAC_OVERRIDE','SETUID','SETGID','SYS_CHROOT','KILL','SYS_PTRACE')
 cid=sp.check_output(['docker','create','--name',name,'--label','tg.fixture='+name,'--network','none','--cap-drop','ALL',*[x for c in caps for x in ('--cap-add',c)],'--security-opt','no-new-privileges',IMAGE,'python3','/fixture/console-candidate/'+actor,*sys.argv[2:]],text=True).strip()
 evidence={'container':cid,'name':name,'image':IMAGE,'source_sha256':{},'exit_code':None,'cleaned':False}
 try:
  out=io.BytesIO()
  with tarfile.open(fileobj=out,mode='w') as tf:
   entries=[('console-candidate/'+p.name,p.read_bytes(),0o644) for p in ROOT.glob('*.py')]
   deps=('host_adapters.py','host_account_engine.py','host_backend.py','docker_mount_tx.py','offline_transaction.py','durable_files.py','session_barrier.py')
   entries.extend((n,(BASE/n).read_bytes(),0o644) for n in deps)
   entries.extend(('package/'+n,(PUBLISHER/n).read_bytes(),0o644) for n in ('forced_publish.py','release.py','artifact_health.py','ssh_upload.py'))
   entries.append(('.candidate-owned',name.encode(),0o600))
   for filename,data,mode in entries:
    t=tarfile.TarInfo(filename);t.size=len(data);t.mode=mode;tf.addfile(t,io.BytesIO(data));evidence['source_sha256'][filename]=hashlib.sha256(data).hexdigest()
  sp.run(['docker','cp','-',cid+':/fixture'],input=out.getvalue(),check=True)
  s=json.loads(sp.check_output(['docker','inspect',cid]))[0]
  assert s['Config']['Labels']['tg.fixture']==name and s['HostConfig']['NetworkMode']=='none' and not s['Mounts'] and not s['HostConfig']['Privileged'] and not s['HostConfig']['PortBindings']
  evidence['confinement']={'network':'none','mounts':[],'ports':[],'privileged':False,'capabilities':s['HostConfig']['CapAdd']}
  logfile=ROOT/(sys.argv[1] if len(sys.argv)>1 else 'native-runtime.log')
  if logfile.parent!=ROOT or logfile.suffix!='.log':raise RuntimeError('local log only')
  with logfile.open('wb') as f:sp.run(['docker','start','-a',cid],stdout=f,stderr=sp.STDOUT,timeout=180)
  s=json.loads(sp.check_output(['docker','inspect',cid]))[0];evidence['exit_code']=s['State']['ExitCode']
  evidence['log_sha256']=hashlib.sha256(logfile.read_bytes()).hexdigest()
 finally:
  r=sp.run(['docker','rm','-f',cid],capture_output=True,text=True,timeout=30)
  check=sp.run(['docker','inspect',cid],capture_output=True,text=True,timeout=30)
  evidence['cleaned']=r.returncode==0 and check.returncode!=0 and check.stderr.strip()=='Error: No such object: '+cid
  evidence['cleanup']={'remove_exit':r.returncode,'inspect_exit':check.returncode,'inspect_error':check.stderr.strip()}
  with (ROOT/'native-runtime-evidence.jsonl').open('a') as f:f.write(json.dumps(evidence,sort_keys=True)+'\n')
 print(json.dumps(evidence,sort_keys=True))
 return evidence['exit_code'] if evidence['cleaned'] else 99

if __name__=='__main__':sys.exit(main())
