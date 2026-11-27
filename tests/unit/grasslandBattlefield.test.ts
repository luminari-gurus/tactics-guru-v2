import { assert, expect, it } from 'vitest';
import { BattleSession } from '../../src/app/BattleSession';
import { DungeonSession } from '../../src/app/DungeonSession';
import { generatedBattlefieldSources, isBattlefieldSource } from '../../src/content/battlefieldTypes';
import { readDungeonEncounterCatalog } from '../../src/content/dungeonEncounters';
import { fullBiomeDungeonBattleCatalog, proceduralDungeonEncounterCatalog } from '../../src/content/expandedDungeonEncounters';
import type { ContentCatalog, EnemyId } from '../../src/content/types';
import { readBattlefieldDescriptor, resolveBattlefield } from '../../src/domain/battlefield';
import { acceptDungeonBattle, currentFloor, dungeonBattle, freshDungeon, stepDungeon } from '../../src/domain/dungeon';
import {
  CURRENT_DUNGEON_ENCOUNTER_POLICY, ENDLESS_SCALING_POLICY, FULL_BIOME_ENCOUNTER_POLICY,
  dungeonBiome, encounterBattleCatalog, selectDungeonEncounter,
} from '../../src/domain/dungeonEncounters';
import { decodeDungeon, encodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { replayCommandSequence } from '../../src/domain/turns';
import { atStairApproach, checkedDungeon, fighterJourney, walkWitness } from '../helpers/dungeonFixtures';

const policy = CURRENT_DUNGEON_ENCOUNTER_POLICY;
const grassland = generatedBattlefieldSources['grassland-v1'];
const firstGrasslandSeed = 5;

function roundTrip(state: ReturnType<typeof freshDungeon>) {
  const encoded = encodeDungeon(state);
  assert(encoded.ok, JSON.stringify(encoded));
  const restored = checkedDungeon(decodeDungeon(encoded.text));
  expect(restored).toEqual(state);
  return restored;
}

it('admits all Grassland rosters across the seed corpus with jump 0 and a deterministic fallback', () => {
  expect(readDungeonEncounterCatalog(proceduralDungeonEncounterCatalog, fullBiomeDungeonBattleCatalog).ok).toBe(true);
  const { pools, compositions } = proceduralDungeonEncounterCatalog;
  const grasslandChoices = pools.filter(pool => pool.biome === 'grassland').flatMap(pool => pool.maps);
  expect(grasslandChoices).toHaveLength(3);
  for (const choice of grasslandChoices) {
    expect(choice.source).toEqual(grassland);
    for (const compositionId of choice.compositionIds) {
      const { roster } = compositions.find(composition => composition.id === compositionId)!;
      const encounter = { id: `encounter:${choice.id}` as const, source: choice.source, roster };
      const enemy = fullBiomeDungeonBattleCatalog.enemies[roster.find(spawn => spawn.side === 'enemies')!.unitId as EnemyId];
      const catalog: ContentCatalog = { ...fullBiomeDungeonBattleCatalog, enemies: { ...fullBiomeDungeonBattleCatalog.enemies,
        [enemy.id]: { ...enemy, stats: { ...enemy.stats, jump: 0 } } } };
      const resolved = (seed: number, rejectCandidate?: (attempt: number) => boolean) => {
        const result = resolveBattlefield(encounter, seed, catalog, { rejectCandidate });
        assert(result.ok, JSON.stringify(result));
        return result;
      };
      const layouts = new Set<string>();
      for (const seed of [...Array.from({ length: 64 }, (_, index) => index), 0xfffffffe, 0xffffffff]) {
        const first = resolved(seed);
        expect(first.descriptor).toEqual(resolved(seed).descriptor);
        expect(first.diagnostics.attempt).toBe(0);
        expect(first.map.spawns).toEqual(roster);
        expect(first.map.cells.every(cell => cell.elevation === 0)).toBe(true);
        expect(new Set(first.map.cells.map(cell => cell.terrainId))).toEqual(new Set(['grass', 'grass_path', 'forest']));
        layouts.add(first.map.cells.filter(cell => cell.terrainId === 'forest').map(cell => `${cell.x},${cell.y}`).join(' '));
      }
      expect(layouts.size).toBeGreaterThan(16);
      expect(resolved(17, attempt => attempt === 0).diagnostics.attempt).toBe(1);
      const rejected: number[] = [];
      const fallback = resolved(17, attempt => { rejected.push(attempt); return true; });
      expect(rejected).toEqual([0, 1, 2, 3]);
      expect(fallback.diagnostics).toMatchObject({ attempt: null, fallback: true });
      expect(fallback.descriptor.mapHash).toBe(resolved(42, () => true).descriptor.mapHash);
      expect(resolveBattlefield({ ...encounter, roster: [...roster, roster[0]] }, 17, catalog)).toMatchObject({ ok: false });
      expect(readBattlefieldDescriptor(fallback.descriptor)).toBe(true);
      for (const incompatible of [{ biome: 'desert' }, { generatorVersion: 2 }, { profileVersion: 'desert-v1' }]) {
        expect(isBattlefieldSource({ ...grassland, ...incompatible })).toBe(false);
        expect(readBattlefieldDescriptor({ ...fallback.descriptor, ...incompatible })).toBe(false);
      }
    }
  }
}, 30_000);

it('preserves the V3 selection stream, exact Desert descriptors and authored Grassland saves', () => {
  const old = freshDungeon('authored-grassland', firstGrasslandSeed, FULL_BIOME_ENCOUNTER_POLICY, true);
  const newer = freshDungeon('generated-grassland', firstGrasslandSeed, policy, true);
  expect(currentFloor(old).descriptor.encounters.map(plan => plan.battlefield?.kind)).toEqual(['authored', 'authored', 'authored']);
  expect(currentFloor(newer).descriptor.encounters.map(plan => plan.battlefield?.kind)).toEqual(['generated', 'generated', 'generated']);
  const oldEntry = walkWitness(old);
  const restored = roundTrip(oldEntry);
  expect(dungeonBattle(restored)?.catalog.maps[restored.battlefield!.mapId]).toEqual(dungeonBattle(oldEntry)?.catalog.maps[oldEntry.battlefield!.mapId]);

  const kinds = new Set();
  for (let seed = 0; seed < 64; seed++) {
    const biome = dungeonBiome(seed, 1, policy);
    expect(biome).toBe(dungeonBiome(seed, 1, FULL_BIOME_ENCOUNTER_POLICY));
    for (let slot = 0; slot < 3; slot++) {
      const prior = selectDungeonEncounter(seed, 1, slot, FULL_BIOME_ENCOUNTER_POLICY);
      const current = selectDungeonEncounter(seed, 1, slot, policy);
      expect(current).toMatchObject({ mapId: prior.mapId, compositionId: prior.compositionId, kind: prior.kind,
        scalingPolicy: ENDLESS_SCALING_POLICY, encounter: { roster: prior.encounter.roster } });
      if (biome === 'grassland') kinds.add(current.kind);
      else expect(current.encounter.source).toEqual(prior.encounter.source);
    }
    if (biome === 'desert') {
      const previous = freshDungeon('desert', seed, FULL_BIOME_ENCOUNTER_POLICY);
      const current = freshDungeon('desert', seed, policy);
      expect(currentFloor(current).descriptor.encounters.map(plan => plan.battlefield))
        .toEqual(currentFloor(previous).descriptor.encounters.map(plan => plan.battlefield));
    }
  }
  expect(kinds).toEqual(new Set(['normal', 'elite', 'vault', 'boss']));
  expect(encounterBattleCatalog(currentFloor(newer).descriptor.encounters[0].selection).terrains.forest.blocksLineOfSight).toBe(true);
});

it('plays, saves and resumes a generated Grassland battle with its original replay map', async () => {
  const journey = fighterJourney(firstGrasslandSeed, policy, 1);
  const record = journey.records[0];
  const { entry, commands } = record;
  const original = dungeonBattle(entry)!;
  expect(original.battlefield).toMatchObject(grassland);
  const replayOrigin = new BattleSession(original.catalog, original.state, original.state.seed, undefined, true, original.battlefield);
  expect(replayOrigin.replay).toMatchObject({ battlefield: original.battlefield, initial: original.state });
  const playerIds = new Set(entry.activeBattle!.units.filter(unit => unit.side === 'player').map(unit => unit.id));
  const checkpointIndex = commands.findIndex((command, i) => i > 0 && commands[i - 1].type === 'endTurn' && playerIds.has(command.unitId));
  expect(checkpointIndex).toBeGreaterThan(0);
  const prefix = replayCommandSequence(original.state, commands.slice(0, checkpointIndex), original.catalog);
  assert(prefix.ok);
  const checkpoint = roundTrip(checkedDungeon(acceptDungeonBattle(entry, prefix.state)));
  const restored = dungeonBattle(checkpoint)!;
  expect(restored.battlefield).toEqual(original.battlefield);
  expect(restored.catalog.maps[original.state.mapId]).toEqual(original.catalog.maps[original.state.mapId]);
  const owner = new DungeonSession(checkpoint, null);
  const battle = await owner.startEncounter();
  assert(battle?.resumed);
  for (const command of commands.slice(checkpointIndex)) {
    if (battle.phase === 'player') assert(battle.prepare(command).ok);
    const presentation = battle.phase === 'enemy' ? battle.nextEnemy() : battle.confirm();
    assert(presentation);
    battle.finishPresentation(presentation.token);
  }
  expect(battle.continuation?.battlefield).toEqual(original.battlefield);
  expect([...prefix.events, ...battle.events]).toEqual(record.events);
  expect(battle.state).toEqual(record.state);
  owner.dispose();
  replayOrigin.dispose();

  expect(journey.records.map(battle => battle.state.outcome)).toEqual(['playerWin', 'playerWin', 'playerWin']);
  const takeStairs = (state: ReturnType<typeof freshDungeon>, direction: 'ascend' | 'descend') => {
    const approach = atStairApproach(state, direction);
    const { id, depth, revision } = approach;
    const descriptor = currentFloor(approach).descriptor;
    return checkedDungeon(stepDungeon(approach, { id, depth, revision,
      destination: direction === 'ascend' ? descriptor.upstairs : descriptor.downstairs }));
  };
  const descended = roundTrip(takeStairs(journey.state, 'descend'));
  expect(descended.depth).toBe(2);
  const revisited = roundTrip(takeStairs(descended, 'ascend'));
  expect(revisited.depth).toBe(1);
  expect(currentFloor(revisited).descriptor).toEqual(currentFloor(journey.state).descriptor);
}, 30_000);
