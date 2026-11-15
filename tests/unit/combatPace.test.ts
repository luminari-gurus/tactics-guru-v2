import { describe, expect, it, vi } from 'vitest';
import { combatPresentationTiming, type CombatPresentation } from '../../src/phaser/combatPace';

const normalCases: readonly { presentation: CombatPresentation; durationMs: number }[] = [
  { presentation: { kind: 'move', steps: 0, hasFeedback: false }, durationMs: 70 },
  { presentation: { kind: 'move', steps: 1, hasFeedback: false }, durationMs: 70 },
  { presentation: { kind: 'move', steps: 4, hasFeedback: false }, durationMs: 280 },
  { presentation: { kind: 'signature', hasFeedback: true }, durationMs: 560 },
  { presentation: { kind: 'feedback', hasFeedback: true }, durationMs: 180 },
  { presentation: { kind: 'turn', hasFeedback: false }, durationMs: 25 },
];

describe('combat presentation pace', () => {
  it('preserves every existing Normal timing, including the minimum move duration', () => {
    for (const { presentation, durationMs } of normalCases) {
      expect(combatPresentationTiming(presentation, 'normal', false)).toEqual({
        kind: presentation.kind, pace: 'normal', reducedMotion: false, durationMs,
      });
    }
  });

  it('makes Fast exactly twice as quick without rounding short transitions', () => {
    for (const { presentation, durationMs } of normalCases) {
      expect(combatPresentationTiming(presentation, 'fast', false)).toEqual({
        kind: presentation.kind, pace: 'fast', reducedMotion: false, durationMs: durationMs / 2,
      });
    }
  });

  it('retains a bounded stationary feedback hold in reduced motion at either pace', () => {
    for (const kind of ['move', 'signature', 'feedback', 'turn'] as const) {
      const presentation = { kind, steps: 100, hasFeedback: true };
      expect(combatPresentationTiming(presentation, 'normal', true)).toEqual({
        kind, pace: 'normal', reducedMotion: true, durationMs: 180,
      });
      expect(combatPresentationTiming(presentation, 'fast', true)).toEqual({
        kind, pace: 'fast', reducedMotion: true, durationMs: 90,
      });
    }
  });

  it('snaps reduced-motion actions without feedback after the short transition, independent of path length or kind', () => {
    for (const kind of ['move', 'signature', 'feedback', 'turn'] as const) {
      const presentation = { kind, steps: 100, hasFeedback: false };
      expect(combatPresentationTiming(presentation, 'normal', true).durationMs).toBe(25);
      expect(combatPresentationTiming(presentation, 'fast', true).durationMs).toBe(12.5);
    }
  });

  it('does not mutate inputs, use entropy or a clock, or change an earlier timing snapshot', () => {
    const presentation = Object.freeze({ kind: 'move', steps: 3, hasFeedback: false } as const);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('clock'); });
    try {
      const first = combatPresentationTiming(presentation, 'normal', false);
      expect(combatPresentationTiming(presentation, 'fast', true)).toEqual({
        kind: 'move', pace: 'fast', reducedMotion: true, durationMs: 12.5,
      });
      expect(first).toEqual({ kind: 'move', pace: 'normal', reducedMotion: false, durationMs: 210 });
      expect(combatPresentationTiming(presentation, 'normal', false)).toEqual(first);
      expect(presentation).toEqual({ kind: 'move', steps: 3, hasFeedback: false });
    } finally { vi.restoreAllMocks(); }
  });
});
