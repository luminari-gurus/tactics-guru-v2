"""Fixed loopback SSH acceptance; only operator runs this on the actual host.

The operator supplies the dedicated identity locally. Secret bytes are never
read into Python, copied, hashed into public evidence, or printed.
"""
import os
from pathlib import Path
import stat
import subprocess
import time
import candidate_plan as p
import host_policy as policy

class SSHAcceptance:
 PORT=22
 HOST_PUBLIC=Path('/etc/ssh/ssh_host_ed25519_key.pub')
 def __init__(self,key,journal,approved_public):
  self.key=Path(key);self.journal=Path(journal);self.approved_public=approved_public
 def run(self,args,d,input=b'!'):
  return subprocess.run(args,input=input,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env={'PATH':'/usr/bin:/bin','LANG':'C'},timeout=max(.001,d-time.monotonic()))
 def __call__(self,d):
  fd,name=p.parent_fd(self.key,0,Path('/'))
  try:
   leaf=os.open(name,os.O_RDONLY|os.O_NOFOLLOW,dir_fd=fd)
   try:
    s=os.fstat(leaf)
    if not stat.S_ISREG(s.st_mode) or s.st_uid!=0 or s.st_nlink!=1 or stat.S_IMODE(s.st_mode)!=0o600 or s.st_size>16384:raise p.Invalid('root-private dedicated operator acceptance key required')
   finally:os.close(leaf)
  finally:os.close(fd)
  result=self.run(['/usr/bin/ssh-keygen','-y','-f',str(self.key)],d,input=b'')
  if result.returncode or result.stdout.decode().split()[:2]!=self.approved_public.split()[:2]:raise p.Invalid('operator acceptance identity does not match plan public key')
  public=p.read(self.HOST_PUBLIC)[0].decode().split()
  if len(public)<2 or public[0]!='ssh-ed25519':raise p.Invalid('authoritative public host key required')
  known=self.journal/'acceptance-known-hosts'
  address='127.0.0.1' if self.PORT==22 else '[127.0.0.1]:'+str(self.PORT)
  raw=(address+' '+public[0]+' '+public[1]+'\n').encode()
  if known.exists():
   if p.read(known)[0]!=raw:raise p.Invalid('acceptance host public key drift')
  else:p.write_new(known,raw)
  base=['/usr/bin/ssh','-F','/dev/null','-p',str(self.PORT),'-i',str(self.key),'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+str(known)]
  def ssh(command,options=()):return self.run([*base,*options,'tgdeploy@127.0.0.1',command],d)
  positive=ssh('tg-publish-v1')
  if positive.returncode!=75:raise p.Invalid('real SSH/PAM positive closed-gate authentication failed')
  shell=ssh('printf TG_ESCAPE')
  if shell.returncode!=64 or b'TG_ESCAPE' in shell.stdout:raise p.Invalid('SSH shell negative acceptance failed')
  subsystem=ssh('sftp',('-s',))
  if subsystem.returncode!=64:raise p.Invalid('SSH subsystem negative acceptance failed')
  pty=ssh('tg-publish-v1',('-tt',))
  if b'PTY allocation request failed' not in pty.stderr:raise p.Invalid('SSH PTY negative acceptance failed')
  forwarding=ssh('tg-publish-v1',('-N','-R','0:127.0.0.1:22','-o','ExitOnForwardFailure=yes'))
  if forwarding.returncode!=255 or b'remote port forwarding failed' not in forwarding.stderr:raise p.Invalid('SSH forwarding negative acceptance failed')
  if time.monotonic()>=d:raise p.Invalid('SSH acceptance total deadline')
