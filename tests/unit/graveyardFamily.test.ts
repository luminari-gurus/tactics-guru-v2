import { assert, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { battleCatalog } from '../../src/content/catalog';
import {
  GRAVEYARD_BOSS_IDS, GRAVEYARD_FAMILY_IDS, GRAVEYARD_FAMILY_MELEE_IDS,
  graveyardFamilyAssets, graveyardFamilyBattleContent, graveyardFamilyEnemies,
} from '../../src/content/graveyardFamily';
import {
  cavernsFamilyDungeonBattleCatalog, forestBossDungeonBattleCatalog, forestFamilyDungeonBattleCatalog,
  goblinFamilyDungeonBattleCatalog, graveyardFamilyDungeonBattleCatalog, hobgoblinDungeonBattleCatalog,
  quarryFamilyDungeonBattleCatalog, wetlandsFamilyDungeonBattleCatalog,
} from '../../src/content/dungeonEncounters';
import { validateContent } from '../../src/content/validate';
import { createBattle } from '../../src/domain/turns';
import { buildBoardPresentation } from '../../src/geometry/boardPresentation';
import { BOSS_SPRITE_CANVAS, BOSS_UNIT_ART, unitArtSize } from '../../src/geometry/canopy';
import type { MapRecord, SpawnRecord } from '../../src/content/types';

it('packages illustrated graveyard-family sprites and portraits like the other goblin units', () => {
  let runtimeBytes = 0;
  for (const id of GRAVEYARD_FAMILY_IDS) {
    for (const kind of ['sprite', 'portrait'] as const) {
      const asset = graveyardFamilyAssets[`asset:${id}_${kind}`], source = readFileSync(asset.sourcePath),
        runtime = readFileSync(`public${asset.runtimePath}`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
      expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
      expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
      if (asset.kind === 'unit-sprite') {
        expect(runtime).toEqual(source);
        if ((GRAVEYARD_BOSS_IDS as readonly string[]).includes(id)) {
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
  expect(runtimeBytes).toBe(474769);
});

it('registers bestiary stats and abilities without joining existing encounter catalogs', () => {
  expect(validateContent(graveyardFamilyDungeonBattleCatalog).ok).toBe(true);
  expect(graveyardFamilyDungeonBattleCatalog.enemies).toMatchObject(graveyardFamilyEnemies);
  expect(graveyardFamilyDungeonBattleCatalog.abilities['ability:basic_attack'].owners)
    .toEqual([...battleCatalog.abilities['ability:basic_attack'].owners, ...GRAVEYARD_FAMILY_MELEE_IDS]);
  expect(graveyardFamilyDungeonBattleCatalog.abilities['ability:shortbow_shot'].owners)
    .toEqual([...battleCatalog.abilities['ability:shortbow_shot'].owners, 'shard_hurler', 'skeleton_archer']);
  expect(battleCatalog.enemies).not.toHaveProperty('bone_pickman');
  expect(battleCatalog.enemies).not.toHaveProperty('gravelord_kharrox');
  expect(battleCatalog.enemies).not.toHaveProperty('vorlach_the_hollow_crown');
  expect(hobgoblinDungeonBattleCatalog.enemies).not.toHaveProperty('bone_pickman');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('bone_pickman');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gravelord_kharrox');
  expect(forestFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('bone_pickman');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('bone_pickman');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('gravelord_kharrox');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('bone_pickman');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('vorlach_the_hollow_crown');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('bone_pickman');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gravelord_kharrox');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('vorlach_the_hollow_crown');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('bone_pickman');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gravelord_kharrox');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('vorlach_the_hollow_crown');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('skeleton_archer');
  expect(goblinFamilyDungeonBattleCatalog.enemies).toHaveProperty('mire_goblin');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('mire_goblin');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_root_matriarch');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('lantern_hag');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('grimgor');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gorrak_the_breaker');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gravelord_kharrox_boss');
  for (const change of [
    (c: typeof graveyardFamilyDungeonBattleCatalog) => {
      const { bone_pickman: _, ...enemies } = c.enemies;
      return { ...c, enemies };
    },
    (c: typeof graveyardFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, bone_pickman: { ...c.enemies.bone_pickman, stats: { ...c.enemies.bone_pickman.stats, will: NaN } } },
    }),
    (c: typeof graveyardFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, crypt_rat: { ...c.enemies.crypt_rat, spriteAssetId: 'asset:missing' as const } },
    }),
  ]) expect(validateContent(change(graveyardFamilyDungeonBattleCatalog)).ok).toBe(false);
});

it('can create a battle that uses the registered units without changing production maps', () => {
  const spawns = [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 2, y: 0 },
    ...GRAVEYARD_FAMILY_IDS.map((unitId, i): SpawnRecord => ({ id: i + 4, side: 'enemies', unitId, x: i, y: 2 })),
  ] satisfies readonly SpawnRecord[];
  const map: MapRecord = {
    id: 'map:graveyard_family_roster', width: 16, height: 3,
    cells: Array.from({ length: 48 }, (_, i) => ({ x: i % 16, y: Math.floor(i / 16), elevation: 0, terrainId: 'grass' })),
    spawns,
  };
  const catalog = graveyardFamilyBattleContent({ ...battleCatalog, maps: { ...battleCatalog.maps, [map.id]: map } });
  const created = createBattle(map.id, 1, catalog);
  assert(created.ok);
  expect(created.state.units.filter(u => u.side === 'enemy').map(u => u.defId)).toEqual([...GRAVEYARD_FAMILY_IDS]);
  expect(new Set(created.state.units.map(u => `${u.cell.x},${u.cell.y}`)).size).toBe(created.state.units.length);
  const board = buildBoardPresentation(catalog, map.id);
  expect(board.occupants).toHaveLength(19);
  for (const occupant of board.occupants) {
    const asset = catalog.assets[occupant.assetId];
    expect(asset.kind).toBe('unit-sprite');
    if (asset.kind !== 'unit-sprite') continue;
    expect(occupant.anchor).toEqual(asset.anchor);
    const boss = (GRAVEYARD_BOSS_IDS as readonly string[]).includes(occupant.unitId);
    const expected = boss
      ? { width: 96, height: 120, anchor: BOSS_SPRITE_CANVAS.anchor }
      : { width: 64, height: 80, anchor: { x: 32, y: 76 } };
    expect({ width: asset.runtimeWidth, height: asset.runtimeHeight, anchor: asset.anchor }).toEqual(expected);
    if (boss) expect(unitArtSize(asset)).toEqual(BOSS_UNIT_ART);
  }
});
