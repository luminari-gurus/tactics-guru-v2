#!/usr/bin/env python3
"""Replacement console-only candidate. UNREVIEWED: not a public run-now installer.

No fixture switch, arbitrary command option, reviewer-verdict file, automatic
activation, or legacy receiver retirement exists. Production execution is owned
by the authenticated VPS operator after full-candidate independent review.
"""
import argparse
import os
from pathlib import Path
import sys
import time
# -I excludes cwd/PYTHONPATH. Only the operator-controlled code directory
# participates in imports; host source/ancestor checks still run before effects.
sys.path.insert(0,str(Path(__file__).absolute().parent))
import candidate_plan as p


def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('action',choices=('prepare','check','apply','recover','verify','activate'))
 parser.add_argument('--input',required=True,help='root-owned exact operator input JSON')
 parser.add_argument('--plan',required=True,help='root-private coherent plan path')
 parser.add_argument('--journal',help='precreated root-private transaction directory')
 parser.add_argument('--acceptance-key',help='operator-owned local dedicated key; activate only, never published')
 args=parser.parse_args()
 # Before opening inputs, Docker, accounts, SSH or privileged output paths.
 sys.path.insert(0,str(Path(__file__).absolute().parent.parent))
 from host_backend import require_host_console,Docker,secure_directory
 require_host_console()
 import host_inventory as inventory
 config=inventory.read_input(args.input)
 sources=inventory.sources(config,args.input)
 # Check all executable/installed sources and every ancestor before construction.
 p.mapping(sources,0,Path('/'))
 api=Docker();collector=inventory.HostInventory(config,api,args.input)
 planpath=Path(args.plan)
 if args.action=='prepare':
  targets=collector.targets()
  value=p.prepare(planpath,sources,targets,collector)
  print(p.encoded({'status':'prepared-not-approved','plan_sha256':p.approval(planpath),'expires':value['expires'],'gate':'CLOSED','installation_ready':False}).decode());return
 value=p.load(planpath);targets={n:Path(v['path']) for n,v in value['targets'].items()}
 if args.action=='check':
  p.check(planpath,sources,targets,collector)
  print(p.encoded({'status':'coherent-check-not-review','plan_sha256':p.approval(planpath),'installation_ready':False,'gate':'CLOSED'}).decode());return
 if not args.journal:raise p.Invalid('root-private --journal required')
 journal=secure_directory(args.journal,private=True)
 if journal==planpath.parent or journal.is_relative_to(Path(inventory.NEW)):raise p.Invalid('independent transaction journal required')
 identity=p.approval(planpath)
 if args.action in ('apply','recover','activate'):
  # Exact plan approval is console input, not an arbitrary passed:true file.
  phrase=args.action.upper()+' '+identity
  print('UNREVIEWED CANDIDATE: do not run without independent full-candidate approval.',file=sys.stderr)
  print('Exclusive native/deploy writer exclusion and closed legacy admission are explicit prerequisites.',file=sys.stderr)
  answer=input('Authenticated operator: type '+phrase+' to authorize exact bytes: ')
  if answer!=phrase:raise p.Invalid('exact operator-console approval missing')
 recovery=args.action!='apply'
 def recheck():
  inventory.maintenance(config['maintenance'])
  if args.action in ('activate','verify'):return p.check_activation(planpath,sources,targets,lambda:collector.activation(value))
  return p.check(planpath,sources,targets,collector,recovery=recovery)
 # Immediate coherent plan recheck before factory journal initialization.
 recheck()
 from host_console_backend import factory
 engine,stages=factory(journal,planpath,config,args.input,api,value)
 deadline=time.monotonic()+90
 if args.action=='apply':
  try:engine.apply(deadline,recheck)
  except BaseException:
   # Keep truthful durable intent. Recovery is separately authorized and uses
   # a fresh deadline; no automatic retry, gate enabling, or broad lock deletion.
   print('BLOCKED: admission remains CLOSED; retain plan/backups/journals for recover.',file=sys.stderr);raise
 elif args.action=='recover':engine.recover(deadline,recheck)
 elif args.action=='activate':
  if not args.acceptance_key:raise p.Invalid('operator --acceptance-key required for actual local SSH acceptance')
  from ssh_acceptance import SSHAcceptance
  acceptance=SSHAcceptance(args.acceptance_key,journal,value['snapshot']['sshd']['key']['line'])
  engine.activate(deadline,recheck,acceptance,answer)
 else:
  state=engine.state()
  if state['status']!='verified-closed':raise p.Invalid('whole lifecycle is not verified-closed')
  with engine.locked():
   with engine.fence.held(deadline):stages['verify'].apply(deadline)
 print(p.encoded({'status':engine.state()['status'],'plan_sha256':identity,'gate':'ENABLED' if engine.state()['status']=='activated' else 'CLOSED','activation':'operator-acknowledged-with-real-SSH-acceptance' if engine.state()['status']=='activated' else 'BLOCKED-pending-independent-full-review-and-SSH-acceptance','installation_ready':False}).decode())

if __name__=='__main__':
 try:main()
 except (RuntimeError,ValueError,OSError) as error:
  print('BLOCKED: '+str(error),file=sys.stderr);raise SystemExit(1)
