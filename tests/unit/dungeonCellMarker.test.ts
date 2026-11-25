import { expect, it } from 'vitest';
import { dungeonCellMarker } from '../../src/ui/dungeonMap';

it.each(['↑', '↓'] as const)('resolves encounter and loot overlap on %s stairs', stair => {
  for (const loot of [false, true]) {
    expect(dungeonCellMarker(stair, 'live', loot)).toBe('M');
    expect(dungeonCellMarker(stair, 'cleared', loot)).toBe(stair);
    expect(dungeonCellMarker(stair, undefined, loot)).toBe(stair);
  }
});

it('resolves encounter and loot markers away from stairs', () => {
  expect(dungeonCellMarker('', 'live', true)).toBe('M');
  expect(dungeonCellMarker('', 'cleared', true)).toBe('◆');
  expect(dungeonCellMarker('', undefined, true)).toBe('◆');
  expect(dungeonCellMarker('', 'cleared', false)).toBe('✓');
  expect(dungeonCellMarker('', undefined, false)).toBe('');
});
