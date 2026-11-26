import { assert, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { battleCatalog } from '../../src/content/catalog';
import {
  SHATTERED_CITADEL_BOSS_IDS, SHATTERED_CITADEL_FAMILY_IDS, SHATTERED_CITADEL_FAMILY_MELEE_IDS,
  shatteredCitadelFamilyAssets, shatteredCitadelFamilyBattleContent, shatteredCitadelFamilyEnemies,
} from '../../src/content/shatteredCitadelFamily';
import {
  cavernsFamilyDungeonBattleCatalog, forestBossDungeonBattleCatalog, forestFamilyDungeonBattleCatalog,
  goblinFamilyDungeonBattleCatalog, graveyardFamilyDungeonBattleCatalog, hobgoblinDungeonBattleCatalog,
  quarryFamilyDungeonBattleCatalog, wetlandsFamilyDungeonBattleCatalog, emberWastesFamilyDungeonBattleCatalog,
  winterTundraFamilyDungeonBattleCatalog, sunscorchedDesertFamilyDungeonBattleCatalog,
  stormCoastFamilyDungeonBattleCatalog, shatteredCitadelFamilyDungeonBattleCatalog,
} from '../../src/content/dungeonEncounters';
import { validateContent } from '../../src/content/validate';
import { createBattle } from '../../src/domain/turns';
import { buildBoardPresentation } from '../../src/geometry/boardPresentation';
import { BOSS_SPRITE_CANVAS, BOSS_UNIT_ART, unitArtSize } from '../../src/geometry/canopy';
import type { MapRecord, SpawnRecord } from '../../src/content/types';

it('packages illustrated shattered-citadel-family sprites and portraits like the other goblin units', () => {
  let runtimeBytes = 0;
  for (const id of SHATTERED_CITADEL_FAMILY_IDS) {
    for (const kind of ['sprite', 'portrait'] as const) {
      const asset = shatteredCitadelFamilyAssets[`asset:${id}_${kind}`], source = readFileSync(asset.sourcePath),
        runtime = readFileSync(`public${asset.runtimePath}`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
      expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
      expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
      if (asset.kind === 'unit-sprite') {
        expect(runtime).toEqual(source);
        if ((SHATTERED_CITADEL_BOSS_IDS as readonly string[]).includes(id)) {
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
  expect(runtimeBytes).toBe(301443);
});

it('registers bestiary stats and abilities without joining existing encounter catalogs', () => {
  expect(validateContent(shatteredCitadelFamilyDungeonBattleCatalog).ok).toBe(true);
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).toMatchObject(shatteredCitadelFamilyEnemies);
  expect(shatteredCitadelFamilyDungeonBattleCatalog.abilities['ability:basic_attack'].owners)
    .toEqual([...battleCatalog.abilities['ability:basic_attack'].owners, ...SHATTERED_CITADEL_FAMILY_MELEE_IDS]);
  expect(shatteredCitadelFamilyDungeonBattleCatalog.abilities['ability:shortbow_shot'].owners)
    .toEqual([...battleCatalog.abilities['ability:shortbow_shot'].owners, 'crossbow_levy', 'siege_engineer', 'arcane_bailiff']);
  expect(battleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(battleCatalog.enemies).not.toHaveProperty('crownless_champion');
  expect(battleCatalog.enemies).not.toHaveProperty('crownless_regent');
  expect(hobgoblinDungeonBattleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('crownless_regent');
  expect(forestFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('crownless_regent');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('crownless_regent');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('crownless_regent');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('crownless_regent');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('crownless_regent');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('crownless_regent');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('crownless_regent');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('crownless_regent');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ruin_squire');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('crownless_champion');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('crownless_regent');
  expect(goblinFamilyDungeonBattleCatalog.enemies).toHaveProperty('mire_goblin');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('mire_goblin');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_root_matriarch');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('lantern_hag');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('grimgor');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gorrak_the_breaker');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gravelord_kharrox');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('vorlach_the_hollow_crown');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ash_hound');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cinder_archer');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ironmaw_furnace_beast');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('kiln_saint');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('dust_wraith');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hroth_whitehorn_king');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sirocco_jackal_king');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('saffron_colossus');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('saltbone_howler');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('blackwake_captain');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('admiral_blackwake');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).toHaveProperty('crownless_champion');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies).toHaveProperty('crownless_regent');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies.crownless_champion.id).toBe('crownless_champion');
  expect(shatteredCitadelFamilyDungeonBattleCatalog.enemies.crownless_regent.id).toBe('crownless_regent');
  for (const change of [
    (c: typeof shatteredCitadelFamilyDungeonBattleCatalog) => {
      const { ruin_squire: _, ...enemies } = c.enemies;
      return { ...c, enemies };
    },
    (c: typeof shatteredCitadelFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, ruin_squire: { ...c.enemies.ruin_squire, stats: { ...c.enemies.ruin_squire.stats, will: NaN } } },
    }),
    (c: typeof shatteredCitadelFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, crossbow_levy: { ...c.enemies.crossbow_levy, spriteAssetId: 'asset:missing' as const } },
    }),
  ]) expect(validateContent(change(shatteredCitadelFamilyDungeonBattleCatalog)).ok).toBe(false);
});

it('can create a battle that uses the registered units without changing production maps', () => {
  const spawns = [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 2, y: 0 },
    ...SHATTERED_CITADEL_FAMILY_IDS.map((unitId, i): SpawnRecord => ({ id: i + 4, side: 'enemies', unitId, x: i, y: 2 })),
  ] satisfies readonly SpawnRecord[];
  const map: MapRecord = {
    id: 'map:shattered_citadel_family_roster', width: 11, height: 3,
    cells: Array.from({ length: 33 }, (_, i) => ({ x: i % 11, y: Math.floor(i / 11), elevation: 0, terrainId: 'grass' })),
    spawns,
  };
  const catalog = shatteredCitadelFamilyBattleContent({ ...battleCatalog, maps: { ...battleCatalog.maps, [map.id]: map } });
  const created = createBattle(map.id, 1, catalog);
  assert(created.ok);
  expect(created.state.units.filter(u => u.side === 'enemy').map(u => u.defId)).toEqual([...SHATTERED_CITADEL_FAMILY_IDS]);
  expect(new Set(created.state.units.map(u => `${u.cell.x},${u.cell.y}`)).size).toBe(created.state.units.length);
  const board = buildBoardPresentation(catalog, map.id);
  expect(board.occupants).toHaveLength(14);
  for (const occupant of board.occupants) {
    const asset = catalog.assets[occupant.assetId];
    expect(asset.kind).toBe('unit-sprite');
    if (asset.kind !== 'unit-sprite') continue;
    expect(occupant.anchor).toEqual(asset.anchor);
    const boss = (SHATTERED_CITADEL_BOSS_IDS as readonly string[]).includes(occupant.unitId);
    const expected = boss
      ? { width: 96, height: 120, anchor: BOSS_SPRITE_CANVAS.anchor }
      : { width: 64, height: 80, anchor: { x: 32, y: 76 } };
    expect({ width: asset.runtimeWidth, height: asset.runtimeHeight, anchor: asset.anchor }).toEqual(expected);
    if (boss) expect(unitArtSize(asset)).toEqual(BOSS_UNIT_ART);
  }
});
