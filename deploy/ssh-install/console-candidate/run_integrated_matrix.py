"""Sequential owned-resource matrix; retain every failed log and receipt."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import uuid
ROOT=Path(__file__).absolute().parent

def main():
 batch=uuid.uuid4().hex
 cases=['positive']+[n+'-'+point for n in ('accounts','files','bootstrap','ssh','mounts','verify') for point in ('before','effect','durable')]+['crash-'+n+'-'+point for n in ('bootstrap','ssh','mounts') for point in ('before','effect','durable')]+['lost-'+op for op in ('stop','rename','create','start','restart')]+['activation-intent','activation-effect']
 cases+=['activation-drift-'+kind for kind in ('pam','nss','target')]+['delete-'+member+'-'+boundary for member,boundary in (('file','intent'),('file','effect'),('file','sync'),('dir','effect'),('root','effect'),('root','durable'))]
 results=[]
 for case in cases:
  logfile='matrix-'+batch+'-'+case+'.log'
  command=[sys.executable,str(ROOT/'run_integrated_candidate.py'),logfile]+([] if case=='positive' else [case])
  result=subprocess.run(command,capture_output=True,text=True,timeout=180)
  value={'case':case,'exit':result.returncode,'log':logfile,'driver_stdout':result.stdout,'driver_stderr':result.stderr}
  results.append(value)
  receipt={'schema':1,'batch':batch,'expected':len(cases),'completed':len(results),'passed':sum(r['exit']==0 for r in results),'cases':results,'installation_ready':False}
  (ROOT/('matrix-'+batch+'.json')).write_text(json.dumps(receipt,indent=2,sort_keys=True))
  print(json.dumps({'case':case,'exit':result.returncode,'completed':len(results),'expected':len(cases)}),flush=True)
 print(json.dumps({'receipt':str(ROOT/('matrix-'+batch+'.json')),'passed':receipt['passed'],'expected':len(cases)}))
 return 0 if receipt['passed']==len(cases) else 1
if __name__=='__main__':sys.exit(main())
