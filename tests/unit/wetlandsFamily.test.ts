import { assert, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { battleCatalog } from '../../src/content/catalog';
import { WETLANDS_FAMILY_IDS, wetlandsFamilyAssets, wetlandsFamilyBattleContent, wetlandsFamilyEnemies } from '../../src/content/wetlandsFamily';
import {
  forestBossDungeonBattleCatalog, forestFamilyDungeonBattleCatalog, goblinFamilyDungeonBattleCatalog,
  hobgoblinDungeonBattleCatalog, wetlandsFamilyDungeonBattleCatalog,
} from '../../src/content/dungeonEncounters';
import { validateContent } from '../../src/content/validate';
import { createBattle } from '../../src/domain/turns';
import type { MapRecord, SpawnRecord } from '../../src/content/types';

it('packages illustrated wetlands-family sprites and portraits like the other goblin units', () => {
  let runtimeBytes = 0;
  for (const id of WETLANDS_FAMILY_IDS) {
    for (const kind of ['sprite', 'portrait'] as const) {
      const asset = wetlandsFamilyAssets[`asset:${id}_${kind}`], source = readFileSync(asset.sourcePath),
        runtime = readFileSync(`public${asset.runtimePath}`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
      expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
      expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
      if (asset.kind === 'unit-sprite') {
        expect(runtime).toEqual(source);
        expect(asset.anchor).toEqual({ x: 32, y: 76 });
      } else {
        expect(createHash('sha256').update(runtime).digest('hex'))
          .toBe(asset.provenance.productionNotes.match(/Runtime SHA-256 ([a-f0-9]{64})/)?.[1]);
      }
      runtimeBytes += runtime.length;
    }
  }
  expect(runtimeBytes).toBe(139228);
});

it('registers bestiary stats and abilities without joining existing encounter catalogs', () => {
  expect(validateContent(wetlandsFamilyDungeonBattleCatalog).ok).toBe(true);
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).toMatchObject(wetlandsFamilyEnemies);
  expect(wetlandsFamilyDungeonBattleCatalog.abilities['ability:basic_attack'].owners)
    .toEqual([...battleCatalog.abilities['ability:basic_attack'].owners, ...WETLANDS_FAMILY_IDS]);
  expect(battleCatalog.enemies).not.toHaveProperty('lantern_imp');
  expect(hobgoblinDungeonBattleCatalog.enemies).not.toHaveProperty('lantern_imp');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('lantern_imp');
  expect(forestFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('lantern_imp');
  expect(forestBossDungeonBattleCatalog.enemies).not.toHaveProperty('lantern_imp');
  expect(goblinFamilyDungeonBattleCatalog.enemies).toHaveProperty('mire_goblin');
  expect(wetlandsFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('mire_goblin');
  for (const change of [
    (c: typeof wetlandsFamilyDungeonBattleCatalog) => {
      const { lantern_imp: _, ...enemies } = c.enemies;
      return { ...c, enemies };
    },
    (c: typeof wetlandsFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, lantern_imp: { ...c.enemies.lantern_imp, stats: { ...c.enemies.lantern_imp.stats, will: NaN } } },
    }),
    (c: typeof wetlandsFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, bog_leech_swarm: { ...c.enemies.bog_leech_swarm, spriteAssetId: 'asset:missing' as const } },
    }),
  ]) expect(validateContent(change(wetlandsFamilyDungeonBattleCatalog)).ok).toBe(false);
});

it('can create a battle that uses the five units without changing production maps', () => {
  const spawns = [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 2, y: 0 },
    ...WETLANDS_FAMILY_IDS.map((unitId, i): SpawnRecord => ({ id: i + 4, side: 'enemies', unitId, x: i, y: 2 })),
  ] satisfies readonly SpawnRecord[];
  const map: MapRecord = {
    id: 'map:wetlands_family_roster', width: 5, height: 3,
    cells: Array.from({ length: 15 }, (_, i) => ({ x: i % 5, y: Math.floor(i / 5), elevation: 0, terrainId: 'grass' })),
    spawns,
  };
  const catalog = wetlandsFamilyBattleContent({ ...battleCatalog, maps: { ...battleCatalog.maps, [map.id]: map } });
  const created = createBattle(map.id, 1, catalog);
  assert(created.ok);
  expect(created.state.units.filter(u => u.side === 'enemy').map(u => u.defId)).toEqual([...WETLANDS_FAMILY_IDS]);
});
