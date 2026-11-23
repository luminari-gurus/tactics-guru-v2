import { assert, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { battleCatalog } from '../../src/content/catalog';
import {
  WINTER_TUNDRA_BOSS_IDS, WINTER_TUNDRA_FAMILY_IDS, WINTER_TUNDRA_FAMILY_MELEE_IDS,
  winterTundraFamilyAssets, winterTundraFamilyBattleContent, winterTundraFamilyEnemies,
} from '../../src/content/winterTundraFamily';
import {
  cavernsFamilyDungeonBattleCatalog, forestBossDungeonBattleCatalog, forestFamilyDungeonBattleCatalog,
  goblinFamilyDungeonBattleCatalog, graveyardFamilyDungeonBattleCatalog, hobgoblinDungeonBattleCatalog,
  quarryFamilyDungeonBattleCatalog, wetlandsFamilyDungeonBattleCatalog, emberWastesFamilyDungeonBattleCatalog,
  winterTundraFamilyDungeonBattleCatalog,
} from '../../src/content/dungeonEncounters';
import { validateContent } from '../../src/content/validate';
import { createBattle } from '../../src/domain/turns';
import { buildBoardPresentation } from '../../src/geometry/boardPresentation';
import { BOSS_SPRITE_CANVAS, BOSS_UNIT_ART, unitArtSize } from '../../src/geometry/canopy';
import type { MapRecord, SpawnRecord } from '../../src/content/types';

it('packages illustrated winter-tundra-family sprites and portraits like the other goblin units', () => {
  let runtimeBytes = 0;
  for (const id of WINTER_TUNDRA_FAMILY_IDS) {
    for (const kind of ['sprite', 'portrait'] as const) {
      const asset = winterTundraFamilyAssets[`asset:${id}_${kind}`], source = readFileSync(asset.sourcePath),
        runtime = readFileSync(`public${asset.runtimePath}`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
      expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
      expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
      if (asset.kind === 'unit-sprite') {
        expect(runtime).toEqual(source);
        if ((WINTER_TUNDRA_BOSS_IDS as readonly string[]).includes(id)) {
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
  expect(runtimeBytes).toBe(318977);
});

it('registers bestiary stats and abilities without joining existing encounter catalogs', () => {
  expect(validateContent(winterTundraFamilyDungeonBattleCatalog).ok).toBe(true);
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).toMatchObject(winterTundraFamilyEnemies);
  expect(winterTundraFamilyDungeonBattleCatalog.abilities['ability:basic_attack'].owners)
    .toEqual([...battleCatalog.abilities['ability:basic_attack'].owners, ...WINTER_TUNDRA_FAMILY_MELEE_IDS]);
  expect(winterTundraFamilyDungeonBattleCatalog.abilities['ability:shortbow_shot'].owners)
    .toEqual([...battleCatalog.abilities['ability:shortbow_shot'].owners, 'drift_archer', 'rime_shaman', 'ice_wraith', 'aurora_seer']);
  expect(battleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(battleCatalog.enemies).not.toHaveProperty('hroth_whitehorn_king');
  expect(hobgoblinDungeonBattleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hroth_whitehorn_king');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('rime_shaman');
  expect(forestFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('hroth_whitehorn_king');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hroth_whitehorn_king');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hroth_whitehorn_king');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hroth_whitehorn_king');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hroth_whitehorn_king');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ice_wraith');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hroth_whitehorn_king');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('rime_shaman');
  expect(goblinFamilyDungeonBattleCatalog.enemies).toHaveProperty('mire_goblin');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('mire_goblin');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_root_matriarch');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('lantern_hag');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('grimgor');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gorrak_the_breaker');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gravelord_kharrox');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('vorlach_the_hollow_crown');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ash_hound');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cinder_archer');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ironmaw_furnace_beast');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('kiln_saint');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('dust_wraith');
  for (const change of [
    (c: typeof winterTundraFamilyDungeonBattleCatalog) => {
      const { frost_gnawer: _, ...enemies } = c.enemies;
      return { ...c, enemies };
    },
    (c: typeof winterTundraFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, frost_gnawer: { ...c.enemies.frost_gnawer, stats: { ...c.enemies.frost_gnawer.stats, will: NaN } } },
    }),
    (c: typeof winterTundraFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, rime_shaman: { ...c.enemies.rime_shaman, spriteAssetId: 'asset:missing' as const } },
    }),
  ]) expect(validateContent(change(winterTundraFamilyDungeonBattleCatalog)).ok).toBe(false);
});

it('can create a battle that uses the registered units without changing production maps', () => {
  const spawns = [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 2, y: 0 },
    ...WINTER_TUNDRA_FAMILY_IDS.map((unitId, i): SpawnRecord => ({ id: i + 4, side: 'enemies', unitId, x: i, y: 2 })),
  ] satisfies readonly SpawnRecord[];
  const map: MapRecord = {
    id: 'map:winter_tundra_family_roster', width: 11, height: 3,
    cells: Array.from({ length: 33 }, (_, i) => ({ x: i % 11, y: Math.floor(i / 11), elevation: 0, terrainId: 'grass' })),
    spawns,
  };
  const catalog = winterTundraFamilyBattleContent({ ...battleCatalog, maps: { ...battleCatalog.maps, [map.id]: map } });
  const created = createBattle(map.id, 1, catalog);
  assert(created.ok);
  expect(created.state.units.filter(u => u.side === 'enemy').map(u => u.defId)).toEqual([...WINTER_TUNDRA_FAMILY_IDS]);
  expect(new Set(created.state.units.map(u => `${u.cell.x},${u.cell.y}`)).size).toBe(created.state.units.length);
  const board = buildBoardPresentation(catalog, map.id);
  expect(board.occupants).toHaveLength(14);
  for (const occupant of board.occupants) {
    const asset = catalog.assets[occupant.assetId];
    expect(asset.kind).toBe('unit-sprite');
    if (asset.kind !== 'unit-sprite') continue;
    expect(occupant.anchor).toEqual(asset.anchor);
    const boss = (WINTER_TUNDRA_BOSS_IDS as readonly string[]).includes(occupant.unitId);
    const expected = boss
      ? { width: 96, height: 120, anchor: BOSS_SPRITE_CANVAS.anchor }
      : { width: 64, height: 80, anchor: { x: 32, y: 76 } };
    expect({ width: asset.runtimeWidth, height: asset.runtimeHeight, anchor: asset.anchor }).toEqual(expected);
    if (boss) expect(unitArtSize(asset)).toEqual(BOSS_UNIT_ART);
  }
});
