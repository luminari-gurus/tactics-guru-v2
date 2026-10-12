import { nextUint32, seedRng } from '../domain/rng';

export const MAP_SIZE = 20;
/** Bump when this layout algorithm or its reused RNG contract changes. */
export const GENERATOR_VERSION = 'rooms-v1';
export type MapCell = 0 | 1; // blocked | walkable
export interface GeneratedMap {
  readonly seed: number;
  readonly version: string;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly MapCell[];
  readonly fallback: boolean;
}

export function validMapCells(cells: readonly MapCell[]): boolean {
  if (cells.length !== 400 || cells.some(cell => cell !== 0 && cell !== 1)) return false;
  const floorCount = cells.reduce<number>((sum, cell) => sum + cell, 0);
  if (floorCount < 60 || floorCount > 320) return false;
  for (let i = 0; i < MAP_SIZE; i++) {
    if (cells[i] || cells[380 + i] || cells[i * 20] || cells[i * 20 + 19]) return false;
  }
  const visited = new Set<number>();
  const queue = [cells.indexOf(1)];
  visited.add(queue[0]);
  for (let i = 0; i < queue.length; i++) {
    for (const next of [queue[i] - 20, queue[i] + 20, queue[i] - 1, queue[i] + 1]) {
      if (cells[next] === 1 && !visited.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  return visited.size === floorCount;
}

export function generateMap(seed: number): GeneratedMap {
  let rng = seedRng(seed);
  const draw = (range: number): number => {
    const next = nextUint32(rng);
    rng = next.rng;
    return next.value % range;
  };
  const result = (cells: MapCell[], fallback: boolean): GeneratedMap => ({
    seed, version: GENERATOR_VERSION, width: MAP_SIZE, height: MAP_SIZE, cells, fallback,
  });
  for (let attempt = 0; attempt < 4; attempt++) {
    const cells: MapCell[] = Array<MapCell>(400).fill(0);
    let previous: { x: number; y: number } | undefined;
    for (let room = 0; room < 6; room++) {
      const width = 3 + draw(4), height = 3 + draw(4);
      const left = 1 + draw(19 - width), top = 1 + draw(19 - height);
      for (let y = top; y < top + height; y++) for (let x = left; x < left + width; x++) cells[y * 20 + x] = 1;
      const center = { x: left + Math.floor(width / 2), y: top + Math.floor(height / 2) };
      if (previous) {
        let { x, y } = previous;
        const horizontalFirst = draw(2) === 0;
        for (let axis = 0; axis < 2; axis++) {
          if ((axis === 0) === horizontalFirst) {
            while (x !== center.x) { cells[y * 20 + x] = 1; x += Math.sign(center.x - x); }
          } else {
            while (y !== center.y) { cells[y * 20 + x] = 1; y += Math.sign(center.y - y); }
          }
        }
        cells[y * 20 + x] = 1;
      }
      previous = center;
    }
    if (validMapCells(cells)) return result(cells, false);
  }
  const cells: MapCell[] = Array<MapCell>(400).fill(0);
  for (let y = 6; y < 14; y++) for (let x = 5; x < 15; x++) cells[y * 20 + x] = 1;
  if (!validMapCells(cells)) throw new Error('Invalid map fallback');
  return result(cells, true);
}
