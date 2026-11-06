import { battleCatalog } from './catalog';
import type { ContentCatalog, MapCell, MapId, MapRecord, TerrainRecord } from './types';

/**
 * Q*bert-style pyramid on a 7x7 grid. Cells with x + y <= 6 form the 28-cube
 * pyramid (rows of 1..7 cubes); the apex (0,0) is the top of the screen because
 * positive grid axes extend toward the viewer. Each row down is one elevation
 * step lower, so every orthogonal move is a one-step diagonal hop on screen,
 * exactly like Q*bert. Everything outside the pyramid is open air (`void`).
 */
export const QBERT_SIZE = 7;
export const QBERT_MAP_ID: MapId = 'map:qbert_pyramid';
const APEX_ELEVATION = QBERT_SIZE - 1;

export const isPyramidCell = (x: number, y: number): boolean => x >= 0 && y >= 0 && x + y <= APEX_ELEVATION;

export const qbertPyramid: MapRecord = {
  id: QBERT_MAP_ID, width: QBERT_SIZE, height: QBERT_SIZE,
  cells: Array.from({ length: QBERT_SIZE * QBERT_SIZE }, (_, i): MapCell => {
    const x = i % QBERT_SIZE, y = Math.floor(i / QBERT_SIZE);
    return isPyramidCell(x, y)
      ? { x, y, elevation: APEX_ELEVATION - (x + y), terrainId: 'stone' }
      : { x, y, elevation: 0, terrainId: 'void' };
  }),
  spawns: [
    // The party starts on the apex cube and the two cubes just below it.
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 0, y: 1 },
    // Enemies hold the bottom row: both corners and the centre cube.
    { id: 4, side: 'enemies', unitId: 'goblin_grunt', x: 0, y: 6 },
    { id: 5, side: 'enemies', unitId: 'goblin_archer', x: 3, y: 3 },
    { id: 6, side: 'enemies', unitId: 'goblin_grunt', x: 6, y: 0 },
  ],
};

/** Open air: blocks movement but not sight. The surface asset is required by the schema and never drawn. */
const voidTerrain: TerrainRecord = {
  id: 'void', surfaceAssetId: battleCatalog.terrains.stone.surfaceAssetId,
  moveCost: 1, walkable: false, blocksLineOfSight: false,
};

/** Unvalidated: BattleScene passes this through contentLoadPlan like the default catalog. */
export const qbertCatalog: ContentCatalog = {
  ...battleCatalog,
  maps: { ...battleCatalog.maps, [QBERT_MAP_ID]: qbertPyramid },
  terrains: { ...battleCatalog.terrains, void: voidTerrain },
};

/** Presentation-only look: blue cube tops, grey left faces, dark right faces, black sky. */
export const QBERT_BOARD_STYLE = {
  id: 'qbert',
  columnColors: { left: 0x9a9a9a, right: 0x3c3c52, top: 0x2f2fc8 },
  surfaceTint: 0x5a5aff,
  background: '#000000',
} as const;
