import type { Tile } from '../geometry/iso';

export const BOARD_SIZE = 4;
// Authored diagnostic fixture, not a procedural map or gameplay content catalog.
const ELEVATIONS = [
  [0, 0, 0, 0],
  [0, 1, 1, 0],
  [0, 1, 2, 0],
  [0, 0, 0, 0],
] as const;

export const BOARD_FIXTURE: readonly Tile[] = Object.freeze(ELEVATIONS.flatMap((row, y) =>
  row.map((elevation, x) => Object.freeze({ x, y, elevation })),
));
