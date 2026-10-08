import { TERRAIN_TEXTURE_SPEC } from '../../../src/content/constants';
import type { AssetRecord, ContentCatalog, MapRecord, SpawnRecord, UnitStats } from '../../../src/content/types';

// Tiny synthetic fixture, deliberately not the authored battle map or production catalog.
export const mapFixture = {
  id: 'map:contract-fixture', width: 1, height: 1,
  cells: [{ x: 0, y: 0, elevation: 0, terrainId: 'grass' }],
  spawns: [{ id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 }],
} as const satisfies MapRecord;
export const statsFixture = {
  maxHp: 18, move: 4, jump: 1, accuracy: 4, armorClass: 14, power: 3, dexterity: 0, will: 1,
} as const satisfies UnitStats;
export const surfaceFixture = {
  id: 'asset:fixture-grass', kind: 'terrain-surface',
  sourcePath: '/fixtures/grass-source.png', runtimePath: '/fixtures/grass.png',
  sourceWidth: 1024, sourceHeight: 1024, runtimeWidth: 256, runtimeHeight: 256,
  format: 'png', textureSpec: TERRAIN_TEXTURE_SPEC,
  provenance: { origin: 'generated', tool: 'fixture-only', generatedAt: '2026-10-07',
    prompt: 'Synthetic contract fixture; no image generated.', referenceAssetIds: [],
    sourceSha256: '0'.repeat(64), rightsNote: 'No artwork in this fixture.', productionNotes: 'Test only.' },
} as const satisfies AssetRecord;

// These rejection fixtures must continue to fail strict TypeScript compilation.
// @ts-expect-error hero spawns cannot reference enemies
const invalidSpawn: SpawnRecord = { id: 1, side: 'heroes', unitId: 'goblin_grunt', x: 0, y: 0 };
// @ts-expect-error terrain surfaces cannot use canonical provenance
const invalidSurface: AssetRecord = { ...surfaceFixture, provenance: { origin: 'canonical', repository: 'legacy', revision: 'abc', originalPath: 'tile.png', sourceSha256: '', rightsNote: '', productionNotes: '' } };
void invalidSpawn;
void invalidSurface;

const spriteFixture = {
  ...surfaceFixture, id: 'asset:fixture-sprite', kind: 'unit-sprite', anchor: { x: 128, y: 240 },
} as const satisfies AssetRecord;
const portraitFixture = {
  ...surfaceFixture, id: 'asset:fixture-portrait', kind: 'portrait',
} as const satisfies AssetRecord;
const fixtureArt = { spriteAssetId: spriteFixture.id, portraitAssetId: portraitFixture.id };
const fixtureTerrain = { surfaceAssetId: surfaceFixture.id, moveCost: 1, walkable: true, blocksLineOfSight: false };
export const catalogFixture = {
  maps: { [mapFixture.id]: mapFixture },
  heroes: {
    fighter: { id: 'fighter', kind: 'hero', stats: statsFixture, ...fixtureArt },
    ranger: { id: 'ranger', kind: 'hero', stats: statsFixture, ...fixtureArt },
    mage: { id: 'mage', kind: 'hero', stats: statsFixture, ...fixtureArt },
  },
  enemies: {
    goblin_grunt: { id: 'goblin_grunt', kind: 'enemy', stats: statsFixture, ...fixtureArt },
    goblin_archer: { id: 'goblin_archer', kind: 'enemy', stats: statsFixture, ...fixtureArt },
  },
  terrains: {
    grass: { id: 'grass', ...fixtureTerrain },
    grass_path: { id: 'grass_path', ...fixtureTerrain },
    stone: { id: 'stone', ...fixtureTerrain },
    forest: { id: 'forest', ...fixtureTerrain },
    water: { ...fixtureTerrain, id: 'water', walkable: false },
  },
  assets: { [surfaceFixture.id]: surfaceFixture, [spriteFixture.id]: spriteFixture, [portraitFixture.id]: portraitFixture },
} as const satisfies ContentCatalog;
