import { assert, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { battleCatalog } from '../../src/content/catalog';
import {
  EMBER_WASTES_BOSS_IDS, EMBER_WASTES_FAMILY_IDS, EMBER_WASTES_FAMILY_MELEE_IDS,
  emberWastesFamilyAssets, emberWastesFamilyBattleContent, emberWastesFamilyEnemies,
} from '../../src/content/emberWastesFamily';
import {
  cavernsFamilyDungeonBattleCatalog, forestBossDungeonBattleCatalog, forestFamilyDungeonBattleCatalog,
  goblinFamilyDungeonBattleCatalog, graveyardFamilyDungeonBattleCatalog, hobgoblinDungeonBattleCatalog,
  quarryFamilyDungeonBattleCatalog, wetlandsFamilyDungeonBattleCatalog, emberWastesFamilyDungeonBattleCatalog,
} from '../../src/content/dungeonEncounters';
import { validateContent } from '../../src/content/validate';
import { createBattle } from '../../src/domain/turns';
import { buildBoardPresentation } from '../../src/geometry/boardPresentation';
import { BOSS_SPRITE_CANVAS, BOSS_UNIT_ART, unitArtSize } from '../../src/geometry/canopy';
import type { MapRecord, SpawnRecord } from '../../src/content/types';

it('packages illustrated ember-wastes-family sprites and portraits like the other goblin units', () => {
  let runtimeBytes = 0;
  for (const id of EMBER_WASTES_FAMILY_IDS) {
    for (const kind of ['sprite', 'portrait'] as const) {
      const asset = emberWastesFamilyAssets[`asset:${id}_${kind}`], source = readFileSync(asset.sourcePath),
        runtime = readFileSync(`public${asset.runtimePath}`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
      expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
      expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
      if (asset.kind === 'unit-sprite') {
        expect(runtime).toEqual(source);
        if ((EMBER_WASTES_BOSS_IDS as readonly string[]).includes(id)) {
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
  expect(runtimeBytes).toBe(310165);
});

it('registers bestiary stats and abilities without joining existing encounter catalogs', () => {
  expect(validateContent(emberWastesFamilyDungeonBattleCatalog).ok).toBe(true);
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).toMatchObject(emberWastesFamilyEnemies);
  expect(emberWastesFamilyDungeonBattleCatalog.abilities['ability:basic_attack'].owners)
    .toEqual([...battleCatalog.abilities['ability:basic_attack'].owners, ...EMBER_WASTES_FAMILY_MELEE_IDS]);
  expect(emberWastesFamilyDungeonBattleCatalog.abilities['ability:shortbow_shot'].owners)
    .toEqual([...battleCatalog.abilities['ability:shortbow_shot'].owners, 'ember_cultist', 'pyre_oracle', 'smoke_wisp']);
  expect(battleCatalog.enemies).not.toHaveProperty('ash_crawler');
  expect(battleCatalog.enemies).not.toHaveProperty('kiln_saint');
  expect(hobgoblinDungeonBattleCatalog.enemies).not.toHaveProperty('ash_crawler');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ash_crawler');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('kiln_saint');
  expect(forestFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ash_crawler');
  expect(forestFamilyDungeonBattleCatalog.enemies).toHaveProperty('ash_hound');
  expect(forestFamilyDungeonBattleCatalog.enemies).toHaveProperty('cinder_archer');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('ash_crawler');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('kiln_saint');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ash_crawler');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('kiln_saint');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ash_crawler');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('kiln_saint');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ash_crawler');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('kiln_saint');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ash_crawler');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('kiln_saint');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cinder_imp');
  expect(goblinFamilyDungeonBattleCatalog.enemies).toHaveProperty('mire_goblin');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('mire_goblin');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_root_matriarch');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('lantern_hag');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('grimgor');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gorrak_the_breaker');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gravelord_kharrox');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('vorlach_the_hollow_crown');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ash_hound');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cinder_archer');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ironmaw_furnace_beast');
  for (const change of [
    (c: typeof emberWastesFamilyDungeonBattleCatalog) => {
      const { ash_crawler: _, ...enemies } = c.enemies;
      return { ...c, enemies };
    },
    (c: typeof emberWastesFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, ash_crawler: { ...c.enemies.ash_crawler, stats: { ...c.enemies.ash_crawler.stats, will: NaN } } },
    }),
    (c: typeof emberWastesFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, cinder_imp: { ...c.enemies.cinder_imp, spriteAssetId: 'asset:missing' as const } },
    }),
  ]) expect(validateContent(change(emberWastesFamilyDungeonBattleCatalog)).ok).toBe(false);
});

it('can create a battle that uses the registered units without changing production maps', () => {
  const spawns = [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 2, y: 0 },
    ...EMBER_WASTES_FAMILY_IDS.map((unitId, i): SpawnRecord => ({ id: i + 4, side: 'enemies', unitId, x: i, y: 2 })),
  ] satisfies readonly SpawnRecord[];
  const map: MapRecord = {
    id: 'map:ember_wastes_family_roster', width: 11, height: 3,
    cells: Array.from({ length: 33 }, (_, i) => ({ x: i % 11, y: Math.floor(i / 11), elevation: 0, terrainId: 'grass' })),
    spawns,
  };
  const catalog = emberWastesFamilyBattleContent({ ...battleCatalog, maps: { ...battleCatalog.maps, [map.id]: map } });
  const created = createBattle(map.id, 1, catalog);
  assert(created.ok);
  expect(created.state.units.filter(u => u.side === 'enemy').map(u => u.defId)).toEqual([...EMBER_WASTES_FAMILY_IDS]);
  expect(new Set(created.state.units.map(u => `${u.cell.x},${u.cell.y}`)).size).toBe(created.state.units.length);
  const board = buildBoardPresentation(catalog, map.id);
  expect(board.occupants).toHaveLength(14);
  for (const occupant of board.occupants) {
    const asset = catalog.assets[occupant.assetId];
    expect(asset.kind).toBe('unit-sprite');
    if (asset.kind !== 'unit-sprite') continue;
    expect(occupant.anchor).toEqual(asset.anchor);
    const boss = (EMBER_WASTES_BOSS_IDS as readonly string[]).includes(occupant.unitId);
    const expected = boss
      ? { width: 96, height: 120, anchor: BOSS_SPRITE_CANVAS.anchor }
      : { width: 64, height: 80, anchor: { x: 32, y: 76 } };
    expect({ width: asset.runtimeWidth, height: asset.runtimeHeight, anchor: asset.anchor }).toEqual(expected);
    if (boss) expect(unitArtSize(asset)).toEqual(BOSS_UNIT_ART);
  }
});
