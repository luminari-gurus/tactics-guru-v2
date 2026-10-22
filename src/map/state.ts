import { nextUint32, seedRng } from '../domain/rng';
import { MAP_SIZE, validMapCells } from './generate';
import type { BiomeMap } from './biomes';

export const PLACEMENT_VERSION = 'markers-v1';
const MARKER_IDS = ['player', 'enemy-1', 'enemy-2', 'enemy-3'] as const;

export interface OverworldMarker {
  readonly id: typeof MARKER_IDS[number];
  readonly kind: 'player' | 'enemy';
  readonly x: number;
  readonly y: number;
}

export interface OverworldState {
  readonly map: BiomeMap;
  readonly placementVersion: typeof PLACEMENT_VERSION;
  readonly markers: readonly OverworldMarker[];
}

export type PlacementResult =
  | { readonly ok: true; readonly state: OverworldState }
  | { readonly ok: false; readonly reason: string };

/** Four draws without replacement; terrain and battle RNG streams remain independent. */
export function createOverworld(map: BiomeMap): PlacementResult {
  if (map.width !== MAP_SIZE || map.height !== MAP_SIZE ||
      !Number.isSafeInteger(map.seed) || map.seed < 0 || map.seed > 0xffffffff ||
      !validMapCells(map.cells) || map.terrain.length !== map.cells.length ||
      !Array.from(map.cells).every((cell, i) =>
        (cell === 0 || cell === 1) && map.terrain[i] === `${map.biome}-${cell ? 'open' : 'blocked'}`)) {
    return { ok: false, reason: 'The map must have a valid connected 20 by 20 terrain layout.' };
  }
  const candidates = map.cells.flatMap((cell, i) => cell === 1 ? [i] : []);
  let rng = seedRng((map.seed ^ 0x4d41524b) >>> 0);
  const markers = MARKER_IDS.map((id, i): OverworldMarker => {
    const next = nextUint32(rng);
    rng = next.rng;
    const chosen = i + next.value % (candidates.length - i);
    [candidates[i], candidates[chosen]] = [candidates[chosen], candidates[i]];
    return { id, kind: i === 0 ? 'player' : 'enemy', x: candidates[i] % MAP_SIZE, y: Math.floor(candidates[i] / MAP_SIZE) };
  });
  return { ok: true, state: { map, placementVersion: PLACEMENT_VERSION, markers } };
}
