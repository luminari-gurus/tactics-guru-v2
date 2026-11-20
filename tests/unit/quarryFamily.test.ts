import { assert, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { battleCatalog } from '../../src/content/catalog';
import {
  QUARRY_BOSS_IDS, QUARRY_FAMILY_IDS, QUARRY_FAMILY_MELEE_IDS,
  quarryFamilyAssets, quarryFamilyBattleContent, quarryFamilyEnemies,
} from '../../src/content/quarryFamily';
import {
  cavernsFamilyDungeonBattleCatalog, forestBossDungeonBattleCatalog, forestFamilyDungeonBattleCatalog,
  goblinFamilyDungeonBattleCatalog, hobgoblinDungeonBattleCatalog, quarryFamilyDungeonBattleCatalog,
  wetlandsFamilyDungeonBattleCatalog,
} from '../../src/content/dungeonEncounters';
import { validateContent } from '../../src/content/validate';
import { createBattle } from '../../src/domain/turns';
import { buildBoardPresentation } from '../../src/geometry/boardPresentation';
import { BOSS_SPRITE_CANVAS, BOSS_UNIT_ART, unitArtSize } from '../../src/geometry/canopy';
import type { MapRecord, SpawnRecord } from '../../src/content/types';

it('packages illustrated quarry-family sprites and portraits like the other goblin units', () => {
  let runtimeBytes = 0;
  for (const id of QUARRY_FAMILY_IDS) {
    for (const kind of ['sprite', 'portrait'] as const) {
      const asset = quarryFamilyAssets[`asset:${id}_${kind}`], source = readFileSync(asset.sourcePath),
        runtime = readFileSync(`public${asset.runtimePath}`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
      expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
      expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
      if (asset.kind === 'unit-sprite') {
        expect(runtime).toEqual(source);
        if ((QUARRY_BOSS_IDS as readonly string[]).includes(id)) {
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
  expect(runtimeBytes).toBe(505750);
});

it('registers bestiary stats and abilities without joining existing encounter catalogs', () => {
  expect(validateContent(quarryFamilyDungeonBattleCatalog).ok).toBe(true);
  expect(quarryFamilyDungeonBattleCatalog.enemies).toMatchObject(quarryFamilyEnemies);
  expect(quarryFamilyDungeonBattleCatalog.abilities['ability:basic_attack'].owners)
    .toEqual([...battleCatalog.abilities['ability:basic_attack'].owners, ...QUARRY_FAMILY_MELEE_IDS]);
  expect(quarryFamilyDungeonBattleCatalog.abilities['ability:shortbow_shot'].owners)
    .toEqual([...battleCatalog.abilities['ability:shortbow_shot'].owners, 'sling_sapper', 'quarry_vulture']);
  expect(battleCatalog.enemies).not.toHaveProperty('blast_adept');
  expect(battleCatalog.enemies).not.toHaveProperty('grimgor');
  expect(battleCatalog.enemies).not.toHaveProperty('gorrak_the_breaker');
  expect(hobgoblinDungeonBattleCatalog.enemies).not.toHaveProperty('blast_adept');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('blast_adept');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('grimgor');
  expect(forestFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('blast_adept');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('blast_adept');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('grimgor');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('blast_adept');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gorrak_the_breaker');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('blast_adept');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('grimgor');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('gorrak_the_breaker');
  expect(cavernsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('mirror_knight');
  expect(goblinFamilyDungeonBattleCatalog.enemies).toHaveProperty('mire_goblin');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('mire_goblin');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_root_matriarch');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('lantern_hag');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('cave_skulk');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('hollow_matriarch_boss');
  expect(quarryFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('grimgor_quarry_tyrant');
  for (const change of [
    (c: typeof quarryFamilyDungeonBattleCatalog) => {
      const { blast_adept: _, ...enemies } = c.enemies;
      return { ...c, enemies };
    },
    (c: typeof quarryFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, blast_adept: { ...c.enemies.blast_adept, stats: { ...c.enemies.blast_adept.stats, will: NaN } } },
    }),
    (c: typeof quarryFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, dust_rat: { ...c.enemies.dust_rat, spriteAssetId: 'asset:missing' as const } },
    }),
  ]) expect(validateContent(change(quarryFamilyDungeonBattleCatalog)).ok).toBe(false);
});

it('can create a battle that uses the registered units without changing production maps', () => {
  const spawns = [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 2, y: 0 },
    ...QUARRY_FAMILY_IDS.map((unitId, i): SpawnRecord => ({ id: i + 4, side: 'enemies', unitId, x: i, y: 2 })),
  ] satisfies readonly SpawnRecord[];
  const map: MapRecord = {
    id: 'map:quarry_family_roster', width: 17, height: 3,
    cells: Array.from({ length: 51 }, (_, i) => ({ x: i % 17, y: Math.floor(i / 17), elevation: 0, terrainId: 'grass' })),
    spawns,
  };
  const catalog = quarryFamilyBattleContent({ ...battleCatalog, maps: { ...battleCatalog.maps, [map.id]: map } });
  const created = createBattle(map.id, 1, catalog);
  assert(created.ok);
  expect(created.state.units.filter(u => u.side === 'enemy').map(u => u.defId)).toEqual([...QUARRY_FAMILY_IDS]);
  expect(new Set(created.state.units.map(u => `${u.cell.x},${u.cell.y}`)).size).toBe(created.state.units.length);
  const board = buildBoardPresentation(catalog, map.id);
  expect(board.occupants).toHaveLength(20);
  for (const occupant of board.occupants) {
    const asset = catalog.assets[occupant.assetId];
    expect(asset.kind).toBe('unit-sprite');
    if (asset.kind !== 'unit-sprite') continue;
    expect(occupant.anchor).toEqual(asset.anchor);
    const boss = (QUARRY_BOSS_IDS as readonly string[]).includes(occupant.unitId);
    const expected = boss
      ? { width: 96, height: 120, anchor: BOSS_SPRITE_CANVAS.anchor }
      : { width: 64, height: 80, anchor: { x: 32, y: 76 } };
    expect({ width: asset.runtimeWidth, height: asset.runtimeHeight, anchor: asset.anchor }).toEqual(expected);
    if (boss) expect(unitArtSize(asset)).toEqual(BOSS_UNIT_ART);
  }
});
