import type { MapRecord } from './types';

/** Fixed crossing: water at y=5/6, two dry approaches at x=3/8, forest cover. */
export const woodlandCrossing: MapRecord = {
  id: 'map:woodland_crossing', width: 12, height: 12,
  cells: Array.from({ length: 144 }, (_, i) => {
    const x = i % 12, y = Math.floor(i / 12);
    const water = (y === 5 || y === 6) && x !== 3 && x !== 8;
    const forest = (x === 1 || x === 10) && [2, 3, 8, 9].includes(y);
    return { x, y, elevation: y === 2 && x >= 6 && x <= 8 ? 1 : 0,
      terrainId: water ? 'water' : forest ? 'forest' : x === 3 || x === 8 ? 'grass_path' : y === 2 && x >= 6 && x <= 8 ? 'stone' : 'grass' };
  }),
  spawns: [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 3, y: 9 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 4, y: 9 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 3, y: 10 },
    { id: 4, side: 'enemies', unitId: 'goblin_grunt', x: 3, y: 3 },
    { id: 5, side: 'enemies', unitId: 'goblin_archer', x: 7, y: 2 },
    { id: 6, side: 'enemies', unitId: 'goblin_grunt', x: 8, y: 4 },
  ],
};
