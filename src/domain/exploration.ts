import { generateMap, validMapCells, type GeneratedMap } from '../map/generate';
import type { OverworldMarker } from '../map/state';
import { hashJson, canonical } from './contentIdentity';
import { nextUint32, seedRng, isRngState, type RngState } from './rng';
import { hasShape, isDenseArray } from './validation';

export const EXPLORATION_VERSION = 'exploration-v1';
const WALL_SIGHT_VERSION = 'wall-sight-v1';
export interface EncounterPoi extends OverworldMarker { readonly encounterSlot: number }
export interface Exploration {
  readonly version: typeof EXPLORATION_VERSION | 'exploration-v2';
  readonly sightVersion?: typeof WALL_SIGHT_VERSION;
  readonly cleared?: readonly number[];
  readonly active?: number | null;
  readonly movement?: { readonly rng: RngState; readonly step: number };
  readonly pois: readonly EncounterPoi[];
  readonly revealed: readonly number[];
  readonly visited: readonly number[];
}
export function neighbors(cell: number, width = 20, height = width): number[] {
  return [cell - width, cell + 1, cell + width, cell - 1].filter(n => n >= 0 && n < width * height && Math.abs(n % width - cell % width) + Math.abs(Math.floor(n / width) - Math.floor(cell / width)) === 1);
}
export function reveal(position: number, width = 20, height = width): number[] {
  const x = position % width, y = Math.floor(position / width), cells: number[] = [];
  // Visit only the radius-two diamond, retaining the saved row-major order.
  for (let row = Math.max(0, y - 2); row <= Math.min(height - 1, y + 2); row++) {
    const radius = 2 - Math.abs(row - y);
    for (let column = Math.max(0, Math.ceil(x - radius)); column <= Math.min(width - 1, Math.floor(x + radius)); column++) cells.push(row * width + column);
  }
  return cells;
}
/** The first wall face is visible. At a diagonal corner either open side lets sight through. */
export function currentSight(position: number, { width, height, cells }: Pick<GeneratedMap, 'width' | 'height' | 'cells'>): number[] {
  const column = position % width, row = Math.floor(position / width);
  return reveal(position, width, height).filter(cell => {
    const dx = cell % width - column, dy = Math.floor(cell / width) - row;
    if (Math.abs(dx) + Math.abs(dy) < 2) return true;
    return (dx !== 0 && cells[position + Math.sign(dx)] === 1)
      || (dy !== 0 && cells[position + Math.sign(dy) * width] === 1);
  });
}
const union = (a: readonly number[], b: readonly number[]) => [...new Set([...a, ...b])].sort((a,b) => a-b);
export function visit(exploration: Exploration, position: number, map: GeneratedMap): Exploration {
  return { ...exploration, sightVersion: WALL_SIGHT_VERSION,
    revealed: union(exploration.revealed, currentSight(position, map)),
    visited: union(exploration.visited, [position]) };
}
export function encounterPois(seed: number, map: GeneratedMap = generateMap(seed, 'rooms'), reserved: readonly number[] = []): EncounterPoi[] {
  if (!validMapCells(map.cells, map.width, map.height, map.type === 'arena')) throw Error('Invalid exploration geometry');
  const first = map.cells.indexOf(1), last = map.cells.lastIndexOf(1);
  const candidates: number[] = [];
  map.cells.forEach((cell,i) => { if (cell && i !== first && i !== last && !reserved.includes(i)) candidates.push(i); });
  if (candidates.length < 3) throw Error('Insufficient encounter cells');
  let rng = seedRng(Number.parseInt(hashJson({ seed, policy: EXPLORATION_VERSION }).slice(-8),16));
  return [0,1,2].map(encounterSlot => {
    const draw = nextUint32(rng); rng = draw.rng;
    const chosen = encounterSlot + draw.value % (candidates.length - encounterSlot);
    [candidates[encounterSlot], candidates[chosen]] = [candidates[chosen], candidates[encounterSlot]];
    const cell = candidates[encounterSlot];
    return { id: `enemy-${encounterSlot+1}` as EncounterPoi['id'], kind: 'enemy', x: cell % map.width, y: Math.floor(cell / map.width), encounterSlot };
  });
}
export const poiCell = (poi: EncounterPoi, width = 20) => poi.y * width + poi.x;
export function freshExploration(seed: number, position: number, map = generateMap(seed)): Exploration {
  return visit({ version: EXPLORATION_VERSION, pois: encounterPois(seed, map), revealed: [], visited: [] }, position, map);
}
export function freshArrivalExploration(seed: number, upstairs: number, map: GeneratedMap): Exploration {
  const initial = freshExploration(seed, upstairs, map);
  const landing = neighbors(upstairs, map.width, map.height);
  if (!initial.pois.some(poi => landing.includes(poiCell(poi, map.width)))) return initial;
  // Exploration v1 saves require the original seeded positions. Store adjusted
  // positions in the existing movable format, without changing either save reader.
  return movableExploration({ ...initial, pois: encounterPois(seed, map, landing) }, seed, 0, 'ready');
}
/** Upgrade only validated legacy floors; their original ordering is their cleared set. */
export function movableExploration(exploration: Exploration, seed: number, completed: number, phase: string): Exploration {
  if (exploration.version === 'exploration-v2') return exploration;
  return { ...exploration, version: 'exploration-v2', cleared: Array.from({length:completed},(_,i)=>i),
    active: phase === 'battle' ? completed : phase === 'reward' ? completed-1 : null,
    movement: { rng: seedRng((seed ^ 0x4d4f5645) >>> 0), step: 0 } };
}
export function readExploration(value: unknown, seed: number, position: number, map = generateMap(seed)): Exploration | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string,unknown>;
  const movable = v.version === 'exploration-v2';
  const keys = movable ? ['version','pois','revealed','visited','cleared','active','movement'] : ['version','pois','revealed','visited'];
  const wallAware = Object.hasOwn(value, 'sightVersion');
  if (wallAware) keys.push('sightVersion');
  if (!hasShape(value, keys) || (wallAware && value.sightVersion !== WALL_SIGHT_VERSION) ||
      (!movable && value.version !== EXPLORATION_VERSION) ||
      !isDenseArray(value.pois,3) || value.pois.length !== 3 ||
      !value.pois.every(p => hasShape(p,['id','kind','x','y','encounterSlot']))) return null;
  const indices = (v: unknown): v is number[] => isDenseArray(v,map.width * map.height) && v.every((n,i) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < map.width * map.height && (i === 0 || n > (v[i-1] as number)));
  if (!indices(value.revealed) || !indices(value.visited) || !value.visited.includes(position) ||
      !value.visited.every(i => (value.revealed as number[]).includes(i)) ||
      !(wallAware ? currentSight(position, map) : reveal(position, map.width, map.height)).every(i => (value.revealed as number[]).includes(i))) return null;
  if (!map.cells[position] || !value.visited.every(i => map.cells[i])) return null;
  const memory = { ...(wallAware ? { sightVersion: WALL_SIGHT_VERSION } as const : {}),
    revealed: [...value.revealed], visited: [...value.visited] };
  if (!movable) {
    const pois = encounterPois(seed,map);
    if (canonical(value.pois) !== canonical(pois)) return null;
    return { version: EXPLORATION_VERSION, pois, ...memory };
  }
  if (!isDenseArray(value.cleared,3) || !value.cleared.every((n,i)=>typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 3 && (i===0 || n > (value.cleared as number[])[i-1])) ||
      !(value.active === null || typeof value.active === 'number' && Number.isInteger(value.active) && value.active >= 0 && value.active < 3) ||
      !hasShape(value.movement,['rng','step']) || !isRngState(value.movement.rng) || typeof value.movement.step !== 'number' || !Number.isSafeInteger(value.movement.step) || value.movement.step < 0) return null;
  const pois = value.pois as unknown as EncounterPoi[];
  if (!pois.every((p,i)=>p.id === `enemy-${i+1}` && p.kind === 'enemy' && p.encounterSlot === i && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.x < map.width && p.y >= 0 && p.y < map.height && map.cells[poiCell(p, map.width)] === 1)) return null;
  const live = pois.filter(p=>!(value.cleared as number[]).includes(p.encounterSlot)).map(p => poiCell(p, map.width));
  if (new Set(live).size !== live.length) return null;
  return {version:'exploration-v2',pois:pois.map(p=>({...p})),...memory,
    cleared:[...value.cleared] as number[],active:value.active as number | null,movement:{rng:value.movement.rng,step:value.movement.step as number}};
}
