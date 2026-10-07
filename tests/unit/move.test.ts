import { expect, test } from 'vitest';
import { MOVE_PATH, MOVE_DURATION_MS, sampleMove } from '../../src/diagnostics/scriptedMove';
import { BOARD_FIXTURE } from '../../src/diagnostics/boardFixture';

test('script uses real board tiles, crosses canopy depth and elevation, and clamps endpoints', () => {
  for (const tile of MOVE_PATH) expect(BOARD_FIXTURE).toContainEqual(tile);
  expect(new Set(MOVE_PATH.map(tile => tile.elevation)).size).toBeGreaterThan(1);
  expect(sampleMove(-1)).toEqual(MOVE_PATH[0]);
  expect(sampleMove(MOVE_DURATION_MS + 1)).toEqual(MOVE_PATH.at(-1));
  const midpoint = sampleMove(MOVE_DURATION_MS / 2);
  expect(midpoint.x).toBe(1);
  expect(midpoint.y).toBe(1);
  expect(midpoint.elevation).toBe(1);
});
