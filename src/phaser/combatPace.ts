import type { CombatPace } from '../ui/combatPacePreference';

export type CombatPresentation =
  | { readonly kind: 'move'; readonly steps: number; readonly hasFeedback: boolean }
  | { readonly kind: 'signature' | 'feedback' | 'turn'; readonly hasFeedback: boolean };

export interface CombatPresentationTiming {
  readonly kind: CombatPresentation['kind'];
  readonly pace: CombatPace;
  readonly reducedMotion: boolean;
  readonly durationMs: number;
}

/** A presentation-only snapshot; callers sample preferences once per accepted action. */
export function combatPresentationTiming(
  presentation: CombatPresentation,
  pace: CombatPace,
  reducedMotion: boolean,
): CombatPresentationTiming {
  const duration = reducedMotion ? (presentation.hasFeedback ? 180 : 25)
    : presentation.kind === 'move' ? Math.max(1, presentation.steps) * 70
    : presentation.kind === 'signature' ? 560
    : presentation.kind === 'feedback' ? 180 : 25;
  return { kind: presentation.kind, pace, reducedMotion, durationMs: duration * (pace === 'fast' ? 0.5 : 1) };
}
