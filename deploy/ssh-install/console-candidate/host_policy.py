"""Native SSH candidate validation and fixed reload integration.

Host factory provides only /usr/bin/systemctl reload ssh; isolated actors provide
an independently owned PID-bound SIGHUP adapter, never a host CLI bypass.
"""
import glob
import os
from pathlib import Path
import re
import shlex
import subprocess
import time
import candidate_plan as p

COMMAND='/usr/local/lib/tg-deploy/ssh-bootstrap'
WRAPPER='''#!/bin/sh
[ "${SSH_ORIGINAL_COMMAND-}" = tg-publish-v1 ] || exit 64
exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C.UTF-8 LC_CTYPE=C.UTF-8 SSH_ORIGINAL_COMMAND=tg-publish-v1 /usr/bin/python3 -I /usr/local/lib/tg-deploy/forced_publish.py
'''
EXPECTED={'usepam':'yes','authenticationmethods':'publickey','pubkeyauthentication':'yes','passwordauthentication':'no','kbdinteractiveauthentication':'no','forcecommand':COMMAND,'disableforwarding':'yes','allowagentforwarding':'no','allowtcpforwarding':'no','allowstreamlocalforwarding':'no','x11forwarding':'no','permittunnel':'no','permittty':'no','permituserrc':'no','permituserenvironment':'no','authorizedkeysfile':'/etc/tg-deploy/authorized_keys','authorizedkeyscommand':'none','authorizedprincipalsfile':'none','trustedusercakeys':'none'}

def render():
 return '''Match User tgdeploy
    AuthenticationMethods publickey
    PubkeyAuthentication yes
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    ForceCommand /usr/local/lib/tg-deploy/ssh-bootstrap
    DisableForwarding yes
    AllowAgentForwarding no
    AllowTcpForwarding no
    AllowStreamLocalForwarding no
    X11Forwarding no
    PermitTunnel no
    PermitTTY no
    PermitUserRC no
    AuthorizedKeysFile /etc/tg-deploy/authorized_keys
    AuthorizedKeysCommand none
    AuthorizedPrincipalsFile none
'''

def run(argv,deadline):
 if time.monotonic()>=deadline:raise p.Invalid('native SSH deadline')
 r=subprocess.run(argv,stdin=subprocess.DEVNULL,capture_output=True,env={'PATH':'/usr/sbin:/usr/bin:/sbin:/bin','LANG':'C'},timeout=max(.001,deadline-time.monotonic()))
 if r.returncode:raise p.Invalid('native SSH validation/reload failed: '+r.stderr.decode(errors='replace')[:512])
 if len(r.stdout)>1024*1024:raise p.Invalid('native SSH output limit')
 return r.stdout

def contexts(values):
 if not isinstance(values,list) or not 1<=len(values)<=32:raise p.Invalid('actual SSH connection contexts required')
 result=[]
 for c in values:
  if not isinstance(c,dict) or set(c)!={'host','addr','laddr','lport'}:raise p.Invalid('SSH context schema')
  if any(not isinstance(v,str) or not re.fullmatch('[A-Za-z0-9_.:%-]{1,255}',v) for v in c.values()) or not c['lport'].isdecimal() or not 0<int(c['lport'])<=65535:raise p.Invalid('SSH context token')
  result.append(dict(c))
 return result

def effective(main,user,c,deadline):
 if not re.fullmatch('[A-Za-z_][A-Za-z0-9_-]{0,31}',user):raise p.Invalid('canonical native account name')
 out=run(['/usr/sbin/sshd','-T','-f',str(main),'-C',','.join(['user='+user,*[k+'='+c[k] for k in ('host','addr','laddr','lport')]])],deadline)
 return dict(line.split(' ',1) for line in out.decode().splitlines())

def validate(values):
 if any(values.get(k)!=v for k,v in EXPECTED.items()):raise p.Invalid('restricted SSH effective policy mismatch')
 env=values.get('acceptenv','').split()
 if len(env)!=len(set(env)) or len(env)>2 or any(x not in ('LANG','LC_*') for x in env):raise p.Invalid('unsafe inherited AcceptEnv; global relaxation forbidden')

def includes(main,*,owner=0,boundary=Path('/')):
 files={};patterns={};active=set()
 def visit(path):
  path=Path(path)
  if path in active:raise p.Invalid('recursive SSH Include cycle')
  if len(files)>128:raise p.Invalid('SSH include bound')
  raw,desc=p.read(path,owner=owner,boundary=boundary);files[str(path)]={'file':desc,'raw_sha256':p.digest(raw)};active.add(path)
  for line in raw.decode().splitlines():
   words=shlex.split(line,comments=True)
   if not words or words[0].lower()!='include':continue
   if len(words)<2:raise p.Invalid('empty SSH Include')
   for token in words[1:]:
    pattern=token if token.startswith('/') else '/etc/ssh/'+token
    if '..' in Path(pattern).parts or '\\' in pattern:raise p.Invalid('SSH include pattern')
    matches=sorted(glob.glob(pattern));patterns[pattern]=matches
    for child in matches:visit(child)
  active.remove(path)
 visit(main);return {'files':files,'patterns':patterns}

def pam_inventory(main='/etc/pam.d/sshd',*,owner=0,boundary=Path('/')):
 files={};active=set()
 def visit(path):
  path=Path(path)
  if path in active:raise p.Invalid('PAM include cycle')
  if len(files)>128:raise p.Invalid('PAM include bound')
  raw,meta=p.read(path,owner=owner,boundary=boundary);files[str(path)]=meta;active.add(path)
  for line in raw.decode().splitlines():
   words=shlex.split(line,comments=True)
   if not words:continue
   service=None
   if words[0]=='@include' and len(words)==2:service=words[1]
   elif len(words)>=3 and words[1] in ('include','substack'):service=words[2]
   if service:
    if not re.fullmatch('[A-Za-z0-9_-]{1,80}',service):raise p.Invalid('PAM include service')
    visit(path.parent/service)
  active.remove(path)
 visit(main);return files

class PolicyStage:
 def __init__(self,journal,main,snippet,connections,users,baseline,reloader,*,owner=0,boundary=Path('/')):
  self.journal=Path(journal);self.main=Path(main);self.snippet=Path(snippet);self.connections=contexts(connections);self.users=users;self.baseline=baseline;self.reloader=reloader;self.owner=owner;self.boundary=Path(boundary)
  self.candidate=None;self.files=None
 def candidate_main(self):
  inv=includes(self.main,owner=self.owner,boundary=self.boundary)
  patterns=inv['patterns']
  if not any(str(self.snippet) in glob.glob(pattern) or __import__('fnmatch').fnmatch(str(self.snippet),pattern) for pattern in patterns):raise p.Invalid('owned snippet not admitted by existing Include; no global rewrite')
  root=self.journal/'ssh-candidate';root.mkdir(mode=0o700)
  originals={Path(n):root/('config-'+str(i)) for i,n in enumerate(inv['files'])}
  originals[self.snippet]=root/'owned-policy'
  p.write_new(originals[self.snippet],render().encode())
  for source,target in originals.items():
   if source==self.snippet:continue
   raw=p.read(source,owner=self.owner,boundary=self.boundary)[0];lines=[]
   for line in raw.decode().splitlines():
    words=shlex.split(line,comments=True)
    if not words or words[0].lower()!='include':lines.append(line);continue
    selected=[]
    for token in words[1:]:
     pattern=token if token.startswith('/') else '/etc/ssh/'+token
     children=sorted(set(glob.glob(pattern))|({str(self.snippet)} if __import__('fnmatch').fnmatch(str(self.snippet),pattern) else set()))
     selected.extend(str(originals[Path(n)]) for n in children)
    if selected:lines.append('Include '+ ' '.join(selected))
   p.write_new(target,('\n'.join(lines)+'\n').encode())
  return originals[self.main]
 def check_effective(self,main,deadline):
  run(['/usr/sbin/sshd','-t','-f',str(main)],deadline)
  for i,c in enumerate(self.connections):
   validate(effective(main,'tgdeploy',c,deadline))
   for user in self.users:
    if effective(main,user,c,deadline)!=self.baseline[str(i)+':'+user]:raise p.Invalid('unrelated user effective SSH policy changed')
 def preflight(self,deadline):
  if self.snippet.exists() or self.snippet.is_symlink():raise p.Invalid('new owned SSH snippet must be absent')
  self.candidate=self.candidate_main();self.check_effective(self.candidate,deadline)
 def apply(self,deadline):
  raw,meta=p.read(self.snippet,owner=self.owner,boundary=self.boundary)
  if raw!=render().encode() or meta['mode']!=0o644:raise p.Invalid('installed SSH snippet bytes/mode')
  self.check_effective(self.main,deadline);self.reloader(deadline);self.check_effective(self.main,deadline)
 def rollback(self,deadline):
  raw,meta=p.read(self.snippet,owner=self.owner,boundary=self.boundary,missing=True)
  if raw is not None:
   if raw!=render().encode() or meta['mode']!=0o644:raise p.Invalid('SSH snippet foreign drift; preserve')
   if self.files is None:raise p.Invalid('installed-files ownership journal required; preserve snippet')
   self.files.remove_policy()
  run(['/usr/sbin/sshd','-t','-f',str(self.main)],deadline);self.reloader(deadline)
  for i,c in enumerate(self.connections):
   for user in self.users:
    if effective(self.main,user,c,deadline)!=self.baseline[str(i)+':'+user]:raise p.Invalid('restored unrelated SSH policy mismatch')

def reload_host(deadline):
 # No command/argv/operator configuration is accepted for service operations.
 run(['/usr/bin/systemctl','reload','ssh'],deadline)
