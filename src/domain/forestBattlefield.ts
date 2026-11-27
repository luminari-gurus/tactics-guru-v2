import { generatedBattlefieldMapId, type BattlefieldEncounter } from '../content/battlefieldTypes';
import type { MapRecord } from '../content/types';
import { hashJson } from './contentIdentity';
import { nextUint32, seedRng } from './rng';
import { manhattanDistance } from './targeting';

const SIZE = 12;

/** Two staggered treelines break sight across the board and funnel movement through clearings. */
export function forestCandidate(encounter: BattlefieldEncounter, seed: number, attempt: number | null): MapRecord {
  let rng = seedRng(Number.parseInt(hashJson({ seed, attempt, purpose: 'forest-attempt-v1' }).slice(-8), 16));
  const draw = (size: number) => {
    const next = nextUint32(rng);
    rng = next.rng;
    return next.value % size;
  };
  const treelines = attempt === null
    ? [{ y: 3, west: 2, east: 8 }, { y: 7, west: 3, east: 7 }]
    : [{ y: 2 + draw(3), west: 1 + draw(3), east: 7 + draw(3) },
      { y: 6 + draw(2), west: 1 + draw(3), east: 7 + draw(3) }];

  return {
    id: generatedBattlefieldMapId(encounter.id, 'forest-v1'),
    width: SIZE,
    height: SIZE,
    cells: Array.from({ length: SIZE * SIZE }, (_, index) => {
      const x = index % SIZE;
      const y = Math.floor(index / SIZE);
      const treeline = treelines.find(line => line.y === y);
      const crossing = treeline && [treeline.west, treeline.east].some(start => x >= start && x < start + 2);
      const forest = treeline && !crossing && encounter.roster.every(spawn => manhattanDistance(spawn, { x, y }) > 1);
      return { x, y, elevation: 0, terrainId: forest ? 'forest' : crossing ? 'grass_path' : 'grass' };
    }),
    spawns: encounter.roster.map(spawn => ({ ...spawn })),
  };
}
