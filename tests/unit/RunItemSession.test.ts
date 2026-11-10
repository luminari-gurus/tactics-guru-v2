import { assert, expect, it } from 'vitest';
import { RunItemSession } from '../../src/app/RunItemSession';
import { activeSnapshot, preparedSnapshot, rewardSnapshot, runContext } from '../helpers/runItemFixtures';
import { createRunStorage, RUN_STORAGE_KEYS } from '../../src/persistence/runStorage';
import { freshRunSnapshot } from '../../src/domain/runBattle';
import { RunHistory } from '../../src/app/RunHistory';
import { createRunRecordsStorage, RUN_RECORD_KEYS, selectedRunRecords } from '../../src/persistence/runRecordsStorage';
import { decodeRunSave, encodeRunSave } from '../../src/domain/runSaveEnvelope';
import { runBoundaryId, transitionRun } from '../../src/domain/run';
const unavailable = () => createRunStorage(runContext, () => null);
function historyFixture() {
  const data = new Map<string, string>(); let failRemoval = false;
  const provider = () => ({ getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, text: string) => { data.set(key, text); }, removeItem: (key: string) => {
      if (failRemoval && key === RUN_STORAGE_KEYS.primary) throw Error('partial reset'); data.delete(key);
    } });
  const storage = createRunStorage(runContext, provider), records = createRunRecordsStorage(provider, async action => action());
  const history = new RunHistory('run', records, () => 100);
  return { data, storage, records, history, fail() { failRemoval = true; } };
}
it('records a staged terminal Continue once while preserving exact saved slots and state', async () => {
  const f = historyFixture(), ready = preparedSnapshot();
  const terminal = { ...ready, items: { ...ready.items, run: { ...ready.items.run, phase: 'defeat' as const,
    pendingReward: null, revision: ready.items.run.revision + 1, party: ready.items.run.party.map(hero => ({ ...hero, hp: 0 })) } } };
  const primary = encodeRunSave(terminal, runContext), backup = encodeRunSave(ready, runContext); assert(primary.ok && backup.ok);
  const ended = { primary: primary.text, backup: backup.text, ended: terminal };
  f.data.set(RUN_STORAGE_KEYS.primary, ended.primary); f.data.set(RUN_STORAGE_KEYS.backup, ended.backup);
  const session = new RunItemSession(preparedSnapshot(), runContext, f.storage, undefined, f.history);
  expect(f.data.has(RUN_RECORD_KEYS.primary)).toBe(false); // Construction/inspection cannot record a placeholder.
  assert(session.continue(session.inspect())); await f.history.whenIdle();
  expect(session.snapshot).toEqual(ended.ended);
  expect(selectedRunRecords(f.records.inspect())?.records).toMatchObject([{ id: ended.ended.items.run.id, outcome: 'defeat', recordedAt: 100 }]);
  const bytes = [f.data.get(RUN_STORAGE_KEYS.primary), f.data.get(RUN_STORAGE_KEYS.backup)];
  assert(session.continue(session.inspect())); await f.history.whenIdle();
  expect(selectedRunRecords(f.records.inspect())?.records).toHaveLength(1);
  expect([f.data.get(RUN_STORAGE_KEYS.primary), f.data.get(RUN_STORAGE_KEYS.backup)]).toEqual(bytes);
  const read = decodeRunSave(bytes[0]!, runContext); assert(read.ok); expect(read.state).toEqual(session.snapshot);
});
it('admits a staged valid victory on explicit Continue without rewriting either active-save slot', async () => {
  const f = historyFixture(), initial = freshRunSnapshot('victory-restore', 13, runContext); let run = initial.items.run;
  // Terminal-continuation fixture only; the browser legal-outcome journey retains earned-play proof.
  for (let index = 0; index < 3; index++) {
    const won = transitionRun(run, { type: 'completeBattle', runId: run.id, revision: run.revision,
      encounterId: run.encounters[index], boundaryId: runBoundaryId(run), outcome: 'victory', party: run.party }, runContext.definition, runContext.catalog);
    assert(won.ok); run = won.state;
    if (run.phase === 'reward') {
      const next = transitionRun(run, { type: 'acknowledgeReward', runId: run.id, revision: run.revision,
        encounterId: run.encounters[index], boundaryId: runBoundaryId(run) }, runContext.definition, runContext.catalog);
      assert(next.ok); run = next.state;
    }
  }
  const saved = { ...initial, items: { ...initial.items, run } }, encoded = encodeRunSave(saved, runContext); assert(encoded.ok);
  f.data.set(RUN_STORAGE_KEYS.primary, encoded.text); f.data.set(RUN_STORAGE_KEYS.backup, encoded.text);
  const session = new RunItemSession(initial, runContext, f.storage, undefined, f.history);
  assert(session.continue(session.inspect())); await f.history.whenIdle();
  expect(selectedRunRecords(f.records.inspect())?.records).toMatchObject([{ id: run.id, outcome: 'victory', battlesWon: 3 }]);
  expect(session.snapshot).toEqual(saved); expect(f.data.get(RUN_STORAGE_KEYS.primary)).toBe(encoded.text); expect(f.data.get(RUN_STORAGE_KEYS.backup)).toBe(encoded.text);
});
it('records accepted replacement but neither stale review nor partial reset invents an abandonment', async () => {
  for (const failure of ['none', 'stale', 'partial'] as const) {
    const f = historyFixture(), before = preparedSnapshot(); assert(f.storage.save(before).ok);
    const session = new RunItemSession(before, runContext, f.storage, undefined, f.history);
    assert(session.continue(session.inspect())); await f.history.whenIdle();
    const review = session.inspect();
    if (failure === 'stale') session.inspect();
    if (failure === 'partial') f.fail();
    expect(await session.replace(review, 'new-recorded-run', 14)).toBe(failure === 'none');
    await f.history.whenIdle();
    const history = selectedRunRecords(f.records.inspect());
    expect(history?.records ?? []).toHaveLength(failure === 'none' ? 1 : 0);
    expect(history?.receipts.run?.kind).not.toBe('pending');
    if (failure === 'none') expect(history?.records[0]).toMatchObject({ id: before.items.run.id, outcome: 'abandoned', battlesWon: 1 });
    else expect(session.snapshot).toEqual(before);
  }
});
it('does not record an initial placeholder and fully gates an injected recorder for a testing run', async () => {
  const f = historyFixture(), initial = freshRunSnapshot('unadmitted', 13, runContext);
  const session = new RunItemSession(initial, runContext, f.storage, undefined, f.history);
  expect(await session.replace(session.inspect(), 'fresh-admitted', 14)).toBe(true);
  expect(f.data.has(RUN_RECORD_KEYS.primary)).toBe(false);
  const testing = new RunItemSession(initial, runContext, null, undefined,
    new RunHistory('run', createRunRecordsStorage(() => { throw Error('Testing route touched history'); })));
  expect(testing.history).toBeNull(); testing.startNew(); expect(testing.restart('temporary-new', 14)).toBe(true);
});
it('refuses replacement if gameplay changes while its history receipt is being prepared', async () => {
  const f = historyFixture(), before = preparedSnapshot(); assert(f.storage.save(before).ok);
  const session = new RunItemSession(before, runContext, f.storage, undefined, f.history);
  assert(session.continue(session.inspect())); await f.history.whenIdle();
  const replacing = session.replace(session.inspect(), 'new-after-race', 14);
  assert(session.dispatch({ ...session.boundary(), type: 'useItem', itemId: 'item:healing_draught', heroId: 'fighter' }).ok);
  const changed = session.snapshot;
  expect(await replacing).toBe(false); expect(session.snapshot).toEqual(changed);
  expect(selectedRunRecords(f.records.inspect())?.records).toEqual([]);
  expect(session.status).toContain('run changed while confirming');
});
it('keeps the reviewed startup token valid when history preparation fails', async () => {
  const f = historyFixture(), before = preparedSnapshot(); assert(f.storage.save(before).ok);
  const history = new RunHistory('run', createRunRecordsStorage(() => null, async action => action()));
  const session = new RunItemSession(before, runContext, f.storage, undefined, history);
  // The real startup renderer inspects saves while handling a status notification.
  session.onChange = () => { session.inspect(); };
  expect(await session.replace(session.inspect(), 'after-denied-history', 14)).toBe(true);
  expect(session.snapshot.items.run.id).toBe('after-denied-history');
  expect(session.status).toContain('Run history could not be confirmed');
});
it.each(['accepted', 'stale', 'partial'] as const)('records the distinct saved and admitted unsaved run only when replacement is %s', async result => {
  const f = historyFixture(), saved = preparedSnapshot(), live = freshRunSnapshot('unsaved-live-run', 23, runContext);
  assert(f.storage.save(saved).ok);
  const session = new RunItemSession(live, runContext, f.storage, undefined, f.history);
  session.playUnsaved(); const before = session.snapshot, review = session.inspect();
  if (result === 'stale') f.data.set(RUN_STORAGE_KEYS.primary, 'changed while reviewing');
  if (result === 'partial') f.fail();
  expect(await session.replace(review, 'after-distinct-runs', 24)).toBe(result === 'accepted');
  await f.history.whenIdle();
  const rows = selectedRunRecords(f.records.inspect())?.records ?? [];
  if (result === 'accepted') {
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: saved.items.run.id, outcome: 'abandoned', battlesWon: 1 }),
      expect.objectContaining({ id: live.items.run.id, outcome: 'abandoned', battlesWon: 0 }),
    ]));
    assert(session.continue(session.inspect())); await f.history.whenIdle();
    expect(selectedRunRecords(f.records.inspect())?.records).toEqual(rows);
  } else { expect(rows).toEqual([]); expect(session.snapshot).toEqual(before); }
});
it('can retry after reviewed removal of a primary corrupted during play', () => {
  const data = new Map<string,string>();
  const storage = createRunStorage(runContext,()=>({getItem:key=>data.get(key)??null,
    setItem:(key,value)=>{data.set(key,value);},removeItem:key=>{data.delete(key);}}));
  const run = new RunItemSession(preparedSnapshot(),runContext,storage);
  assert(run.save().ok);
  data.set(RUN_STORAGE_KEYS.primary,'corrupt');
  expect(run.save()).toMatchObject({ok:false,reason:'recoveryRequired'});
  assert(run.remove('primary',run.inspect()));
  expect(run.save()).toEqual({ok:true});
  const restored=storage.load();assert(restored.ok);
  expect(restored.selected?.state).toEqual(run.snapshot);
});
it('refuses a stale session write without replacing either saved slot', () => {
  const data = new Map<string,string>();
  const provider = () => ({getItem:(key:string)=>data.get(key)??null,
    setItem:(key:string,value:string)=>{data.set(key,value);}, removeItem:(key:string)=>{data.delete(key);}});
  const initial = preparedSnapshot(), firstStorage = createRunStorage(runContext,provider);
  assert(firstStorage.save(initial).ok);
  const first = new RunItemSession(initial,runContext,firstStorage);
  const second = new RunItemSession(initial,runContext,createRunStorage(runContext,provider));
  assert(first.continue(first.inspect())); assert(second.continue(second.inspect()));
  assert(first.dispatch({...first.boundary(),type:'useItem',itemId:'item:healing_draught',heroId:'fighter'}).ok);
  const latest = [...data];
  assert(second.dispatch({...second.boundary(),type:'useItem',itemId:'item:healing_draught',heroId:'ranger'}).ok);
  expect(second.save()).toMatchObject({ok:false,reason:'changed'});
  expect(second.hasUnsavedProgress).toBe(true);
  expect([...data]).toEqual(latest);
});
it('commits claim once, rejects stale review and preserves accepted state after storage failure', () => {
  const s = new RunItemSession(rewardSnapshot(), runContext, unavailable());
  const command = { ...s.boundary(), type: 'claimReward' as const, offerId: s.snapshot.items.offer!.id, itemId: s.snapshot.items.offer!.options[0].itemId };
  expect(s.dispatch(command).ok).toBe(true);
  const after = s.snapshot;
  expect(after.items.run.encounterIndex).toBe(1); expect(after.items.itemRevision).toBe(1);
  expect(s.status).toContain('unsaved');
  expect(s.dispatch(command)).toMatchObject({ ok: false, reason: 'staleBoundary' });
  expect(s.snapshot).toEqual(after);
});
it('rejects invalid targets and active battle changes, and never exposes mutable session state', () => {
  const s = new RunItemSession(preparedSnapshot(), runContext, unavailable());
  s.inspect(); expect(s.status).toContain('needs recovery');
  const before = s.snapshot;
  expect(s.dispatch({ ...s.boundary(), type: 'useItem', itemId: 'item:healing_draught', heroId: 'mage' }).ok).toBe(false);
  expect(s.snapshot).toEqual(before);
  const copy = s.snapshot; (copy.items.ownership.consumables[0] as any).quantity = 99;
  expect(s.snapshot).toEqual(before);
  const active = new RunItemSession(activeSnapshot(), runContext, unavailable());
  expect(active.dispatch({ ...active.boundary(), type: 'useItem', itemId: 'item:healing_draught', heroId: 'fighter' })).toMatchObject({ ok: false, reason: 'wrongContext' });
});
it('uses once and restores a reviewed saved boundary without mutating RNG', () => {
  const data = new Map<string, string>();
  const storage = createRunStorage(runContext, () => ({ getItem: k => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v); }, removeItem: k => { data.delete(k); } }));
  const s = new RunItemSession(preparedSnapshot(), runContext, storage);
  const use = { ...s.boundary(), type: 'useItem' as const, itemId: 'item:healing_draught' as const, heroId: 'fighter' as const };
  const result = s.dispatch(use); assert(result.ok); const after = s.snapshot;
  (result.state.ownership.consumables[0] as any).quantity = 9;
  expect(s.snapshot).toEqual(after);
  expect(after.items.ownership.consumables[0].quantity).toBe(1);
  expect(after.items.run.party[0].hp).toBe(10);
  const restored = new RunItemSession(rewardSnapshot(), runContext, storage);
  const review = restored.inspect(); assert(review.ok);
  expect(restored.continue(structuredClone(review))).toBe(false);
  expect(restored.continue(review)).toBe(true); expect(restored.snapshot).toEqual(after);
  expect(restored.continue(review)).toBe(false);
  expect(restored.dispatch(use).ok).toBe(false); expect(restored.snapshot).toEqual(after);
});

for(const choice of ['continue','replace'] as const)it(`keeps explicit unsaved item boundaries and retries from writing until reviewed ${choice}`,async()=>{
  const data=new Map<string,string>();let deny=false;
  const storage=createRunStorage(runContext,()=>({getItem:k=>{if(deny)throw new DOMException('Denied','SecurityError');return data.get(k)??null;},setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}}));
  const saved=freshRunSnapshot('saved-run',14,runContext);assert(storage.save(saved).ok);const before=[...data];
  deny=true;const s=new RunItemSession(rewardSnapshot(),runContext,storage);s.playUnsaved();s.inspect();deny=false;
  const command={...s.boundary(),type:'claimReward' as const,offerId:s.snapshot.items.offer!.id,itemId:s.snapshot.items.offer!.options[0].itemId};
  expect(s.dispatch(command).ok).toBe(true);expect(s.save()).toEqual({ok:false,reason:'unsaved'});expect([...data]).toEqual(before);
  const stale=s.inspect();const current=s.inspect();expect(s.continue(stale)).toBe(false);expect(await s.replace(stale,'new-run',15)).toBe(false);expect(s.isUnsavedOnly).toBe(true);
  if(choice==='continue'){expect(s.continue(current)).toBe(true);expect(s.snapshot).toEqual(saved);}
  else expect(await s.replace(current,'new-run',15)).toBe(true);
  expect(s.isUnsavedOnly).toBe(false);expect(s.save().ok).toBe(true);
  expect(JSON.parse(data.get(RUN_STORAGE_KEYS.primary)!).payload.items.run.id).toBe(choice==='continue'?'saved-run':'new-run');
});

it('keeps unsaved departure after a rejected item or reward command',()=>{
  const s=new RunItemSession(rewardSnapshot(),runContext,unavailable());
  s.playUnsaved();
  expect(s.hasUnsavedProgress).toBe(true);
  expect(s.status).toMatch(/unsaved/i);
  const stale={...s.boundary(),type:'claimReward' as const,offerId:'stale-offer',itemId:s.snapshot.items.offer!.options[0].itemId};
  expect(s.dispatch(stale)).toMatchObject({ok:false,reason:'staleBoundary'});
  expect(s.status).toContain('Nothing changed');
  expect(/unsaved/i.test(s.status)).toBe(false);
  expect(s.hasUnsavedProgress).toBe(true);
  const use={...s.boundary(),type:'useItem' as const,itemId:'item:healing_draught' as const,heroId:'mage' as const};
  expect(s.dispatch(use).ok).toBe(false);
  expect(s.status).toContain('Nothing changed');
  expect(s.hasUnsavedProgress).toBe(true);
});

it('keeps unsaved departure after a failed save then a rejected reward command',()=>{
  const s=new RunItemSession(rewardSnapshot(),runContext,unavailable());
  const command={...s.boundary(),type:'claimReward' as const,offerId:s.snapshot.items.offer!.id,itemId:s.snapshot.items.offer!.options[0].itemId};
  expect(s.dispatch(command).ok).toBe(true);
  expect(s.hasUnsavedProgress).toBe(true);
  expect(s.status).toMatch(/unsaved/i);
  expect(s.dispatch(command)).toMatchObject({ok:false,reason:'staleBoundary'});
  expect(s.status).toContain('Nothing changed');
  expect(/unsaved/i.test(s.status)).toBe(false);
  expect(s.hasUnsavedProgress).toBe(true);
});
