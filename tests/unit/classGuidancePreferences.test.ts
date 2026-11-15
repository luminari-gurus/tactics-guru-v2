import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const load = () => import('../../src/ui/classGuidancePreferences');
const key = 'tactics-guru:class-guidance';
const fighter = 'skill:ability:guarded_strike:v1';
const mage = 'skill:ability:magic_missile:v1';
const rail = 'preview:rail:v1';
const radial = 'preview:radial:v1';
const defaults = { version: 1, enabled: true, seen: [] };
function memory() {
  const data = new Map<string, string>();
  return { getItem: vi.fn((name: string) => data.get(name) ?? null),
    setItem: vi.fn((name: string, value: string) => { data.set(name, value); }),
    removeItem: (name: string) => { data.delete(name); }, clear: () => data.clear() };
}
function events() {
  const target = new EventTarget();
  vi.stubGlobal('addEventListener', target.addEventListener.bind(target));
  vi.stubGlobal('removeEventListener', target.removeEventListener.bind(target));
  return (storageArea: unknown, oldValue: string | null, newValue: string | null, eventKey: string | null = key) => {
    target.dispatchEvent(Object.assign(new Event('storage'), { key: eventKey, storageArea, oldValue, newValue }));
  };
}
beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('independent class guidance preferences', () => {
  it('defaults on without writing or acknowledging a lesson', async () => {
    const { CLASS_GUIDANCE_KEY, readClassGuidancePreferences } = await load();
    const storage = memory();
    expect(CLASS_GUIDANCE_KEY).toBe(key);
    expect(readClassGuidancePreferences(storage)).toEqual(defaults);
    expect(readClassGuidancePreferences(storage)).toEqual(defaults);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.getItem.mock.calls.every(([name]) => name === key)).toBe(true);
  });

  it('round-trips the choice and lessons without touching combat saves or other preferences', async () => {
    const { readClassGuidancePreferences, setClassGuidanceEnabled, markClassGuidanceSeen } = await load();
    const storage = memory();
    storage.setItem('tactics-guru:active-dungeon', 'combat save');
    storage.setItem('tactics-guru:combat-controls', 'radial');
    expect(markClassGuidanceSeen([fighter, rail], storage)).toBe(true);
    expect(setClassGuidanceEnabled(false, storage)).toBe(true);
    expect(readClassGuidancePreferences(storage)).toEqual({ version: 1, enabled: false, seen: [fighter, rail] });
    expect(setClassGuidanceEnabled(true, storage)).toBe(true);
    expect(readClassGuidancePreferences(storage).seen).toEqual([fighter, rail]);
    expect(storage.getItem('tactics-guru:active-dungeon')).toBe('combat save');
    expect(storage.getItem('tactics-guru:combat-controls')).toBe('radial');
  });

  it('rereads the latest choice and preserves unknown same-version fields during mark and reset', async () => {
    const { readClassGuidancePreferences, markClassGuidanceSeen, resetClassGuidanceTutorials } = await load();
    const storage = memory();
    readClassGuidancePreferences(storage);
    storage.setItem(key, JSON.stringify({ version: 1, enabled: false, seen: [mage], extension: { untouched: true } }));
    expect(markClassGuidanceSeen([fighter], storage)).toBe(true);
    expect(readClassGuidancePreferences(storage)).toEqual({ version: 1, enabled: false, seen: [mage, fighter] });
    expect(resetClassGuidanceTutorials(storage)).toBe(true);
    expect(readClassGuidancePreferences(storage)).toEqual({ version: 1, enabled: false, seen: [] });
    expect(JSON.parse(storage.getItem(key)!)).toMatchObject({ extension: { untouched: true }, resetRevision: 1 });
    expect(resetClassGuidanceTutorials(storage)).toBe(true);
    expect(JSON.parse(storage.getItem(key)!).resetRevision).toBe(2);
  });

  it('does not expose mutable stored arrays to callers', async () => {
    const { readClassGuidancePreferences, markClassGuidanceSeen } = await load();
    const storage = memory(); markClassGuidanceSeen([fighter], storage);
    const read = readClassGuidancePreferences(storage);
    (read.seen as string[]).push(rail);
    expect(readClassGuidancePreferences(storage).seen).toEqual([fighter]);
  });

  it('treats malformed envelopes as defaults without writing until an explicit change', async () => {
    const { readClassGuidancePreferences, setClassGuidanceEnabled } = await load();
    for (const raw of ['', 'broken', 'null', '[]', '{}', JSON.stringify({ version: 1, enabled: 'yes', seen: [] }),
      JSON.stringify({ version: 1, enabled: false, seen: {} }), JSON.stringify({ version: 0, enabled: false, seen: [] }), ' '.repeat(32_769)]) {
      const storage = memory(); storage.setItem(key, raw); storage.setItem.mockClear();
      expect(readClassGuidancePreferences(storage)).toEqual(defaults);
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(setClassGuidanceEnabled(false, storage)).toBe(true);
      expect(readClassGuidancePreferences(storage).enabled).toBe(false);
    }
  });

  it('leaves future-version preferences intact while retaining explicit choices for this visit', async () => {
    const { readClassGuidancePreferences, setClassGuidanceEnabled, markClassGuidanceSeen, resetClassGuidanceTutorials } = await load();
    const storage = memory(), future = JSON.stringify({ version: 2, enabled: true, seen: [], futureField: 'preserve' });
    storage.setItem(key, future); storage.setItem.mockClear();
    expect(readClassGuidancePreferences(storage)).toEqual(defaults);
    expect(setClassGuidanceEnabled(false, storage)).toBe(false);
    expect(markClassGuidanceSeen([rail], storage)).toBe(false);
    expect(readClassGuidancePreferences(storage)).toEqual({ version: 1, enabled: false, seen: [rail] });
    expect(resetClassGuidanceTutorials(storage)).toBe(false);
    expect(readClassGuidancePreferences(storage)).toEqual({ version: 1, enabled: false, seen: [] });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.getItem(key)).toBe(future);
  });

  it('filters invalid lesson IDs, deduplicates lessons and bounds the most recent remembered entries', async () => {
    const { CLASS_GUIDANCE_MAX_SEEN, readClassGuidancePreferences, markClassGuidanceSeen } = await load();
    const storage = memory();
    const invalid = ['preview:wheel:v1', 'preview:rail:v2', 'skill:ability:guarded_strike:v2', 'skill:ability:Upper:v1',
      'skill:ability:bad__id:v1', 'skill:ability:bad-id:v1', `skill:ability:${'a'.repeat(97)}:v1`, ''];
    expect(markClassGuidanceSeen(invalid, storage)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    storage.setItem(key, JSON.stringify({ version: 1, enabled: false, seen: [fighter, null, 5, {}, rail, fighter, ...invalid] }));
    expect(readClassGuidancePreferences(storage)).toEqual({ version: 1, enabled: false, seen: [fighter, rail] });
    expect(markClassGuidanceSeen([fighter, radial, ...invalid], storage)).toBe(true);
    expect(readClassGuidancePreferences(storage).seen).toEqual([fighter, rail, radial]);
    const many = Array.from({ length: CLASS_GUIDANCE_MAX_SEEN + 10 }, (_, index) => `skill:ability:lesson_${index}:v1`);
    markClassGuidanceSeen(many, storage);
    expect(readClassGuidancePreferences(storage)).toEqual({ version: 1, enabled: false, seen: many.slice(-CLASS_GUIDANCE_MAX_SEEN) });
    storage.setItem(key, JSON.stringify({ version: 1, enabled: true, seen: many }));
    expect(readClassGuidancePreferences(storage).seen).toEqual(many.slice(-CLASS_GUIDANCE_MAX_SEEN));
  });

  it('keeps last-readable preferences and explicit changes when reads are blocked', async () => {
    const { readClassGuidancePreferences, setClassGuidanceEnabled, markClassGuidanceSeen } = await load();
    const storage = memory();
    storage.setItem(key, JSON.stringify({ version: 1, enabled: false, seen: [mage] }));
    vi.stubGlobal('localStorage', storage);
    expect(readClassGuidancePreferences().enabled).toBe(false);
    storage.getItem.mockImplementation(() => { throw Error('blocked'); });
    storage.setItem.mockClear();
    expect(readClassGuidancePreferences()).toEqual({ version: 1, enabled: false, seen: [mage] });
    expect(setClassGuidanceEnabled(true)).toBe(false);
    expect(markClassGuidanceSeen([fighter])).toBe(false);
    expect(readClassGuidancePreferences()).toEqual({ version: 1, enabled: true, seen: [mage, fighter] });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('merges unsaved fields with freshly recovered storage without discarding another tab’s changes', async () => {
    const { readClassGuidancePreferences, setClassGuidanceEnabled, markClassGuidanceSeen } = await load();
    const stored = memory();
    vi.stubGlobal('localStorage', { getItem: stored.getItem, setItem: () => { throw Error('quota'); } });
    expect(markClassGuidanceSeen([fighter])).toBe(false);
    stored.setItem(key, JSON.stringify({ version: 1, enabled: false, seen: [mage], extension: 'keep' }));
    vi.stubGlobal('localStorage', stored);
    expect(readClassGuidancePreferences()).toEqual({ version: 1, enabled: false, seen: [mage, fighter] });
    expect(markClassGuidanceSeen([rail])).toBe(true);
    expect(readClassGuidancePreferences()).toEqual({ version: 1, enabled: false, seen: [mage, fighter, rail] });
    expect(JSON.parse(stored.getItem(key)!).extension).toBe('keep');
    vi.stubGlobal('localStorage', { getItem: stored.getItem, setItem: () => { throw Error('quota'); } });
    expect(setClassGuidanceEnabled(true)).toBe(false);
    stored.setItem(key, JSON.stringify({ version: 1, enabled: false, seen: [radial] }));
    vi.stubGlobal('localStorage', stored);
    expect(markClassGuidanceSeen([fighter])).toBe(true);
    expect(readClassGuidancePreferences()).toEqual({ version: 1, enabled: true, seen: [radial, fighter] });
  });

  it('never reports missing storage as saved, and carries pending reset and opt-out into recovery', async () => {
    const { readClassGuidancePreferences, setClassGuidanceEnabled, markClassGuidanceSeen, resetClassGuidanceTutorials } = await load();
    vi.stubGlobal('localStorage', undefined);
    expect(setClassGuidanceEnabled(false)).toBe(false);
    expect(markClassGuidanceSeen([fighter])).toBe(false);
    expect(resetClassGuidanceTutorials()).toBe(false);
    expect(readClassGuidancePreferences()).toEqual({ version: 1, enabled: false, seen: [] });
    const storage = memory();
    storage.setItem(key, JSON.stringify({ version: 1, enabled: true, seen: [mage] }));
    vi.stubGlobal('localStorage', storage);
    expect(markClassGuidanceSeen([rail])).toBe(true);
    expect(readClassGuidancePreferences()).toEqual({ version: 1, enabled: false, seen: [rail] });
    expect(JSON.parse(storage.getItem(key)!).resetRevision).toBe(1);
  });

  it('notifies every same-page watcher, distinguishes explicit reset and disposes subscriptions', async () => {
    const { watchClassGuidancePreferences, setClassGuidanceEnabled, markClassGuidanceSeen, resetClassGuidanceTutorials } = await load();
    vi.stubGlobal('localStorage', memory()); events();
    const first = vi.fn(), second = vi.fn();
    const stopFirst = watchClassGuidancePreferences(first), stopSecond = watchClassGuidancePreferences(second);
    setClassGuidanceEnabled(false); markClassGuidanceSeen([fighter]); resetClassGuidanceTutorials(); resetClassGuidanceTutorials();
    expect(first.mock.calls).toEqual([[false], [false], [true], [true]]);
    expect(second.mock.calls).toEqual(first.mock.calls);
    stopFirst(); markClassGuidanceSeen([rail]);
    expect(first).toHaveBeenCalledTimes(4); expect(second).toHaveBeenCalledTimes(5);
    stopSecond(); setClassGuidanceEnabled(true);
    expect(second).toHaveBeenCalledTimes(5);
  });

  it('filters cross-tab events and recognizes reset even when no lessons had been seen', async () => {
    const { watchClassGuidancePreferences, readClassGuidancePreferences } = await load();
    const storage = memory(); vi.stubGlobal('localStorage', storage);
    const dispatch = events(), changed = vi.fn(), stop = watchClassGuidancePreferences(changed);
    const before = JSON.stringify({ ...defaults, enabled: false, resetRevision: 0 });
    const after = JSON.stringify({ ...defaults, enabled: false, resetRevision: 1 });
    storage.setItem(key, before);
    dispatch(storage, null, before, 'tactics-guru:other-setting');
    dispatch(memory(), null, before);
    expect(changed).not.toHaveBeenCalled();
    storage.setItem(key, after); dispatch(storage, before, after);
    expect(changed.mock.calls).toEqual([[true]]);
    expect(readClassGuidancePreferences()).toEqual({ version: 1, enabled: false, seen: [] });
    const learned = JSON.stringify({ version: 1, enabled: false, seen: [mage], resetRevision: 1 });
    storage.setItem(key, learned); dispatch(storage, after, learned);
    expect(changed.mock.calls).toEqual([[true], [false]]);
    storage.removeItem(key); dispatch(storage, learned, null);
    expect(changed.mock.calls).toEqual([[true], [false], [true]]);
    expect(readClassGuidancePreferences()).toEqual(defaults);
    storage.clear(); dispatch(storage, null, null, null);
    expect(changed).toHaveBeenLastCalledWith(true);
    stop(); dispatch(storage, null, after);
    expect(changed).toHaveBeenCalledTimes(4);
  });
});
