import { assert, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { battleCatalog } from '../../src/content/catalog';
import {
  STORM_COAST_BOSS_IDS, STORM_COAST_FAMILY_IDS, STORM_COAST_FAMILY_MELEE_IDS,
  stormCoastFamilyAssets, stormCoastFamilyBattleContent, stormCoastFamilyEnemies,
} from '../../src/content/stormCoastFamily';
import {
  cavernsFamilyDungeonBattleCatalog, forestBossDungeonBattleCatalog, forestFamilyDungeonBattleCatalog,
  goblinFamilyDungeonBattleCatalog, graveyardFamilyDungeonBattleCatalog, hobgoblinDungeonBattleCatalog,
  quarryFamilyDungeonBattleCatalog, wetlandsFamilyDungeonBattleCatalog, emberWastesFamilyDungeonBattleCatalog,
  winterTundraFamilyDungeonBattleCatalog, sunscorchedDesertFamilyDungeonBattleCatalog,
  stormCoastFamilyDungeonBattleCatalog,
} from '../../src/content/dungeonEncounters';
import { validateContent } from '../../src/content/validate';
import { createBattle } from '../../src/domain/turns';
import { buildBoardPresentation } from '../../src/geometry/boardPresentation';
import { BOSS_SPRITE_CANVAS, BOSS_UNIT_ART, unitArtSize } from '../../src/geometry/canopy';
import type { MapRecord, SpawnRecord } from '../../src/content/types';

it('packages illustrated storm-coast-family sprites and portraits like the other goblin units', () => {
  let runtimeBytes = 0;
  for (const id of STORM_COAST_FAMILY_IDS) {
    for (const kind of ['sprite', 'portrait'] as const) {
      const asset = stormCoastFamilyAssets[`asset:${id}_${kind}`], source = readFileSync(asset.sourcePath),
        runtime = readFileSync(`public${asset.runtimePath}`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
      expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
      expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
      if (asset.kind === 'unit-sprite') {
        expect(runtime).toEqual(source);
        if ((STORM_COAST_BOSS_IDS as readonly string[]).includes(id)) {
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
  expect(runtimeBytes).toBe(321448);
});

it('registers bestiary stats and abilities without joining existing encounter catalogs', () => {
  expect(validateContent(stormCoastFamilyDungeonBattleCatalog).ok).toBe(true);
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).toMatchObject(stormCoastFamilyEnemies);
  expect(stormCoastFamilyDungeonBattleCatalog.abilities['ability:basic_attack'].owners)
    .toEqual([...battleCatalog.abilities['ability:basic_attack'].owners, ...STORM_COAST_FAMILY_MELEE_IDS]);
  expect(stormCoastFamilyDungeonBattleCatalog.abilities['ability:shortbow_shot'].owners)
    .toEqual([...battleCatalog.abilities['ability:shortbow_shot'].owners, 'net_caster', 'stormcaller_acolyte', 'siren_shade']);
  expect(battleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(battleCatalog.enemies).not.toHaveProperty('blackwake_captain');
  expect(battleCatalog.enemies).not.toHaveProperty('admiral_blackwake');
  expect(hobgoblinDungeonBattleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('admiral_blackwake');
  expect(forestFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('admiral_blackwake');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('admiral_blackwake');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('admiral_blackwake');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('admiral_blackwake');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('admiral_blackwake');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('admiral_blackwake');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('admiral_blackwake');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('salt_rat');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('blackwake_captain');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('admiral_blackwake');
  expect(goblinFamilyDungeonBattleCatalog.enemies).toHaveProperty('mire_goblin');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('mire_goblin');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_root_matriarch');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('lantern_hag');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('grimgor');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gorrak_the_breaker');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gravelord_kharrox');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('vorlach_the_hollow_crown');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ash_hound');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cinder_archer');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ironmaw_furnace_beast');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('kiln_saint');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('dust_wraith');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hroth_whitehorn_king');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sirocco_jackal_king');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('saffron_colossus');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('saltbone_howler');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).toHaveProperty('blackwake_captain');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies).toHaveProperty('admiral_blackwake');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies.blackwake_captain.id).toBe('blackwake_captain');
  expect(stormCoastFamilyDungeonBattleCatalog.enemies.admiral_blackwake.id).toBe('admiral_blackwake');
  for (const change of [
    (c: typeof stormCoastFamilyDungeonBattleCatalog) => {
      const { salt_rat: _, ...enemies } = c.enemies;
      return { ...c, enemies };
    },
    (c: typeof stormCoastFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, salt_rat: { ...c.enemies.salt_rat, stats: { ...c.enemies.salt_rat.stats, will: NaN } } },
    }),
    (c: typeof stormCoastFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, net_caster: { ...c.enemies.net_caster, spriteAssetId: 'asset:missing' as const } },
    }),
  ]) expect(validateContent(change(stormCoastFamilyDungeonBattleCatalog)).ok).toBe(false);
});

it('can create a battle that uses the registered units without changing production maps', () => {
  const spawns = [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 2, y: 0 },
    ...STORM_COAST_FAMILY_IDS.map((unitId, i): SpawnRecord => ({ id: i + 4, side: 'enemies', unitId, x: i, y: 2 })),
  ] satisfies readonly SpawnRecord[];
  const map: MapRecord = {
    id: 'map:storm_coast_family_roster', width: 11, height: 3,
    cells: Array.from({ length: 33 }, (_, i) => ({ x: i % 11, y: Math.floor(i / 11), elevation: 0, terrainId: 'grass' })),
    spawns,
  };
  const catalog = stormCoastFamilyBattleContent({ ...battleCatalog, maps: { ...battleCatalog.maps, [map.id]: map } });
  const created = createBattle(map.id, 1, catalog);
  assert(created.ok);
  expect(created.state.units.filter(u => u.side === 'enemy').map(u => u.defId)).toEqual([...STORM_COAST_FAMILY_IDS]);
  expect(new Set(created.state.units.map(u => `${u.cell.x},${u.cell.y}`)).size).toBe(created.state.units.length);
  const board = buildBoardPresentation(catalog, map.id);
  expect(board.occupants).toHaveLength(14);
  for (const occupant of board.occupants) {
    const asset = catalog.assets[occupant.assetId];
    expect(asset.kind).toBe('unit-sprite');
    if (asset.kind !== 'unit-sprite') continue;
    expect(occupant.anchor).toEqual(asset.anchor);
    const boss = (STORM_COAST_BOSS_IDS as readonly string[]).includes(occupant.unitId);
    const expected = boss
      ? { width: 96, height: 120, anchor: BOSS_SPRITE_CANVAS.anchor }
      : { width: 64, height: 80, anchor: { x: 32, y: 76 } };
    expect({ width: asset.runtimeWidth, height: asset.runtimeHeight, anchor: asset.anchor }).toEqual(expected);
    if (boss) expect(unitArtSize(asset)).toEqual(BOSS_UNIT_ART);
  }
});
