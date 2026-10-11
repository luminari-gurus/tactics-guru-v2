import { describe, expect, it } from 'vitest';
import { FitMeasurements } from '../../src/diagnostics/measurements';

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

  it('samples only usable visible frames, excludes background gaps and bounds storage', () => {
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
