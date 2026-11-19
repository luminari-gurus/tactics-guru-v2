import { assert, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { battleCatalog } from '../../src/content/catalog';
import { FOREST_FAMILY_IDS, forestFamilyAssets, forestFamilyBattleContent, forestFamilyEnemies } from '../../src/content/forestFamily';
import { forestFamilyDungeonBattleCatalog, goblinFamilyDungeonBattleCatalog, hobgoblinDungeonBattleCatalog } from '../../src/content/dungeonEncounters';
import { validateContent } from '../../src/content/validate';
import { createBattle } from '../../src/domain/turns';
import type { MapRecord, SpawnRecord } from '../../src/content/types';

it('packages illustrated forest-family sprites and portraits like the other goblin units', () => {
  let runtimeBytes = 0;
  for (const id of FOREST_FAMILY_IDS) {
    for (const kind of ['sprite', 'portrait'] as const) {
      const asset = forestFamilyAssets[`asset:${id}_${kind}`], source = readFileSync(asset.sourcePath),
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
  expect(runtimeBytes).toBe(141035);
});

it('registers bestiary stats and abilities without joining existing encounter catalogs', () => {
  expect(validateContent(forestFamilyDungeonBattleCatalog).ok).toBe(true);
  expect(forestFamilyDungeonBattleCatalog.enemies).toMatchObject(forestFamilyEnemies);
  expect(forestFamilyDungeonBattleCatalog.abilities['ability:basic_attack'].owners)
    .toEqual([...battleCatalog.abilities['ability:basic_attack'].owners, ...FOREST_FAMILY_IDS]);
  expect(battleCatalog.enemies).not.toHaveProperty('briar_thrall');
  expect(hobgoblinDungeonBattleCatalog.enemies).not.toHaveProperty('briar_thrall');
  expect(goblinFamilyDungeonBattleCatalog.enemies).not.toHaveProperty('briar_thrall');
  for (const change of [
    (c: typeof forestFamilyDungeonBattleCatalog) => {
      const { briar_thrall: _, ...enemies } = c.enemies;
      return { ...c, enemies };
    },
    (c: typeof forestFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, briar_thrall: { ...c.enemies.briar_thrall, stats: { ...c.enemies.briar_thrall.stats, will: NaN } } },
    }),
    (c: typeof forestFamilyDungeonBattleCatalog) => ({
      ...c, enemies: { ...c.enemies, blob: { ...c.enemies.blob, spriteAssetId: 'asset:missing' as const } },
    }),
  ]) expect(validateContent(change(forestFamilyDungeonBattleCatalog)).ok).toBe(false);
});

it('can create a battle that uses the five units without changing production maps', () => {
  const spawns = [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 2, y: 0 },
    ...FOREST_FAMILY_IDS.map((unitId, i): SpawnRecord => ({ id: i + 4, side: 'enemies', unitId, x: i, y: 2 })),
  ] satisfies readonly SpawnRecord[];
  const map: MapRecord = {
    id: 'map:forest_family_roster', width: 5, height: 3,
    cells: Array.from({ length: 15 }, (_, i) => ({ x: i % 5, y: Math.floor(i / 5), elevation: 0, terrainId: 'grass' })),
    spawns,
  };
  const catalog = forestFamilyBattleContent({ ...battleCatalog, maps: { ...battleCatalog.maps, [map.id]: map } });
  const created = createBattle(map.id, 1, catalog);
  assert(created.ok);
  expect(created.state.units.filter(u => u.side === 'enemy').map(u => u.defId)).toEqual([...FOREST_FAMILY_IDS]);
});
