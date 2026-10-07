import { BOARD_FIXTURE } from './boardFixture';
import type { Tile } from '../geometry/iso';

export const MOVE_DURATION_MS = 2000;
// Authored preview only. No pathfinding or tactical movement rules.
export const MOVE_PATH: readonly Tile[] = Object.freeze([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]].map(([x, y]) => {
  const tile = BOARD_FIXTURE.find(tile => tile.x === x && tile.y === y);
  if (!tile) throw new Error(`Invalid diagnostic move tile ${x},${y}`);
  return tile;
}));
export function sampleMove(elapsed: number): Tile {
  const progress = Math.max(0, Math.min(1, elapsed / MOVE_DURATION_MS)) * (MOVE_PATH.length - 1);
  const index = Math.min(Math.floor(progress), MOVE_PATH.length - 2);
  const fraction = progress - index;
  const from = MOVE_PATH[index];
  const to = MOVE_PATH[index + 1];
  return { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction,
    elevation: from.elevation + (to.elevation - from.elevation) * fraction };
}
