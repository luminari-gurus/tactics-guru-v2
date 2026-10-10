import { expect, it } from 'vitest';
import { canopyBounds, canopyOccludes, unitBounds } from '../../src/geometry/canopy';

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
