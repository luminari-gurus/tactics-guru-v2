"""Bounded fixture-only Docker mount transaction; NOT an installer backend.
Trusted host harness owns Docker access. Fixture containers never receive socket.
Unknown Config/HostConfig fields are passed through and compared in full: Docker
normalization not explicitly represented here causes rejection, never omission.
"""
import copy
import fcntl
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import tempfile
import resource
import signal
import threading
import time
from contextlib import contextmanager
from urllib.parse import quote

class Rejected(RuntimeError): pass

class RecoveryRequired(Rejected):
    """Stopped-state restoration is unconfirmed; recover with a fresh deadline."""

def remaining(deadline):
    value=deadline-time.monotonic()
    if value<=0: raise Rejected('absolute deadline exceeded')
    return value

class UnixHTTP(http.client.HTTPConnection):
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout); self.sock.connect('/var/run/docker.sock')

class Docker:
    inject=None
    fail_before=None
    def request(self,method,path,payload=None,deadline=None,op=None):
        if op and self.fail_before==op: raise Rejected('injected before '+op)
        if threading.current_thread() is not threading.main_thread():
            raise Rejected('Docker deadline requires main thread')
        if any(signal.getitimer(signal.ITIMER_REAL)):
            raise Rejected('existing real timer: cannot enforce Docker deadline')
        deadline=deadline if deadline is not None else time.monotonic()+10
        budget=remaining(deadline)
        previous=signal.getsignal(signal.SIGALRM)
        def expired(signum,frame): raise Rejected('absolute Docker HTTP deadline exceeded')
        conn=None
        signal.signal(signal.SIGALRM,expired)
        try:
            signal.setitimer(signal.ITIMER_REAL,budget)
            conn=UnixHTTP('localhost',timeout=min(10,remaining(deadline)))
            conn.request(method,'/v1.47'+path,body=json.dumps(payload).encode() if payload is not None else None,headers={'Content-Type':'application/json'})
            res=conn.getresponse(); body=res.read(4*1024*1024+1)
            remaining(deadline)
            if len(body)>4*1024*1024: raise Rejected('oversized Docker response')
            if res.status==404 and method=='GET': return None
            if res.status>=300: raise Rejected('Docker HTTP '+str(res.status)+': '+body.decode(errors='replace')[:300])
            result=json.loads(body) if body else None
            if op and self.inject==op:
                self.inject=None; raise Rejected('lost response after successful '+op)
            remaining(deadline)
            return result
        finally:
            try:
                if conn is not None: conn.close()
            finally:
                signal.setitimer(signal.ITIMER_REAL,0)
                signal.signal(signal.SIGALRM,previous)
    def inspect(self,identity,deadline=None):
        return self.request('GET','/containers/'+quote(identity,safe='')+'/json',deadline=deadline)
    def operation(self,op,identity,deadline,payload=None):
        path='/containers/'+quote(identity,safe='')
        if op=='delete': return self.request('DELETE',path,deadline=deadline,op=op)
        if op=='rename': path+='/rename?name='+quote(payload,safe=''); payload=None
        else: path+='/'+op+ ('?t=1' if op in ('stop','restart') else '')
        return self.request('POST',path,payload,deadline,op)
    def create(self,name,payload,deadline):
        return self.request('POST','/containers/create?name='+quote(name,safe=''),payload,deadline,'create')

def signature(obj):
    result={k:copy.deepcopy(obj[k]) for k in ('Image','Config','HostConfig','Mounts')}
    # Docker API nullable boolean: null and false both mean OOM killing enabled.
    if result['HostConfig'].get('OomKillDisable') is None:
        result['HostConfig']['OomKillDisable']=False
    return result

def http_hash(identity,deadline):
    # Fixed loopback listener INSIDE the fixture namespace, no redirects/proxies.
    # docker exec subprocess is bounded across the entire connect/header/body read.
    if not re.fullmatch('[0-9a-f]{64}',identity): raise Rejected('non-ID health target')
    def bounded_output(): resource.setrlimit(resource.RLIMIT_FSIZE,(73728,73728))
    with tempfile.TemporaryFile() as output:
        subprocess.run(['docker','exec','-i',identity,'nc','-w','2','127.0.0.1','8080'],input=b'GET /index.html HTTP/1.1\r\nHost: fixture\r\nConnection: close\r\n\r\n',stdout=output,stderr=subprocess.PIPE,timeout=min(3,remaining(deadline)),check=True,preexec_fn=bounded_output)
        remaining(deadline)
        output.seek(0); raw=output.read(73729)
    headers,separator,body=raw.partition(b'\r\n\r\n')
    if not separator or len(headers)>8192 or len(body)>65536: raise Rejected('invalid bounded HTTP response')
    lines=headers.split(b'\r\n')
    if lines[0]!=b'HTTP/1.1 200 OK': raise Rejected('fixture HTTP status; redirects forbidden')
    fields={}
    for line in lines[1:]:
        key,sep,value=line.partition(b':')
        key=key.lower()
        if not sep or key in fields: raise Rejected('ambiguous HTTP headers')
        fields[key]=value.strip()
    length=fields.get(b'content-length',b'')
    if b'transfer-encoding' in fields or not length.isdigit() or int(length)!=len(body): raise Rejected('fixture HTTP body framing')
    return hashlib.sha256(body).hexdigest()

class Transaction:
    def __init__(self,root,api,tag,baseline,name,backup,new_source,old_hash,new_hash):
        root=Path(root).absolute()
        if not re.fullmatch(r'tg-ssh-tx-fixture-[0-9a-f]{32}',tag): raise Rejected('fixture tag')
        if not root.parts[1]=='tmp' or not root.parts[2].startswith(tag): raise Rejected('fixture journal root')
        if name!=tag+'-origin' or backup!=tag+'-backup': raise Rejected('fixture names')
        root.mkdir(mode=0o700,parents=True,exist_ok=True)
        if root.is_symlink(): raise Rejected('journal symlink')
        self.root=root; self.api=api; self.file=root/'intent.json'
        if self.file.exists():
            self.state=json.loads(self.file.read_bytes())
            if self.state['tag']!=tag or self.state['old_id']!=baseline['Id']: raise Rejected('journal identity mismatch')
        else:
            self.state={'tag':tag,'old_id':baseline['Id'],'new_id':None,'name':name,'backup':backup,'baseline':baseline,'old_hash':old_hash,'new_hash':new_hash,'create_intent':False,'intents':[]}
            old=signature(baseline); self.state['old_sig']=old
            self.validate_fixture(baseline)
            if baseline['Name']!='/'+name: raise Rejected('baseline name')
            mounts=old['HostConfig'].get('Mounts',[])
            matches=[m for m in mounts if m['Target']=='/usr/share/nginx/html']
            if len(matches)!=1 or matches[0]['Type']!='bind' or not matches[0].get('ReadOnly'): raise Rejected('readonly data bind required')
            old_source=matches[0]['Source']
            for source in (old_source,new_source):
                if not re.fullmatch(r'/var/lib/docker/volumes/'+re.escape(tag)+r'-(old|new)/_data',source): raise Rejected('only owned test volume paths')
            if old_source==new_source: raise Rejected('no source switch')
            new=copy.deepcopy(old)
            new['HostConfig']['Mounts'][mounts.index(matches[0])]['Source']=new_source
            effective=[m for m in new['Mounts'] if m['Destination']=='/usr/share/nginx/html']
            if len(effective)!=1 or effective[0]['RW']: raise Rejected('effective readonly data bind')
            effective[0]['Source']=new_source
            self.state['new_sig']=new; self.save()
    def validate_fixture(self,obj):
        if not re.fullmatch('[0-9a-f]{64}',obj['Id']): raise Rejected('ID')
        cfg=obj['Config']; host=obj['HostConfig']
        if cfg.get('Labels',{}).get('tg.fixture')!=self.state['tag']: raise Rejected('foreign fixture identity')
        if cfg['Image']!=obj['Image'] or not re.fullmatch('sha256:[0-9a-f]{64}',obj['Image']): raise Rejected('unpinned image')
        if host['Privileged'] or host['NetworkMode'] in ('host','default','bridge') or host.get('PortBindings') or not host['ReadonlyRootfs'] or host.get('CapAdd') or host.get('CapDrop')!=['ALL'] or 'no-new-privileges' not in host.get('SecurityOpt',[]): raise Rejected('unsafe fixture configuration')
        if host.get('Binds') or host.get('Devices') or host.get('VolumesFrom'): raise Rejected('unsupported fixture mounts')
        if len(obj['Mounts'])!=1: raise Rejected('only single owned data mount supported')
    def save(self):
        data=json.dumps(self.state,sort_keys=True).encode()
        fd=os.open(self.root/'intent.tmp',os.O_WRONLY|os.O_CREAT|os.O_TRUNC|os.O_NOFOLLOW,0o600)
        try:
            with os.fdopen(fd,'wb') as f: f.write(data); f.flush(); os.fsync(f.fileno())
            os.replace(self.root/'intent.tmp',self.file)
            d=os.open(self.root,os.O_RDONLY|os.O_DIRECTORY)
            try: os.fsync(d)
            finally: os.close(d)
        except Exception: raise
    @contextmanager
    def locked(self):
        fd=os.open(self.root/'lock',os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW,0o600)
        try:
            fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            self.state=json.loads(self.file.read_bytes()); yield
        finally: os.close(fd)
    def intent(self,op,identity):
        self.state['intents'].append({'operation':op,'id':identity}); self.save()
    def checked(self,identity,which,deadline):
        obj=self.api.inspect(identity,deadline)
        if obj:
            self.validate_fixture(obj)
            if signature(obj)!=self.state[which+'_sig']: raise Rejected(which+' full configuration drift')
            names=[self.state['name'],self.state['backup']] if which=='old' else [self.state['name']]
            if obj['Name'][1:] not in names: raise Rejected('unexpected name')
        return obj
    def reconcile(self,deadline):
        old=self.checked(self.state['old_id'],'old',deadline)
        if old is None: raise Rejected('original ID absent; do not recreate silently')
        new=self.checked(self.state['new_id'],'new',deadline) if self.state['new_id'] else None
        for name in (self.state['name'],self.state['backup']):
            obj=self.api.inspect(name,deadline)
            if obj is None or obj['Id']==old['Id'] or (new and obj['Id']==new['Id']): continue
            if name==self.state['name'] and self.state['create_intent'] and not self.state['new_id']:
                new=self.checked(obj['Id'],'new',deadline)
                self.state['new_id']=new['Id']; self.save()
            else: raise Rejected('foreign name collision: no effects')
        return old,new
    def mutate(self,op,obj,which,deadline,payload=None):
        self.checked(obj['Id'],which,deadline)
        self.intent(op,obj['Id'])
        try: self.api.operation(op,obj['Id'],deadline,payload)
        finally: self.reconcile(deadline)
    def health(self,obj,expected,which,deadline):
        was_running=obj['State']['Running']
        try:
            if not was_running: self.mutate('start',obj,which,deadline)
            while True:
                remaining(deadline)
                try:
                    value=http_hash(obj['Id'],deadline); break
                except (subprocess.CalledProcessError,subprocess.TimeoutExpired): time.sleep(min(.05,remaining(deadline)))
            if value!=expected: raise Rejected('HTTP artifact hash mismatch')
        finally:
            if not was_running:
                try:
                    current=self.checked(obj['Id'],which,deadline)
                    if current is None: raise Rejected('health target absent')
                    if current['State']['Running']: self.mutate('stop',current,which,deadline)
                    current=self.checked(obj['Id'],which,deadline)
                    if current is None or current['State']['Running']: raise Rejected('stopped-state restoration incomplete')
                except Exception as error:
                    raise RecoveryRequired('stopped-state restoration unconfirmed; fresh-deadline rollback required') from error
        self.checked(obj['Id'],which,deadline)
    def apply(self,deadline):
        with self.locked():
            old,new=self.reconcile(deadline)
            if new or old['Name']!='/'+self.state['name'] or old['State']['Running']!=self.state['baseline']['State']['Running']: raise Rejected('not pristine forward state')
            self.health(old,self.state['old_hash'],'old',deadline)
            old,new=self.reconcile(deadline)
            if old['State']['Running']: self.mutate('stop',old,'old',deadline)
            self.mutate('rename',old,'old',deadline,self.state['backup'])
            self.state['create_intent']=True; self.intent('create',None)
            payload=copy.deepcopy(self.state['new_sig']['Config']); payload['HostConfig']=copy.deepcopy(self.state['new_sig']['HostConfig'])
            # No fields discarded: server unsupported/normalizing changes fail readback.
            try:
                result=self.api.create(self.state['name'],payload,deadline)
                self.state['new_id']=result['Id']; self.save()
            finally: old,new=self.reconcile(deadline)
            if new is None or new['State']['Running']: raise Rejected('created state')
            self.mutate('start',new,'new',deadline)
            self.health(self.checked(new['Id'],'new',deadline),self.state['new_hash'],'new',deadline)
            self.mutate('restart',new,'new',deadline)
            current=self.checked(new['Id'],'new',deadline)
            if not current['State']['Running']: raise Rejected('restart not running')
            self.health(current,self.state['new_hash'],'new',deadline)
            self.state['applied']=True; self.save()
    def rollback(self,deadline):
        with self.locked():
            old,new=self.reconcile(deadline)
            # Preflight all identities/configs/names before any recovery effects.
            if new:
                if new['State']['Running']: self.mutate('stop',new,'new',deadline)
                self.mutate('delete',new,'new',deadline)
            old,new=self.reconcile(deadline)
            if old['Name']!='/'+self.state['name']: self.mutate('rename',old,'old',deadline,self.state['name'])
            old=self.checked(old['Id'],'old',deadline)
            desired=self.state['baseline']['State']['Running']
            if desired and not old['State']['Running']: self.mutate('start',old,'old',deadline)
            if not desired and old['State']['Running']: self.mutate('stop',old,'old',deadline)
            old=self.checked(old['Id'],'old',deadline)
            self.health(old,self.state['old_hash'],'old',deadline)
            old,new=self.reconcile(deadline)
            if new or old['Name']!='/'+self.state['name'] or old['State']['Running']!=desired: raise Rejected('restoration incomplete')
            self.state['restored']=True; self.save()
