import { describe, expect, it } from 'vitest';
import { newDungeonEntryAction } from '../../src/app/newDungeonEntry';
import { freshDungeon } from '../../src/domain/dungeon';

describe('New Game destination review', () => {
  const missing = { status: 'missing', text: null } as const;
  const valid = { status: 'valid', text: 'save bytes', state: freshDungeon('new-game-review', 1) } as const;
  const empty = { primary: missing, backup: missing };

  it.each(['primary', 'backup'] as const)('requires confirmation if a %s save appeared during navigation', slot => {
    expect(newDungeonEntryAction(empty, null)).toBe('replace');
    const current = { ...empty, [slot]: valid };
    expect(newDungeonEntryAction(current, null)).toBe('confirm');
    expect(newDungeonEntryAction(current, empty)).toBe('confirm');
    expect(newDungeonEntryAction(current, current)).toBe('replace');
    expect(newDungeonEntryAction({ ...current, [slot]: { ...valid, text: 'changed bytes' } }, current)).toBe('confirm');
  });

  it('preserves unreadable saves on an unreviewed launch', () => {
    expect(newDungeonEntryAction({ primary: { status: 'invalid', text: 'broken', reason: 'corrupt' }, backup: missing }, null)).toBe('unsaved');
    const denied = { primary: { status: 'unavailable', text: null }, backup: missing } as const;
    expect(newDungeonEntryAction(denied, null)).toBe('unsaved');
    expect(newDungeonEntryAction(denied, denied)).toBe('confirm');
  });
});
