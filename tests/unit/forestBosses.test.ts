import { assert, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { battleCatalog } from '../../src/content/catalog';
import { FOREST_BOSS_IDS, forestBossAssets, forestBossBattleContent, forestBossEnemies } from '../../src/content/forestBosses';
import { forestBossDungeonBattleCatalog, forestFamilyDungeonBattleCatalog, goblinFamilyDungeonBattleCatalog, hobgoblinDungeonBattleCatalog } from '../../src/content/dungeonEncounters';
import { validateContent } from '../../src/content/validate';
import { createBattle } from '../../src/domain/turns';
import { buildBoardPresentation } from '../../src/geometry/boardPresentation';
import { BOSS_SPRITE_CANVAS, BOSS_UNIT_ART, unitArtSize } from '../../src/geometry/canopy';
import type { MapRecord, SpawnRecord } from '../../src/content/types';

it('packages illustrated forest-boss sprites at native 96×120 with 96×96 portraits', () => {
  let runtimeBytes = 0;
  for (const id of FOREST_BOSS_IDS) {
    for (const kind of ['sprite', 'portrait'] as const) {
      const asset = forestBossAssets[`asset:${id}_${kind}`], source = readFileSync(asset.sourcePath),
        runtime = readFileSync(`public${asset.runtimePath}`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
      expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
      expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
      if (asset.kind === 'unit-sprite') {
        expect(runtime).toEqual(source);
        expect([asset.runtimeWidth, asset.runtimeHeight]).toEqual([BOSS_SPRITE_CANVAS.width, BOSS_SPRITE_CANVAS.height]);
        expect(asset.anchor).toEqual(BOSS_SPRITE_CANVAS.anchor);
        expect(unitArtSize(asset)).toEqual(BOSS_UNIT_ART);
      } else {
        expect(createHash('sha256').update(runtime).digest('hex'))
          .toBe(asset.provenance.productionNotes.match(/Runtime SHA-256 ([a-f0-9]{64})/)?.[1]);
      }
      runtimeBytes += runtime.length;
    }
  }
  expect(runtimeBytes).toBe(120028);
});

it('registers bestiary stats and Basic Attack without joining existing encounter catalogs', () => {
  expect(validateContent(forestBossDungeonBattleCatalog).ok).toBe(true);
  expect(forestBossDungeonBattleCatalog.enemies).toMatchObject(forestBossEnemies);
  expect(forestBossDungeonBattleCatalog.abilities['ability:basic_attack'].owners)
    .toEqual([...battleCatalog.abilities['ability:basic_attack'].owners, ...FOREST_BOSS_IDS]);
  expect(battleCatalog.enemies).not.toHaveProperty('hollow_root_matriarch');
  expect(battleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(hobgoblinDungeonBattleCatalog.enemies).not.toHaveProperty('green_warden');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ironmaw_furnace_beast');
  expect(forestFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_root_matriarch');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('briar_thrall');
  for (const change of [
    (c: typeof forestBossDungeonBattleCatalog) => {
      const { green_warden: _, ...enemies } = c.enemies;
      return { ...c, enemies };
    },
    (c: typeof forestBossDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, green_warden: { ...c.enemies.green_warden, stats: { ...c.enemies.green_warden.stats, will: NaN } } },
    }),
    (c: typeof forestBossDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, ironmaw_furnace_beast: { ...c.enemies.ironmaw_furnace_beast, spriteAssetId: 'asset:missing' as const } },
    }),
  ]) expect(validateContent(change(forestBossDungeonBattleCatalog)).ok).toBe(false);
});

it('can create a single-tile battle with bosses beside ordinary units without changing production maps', () => {
  const spawns = [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 2, y: 0 },
    ...FOREST_BOSS_IDS.map((unitId, i): SpawnRecord => ({ id: i + 4, side: 'enemies', unitId, x: i, y: 2 })),
  ] satisfies readonly SpawnRecord[];
  const map: MapRecord = {
    id: 'map:forest_boss_roster', width: 3, height: 3,
    cells: Array.from({ length: 9 }, (_, i) => ({ x: i % 3, y: Math.floor(i / 3), elevation: 0, terrainId: 'grass' })),
    spawns,
  };
  const catalog = forestBossBattleContent({ ...battleCatalog, maps: { ...battleCatalog.maps, [map.id]: map } });
  const created = createBattle(map.id, 1, catalog);
  assert(created.ok);
  const enemies = created.state.units.filter(u => u.side === 'enemy');
  expect(enemies.map(u => u.defId)).toEqual([...FOREST_BOSS_IDS]);
  expect(new Set(created.state.units.map(u => `${u.cell.x},${u.cell.y}`)).size).toBe(created.state.units.length);
  expect(enemies.every(u => catalog.maps[map.id].cells.some(cell => cell.x === u.cell.x && cell.y === u.cell.y))).toBe(true);
  const board = buildBoardPresentation(catalog, map.id);
  expect(board.occupants).toHaveLength(6);
  for (const occupant of board.occupants) {
    const asset = catalog.assets[occupant.assetId];
    expect(asset.kind).toBe('unit-sprite');
    if (asset.kind !== 'unit-sprite') continue;
    expect(occupant.anchor).toEqual(asset.anchor);
    expect(occupant.tile).toEqual(board.tiles.find(tile => tile.x === occupant.tile.x && tile.y === occupant.tile.y));
    const expected = occupant.side === 'heroes' ? { width: 64, height: 80, anchor: { x: 32, y: 76 } }
      : { width: 96, height: 120, anchor: BOSS_SPRITE_CANVAS.anchor };
    expect({ width: asset.runtimeWidth, height: asset.runtimeHeight, anchor: asset.anchor }).toEqual(expected);
  }
  expect(validateContent({
    ...catalog,
    maps: { ...catalog.maps, [map.id]: { ...map, spawns: [...spawns, { id: 7, side: 'enemies', unitId: 'green_warden', x: 0, y: 2 }] } },
  }).ok).toBe(false);
});
