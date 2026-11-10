import { assert, expect, it } from 'vitest';
import { RunHistory } from '../../src/app/RunHistory';
import { createRunRecordsStorage, RUN_RECORD_KEYS, selectedRunRecords } from '../../src/persistence/runRecordsStorage';
import type { RunRecord } from '../../src/domain/runRecords';
const old: RunRecord = { mode: 'run', id: 'old-run', outcome: 'abandoned', recordedAt: 100, battlesWon: 1, floorsCleared: null, deepestFloor: null };
function fixture() {
  const data = new Map<string, string>(), store = createRunRecordsStorage(() => ({ getItem: key => data.get(key) ?? null,
    setItem: (key, text) => { data.set(key, text); }, removeItem: key => { data.delete(key); } }), async action => action());
  return { data, store, history: new RunHistory('run', store, () => 100), read: () => selectedRunRecords(store.inspect()) };
}
it('persists pending intent before replacement, and finalizes only an accepted replacement', async () => {
  const f = fixture();
  expect(await f.history.replace(old, 'new-run', async () => {
    expect(f.read()?.receipts.run).toEqual({ kind: 'pending', record: old, newId: 'new-run' });
    expect(f.read()?.records).toEqual([]); return false;
  })).toBe(false);
  expect(f.read()?.records).toEqual([]); expect(f.read()?.receipts.run).toBeNull();
  expect(await f.history.replace(old, 'new-run', async () => true)).toBe(true);
  expect(f.read()?.records).toEqual([old]);
  expect(await f.history.replace({ ...old, recordedAt: 200 }, 'next-run', async () => true)).toBe(true);
  expect(f.read()?.records).toEqual([old]);
});
it.each(['old-run', 'new-run', 'unrelated-run'])('reconciles interrupted intent conservatively against %s', async id => {
  const f = fixture();
  await expect(f.history.replace(old, 'new-run', async () => { throw Error('interrupted'); })).rejects.toThrow('interrupted');
  expect(f.read()?.records).toEqual([]);
  await f.history.resume(id, null); await f.history.whenIdle();
  if (id === 'new-run') expect(f.read()?.records).toEqual([old]);
  else expect(f.read()?.records).toEqual([]);
  if (id === 'unrelated-run') {
    expect(f.read()?.receipts.run?.kind).toBe('pending'); expect(f.history.status).toContain('unresolved');
  } else expect(f.read()?.receipts.run?.kind).not.toBe('pending');
});
it('does not discard another unresolved receipt when recording an accepted outcome', async () => {
  const f = fixture();
  await expect(f.history.replace(old, 'new-run', async () => { throw Error('interrupted'); })).rejects.toThrow();
  const receipt = f.read()?.receipts.run;
  await f.history.record({ ...old, id: 'another-run', outcome: 'defeat' });
  expect(f.read()?.receipts.run).toEqual(receipt);
  expect(f.read()?.records).toHaveLength(1);
});
it('history denial does not block the accepted new game and reports the failure', async () => {
  const history = new RunHistory('run', createRunRecordsStorage(() => null, async action => action()));
  let replaced = false;
  expect(await history.replace(old, 'new-run', async () => { replaced = true; return true; })).toBe(true);
  expect(replaced).toBe(true); expect(history.status).toContain('unavailable');
});
it('skips all history access for an unadmitted startup placeholder', async () => {
  const f = fixture();
  const result = await f.history.replace(null, 'new-run', async () => true);
  assert(result); expect(f.data.has(RUN_RECORD_KEYS.primary)).toBe(false); expect(f.data.has(RUN_RECORD_KEYS.backup)).toBe(false);
});
