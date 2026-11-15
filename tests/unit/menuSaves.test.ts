import { expect, it, vi } from 'vitest';
import { inspectMenuSave } from '../../src/app/menuSaves';
import { BATTLE_STORAGE_KEYS } from '../../src/persistence/battleStorage';
import { RUN_STORAGE_KEYS } from '../../src/persistence/runStorage';
import { DUNGEON_KEYS, DUNGEON_BACKUP_CHECKPOINT_KEY } from '../../src/persistence/dungeonStorage';
import { menuFixture } from '../helpers/menuFixtures';

it('inspects only dungeon slots even with legacy battle and run saves', () => {
  const data = new Map<string, string>([
    [DUNGEON_KEYS.backup, menuFixture('dungeon')],
    [BATTLE_STORAGE_KEYS.primary, menuFixture('battle')],
    [RUN_STORAGE_KEYS.primary, menuFixture('run')],
  ]);
  const getItem = vi.fn((key: string) => data.get(key) ?? null);
  const setItem = vi.fn(), removeItem = vi.fn();
  const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('RNG'); });
  try {
    expect(inspectMenuSave(() => ({ getItem, setItem, removeItem }))).toMatchObject({
      primary: 'missing', backup: 'valid', resumable: true, fromBackup: true, needsRecovery: false,
    });
    expect(getItem.mock.calls.flat()).toEqual([...Object.values(DUNGEON_KEYS), DUNGEON_BACKUP_CHECKPOINT_KEY]);
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  } finally { random.mockRestore(); }
});

it('preserves eligibility and warnings for all dungeon slot combinations', () => {
  const states = ['missing', 'valid', 'invalid', 'unavailable'] as const;
  const text = menuFixture('dungeon');
  for (const primary of states) for (const backup of states) {
    const result = inspectMenuSave(() => ({
      getItem(key) {
        const status = key === DUNGEON_KEYS.primary ? primary : backup;
        if (status === 'unavailable') throw Error('denied');
        return status === 'missing' ? null : status === 'valid' ? text : 'invalid';
      },
      setItem() { throw Error('unexpected write'); },
      removeItem() { throw Error('unexpected removal'); },
    }));
    expect(result).toEqual({
      primary, backup, resumable: primary === 'valid' || backup === 'valid',
      fromBackup: primary !== 'valid' && backup === 'valid',
      needsRecovery: [primary, backup].some(status => status === 'invalid' || status === 'unavailable'),
    });
  }
  expect(inspectMenuSave(() => null)).toMatchObject({ primary: 'unavailable', backup: 'unavailable', resumable: false });
});
