import type { MapRecord } from './types';

/** Fixed terrace: elevation-1 steps at y=4/7 lead to the elevation-2 stone court. */
export const ruinedApproach: MapRecord = {
  id: 'map:ruined_approach', width: 12, height: 12,
  cells: Array.from({ length: 144 }, (_, i) => {
    const x = i % 12, y = Math.floor(i / 12);
    const court = x >= 4 && x <= 7 && y >= 4 && y <= 7;
    const forest = (x === 2 || x === 9) && [3, 4, 7, 8].includes(y);
    return { x, y, elevation: court ? y === 4 || y === 7 ? 1 : 2 : 0,
      terrainId: court ? 'stone' : forest ? 'forest' : x === 3 || x === 8 ? 'grass_path' : 'grass' };
  }),
  spawns: [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 5, y: 9 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 6, y: 9 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 5, y: 10 },
    { id: 4, side: 'enemies', unitId: 'goblin_grunt', x: 4, y: 5 },
    { id: 5, side: 'enemies', unitId: 'goblin_archer', x: 7, y: 5 },
    { id: 6, side: 'enemies', unitId: 'goblin_grunt', x: 8, y: 3 },
  ],
};
