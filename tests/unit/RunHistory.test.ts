import { assert, expect, it } from 'vitest';
import { RunHistory } from '../../src/app/RunHistory';
import { createRunRecordsStorage, RUN_RECORD_KEYS, selectedRunRecords } from '../../src/persistence/runRecordsStorage';
import { appendRunRecord, emptyRunRecords, type RunRecord } from '../../src/domain/runRecords';
const old: RunRecord = { mode: 'run', id: 'old-run', outcome: 'abandoned', recordedAt: 100, battlesWon: 1, floorsCleared: null, deepestFloor: null };
const live: RunRecord = { ...old, id: 'unsaved-run', battlesWon: 0 };

it('freezes both paired statistics through interruption and updates maxima only on accepted recovery', async () => {
  const f = fixture(), saved: RunRecord = { ...old, stats: { version: 2, coverage: 'whole-run', timeCoverage: 'whole-run', enemiesKilled: 10, movesTaken: 20, activeMs: 300 } },
    unsaved: RunRecord = { ...live, stats: { version: 2, coverage: 'whole-run', timeCoverage: 'whole-run', enemiesKilled: 5, movesTaken: 40, activeMs: 100 } };
  await expect(f.history.replace(saved, 'paired-new', async () => { throw Error('interrupted'); }, unsaved)).rejects.toThrow('interrupted');
  expect(f.read()?.records).toEqual([]); expect(f.read()?.bests.run).toEqual({});
  expect(f.read()?.receipts.run).toMatchObject({ record: saved, other: unsaved });
  await f.history.resume('paired-new', null); await f.history.whenIdle();
  expect(f.read()?.records).toEqual([saved, unsaved]);
  expect(f.read()?.bests.run.enemiesKilled).toEqual(saved); expect(f.read()?.bests.run.movesTaken).toEqual(unsaved);
  const recorded = [...f.data];
  await f.history.record({ ...saved, stats: { ...saved.stats!, enemiesKilled: 999 } }); await f.history.whenIdle();
  expect([...f.data]).toEqual(recorded);
});
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
it.each([false,true])('keeps an evicted frozen result sealed after replacement accepts=%s', async accepted => {
  const f = fixture(), terminal = { ...old, outcome: 'defeat' as const };
  let history = appendRunRecord(emptyRunRecords(), terminal);
  for(let i=0;i<100;i++) history=appendRunRecord(history,{...terminal,mode:'dungeon',id:`other-${i}`,recordedAt:200+i,floorsCleared:0,deepestFloor:1});
  assert((await f.store.mutate(()=>history)).ok); expect(f.read()?.records.some(r=>r.id===old.id)).toBe(false);
  expect(await f.history.replace({...terminal,recordedAt:9999},'after-frozen',async()=>accepted)).toBe(accepted);
  await f.history.resume(old.id,{...terminal,recordedAt:10000});
  expect(f.read()?.records.some(r=>r.id===old.id)).toBe(false);
  expect(f.read()?.receipts.run).toEqual({kind:'sealed',id:old.id});
});
it('an accepted terminal result keeps its seal when a racing replacement is refused', async () => {
  const f=fixture(),terminal={...old,outcome:'defeat' as const};
  expect(await f.history.replace(old,'after-race',async()=>{await f.history.record(terminal);return false;})).toBe(false);
  expect(f.read()?.records).toEqual([terminal]); expect(f.read()?.receipts.run).toEqual({kind:'sealed',id:old.id});
  assert((await f.store.mutate(history=>{
    for(let i=0;i<100;i++)history=appendRunRecord(history,{...terminal,mode:'dungeon',id:`later-${i}`,recordedAt:200+i,floorsCleared:0,deepestFloor:1});
    return history;
  })).ok);
  await f.history.resume(old.id,{...terminal,recordedAt:10000});
  expect(f.read()?.records.some(r=>r.id===old.id)).toBe(false);
});
it.each([false, true])('stages the saved/live pair together and publishes neither until accepted=%s', async accepted => {
  const f = fixture();
  expect(await f.history.replace(old, 'paired-new', async () => {
    expect(f.read()?.receipts.run).toEqual({ kind: 'pending', record: old, other: live, newId: 'paired-new' });
    expect(f.read()?.records).toEqual([]); return accepted;
  }, live)).toBe(accepted);
  expect(f.read()?.records).toEqual(accepted ? [old, live] : []);
  expect(f.read()?.receipts.run?.kind).not.toBe('pending');
});
it.each(['old-run', 'unsaved-run', 'paired-new', 'unknown'])('reconciles both interrupted summaries against %s', async currentId => {
  const f = fixture();
  await expect(f.history.replace(old, 'paired-new', async () => { throw Error('interrupted'); }, live)).rejects.toThrow('interrupted');
  expect(f.read()?.records).toEqual([]);
  await f.history.resume(currentId, null);
  expect(f.read()?.records).toEqual(currentId === 'paired-new' ? [old, live] : []);
  expect(f.read()?.receipts.run?.kind === 'pending').toBe(currentId === 'unknown');
  if (currentId === 'paired-new') {
    await f.history.resume(currentId, null); expect(f.read()?.records).toEqual([old, live]);
  }
});
it.each([false, true])('preserves an evicted frozen saved result through a live companion, accepted=%s', async accepted => {
  const f = fixture(), terminal = { ...old, outcome: 'defeat' as const }, companion = { ...live, recordedAt: 1000 };
  let history = appendRunRecord(emptyRunRecords(), terminal);
  for (let i = 0; i < 100; i++) history = appendRunRecord(history, { ...terminal, mode: 'dungeon', id: `other-${i}`,
    recordedAt: 200 + i, floorsCleared: 0, deepestFloor: 1 });
  assert((await f.store.mutate(() => history)).ok);
  expect(await f.history.replace({ ...terminal, recordedAt: 9999 }, 'paired-new', async () => {
    const receipt = f.read()?.receipts.run; assert(receipt?.kind === 'pending');
    expect(receipt.sealed).toEqual({ kind: 'sealed', id: old.id });
    expect(f.read()?.records.some(row => row.id === old.id)).toBe(false); return accepted;
  }, companion)).toBe(accepted);
  expect(f.read()?.records.some(row => row.id === live.id)).toBe(accepted);
  assert((await f.store.mutate(h => {
    for (let i = 0; i < 100; i++) h = appendRunRecord(h, { ...terminal, mode: 'dungeon', id: `later-${i}`,
      recordedAt: 2000 + i, floorsCleared: 0, deepestFloor: 1 });
    return h;
  })).ok);
  await f.history.resume(old.id, { ...terminal, recordedAt: 10000 });
  if (accepted) await f.history.resume(live.id, { ...live, outcome: 'defeat', recordedAt: 10000 });
  expect(f.read()?.records.every(row => row.mode === 'dungeon')).toBe(true);
});
it('retains both frozen identities when the live companion ends while replacement is refused', async () => {
  const f = fixture(), savedEnd = { ...old, outcome: 'defeat' as const }, liveEnd = { ...live, outcome: 'defeat' as const };
  await f.history.record(savedEnd);
  expect(await f.history.replace(savedEnd, 'paired-new', async () => { await f.history.record(liveEnd); return false; }, live)).toBe(false);
  expect(f.read()?.records).toEqual([savedEnd, liveEnd]);
  assert((await f.store.mutate(h => {
    for (let i = 0; i < 100; i++) h = appendRunRecord(h, { ...savedEnd, mode: 'dungeon', id: `evict-${i}`,
      recordedAt: 1000 + i, floorsCleared: 0, deepestFloor: 1 });
    return h;
  })).ok);
  await f.history.resume(old.id, { ...savedEnd, recordedAt: 9999 });
  await f.history.resume(live.id, { ...liveEnd, recordedAt: 9999 });
  expect(f.read()?.records.every(row => row.mode === 'dungeon')).toBe(true);
});
