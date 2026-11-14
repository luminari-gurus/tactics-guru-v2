import { assert, describe, expect, it } from 'vitest';
import { dungeonContent } from '../../src/content/dungeon';
import { canonical, hashJson } from '../../src/domain/contentIdentity';
import {
  acceptDungeonBattle, collectableDungeonLoot, currentFloor, dungeonBoundary, dungeonItem, dungeonLootReward,
  dungeonOffer, floorMap, readDungeon, startDungeonBattle, stepDungeon, type DungeonLoot, type DungeonState,
} from '../../src/domain/dungeon';
import { decodeDungeon, encodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { neighbors, poiCell } from '../../src/domain/exploration';
import { freshRunStats } from '../../src/domain/runStats';
import { createDungeonStorage } from '../../src/persistence/dungeonStorage';
import { atCell, atStairApproach, checkedDungeon, dungeonContactApproach, dungeonGroundPileFixture } from '../helpers/dungeonFixtures';

const step = (state: DungeonState, destination: number) => checkedDungeon(stepDungeon(state, {
  id: state.id, depth: state.depth, revision: state.revision, destination,
}));
function win(state: DungeonState) {
  const battle = state.activeBattle!;
  return checkedDungeon(acceptDungeonBattle(state, { ...battle, outcome: 'playerWin',
    units: battle.units.map(unit => unit.side === 'enemy' ? { ...unit, hp: 0 } : unit) }));
}
function victory(seed = 13) {
  const fixture = dungeonContactApproach(0, seed), origin = atCell(fixture.state, fixture.approach);
  return win(checkedDungeon(startDungeonBattle(origin, fixture.target)));
}
function inventory(state: DungeonState, equipmentCount: number) {
  return checkedDungeon(readDungeon({ ...state, ownership: { assignments: [],
    consumables: [{ itemId: 'item:healing_draught', quantity: 9 }, { itemId: 'item:revive_kit', quantity: 9 }],
    equipment: Array.from({ length: equipmentCount }, (_, index) => ({
      instanceId: `${state.id}:floor:${Math.floor(index / 3) + 1}:reward:${index % 3}:option:0`, itemId: 'item:warding_charm',
    })),
  } }));
}
function equipmentPile() {
  for (let seed = 0; seed < 30; seed++) {
    const state = dungeonGroundPileFixture(seed, 3);
    if (currentFloor(state).loot!.filter(loot => dungeonContent.items[loot.itemId].kind === 'equipment').length >= 2) return state;
  }
  throw Error('No seeded equipment pile');
}

describe('seeded dungeon ground loot', () => {
  it('creates one seeded quantity-one reward per victory without claiming, moving, or consuming combat RNG', () => {
    for (let seed = 0; seed < 12; seed++) {
      const fixture = dungeonContactApproach(0, seed), origin = atCell(fixture.state, fixture.approach);
      const entered = checkedDungeon(startDungeonBattle({ ...origin, stats: freshRunStats() }, fixture.target));
      const before = structuredClone(entered), won = win(entered), floor = currentFloor(won), loot = floor.loot!;
      expect(won.phase).toBe('ready'); expect(won.offer).toBeNull(); expect(floor.exploration.active).toBeNull();
      expect(floor.completed).toBe(1); expect(floor.exploration.cleared).toEqual([0]);
      expect(won.party.every((hero, index) => hero.xp > entered.party[index].xp)).toBe(true);
      expect(loot).toEqual([dungeonLootReward(won, 0, 0, fixture.target)]);
      expect(loot[0].itemId).toBe(dungeonOffer(won).options[0].itemId);
      expect(won.ownership).toEqual(origin.ownership);
      expect(floor.position).toBe(currentFloor(origin).position);
      expect(won.stats?.movesTaken).toBe(0);
      expect(floor.exploration.movement).toEqual(currentFloor(entered).exploration.movement);
      expect(entered).toEqual(before);
      expect(acceptDungeonBattle(won, entered.activeBattle!)).toEqual({ ok: false, reason: 'staleBoundary' });
      expect(collectableDungeonLoot(won, fixture.target)).toBe(1);
      expect(currentFloor(won).loot).toEqual(loot);
    }
  });

  it('automatically collects independent same-cell records in completion order without equipping or healing', () => {
    const source = dungeonGroundPileFixture(), floor = currentFloor(source), position = floor.loot![0].cell;
    expect(new Set(floor.loot!.map(loot => loot.id)).size).toBe(3);
    expect(collectableDungeonLoot(source, position)).toBe(3);
    const collected = step(source, position), after = currentFloor(collected);
    expect(after.loot).toEqual(floor.loot!.map(loot => ({ ...loot, remaining: 0 })));
    expect(collected.ownership.equipment.length + collected.ownership.consumables.reduce((sum, stack) => sum + stack.quantity, 0)).toBe(3);
    expect(collected.ownership.assignments).toEqual([]); expect(collected.party).toEqual(source.party);
    expect(collectableDungeonLoot(collected, position)).toBe(0);
    const away = step(collected, floor.position), back = step(away, position);
    expect(back.ownership).toEqual(collected.ownership); expect(currentFloor(back).loot).toEqual(after.loot);
  });

  it('collects the earliest fitting equipment and preserves exact later/full-stack records', () => {
    const source = inventory(equipmentPile(), 5), floor = currentFloor(source), first = floor.loot!.find(loot => dungeonContent.items[loot.itemId].kind === 'equipment')!;
    expect(collectableDungeonLoot(source, first.cell)).toBe(1);
    const collected = step(source, first.cell);
    expect(collected.ownership.equipment).toHaveLength(6);
    expect(collected.ownership.equipment).toContainEqual({ instanceId: first.id, itemId: first.itemId });
    expect(currentFloor(collected).loot).toEqual(floor.loot!.map(loot => ({ ...loot, remaining: loot.id === first.id ? 0 : 1 })));
    expect(collected.ownership.consumables).toEqual(source.ownership.consumables);
    expect(collected.ownership.assignments).toEqual([]);
  });

  it('allows walking onto a full pile, then retries a confirmed discard without an enemy tick', () => {
    const source = inventory(equipmentPile(), 6), floor = currentFloor(source), first = floor.loot!.find(loot => dungeonContent.items[loot.itemId].kind === 'equipment')!;
    expect(collectableDungeonLoot(source, first.cell)).toBe(0);
    const full = step(source, first.cell), movement = currentFloor(full).exploration.movement;
    expect(currentFloor(full).position).toBe(first.cell); expect(currentFloor(full).loot).toEqual(floor.loot);
    expect(full.ownership).toEqual(source.ownership);
    const command = { ...dungeonBoundary(full), type: 'discardEquipment' as const, instanceId: full.ownership.equipment[0].instanceId };
    const freed = checkedDungeon(dungeonItem(full, command));
    expect(currentFloor(freed).position).toBe(first.cell); expect(currentFloor(freed).exploration.movement).toEqual(movement);
    expect(freed.revision).toBe(full.revision + 1); expect(freed.ownership.equipment).toHaveLength(6);
    expect(freed.ownership.equipment).toContainEqual({ instanceId: first.id, itemId: first.itemId });
    expect(currentFloor(freed).loot!.find(loot => loot.id === first.id)?.remaining).toBe(0);
    expect(dungeonItem(freed, command)).toEqual({ ok: false, reason: 'staleBoundary' });
  });

  it('starts an occupied-pile encounter before collection and keeps both encounter rewards on the same cell', () => {
    const source = victory(), floor = currentFloor(source), loot = floor.loot![0], width = floor.descriptor.size ?? 20;
    const occupied = checkedDungeon(readDungeon({ ...source, floors: [{ ...floor,
      exploration: { ...floor.exploration, pois: floor.exploration.pois.map(poi => poi.encounterSlot === 1
        ? { ...poi, x: loot.cell % width, y: Math.floor(loot.cell / width) } : poi) },
    }] }));
    expect(collectableDungeonLoot(occupied, loot.cell)).toBe(0);
    const entry = step(occupied, loot.cell);
    expect(entry.phase).toBe('battle'); expect(entry.encounterEntry?.slot).toBe(1);
    expect(currentFloor(entry).position).toBe(floor.position);
    expect(entry.ownership).toEqual(occupied.ownership); expect(currentFloor(entry).loot).toEqual(floor.loot);
    const won = win(entry), rewards = currentFloor(won).loot!;
    expect(rewards).toHaveLength(2); expect(rewards[0]).toEqual(loot);
    expect(rewards[1]).toEqual(dungeonLootReward(won, 1, 1, loot.cell));
    const picked = step(won, loot.cell);
    expect(currentFloor(picked).loot?.every(record => record.remaining === 0)).toBe(true);
  });

  it('does not collect an occupied pile during preparation on a legacy occupied-cell boundary', () => {
    const source = victory(), floor = currentFloor(source), loot = floor.loot![0], width = floor.descriptor.size ?? 20;
    const staged = atCell({ ...source, floors: [{ ...floor, exploration: { ...floor.exploration,
      pois: floor.exploration.pois.map(poi => poi.encounterSlot === 1 ? { ...poi, x: loot.cell % width, y: Math.floor(loot.cell / width) } : poi) } }],
      party: source.party.map(hero => hero.heroId === 'fighter' ? { ...hero, hp: Math.max(1, hero.maxHp - 1) } : hero),
      ownership: { ...source.ownership, consumables: [{ itemId: 'item:healing_draught', quantity: 1 }] },
    }, loot.cell);
    const admitted = checkedDungeon(readDungeon(staged));
    const used = checkedDungeon(dungeonItem(admitted, { ...dungeonBoundary(admitted), type: 'useItem', itemId: 'item:healing_draught', heroId: 'fighter' }));
    expect(currentFloor(used).loot).toEqual(floor.loot); expect(used.ownership.consumables).toEqual([]);
  });

  it('allows final-floor descent with uncollected loot and restores the exact pile on return', () => {
    const source = dungeonGroundPileFixture(), loot = currentFloor(source).loot;
    const approach = atStairApproach(source), descended = step(approach, currentFloor(approach).descriptor.downstairs);
    expect(descended.depth).toBe(2); expect(descended.floors[0].loot).toEqual(loot);
    const encoded = encodeDungeon(descended); assert(encoded.ok);
    const resumed = decodeDungeon(encoded.text); assert(resumed.ok);
    const upstairs = atStairApproach(resumed.state, 'ascend'), returned = step(upstairs, currentFloor(upstairs).descriptor.upstairs);
    expect(returned.depth).toBe(1); expect(currentFloor(returned).loot).toEqual(loot);
    expect(currentFloor(returned).completed).toBe(3); expect(returned.ownership).toEqual(source.ownership);
  });

  it('collects a pile on an available stair before travel in the same accepted revision', () => {
    const source = dungeonGroundPileFixture(), floor = currentFloor(source), map = floorMap(floor.descriptor), target = floor.descriptor.downstairs;
    const origin = neighbors(target, map.width, map.height).find(cell => map.cells[cell])!;
    const staged = atCell({ ...source, floors: [{ ...floor,
      exploration: { ...floor.exploration, pois: floor.exploration.pois.map(poi => ({ ...poi, x: target % map.width, y: Math.floor(target / map.width) })) },
      loot: floor.loot!.map(loot => ({ ...loot, cell: target })),
    }] }, origin);
    const admitted = checkedDungeon(readDungeon(staged)), descended = step(admitted, target);
    expect(descended.depth).toBe(2); expect(descended.revision).toBe(admitted.revision + 1);
    expect(descended.floors[0].loot?.every(loot => loot.remaining === 0)).toBe(true);
    expect(descended.ownership.equipment.length + descended.ownership.consumables.reduce((sum, stack) => sum + stack.quantity, 0)).toBe(3);
  });

  it('versions ground and depleted saves, preserves identities on load, and cannot disguise them as old formats', () => {
    const initial = victory(), cell = currentFloor(initial).loot![0].cell;
    for (const source of [initial, step(initial, cell)]) {
      const encoded = encodeDungeon(source); assert(encoded.ok);
      const envelope = JSON.parse(encoded.text);
      expect(envelope.format).toBe(19); expect(decodeDungeon(encoded.text)).toEqual({ ok: true, state: source });
      const disguised = { kind: envelope.kind, identity: envelope.identity, payload: envelope.payload, format: 18 };
      expect(decodeDungeon(canonical({ ...disguised, digest: hashJson(disguised) }))).toEqual({ ok: false, reason: 'incompatible' });
    }
    const values = new Map<string, string>(), storage = createDungeonStorage(() => ({
      getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); },
    }));
    assert(storage.save(initial).ok);
    const collected = step(initial, cell); assert(storage.save(collected).ok);
    const backup = storage.inspect().backup; assert(backup.status === 'valid');
    expect(backup.state).toEqual(initial); expect(backup.checkpoint).toBeUndefined();
    const primary = storage.inspect().primary; assert(primary.status === 'valid'); expect(primary.state).toEqual(collected);
  });

  it('rejects record tampering, duplicate rewards, conflicting offers, and duplicate/mismatched equipment provenance', () => {
    const source = equipmentPile(), floor = currentFloor(source), loot = floor.loot!;
    const changed = (records: unknown) => readDungeon({ ...source, floors: source.floors.map((value, index) => index === source.depth - 1 ? { ...value, loot: records } : value) });
    for (const patch of [{ id: 'foreign' }, { slot: 3 }, { rewardIndex: 3 }, { cell: -1 }, { quantity: 2 }, { remaining: 2 },
      { itemId: loot[0].itemId === 'item:healing_draught' ? 'item:revive_kit' : 'item:healing_draught' }]) {
      expect(changed([{ ...loot[0], ...patch }, ...loot.slice(1)]).ok).toBe(false);
    }
    expect(changed([loot[0], loot[0]]).ok).toBe(false); expect(changed([...loot].reverse()).ok).toBe(false);
    const reward = { ...source, phase: 'reward' as const, floors: source.floors.map((value, index) => index !== source.depth - 1 ? value
      : { ...value, position: loot[2].cell, exploration: { ...atCell(source, loot[2].cell).floors[index].exploration, active: 2 } }) };
    expect(readDungeon({ ...reward, offer: dungeonOffer(reward) })).toEqual({ ok: false, reason: 'invalidPhase' });
    const collected = step(source, loot[0].cell), gear = collected.ownership.equipment[0]; assert(gear);
    const uncollected = { ...collected, floors: collected.floors.map((value, index) => index !== collected.depth - 1 ? value
      : { ...value, loot: value.loot!.map(record => record.id === gear.instanceId ? { ...record, remaining: 1 } : record) }) };
    expect(readDungeon(uncollected).ok).toBe(false);
    const wrong = gear.itemId === 'item:aiming_charm' ? 'item:warding_charm' : 'item:aiming_charm';
    expect(readDungeon({ ...collected, ownership: { ...collected.ownership, equipment: collected.ownership.equipment.map(record => record === gear ? { ...record, itemId: wrong } : record) } }).ok).toBe(false);
    const record = loot.find(value => value.id === gear.instanceId)!;
    expect(readDungeon({ ...collected, ownership: { ...collected.ownership, equipment: [...collected.ownership.equipment,
      { instanceId: `${collected.id}:floor:${collected.depth}:reward:${record.rewardIndex}:option:0`, itemId: gear.itemId }] } }).ok).toBe(false);
    const input = structuredClone(source), read = readDungeon(input); assert(read.ok);
    (currentFloor(input).loot as DungeonLoot[])[0] = { ...loot[0], remaining: 0 };
    expect(currentFloor(read.state).loot).toEqual(loot);
  });
});
