import { afterEach, beforeEach, expect, it, vi } from 'vitest';

function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

it('defaults on and persists the independent preference without changing other settings', async () => {
  const { AUTO_COLLECT_LOOT_KEY, readAutoCollectLootPreference, writeAutoCollectLootPreference } = await import('../../src/ui/autoCollectLootPreference');
  const storage = memory();
  storage.setItem('tactics-guru:combat-controls', 'radial');
  storage.setItem('tactics-guru:routine-cutscenes', 'off');
  expect(readAutoCollectLootPreference(storage)).toBe(true);
  expect(writeAutoCollectLootPreference(false, storage)).toBe(true);
  expect(storage.getItem(AUTO_COLLECT_LOOT_KEY)).toBe('off');
  expect(readAutoCollectLootPreference(storage)).toBe(false);
  expect(writeAutoCollectLootPreference(true, storage)).toBe(true);
  expect(readAutoCollectLootPreference(storage)).toBe(true);
  expect(storage.getItem('tactics-guru:combat-controls')).toBe('radial');
  expect(storage.getItem('tactics-guru:routine-cutscenes')).toBe('off');
});

it('uses the on default for unknown values and inaccessible storage', async () => {
  const { AUTO_COLLECT_LOOT_KEY, readAutoCollectLootPreference } = await import('../../src/ui/autoCollectLootPreference');
  const storage = memory();
  storage.setItem(AUTO_COLLECT_LOOT_KEY, 'unknown');
  expect(readAutoCollectLootPreference(storage)).toBe(true);
  expect(readAutoCollectLootPreference({ getItem: () => { throw Error('blocked'); }, setItem: () => {} })).toBe(true);
});

it('retains an unsaved choice for the visit and resumes persistence when storage recovers', async () => {
  const { AUTO_COLLECT_LOOT_KEY, readAutoCollectLootPreference, writeAutoCollectLootPreference } = await import('../../src/ui/autoCollectLootPreference');
  const storage = memory();
  vi.stubGlobal('localStorage', { ...storage, setItem: () => { throw Error('quota'); } });
  expect(writeAutoCollectLootPreference(false)).toBe(false);
  expect(readAutoCollectLootPreference()).toBe(false);
  expect(storage.getItem(AUTO_COLLECT_LOOT_KEY)).toBeNull();
  vi.stubGlobal('localStorage', storage);
  expect(writeAutoCollectLootPreference(true)).toBe(true);
  expect(readAutoCollectLootPreference()).toBe(true);
  expect(storage.getItem(AUTO_COLLECT_LOOT_KEY)).toBe('on');
});

it('does not report absent storage as saved or broadcast movement-triggering events', async () => {
  const { readAutoCollectLootPreference, writeAutoCollectLootPreference } = await import('../../src/ui/autoCollectLootPreference');
  const dispatch = vi.fn();
  vi.stubGlobal('dispatchEvent', dispatch);
  vi.stubGlobal('localStorage', undefined);
  expect(writeAutoCollectLootPreference(false)).toBe(false);
  expect(readAutoCollectLootPreference()).toBe(false);
  expect(dispatch).not.toHaveBeenCalled();
});
