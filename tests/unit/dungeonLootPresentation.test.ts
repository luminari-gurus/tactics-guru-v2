import { expect, it } from 'vitest';
import { currentFloor, freshDungeon } from '../../src/domain/dungeon';
import { dungeonLootContents, dungeonLootPiles } from '../../src/ui/dungeonMap';

it('groups remaining same-cell contents while retaining every encounter identity', () => {
  const floor = {
    ...currentFloor(freshDungeon('loot-presentation', 1)),
    loot: [
      { id: 'first', slot: 0, rewardIndex: 0, cell: 42, itemId: 'item:healing_draught' as const, quantity: 1 as const, remaining: 1 as const },
      { id: 'second', slot: 1, rewardIndex: 1, cell: 42, itemId: 'item:healing_draught' as const, quantity: 1 as const, remaining: 1 as const },
      { id: 'collected', slot: 2, rewardIndex: 2, cell: 43, itemId: 'item:warding_charm' as const, quantity: 1 as const, remaining: 0 as const },
    ],
  };
  const before = structuredClone(floor);
  const piles = dungeonLootPiles(floor);
  expect([...piles.keys()]).toEqual([42]);
  expect(piles.get(42)).toEqual(floor.loot.slice(0, 2));
  expect(dungeonLootContents(piles.get(42)!)).toBe('Healing Draught ×2');
  expect(floor).toEqual(before);
});

it('describes every remaining item in stable order and supports old floors without loot', () => {
  const floor = currentFloor(freshDungeon('legacy-loot-presentation', 1));
  expect(dungeonLootPiles(floor).size).toBe(0);
  const contents = [
    { cell: 42, itemId: 'item:warding_charm' as const, remaining: 1 as const },
    { cell: 42, itemId: 'item:healing_draught' as const, remaining: 1 as const },
    { cell: 42, itemId: 'item:revive_kit' as const, remaining: 0 as const },
  ];
  expect(dungeonLootContents(contents)).toBe('Healing Draught ×1, Warding Charm ×1');
  expect(dungeonLootContents([...contents].reverse())).toBe(dungeonLootContents(contents));
});
