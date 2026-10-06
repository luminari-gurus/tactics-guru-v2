"""Target-compatible Docker backend. Host-only CLI; no fixture production bypass.

Shares the identity/reconciliation engine, not the fixture constructor or guard.
All Config/HostConfig fields are retained; unsupported Docker normalization
fails full readback. This is a mount backend, NOT a complete SSH installer.
"""
import copy
import fcntl
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import signal
import stat
import time
from contextlib import contextmanager
from docker_mount_tx import Docker, Transaction, Rejected, RecoveryRequired, remaining, signature as raw_signature

def signature(obj):
    result=raw_signature(obj)
    # Docker constructs effective Mounts from a Go map; API response order is
    # not stable. Preserve every field, canonicalize only this unordered set.
    result['Mounts']=sorted(result['Mounts'],key=lambda m:json.dumps(m,sort_keys=True))
    return result

OLD_DATA='/root/.hermes/tactics-guru-v2-beta/signed-deploy'
CONFIG='/root/.hermes/tactics-guru-v2-beta/signed-nginx.conf'
NEW_DATA='/var/lib/tg-deploy'
DATA_TARGET='/usr/share/nginx/html'
CONFIG_TARGET='/etc/nginx/nginx.conf'

def migrated_signature(baseline, old_source, config_source, new_source, *, network='host'):
    if not re.fullmatch('[0-9a-f]{64}',baseline['Id']): raise Rejected('container ID')
    old=signature(baseline); cfg=old['Config']; host=old['HostConfig']
    if cfg['Image']!=old['Image'] or not re.fullmatch('sha256:[0-9a-f]{64}',old['Image']): raise Rejected('pinned image required')
    if host['NetworkMode']!=network or host.get('PortBindings') or host.get('Privileged'):
        raise Rejected('network/ports/privilege mismatch')
    if len(old['Mounts'])!=2: raise Rejected('exact data and config mounts required')
    for destination,source in ((DATA_TARGET,old_source),(CONFIG_TARGET,config_source)):
        mounts=[m for m in old['Mounts'] if m['Destination']==destination]
        if len(mounts)!=1 or mounts[0]['Type']!='bind' or mounts[0]['Source']!=source or mounts[0]['RW'] is not False:
            raise Rejected('effective readonly bind mismatch')
    binds=host.get('Binds') or []; mounts=host.get('Mounts') or []
    if binds and mounts: raise Rejected('ambiguous bind representations')
    new=copy.deepcopy(old)
    if binds:
        expected={old_source+':'+DATA_TARGET+':ro',config_source+':'+CONFIG_TARGET+':ro'}
        if len(binds)!=2 or set(binds)!=expected: raise Rejected('exact readonly Binds required')
        idx=binds.index(old_source+':'+DATA_TARGET+':ro')
        new['HostConfig']['Binds'][idx]=new_source+':'+DATA_TARGET+':ro'
    else:
        if len(mounts)!=2: raise Rejected('exact Mounts required')
        for destination,source in ((DATA_TARGET,old_source),(CONFIG_TARGET,config_source)):
            items=[m for m in mounts if m['Target']==destination]
            if len(items)!=1 or items[0]['Type']!='bind' or items[0]['Source']!=source or items[0].get('ReadOnly') is not True:
                raise Rejected('readonly Mounts mismatch')
        idx=next(i for i,m in enumerate(mounts) if m['Target']==DATA_TARGET)
        new['HostConfig']['Mounts'][idx]['Source']=new_source
    next(m for m in new['Mounts'] if m['Destination']==DATA_TARGET)['Source']=new_source
    if old_source==new_source: raise Rejected('no migration')
    return new

def secure_directory(path, private=False, owner=0):
    path=Path(path)
    if not path.is_absolute() or '..' in path.parts: raise Rejected('absolute canonical path required')
    for p in (path,*path.parents):
        s=p.lstat()
        if not stat.S_ISDIR(s.st_mode) or s.st_uid not in (0,owner) or s.st_mode & 0o022:
            raise Rejected('root-controlled nonsymlink directory required')
    if private and stat.S_IMODE(path.stat().st_mode)!=0o700: raise Rejected('private journal directory required')
    return path

def require_host_console():
    if os.geteuid()!=0 or Path('/.dockerenv').exists() or Path('/run/.containerenv').exists():
        raise Rejected('real host root console required; container execution forbidden')
    release=dict(line.split('=',1) for line in Path('/etc/os-release').read_text().splitlines() if '=' in line)
    if release.get('ID','').strip('"')!='ubuntu' or release.get('VERSION_ID','').strip('"')!='24.04':
        raise Rejected('Ubuntu 24.04 required')
    for namespace in ('mnt','pid','user','net'):
        if os.readlink('/proc/self/ns/'+namespace)!=os.readlink('/proc/1/ns/'+namespace):
            raise Rejected('PID1 host namespace mismatch')
    if Path('/proc/1/comm').read_text().strip()!='systemd' or not os.isatty(0):
        raise Rejected('authenticated local operator console required')
    if os.environ.get('SSH_CONNECTION') or os.environ.get('SSH_ORIGINAL_COMMAND'):
        raise Rejected('host console required, not SSH forced command')

def host_http_hash(identity, deadline):
    # Fixed direct IPv4 origin. No proxy handler or redirect processing exists.
    budget=remaining(deadline)
    if __import__('threading').current_thread() is not __import__('threading').main_thread() or any(signal.getitimer(signal.ITIMER_REAL)):
        raise Rejected('exclusive main-thread deadline required')
    previous=signal.getsignal(signal.SIGALRM)
    def expired(*args): raise Rejected('origin total deadline exceeded')
    signal.signal(signal.SIGALRM,expired)
    conn=None
    try:
        signal.setitimer(signal.ITIMER_REAL,budget)
        conn=http.client.HTTPConnection('127.0.0.1',9122,timeout=min(3,budget))
        conn.request('GET','/index.html',headers={'Host':'localhost','Connection':'close'})
        response=conn.getresponse(); body=response.read(65537)
        length=response.getheader('Content-Length')
        if response.status!=200 or len(body)>65536 or not length or not length.isdigit() or int(length)!=len(body) or response.getheader('Transfer-Encoding'):
            raise Rejected('origin status/body framing mismatch')
        remaining(deadline)
        return hashlib.sha256(body).hexdigest()
    finally:
        if conn: conn.close()
        signal.setitimer(signal.ITIMER_REAL,0); signal.signal(signal.SIGALRM,previous)

class MountTransaction(Transaction):
    """Pure transaction engine with trusted validated context and health adapter.

    The host entry point supplies host context. An explicitly separate fixture
    test module may supply isolated UUID resources, never via a CLI switch.
    """
    def __init__(self,root,api,context,health, *, journal_owner=0):
        self.journal_owner=journal_owner
        self.root=secure_directory(root,private=True,owner=journal_owner); self.api=api; self.file=self.root/'intent.json'
        self.context=copy.deepcopy(context); self.health_adapter=health
        with self.locked(read=False): self.initialize()
    def initialize(self):
        context=self.context
        baseline=context['baseline']; old=signature(baseline)
        new=migrated_signature(baseline,context['old_source'],context['config_source'],context['new_source'],network=context['network'])
        for field in ('old_hash','new_hash'):
            if not re.fullmatch('[0-9a-f]{64}',context[field]): raise Rejected('health hash')
        for field in ('name','backup'):
            if not re.fullmatch('[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}',context[field]): raise Rejected('container name')
        if context['name']==context['backup'] or baseline['Name']!='/'+context['name']: raise Rejected('bound names')
        bound=hashlib.sha256(json.dumps(context,sort_keys=True).encode()).hexdigest()
        if self.file.exists():
            self.state=self.read_state()
            if self.state.get('context_sha')!=bound: raise Rejected('saved context drift')
        else:
            self.state={'tag':bound,'context_sha':bound,'old_id':baseline['Id'],'new_id':None,'name':context['name'],'backup':context['backup'],'baseline':baseline,'old_hash':context['old_hash'],'new_hash':context['new_hash'],'create_intent':False,'intents':[],'old_sig':old,'new_sig':new}
            self.save()
        if self.state['old_sig']!=old or self.state['new_sig']!=new or self.state['baseline']!=baseline:
            raise Rejected('journal snapshot drift')
    def read_state(self):
        fd=os.open(self.file,os.O_RDONLY|os.O_NOFOLLOW)
        try:
            s=os.fstat(fd)
            if not stat.S_ISREG(s.st_mode) or s.st_uid!=self.journal_owner or s.st_nlink!=1 or stat.S_IMODE(s.st_mode)!=0o600 or s.st_size>4*1024*1024:
                raise Rejected('unsafe mount journal')
            with os.fdopen(os.dup(fd),'rb') as f: return json.load(f)
        finally: os.close(fd)
    @contextmanager
    def locked(self,read=True):
        secure_directory(self.root,private=True,owner=self.journal_owner)
        fd=os.open(self.root/'lock',os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW,0o600)
        try:
            s=os.fstat(fd)
            if not stat.S_ISREG(s.st_mode) or s.st_uid!=self.journal_owner or s.st_nlink!=1 or stat.S_IMODE(s.st_mode)!=0o600: raise Rejected('unsafe mount lock')
            fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            if read:
                self.state=self.read_state()
                if self.state.get('context_sha')!=hashlib.sha256(json.dumps(self.context,sort_keys=True).encode()).hexdigest(): raise Rejected('journal context drift')
            yield
        finally: os.close(fd)
    def preflight(self,deadline):
        with self.locked():
            old,new=self.reconcile(deadline)
            if new or old['Name']!='/'+self.state['name'] or old['State']['Running']!=self.state['baseline']['State']['Running']: raise Rejected('not pristine mount baseline')
            self.health(old,self.state['old_hash'],'old',deadline)
    def checked(self,identity,which,deadline):
        obj=self.api.inspect(identity,deadline)
        if obj:
            self.validate_fixture(obj)
            if signature(obj)!=self.state[which+'_sig']: raise Rejected(which+' full configuration drift')
            names=[self.state['name'],self.state['backup']] if which=='old' else [self.state['name']]
            if obj['Name'][1:] not in names: raise Rejected('unexpected name')
        return obj
    def validate_fixture(self,obj):
        # Engine calls this hook for EVERY inspect. Exact complete signatures,
        # including unknown fields, remain compared by checked().
        if not re.fullmatch('[0-9a-f]{64}',obj['Id']): raise Rejected('container ID')
        if obj['Image']!=self.context['baseline']['Image']: raise Rejected('image identity drift')
    def health(self,obj,expected,which,deadline):
        self.checked(obj['Id'],which,deadline)
        if not obj['State']['Running']: raise Rejected('host origin must be running for health')
        while True:
            try:
                value=self.health_adapter(obj['Id'],deadline); break
            except (ConnectionError,OSError): time.sleep(min(.05,remaining(deadline)))
        if value!=expected: raise Rejected('origin artifact hash mismatch')
        remaining(deadline); self.checked(obj['Id'],which,deadline)

def load_host_context(path,api,deadline, *, recovery=False):
    require_host_console()
    path=Path(path); secure_directory(path.parent)
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
    try:
        s=os.fstat(fd)
        if not stat.S_ISREG(s.st_mode) or s.st_uid!=0 or s.st_nlink!=1 or stat.S_IMODE(s.st_mode)!=0o600 or s.st_size>4*1024*1024: raise Rejected('root-private operator target JSON required')
        with os.fdopen(os.dup(fd),'rb') as f: context=json.load(f)
    finally: os.close(fd)
    fields={'schema','created','expires','daemon_id','baseline','name','backup','old_source','config_source','new_source','network','old_hash','new_hash','config_sha'}
    if set(context)!=fields or context['schema']!=1: raise Rejected('exact target context schema')
    if not recovery and not (context['created']<=time.time()<context['expires'] and context['expires']-context['created']<=300): raise Rejected('plan expired')
    if (context['old_source'],context['config_source'],context['new_source'],context['network'])!=(OLD_DATA,CONFIG,NEW_DATA,'host'): raise Rejected('fixed host target paths required')
    secure_directory(OLD_DATA); secure_directory(NEW_DATA); secure_directory(Path(CONFIG).parent)
    fd=os.open(CONFIG,os.O_RDONLY|os.O_NOFOLLOW)
    try:
        s=os.fstat(fd)
        if not stat.S_ISREG(s.st_mode) or s.st_uid!=0 or s.st_mode&0o022 or s.st_size>65536: raise Rejected('unsafe nginx config')
        raw=os.read(fd,65537)
    finally: os.close(fd)
    if hashlib.sha256(raw).hexdigest()!=context['config_sha'] or not re.search(rb'listen\s+127\.0\.0\.1:9122\s*;',raw): raise Rejected('bound loopback nginx config required')
    info=api.request('GET','/info',deadline=deadline)
    if info['ID']!=context['daemon_id']: raise Rejected('Docker daemon identity drift')
    migrated_signature(context['baseline'],OLD_DATA,CONFIG,NEW_DATA)
    if not context['baseline']['State']['Running']: raise Rejected('running host baseline required')
    if not recovery:
        live=api.inspect(context['baseline']['Id'],deadline)
        if live!=context['baseline']: raise Rejected('immediate full target snapshot drift')
        if api.inspect(context['backup'],deadline) is not None: raise Rejected('backup name collision')
    return context

def main():
    import argparse
    p=argparse.ArgumentParser(description='Mount-only candidate; NOT full SSH installation')
    p.add_argument('action',choices=('check','apply','rollback')); p.add_argument('--target',required=True); p.add_argument('--journal',required=True)
    args=p.parse_args(); api=Docker(); deadline=time.monotonic()+30
    context=load_host_context(args.target,api,deadline,recovery=args.action=='rollback')
    if args.action=='check': print('target compatible; mount-only check, not installer readiness'); return
    # Operator serializes Docker maintenance; this lock excludes this backend,
    # NOT unrelated Docker clients. No native lock/writer claim is made.
    tx=MountTransaction(args.journal,api,context,host_http_hash)
    if args.action=='apply': tx.apply(deadline)
    else: tx.rollback(deadline)
    print('mount '+args.action+' verified by identity/configuration/health readback')

if __name__=='__main__': main()
