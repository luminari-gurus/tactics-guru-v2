import { nextUint32, seedRng } from '../domain/rng';

export const MAP_SIZE = 20;
/** Bump when this layout algorithm or its reused RNG contract changes. */
export const GENERATOR_VERSION = 'rooms-v1';
export const MAP_TYPES = [
  { id: 'rooms', label: 'Rooms', version: 'rooms-v1' },
  { id: 'random-walker', label: 'Random walker', version: 'random-walker-v1' },
  { id: 'cellular', label: 'Cellular caves', version: 'cellular-v1' },
  { id: 'sector-graph', label: 'Sector graph', version: 'sector-graph-v1' },
  { id: 'arena', label: 'Arena', version: 'arena-v1' },
] as const;
export type MapType = typeof MAP_TYPES[number]['id'];
export type MapCell = 0 | 1; // blocked | walkable
export interface GeneratedMap {
  readonly seed: number;
  readonly type: MapType;
  readonly version: string;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly MapCell[];
  readonly fallback: boolean;
}

export function validMapCells(cells: readonly MapCell[], width = 20, height = width, allowOpen = false): boolean {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 20 || height < 20 || width > 36 || height > 36 || cells.length !== width * height || cells.some(cell => cell !== 0 && cell !== 1)) return false;
  const floorCount = cells.reduce<number>((sum, cell) => sum + cell, 0);
  if (floorCount < 60 || floorCount > (allowOpen ? (width - 2) * (height - 2) : width * height - (2 * width + 2 * height))) return false;
  for (let x = 0; x < width; x++) if (cells[x] || cells[(height - 1) * width + x]) return false;
  for (let y = 0; y < height; y++) if (cells[y * width] || cells[y * width + width - 1]) return false;
  const visited = new Set<number>();
  const queue = [cells.indexOf(1)];
  visited.add(queue[0]);
  for (let i = 0; i < queue.length; i++) {
    for (const next of [queue[i] - width, queue[i] + width, queue[i] - 1, queue[i] + 1]) {
      if (cells[next] === 1 && !visited.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  return visited.size === floorCount;
}

function generateRooms(seed: number): GeneratedMap {
  let rng = seedRng(seed);
  const draw = (range: number): number => {
    const next = nextUint32(rng);
    rng = next.rng;
    return next.value % range;
  };
  const result = (cells: MapCell[], fallback: boolean): GeneratedMap => ({
    seed, type: 'rooms', version: GENERATOR_VERSION, width: MAP_SIZE, height: MAP_SIZE, cells, fallback,
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

// All decisions use explicit local RNG state. These constants/draw orders are versioned.
function localDraw(seed: number): (range: number) => number {
  let rng = seedRng(seed);
  return range => {
    const next = nextUint32(rng);
    rng = next.rng;
    return next.value % range;
  };
}
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const inner = (n: number): number => Math.max(1, Math.min(18, n));

function walker(draw: (range: number) => number): MapCell[] {
  const cells: MapCell[] = Array<MapCell>(400).fill(0);
  let x = 1 + draw(18), y = 1 + draw(18), count = 0, direction = draw(4);
  const carve = (cx: number, cy: number): void => {
    const index = cy * 20 + cx;
    if (!cells[index]) { cells[index] = 1; count++; }
  };
  carve(x, y);
  for (let step = 0; step < 2048 && count < 160; step++) {
    if (draw(4) !== 0) direction = draw(4);
    const [dx, dy] = DIRECTIONS[direction];
    x = inner(x + dx); y = inner(y + dy);
    carve(x, y);
    if (count < 160 && draw(5) === 0) {
      const [bx, by] = DIRECTIONS[draw(4)];
      carve(inner(x + bx), inner(y + by));
    }
  }
  return cells;
}

function cellular(draw: (range: number) => number): MapCell[] {
  let cells: MapCell[] = Array<MapCell>(400).fill(0);
  for (let y = 1; y < 19; y++) for (let x = 1; x < 19; x++) cells[y * 20 + x] = draw(100) < 48 ? 1 : 0;
  for (let pass = 0; pass < 4; pass++) {
    const next: MapCell[] = Array<MapCell>(400).fill(0);
    for (let y = 1; y < 19; y++) for (let x = 1; x < 19; x++) {
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx || dy) neighbors += cells[(y + dy) * 20 + x + dx];
      }
      next[y * 20 + x] = neighbors >= 4 ? 1 : 0;
    }
    cells = next;
  }
  const start = cells.indexOf(1);
  if (start < 0) return cells;
  // Scan/flood/corridor order is fixed. At most 324 repairs, 400 visits per flood.
  for (let repair = 0; repair < 324; repair++) {
    const reached = new Set([start]), queue = [start];
    for (let i = 0; i < queue.length; i++) for (const next of [queue[i] - 20, queue[i] + 20, queue[i] - 1, queue[i] + 1]) {
      if (cells[next] === 1 && !reached.has(next)) { reached.add(next); queue.push(next); }
    }
    const target = cells.findIndex((cell, i) => cell === 1 && !reached.has(i));
    if (target < 0) break;
    let x = start % 20, y = Math.floor(start / 20);
    const tx = target % 20, ty = Math.floor(target / 20);
    while (x !== tx) { x += Math.sign(tx - x); cells[y * 20 + x] = 1; }
    while (y !== ty) { y += Math.sign(ty - y); cells[y * 20 + x] = 1; }
  }
  return cells;
}

export function generateMap(seed: number, type: MapType = 'rooms', size = 20): GeneratedMap {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('Invalid seed');
  const entry = MAP_TYPES.find(entry => entry.id === type);
  if (!entry) throw new RangeError('Invalid map type');
  if (!Number.isInteger(size) || size < 20 || size > 36) throw new RangeError('Invalid map size');
  if (type === 'sector-graph' || type === 'arena') return generateSized(seed, type, size);
  if (size !== 20) throw new RangeError('Unsupported map size');
  if (type === 'rooms') return generateRooms(seed);
  const result = (cells: MapCell[], fallback: boolean): GeneratedMap => ({
    seed, type, version: entry.version, width: MAP_SIZE, height: MAP_SIZE, cells, fallback,
  });
  const salt = type === 'random-walker' ? 0x57414c4b : 0x43415645;
  for (let attempt = 0; attempt < 4; attempt++) {
    const draw = localDraw((seed ^ salt ^ Math.imul(attempt, 0x9e3779b9)) >>> 0);
    const cells = type === 'random-walker' ? walker(draw) : cellular(draw);
    if (validMapCells(cells)) return result(cells, false);
  }
  const cells: MapCell[] = Array<MapCell>(400).fill(0);
  for (let y = 6; y < 14; y++) for (let x = 5; x < 15; x++) cells[y * 20 + x] = 1;
  if (!validMapCells(cells)) throw new Error('Invalid map fallback');
  return result(cells, true);
}

/** Versioned square profiles use a private random stream and fixed work bounds. */
function generateSized(seed: number, type: 'sector-graph' | 'arena', size: number): GeneratedMap {
  const draw = localDraw((seed ^ 0x53454354) >>> 0);
  const cells: MapCell[] = Array<MapCell>(size * size).fill(0);
  if (type === 'arena') {
    for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) cells[y * size + x] = 1;
  } else {
    const centers: {x:number; y:number}[] = [];
    for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
      const left = 1 + Math.floor(sx * (size - 2) / 3), right = 1 + Math.floor((sx + 1) * (size - 2) / 3);
      const top = 1 + Math.floor(sy * (size - 2) / 3), bottom = 1 + Math.floor((sy + 1) * (size - 2) / 3);
      const w = 3 + draw(Math.max(1, right - left - 3)), h = 3 + draw(Math.max(1, bottom - top - 3));
      const x = left + draw(right - left - w + 1), y = top + draw(bottom - top - h + 1);
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) cells[yy * size + xx] = 1;
      centers.push({x:x + Math.floor(w / 2), y:y + Math.floor(h / 2)});
    }
    const connect = (a: typeof centers[number], b: typeof centers[number]) => {
      let {x,y} = a; while (x !== b.x) { cells[y * size + x] = 1; x += Math.sign(b.x - x); }
      while (y !== b.y) { cells[y * size + x] = 1; y += Math.sign(b.y - y); } cells[y * size + x] = 1;
    };
    for (let i = 1; i < centers.length; i++) connect(centers[i], centers[i % 3 ? i - 1 : i - 3]);
    for (let i = 3; i < centers.length; i++) if (draw(3) === 0) connect(centers[i], centers[i - 3]);
  }
  const checked = sizedLayoutOrFallback(cells, size, type === 'arena');
  return {seed, type, version: type + '-v1', width:size, height:size, ...checked};
}

/** Validate a bounded candidate before admitting it to the map and save contracts. */
export function sizedLayoutOrFallback(candidate: readonly MapCell[], size: number, allowOpen: boolean): { cells: readonly MapCell[]; fallback: boolean } {
  if (!Number.isInteger(size) || size < 20 || size > 36) throw new RangeError('Invalid map size');
  if (validMapCells(candidate, size, size, allowOpen)) return {cells: candidate, fallback: false};
  const cells: MapCell[] = Array<MapCell>(size * size).fill(0);
  for (let y = 1; y < 9; y++) for (let x = 1; x < 11; x++) cells[y * size + x] = 1;
  if (!validMapCells(cells, size, size, allowOpen)) throw new Error('Invalid map fallback');
  return {cells, fallback: true};
}
