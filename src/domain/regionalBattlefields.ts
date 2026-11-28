import { generatedBattlefieldMapId, type BattlefieldEncounter } from '../content/battlefieldTypes';
import type { MapRecord, TerrainId } from '../content/types';
import { hashJson } from './contentIdentity';
import { nextUint32, seedRng } from './rng';
import { manhattanDistance } from './targeting';

const SIZE = 12;
type Draw = (limit: number) => number;
type Tile = (x: number, y: number) => TerrainId;
type Region = {
  readonly deployment: TerrainId;
  readonly layout: (draw: Draw) => Tile;
};
const inside = (value: number, start: number, size: number) => value >= start && value < start + size;

const regions = {
  // Water and mud cost movement. The level causeway gives jump-0 units a fast crossing.
  'wetlands-v1': {
    deployment: 'grass_path',
    layout: draw => {
      const westPool = 3 + draw(4), eastPool = 3 + draw(4), path = 5 + draw(2);
      return (x, y) => {
        if (x === path || (x === path + 1 && y >= 4 && y <= 7)) return 'grass_path';
        const distance = Math.min(Math.abs(x - 2) + Math.abs(y - westPool), Math.abs(x - 9) + Math.abs(y - eastPool));
        return distance <= 1 ? 'water' : distance <= 3 ? 'mud' : 'grass';
      };
    },
  },
  // Crystal pillars make two offset chambers, with floor around each pillar.
  'underdeep-caverns-v1': {
    deployment: 'stone',
    layout: draw => {
      const mirror = draw(2), upper = 2 + draw(2), lower = 7 + draw(2);
      return (x, y) => {
        const column = mirror ? SIZE - 1 - x : x;
        if ((column <= 2 && y <= upper) || (column >= 9 && y >= lower)) return 'rubble';
        if ((inside(column, 3, 2) && inside(y, 4, 2)) || (inside(column, 7, 2) && inside(y, 6, 2))) return 'crystal';
        return 'stone';
      };
    },
  },
  // Staggered rows of cut blocks flank a broad stone haul road.
  'quarry-v1': {
    deployment: 'sand',
    layout: draw => {
      const road = 4 + draw(3), face = 3 + draw(3), opposite = 6 + draw(3);
      return (x, y) => {
        if (inside(x, road, 2)) return 'stone';
        if ((inside(x, 1, 3) && y === face) || (inside(x, 8, 3) && y === opposite)) return 'rubble';
        if ((x === 2 && y === face + 1) || (x === 9 && y === opposite - 1)) return 'stone';
        return 'sand';
      };
    },
  },
  // Graves break ranged sight down two sides of a paved aisle.
  'graveyard-v1': {
    deployment: 'grass_path',
    layout: draw => {
      const aisle = 5 + draw(2), offset = draw(2), cross = 4 + draw(4);
      return (x, y) => {
        if (x === aisle || y === cross) return 'stone';
        if ((x === 2 || x === 4 || x === 8 || x === 10) && inside(y, 3, 6) && (y + x / 2 + offset) % 2 === 0) return 'rubble';
        return 'grass_path';
      };
    },
  },
  // Lava blocks movement while staying transparent to ranged attacks.
  'ember-wastes-v1': {
    deployment: 'ash',
    layout: draw => {
      const fissure = 4 + draw(3), turn = 4 + draw(4), west = 1 + draw(2), east = 8 + draw(2);
      return (x, y) => {
        const bank = fissure + Number(x >= turn);
        if (inside(y, bank, 2)) return inside(x, west, 2) || inside(x, east, 2) ? 'stone' : 'lava';
        if ((x === 0 && y === bank - 1) || (x === SIZE - 1 && y === bank + 2)) return 'rubble';
        return 'ash';
      };
    },
  },
  // Ice gives the party a faster route through snow, with offset rock ridges.
  'winter-tundra-v1': {
    deployment: 'ice',
    layout: draw => {
      const west = 2 + draw(3), east = 7 + draw(3), cross = 4 + draw(4);
      return (x, y) => {
        if (x === west || x === east || (y === cross && x >= west && x <= east)) return 'ice';
        if ((x === west - 1 && inside(y, 4, 3)) || (x === east + 1 && inside(y, 3, 3))) return 'rubble';
        return 'snow';
      };
    },
  },
  // Alternating surf and beach widths create a coastal route with a high-cost flank.
  'storm-coast-v1': {
    deployment: 'sand',
    layout: draw => {
      const mirror = draw(2), coast = 2 + draw(2), inlet = 3 + draw(3), jetty = 6 + draw(3);
      return (x, y) => {
        const column = mirror ? SIZE - 1 - x : x;
        const surf = coast + Number(inside(y, inlet, 3));
        if (inside(y, jetty, 2) && column <= surf + 1) return 'stone';
        if (column < surf) return 'water';
        if (column >= 9 && inside(y, inlet + 1, 3)) return 'rubble';
        return 'sand';
      };
    },
  },
  // Broken masonry defines a courtyard with two entrances and exterior flanks.
  'shattered-citadel-v1': {
    deployment: 'stone',
    layout: draw => {
      const north = 2 + draw(2), south = 7 + draw(2), westGate = 4 + draw(2), eastGate = 5 + draw(2);
      return (x, y) => {
        const interior = inside(x, 2, 8) && y >= north && y <= south;
        if (!interior) return 'grass_path';
        if (y === north || y === south) return inside(x, y === north ? westGate : eastGate, 2) ? 'stone' : 'rubble';
        if ((x === 2 || x === 9) && (y === north + 1 || y === south - 1)) return 'rubble';
        return 'stone';
      };
    },
  },
} satisfies Record<string, Region>;

type RegionalProfile = keyof typeof regions;
export const regionalBattlefieldCandidates = Object.fromEntries(
  (Object.keys(regions) as RegionalProfile[]).map(profile => {
    const { deployment, layout } = regions[profile];
    return [profile, (encounter: BattlefieldEncounter, seed: number, attempt: number | null): MapRecord => {
      // The fallback seed is fixed per profile, and uses the same protected deployment.
      let rng = seedRng(Number.parseInt(hashJson({ profile, seed: attempt === null ? 0 : seed, attempt }).slice(-8), 16));
      const tile = layout(limit => {
        const next = nextUint32(rng);
        rng = next.rng;
        return next.value % limit;
      });
      return {
        id: generatedBattlefieldMapId(encounter.id, profile),
        width: SIZE,
        height: SIZE,
        cells: Array.from({ length: SIZE * SIZE }, (_, index) => {
          const x = index % SIZE, y = Math.floor(index / SIZE);
          const protectedCell = encounter.roster.some(spawn => manhattanDistance(spawn, { x, y }) <= 1);
          return { x, y, elevation: 0, terrainId: protectedCell ? deployment : tile(x, y) };
        }),
        spawns: encounter.roster.map(spawn => ({ ...spawn })),
      };
    }];
  }),
) as Record<RegionalProfile, (encounter: BattlefieldEncounter, seed: number, attempt: number | null) => MapRecord>;
