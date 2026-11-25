import { assert, expect, it } from 'vitest';
import { DungeonSession } from '../../src/app/DungeonSession';
import { dungeonContent } from '../../src/content/dungeon';
import { acceptDungeonBattle, currentFloor, dungeonBoundary, freshDungeon, readDungeon, startDungeonBattle, stepDungeon,
  type DungeonResult, type DungeonState } from '../../src/domain/dungeon';
import { freshRunStats } from '../../src/domain/runStats';
import { createDungeonStorage, DUNGEON_KEYS } from '../../src/persistence/dungeonStorage';
import { atCell, dungeonContactApproach, dungeonGroundPileFixture, sharedGroundPile } from '../helpers/dungeonFixtures';

const good = (result: DungeonResult) => { assert(result.ok, result.ok ? '' : result.reason); return result.state; };
function memory() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, text: string) => { values.set(key, text); }, removeItem: (key: string) => { values.delete(key); } };
}
function victory(seed = 13) {
  const { state, approach, target } = dungeonContactApproach(0, seed);
  const entry = good(startDungeonBattle(atCell(state, approach), target));
  const battle = entry.activeBattle!;
  const result = good(acceptDungeonBattle(entry, { ...battle, outcome: 'playerWin',
    units: battle.units.map(unit => unit.side === 'enemy' ? { ...unit, hp: 0 } : unit) }));
  expect(currentFloor(result).loot).toHaveLength(1);
  return result;
}
function potionVictory() {
  for (let seed = 1; seed < 100; seed++) {
    const state = victory(seed);
    if (currentFloor(state).loot![0].itemId === 'item:healing_draught') return state;
  }
  throw Error('No seeded draught fixture');
}
function savedOwner(initial: DungeonState, serializeWrite?: (task: () => void, unavailable: () => void) => void) {
  const data = memory(), storage = createDungeonStorage(() => data);
  assert(storage.save(initial).ok);
  const owner = new DungeonSession(initial, storage, null, undefined, serializeWrite);
  assert(owner.continue(owner.inspect()));
  return { data, storage, owner };
}

it.each([
  { floor: 'active', makeState: victory, enemySteps: 1 },
  { floor: 'cleared', makeState: dungeonGroundPileFixture, enemySteps: 0 },
])('persists a manual pickup once on $floor floors, including after reload', async ({ makeState, enemySteps }) => {
  const initial = { ...makeState(), stats: freshRunStats('since-upgrade') };
  const { storage, owner } = savedOwner(initial), loot = currentFloor(initial).loot![0];
  const before = storage.inspect().primary; assert(before.status === 'valid');
  expect(currentFloor(before.state).loot![0].remaining).toBe(1);
  const command = { ...owner.spatialBoundary, destination: loot.cell };
  expect(await owner.step(command)).toBe(true);
  expect(currentFloor(owner.snapshot).loot![0].remaining).toBe(0);
  expect(owner.status).toContain(`Picked up ${dungeonContent.items[loot.itemId].label}`);
  const accepted = owner.snapshot, saved = storage.inspect().primary; assert(saved.status === 'valid');
  expect(saved.state).toEqual(accepted);
  expect(accepted.stats!.movesTaken).toBe(initial.stats.movesTaken + 1);
  expect(currentFloor(accepted).exploration.movement!.step)
    .toBe(currentFloor(initial).exploration.movement!.step + enemySteps);
  expect(accepted.party).toEqual(initial.party);
  expect(await owner.step(command)).toBe(false); expect(owner.snapshot).toEqual(accepted);
  owner.dispose();
  const resumed = new DungeonSession(initial, storage); assert(resumed.continue(resumed.inspect()));
  expect(resumed.snapshot).toEqual(accepted);
  expect(currentFloor(resumed.snapshot).loot![0]).toEqual({ ...loot, remaining: 0 });
});

it('keeps the uncollected victory pile and party position across consecutive restores', () => {
  const won = victory(28);
  const { storage, owner } = savedOwner(won);
  owner.dispose();
  const initial = freshDungeon('unused-start', 1);
  for (let restore = 0; restore < 2; restore++) {
    const resumed = new DungeonSession(initial, storage);
    assert(resumed.continue(resumed.inspect()));
    expect(resumed.snapshot).toEqual(won);
    resumed.dispose();
  }
});

it.each([1, 6])('continues an occupied-pile battle without collecting either reward with %i items in inventory', async owned => {
  const { state, cell, origin } = sharedGroundPile(owned, true);
  const { storage, owner } = savedOwner(state);
  assert(await owner.step({ ...owner.spatialBoundary, destination: cell }));
  const active = owner.snapshot;
  expect(active.phase).toBe('battle');
  expect(active.encounterEntry).toEqual({ origin, contact: cell, slot: 2 });
  expect(currentFloor(active).position).toBe(origin);
  expect(currentFloor(active).loot).toHaveLength(2);
  expect(currentFloor(active).loot).toEqual(currentFloor(state).loot);
  expect(active.ownership).toEqual(state.ownership);
  owner.dispose();

  const resumed = new DungeonSession(state, storage);
  assert(resumed.continue(resumed.inspect()));
  expect(resumed.snapshot).toEqual(active);
  resumed.dispose();
});

it.each([
  { owned: 5, pickedUp: 1, warning: '1 item remains' },
  { owned: 6, pickedUp: 0, warning: '2 items remain' },
])('restores a shared pile with $owned owned items and collects one charm per discard', async ({ owned, pickedUp, warning }) => {
  const { state, cell } = sharedGroundPile(owned);
  const loot = currentFloor(state).loot!;
  const { storage, owner } = savedOwner(state);
  assert(await owner.step({ ...owner.spatialBoundary, destination: cell }));
  const entered = owner.snapshot;
  const expectedLoot = (count: number) => loot.map((item, index) => ({ ...item, remaining: index < count ? 0 : 1 }));
  let equipment = [...state.ownership.equipment, ...loot.slice(0, pickedUp).map(item => ({ instanceId: item.id, itemId: item.itemId }))];
  expect(currentFloor(entered).loot).toEqual(expectedLoot(pickedUp));
  expect(entered.ownership).toEqual({ ...state.ownership, equipment });
  expect(owner.status).toContain(`Inventory full: ${warning} on the ground.`);
  owner.dispose();

  const resumed = new DungeonSession(state, storage);
  assert(resumed.continue(resumed.inspect()));
  expect(resumed.snapshot).toEqual(entered);
  for (const [index, item] of loot.entries()) {
    if (index < pickedUp) continue;
    const discarded = state.ownership.equipment[index].instanceId;
    assert(await resumed.dispatch({ ...dungeonBoundary(resumed.snapshot), type: 'discardEquipment', instanceId: discarded }));
    equipment = [...equipment.filter(ownedItem => ownedItem.instanceId !== discarded), { instanceId: item.id, itemId: item.itemId }];
    expect(currentFloor(resumed.snapshot)).toEqual({ ...currentFloor(entered), position: cell, loot: expectedLoot(index + 1) });
    expect(resumed.snapshot.ownership).toEqual({ ...state.ownership, equipment });
    expect(resumed.snapshot.party).toEqual(entered.party);
    expect(resumed.status).toContain(`Picked up ${dungeonContent.items[item.itemId].label}`);
  }
  const collected = resumed.snapshot;
  resumed.dispose();
  const restored = new DungeonSession(state, storage);
  assert(restored.continue(restored.inspect()));
  expect(restored.snapshot).toEqual(collected);
  restored.dispose();
});

it.each(['before', 'after'] as const)('does not publish a pickup when the primary write fails %s committing', async when => {
  const initial = victory(), { data, storage, owner } = savedOwner(initial), loot = currentFloor(initial).loot![0];
  const write = data.setItem;
  data.setItem = (key, text) => {
    if (key === DUNGEON_KEYS.primary) {
      if (when === 'after') write(key, text);
      throw Object.assign(Error('write failed'), { name: 'QuotaExceededError' });
    }
    write(key, text);
  };
  const command = { ...owner.spatialBoundary, destination: loot.cell };
  expect(await owner.step(command)).toBe(false);
  expect(owner.snapshot).toEqual(initial);
  expect(owner.status).toContain('Movement not published: quota');
  data.setItem = write;
  expect(await owner.step(command)).toBe(false);
  expect(owner.status).toContain('uncertainWrite');
  const review = owner.inspect(), primary = review.primary; assert(primary.status === 'valid');
  expect(currentFloor(primary.state).loot![0].remaining).toBe(when === 'after' ? 0 : 1);
  assert(owner.continue(review));
  expect(owner.snapshot).toEqual(primary.state);
  if (when === 'before') expect(await owner.step({ ...owner.spatialBoundary, destination: loot.cell })).toBe(true);
  const collected = good(stepDungeon({ ...initial, stats: freshRunStats('since-upgrade') }, command));
  expect(currentFloor(collected).loot![0].remaining).toBe(0);
  expect(owner.snapshot).toEqual(collected);
  owner.dispose();
  const restored = new DungeonSession(initial, storage);
  assert(restored.continue(restored.inspect()));
  expect(restored.snapshot).toEqual(collected);
  restored.dispose();
});

function fullStackOnPile() {
  const won = potionVictory(), loot = currentFloor(won).loot![0];
  const full = good(readDungeon({ ...won, ownership: { ...won.ownership,
    consumables: [{ itemId: loot.itemId, quantity: 9 }] },
  party: won.party.map(hero => hero.heroId === 'fighter' ? { ...hero, hp: Math.max(1, hero.maxHp - 5) } : hero) }));
  return good(stepDungeon(full, { id: full.id, depth: full.depth, revision: full.revision, destination: loot.cell }));
}

it('using a draught on a full pile consumes and recollects in one saved transition without an enemy tick', async () => {
  const initial = fullStackOnPile(), { owner, storage } = savedOwner(initial), previousMovement = currentFloor(initial).exploration.movement;
  const command = { ...dungeonBoundary(initial), type: 'useItem' as const, itemId: 'item:healing_draught' as const, heroId: 'fighter' as const };
  expect(await owner.dispatch(command)).toBe(true);
  expect(owner.snapshot.ownership.consumables).toEqual([{ itemId: 'item:healing_draught', quantity: 9 }]);
  expect(owner.snapshot.party[0].hp).toBeGreaterThan(initial.party[0].hp);
  expect(currentFloor(owner.snapshot).loot![0].remaining).toBe(0);
  expect(currentFloor(owner.snapshot).exploration.movement).toEqual(previousMovement);
  expect(owner.status).toContain('Picked up Healing Draught');
  const saved = storage.inspect().primary; assert(saved.status === 'valid'); expect(saved.state).toEqual(owner.snapshot);
  const accepted = owner.snapshot;
  expect(await owner.dispatch(command)).toBe(false); expect(owner.snapshot).toEqual(accepted);
});

it('a failed preparation save preserves HP, stock and the same uncollected reward', async () => {
  const initial = fullStackOnPile(), { owner, data } = savedOwner(initial);
  data.setItem = () => { throw Object.assign(Error('full'), { name: 'QuotaExceededError' }); };
  expect(await owner.dispatch({ ...dungeonBoundary(initial), type: 'useItem', itemId: 'item:healing_draught', heroId: 'fighter' })).toBe(false);
  expect(owner.snapshot).toEqual(initial);
  expect(owner.status).toContain('Item choice not published: quota');
});

it('revalidates queued duplicate inventory callbacks at the exclusive write boundary', async () => {
  const pending: (() => void)[] = [], initial = fullStackOnPile();
  const { owner } = savedOwner(initial, task => { pending.push(task); });
  const command = { ...dungeonBoundary(initial), type: 'useItem' as const, itemId: 'item:healing_draught' as const, heroId: 'fighter' as const };
  const first = owner.dispatch(command), duplicate = owner.dispatch(command);
  expect(owner.snapshot).toEqual(initial); expect(pending).toHaveLength(2);
  pending.shift()!(); expect(await first).toBe(true); const accepted = owner.snapshot;
  pending.shift()!(); expect(await duplicate).toBe(false); expect(owner.snapshot).toEqual(accepted);
});

it('refuses an inventory pickup when another tab changed the reviewed primary', async () => {
  const initial = fullStackOnPile(), { owner, data } = savedOwner(initial);
  // Ensure the competing save is valid and distinct rather than a corrupt-slot test.
  const other = createDungeonStorage(() => data), changed = { ...initial, revision: initial.revision + 1 };
  assert(other.save(changed).ok);
  expect(await owner.dispatch({ ...dungeonBoundary(initial), type: 'useItem', itemId: 'item:healing_draught', heroId: 'fighter' })).toBe(false);
  expect(owner.snapshot).toEqual(initial); expect(owner.status).toContain('Item choice not published: changed');
});
