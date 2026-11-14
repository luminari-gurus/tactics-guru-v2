import { assert, expect, it } from 'vitest';
import { DungeonSession } from '../../src/app/DungeonSession';
import { dungeonContent } from '../../src/content/dungeon';
import { autoCollectDungeon, victoryAutoCollectIntent } from '../../src/domain/dungeonAutoCollect';
import { acceptDungeonBattle, currentFloor, dungeonLootReward, floorDescriptor, floorMap, freshDungeon,
  readDungeon, startDungeonBattle, stepDungeon, type DungeonResult, type DungeonState } from '../../src/domain/dungeon';
import { freshExploration, movableExploration, neighbors, poiCell } from '../../src/domain/exploration';
import { createDungeonStorage, DUNGEON_KEYS } from '../../src/persistence/dungeonStorage';
import { atCell, atEncounter, dungeonContactApproach } from '../helpers/dungeonFixtures';

const good = (result: DungeonResult) => { assert(result.ok, result.ok ? '' : result.reason); return result.state; };
function win(entry: DungeonState) {
  const battle = entry.activeBattle!;
  return good(acceptDungeonBattle(entry, { ...battle, outcome: 'playerWin',
    units: battle.units.map(unit => unit.side === 'enemy' ? { ...unit, hp: 0 } : unit) }));
}
function victory(seed = 13) {
  const { state, approach, target } = dungeonContactApproach(0, seed);
  const entry = good(startDungeonBattle(atCell(state, approach), target)), won = win(entry);
  const intent = victoryAutoCollectIntent(entry, won); assert(intent);
  return { entry, won, intent };
}
function memory() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, text: string) => { values.set(key, text); }, removeItem: (key: string) => { values.delete(key); } };
}

it('completes exactly the ordinary interrupted step, including the same single enemy tick and pickup', () => {
  const { won, intent } = victory(), before = structuredClone(won);
  const automatic = good(autoCollectDungeon(won, intent));
  const manual = good(stepDungeon(won, { id: won.id, depth: won.depth, revision: won.revision, destination: intent.destination }));
  expect(automatic).toEqual(manual); expect(won).toEqual(before);
  expect(currentFloor(automatic).position).toBe(intent.destination);
  expect(currentFloor(automatic).exploration.movement!.step).toBe(currentFloor(won).exploration.movement!.step + 1);
  expect(currentFloor(automatic).loot![0].remaining).toBe(0);
  expect(autoCollectDungeon(automatic, intent)).toEqual({ ok: false, reason: 'staleBoundary' });
});

it('rejects every stale identity, contact and reward binding without redirecting', () => {
  const { won, intent } = victory(), before = structuredClone(won);
  for (const patch of [{ id: 'other-dungeon' }, { depth: won.depth + 1 }, { revision: won.revision + 1 },
    { origin: intent.destination }, { destination: intent.origin }, { destination: -1 }, { slot: 2 }, { lootId: 'other-reward' }]) {
    expect(autoCollectDungeon(won, { ...intent, ...patch }).ok).toBe(false);
    expect(won).toEqual(before);
  }
  expect(autoCollectDungeon(won, { ...intent, extra: true } as typeof intent)).toEqual({ ok: false, reason: 'invalidCommand' });
});

it('does not enter another live encounter standing on the intended pile', () => {
  const { won, intent } = victory(), floor = currentFloor(won), width = floorMap(floor.descriptor).width;
  const occupied = good(readDungeon({ ...won, floors: [{ ...floor, exploration: { ...floor.exploration,
    pois: floor.exploration.pois.map(poi => poi.encounterSlot === 1
      ? { ...poi, x: intent.destination % width, y: Math.floor(intent.destination / width) } : poi) } }] }));
  expect(autoCollectDungeon(occupied, intent)).toEqual({ ok: false, reason: 'occupiedLoot' });
  const manual = good(stepDungeon(occupied, { id: won.id, depth: won.depth, revision: won.revision, destination: intent.destination }));
  expect(manual.phase).toBe('battle'); expect(currentFloor(manual).position).toBe(intent.origin);
  expect(currentFloor(manual).loot).toEqual(floor.loot);
});

it('keeps the origin when nothing fits and performs partial collection when any content fits', () => {
  // Structural multi-floor capacity fixture: earlier legacy charms remain owned,
  // while three independently seeded encounter rewards share one current cell.
  let fixture: { state: DungeonState; intent: NonNullable<ReturnType<typeof victoryAutoCollectIntent>> } | undefined;
  for (let seed = 1; seed <= 30 && !fixture; seed++) {
    const base = freshDungeon('auto-partial', seed), floors = [1, 2, 3, 4].map(depth => {
      const descriptor = floorDescriptor(seed, depth), map = floorMap(descriptor);
      return { descriptor, position: descriptor.upstairs, completed: 3,
        exploration: movableExploration(freshExploration(descriptor.seed, descriptor.upstairs, map), descriptor.seed, 3, 'ready') };
    });
    const floor = floors[3], map = floorMap(floor.descriptor);
    const cell = neighbors(floor.position, map.width, map.height).find(value => map.cells[value] && value !== floor.descriptor.downstairs);
    if (cell === undefined) continue;
    const source = { id: base.id, seed, depth: 4 }, loot = [0, 1, 2].map(slot => dungeonLootReward(source, slot, slot, cell));
    if (!loot.some(item => dungeonContent.items[item.itemId].kind === 'equipment') || !loot.some(item => dungeonContent.items[item.itemId].kind === 'consumable')) continue;
    const equipment = Array.from({ length: 6 }, (_, index) => ({ itemId: 'item:warding_charm' as const,
      instanceId: `${base.id}:floor:${Math.floor(index / 2) + 1}:reward:${index % 2}:option:0` }));
    const current = { ...floor, loot, exploration: { ...floor.exploration,
      pois: floor.exploration.pois.map(poi => ({ ...poi, x: cell % map.width, y: Math.floor(cell / map.width) })) } };
    const state = good(readDungeon({ ...base, depth: 4, floors: [...floors.slice(0, 3), current],
      ownership: { consumables: [], equipment, assignments: [] } }));
    fixture = { state, intent: { id: state.id, depth: 4, revision: state.revision, origin: floor.position,
      destination: cell, slot: 2, lootId: loot[2].id } };
  }
  assert(fixture);
  const { state, intent } = fixture;
  const full = good(readDungeon({ ...state, ownership: { ...state.ownership,
    consumables: Object.values(dungeonContent.items).filter(item => item.kind === 'consumable').map(item => ({ itemId: item.id, quantity: 9 })) } }));
  expect(autoCollectDungeon(full, intent)).toEqual({ ok: false, reason: 'capacity' });
  expect(currentFloor(full).position).toBe(intent.origin);
  expect(currentFloor(full).loot!.every(item => item.remaining === 1)).toBe(true);
  const partial = good(autoCollectDungeon(state, intent));
  expect(currentFloor(partial).position).toBe(intent.destination);
  expect(partial.ownership.equipment).toEqual(state.ownership.equipment);
  for (const loot of currentFloor(partial).loot!) expect(loot.remaining).toBe(dungeonContent.items[loot.itemId].kind === 'equipment' ? 1 : 0);
});

it('cancels an automatic step that would descend, while a manual step collects before travel', () => {
  const base = freshDungeon('auto-stairs', 13), floor = currentFloor(base), map = floorMap(floor.descriptor), contact = floor.descriptor.downstairs;
  const origin = neighbors(contact, map.width, map.height).find(cell => map.cells[cell])!;
  const exploration = movableExploration(floor.exploration, floor.descriptor.seed, 2, 'ready');
  const staged = atCell({ ...base, floors: [{ ...floor, completed: 2, exploration: { ...exploration,
    pois: exploration.pois.map(poi => poi.encounterSlot === 2 ? { ...poi, x: contact % map.width, y: Math.floor(contact / map.width) } : poi) } }] }, origin);
  const entry = good(startDungeonBattle(good(readDungeon(staged)), contact)), won = win(entry), intent = victoryAutoCollectIntent(entry, won); assert(intent);
  expect(autoCollectDungeon(won, intent)).toEqual({ ok: false, reason: 'automaticStairs' });
  const manual = good(stepDungeon(won, { id: won.id, depth: won.depth, revision: won.revision, destination: contact }));
  expect(manual.depth).toBe(2); expect(manual.floors[0].loot![0].remaining).toBe(0);
});

it('does not create automatic intent from defeat, an old occupied-cell battle, or restored ready loot', () => {
  const { entry, won } = victory(), battle = entry.activeBattle!;
  const lost = good(acceptDungeonBattle(entry, { ...battle, outcome: 'playerLoss', units: battle.units.map(unit => unit.side === 'player' ? { ...unit, hp: 0 } : unit) }));
  expect(victoryAutoCollectIntent(entry, lost)).toBeNull();
  expect(victoryAutoCollectIntent(won, won)).toBeNull();
  const legacy = good(startDungeonBattle(atEncounter(freshDungeon('old-active', 13))));
  expect(victoryAutoCollectIntent(legacy, win(legacy))).toBeNull();
});

it('rechecks interaction state inside the queued save boundary and does not move after cancellation', async () => {
  const { won, intent } = victory(), data = memory(), storage = createDungeonStorage(() => data);
  assert(storage.save(won).ok);
  const pending: (() => void)[] = [], owner = new DungeonSession(won, storage, null, undefined, task => pending.push(task));
  assert(owner.continue(owner.inspect())); let current = true;
  const result = owner.autoCollect(intent, () => current);
  expect(pending).toHaveLength(1); current = false; pending.shift()!();
  expect(await result).toBe(false); expect(owner.snapshot).toEqual(won);
});

it('saves one automatic transition and never schedules it when a completed save is loaded', async () => {
  const { won, intent } = victory(), data = memory(), storage = createDungeonStorage(() => data); assert(storage.save(won).ok);
  const owner = new DungeonSession(won, storage); let events = 0; owner.onVictory = () => { events++; };
  assert(owner.continue(owner.inspect())); expect(events).toBe(0);
  expect(await owner.autoCollect(intent, () => true)).toBe(true);
  expect(owner.snapshot.stats).toMatchObject({ coverage: 'since-upgrade', movesTaken: 1 });
  const accepted = owner.snapshot, raw = data.getItem(DUNGEON_KEYS.primary);
  expect(await owner.autoCollect(intent, () => true)).toBe(false); expect(owner.snapshot).toEqual(accepted);
  owner.dispose(); const restored = new DungeonSession(won, storage); restored.onVictory = () => { events++; };
  assert(restored.continue(restored.inspect())); expect(restored.snapshot).toEqual(accepted);
  expect(events).toBe(0); expect(data.getItem(DUNGEON_KEYS.primary)).toBe(raw);
});

it('emits one newly accepted victory event but leaves the party at origin until its owner requests the step', async () => {
  const { entry } = victory(), battle = entry.activeBattle!;
  const terminal = { ...entry, activeBattle: { ...battle, outcome: 'playerWin' as const,
    units: battle.units.map(unit => unit.side === 'enemy' ? { ...unit, hp: 0 } : unit) } };
  const owner = new DungeonSession(terminal, null), received: unknown[] = [];
  owner.onVictory = intent => received.push(intent);
  expect(await owner.startEncounter()).toBeNull(); expect(received).toHaveLength(1);
  expect(currentFloor(owner.snapshot).position).toBe(entry.encounterEntry!.origin);
  expect(currentFloor(owner.snapshot).loot![0].remaining).toBe(1);
  expect(await owner.startEncounter()).toBeNull(); expect(received).toHaveLength(1);
});

it('does not move automatically when the victory save failed', async () => {
  const { entry } = victory(), battle = entry.activeBattle!;
  const terminal = { ...entry, activeBattle: { ...battle, outcome: 'playerWin' as const,
    units: battle.units.map(unit => unit.side === 'enemy' ? { ...unit, hp: 0 } : unit) } };
  const data = memory(), storage = createDungeonStorage(() => data); assert(storage.save(terminal).ok);
  const owner = new DungeonSession(terminal, storage); assert(owner.continue(owner.inspect()));
  let intent: ReturnType<typeof victoryAutoCollectIntent> = null; owner.onVictory = value => { intent = value; };
  data.setItem = () => { throw Object.assign(Error('full'), { name: 'QuotaExceededError' }); };
  expect(await owner.startEncounter()).toBeNull(); assert(intent); const settled = owner.snapshot;
  expect(owner.hasUnsavedProgress).toBe(true);
  expect(await owner.autoCollect(intent, () => true)).toBe(false);
  expect(owner.snapshot).toEqual(settled); expect(owner.status).toContain('Save recovery');
});
