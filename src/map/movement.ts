import { nextUint32, seedRng, type RngState } from '../domain/rng';
import type { OverworldMarker, OverworldState } from './state';

type EnemyId = Exclude<OverworldMarker['id'], 'player'>;
export type EnemyBehavior =
  | { readonly id: EnemyId; readonly kind: 'passive' }
  | { readonly id: EnemyId; readonly kind: 'aggressive' | 'chase' | 'block'; readonly range: number };
const ENEMIES: readonly EnemyId[] = ['enemy-1', 'enemy-2', 'enemy-3'];
export const DEFAULT_BEHAVIORS: readonly EnemyBehavior[] = [
  { id: 'enemy-1', kind: 'passive' },
  { id: 'enemy-2', kind: 'chase', range: 6 },
  { id: 'enemy-3', kind: 'block', range: 10 },
];
export interface OverworldMovement {
  readonly world: OverworldState;
  readonly behaviors: readonly EnemyBehavior[];
  readonly rng: RngState;
  readonly step: number;
}

/** Configuration is local to this prototype; placement and dungeon marker shapes stay unchanged. */
export function createMovement(world: OverworldState, behaviors = DEFAULT_BEHAVIORS): OverworldMovement {
  if (behaviors.length !== 3 || !ENEMIES.every(id => behaviors.filter(b => b?.id === id).length === 1) ||
      !behaviors.every(b => b && (b.kind === 'passive' ||
        (b.kind === 'aggressive' || b.kind === 'chase' || b.kind === 'block') && Number.isInteger(b.range) && b.range >= 1 && b.range <= 38))) {
    throw new RangeError('Expected one passive, chase, block or aggressive profile per enemy, with detection range 1–38.');
  }
  return { world, behaviors: behaviors.map(b => ({ ...b })), rng: seedRng((world.map.seed ^ 0x4d4f5645) >>> 0), step: 0 };
}

export function describeBehavior(behavior: EnemyBehavior): string {
  return behavior.kind === 'passive' ? 'passive wandering' : `${behavior.kind} pursuit · range ${behavior.range}`;
}

const cellOf = (marker: OverworldMarker) => marker.y * 20 + marker.x;
const distance = (a: number, b: number) => Math.abs(a % 20 - b % 20) + Math.abs(Math.floor(a / 20) - Math.floor(b / 20));
function neighbors(cell: number): number[] {
  return [cell - 20, cell + 1, cell + 20, cell - 1]
    .filter(next => next >= 0 && next < 400 && distance(cell, next) === 1);
}

/** FIFO search with fixed neighbor order; at most 400 cells, no RNG or terrain mutation. */
function pursue(start: number, player: number, legal: (cell: number) => boolean): number {
  if (distance(start, player) === 1) return start;
  const queue = [{ cell: start, first: start }];
  const visited = new Set([start]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    for (const next of neighbors(current.cell)) {
      if (visited.has(next) || !legal(next)) continue;
      visited.add(next);
      const first = current.cell === start ? next : current.first;
      if (distance(next, player) === 1) return first;
      queue.push({ cell: next, first });
    }
  }
  return start;
}

/** One simultaneous cadence, resolved in stable ID order against updated occupancy. */
export function stepMovement(state: OverworldMovement, inactive: readonly EnemyId[] = [], blocked: readonly number[] = [], previousPlayer?: number): OverworldMovement {
  if (!Number.isSafeInteger(state.step) || state.step < 0 || state.step === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Invalid or exhausted movement step.');
  }
  const { world } = state;
  const markers = [...world.markers];
  const player = cellOf(markers.find(marker => marker.id === 'player')!);
  let rng = state.rng;
  for (const id of ENEMIES) {
    if (inactive.includes(id)) continue;
    const index = markers.findIndex(marker => marker.id === id);
    const marker = markers[index];
    const start = cellOf(marker);
    const occupied = new Set(markers.filter(other => other.id !== id && (other.id === 'player' || !inactive.includes(other.id))).map(cellOf));
    const legal = (cell: number) => world.map.cells[cell] === 1 && !occupied.has(cell) && !blocked.includes(cell);
    const behavior = state.behaviors.find(profile => profile.id === id)!;
    let destination = start;
    if (behavior.kind === 'passive') {
      const draw = nextUint32(rng);
      rng = draw.rng;
      const choices = neighbors(start).filter(legal);
      if (choices.length) destination = choices[draw.value % choices.length];
    } else {
      const target = behavior.kind === 'chase' ? previousPlayer ?? player : player;
      if (distance(start, target) <= behavior.range) destination = pursue(start, target, legal);
    }
    markers[index] = { ...marker, x: destination % 20, y: Math.floor(destination / 20) };
  }
  return { ...state, world: { ...world, markers }, rng, step: state.step + 1 };
}
