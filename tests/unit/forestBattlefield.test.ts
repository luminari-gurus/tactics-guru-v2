import { assert, expect, it } from 'vitest';
import { DungeonSession } from '../../src/app/DungeonSession';
import { generatedBattlefieldSources } from '../../src/content/battlefieldTypes';
import { readDungeonEncounterCatalog } from '../../src/content/dungeonEncounters';
import { forestProceduralDungeonEncounterCatalog, fullBiomeDungeonBattleCatalog } from '../../src/content/expandedDungeonEncounters';
import type { EnemyId } from '../../src/content/types';
import { resolveBattlefield } from '../../src/domain/battlefield';
import { acceptDungeonBattle, currentFloor, dungeonBattle, freshDungeon } from '../../src/domain/dungeon';
import {
  FOREST_DUNGEON_ENCOUNTER_POLICY, GRASSLAND_DUNGEON_ENCOUNTER_POLICY,
  dungeonBiome, selectDungeonEncounter,
} from '../../src/domain/dungeonEncounters';
import { decodeDungeon, encodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { dispatch } from '../../src/domain/turns';
import { checkedDungeon, walkWitness } from '../helpers/dungeonFixtures';

const policy = FOREST_DUNGEON_ENCOUNTER_POLICY;
const forest = generatedBattlefieldSources['forest-v1'];

it('admits every eligible Forest roster on varied, connected boards with deterministic retries and fallback', () => {
  const definition = forestProceduralDungeonEncounterCatalog;
  const content = fullBiomeDungeonBattleCatalog;
  expect(readDungeonEncounterCatalog(definition, content).ok).toBe(true);
  expect(readDungeonEncounterCatalog({ ...definition, version: 4 }, content).ok).toBe(false);
  const maps = definition.pools.filter(pool => pool.biome === 'forest').flatMap(pool => pool.maps);
  const authored = maps.filter(map => map.source.kind === 'authored');
  expect(authored.map(map => map.id)).toEqual(['hobgoblin_formation']);
  const generated = maps.filter(map => map.source.kind === 'generated');
  expect(generated).toHaveLength(maps.length - 1);

  for (const choice of generated) {
    for (const compositionId of choice.compositionIds) {
      const composition = definition.compositions.find(entry => entry.id === compositionId)!;
      const encounter = { id: `encounter:${choice.id}` as const, source: choice.source, roster: composition.roster };
      const enemyId = composition.roster.find(spawn => spawn.side === 'enemies')!.unitId as EnemyId;
      const enemy = content.enemies[enemyId];
      const catalog = { ...content, enemies: { ...content.enemies, [enemyId]: { ...enemy, stats: { ...enemy.stats, jump: 0 } } } };
      const resolve = (seed: number, rejectCandidate?: (attempt: number) => boolean) => {
        const result = resolveBattlefield(encounter, seed, catalog, { rejectCandidate });
        assert(result.ok, JSON.stringify(result));
        return result;
      };
      const layouts = new Set();
      for (const seed of [...Array.from({ length: 24 }, (_, n) => n), 0xfffffffe, 0xffffffff]) {
        const result = resolve(seed);
        expect(result.diagnostics.attempt).toBe(0);
        expect(result.descriptor).toMatchObject(forest);
        expect(result.descriptor).toEqual(resolve(seed).descriptor);
        expect(result.map.spawns).toEqual(composition.roster);
        expect(result.map.cells.every(cell => cell.elevation === 0)).toBe(true);
        expect(new Set(result.map.cells.map(cell => cell.terrainId))).toEqual(new Set(['grass', 'grass_path', 'forest']));
        layouts.add(result.descriptor.mapHash);
      }
      expect(layouts.size).toBeGreaterThan(16);
      expect(resolve(5, attempt => attempt === 0).diagnostics.attempt).toBe(1);
      const rejected: number[] = [];
      const fallback = resolve(5, attempt => { rejected.push(attempt); return true; });
      expect(rejected).toEqual([0, 1, 2, 3]);
      expect(fallback.diagnostics.fallback).toBe(true);
      expect(fallback.map).toEqual(resolve(0xffffffff, () => true).map);
    }
  }
}, 30_000);

it('preserves the V4 roster and map identities outside Forest and resumes both Forest generations', async () => {
  const forestSeeds = Array.from({ length: 128 }, (_, seed) => seed).filter(seed => dungeonBiome(seed, 1, policy) === 'forest');
  const kinds = new Set();
  for (const seed of forestSeeds) {
    for (let slot = 0; slot < 3; slot++) {
      const previous = selectDungeonEncounter(seed, 1, slot, GRASSLAND_DUNGEON_ENCOUNTER_POLICY);
      const current = selectDungeonEncounter(seed, 1, slot, policy);
      expect(current).toMatchObject({ kind: previous.kind, mapId: previous.mapId, compositionId: previous.compositionId,
        scalingPolicy: previous.scalingPolicy, encounter: { source: forest, roster: previous.encounter.roster } });
      kinds.add(current.kind);
    }
  }
  expect(kinds).toEqual(new Set(['normal', 'elite', 'vault', 'boss']));
  for (const biome of ['grassland', 'desert'] as const) {
    const seed = Array.from({ length: 128 }, (_, n) => n).find(n => dungeonBiome(n, 1, policy) === biome)!;
    const previous = freshDungeon('earlier', seed, GRASSLAND_DUNGEON_ENCOUNTER_POLICY);
    const current = freshDungeon('current', seed, policy);
    expect(currentFloor(current).descriptor.encounters.map(plan => plan.battlefield))
      .toEqual(currentFloor(previous).descriptor.encounters.map(plan => plan.battlefield));
  }
  for (const [savedPolicy, kind] of [[GRASSLAND_DUNGEON_ENCOUNTER_POLICY, 'authored'], [policy, 'generated']] as const) {
    const state = walkWitness(freshDungeon('forest-resume', forestSeeds[0], savedPolicy, true));
    const battle = dungeonBattle(state)!;
    expect(battle.battlefield.kind).toBe(kind);
    const result = dispatch(battle.state, { type: 'endTurn', unitId: battle.state.initiative[battle.state.activeIndex] }, battle.catalog);
    assert(result.ok, JSON.stringify(result));
    const checkpoint = checkedDungeon(acceptDungeonBattle(state, result.state));
    const saved = encodeDungeon(checkpoint);
    assert(saved.ok, JSON.stringify(saved));
    const restored = checkedDungeon(decodeDungeon(saved.text));
    const resumed = dungeonBattle(restored)!;
    expect(restored).toEqual(checkpoint);
    expect(resumed.battlefield).toEqual(battle.battlefield);
    expect(resumed.catalog.maps[battle.state.mapId]).toEqual(battle.catalog.maps[battle.state.mapId]);
    const owner = new DungeonSession(restored, null);
    const session = await owner.startEncounter();
    expect(session?.resumed).toBe(true);
    expect(session?.continuation?.battlefield).toEqual(battle.battlefield);
    owner.dispose();
  }
});
