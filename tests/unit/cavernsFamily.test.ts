import { assert, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { battleCatalog } from '../../src/content/catalog';
import {
  CAVERNS_BOSS_IDS, CAVERNS_FAMILY_IDS, CAVERNS_FAMILY_MELEE_IDS,
  cavernsFamilyAssets, cavernsFamilyBattleContent, cavernsFamilyEnemies,
} from '../../src/content/cavernsFamily';
import {
  cavernsFamilyDungeonBattleCatalog, forestBossDungeonBattleCatalog, forestFamilyDungeonBattleCatalog,
  goblinFamilyDungeonBattleCatalog, hobgoblinDungeonBattleCatalog, wetlandsFamilyDungeonBattleCatalog,
} from '../../src/content/dungeonEncounters';
import { validateContent } from '../../src/content/validate';
import { createBattle } from '../../src/domain/turns';
import { buildBoardPresentation } from '../../src/geometry/boardPresentation';
import { BOSS_SPRITE_CANVAS, BOSS_UNIT_ART, unitArtSize } from '../../src/geometry/canopy';
import type { MapRecord, SpawnRecord } from '../../src/content/types';

it('packages illustrated caverns-family sprites and portraits like the other goblin units', () => {
  let runtimeBytes = 0;
  for (const id of CAVERNS_FAMILY_IDS) {
    for (const kind of ['sprite', 'portrait'] as const) {
      const asset = cavernsFamilyAssets[`asset:${id}_${kind}`], source = readFileSync(asset.sourcePath),
        runtime = readFileSync(`public${asset.runtimePath}`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
      expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
      expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
      if (asset.kind === 'unit-sprite') {
        expect(runtime).toEqual(source);
        if ((CAVERNS_BOSS_IDS as readonly string[]).includes(id)) {
          expect([asset.runtimeWidth, asset.runtimeHeight]).toEqual([BOSS_SPRITE_CANVAS.width, BOSS_SPRITE_CANVAS.height]);
          expect(asset.anchor).toEqual(BOSS_SPRITE_CANVAS.anchor);
          expect(unitArtSize(asset)).toEqual(BOSS_UNIT_ART);
        } else {
          expect(asset.anchor).toEqual({ x: 32, y: 76 });
        }
      } else {
        expect(createHash('sha256').update(runtime).digest('hex'))
          .toBe(asset.provenance.productionNotes.match(/Runtime SHA-256 ([a-f0-9]{64})/)?.[1]);
      }
      runtimeBytes += runtime.length;
    }
  }
  expect(runtimeBytes).toBe(322936);
});

it('registers bestiary stats and abilities without joining existing encounter catalogs', () => {
  expect(validateContent(cavernsFamilyDungeonBattleCatalog).ok).toBe(true);
  expect(cavernsFamilyDungeonBattleCatalog.enemies).toMatchObject(cavernsFamilyEnemies);
  expect(cavernsFamilyDungeonBattleCatalog.abilities['ability:basic_attack'].owners)
    .toEqual([...battleCatalog.abilities['ability:basic_attack'].owners, ...CAVERNS_FAMILY_MELEE_IDS]);
  expect(cavernsFamilyDungeonBattleCatalog.abilities['ability:shortbow_shot'].owners)
    .toEqual([...battleCatalog.abilities['ability:shortbow_shot'].owners, 'fungus_slinger', 'crystal_hermit']);
  expect(battleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(battleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(hobgoblinDungeonBattleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(forestFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(forestBossDungeonBattleCatalog.enemies).toHaveProperty('hollow_root_matriarch');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(goblinFamilyDungeonBattleCatalog.enemies).toHaveProperty('mire_goblin');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('mire_goblin');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_root_matriarch');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('lantern_hag');
  for (const change of [
    (c: typeof cavernsFamilyDungeonBattleCatalog) => {
      const { cave_skulk: _, ...enemies } = c.enemies;
      return { ...c, enemies };
    },
    (c: typeof cavernsFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, cave_skulk: { ...c.enemies.cave_skulk, stats: { ...c.enemies.cave_skulk.stats, will: NaN } } },
    }),
    (c: typeof cavernsFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, spore_mite_cluster: { ...c.enemies.spore_mite_cluster, spriteAssetId: 'asset:missing' as const } },
    }),
  ]) expect(validateContent(change(cavernsFamilyDungeonBattleCatalog)).ok).toBe(false);
});

it('can create a battle that uses the registered units without changing production maps', () => {
  const spawns = [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 2, y: 0 },
    ...CAVERNS_FAMILY_IDS.map((unitId, i): SpawnRecord => ({ id: i + 4, side: 'enemies', unitId, x: i, y: 2 })),
  ] satisfies readonly SpawnRecord[];
  const map: MapRecord = {
    id: 'map:caverns_family_roster', width: 11, height: 3,
    cells: Array.from({ length: 33 }, (_, i) => ({ x: i % 11, y: Math.floor(i / 11), elevation: 0, terrainId: 'grass' })),
    spawns,
  };
  const catalog = cavernsFamilyBattleContent({ ...battleCatalog, maps: { ...battleCatalog.maps, [map.id]: map } });
  const created = createBattle(map.id, 1, catalog);
  assert(created.ok);
  expect(created.state.units.filter(u => u.side === 'enemy').map(u => u.defId)).toEqual([...CAVERNS_FAMILY_IDS]);
  expect(new Set(created.state.units.map(u => `${u.cell.x},${u.cell.y}`)).size).toBe(created.state.units.length);
  const board = buildBoardPresentation(catalog, map.id);
  expect(board.occupants).toHaveLength(14);
  for (const occupant of board.occupants) {
    const asset = catalog.assets[occupant.assetId];
    expect(asset.kind).toBe('unit-sprite');
    if (asset.kind !== 'unit-sprite') continue;
    expect(occupant.anchor).toEqual(asset.anchor);
    const boss = (CAVERNS_BOSS_IDS as readonly string[]).includes(occupant.unitId);
    const expected = boss
      ? { width: 96, height: 120, anchor: BOSS_SPRITE_CANVAS.anchor }
      : { width: 64, height: 80, anchor: { x: 32, y: 76 } };
    expect({ width: asset.runtimeWidth, height: asset.runtimeHeight, anchor: asset.anchor }).toEqual(expected);
    if (boss) expect(unitArtSize(asset)).toEqual(BOSS_UNIT_ART);
  }
});
