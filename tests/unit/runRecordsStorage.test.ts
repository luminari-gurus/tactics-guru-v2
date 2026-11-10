import { assert, expect, it, vi } from 'vitest';
import { appendRunRecord, emptyRunRecords, type RunRecord, type RunRecords } from '../../src/domain/runRecords';
import { createRunRecordsStorage, encodeRunRecords, RECORDS_MAX_CODE_UNITS, RUN_RECORD_KEYS, selectedRunRecords, type RecordsLock } from '../../src/persistence/runRecordsStorage';
import { canonical, hashJson } from '../../src/domain/contentIdentity';
const direct: RecordsLock = async action => action();
function memory() {
  const data = new Map<string, string>(), writes: string[] = [];
  return { data, writes, getItem: (key: string) => data.get(key) ?? null,
    setItem(key: string, text: string) { writes.push(key); data.set(key, text); }, removeItem(key: string) { data.delete(key); } };
}
const record = (id = 'run-1'): RunRecord => ({ mode: 'run', id, outcome: 'defeat', recordedAt: 100, battlesWon: 0, floorsCleared: null, deepestFloor: null });

it('opens missing history read-only and stores/deduplicates immutable results with a known-good backup', async () => {
  const m = memory(), store = createRunRecordsStorage(() => m, direct);
  expect(store.inspect()).toEqual({ primary: { status: 'missing', text: null }, backup: { status: 'missing', text: null } });
  expect(m.writes).toEqual([]);
  assert((await store.mutate(h => appendRunRecord(h, record()))).ok);
  const first = [...m.data], review = store.inspect();
  expect(selectedRunRecords(review)?.records).toEqual([record()]);
  expect((await store.mutate(h => appendRunRecord(h, { ...record(), recordedAt: 200 })))).toEqual({ ok: true });
  expect([...m.data]).toEqual(first); expect(m.writes).toHaveLength(2);
  assert((await store.mutate(h => appendRunRecord(h, record('run-2')))).ok);
  const latest = store.inspect(); assert(latest.backup.status === 'valid');
  expect(latest.backup.history.records).toHaveLength(1);
  expect(selectedRunRecords(latest)?.records).toHaveLength(2);
  (latest.backup.history.records[0] as { id: string }).id = 'changed';
  expect(selectedRunRecords(store.inspect())?.records[0].id).toBe('run-1');
});

it('preserves corrupt, future-version and oversized bytes; explicit reviewed reset affects records only', async () => {
  for (const bad of ['broken', JSON.stringify({ version: 2 }), 'x'.repeat(RECORDS_MAX_CODE_UNITS + 1)]) {
    const m = memory(); m.data.set(RUN_RECORD_KEYS.primary, bad); m.data.set('active-save', 'preserve');
    const store = createRunRecordsStorage(() => m, direct), review = store.inspect();
    expect(review.primary.status).toBe('invalid'); expect(m.writes).toEqual([]);
    expect(await store.mutate(h => appendRunRecord(h, record()))).toEqual({ ok: false, reason: 'recoveryRequired' });
    expect(m.data.get(RUN_RECORD_KEYS.primary)).toBe(bad);
    assert((await store.recover(review, true)).ok);
    expect(selectedRunRecords(store.inspect())).toEqual(emptyRunRecords()); expect(m.data.get('active-save')).toBe('preserve');
  }
});

it('shows a valid backup without auto repair; recovery refuses changed bytes and can explicitly restore', async () => {
  const m = memory(), good = encodeRunRecords(appendRunRecord(emptyRunRecords(), record()))!;
  m.data.set(RUN_RECORD_KEYS.primary, 'broken'); m.data.set(RUN_RECORD_KEYS.backup, good);
  const store = createRunRecordsStorage(() => m, direct), review = store.inspect();
  expect(selectedRunRecords(review)?.records).toEqual([record()]); expect(m.writes).toEqual([]);
  m.data.set(RUN_RECORD_KEYS.primary, 'changed');
  expect(await store.recover(review, false)).toEqual({ ok: false, reason: 'changed' });
  assert((await store.recover(store.inspect(), false)).ok);
  expect(m.data.get(RUN_RECORD_KEYS.primary)).toBe(good); expect(m.data.get(RUN_RECORD_KEYS.backup)).toBe(good);
});

it('reports denied providers, browser locks and thrown lock callbacks without writing', async () => {
  for (const provider of [() => null, () => { throw Error('SecurityError'); }]) {
    const store = createRunRecordsStorage(provider, direct);
    expect(store.inspect().primary.status).toBe('unavailable');
    expect(await store.mutate(h => appendRunRecord(h, record()))).toEqual({ ok: false, reason: 'unavailable' });
  }
  const m = memory();
  vi.stubGlobal('navigator', {});
  try {
    for (const lock of [undefined, async () => { throw Error('lock denied'); }]) {
      const store = createRunRecordsStorage(() => m, lock);
      expect(await store.mutate(h => appendRunRecord(h, record()))).toEqual({ ok: false, reason: 'unavailable' });
    }
  } finally { vi.unstubAllGlobals(); }
  expect(m.data.size).toBe(0);
});

it('reports quota and partial/readback failures honestly and retains a recoverable copy', async () => {
  for (const failAt of [1, 2]) {
    const m = memory(), good = encodeRunRecords(appendRunRecord(emptyRunRecords(), record()))!;
    m.data.set(RUN_RECORD_KEYS.primary, good); let writes = 0;
    const store = createRunRecordsStorage(() => ({ ...m, setItem(key, value) {
      if (++writes === failAt) throw Object.assign(Error('full'), { name: 'QuotaExceededError' });
      m.setItem(key, value);
    } }), direct);
    expect(await store.mutate(h => appendRunRecord(h, record('second')))).toEqual({ ok: false, reason: 'uncertain' });
    expect(m.data.get(RUN_RECORD_KEYS.primary)).toBe(good);
  }
  const m = memory(), store = createRunRecordsStorage(() => ({ ...m, setItem() { /* Lost write */ } }), direct);
  expect(await store.mutate(h => appendRunRecord(h, record()))).toEqual({ ok: false, reason: 'uncertain' });
});

it('serializes competing adapters and freezes a first terminal candidate under concurrent submissions', async () => {
  const m = memory(); let queue = Promise.resolve();
  const lock: RecordsLock = action => { const result = queue.then(action); queue = result.then(() => {}); return result; };
  const first = createRunRecordsStorage(() => m, lock), second = createRunRecordsStorage(() => m, lock);
  const results = await Promise.all([first.mutate(h => appendRunRecord(h, record())),
    second.mutate(h => appendRunRecord(h, { ...record(), outcome: 'abandoned' })),
    second.mutate(h => appendRunRecord(h, record('other')))]);
  expect(results.every(r => r.ok)).toBe(true);
  const records = selectedRunRecords(first.inspect())!.records;
  expect(records).toHaveLength(2); expect(records.find(r => r.id === 'run-1')).toEqual(record());
});

it('rejects an invalid mutation without touching storage', async () => {
  const m = memory(), store = createRunRecordsStorage(() => m, direct);
  expect(await store.mutate(h => ({ ...h, records: [{ ...record(), battlesWon: -1 }] }))).toEqual({ ok: false, reason: 'invalid' });
  expect(m.data.size).toBe(0);
});
it('reads exact legacy pending bytes without writing and round-trips a paired intent through recovery', async () => {
  const m = memory(), body = { version: 1, records: [], receipts: {
    run: { kind: 'pending', record: record(), newId: 'new-run' }, dungeon: null,
  } };
  const legacy = canonical({ ...body, digest: hashJson(body) }); m.data.set(RUN_RECORD_KEYS.primary, legacy);
  const store = createRunRecordsStorage(() => m, direct);
  expect(selectedRunRecords(store.inspect())).toEqual(body); expect(m.writes).toEqual([]);
  assert((await store.mutate(history => ({ ...history, receipts: { ...history.receipts,
    run: { kind: 'pending', record: record(), other: record('unsaved'), newId: 'new-run',
      sealed: { kind: 'sealed', id: 'frozen', otherId: 'also-frozen' } },
  } }))).ok);
  const paired = m.data.get(RUN_RECORD_KEYS.primary)!; expect(paired.length).toBeLessThan(RECORDS_MAX_CODE_UNITS);
  m.data.set(RUN_RECORD_KEYS.primary, 'corrupt'); m.data.set(RUN_RECORD_KEYS.backup, paired);
  assert((await store.recover(store.inspect(), false)).ok);
  expect(m.data.get(RUN_RECORD_KEYS.primary)).toBe(paired);
  expect(selectedRunRecords(store.inspect())?.receipts.run).toMatchObject({ other: { id: 'unsaved' }, sealed: { otherId: 'also-frozen' } });
});
it('keeps 100 widest summaries and both paired receipts inside the existing envelope limit', async () => {
  const wide = (mode: 'run' | 'dungeon', id: string): RunRecord => ({ mode, id: id.padEnd(64, 'x'),
    outcome: mode === 'run' ? 'victory' : 'abandoned', recordedAt: 8_640_000_000_000_000,
    battlesWon: mode === 'run' ? 3 : 8192 * 3, floorsCleared: mode === 'run' ? null : 8192,
    deepestFloor: mode === 'run' ? null : 8192 });
  const pending = (mode: 'run' | 'dungeon') => ({ kind: 'pending' as const,
    record: wide(mode, 'saved'), other: wide(mode, 'live'), newId: 'new'.padEnd(64, 'x'),
    sealed: { kind: 'sealed' as const, id: 'frozen'.padEnd(64, 'x'), otherId: 'also-frozen'.padEnd(64, 'x') } });
  const history: RunRecords = { version: 1, records: Array.from({ length: 100 }, (_, i) => wide('dungeon', `row-${i}`)),
    receipts: { run: pending('run'), dungeon: pending('dungeon') } };
  const text = encodeRunRecords(history); assert(text); expect(text.length).toBeLessThan(RECORDS_MAX_CODE_UNITS);
  const m = memory(), store = createRunRecordsStorage(() => m, direct);
  assert((await store.mutate(() => history)).ok); expect(selectedRunRecords(store.inspect())?.records).toHaveLength(100);
  expect(store.inspect().primary.status).toBe('valid');
});
