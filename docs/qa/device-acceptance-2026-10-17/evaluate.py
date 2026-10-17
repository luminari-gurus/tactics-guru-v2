import json,math
from urllib.parse import urlparse
out={'floatNoiseToleranceMs':1e-6,'limits':{'L1_cold_ms':2500,'L2_warm_ms':750,'L3_cold_code_bytes':400000,'L4_cold_assets_bytes':1500000,'F1_p50_ms':16.7,'F1_p95_ms':20,'F2_p95_ms':33.4},'captures':{}}
for name in ['battle','run']:
 try:r=json.load(open('/tmp/tg-device-'+name+'-perf.json'))
 except FileNotFoundError:continue
 rows=[]
 for s in r['samples']:
  d=s['diagnostics'];code=assets=0
  for i,res in enumerate(d['resources']):
   path=urlparse(res['url']).path
   if i==0 or path.endswith(('.js','.css','.html')):code+=res['transferBytes']
   else:assets+=res['transferBytes']
  vals={'usableMs':d['controlsUsableMs'],'codeBytes':code,'assetBytes':assets,'idleP50Ms':d['frames']['medianMs'],'idleP95Ms':d['frames']['p95Ms']}
  violations=[]
  for field,limit in [('usableMs',2500 if s['cache']=='cold' else 750),('idleP50Ms',16.7),('idleP95Ms',20)]:
   if vals[field] is None or vals[field]>limit+1e-6:violations.append({'metric':field,'actual':vals[field],'limit':limit})
  if s['cache']=='cold':
   for field,limit in [('codeBytes',400000),('assetBytes',1500000)]:
    if vals[field]>limit:violations.append({'metric':field,'actual':vals[field],'limit':limit})
  for i,w in enumerate(d['workloads']):
   if w['action'] in ['pan','zoom','move'] and w['frames']['p95Ms'] is not None and w['frames']['p95Ms']>33.4+1e-6:violations.append({'metric':w['action']+' p95','window':i,'actual':w['frames']['p95Ms'],'limit':33.4})
  rows.append({'profile':s['profile'],'repetition':s['repetition'],'cache':s['cache'],'values':vals,'violations':violations})
 out['captures'][name]={'build':r.get('measuredBuild'),'captureFailures':r['failures'],'rows':rows,'failedSamples':sum(bool(x['violations']) for x in rows)}
json.dump(out,open('/tmp/tg-device-gates.json','w'),indent=2)
for name,r in out['captures'].items():
 print(name,r['build'],'samples',len(r['rows']),'failed',r['failedSamples'],'captureFailures',r['captureFailures'])
 for row in r['rows']:
  if row['violations']:print(row['profile'],row['repetition'],row['cache'],row['violations'])
