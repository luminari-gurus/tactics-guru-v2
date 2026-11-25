import { assert, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { battleCatalog } from '../../src/content/catalog';
import {
  SUNSCORCHED_DESERT_BOSS_IDS, SUNSCORCHED_DESERT_FAMILY_IDS, SUNSCORCHED_DESERT_FAMILY_MELEE_IDS,
  sunscorchedDesertFamilyAssets, sunscorchedDesertFamilyBattleContent, sunscorchedDesertFamilyEnemies,
} from '../../src/content/sunscorchedDesertFamily';
import {
  cavernsFamilyDungeonBattleCatalog, forestBossDungeonBattleCatalog, forestFamilyDungeonBattleCatalog,
  goblinFamilyDungeonBattleCatalog, graveyardFamilyDungeonBattleCatalog, hobgoblinDungeonBattleCatalog,
  quarryFamilyDungeonBattleCatalog, wetlandsFamilyDungeonBattleCatalog, emberWastesFamilyDungeonBattleCatalog,
  winterTundraFamilyDungeonBattleCatalog, sunscorchedDesertFamilyDungeonBattleCatalog,
} from '../../src/content/dungeonEncounters';
import { validateContent } from '../../src/content/validate';
import { createBattle } from '../../src/domain/turns';
import { buildBoardPresentation } from '../../src/geometry/boardPresentation';
import { BOSS_SPRITE_CANVAS, BOSS_UNIT_ART, unitArtSize } from '../../src/geometry/canopy';
import type { MapRecord, SpawnRecord } from '../../src/content/types';

it('packages illustrated sunscorched-desert-family sprites and portraits like the other goblin units', () => {
  let runtimeBytes = 0;
  for (const id of SUNSCORCHED_DESERT_FAMILY_IDS) {
    for (const kind of ['sprite', 'portrait'] as const) {
      const asset = sunscorchedDesertFamilyAssets[`asset:${id}_${kind}`], source = readFileSync(asset.sourcePath),
        runtime = readFileSync(`public${asset.runtimePath}`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
      expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
      expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
      if (asset.kind === 'unit-sprite') {
        expect(runtime).toEqual(source);
        if ((SUNSCORCHED_DESERT_BOSS_IDS as readonly string[]).includes(id)) {
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
  expect(runtimeBytes).toBe(446184);
});

it('registers bestiary stats and abilities without joining existing encounter catalogs', () => {
  expect(validateContent(sunscorchedDesertFamilyDungeonBattleCatalog).ok).toBe(true);
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).toMatchObject(sunscorchedDesertFamilyEnemies);
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.abilities['ability:basic_attack'].owners)
    .toEqual([...battleCatalog.abilities['ability:basic_attack'].owners, ...SUNSCORCHED_DESERT_FAMILY_MELEE_IDS]);
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.abilities['ability:shortbow_shot'].owners)
    .toEqual([...battleCatalog.abilities['ability:shortbow_shot'].owners, 'dune_archer', 'mirage_adept', 'sandstorm_djinn']);
  expect(battleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(battleCatalog.enemies).not.toHaveProperty('sirocco_jackal_king');
  expect(battleCatalog.enemies).not.toHaveProperty('saffron_colossus');
  expect(hobgoblinDungeonBattleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sirocco_jackal_king');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('saffron_colossus');
  expect(forestFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('sirocco_jackal_king');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sirocco_jackal_king');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sirocco_jackal_king');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sirocco_jackal_king');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('glass_viper');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(graveyardFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sirocco_jackal_king');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sirocco_jackal_king');
  expect(emberWastesFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('saffron_colossus');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sand_jackal');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('sirocco_jackal_king');
  expect(winterTundraFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('saffron_colossus');
  expect(goblinFamilyDungeonBattleCatalog.enemies).toHaveProperty('mire_goblin');
  expect(quarryFamilyDungeonBattleCatalog.enemies).toHaveProperty('glass_squire');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('mire_goblin');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_root_matriarch');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('lantern_hag');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('grimgor');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gorrak_the_breaker');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gravelord_kharrox');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('vorlach_the_hollow_crown');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ash_hound');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cinder_archer');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('ironmaw_furnace_beast');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('kiln_saint');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('dust_wraith');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('frost_gnawer');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hroth_whitehorn_king');
  expect(sunscorchedDesertFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('glass_squire');
  for (const change of [
    (c: typeof sunscorchedDesertFamilyDungeonBattleCatalog) => {
      const { sand_jackal: _, ...enemies } = c.enemies;
      return { ...c, enemies };
    },
    (c: typeof sunscorchedDesertFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, sand_jackal: { ...c.enemies.sand_jackal, stats: { ...c.enemies.sand_jackal.stats, will: NaN } } },
    }),
    (c: typeof sunscorchedDesertFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, dune_archer: { ...c.enemies.dune_archer, spriteAssetId: 'asset:missing' as const } },
    }),
  ]) expect(validateContent(change(sunscorchedDesertFamilyDungeonBattleCatalog)).ok).toBe(false);
});

it('can create a battle that uses the registered units without changing production maps', () => {
  const spawns = [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 2, y: 0 },
    ...SUNSCORCHED_DESERT_FAMILY_IDS.map((unitId, i): SpawnRecord => ({ id: i + 4, side: 'enemies', unitId, x: i, y: 2 })),
  ] satisfies readonly SpawnRecord[];
  const map: MapRecord = {
    id: 'map:sunscorched_desert_family_roster', width: 16, height: 3,
    cells: Array.from({ length: 48 }, (_, i) => ({ x: i % 16, y: Math.floor(i / 16), elevation: 0, terrainId: 'grass' })),
    spawns,
  };
  const catalog = sunscorchedDesertFamilyBattleContent({ ...battleCatalog, maps: { ...battleCatalog.maps, [map.id]: map } });
  const created = createBattle(map.id, 1, catalog);
  assert(created.ok);
  expect(created.state.units.filter(u => u.side === 'enemy').map(u => u.defId)).toEqual([...SUNSCORCHED_DESERT_FAMILY_IDS]);
  expect(new Set(created.state.units.map(u => `${u.cell.x},${u.cell.y}`)).size).toBe(created.state.units.length);
  const board = buildBoardPresentation(catalog, map.id);
  expect(board.occupants).toHaveLength(19);
  for (const occupant of board.occupants) {
    const asset = catalog.assets[occupant.assetId];
    expect(asset.kind).toBe('unit-sprite');
    if (asset.kind !== 'unit-sprite') continue;
    expect(occupant.anchor).toEqual(asset.anchor);
    const boss = (SUNSCORCHED_DESERT_BOSS_IDS as readonly string[]).includes(occupant.unitId);
    const expected = boss
      ? { width: 96, height: 120, anchor: BOSS_SPRITE_CANVAS.anchor }
      : { width: 64, height: 80, anchor: { x: 32, y: 76 } };
    expect({ width: asset.runtimeWidth, height: asset.runtimeHeight, anchor: asset.anchor }).toEqual(expected);
    if (boss) expect(unitArtSize(asset)).toEqual(BOSS_UNIT_ART);
  }
});
