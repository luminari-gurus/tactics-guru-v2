"""Isolated whole-plan/native SSH/PAM + real Docker lifecycle driver.

No socket in SSH container, no production host binds, no published ports.
Only this UUID's named-volume backing paths may be bind sources.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess as sp
import sys
import tarfile
import time
import uuid
ROOT=Path(__file__).absolute().parent
BASE=ROOT.parent
sys.path.insert(0,str(BASE))
from host_backend import MountTransaction,signature
from docker_mount_tx import Docker,Rejected
from fixture_support import IMAGE,cli,inspect,archive,CONF,UBUNTU
from run_native_candidate import PUBLISHER

def main():
 tag='tg-console-integrated-'+uuid.uuid4().hex
 resources={'containers':[],'volumes':[],'networks':[]}
 evidence={'tag':tag,'sources':{},'trace':[],'passed':False,'cleanup_verified':False,'scope':'fixture whole-plan engine/native SSH/PAM/real Docker; authentic host CLI preflight remains manual'}
 root=Path('/run')/tag;root.mkdir(mode=0o700)
 logpath=ROOT/(sys.argv[1] if len(sys.argv)>1 else 'integrated.log')
 if logpath.parent!=ROOT or logpath.suffix!='.log':raise RuntimeError('local log only')
 fault=sys.argv[2] if len(sys.argv)>2 else ''
 actor=None;mounts=None
 def helper(volume,payload):
  name=tag+'-copy-'+uuid.uuid4().hex;resources['containers'].append(name)
  cli('run','--pull','never','--rm','-i','--name',name,'--label','tg.fixture='+tag,'--network','none','--cap-drop','ALL','--cap-add','CHOWN','--cap-add','FOWNER','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','-v',volume+':/out',IMAGE,'sh','-c','tar -xpf - -C /out',data=payload)
 def export(path,volume):
  data=sp.check_output(['docker','cp',actor+':'+path+'/.','-'],timeout=15)
  helper(volume,data)
 def fullhealth(cid,hashes):
  for name,expected in sorted(hashes.items()):
   if not name or name.startswith('/') or '..' in name.split('/') or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_./-' for c in name):raise RuntimeError('fixture artifact path')
   response=sp.check_output(['docker','exec','-i',cid,'nc','-w','2','127.0.0.1','8080'],input=('GET /'+name+' HTTP/1.1\r\nHost: fixture\r\nConnection: close\r\n\r\n').encode(),timeout=5)
   headers,sep,body=response.partition(b'\r\n\r\n')
   fields={}
   for line in headers.split(b'\r\n')[1:]:
    key,separator,value=line.partition(b':');key=key.lower()
    if not separator or key in fields:raise RuntimeError('ambiguous fixture HTTP header')
    fields[key]=value.strip()
   length=fields.get(b'content-length',b'')
   if len(response)>73728 or len(headers)>8192 or len(body)>65536 or b'transfer-encoding' in fields or not length.isdigit() or int(length)!=len(body):raise RuntimeError('bounded fixture HTTP framing')
   if not sep or not headers.startswith(b'HTTP/1.1 200 OK\r\n') or hashlib.sha256(body).hexdigest()!=expected:raise RuntimeError('actual nginx artifact mismatch '+name)
  return hashes['index.html']
 try:
  net=cli('network','create','--internal','--label','tg.fixture='+tag,tag);resources['networks'].append(net)
  sources=[]
  for suffix in ('old','new','config'):
   volume=tag+'-'+suffix;cli('volume','create','--label','tg.fixture='+tag,volume);resources['volumes'].append(volume);sources.append(inspect('volume',volume)['Mountpoint'])
  helper(resources['volumes'][2],archive([('nginx.conf',CONF,0o444)]))
  actorname=tag+'-ssh';resources['containers'].append(actorname)
  caps=('CHOWN','FOWNER','DAC_OVERRIDE','SETUID','SETGID','SYS_CHROOT','KILL','SYS_PTRACE')
  actor=cli('create','-i','--name',actorname,'--label','tg.fixture='+tag,'--network',net,'--mount','type=volume,src='+resources['volumes'][0]+',dst=/fixture/storage,volume-nocopy','--mount','type=volume,src='+resources['volumes'][1]+',dst=/var/lib,volume-nocopy','--cap-drop','ALL',*[x for c in caps for x in ('--cap-add',c)],'--security-opt','no-new-privileges',UBUNTU,'python3','/fixture/console-candidate/test_integrated_actor.py','positive',fault)
  resources['containers'].append(actor)
  entries=[('console-candidate/'+f.name,f.read_bytes(),0o644) for f in ROOT.glob('*.py')]
  deps=('host_adapters.py','host_account_engine.py','host_backend.py','docker_mount_tx.py','offline_transaction.py','durable_files.py','session_barrier.py')
  entries.extend((n,(BASE/n).read_bytes(),0o644) for n in deps)
  entries.extend(('package/'+n,(PUBLISHER/n).read_bytes(),0o644) for n in ('forced_publish.py','release.py','artifact_health.py','ssh_upload.py'))
  entries.append(('.candidate-owned',('tg-console-fixture-'+tag.removeprefix('tg-console-integrated-')).encode(),0o600))
  evidence['sources']={n:hashlib.sha256(data).hexdigest() for n,data,_ in entries}
  cli('cp','-',actor+':/fixture',data=archive(entries))
  obj=inspect('container',actor)
  assert len(obj['Mounts'])==2 and all(m['Type']=='volume' and m['Name'] in resources['volumes'][:2] for m in obj['Mounts']) and obj['HostConfig']['NetworkMode']==net and not obj['HostConfig']['Privileged'] and not obj['HostConfig']['PortBindings']
  class OwnedDocker(Docker):
   def inspect(s,identity,deadline=None):
    if identity not in (tag+'-origin',tag+'-backup') and (len(identity)!=64 or any(c not in '0123456789abcdef' for c in identity)):raise Rejected('owned identity syntax')
    value=super().inspect(identity,deadline)
    if value and value['Config']['Labels'].get('tg.fixture')!=tag:raise Rejected('foreign task UUID')
    return value
   def operation(s,op,identity,deadline,payload=None):
    if op not in ('stop','rename','start','restart','delete') or s.inspect(identity,deadline) is None:raise Rejected('owned operation only')
    if op=='rename' and payload not in (tag+'-origin',tag+'-backup'):raise Rejected('owned rename only')
    return super().operation(op,identity,deadline,payload)
   def create(s,name,payload,deadline):
    host=payload['HostConfig']
    if name!=tag+'-origin' or payload['Labels'].get('tg.fixture')!=tag or payload['Image']!=IMAGE or host['NetworkMode']!=net or host.get('PortBindings') or host['Privileged'] or host.get('Devices') or host.get('CapAdd'):raise Rejected('owned pinned create only')
    if set(host['Binds'])!={sources[1]+'/tg-deploy:/usr/share/nginx/html:ro',sources[2]+'/nginx.conf:/etc/nginx/nginx.conf:ro'}:raise Rejected('owned readonly sources only')
    return super().create(name,payload,deadline)
  api=OwnedDocker();hashes=None;context=None;old=None
  log=logpath.open('wb')
  proc=sp.Popen(['docker','start','-ai',actor],stdin=sp.PIPE,stdout=sp.PIPE,stderr=log)
  while True:
   line=proc.stdout.readline(8*1024*1024+1)
   if not line:break
   if len(line)>8*1024*1024:raise RuntimeError('bounded fixture protocol')
   log.write(line);log.flush()
   request=json.loads(line);action=request.pop('action');evidence['trace'].append({'action':action})
   answer={'ok':True,'value':None}
   try:
    if action=='initialize' and set(request)=={'hashes'} and mounts is None:
     hashes=request['hashes']
     name=tag+'-origin';backup=tag+'-backup';resources['containers'] += [name,backup]
     old=cli('create','--name',name,'--label','tg.fixture='+tag,'--hostname','console-origin','--user','101:101','--network',net,'--cap-drop','ALL','--security-opt','no-new-privileges','--read-only','--restart','no','-v',sources[0]+'/original:/usr/share/nginx/html:ro','-v',sources[2]+'/nginx.conf:/etc/nginx/nginx.conf:ro','--tmpfs','/tmp','--entrypoint','nginx',IMAGE,'-g','daemon off;')
     cli('start',old)
     # Both mounts serve current/, preserving publisher's release symlink.
     conf=CONF.replace(b'root /usr/share/nginx/html;',b'root /usr/share/nginx/html/current;')
     helper(resources['volumes'][2],archive([('nginx.conf',conf,0o444)]));cli('restart',old)
     context=dict(baseline=inspect('container',old),name=name,backup=backup,old_source=sources[0]+'/original',new_source=sources[1]+'/tg-deploy',config_source=sources[2]+'/nginx.conf',network=net,old_hash=hashes['index.html'],new_hash=hashes['index.html'])
     (root/'mounts').mkdir(mode=0o700)
     mounts=MountTransaction(root/'mounts',api,context,lambda cid,d:fullhealth(cid,hashes),journal_owner=os.getuid());answer['value']=name
    elif action=='inventory' and not request:answer['value']={'signature':signature(inspect('container',old)),'name':inspect('container',old)['Name'],'running':inspect('container',old)['State']['Running']}
    elif action=='preflight' and not request:mounts.preflight(time.monotonic()+40)
    elif action=='apply' and not request:
     mounts.apply(time.monotonic()+40)
    elif action=='rollback' and not request:
     mounts=MountTransaction(root/'mounts',OwnedDocker(),context,lambda cid,d:fullhealth(cid,hashes),journal_owner=os.getuid());mounts.rollback(time.monotonic()+40)
    elif action=='health' and not request:
     cid=mounts.state.get('new_id') or old;fullhealth(cid,hashes)
    elif action=='health_current' and set(request)=={'hashes'}:
     fullhealth(mounts.state['new_id'],request['hashes'])
    elif action=='inject' and set(request)=={'operation'} and request['operation'] in ('stop','rename','create','start','restart'):api.inject=request['operation']
    elif action=='restored' and not request:
     obj=inspect('container',old);assert obj['Name']=='/'+context['name'] and obj['State']['Running'] and signature(obj)==signature(context['baseline']);assert inspect('container',context['backup']) is None;fullhealth(old,hashes)
    elif action=='finished' and set(request)=={'passed','tests','verification'}:evidence['passed']=request['passed'] is True;evidence['tests']=request['tests'];evidence['verification']=request['verification']
    else:raise RuntimeError('fixture allowlist refused')
   except Exception as exc:answer={'ok':False,'value':str(exc)};evidence['trace'][-1]['error']=str(exc)
   proc.stdin.write((json.dumps(answer)+'\n').encode());proc.stdin.flush()
  proc.wait(timeout=10);log.close();evidence['exit_code']=inspect('container',actor)['State']['ExitCode']
 finally:
  if mounts and mounts.file.exists():evidence['mount_journal']=json.loads(mounts.file.read_bytes())
  ids=set()
  for name in resources['containers']:
   obj=inspect('container',name)
   if obj:
    assert obj['Config']['Labels'].get('tg.fixture')==tag
    ids.add(obj['Id']);cli('rm','-f',obj['Id']);assert inspect('container',obj['Id']) is None
  for name in resources['networks']:cli('network','rm',name);assert inspect('network',name) is None
  for name in resources['volumes']:cli('volume','rm',name);assert inspect('volume',name) is None
  evidence['cleanup_verified']=True;evidence['removed_ids']=sorted(ids)
  if logpath.exists():evidence['log_sha256']=hashlib.sha256(logpath.read_bytes()).hexdigest()
  with (ROOT/'integrated-evidence.jsonl').open('a') as f:f.write(json.dumps(evidence,sort_keys=True)+'\n')
 print(json.dumps({k:v for k,v in evidence.items() if k not in ('sources','mount_journal')},sort_keys=True))
 return 0 if evidence['passed'] and evidence['cleanup_verified'] else 1
if __name__=='__main__':sys.exit(main())
