"""Real Docker fixtures only. No existing container inventory or host binds."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import time
import unittest
from unittest.mock import patch
import signal
import threading
import uuid
BASE = Path(__file__).parent
IMAGE = 'sha256:4a73073bd557c65b759505da037898b61f1be6cbcc3c2c3aeac22d2a470c1752'
def cli(*args, data=None):
    return subprocess.run(['docker', *args], input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=20).stdout.decode().strip()
def inspect(kind, name):
    try: return json.loads(cli(kind, 'inspect', name))[0]
    except subprocess.CalledProcessError: return None

@unittest.skipUnless(__name__=='__main__', 'real Docker fixtures require explicit direct script execution')
class RealTransactions(unittest.TestCase):
    def setUp(self):
        self.tag = 'tg-ssh-tx-fixture-' + uuid.uuid4().hex
        self.resources = {'containers': [], 'volumes': [], 'networks': []}
        self.tmp = tempfile.TemporaryDirectory(prefix=self.tag)
        self.addCleanup(self.cleanup)
        spec = importlib.util.spec_from_file_location('docker_mount_tx', BASE/'docker_mount_tx.py')
        self.assertIsNotNone(spec, 'transaction module must exist')
        self.assertTrue((BASE/'docker_mount_tx.py').exists(), 'missing identity-bound Docker transaction component')
        self.m = importlib.util.module_from_spec(spec); spec.loader.exec_module(self.m)
        self.api = self.m.Docker()
        self.net = cli('network','create','--internal','--label','tg.fixture='+self.tag,self.tag)
        self.resources['networks'].append(self.net)
        self.sources = []
        for suffix, body in [('old',b'original fixture assets\n'),('new',b'candidate fixture assets\n')]:
            name=self.tag+'-'+suffix
            cli('volume','create','--label','tg.fixture='+self.tag,name)
            self.resources['volumes'].append(name)
            self.sources.append(inspect('volume',name)['Mountpoint'])
            helper=name+'-copy'; self.resources['containers'].append(helper)
            tar=io.BytesIO()
            with tarfile.open(fileobj=tar,mode='w') as tf:
                ti=tarfile.TarInfo('index.html'); ti.size=len(body); ti.mode=0o444; tf.addfile(ti,io.BytesIO(body))
            cli('run','--pull','never','--rm','-i','--name',helper,'--label','tg.fixture='+self.tag,'--network','none','--cap-drop','ALL','--security-opt','no-new-privileges','--read-only','-v',name+':/out',IMAGE,'sh','-c','tar -xf - -C /out',data=tar.getvalue())
        self.name=self.tag+'-origin'; self.backup=self.tag+'-backup'
        self.resources['containers'] += [self.name,self.backup]
        self.old=cli('create','--name',self.name,'--label','tg.fixture='+self.tag,'--hostname','fixture-origin','--user','101:101','--network',self.net,'--cap-drop','ALL','--security-opt','no-new-privileges','--read-only','--restart','no','--mount','type=bind,src='+self.sources[0]+',dst=/usr/share/nginx/html,readonly','--tmpfs','/tmp','--entrypoint','nginx',IMAGE,'-g','daemon off;','-c','/tmp/fixture.conf')
        conf=b'events {} http { client_body_temp_path /tmp/client; proxy_temp_path /tmp/proxy; fastcgi_temp_path /tmp/fastcgi; uwsgi_temp_path /tmp/uwsgi; scgi_temp_path /tmp/scgi; access_log off; server { listen 8080; root /usr/share/nginx/html; } }\npid /tmp/nginx.pid; error_log /dev/stderr;\n'
        # Rootfs is read-only; install fixture config into writable tmpfs via start command instead.
        cli('rm',self.old)
        command='printf "%s" "'+conf.decode().replace('\n',' ')+'" > /tmp/fixture.conf; exec nginx -c /tmp/fixture.conf -g "daemon off;"'
        self.old=cli('create','--name',self.name,'--label','tg.fixture='+self.tag,'--hostname','fixture-origin','--user','101:101','--network',self.net,'--cap-drop','ALL','--security-opt','no-new-privileges','--read-only','--restart','no','--mount','type=bind,src='+self.sources[0]+',dst=/usr/share/nginx/html,readonly','--tmpfs','/tmp','--entrypoint','sh',IMAGE,'-c',command)
        cli('start',self.old)
        self.before=inspect('container',self.old)
        self.oldhash=hashlib.sha256(b'original fixture assets\n').hexdigest()
        self.newhash=hashlib.sha256(b'candidate fixture assets\n').hexdigest()
        self.tx=self.m.Transaction(Path(self.tmp.name),self.api,self.tag,self.before,self.name,self.backup,self.sources[1],self.oldhash,self.newhash)
    def cleanup(self):
        evidence={'test':self.id(),'tag':self.tag,'resources':self.resources,'journals':[],'cleanup_verified':False}
        for path in Path(self.tmp.name).rglob('intent.json'):
            evidence['journals'].append(json.loads(path.read_bytes()))
        identities={j[k] for j in evidence['journals'] for k in ('old_id','new_id') if j.get(k)}
        evidence['exact_container_ids']=sorted(identities)
        for name in list(self.resources['containers'])+sorted(identities):
            obj=inspect('container',name)
            if obj:
                self.assertEqual(obj['Config']['Labels'].get('tg.fixture'),self.tag)
                identities.add(obj['Id'])
                cli('rm','-f',obj['Id'])
                self.assertIsNone(inspect('container',obj['Id']))
        for identity in identities:
            self.assertIsNone(inspect('container',identity))
        for net in self.resources['networks']:
            cli('network','rm',net); self.assertIsNone(inspect('network',net))
        for vol in self.resources['volumes']:
            cli('volume','rm',vol); self.assertIsNone(inspect('volume',vol))
        evidence['cleanup_verified']=True
        with (BASE/'docker-runtime-evidence.jsonl').open('a') as f:
            f.write(json.dumps(evidence,sort_keys=True)+'\n')
        self.tmp.cleanup()
    def restored(self):
        self.tx.rollback(time.monotonic()+15)
        self.tx.rollback(time.monotonic()+15)
        obj=inspect('container',self.old)
        self.assertEqual(obj['Name'],'/'+self.name)
        self.assertTrue(obj['State']['Running'])
        self.assertEqual(self.m.signature(obj),self.m.signature(self.before))
        self.assertEqual(self.m.http_hash(self.old,time.monotonic()+5),self.oldhash)
    def test_switch_restart_and_repeat_rollback(self):
        self.tx.apply(time.monotonic()+15)
        self.assertEqual(self.m.http_hash(self.tx.state['new_id'],time.monotonic()+5),self.newhash)
        self.restored()
    def test_lost_forward_responses(self):
        for op in ['stop','rename','create','start','restart']:
            with self.subTest(op=op):
                self.api.inject=op
                with self.assertRaises(Exception): self.tx.apply(time.monotonic()+15)
                self.api.inject=None
                self.restored()
                self.tx=self.m.Transaction(Path(self.tmp.name)/op,self.api,self.tag,self.before,self.name,self.backup,self.sources[1],self.oldhash,self.newhash)
    def test_lost_rollback_responses(self):
        for op in ['stop','delete','rename','start']:
            with self.subTest(op=op):
                self.tx.apply(time.monotonic()+15)
                self.api.inject=op
                try: self.tx.rollback(time.monotonic()+15)
                except Exception: pass
                self.api.inject=None; self.restored()
                self.tx=self.m.Transaction(Path(self.tmp.name)/op,self.api,self.tag,self.before,self.name,self.backup,self.sources[1],self.oldhash,self.newhash)
    def test_wrong_candidate_hash_restores(self):
        self.tx.state['new_hash']='0'*64; self.tx.save()
        with self.assertRaises(Exception): self.tx.apply(time.monotonic()+15)
        self.restored()
    def test_stopped_old_is_restored_stopped(self):
        cli('stop',self.old); self.before=inspect('container',self.old)
        self.tx=self.m.Transaction(Path(self.tmp.name)/'stopped',self.api,self.tag,self.before,self.name,self.backup,self.sources[1],self.oldhash,self.newhash)
        self.tx.apply(time.monotonic()+15)
        self.fresh_stopped_recovery()
    def stopped_fixture(self):
        cli('stop',self.old); self.before=inspect('container',self.old)
        self.tx=self.m.Transaction(Path(self.tmp.name)/'stopped',self.api,self.tag,self.before,self.name,self.backup,self.sources[1],self.oldhash,self.newhash)

    def fresh_stopped_recovery(self):
        for _ in range(2):
            self.tx=self.m.Transaction(self.tx.root,self.m.Docker(),self.tag,self.before,self.name,self.backup,self.sources[1],self.oldhash,self.newhash)
            self.tx.rollback(time.monotonic()+15)
            obj=inspect('container',self.name)
            self.assertEqual(obj['Id'],self.old)
            self.assertEqual(obj['Name'],'/'+self.name)
            self.assertEqual(self.m.signature(obj),self.m.signature(self.before))
            self.assertFalse(obj['State']['Running'])
            self.tx.health(obj,self.oldhash,'old',time.monotonic()+5)
            self.assertFalse(inspect('container',self.old)['State']['Running'])

    def test_stopped_health_lost_successful_start_restores(self):
        self.stopped_fixture(); self.api.inject='start'
        with self.assertRaisesRegex(self.m.Rejected,'lost response'):
            self.tx.health(self.before,self.oldhash,'old',time.monotonic()+5)
        self.assertFalse(inspect('container',self.old)['State']['Running'])
        self.fresh_stopped_recovery()

    def test_stopped_health_expiration_requires_fresh_recovery(self):
        self.stopped_fixture()
        real_hash=self.m.http_hash
        def expire(identity,deadline):
            self.assertEqual(real_hash(identity,time.monotonic()+5),self.oldhash)
            time.sleep(max(0,deadline-time.monotonic())+.02)
            return self.oldhash
        with patch.object(self.m,'http_hash',expire):
            try:
                self.tx.health(self.before,self.oldhash,'old',time.monotonic()+1)
            except self.m.Rejected as error:
                self.assertEqual(type(error).__name__,'RecoveryRequired')
            else: self.fail('expired restoration must require recovery')
        self.assertTrue(inspect('container',self.old)['State']['Running'])
        self.fresh_stopped_recovery()

    def test_docker_total_deadline_headers_and_body(self):
        # Real owned-container Docker HTTP; delay each synchronous read phase.
        for owner,method in [(self.m.UnixHTTP,'getresponse'),(self.m.http.client.HTTPResponse,'read')]:
            original=getattr(owner,method)
            def delayed(obj,*args,**kwargs):
                time.sleep(.4)
                return original(obj,*args,**kwargs)
            with self.subTest(phase=method), patch.object(owner,method,delayed):
                started=time.monotonic()
                with self.assertRaisesRegex(self.m.Rejected,'deadline'):
                    self.api.inspect(self.old,started+.15)
                self.assertLess(time.monotonic()-started,.35)
        self.assertEqual(inspect('container',self.old)['Id'],self.old)
        self.assertEqual(self.m.signature(inspect('container',self.old)),self.m.signature(self.before))
        self.assertTrue(inspect('container',self.old)['State']['Running'])

    def test_docker_deadline_rejects_threads_and_existing_timer(self):
        errors=[]
        def worker():
            try: self.api.inspect(self.old,time.monotonic()+1)
            except self.m.Rejected as error: errors.append(str(error))
        thread=threading.Thread(target=worker); thread.start(); thread.join(2)
        self.assertFalse(thread.is_alive()); self.assertEqual(len(errors),1)
        handler=signal.getsignal(signal.SIGALRM)
        signal.setitimer(signal.ITIMER_REAL,10,2)
        try:
            with self.assertRaisesRegex(self.m.Rejected,'timer'):
                self.api.inspect(self.old,time.monotonic()+1)
            self.assertEqual(signal.getsignal(signal.SIGALRM),handler)
            delay,interval=signal.getitimer(signal.ITIMER_REAL)
            self.assertGreater(delay,8); self.assertEqual(interval,2)
        finally: signal.setitimer(signal.ITIMER_REAL,0)

    def test_foreign_name_collision_untouched(self):
        foreign=cli('create','--name',self.backup,'--label','tg.fixture='+self.tag,'--network','none','--cap-drop','ALL','--security-opt','no-new-privileges','--read-only',IMAGE)
        with self.assertRaises(Exception): self.tx.apply(time.monotonic()+15)
        self.assertEqual(inspect('container',self.backup)['Id'],foreign)
        self.assertTrue(inspect('container',self.old)['State']['Running'])
    def test_configuration_drift_fail_closed(self):
        cli('update','--restart','always',self.old)
        with self.assertRaises(Exception): self.tx.apply(time.monotonic()+15)
        with self.assertRaises(Exception): self.tx.rollback(time.monotonic()+15)
        self.assertEqual(inspect('container',self.old)['HostConfig']['RestartPolicy']['Name'],'always')
    def test_expired_deadline_fresh_recovery(self):
        self.tx.apply(time.monotonic()+15)
        with self.assertRaises(Exception): self.tx.rollback(time.monotonic()-1)
        self.restored()
    def test_absent_old_fails_closed(self):
        cli('stop',self.old); cli('rm',self.old)
        with self.assertRaises(Exception): self.tx.rollback(time.monotonic()+5)
        self.assertIsNone(inspect('container',self.name))
    def test_wrong_original_hash_rejected_before_mutation(self):
        self.tx.state['old_hash']='0'*64; self.tx.save()
        with self.assertRaises(Exception): self.tx.apply(time.monotonic()+5)
        self.assertEqual(inspect('container',self.old)['Name'],'/'+self.name)
        self.assertTrue(inspect('container',self.old)['State']['Running'])
    def test_fresh_instance_recovers_lost_create(self):
        self.api.inject='create'
        with self.assertRaises(Exception): self.tx.apply(time.monotonic()+15)
        self.tx=self.m.Transaction(Path(self.tmp.name),self.api,self.tag,self.before,self.name,self.backup,self.sources[1],self.oldhash,self.newhash)
        self.restored()
    def test_new_configuration_drift_blocks_all_recovery(self):
        self.tx.apply(time.monotonic()+15)
        cli('update','--restart','always',self.tx.state['new_id'])
        with self.assertRaises(Exception): self.tx.rollback(time.monotonic()+5)
        self.assertTrue(inspect('container',self.tx.state['new_id'])['State']['Running'])
        self.assertEqual(inspect('container',self.old)['Name'],'/'+self.backup)
    def test_health_rejects_redirect_to_matching_fixture_body(self):
        config='events {} http { client_body_temp_path /tmp/client; proxy_temp_path /tmp/proxy; fastcgi_temp_path /tmp/fastcgi; uwsgi_temp_path /tmp/uwsgi; scgi_temp_path /tmp/scgi; access_log off; server { listen 8080; location = /index.html { return 302 /canonical; } location = /canonical { alias /usr/share/nginx/html/index.html; } }} pid /tmp/nginx.pid; error_log /dev/stderr;'
        cli('exec',self.old,'sh','-c','printf "%s" "$1" > /tmp/fixture.conf; nginx -s reload -c /tmp/fixture.conf','sh',config)
        time.sleep(.1)
        with self.assertRaises(self.m.Rejected): self.m.http_hash(self.old,time.monotonic()+5)
    def test_start_failure_restores(self):
        self.api.fail_before='start'
        with self.assertRaises(Exception): self.tx.apply(time.monotonic()+15)
        self.api.fail_before=None; self.restored()

if __name__=='__main__': unittest.main(verbosity=2)
