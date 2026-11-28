import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { assert, expect, it } from 'vitest';
import { generatedBattlefieldSources } from '../../src/content/battlefieldTypes';
import { HERO_IDS } from '../../src/content/constants';
import { readDungeonEncounterCatalog } from '../../src/content/dungeonEncounters';
import { allProceduralDungeonEncounterCatalog, fullBiomeDungeonBattleCatalog } from '../../src/content/expandedDungeonEncounters';
import { regionalTerrainAssets, regionalTerrainContent } from '../../src/content/regionalTerrain';
import type { EnemyId } from '../../src/content/types';
import { resolveBattlefield } from '../../src/domain/battlefield';
import { acceptDungeonBattle, clearedDungeonSlots, currentFloor, dungeonBattle, dungeonStairStatus, freshDungeon } from '../../src/domain/dungeon';
import {
  ALL_PROCEDURAL_DUNGEON_ENCOUNTER_POLICY, FOREST_DUNGEON_ENCOUNTER_POLICY,
  dungeonBiome, selectDungeonEncounter,
} from '../../src/domain/dungeonEncounters';
import { decodeDungeon, encodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { createBattle, dispatch, replayCommandSequence } from '../../src/domain/turns';
import { BIOMES } from '../../src/map/biomes';
import { checkedDungeon, fighterJourney, walkWitness } from '../helpers/dungeonFixtures';

const policy = ALL_PROCEDURAL_DUNGEON_ENCOUNTER_POLICY;
const regionalBiomes = [
  'wetlands', 'underdeep-caverns', 'quarry', 'graveyard', 'ember-wastes', 'winter-tundra', 'storm-coast', 'shattered-citadel',
] as const;
const expectedTerrain = {
  wetlands: ['grass', 'grass_path', 'mud', 'water'],
  'underdeep-caverns': ['crystal', 'rubble', 'stone'],
  quarry: ['rubble', 'sand', 'stone'],
  graveyard: ['grass_path', 'rubble', 'stone'],
  'ember-wastes': ['ash', 'lava', 'rubble', 'stone'],
  'winter-tundra': ['ice', 'rubble', 'snow'],
  'storm-coast': ['rubble', 'sand', 'stone', 'water'],
  'shattered-citadel': ['grass_path', 'rubble', 'stone'],
};
const definition = allProceduralDungeonEncounterCatalog;
const seedFor = (biome: typeof regionalBiomes[number]) =>
  Array.from({ length: 128 }, (_, seed) => seed).find(seed => dungeonBiome(seed, 1, policy) === biome)!;

it('admits the eleven-biome catalog and binds it to v6', () => {
  expect(readDungeonEncounterCatalog(definition, fullBiomeDungeonBattleCatalog).ok).toBe(true);
  expect(readDungeonEncounterCatalog({ ...definition, version: 5 }, fullBiomeDungeonBattleCatalog).ok).toBe(false);
  const cycle = BIOMES.map((_, i) => dungeonBiome(0, i + 1, policy));
  expect(new Set(cycle)).toEqual(new Set(BIOMES.map(biome => biome.id)));
  for (const [i, biome] of cycle.entries()) {
    expect(dungeonBiome(0, i + 1, FOREST_DUNGEON_ENCOUNTER_POLICY)).toBe(biome);
    for (let slot = 0; slot < 3; slot++) {
      const prior = selectDungeonEncounter(0, i + 1, slot, FOREST_DUNGEON_ENCOUNTER_POLICY);
      const next = selectDungeonEncounter(0, i + 1, slot, policy);
      expect(next).toMatchObject({ kind: prior.kind, mapId: prior.mapId, compositionId: prior.compositionId,
        scalingPolicy: prior.scalingPolicy, encounter: { roster: prior.encounter.roster } });
    }
    if (biome === 'desert' || biome === 'grassland' || biome === 'forest') {
      const seed = Array.from({ length: 128 }, (_, n) => n).find(n => dungeonBiome(n, 1, policy) === biome)!;
      const previous = freshDungeon('old-version', seed, FOREST_DUNGEON_ENCOUNTER_POLICY);
      const current = freshDungeon('new-version', seed, policy);
      expect(currentFloor(current).descriptor.encounters.map(plan => plan.battlefield))
        .toEqual(currentFloor(previous).descriptor.encounters.map(plan => plan.battlefield));
    }
  }
  expect(definition.pools.flatMap(pool => pool.maps).filter(map => map.source.kind === 'authored').map(map => map.id))
    .toEqual(['hobgoblin_formation']);
}, 30_000);

it.each(regionalBiomes)('admits %s rosters, jump-0 combat, varied layouts and a deterministic fallback', biome => {
  const pools = definition.pools.filter(pool => pool.biome === biome);
  expect(pools).toHaveLength(2);
  for (const choice of pools.flatMap(pool => pool.maps)) {
    const source = generatedBattlefieldSources[`${biome}-v1`];
    expect(choice.source).toEqual(source);
    for (const id of choice.compositionIds) {
      const composition = definition.compositions.find(entry => entry.id === id)!;
      const encounter = { id: `encounter:${choice.id}` as const, source, roster: composition.roster };
      const base = regionalTerrainContent(fullBiomeDungeonBattleCatalog, source);
      const enemyId = composition.roster.find(spawn => spawn.side === 'enemies')!.unitId as EnemyId;
      const enemy = base.enemies[enemyId];
      const catalog = { ...base, enemies: { ...base.enemies, [enemyId]: { ...enemy, stats: { ...enemy.stats, jump: 0 } } } };
      const resolve = (seed: number, rejectCandidate?: (attempt: number) => boolean) => {
        const result = resolveBattlefield(encounter, seed, catalog, { rejectCandidate });
        assert(result.ok, JSON.stringify({ biome, id, seed, result }));
        return result;
      };
      const hashes = new Set<string>();
      for (const seed of [...Array.from({ length: 10 }, (_, n) => n), 0xfffffffe, 0xffffffff]) {
        const selected = resolve(seed);
        expect(selected.diagnostics.fallback).toBe(false);
        expect(selected.map.spawns).toEqual(composition.roster);
        expect(selected.descriptor).toMatchObject(source);
        expect(selected.map.cells.every(cell => cell.elevation === 0)).toBe(true);
        hashes.add(selected.descriptor.mapHash);
      }
      expect(hashes.size).toBeGreaterThan(2);
      const natural = resolve(17);
      expect(natural.descriptor).toEqual(resolve(17).descriptor);
      expect([...new Set(natural.map.cells.map(cell => cell.terrainId))].sort()).toEqual(expectedTerrain[biome]);
      for (let mask = 1; mask < 8; mask++) {
        const spawns = natural.map.spawns.filter(spawn => spawn.side === 'enemies' ||
          (mask & (1 << HERO_IDS.indexOf(spawn.unitId))));
        expect(createBattle(natural.map.id, 17, { ...catalog, maps: { [natural.map.id]: { ...natural.map, spawns } } }).ok).toBe(true);
      }
      const rejects: number[] = [];
      const fallback = resolve(17, attempt => { rejects.push(attempt); return true; });
      expect(rejects).toEqual([0, 1, 2, 3]);
      expect(fallback.diagnostics.fallback).toBe(true);
      expect(fallback.map).toEqual(resolve(0xffffffff, () => true).map);
    }
  }
}, 30_000);

it.each(regionalBiomes)('walks into a %s encounter and resumes an accepted action from the exact saved battlefield', biome => {
  const seed = seedFor(biome);
  for (const savedPolicy of [FOREST_DUNGEON_ENCOUNTER_POLICY, policy] as const) {
    const entered = walkWitness(freshDungeon(`regional-${biome}`, seed, savedPolicy, true));
    const battle = dungeonBattle(entered)!;
    const expected = savedPolicy === policy ? 'generated' : 'authored';
    expect(battle.battlefield.kind).toBe(expected);
    if (savedPolicy === policy) expect(battle.battlefield).toMatchObject(generatedBattlefieldSources[`${biome}-v1`]);
    const command = { type: 'endTurn', unitId: battle.state.initiative[battle.state.activeIndex] } as const;
    const acted = dispatch(battle.state, command, battle.catalog);
    assert(acted.ok);
    const checkpoint = checkedDungeon(acceptDungeonBattle(entered, acted.state));
    const encoded = encodeDungeon(checkpoint);
    assert(encoded.ok);
    const restored = checkedDungeon(decodeDungeon(encoded.text));
    const resumed = dungeonBattle(restored)!;
    expect(restored).toEqual(checkpoint);
    expect(resumed.battlefield).toEqual(battle.battlefield);
    expect(resumed.catalog.maps[battle.state.mapId]).toEqual(battle.catalog.maps[battle.state.mapId]);
    expect(replayCommandSequence(battle.state, [command], resumed.catalog)).toMatchObject({ ok: true, state: acted.state });
  }
});

it.each([
  ['wetlands', 22], ['underdeep-caverns', 14], ['quarry', 124], ['graveyard', 6],
  ['ember-wastes', 35], ['winter-tundra', 21], ['storm-coast', 13], ['shattered-citadel', 16],
] as const)('clears a complete generated %s floor and replays its guardian battle at seed %i', (biome, seed) => {
  const journey = fighterJourney(seed, policy, 1);
  expect(currentFloor(journey.state).descriptor.biome).toBe(`${biome}-v1`);
  expect(journey.records.map(record => record.state.outcome)).toEqual(['playerWin', 'playerWin', 'playerWin']);
  expect(clearedDungeonSlots(currentFloor(journey.state))).toEqual([0, 1, 2]);
  expect(dungeonStairStatus(journey.state, 'descend')).toBe('available');
  const guardian = journey.records.find(record => record.entry.encounterEntry?.slot === 2)!;
  const battle = dungeonBattle(guardian.entry)!;
  expect(battle.battlefield).toMatchObject(generatedBattlefieldSources[`${biome}-v1`]);
  const encoded = encodeDungeon(guardian.entry);
  assert(encoded.ok);
  const restored = dungeonBattle(checkedDungeon(decodeDungeon(encoded.text)))!;
  expect(restored.battlefield).toEqual(battle.battlefield);
  expect(replayCommandSequence(restored.state, guardian.commands, restored.catalog))
    .toEqual({ ok: true, state: guardian.state, events: guardian.events });
}, 30_000);

it('loads existing mud, ash and lava assets with matching dimensions and source hashes', () => {
  for (const asset of Object.values(regionalTerrainAssets)) {
    const source = readFileSync(asset.sourcePath), runtime = readFileSync(`public${asset.runtimePath}`);
    expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
    expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
    expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
  }
});
