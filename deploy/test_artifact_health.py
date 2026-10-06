import hashlib
import http.server
import io
import json
import threading
import time
import unittest
from unittest.mock import patch
import zipfile
import release
import artifact_health as health

class Handler(http.server.BaseHTTPRequestHandler):
 data={'/':b'index','/index.html':b'index','/app.js':b'js','/_deployment.json':b'{}'}
 status=200
 delay=0
 def do_GET(self):
  time.sleep(self.delay)
  body=self.data.get(self.path,b'bad')
  self.send_response(self.status);self.send_header('Content-Length',str(len(body))); self.end_headers()
  try:self.wfile.write(body)
  except BrokenPipeError:pass
 def log_message(self,*args):pass

class ArtifactTests(unittest.TestCase):
 def setUp(self):
  self.assertIsNotNone(health,'full artifact health module missing')
  Handler.status=200;Handler.delay=0;Handler.data['/app.js']=b'js'
  self.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
  self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
  self.addCleanup(self.close)
  self.hashes={p[1:]:hashlib.sha256(b).hexdigest() for p,b in Handler.data.items() if p!='/'}
 def close(self):self.server.shutdown();self.server.server_close();self.thread.join(2)
 def probe(self,deadline=None):
  return health.probe(self.hashes,deadline or time.monotonic()+2,port=self.server.server_port)
 def test_every_artifact_and_root(self):self.probe()
 def test_non_index_drift_fails(self):
  Handler.data['/app.js']=b'corrupt'
  with self.assertRaises(health.Unhealthy):self.probe()
 def test_redirect_never_followed(self):
  Handler.status=302
  with self.assertRaises(health.Unhealthy):self.probe()
 def test_common_deadline_bounds_headers(self):
  Handler.delay=.25;started=time.monotonic()
  with self.assertRaises((health.Unhealthy,OSError)):self.probe(time.monotonic()+.05)
  self.assertLess(time.monotonic()-started,.2)
 def test_path_traversal_and_missing_marker_denied(self):
  for value in ({'../index.html':'a'*64},{'index.html':'a'*64}, {'index.html':'a'*64,'_deployment.json':'x'*64}):
   with self.assertRaises(health.Unhealthy):health.probe(value,time.monotonic()+1,port=self.server.server_port)

 def test_generated_marker_http_body_is_separately_bounded(self):
  previous=Handler.data['/_deployment.json']
  try:
   Handler.data['/_deployment.json']=b'x'*257
   self.hashes['_deployment.json']=hashlib.sha256(Handler.data['/_deployment.json']).hexdigest()
   with self.assertRaises(health.Unhealthy):self.probe()
  finally:Handler.data['/_deployment.json']=previous

class ArchiveBudgetTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  raw=io.BytesIO()
  with zipfile.ZipFile(raw,'w',compression=zipfile.ZIP_DEFLATED) as archive:
   for name in ('index.html','app.js','style.css','assets/data.json'):
    archive.writestr(name,b'x'*release.MAX_MEMBER)
  cls.body=raw.getvalue()
  cls.files=release.validate_archive(cls.body)
  cls.marker=json.dumps({'sha':'a'*40,'repository':release.REPOSITORY,'deployment_id':'9'*20},sort_keys=True).encode()
  cls.files['_deployment.json']=cls.marker
  cls.hashes={name:hashlib.sha256(data).hexdigest() for name,data in cls.files.items()}
 def responses(self,path,deadline,port):
  name=path or 'index.html'
  return self.hashes[name],len(self.files[name])
 def test_actual_accepted_maximum_archive_includes_generated_marker(self):
  self.assertLessEqual(len(self.body),release.MAX_UPLOAD)
  self.assertEqual(sum(len(data) for name,data in self.files.items() if name!='_deployment.json'),release.MAX_EXPANDED)
  with patch.object(health,'fetch',side_effect=self.responses) as fetch:
   self.assertTrue(health.probe(self.hashes,time.monotonic()+2))
  self.assertEqual({call.args[0] for call in fetch.call_args_list},{'',*self.files})
 def test_archive_budget_cannot_borrow_unused_root_allowance(self):
  hashes={**self.hashes,'extra.js':hashlib.sha256(b'x').hexdigest()}
  def response(path,deadline,port):
   if path=='extra.js':return hashes[path],1
   digest,size=self.responses(path,deadline,port)
   if path=='':size=1
   return digest,size
  with patch.object(health,'fetch',side_effect=response):
   with self.assertRaises(health.Unhealthy):health.probe(hashes,time.monotonic()+2)
 def test_generated_marker_cannot_borrow_archive_allowance(self):
  def response(path,deadline,port):
   digest,size=self.responses(path,deadline,port)
   if path in ('','index.html'):size=1
   if path=='_deployment.json':size=257
   return digest,size
  with patch.object(health,'fetch',side_effect=response):
   with self.assertRaises(health.Unhealthy):health.probe(self.hashes,time.monotonic()+2)

if __name__=='__main__':unittest.main()
