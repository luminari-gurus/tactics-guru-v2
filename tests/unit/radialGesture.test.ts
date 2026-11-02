import { expect, it } from 'vitest';
import { DRAG_THRESHOLD, TOUCH_DRAG_THRESHOLD, dragThresholdFor } from '../../src/geometry/picking';
import {
  HOLD_MS, cardinalFromVector, classifyHoldMove, classifyHoldUp, hubContains, lightHaptic,
} from '../../src/ui/radialGesture';

it('uses 10 px for touch and 6 px for mouse/pen, with tests on both sides', () => {
  expect(dragThresholdFor('touch')).toBe(TOUCH_DRAG_THRESHOLD);
  expect(dragThresholdFor('mouse')).toBe(DRAG_THRESHOLD);
  expect(dragThresholdFor('pen')).toBe(DRAG_THRESHOLD);
  expect(dragThresholdFor(undefined)).toBe(DRAG_THRESHOLD);
  expect(classifyHoldMove({ distance: 9, threshold: 10, holdOpen: false })).toBe('pending');
  expect(classifyHoldMove({ distance: 10, threshold: 10, holdOpen: false })).toBe('pan');
  expect(classifyHoldMove({ distance: 5, threshold: 6, holdOpen: false })).toBe('pending');
  expect(classifyHoldMove({ distance: 6, threshold: 6, holdOpen: false })).toBe('pan');
  expect(classifyHoldMove({ distance: 40, threshold: 10, holdOpen: true })).toBe('aim');
});

it('opens hold after 300 ms, taps before that, and commits default if the finger never left the hub', () => {
  expect(HOLD_MS).toBe(300);
  expect(classifyHoldUp({ distance: 2, threshold: 10, holdOpen: false, reducedMotion: false, leftHub: false, inHub: true, elapsedMs: 120 })).toBe('tap');
  expect(classifyHoldUp({ distance: 12, threshold: 10, holdOpen: false, reducedMotion: false, leftHub: false, inHub: true, elapsedMs: 80 })).toBe('pan');
  expect(classifyHoldUp({ distance: 2, threshold: 10, holdOpen: true, reducedMotion: false, leftHub: false, inHub: true, elapsedMs: 320 })).toBe('commit-default');
  expect(classifyHoldUp({ distance: 2, threshold: 10, holdOpen: true, reducedMotion: false, leftHub: true, inHub: true, elapsedMs: 320 })).toBe('cancel');
  expect(classifyHoldUp({ distance: 50, threshold: 10, holdOpen: true, reducedMotion: false, leftHub: true, inHub: false, elapsedMs: 320 })).toBe('commit-slice');
  expect(classifyHoldUp({ distance: 1, threshold: 10, holdOpen: false, reducedMotion: true, leftHub: false, inHub: true, elapsedMs: 400 })).toBe('tap');
  expect(classifyHoldUp({ distance: 2, threshold: 10, holdOpen: false, reducedMotion: false, leftHub: false, inHub: true, elapsedMs: 400 })).toBe('tap');
});

it('maps the hub and cardinal slices and fails closed when vibrate is missing', () => {
  expect(hubContains(0, 0)).toBe(true);
  expect(hubContains(80, 0)).toBe(false);
  expect(cardinalFromVector(0, 0)).toBe('hub');
  expect(cardinalFromVector(0, -80)).toBe('n');
  expect(cardinalFromVector(80, 0)).toBe('e');
  expect(cardinalFromVector(0, 80)).toBe('s');
  expect(cardinalFromVector(-80, 0)).toBe('w');
  expect(() => lightHaptic(undefined)).not.toThrow();
  expect(() => lightHaptic({ vibrate: () => { throw new Error('webkit'); } })).not.toThrow();
  const calls: number[] = [];
  lightHaptic({ vibrate: (pattern) => { calls.push(pattern as number); return true; } });
  expect(calls).toEqual([10]);
});
