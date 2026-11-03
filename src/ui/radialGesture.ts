import { DRAG_THRESHOLD, TOUCH_DRAG_THRESHOLD, dragThresholdFor } from '../geometry/picking';

export const HOLD_MS = 300;
export { DRAG_THRESHOLD, TOUCH_DRAG_THRESHOLD, dragThresholdFor };
export const RADIAL_HUB_RADIUS = 44;
export type RadialCardinal = 'n' | 'e' | 's' | 'w' | 'hub';
export type RadialSliceId = 'attack' | 'special' | 'inspect' | 'move' | 'plan';

export function lightHaptic(nav: { vibrate?: (pattern: number | number[]) => boolean } | undefined = typeof navigator === 'undefined' ? undefined : navigator): void {
  try {
    if (typeof nav?.vibrate === 'function') nav.vibrate(10);
  } catch { /* iOS/WebKit expose vibrate as undefined or throw. */ }
}

export function hubContains(dx: number, dy: number, hubRadius = RADIAL_HUB_RADIUS): boolean {
  return Math.hypot(dx, dy) <= hubRadius;
}

/** CSS y grows downward. East is 0°, south 90°, west ±180°, north −90°. */
export function cardinalFromVector(dx: number, dy: number, hubRadius = RADIAL_HUB_RADIUS): RadialCardinal {
  if (hubContains(dx, dy, hubRadius)) return 'hub';
  const deg = Math.atan2(dy, dx) * 180 / Math.PI;
  if (deg >= -135 && deg < -45) return 'n';
  if (deg >= -45 && deg < 45) return 'e';
  if (deg >= 45 && deg < 135) return 's';
  return 'w';
}

export const CARDINAL_SLICE: Record<Exclude<RadialCardinal, 'hub'>, RadialSliceId> = {
  n: 'attack', e: 'special', s: 'inspect', w: 'move',
};

export type HoldMoveResult = 'pending' | 'pan' | 'aim';
export function classifyHoldMove(input: {
  distance: number; threshold: number; holdOpen: boolean;
}): HoldMoveResult {
  if (input.holdOpen) return 'aim';
  return input.distance >= input.threshold ? 'pan' : 'pending';
}

export type HoldUpResult = 'tap' | 'pan' | 'commit-default' | 'cancel' | 'commit-slice' | 'none';
export function classifyHoldUp(input: {
  distance: number; threshold: number; holdOpen: boolean; reducedMotion: boolean;
  leftHub: boolean; inHub: boolean; elapsedMs: number;
}): HoldUpResult {
  if (input.holdOpen) {
    if (input.inHub) return input.leftHub ? 'cancel' : 'commit-default';
    return 'commit-slice';
  }
  if (input.distance >= input.threshold) return 'pan';
  return 'tap';
}

/**
 * First activation of the Special slice never commits when more than one ability is listed.
 * Visual sub-ring reveal (pointerenter / hold-aim) must not skip this.
 */
export function specialSliceActivation(listedCount: number): 'none' | 'commit' | 'open-sub' {
  if (listedCount <= 0) return 'none';
  if (listedCount === 1) return 'commit';
  return 'open-sub';
}
