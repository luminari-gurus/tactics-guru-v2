import type Phaser from 'phaser';
import type { BattleEvent } from '../domain/types';
import type { Point } from '../geometry/iso';

export interface CriticalImpact {
  readonly actorId: number;
  readonly targetId: number;
}

/** One cue per resolved critical impact, without interpreting rolls, damage or HP. */
export function criticalImpacts(events: readonly BattleEvent[]): CriticalImpact[] {
  return events.flatMap(event => event.type === 'attackRolled' && event.result === 'critical'
    ? [{ actorId: event.unitId, targetId: event.targetId }] : []);
}

/** Paint into the presentation's existing graphics; no particles, clocks or RNG. */
export function drawCriticalImpact(
  graphics: Phaser.GameObjects.Graphics,
  center: Point,
  progress: number,
  size: number,
  reducedMotion: boolean,
): void {
  const { x, y } = center;
  if (reducedMotion) {
    // A small stationary ring and diamond replace all expansion, travel and fading.
    graphics.lineStyle(3 * size, 0x6b351c, 0.8).strokeCircle(x, y, 11 * size);
    graphics.lineStyle(1.5 * size, 0xffd36a, 0.9).strokeCircle(x, y, 11 * size);
    graphics.lineStyle(1.5 * size, 0xfff4cf, 0.9).beginPath()
      .moveTo(x, y - 6 * size).lineTo(x + 6 * size, y)
      .lineTo(x, y + 6 * size).lineTo(x - 6 * size, y).closePath().strokePath();
    return;
  }

  const p = Math.max(0, Math.min(1, progress));
  const fade = 1 - p;
  const expansion = 1 - (1 - p) ** 3;
  // The translucent core leaves the struck unit visible through the burst.
  const core = (10 + 3 * Math.sin(Math.PI * Math.min(1, p * 3))) * fade * size;
  graphics.fillStyle(0xffb44c, 0.32 * fade).lineStyle(1.4 * size, 0xfff4cf, 0.85 * fade).beginPath();
  for (let point = 0; point < 16; point++) {
    const angle = point * Math.PI / 8 - Math.PI / 2;
    const radius = point % 2 === 0 ? core : core * 0.42;
    const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
    if (point === 0) graphics.moveTo(px, py);
    else graphics.lineTo(px, py);
  }
  graphics.closePath().fillPath().strokePath();

  const ring = (7 + 16 * expansion) * size;
  graphics.lineStyle(3 * size, 0xf48136, 0.8 * fade).strokeCircle(x, y, ring);
  graphics.lineStyle(1.2 * size, 0xffedb0, fade).strokeCircle(x, y, ring - 1.5 * size);

  // Eight fixed spokes stay within 31 board units, so adjacent targets remain readable.
  for (let spark = 0; spark < 8; spark++) {
    const angle = spark * Math.PI / 4 - Math.PI / 8;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const start = (12 + 14 * expansion) * size;
    const length = (spark % 2 === 0 ? 5 : 3.5) * (1 - 0.6 * p) * size;
    graphics.lineStyle(3 * size, 0xf48136, 0.75 * fade)
      .lineBetween(x + dx * start, y + dy * start, x + dx * (start + length), y + dy * (start + length));
    graphics.lineStyle(1.4 * size, 0xfff4cf, fade)
      .lineBetween(x + dx * start, y + dy * start, x + dx * (start + length), y + dy * (start + length));
  }
}
