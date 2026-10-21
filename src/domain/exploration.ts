import { generateMap, validMapCells, type GeneratedMap } from '../map/generate';
import type { OverworldMarker } from '../map/state';
import { hashJson, canonical } from './contentIdentity';
import { nextUint32, seedRng } from './rng';
import { hasShape, isDenseArray } from './validation';

export const EXPLORATION_VERSION = 'exploration-v1';
export interface EncounterPoi extends OverworldMarker { readonly encounterSlot: number }
export interface Exploration {
  readonly version: typeof EXPLORATION_VERSION;
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
export function readExploration(value: unknown, seed: number, position: number): Exploration | null {
  if (!hasShape(value, ['version','pois','revealed','visited']) || value.version !== EXPLORATION_VERSION ||
      !isDenseArray(value.pois,3) || value.pois.length !== 3 ||
      !value.pois.every(p => hasShape(p,['id','kind','x','y','encounterSlot']))) return null;
  const indices = (v: unknown): v is number[] => isDenseArray(v,400) && v.every((n,i) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 400 && (i === 0 || n > (v[i-1] as number)));
  if (!indices(value.revealed) || !indices(value.visited) || !value.visited.includes(position) ||
      !value.visited.every(i => (value.revealed as number[]).includes(i)) ||
      !reveal(position).every(i => (value.revealed as number[]).includes(i))) return null;
  const map = generateMap(seed,'rooms');
  if (!map.cells[position] || !value.visited.every(i => map.cells[i]) || canonical(value.pois) !== canonical(encounterPois(seed,map))) return null;
  return { version: EXPLORATION_VERSION, pois: encounterPois(seed,map), revealed: [...value.revealed], visited: [...value.visited] };
}
