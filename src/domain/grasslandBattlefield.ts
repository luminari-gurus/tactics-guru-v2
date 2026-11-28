import { generatedBattlefieldMapId, type BattlefieldEncounter } from '../content/battlefieldTypes';
import type { MapRecord } from '../content/types';
import { hashJson } from './contentIdentity';
import { nextUint32, seedRng } from './rng';
import { manhattanDistance } from './targeting';

const SIZE = 12;

/** Open meadow with a winding track and two sight-blocking copses on its flanks. */
export function grasslandCandidate(encounter: BattlefieldEncounter, seed: number, attempt: number | null): MapRecord {
  const purpose = 'grassland-attempt-v1';
  let rng = seedRng(Number.parseInt(hashJson({ seed, attempt, purpose }).slice(-8), 16));
  const draw = (size: number) => {
    const next = nextUint32(rng);
    rng = next.rng;
    return next.value % size;
  };
  // The fallback is the same level meadow and open approaches for every seed.
  const west = attempt === null ? { x: 1, y: 4 } : { x: 1 + draw(2), y: 3 + draw(5) };
  const east = attempt === null ? { x: 9, y: 6 } : { x: 9 + draw(2), y: 3 + draw(5) };
  const turn = attempt === null ? 5 : 3 + draw(6);
  const trackX = attempt === null ? 5 : 4 + draw(3);

  return {
    id: generatedBattlefieldMapId(encounter.id, 'grassland-v1'),
    width: SIZE,
    height: SIZE,
    cells: Array.from({ length: SIZE * SIZE }, (_, index) => {
      const x = index % SIZE;
      const y = Math.floor(index / SIZE);
      const inCopse = [west, east].some(copse => x >= copse.x && x < copse.x + 2 && y >= copse.y && y < copse.y + 2);
      const forest = inCopse && encounter.roster.every(spawn => manhattanDistance(spawn, { x, y }) > 1);
      const onTrack = y === turn ? x >= trackX && x <= trackX + 1 : x === trackX + Number(y > turn);
      return { x, y, elevation: 0, terrainId: forest ? 'forest' : onTrack ? 'grass_path' : 'grass' };
    }),
    spawns: encounter.roster.map(spawn => ({ ...spawn })),
  };
}
