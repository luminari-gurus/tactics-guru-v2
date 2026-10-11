"""Recompute #68 timing/resource comparisons from retained raw captures."""
import json, math, statistics, sys
from pathlib import Path
root=Path(sys.argv[1]); output=Path(sys.argv[2])
def read(name):return json.loads((root/name).read_text())
def pct(values,p):
    ordered=sorted(values)
    return ordered[math.ceil(len(ordered)*p)-1] if ordered else None
def frames(sample):
    d=sample['diagnostics']; usable=d['controlsUsableMs']
    startup=[dt for w in d['workloads'][:sample['workloadStartIndex']] if w['action']=='move' for t,dt in zip(w['intervalStartedMs'],w['intervalsMs']) if t+dt<usable]
    workloads={a:[dt for w in d['workloads'][sample['workloadStartIndex']:] if w['action']==a for dt in w['intervalsMs']] for a in ['pan','zoom','move']}
    workloads['startup']=startup
    return {a:pct(v,.95) for a,v in workloads.items()}
result={'method':'Per-sample nearest-rank percentiles; worst row per group. Renderer draw counts from instrumented rAF windows, excluding first 100 ms. Nominal level-0 RGBA texture bytes exclude driver/mipmap overhead.', 'timing':{},'renderer':{}}
for label in ['baseline','prototype']:
    result['timing'][label]={}
    for scene in ['battle','proof']:
        d=read(f'{label}-{scene}.json'); groups=[]
        assert len(d['samples'])==18 and not d['failures']
        for profile in ['desktop','mobile-portrait','mobile-landscape']:
            for cache in ['cold','warm']:
                samples=[s for s in d['samples'] if s['profile']==profile and s['cache']==cache]
                row={'profile':profile,'cache':cache,'usableMs':[s['diagnostics']['controlsUsableMs'] for s in samples],
                    'idleMedianMs':[s['idleDiagnostics']['frames']['medianMs'] for s in samples],
                    'idleP95Ms':[s['idleDiagnostics']['frames']['p95Ms'] for s in samples]}
                if scene=='battle':row['workloadP95Ms']=[frames(s) for s in samples]
                groups.append(row)
        result['timing'][label][scene]={'build':d['measuredBuild'],'browser':d['browserVersion'],'host':d['host'],'groups':groups}
    result['renderer'][label]={}
    for profile in ['desktop','portrait','landscape']:
        d=read(f'{label}-{profile}-profile.json'); windows={}
        for w in d['windows']:
            fs=[f for f in d['interaction']['resources']['frames'] if w['startMs']+100<f['atMs']<w['endMs'] and f['draws']>0]
            windows[w['action']]={'count':len(fs),'medianDraws':statistics.median(f['draws'] for f in fs),'medianVertices':statistics.median(f['vertices'] for f in fs)}
        ir=d['initial']; tileTextures=ir['report'].get('staticTileTextures',[])
        result['renderer'][label][profile]={'build':d['build'],'gpu':ir['resources']['gpu'],'maxTextureSize':ir['resources']['maxTextureSize'],
          'objects':ir['report']['objectCount'],'initialNominalTextureBytes':sum(t['nominalBytes'] for t in ir['resources']['textures']),
          'restartsNominalTextureBytes':[sum(t['nominalBytes'] for t in s['resources']['textures']) for s in d['restarts']],
          'staticTileTextures':tileTextures,'staticGenerationMs':ir['report'].get('staticGenerationMs'),
          'restartStaticGenerationMs':[s['report'].get('staticGenerationMs') for s in d['restarts']], 'windows':windows, 'errors':d['errors']}
output.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
