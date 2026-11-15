import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const load = () => import('../../src/ui/combatPacePreference');
const key = 'tactics-guru:combat-pace';
const envelope = (pace: 'normal' | 'fast') => JSON.stringify({ version: 1, pace });
function memory() {
  const data = new Map<string, string>();
  return { data, getItem: vi.fn((name: string) => data.get(name) ?? null),
    setItem: vi.fn((name: string, value: string) => { data.set(name, value); }) };
}
function events() {
  const target = new EventTarget();
  const add = vi.fn(target.addEventListener.bind(target)), remove = vi.fn(target.removeEventListener.bind(target));
  vi.stubGlobal('addEventListener', add); vi.stubGlobal('removeEventListener', remove);
  const dispatch = (storageArea: unknown, oldValue: string | null, newValue: string | null, eventKey: string | null = key) => {
    target.dispatchEvent(Object.assign(new Event('storage'), { key: eventKey, storageArea, oldValue, newValue }));
  };
  return { add, remove, dispatch };
}
beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('independent battle presentation pace preference', () => {
  it('defaults to Normal without writing or reading combat saves', async () => {
    const { COMBAT_PACE_KEY, readCombatPacePreference } = await load();
    const storage = memory();
    expect(COMBAT_PACE_KEY).toBe(key);
    expect(readCombatPacePreference(storage)).toBe('normal');
    expect(readCombatPacePreference(storage)).toBe('normal');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.getItem.mock.calls.every(([name]) => name === key)).toBe(true);
  });

  it('round-trips Fast and the Normal reset without changing independent saves or settings', async () => {
    const { readCombatPacePreference, writeCombatPacePreference } = await load();
    const storage = memory();
    const independent = [['tactics-guru:active-dungeon', 'combat save'], ['tactics-guru:combat-controls', 'radial'],
      ['tactics-guru:class-guidance', JSON.stringify({ version: 1, enabled: false, seen: ['preview:rail:v1'] })]];
    for (const [name, value] of independent) storage.data.set(name, value);
    expect(writeCombatPacePreference('fast', storage)).toBe(true);
    expect(storage.data.get(key)).toBe(envelope('fast'));
    expect(readCombatPacePreference(storage)).toBe('fast');
    expect(writeCombatPacePreference('normal', storage)).toBe(true);
    expect(storage.data.get(key)).toBe(envelope('normal'));
    expect(readCombatPacePreference(storage)).toBe('normal');
    expect([...storage.data].filter(([name]) => name !== key)).toEqual(independent);
    expect(storage.getItem.mock.calls.every(([name]) => name === key)).toBe(true);
    expect(storage.setItem.mock.calls.every(([name]) => name === key)).toBe(true);
  });

  it('keeps pace unchanged when tutorials are reset', async () => {
    const { readCombatPacePreference, writeCombatPacePreference } = await load();
    const { resetClassGuidanceTutorials } = await import('../../src/ui/classGuidancePreferences');
    const storage = memory();
    writeCombatPacePreference('fast', storage);
    storage.data.set('tactics-guru:class-guidance', JSON.stringify({ version: 1, enabled: false, seen: ['preview:rail:v1'] }));
    expect(resetClassGuidanceTutorials(storage)).toBe(true);
    expect(readCombatPacePreference(storage)).toBe('fast');
    expect(storage.data.get(key)).toBe(envelope('fast'));
  });

  it('falls back for unknown or malformed data and repairs it only on an explicit choice', async () => {
    const { readCombatPacePreference, writeCombatPacePreference } = await load();
    for (const raw of ['', 'broken', 'fast', 'null', '[]', '{}', 'true',
      JSON.stringify({ version: 0, pace: 'fast' }), JSON.stringify({ version: '1', pace: 'fast' }),
      JSON.stringify({ version: 1, pace: 'turbo' }), JSON.stringify({ version: 1, pace: false })]) {
      const storage = memory(); storage.data.set(key, raw);
      expect(readCombatPacePreference(storage)).toBe('normal');
      expect(storage.data.get(key)).toBe(raw);
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(writeCombatPacePreference('fast', storage)).toBe(true);
      expect(readCombatPacePreference(storage)).toBe('fast');
      expect(storage.data.get(key)).toBe(envelope('fast'));
    }
  });

  it('preserves future versions while keeping explicit choices for the current visit', async () => {
    const { readCombatPacePreference, writeCombatPacePreference } = await load();
    const storage = memory(), future = JSON.stringify({ version: 2, pace: 'fast', futureField: 'keep' });
    storage.data.set(key, future);
    expect(readCombatPacePreference(storage)).toBe('normal');
    expect(writeCombatPacePreference('fast', storage)).toBe(false);
    expect(readCombatPacePreference(storage)).toBe('fast');
    expect(writeCombatPacePreference('normal', storage)).toBe(false);
    expect(readCombatPacePreference(storage)).toBe('normal');
    expect(storage.data.get(key)).toBe(future);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('bounds stored envelopes without overwriting oversized data', async () => {
    const { readCombatPacePreference, writeCombatPacePreference } = await load();
    const storage = memory(), oversized = JSON.stringify({ version: 1, pace: 'fast', extension: 'x'.repeat(16_384) });
    storage.data.set(key, oversized);
    expect(readCombatPacePreference(storage)).toBe('normal');
    expect(writeCombatPacePreference('fast', storage)).toBe(false);
    expect(readCombatPacePreference(storage)).toBe('fast');
    expect(storage.data.get(key)).toBe(oversized);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('preserves same-version extension fields from the latest storage value', async () => {
    const { readCombatPacePreference, writeCombatPacePreference } = await load();
    const storage = memory();
    storage.data.set(key, JSON.stringify({ version: 1, pace: 'normal', extension: 'old' }));
    expect(readCombatPacePreference(storage)).toBe('normal');
    storage.data.set(key, JSON.stringify({ version: 1, pace: 'normal', extension: { latest: true } }));
    expect(writeCombatPacePreference('fast', storage)).toBe(true);
    expect(JSON.parse(storage.data.get(key)!)).toEqual({ version: 1, pace: 'fast', extension: { latest: true } });
  });

  it('retains the last readable pace and explicit changes when storage reads are blocked', async () => {
    const { readCombatPacePreference, writeCombatPacePreference } = await load();
    const storage = memory(); storage.data.set(key, envelope('fast')); vi.stubGlobal('localStorage', storage);
    expect(readCombatPacePreference()).toBe('fast');
    storage.getItem.mockImplementation(() => { throw Error('blocked'); });
    expect(readCombatPacePreference()).toBe('fast');
    expect(writeCombatPacePreference('normal')).toBe(false);
    expect(readCombatPacePreference()).toBe('normal');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.data.get(key)).toBe(envelope('fast'));
  });

  it('keeps quota-failed changes until an explicit write succeeds after recovery', async () => {
    const { readCombatPacePreference, writeCombatPacePreference } = await load();
    const storage = memory(); storage.data.set(key, envelope('normal'));
    vi.stubGlobal('localStorage', { getItem: storage.getItem, setItem: () => { throw Error('quota'); } });
    expect(writeCombatPacePreference('fast')).toBe(false);
    expect(readCombatPacePreference()).toBe('fast');
    storage.data.set(key, JSON.stringify({ version: 1, pace: 'normal', extension: 'recovered' }));
    vi.stubGlobal('localStorage', storage);
    expect(readCombatPacePreference()).toBe('fast');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(writeCombatPacePreference('fast')).toBe(true);
    expect(JSON.parse(storage.data.get(key)!)).toEqual({ version: 1, pace: 'fast', extension: 'recovered' });
    storage.data.set(key, envelope('normal'));
    expect(readCombatPacePreference()).toBe('normal');
  });

  it('never reports absent storage as saved and can recover with Normal', async () => {
    const { readCombatPacePreference, writeCombatPacePreference } = await load();
    vi.stubGlobal('localStorage', undefined);
    expect(readCombatPacePreference()).toBe('normal');
    expect(writeCombatPacePreference('fast')).toBe(false);
    expect(readCombatPacePreference()).toBe('fast');
    const storage = memory(); vi.stubGlobal('localStorage', storage);
    expect(readCombatPacePreference()).toBe('fast');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(writeCombatPacePreference('normal')).toBe(true);
    expect(readCombatPacePreference()).toBe('normal');
    expect(storage.data.get(key)).toBe(envelope('normal'));
  });

  it('isolates injected storage memory and does not notify page watchers for injected writes', async () => {
    const { readCombatPacePreference, writeCombatPacePreference, watchCombatPacePreference } = await load();
    const storage = memory(), other = memory();
    const blocked = { getItem: storage.getItem, setItem: () => { throw Error('quota'); } };
    vi.stubGlobal('localStorage', memory()); events();
    const changed = vi.fn(), stop = watchCombatPacePreference(changed);
    expect(writeCombatPacePreference('fast', blocked)).toBe(false);
    expect(readCombatPacePreference(blocked)).toBe('fast');
    expect(readCombatPacePreference(other)).toBe('normal');
    expect(readCombatPacePreference()).toBe('normal');
    expect(writeCombatPacePreference('fast', other)).toBe(true);
    expect(changed).not.toHaveBeenCalled(); stop();
  });

  it('rejects invalid writes without changing storage, memory or notifications', async () => {
    const { readCombatPacePreference, writeCombatPacePreference, watchCombatPacePreference } = await load();
    const storage = memory(); vi.stubGlobal('localStorage', storage); events();
    const changed = vi.fn(), stop = watchCombatPacePreference(changed);
    for (const invalid of ['turbo', null, undefined, 2]) expect(writeCombatPacePreference(invalid as never)).toBe(false);
    expect(readCombatPacePreference()).toBe('normal');
    expect(storage.setItem).not.toHaveBeenCalled(); expect(changed).not.toHaveBeenCalled(); stop();
  });

  it('notifies same-page subscribers after saved and unsaved choices and disposes listeners', async () => {
    const { readCombatPacePreference, writeCombatPacePreference, watchCombatPacePreference } = await load();
    vi.stubGlobal('localStorage', memory()); const { add, remove } = events();
    const first = vi.fn(() => readCombatPacePreference()), second = vi.fn(() => readCombatPacePreference());
    const stopFirst = watchCombatPacePreference(first), stopSecond = watchCombatPacePreference(second);
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0][0]).toBe('storage');
    expect(writeCombatPacePreference('fast')).toBe(true);
    expect(first).toHaveReturnedWith('fast'); expect(second).toHaveReturnedWith('fast');
    vi.stubGlobal('localStorage', undefined);
    expect(writeCombatPacePreference('normal')).toBe(false);
    expect(first).toHaveLastReturnedWith('normal'); expect(second).toHaveLastReturnedWith('normal');
    stopFirst(); expect(remove).not.toHaveBeenCalled();
    writeCombatPacePreference('fast');
    expect(first).toHaveBeenCalledTimes(2); expect(second).toHaveBeenCalledTimes(3);
    stopSecond(); expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0][0]).toBe('storage');
    writeCombatPacePreference('normal'); expect(second).toHaveBeenCalledTimes(3);
  });

  it('filters cross-tab storage events and follows valid changes, removal and clear', async () => {
    const { readCombatPacePreference, watchCombatPacePreference } = await load();
    const storage = memory(); vi.stubGlobal('localStorage', storage);
    const { dispatch } = events(), changed = vi.fn(() => readCombatPacePreference());
    const stop = watchCombatPacePreference(changed), fast = envelope('fast');
    storage.data.set(key, fast);
    dispatch(storage, null, fast, 'tactics-guru:class-guidance'); dispatch(memory(), null, fast);
    expect(changed).not.toHaveBeenCalled();
    dispatch(storage, null, fast);
    expect(changed).toHaveLastReturnedWith('fast');
    storage.getItem.mockImplementation(() => { throw Error('blocked'); });
    expect(readCombatPacePreference()).toBe('fast');
    storage.getItem.mockImplementation(name => storage.data.get(name) ?? null);
    const future = JSON.stringify({ version: 2, pace: 'fast' }); storage.data.set(key, future);
    dispatch(storage, fast, future); expect(changed).toHaveLastReturnedWith('normal');
    storage.data.delete(key); dispatch(storage, future, null);
    expect(changed).toHaveLastReturnedWith('normal');
    storage.data.clear(); dispatch(storage, null, null, null);
    expect(changed).toHaveBeenCalledTimes(4); expect(changed).toHaveLastReturnedWith('normal');
    expect(storage.setItem).not.toHaveBeenCalled();
    stop(); dispatch(storage, null, fast); expect(changed).toHaveBeenCalledTimes(4);
  });
});
