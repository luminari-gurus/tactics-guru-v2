import { assert, expect, it } from 'vitest';
import { DungeonSession } from '../../src/app/DungeonSession';
import { HERO_PROGRESSION } from '../../src/content/progression';
import {
  acceptDungeonBattle, clearedDungeonSlots, currentFloor, dungeonBattle, dungeonStairStatus, stepDungeon,
  type DungeonState,
} from '../../src/domain/dungeon';
import { EXPANDED_ENCOUNTER_POLICY } from '../../src/domain/dungeonEncounters';
import { decodeDungeon, encodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { replayCommandSequence } from '../../src/domain/turns';
import { atStairApproach, checkedDungeon, fighterJourney } from '../helpers/dungeonFixtures';

type BattleRecord = ReturnType<typeof fighterJourney>['records'][number];

function roundTrip(state: DungeonState): DungeonState {
  const encoded = encodeDungeon(state);
  assert(encoded.ok, encoded.ok ? '' : encoded.reason);
  const resumed = checkedDungeon(decodeDungeon(encoded.text));
  expect(resumed).toEqual(state);
  return resumed;
}

async function resumeGuardian(record: BattleRecord, settled: DungeonState) {
  const initial = record.entry.activeBattle!;
  const source = dungeonBattle(record.entry)!;
  // Resume at a player turn boundary in the second half of the battle. The remaining
  // player commands come from the witness, while the resumed AI plans its own turns.
  const checkpointIndex = record.commands.findIndex((command, index) =>
    index >= Math.floor(record.commands.length / 2) && record.commands[index - 1]?.type === 'endTurn' &&
    initial.units.some(unit => unit.id === command.unitId && unit.side === 'player'));
  expect(checkpointIndex).toBeGreaterThan(0);
  const prefix = replayCommandSequence(initial, record.commands.slice(0, checkpointIndex), source.catalog);
  assert(prefix.ok);
  expect(prefix.state.outcome).toBe('ongoing');

  const checkpoint = roundTrip(checkedDungeon(acceptDungeonBattle(record.entry, prefix.state)));
  const owner = new DungeonSession(checkpoint, null);
  const battle = await owner.startEncounter();
  assert(battle?.resumed);
  expect(battle.battlefield).toEqual(source.battlefield);
  const remaining = record.commands.slice(checkpointIndex);
  for (const command of remaining) {
    if (battle.phase === 'player') assert(battle.prepare(command).ok);
    const presentation = battle.phase === 'enemy' ? battle.nextEnemy() : battle.confirm();
    assert(presentation);
    battle.finishPresentation(presentation.token);
  }
  expect(battle.continuation?.commands).toEqual(remaining);
  expect([...prefix.events, ...battle.events]).toEqual(record.events);
  expect(battle.state).toEqual(record.state);
  expect(owner.snapshot).toEqual({ ...settled, revision: checkpoint.revision + remaining.length });
  owner.dispose();
}

it.each([
  {
    seed: 1, biome: 'forest', guardianIndex: 0,
    guardian: ['ironmaw_furnace_beast', 'cinder_archer'],
    compositions: ['forest_guardian_arena_2', 'forest_patrol_4', 'woodland_crossing'],
  },
  {
    seed: 50, biome: 'quarry', guardianIndex: 2,
    guardian: ['mirror_knight', 'glass_squire'],
    compositions: ['quarry_patrol_3', 'quarry_patrol_5', 'quarry_guardian_arena_3'],
  },
  {
    seed: 25, biome: 'winter-tundra', guardianIndex: 1,
    guardian: ['sepulcher_golem', 'skeleton_archer'],
    compositions: ['winter_tundra_patrol_1', 'winter_tundra_guardian_arena_1', 'winter_tundra_patrol_1'],
  },
  {
    seed: 46, biome: 'ember-wastes', guardianIndex: 1,
    guardian: ['kiln_saint', 'cinder_imp'],
    compositions: ['ember_wastes_patrol_2', 'ember_wastes_guardian_arena_1', 'ember_wastes_patrol_4'],
  },
  {
    seed: 65, biome: 'graveyard', guardianIndex: 0,
    guardian: ['vorlach_the_hollow_crown', 'skeleton_archer'],
    compositions: ['graveyard_guardian_arena_2', 'graveyard_patrol_1', 'graveyard_patrol_4'],
  },
  {
    seed: 193, biome: 'underdeep-caverns', guardianIndex: 0,
    guardian: ['hollow_matriarch_boss', 'cave_skulk'],
    compositions: ['underdeep_caverns_guardian_arena_1', 'underdeep_caverns_patrol_1', 'underdeep_caverns_patrol_3'],
  },
])('clears $biome with the expanded encounter policy at seed $seed', async ({ seed, biome, guardianIndex, guardian, compositions }) => {
  const witness = fighterJourney(seed, EXPANDED_ENCOUNTER_POLICY, 1);
  expect(witness.records.map(record => record.state.outcome)).toEqual(['playerWin', 'playerWin', 'playerWin']);
  expect(currentFloor(witness.state).descriptor.biome).toBe(`${biome}-v1`);
  expect(clearedDungeonSlots(currentFloor(witness.state))).toEqual([0, 1, 2]);

  let previous: DungeonState | undefined;
  for (const [index, record] of witness.records.entries()) {
    const { entry, state } = record;
    const initial = entry.activeBattle!;
    const { selection } = dungeonBattle(entry)!;
    assert(selection.policy === EXPANDED_ENCOUNTER_POLICY);
    expect(selection.compositionId).toBe(compositions[index]);
    expect(initial.units.filter(unit => unit.side === 'player').map(unit => [unit.defId, unit.hp]))
      .toEqual(entry.party.filter(hero => hero.hp > 0).map(hero => [hero.heroId, hero.hp]));
    expect(entry.party.map(hero => hero.xp)).toEqual(previous?.party.map(hero => hero.xp) ?? [0, 0, 0]);

    const settled = checkedDungeon(acceptDungeonBattle(entry, state));
    expect(settled).toMatchObject({ phase: 'ready', activeBattle: null });
    expect(currentFloor(settled).completed).toBe(index + 1);
    expect(dungeonStairStatus(settled, 'descend')).toBe(index === 2 ? 'available' : 'encounters');
    for (const [heroIndex, hero] of settled.party.entries()) {
      const before = entry.party[heroIndex];
      const battleHp = state.units.find(unit => unit.side === 'player' && unit.defId === hero.heroId)?.hp ?? 0;
      expect(hero.xp - before.xp).toBe(battleHp > 0 ? HERO_PROGRESSION.awards[selection.kind] : 0);
      expect(hero.hp).toBe(hero.level > before.level ? hero.maxHp : battleHp);
    }

    expect(selection.kind === 'boss').toBe(index === guardianIndex);
    if (index === guardianIndex) {
      expect(initial.units.filter(unit => unit.side === 'enemy').map(unit => unit.defId)).toEqual(guardian);
      expect(clearedDungeonSlots(currentFloor(settled))).toContain(2);
      await resumeGuardian(record, settled);
    }
    previous = settled;
  }

  const approach = atStairApproach(roundTrip(witness.state));
  const { id, depth, revision } = approach;
  const downstairs = currentFloor(approach).descriptor.downstairs;
  const descended = checkedDungeon(stepDungeon(approach, { id, depth, revision, destination: downstairs }));
  expect(descended).toMatchObject({ depth: 2, party: approach.party, ownership: approach.ownership });
  expect(descended.floors[0].descriptor).toEqual(currentFloor(witness.state).descriptor);
  roundTrip(descended);
}, 30_000);
