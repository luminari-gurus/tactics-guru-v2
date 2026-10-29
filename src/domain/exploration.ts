import { generateMap, validMapCells, type GeneratedMap } from '../map/generate';
import type { OverworldMarker } from '../map/state';
import { hashJson, canonical } from './contentIdentity';
import { nextUint32, seedRng, isRngState, type RngState } from './rng';
import { hasShape, isDenseArray } from './validation';

export const EXPLORATION_VERSION = 'exploration-v1';
export interface EncounterPoi extends OverworldMarker { readonly encounterSlot: number }
export interface Exploration {
  readonly version: typeof EXPLORATION_VERSION | 'exploration-v2';
  readonly cleared?: readonly number[];
  readonly active?: number | null;
  readonly movement?: { readonly rng: RngState; readonly step: number };
  readonly pois: readonly EncounterPoi[];
  readonly revealed: readonly number[];
  readonly visited: readonly number[];
}
export function neighbors(cell: number): number[] {
  return [cell - 20, cell + 1, cell + 20, cell - 1].filter(n => n >= 0 && n < 400 && Math.abs(n % 20 - cell % 20) + Math.abs(Math.floor(n / 20) - Math.floor(cell / 20)) === 1);
}
export function reveal(position: number): number[] {
  return Array.from({ length: 400 }, (_, i) => i).filter(i => Math.abs(i % 20 - position % 20) + Math.abs(Math.floor(i / 20) - Math.floor(position / 20)) <= 2);
}
const union = (a: readonly number[], b: readonly number[]) => [...new Set([...a, ...b])].sort((a,b) => a-b);
export function visit(exploration: Exploration, position: number): Exploration {
  return { ...exploration, revealed: union(exploration.revealed, reveal(position)), visited: union(exploration.visited, [position]) };
}
export function encounterPois(seed: number, map: GeneratedMap = generateMap(seed, 'rooms')): EncounterPoi[] {
  if (!validMapCells(map.cells)) throw Error('Invalid exploration geometry');
  const first = map.cells.indexOf(1), last = map.cells.lastIndexOf(1);
  const candidates = map.cells.flatMap((cell,i) => cell && i !== first && i !== last ? [i] : []);
  if (candidates.length < 3) throw Error('Insufficient encounter cells');
  let rng = seedRng(Number.parseInt(hashJson({ seed, policy: EXPLORATION_VERSION }).slice(-8),16));
  return [0,1,2].map(encounterSlot => {
    const draw = nextUint32(rng); rng = draw.rng;
    const chosen = encounterSlot + draw.value % (candidates.length - encounterSlot);
    [candidates[encounterSlot], candidates[chosen]] = [candidates[chosen], candidates[encounterSlot]];
    const cell = candidates[encounterSlot];
    return { id: `enemy-${encounterSlot+1}` as EncounterPoi['id'], kind: 'enemy', x: cell % 20, y: Math.floor(cell / 20), encounterSlot };
  });
}
export const poiCell = (poi: EncounterPoi) => poi.y * 20 + poi.x;
export function freshExploration(seed: number, position: number): Exploration {
  return visit({ version: EXPLORATION_VERSION, pois: encounterPois(seed), revealed: [], visited: [] }, position);
}
/** Upgrade only validated legacy floors; their original ordering is their cleared set. */
export function movableExploration(exploration: Exploration, seed: number, completed: number, phase: string): Exploration {
  if (exploration.version === 'exploration-v2') return exploration;
  return { ...exploration, version: 'exploration-v2', cleared: Array.from({length:completed},(_,i)=>i),
    active: phase === 'battle' ? completed : phase === 'reward' ? completed-1 : null,
    movement: { rng: seedRng((seed ^ 0x4d4f5645) >>> 0), step: 0 } };
}
export function readExploration(value: unknown, seed: number, position: number): Exploration | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string,unknown>;
  const movable = v.version === 'exploration-v2';
  if (!hasShape(value, movable ? ['version','pois','revealed','visited','cleared','active','movement'] : ['version','pois','revealed','visited']) ||
      (!movable && value.version !== EXPLORATION_VERSION) ||
      !isDenseArray(value.pois,3) || value.pois.length !== 3 ||
      !value.pois.every(p => hasShape(p,['id','kind','x','y','encounterSlot']))) return null;
  const indices = (v: unknown): v is number[] => isDenseArray(v,400) && v.every((n,i) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 400 && (i === 0 || n > (v[i-1] as number)));
  if (!indices(value.revealed) || !indices(value.visited) || !value.visited.includes(position) ||
      !value.visited.every(i => (value.revealed as number[]).includes(i)) ||
      !reveal(position).every(i => (value.revealed as number[]).includes(i))) return null;
  const map = generateMap(seed,'rooms');
  if (!map.cells[position] || !value.visited.every(i => map.cells[i])) return null;
  if (!movable) {
    if (canonical(value.pois) !== canonical(encounterPois(seed,map))) return null;
    return { version: EXPLORATION_VERSION, pois: encounterPois(seed,map), revealed: [...value.revealed], visited: [...value.visited] };
  }
  if (!isDenseArray(value.cleared,3) || !value.cleared.every((n,i)=>typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 3 && (i===0 || n > (value.cleared as number[])[i-1])) ||
      !(value.active === null || typeof value.active === 'number' && Number.isInteger(value.active) && value.active >= 0 && value.active < 3) ||
      !hasShape(value.movement,['rng','step']) || !isRngState(value.movement.rng) || typeof value.movement.step !== 'number' || !Number.isSafeInteger(value.movement.step) || value.movement.step < 0) return null;
  const pois = value.pois as unknown as EncounterPoi[];
  if (!pois.every((p,i)=>p.id === `enemy-${i+1}` && p.kind === 'enemy' && p.encounterSlot === i && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.x < 20 && p.y >= 0 && p.y < 20 && map.cells[poiCell(p)] === 1)) return null;
  const live = pois.filter(p=>!(value.cleared as number[]).includes(p.encounterSlot)).map(poiCell);
  if (new Set(live).size !== live.length) return null;
  return {version:'exploration-v2',pois:pois.map(p=>({...p})),revealed:[...value.revealed],visited:[...value.visited],
    cleared:[...value.cleared] as number[],active:value.active as number | null,movement:{rng:value.movement.rng,step:value.movement.step as number}};
}
