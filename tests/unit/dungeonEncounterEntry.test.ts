import { readFileSync } from 'node:fs';
import { assert, describe, expect, it } from 'vitest';
import { DungeonSession } from '../../src/app/DungeonSession';
import { canonical, hashJson } from '../../src/domain/contentIdentity';
import {
  acceptDungeonBattle, currentFloor, dungeonBoundary, dungeonItem, floorMap, freshDungeon,
  readDungeon, startDungeonBattle, stepDungeon, type DungeonState,
} from '../../src/domain/dungeon';
import { decodeDungeon, encodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { neighbors, poiCell } from '../../src/domain/exploration';
import { freshRunStats } from '../../src/domain/runStats';
import { createDungeonStorage, DUNGEON_KEYS } from '../../src/persistence/dungeonStorage';
import { atCell, atEncounter, checkedDungeon, dungeonContactApproach, withLegacySight } from '../helpers/dungeonFixtures';

function step(state: DungeonState, destination: number) {
  return checkedDungeon(stepDungeon(state, { id: state.id, depth: state.depth, revision: state.revision, destination }));
}
function contact(slot = 0) {
  const fixture = dungeonContactApproach(slot);
  return { state: step(fixture.state, fixture.approach), target: fixture.target };
}
function victory(state: DungeonState) {
  const battle = state.activeBattle!;
  return checkedDungeon(acceptDungeonBattle(state, {
    ...battle, outcome: 'playerWin', units: battle.units.map(unit => unit.side === 'enemy' ? { ...unit, hp: 0 } : unit),
  }));
}
function memory() {
  const values = new Map<string, string>();
  return {
    values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('dungeon interrupted encounter entry', () => {
  it.each([0, 1, 2])('starts slot %i before moving, visiting or advancing exploration', slot => {
    const { state, target } = contact(slot);
    const tracked = { ...state, stats: { ...freshRunStats(), movesTaken: 7 } };
    const before = structuredClone(tracked), floor = currentFloor(tracked);
    const entered = step(tracked, target), after = currentFloor(entered);
    expect(entered.phase).toBe('battle');
    expect(entered.encounterEntry).toEqual({ origin: floor.position, contact: target, slot });
    expect(after.position).toBe(floor.position);
    expect(after.exploration.visited).toEqual(floor.exploration.visited);
    expect(after.exploration.revealed).toEqual(floor.exploration.revealed);
    expect(after.exploration.movement).toEqual(floor.exploration.movement);
    expect(after.exploration.pois).toEqual(floor.exploration.pois);
    expect(entered.stats?.movesTaken).toBe(7);
    expect(entered.revision).toBe(tracked.revision + 1);
    expect(tracked).toEqual(before);
    expect(stepDungeon(entered, { id: entered.id, depth: entered.depth, revision: tracked.revision, destination: target }))
      .toEqual({ ok: false, reason: 'staleBoundary' });
    expect(startDungeonBattle(entered, target)).toEqual({ ok: false, reason: 'wrongPhase' });
    const saved = encodeDungeon(entered); assert(saved.ok);
    expect(JSON.parse(saved.text).format).toBe(18);
    expect(decodeDungeon(saved.text)).toEqual({ ok: true, state: entered });
    const envelope = JSON.parse(saved.text), { timeCoverage: _, ...counters } = entered.stats!;
    const body = { kind: envelope.kind, format: envelope.format, identity: envelope.identity,
      payload: { ...entered, stats: { ...counters, version: 1 } } };
    expect(decodeDungeon(canonical({ ...body, digest: hashJson(body) }))).toEqual({ ok: false, reason: 'invalidState' });
  });

  it('captures a moving enemy at its current contact cell rather than its seeded spawn', () => {
    let witness: { state: DungeonState; target: number; spawn: number } | undefined;
    for (let seed = 0; seed < 40 && !witness; seed++) {
      const initial = freshDungeon(`moved-contact-${seed}`, seed), floor = currentFloor(initial), map = floorMap(floor.descriptor);
      const destination = neighbors(floor.position, map.width, map.height)
        .find(cell => map.cells[cell] && !floor.exploration.pois.some(poi => poiCell(poi, map.width) === cell));
      if (destination === undefined) continue;
      const moved = step(initial, destination), next = currentFloor(moved);
      const target = poiCell(next.exploration.pois[0], map.width), spawn = poiCell(floor.exploration.pois[0], map.width);
      if (target === spawn) continue;
      const origin = neighbors(target, map.width, map.height)
        .find(cell => map.cells[cell] && !next.exploration.pois.some(poi => poiCell(poi, map.width) === cell));
      if (origin !== undefined) witness = { state: atCell(moved, origin), target, spawn };
    }
    assert(witness);
    const entered = step(witness.state, witness.target);
    expect(entered.encounterEntry?.contact).not.toBe(witness.spawn);
    expect(entered.encounterEntry).toEqual({ origin: currentFloor(witness.state).position, contact: witness.target, slot: 0 });
    expect(currentFloor(entered).exploration.movement).toEqual(currentFloor(witness.state).exploration.movement);
  });

  it.each([false, true])('roundtrips the captured contact with legacy sight=%s and rejects envelope downgrades', legacySight => {
    const { state, target } = contact();
    const entered = step(legacySight ? withLegacySight(state) : state, target);
    const saved = encodeDungeon(entered); assert(saved.ok);
    expect(decodeDungeon(saved.text)).toEqual({ ok: true, state: entered });
    const old = encodeDungeon(state); assert(old.ok);
    const older = JSON.parse(old.text), envelope = JSON.parse(saved.text);
    const body = { kind: envelope.kind, format: older.format, identity: older.identity, payload: envelope.payload };
    expect(decodeDungeon(canonical({ ...body, digest: hashJson(body) }))).toEqual({ ok: false, reason: 'incompatible' });
    const absent = { ...envelope.payload }; delete absent.encounterEntry;
    const missing = { kind: envelope.kind, format: envelope.format, identity: envelope.identity, payload: absent };
    expect(decodeDungeon(canonical({ ...missing, digest: hashJson(missing) })).ok).toBe(false);
  });

  it('rejects malformed, nonadjacent and mismatched entry data and owns admitted copies', () => {
    const { state, target } = contact(), entered = step(state, target), entry = entered.encounterEntry!;
    for (const encounterEntry of [null, { ...entry, origin: -1 }, { ...entry, origin: target },
      { ...entry, contact: entry.origin }, { ...entry, contact: 400 }, { ...entry, slot: 3 },
      { ...entry, slot: (entry.slot + 1) % 3 }, { ...entry, extra: true }]) {
      expect(readDungeon({ ...entered, encounterEntry }).ok).toBe(false);
    }
    expect(readDungeon({ ...state, encounterEntry: entry }).ok).toBe(false);
    expect(startDungeonBattle(state, entry.origin)).toEqual({ ok: false, reason: 'blockedStep' });
    expect(startDungeonBattle(state, -1)).toEqual({ ok: false, reason: 'blockedStep' });
    const input = structuredClone(entered), read = readDungeon(input); assert(read.ok);
    (input.encounterEntry as { contact: number }).contact = entry.origin;
    expect(read.state.encounterEntry).toEqual(entry);
  });

  it('settles victory at the origin, preserving the reward until a normal pickup step', () => {
    const { state, target } = contact(), entered = step(state, target), won = victory(entered);
    expect(won.encounterEntry).toBeUndefined();
    expect(currentFloor(won).position).toBe(currentFloor(state).position);
    expect(currentFloor(won).completed).toBe(1);
    expect(won.phase).toBe('ready'); expect(won.offer).toBeNull();
    expect(currentFloor(won).loot).toMatchObject([{slot:0,cell:target,quantity:1,remaining:1}]);
    const encoded = encodeDungeon(won); assert(encoded.ok);
    expect(decodeDungeon(encoded.text)).toEqual({ ok: true, state: won });
    expect(currentFloor(won).exploration.movement).toEqual(currentFloor(state).exploration.movement);
    expect(acceptDungeonBattle(won, entered.activeBattle!)).toEqual({ ok: false, reason: 'staleBoundary' });
    const moved = step(won, target);
    expect(currentFloor(moved).position).toBe(target);
    expect(currentFloor(moved).loot?.[0].remaining).toBe(0);
    expect(currentFloor(moved).exploration.movement!.step).toBe(currentFloor(state).exploration.movement!.step + 1);
  });

  it('settles defeat at the origin without a reward or retained movement', () => {
    const { state, target } = contact(), entered = step(state, target), battle = entered.activeBattle!;
    const lost = checkedDungeon(acceptDungeonBattle(entered, {
      ...battle, outcome: 'playerLoss', units: battle.units.map(unit => unit.side === 'player' ? { ...unit, hp: 0 } : unit),
    }));
    expect(lost.phase).toBe('defeat'); expect(lost.offer).toBeNull(); expect(lost.encounterEntry).toBeUndefined();
    expect(currentFloor(lost).position).toBe(currentFloor(state).position);
    expect(currentFloor(lost).completed).toBe(0);
  });

  it.each(['active', 'reward'])('preserves an older %s snapshot exactly without inventing an origin', phase => {
    const raw = readFileSync(`tests/fixtures/saves/issue-172/dungeon-${phase}.json`, 'utf8');
    const read = decodeDungeon(raw); assert(read.ok);
    expect(read.state).toEqual(JSON.parse(raw).payload);
    expect(read.state.encounterEntry).toBeUndefined();
    if (phase === 'active') {
      const won = victory(read.state);
      expect(won.encounterEntry).toBeUndefined();
      expect(currentFloor(won).position).toBe(currentFloor(read.state).position);
      expect(won.phase).toBe('reward');
    } else {
      assert(read.state.offer);
      const settled = checkedDungeon(dungeonItem(read.state, { ...dungeonBoundary(read.state), type: 'claimReward',
        offerId: read.state.offer.id, itemId: read.state.offer.options[0].itemId }));
      expect(settled.encounterEntry).toBeUndefined();
      expect(currentFloor(settled).position).toBe(currentFloor(read.state).position);
    }
    const legacyStart = checkedDungeon(startDungeonBattle(atEncounter(freshDungeon('legacy-direct', 13))));
    expect(legacyStart.encounterEntry).toBeUndefined();
  });

  it('retains a real pre-contact rollback checkpoint through battle and reward writes', () => {
    const { state, target } = contact(), entered = step(state, target), data = memory(), storage = createDungeonStorage(() => data);
    assert(storage.save(state).ok); assert(storage.save(entered).ok);
    const backup = storage.inspect().backup; assert(backup.status === 'valid');
    expect(backup.state).toEqual(state);
    assert(storage.save({ ...entered, revision: entered.revision + 1 }).ok);
    assert(storage.save(victory(entered)).ok);
    expect(storage.inspect().backup.text).toBe(backup.text);
    const primary = storage.inspect().primary; assert(primary.status === 'valid');
    expect(primary.state.encounterEntry).toBeUndefined();
    expect(currentFloor(primary.state).loot?.[0].cell).toBe(entered.encounterEntry?.contact);
  });

  it('creates a valid pre-contact preparation checkpoint for a ledger battle with no previous save', () => {
    const { state, target } = contact();
    const supplied = { ...state, ownership: { ...state.ownership, consumables: [{ itemId: 'item:healing_draught' as const, quantity: 2 }] } };
    const entered = step(supplied, target), data = memory(), stable = createDungeonStorage(() => data);
    assert(stable.save(entered).ok);
    const backup = stable.inspect().backup; assert(backup.status === 'valid');
    expect(backup.state.phase).toBe('ready'); expect(backup.state.encounterEntry).toBeUndefined();
    expect(currentFloor(backup.state).position).toBe(currentFloor(state).position);
    const primary = stable.inspect().primary; assert(primary.status === 'valid');
    expect(primary.state).toEqual(entered);
  });

  it('refuses a failed entry save without moving and can resume the accepted origin/contact exactly once', async () => {
    const { state, target } = contact(), data = memory(), storage = createDungeonStorage(() => data), owner = new DungeonSession(state, storage);
    assert(await owner.save()); assert(owner.continue(owner.inspect()));
    const before = owner.snapshot, primary = data.getItem(DUNGEON_KEYS.primary), write = data.setItem;
    data.setItem = () => { throw Object.assign(Error('full'), { name: 'QuotaExceededError' }); };
    const command = { ...owner.spatialBoundary, destination: target };
    expect(await owner.step(command)).toBe(false);
    expect(owner.snapshot).toEqual(before); expect(data.getItem(DUNGEON_KEYS.primary)).toBe(primary);
    data.setItem = write;
    assert(await owner.step(command));
    const accepted = owner.snapshot;
    expect(await owner.step(command)).toBe(false);
    expect(owner.snapshot).toEqual(accepted);
    owner.dispose();
    const resumed = new DungeonSession(state, storage); assert(resumed.continue(resumed.inspect()));
    expect(resumed.snapshot).toEqual(accepted);
    expect(currentFloor(resumed.snapshot).position).toBe(currentFloor(state).position);
    assert(await resumed.startEncounter());
    expect(resumed.snapshot.encounterEntry).toEqual(accepted.encounterEntry);
    resumed.dispose();
  });
});
