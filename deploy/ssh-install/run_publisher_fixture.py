"""Real publisher SSH tests in a disposable package-equipped image.

No host mounts/socket, published ports, privileged mode or external network.
The pinned image must already exist; this does NOT test fresh apk installation.
"""
import io,json,subprocess,tarfile,uuid
from pathlib import Path

BASE=Path(__file__).resolve().parent.parent
IMAGE='sha256:45aa96c74290005e024ac1145cd2baeac5e4b4bccf98e7390f9c44e3c9a50f20'
FILES=('forced_publish.py','release.py','artifact_health.py','test_openssh.py','test-sshd.conf')
def run(args,**kw):
 return subprocess.run(['docker',*args],capture_output=True,check=True,timeout=120,**kw).stdout

def main():
 name='tg-packaged-publisher-'+uuid.uuid4().hex
 # Fresh test-only keys replace this image's known disposable fixture keys.
 script='rm -f /tmp/test-key /tmp/test-key.pub /etc/ssh/ssh_host_*; ssh-keygen -q -t ed25519 -N "" -f /tmp/test-key && ssh-keygen -A && printf "127.0.0.1 " > /tmp/test-known-hosts && cat /etc/ssh/ssh_host_ed25519_key.pub >> /tmp/test-known-hosts && printf \'restrict,command="/usr/local/bin/python3 -I /usr/local/lib/tg-deploy/forced_publish.py" \' > /home/tgdeploy/.ssh/authorized_keys && cat /tmp/test-key.pub >> /home/tgdeploy/.ssh/authorized_keys && chmod 644 /home/tgdeploy/.ssh/authorized_keys && cd /test && exec python3 -B -m unittest test_openssh -v'
 cid=run(['create','--name',name,'--label','tg.fixture='+name,'--network','none','--security-opt','no-new-privileges','--env','TG_SSH_INTEGRATION=1',IMAGE,'/bin/sh','-ec',script]).decode().strip()
 try:
  obj=json.loads(run(['inspect',cid]))[0]
  assert obj['Config']['Labels']['tg.fixture']==name and obj['HostConfig']['NetworkMode']=='none' and not obj['Mounts'] and not obj['HostConfig']['Privileged'] and not obj['HostConfig']['PortBindings']
  buf=io.BytesIO()
  with tarfile.open(fileobj=buf,mode='w') as tf:
   for file in FILES:
    data=(BASE/file).read_bytes()
    targets=['test/'+file]
    if file in FILES[:3]:targets.append('usr/local/lib/tg-deploy/'+file)
    if file=='test-sshd.conf':targets.append('etc/ssh/test_sshd_config')
    for target in targets:
     item=tarfile.TarInfo(target);item.size=len(data);item.mode=0o644;tf.addfile(item,io.BytesIO(data))
  run(['cp','-',cid+':/'],input=buf.getvalue())
  result=subprocess.run(['docker','start','-a',cid],capture_output=True,timeout=120)
  print((result.stdout+result.stderr).decode(),end='')
  obj=json.loads(run(['inspect',cid]))[0]
  assert obj['State']['ExitCode']==0,obj['State']
 finally:
  run(['rm','-f',cid])
  check=subprocess.run(['docker','inspect',cid],capture_output=True)
  assert check.returncode!=0 and check.stderr.decode().strip()=='Error: No such object: '+cid
  print(json.dumps({'container':cid,'cleanup_verified':True,'network':'none','mounts':[],'ports':[],'privileged':False,'scope':'packaged publisher, existing equipped image, fresh fixture keys'}))
if __name__=='__main__':main()
