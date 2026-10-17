import { describe, expect, it } from 'vitest';
import { FitMeasurements } from '../../src/diagnostics/measurements';
import { readFileSync } from 'node:fs';
import { evaluateCapture, type Capture } from '../../scripts/measure-fit-evaluate';

describe('capture acceptance', () => {
  const receipt = (route = 'run'): Capture => JSON.parse(readFileSync(`docs/qa/device-acceptance-2026-10-17/deployed-${route}.json`,'utf8'));
  const gates = JSON.parse(readFileSync('docs/qa/device-acceptance-2026-10-17/gates.json','utf8')).captures;
  for (const route of ['battle','run']) it(`exactly reproduces retained ${route} numeric gates`, () => {
    const evaluation = evaluateCapture(receipt(route));
    expect(evaluation.captureFailures).toEqual([]);
    expect(evaluation.rows).toEqual(gates[route].rows);
    expect(evaluation.failedSamples).toBe(route === 'battle' ? 9 : 10);
    expect(evaluation.passed).toBe(false);
  });
  const invalid: [string,(c: Capture) => void][] = [
    ['missing sample',c => {c.samples.pop();}],
    ['duplicate sample',c => {c.samples[1]=structuredClone(c.samples[0]);}],
    ['dirty build',c => {c.samples.forEach(s => {s.diagnostics.build.dirty=true;});}],
    ['mixed build',c => {c.samples[0].diagnostics.build.commit='a'.repeat(40);}],
    ['idle build mismatch',c => {c.samples[0].idleDiagnostics.build.commit='a'.repeat(40);}],
    ['browser error',c => {c.samples[0].errors.push('error');}],
    ['collector failure',c => {c.failures.push('timeout');}],
    ['partial capture',c => {c.failedCapture={profile:'desktop'};}],
    ['missing timing',c => {c.samples[0].diagnostics.controlsUsableMs=null;}],
    ['invalid timing',c => {c.samples[0].diagnostics.controlsUsableMs=NaN;}],
    ['missing workload',c => {c.samples[0].diagnostics.workloads=c.samples[0].diagnostics.workloads.filter(w=>w.action!=='zoom');}],
    ['empty workload',c => {c.samples[0].diagnostics.workloads[0].intervalsMs=[];}],
    ['missing raw idle',c => {c.samples[0].diagnostics.idleIntervalsMs=[];}],
    ['fabricated summary',c => {c.samples[0].diagnostics.frames.medianMs=1;}],
    ['invalid bytes',c => {c.samples[0].diagnostics.resources[0].transferBytes=-1;}],
    ['missing navigation',c => {c.samples[0].diagnostics.resources.shift();}],
    ['wrong method',c => {c.samples[0].diagnostics.measurementMethod.version=2;}],
  ];
  for (const [name,mutate] of invalid) it(`rejects ${name} instead of claiming acceptance`, () => {
    const data=receipt();mutate(data);
    const evaluated=evaluateCapture(data);
    expect(evaluated.captureFailures.length).toBeGreaterThan(0);
    expect(evaluated.passed).toBe(false);
  });
  it('rejects malformed JSON shapes and preserves the historical near-60Hz failure', () => {
    expect(evaluateCapture(null as unknown as Capture).passed).toBe(false);
    expect(evaluateCapture({} as Capture).passed).toBe(false);
    const row=evaluateCapture(receipt()).rows.at(-1)!;
    expect(row.violations).toContainEqual({metric:'idleP50Ms',actual:16.799999952316284,limit:16.7});
  });
  it('accepts a complete valid matrix and fails a single numeric regression', () => {
    const data=receipt();
    for (const sample of data.samples) {
      for (const d of [sample.idleDiagnostics,sample.diagnostics]) {
        d.controlsUsableMs=600;
        d.idleIntervalsMs=d.idleIntervalsMs.map(()=>16.7);
        d.frames={count:d.idleIntervalsMs.length,medianMs:16.7,p95Ms:16.7,maxMs:16.7};
      }
      for (const [index,r] of sample.diagnostics.resources.entries()) if (index===0 || /\.(js|css)$/.test(new URL(r.url).pathname)) r.transferBytes=300;
    }
    expect(evaluateCapture(data).passed).toBe(true);
    const d=data.samples[0].diagnostics;
    d.idleIntervalsMs=d.idleIntervalsMs.map(()=>16.70001);
    d.frames={count:d.idleIntervalsMs.length,medianMs:16.70001,p95Ms:16.70001,maxMs:16.70001};
    const result=evaluateCapture(data);
    expect(result.captureFailures).toEqual([]);
    expect(result.failedSamples).toBe(1);
    expect(result.passed).toBe(false);
  });
});

describe('proof measurements', () => {
  it('keeps navigation-relative scene and controls timing separate, and resets on restart', () => {
    const measurements = new FitMeasurements();
    measurements.begin(20);
    measurements.sceneReady(40);
    expect(measurements.snapshot()).toMatchObject({ run: 1, navigationStartMs: 0, sceneStartedMs: 20, sceneReadyMs: 40, controlsUsableMs: null });
    measurements.controlsUsable(55);
    expect(measurements.snapshot().controlsUsableMs).toBe(55);
    measurements.begin(100);
    expect(measurements.snapshot()).toMatchObject({ run: 2, sceneStartedMs: 100, sceneReadyMs: null, controlsUsableMs: null, frames: { count: 0 } });
  });

  it('samples only usable visible idle frames, excludes background gaps and bounds storage', () => {
    const measurements = new FitMeasurements(3);
    measurements.begin(0);
    measurements.frame(10, true);
    measurements.sceneReady(15);
    measurements.controlsUsable(20);
    measurements.frame(20, true);
    measurements.frame(30, true);
    measurements.frame(40, false);
    measurements.frame(1000, true);
    measurements.frame(1020, true);
    expect(measurements.snapshot().frames).toEqual({ count: 2, medianMs: 10, p95Ms: 20, maxMs: 20 });
    measurements.frame(1050, true);
    measurements.frame(1090, true);
    expect(measurements.snapshot().frames).toEqual({ count: 3, medianMs: 20, p95Ms: 30, maxMs: 30 });
  });

  it('returns isolated snapshots rather than exposing measurement state', () => {
    const measurements = new FitMeasurements();
    measurements.begin(0);
    const snapshot = measurements.snapshot();
    snapshot.sceneStartedMs = 999;
    snapshot.frames.count = 999;
    expect(measurements.snapshot()).toMatchObject({ sceneStartedMs: 0, frames: { count: 0, medianMs: null } });
  });
});

it('keeps idle and action windows independent and records first rendered response', () => {
  const m = new FitMeasurements(3);
  m.begin(0); m.controlsUsable(10);
  m.frame(10, true); m.frame(20, true);
  m.interaction('pan', 21); m.interaction('pan', 22);
  m.rendered(25, true);
  m.frame(30, true); m.frame(40, true);
  const snapshot = m.snapshot();
  expect(snapshot.frames.count).toBe(1);
  expect(snapshot.workloads[0]).toMatchObject({action:'pan', startedMs:21, frames:{count:2}});
  expect(snapshot.interactions).toEqual([
    {action:'pan', inputMs:21, renderedMs:25, responseMs:4, renderedFrames:1},
    {action:'pan', inputMs:22, renderedMs:25, responseMs:3, renderedFrames:1},
  ]);
  m.frame(400, true); m.frame(410, true);
  expect(m.snapshot().frames.count).toBe(2);
});
it('drops hidden pending input and resets bounded workload data on restart', () => {
  const m = new FitMeasurements(2);
  m.begin(0); m.controlsUsable(1); m.frame(10,true);
  m.interaction('selection', 11); m.rendered(12,false); m.frame(12,false);
  m.rendered(1000,true); m.frame(1000,true); m.frame(1010,true);
  expect(m.snapshot().interactions).toEqual([]);
  m.workload('move', 1020); m.frame(1030,true); m.frame(1040,true); m.frame(1050,true);
  expect(m.snapshot().workloads.find(w=>w.action==='move')!.frames.count).toBe(2);
  m.begin(2000);
  expect(m.snapshot()).toMatchObject({interactions:[],workloads:[],frames:{count:0}});
});

it('exports bounded raw idle intervals with exact summary and isolated snapshots', () => {
  const m = new FitMeasurements(3);
  m.begin(0); m.controlsUsable(1);
  for (const time of [10,20,40,70,110]) m.frame(time,true);
  const snapshot=m.snapshot();
  expect(snapshot.idleIntervalsMs).toEqual([10,20,30]);
  expect(snapshot.frames).toEqual({count:3,medianMs:20,p95Ms:30,maxMs:30});
  snapshot.idleIntervalsMs[0]=999;
  expect(m.snapshot().idleIntervalsMs).toEqual([10,20,30]);
  m.begin(200);
  expect(m.snapshot().idleIntervalsMs).toEqual([]);
});


it('samples startup movement before controls usability without admitting idle or input', () => {
  const m = new FitMeasurements();
  m.begin(0); m.sceneReady(10); m.frame(10, true, false);
  m.workload('move', 11); m.interaction('pan', 12);
  m.frame(20, true, false); m.frame(40, true, false);
  expect(m.snapshot().workloads[0]).toMatchObject({
    action: 'move', intervalsMs: [10,20], intervalStartedMs: [10,20],
    frames: {count: 2, p95Ms: 20},
  });
  expect(m.snapshot()).toMatchObject({controlsUsableMs: null, idleIntervalsMs: [], interactions: []});
  m.frame(45, false, false); m.frame(1000, true, false); m.frame(1010, true, true);
  expect(m.snapshot().idleIntervalsMs).toEqual([]);
  expect(m.snapshot().workloads[0].intervalsMs).toEqual([10,20]);
  m.controlsUsable(1015); m.frame(1020, true); m.frame(1030, true);
  expect(m.snapshot().idleIntervalsMs).toEqual([10]);
  const snapshot = m.snapshot(); snapshot.workloads[0].intervalStartedMs[0] = 999;
  expect(m.snapshot().workloads[0].intervalStartedMs[0]).toBe(10);
  m.begin(2000); expect(m.snapshot().workloads).toEqual([]);
});
