import type { Point } from '../geometry/iso';

export const HEALTH_COLORS = { background: 0x1f211f, green: 0x3bc761, yellow: 0xe0992e, red: 0xdb2e29 } as const;
export const HEALTH_BAR = { radiusX: 15, radiusY: 4, offsetY: 10, track: 4, fill: 2.5, segments: 24 } as const;

export function healthFraction(hp: number, maxHp: number): number {
  return Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
}
export function healthColor(ratio: number): number {
  return ratio <= 0.25 ? HEALTH_COLORS.red : ratio <= 0.5 ? HEALTH_COLORS.yellow : HEALTH_COLORS.green;
}
/** A proportional sweep along the legacy lower elliptical half-arc. */
export function healthArc(ratio: number): Point[] {
  const fraction = Math.max(0, Math.min(1, ratio));
  const steps = Math.max(1, Math.ceil(HEALTH_BAR.segments * fraction));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = Math.PI * (1 - fraction * i / steps);
    return { x: Math.cos(angle) * HEALTH_BAR.radiusX, y: Math.sin(angle) * HEALTH_BAR.radiusY };
  });
}
/** Target a 2px track at fitted mobile scale, bounding enlargement within half a tile. */
export function healthBarScale(viewScale: number): number {
  return Math.max(1, Math.min(1.4, 2 / (HEALTH_BAR.track * viewScale)));
}
