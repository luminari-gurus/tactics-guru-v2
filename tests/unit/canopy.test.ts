import { expect, it } from 'vitest';
import { BOSS_SPRITE_CANVAS, BOSS_UNIT_ART, UNIT_ART, UNIT_SPRITE_CANVAS, canopyBounds, canopyOccludes, unitArtSize, unitBounds, unitOverlayOffsets } from '../../src/geometry/canopy';
import { HEALTH_BAR } from '../../src/phaser/healthBar';

it('only fades a nearer canopy overlapping the unit art, independent of elevation depth', () => {
  const tree = { x: 1, y: 1, elevation: 0 };
  const behind = { x: 0, y: 1, elevation: 0 };
  const art = unitBounds(behind, { x: 0.5, y: 0.95 });
  expect(canopyOccludes(tree, behind, art, 12)).toBe(true);
  expect(canopyOccludes(tree, { x: 2, y: 1, elevation: 0 }, art, 12)).toBe(false);
  expect(canopyOccludes(tree, behind, { left: 1000, right: 1040, top: 0, bottom: 50 }, 12)).toBe(false);
  expect(canopyOccludes({ ...tree, elevation: 2 }, behind, art, 12)).toBe(true);
});

it('uses the canonical foot anchor to bound sprite art and does not fade for trunk-only overlap', () => {
  expect(unitBounds({ x: 0, y: 0, elevation: 0 }, { x: 0.5, y: 0.95 })).toEqual({ left: -20, right: 20, top: -47.5, bottom: 2.5 });
  expect(canopyBounds({ x: 0, y: 0, elevation: 0 }).bottom).toBeLessThan(0);
  expect(canopyOccludes({ x: 1, y: 1, elevation: 0 }, { x: 0, y: 1, elevation: 0 }, { left: -5, right: 5, top: 35, bottom: 40 }, 12)).toBe(false);
});

it('sizes ordinary sprites at 40×50 and bosses at native 60×75 without extra stretch', () => {
  expect(unitArtSize({ runtimeWidth: UNIT_SPRITE_CANVAS.width, runtimeHeight: UNIT_SPRITE_CANVAS.height })).toEqual(UNIT_ART);
  expect(unitArtSize({ runtimeWidth: BOSS_SPRITE_CANVAS.width, runtimeHeight: BOSS_SPRITE_CANVAS.height })).toEqual(BOSS_UNIT_ART);
  expect(BOSS_UNIT_ART).toEqual({ width: 60, height: 75 });
  expect(BOSS_SPRITE_CANVAS.anchor).toEqual({ x: 48, y: 114 });
  const ordinary = unitBounds({ x: 0, y: 0, elevation: 0 }, { x: 0.5, y: 0.95 });
  const boss = unitBounds({ x: 0, y: 0, elevation: 0 }, { x: 0.5, y: 0.95 }, BOSS_UNIT_ART);
  expect(boss).toEqual({
    left: ordinary.left * 1.5, right: ordinary.right * 1.5,
    top: ordinary.top * 1.5, bottom: ordinary.bottom * 1.5,
  });
});

it('derives taller overlay offsets from per-unit board height and keeps health bars at the foot', () => {
  expect(unitOverlayOffsets()).toEqual({ chest: -28, result: -54, damage: -64, defeat: -88 });
  expect(unitOverlayOffsets(UNIT_ART.height)).toEqual(unitOverlayOffsets());
  expect(unitOverlayOffsets(BOSS_UNIT_ART.height)).toEqual({ chest: -42, result: -81, damage: -96, defeat: -132 });
  expect(HEALTH_BAR.offsetY).toBe(10);
});
