import { assert, expect, it } from 'vitest';
import { appendRunRecord, authoredRunRecord, dungeonRunRecord, emptyRunRecords, readRunRecord, readRunRecords, RECORD_LIMIT, type RunRecord } from '../../src/domain/runRecords';
import { preparedSnapshot, rewardSnapshot, runContext } from '../helpers/runItemFixtures';
import { createRun, runBoundaryId, transitionRun, type RunState } from '../../src/domain/run';
import { freshDungeon, type DungeonState } from '../../src/domain/dungeon';

export const recordFixture = (id = 'run-1', recordedAt = 100): RunRecord => ({ mode: 'run', id, outcome: 'defeat', recordedAt,
  battlesWon: 1, floorsCleared: null, deepestFloor: null });

it('projects every authored phase without ending an unfinished run or counting a pending reward twice', () => {
  const created = createRun('initial', 13, runContext.definition, runContext.catalog); assert(created.ok);
  const reward = rewardSnapshot().items.run, ready = preparedSnapshot().items.run;
  for (const run of [created.state, reward, ready]) {
    expect(authoredRunRecord(run, 100)).toBeNull();
    expect(authoredRunRecord(run, 100, true)).toMatchObject({ outcome: 'abandoned', battlesWon: run === created.state ? 0 : 1 });
  }
  let run: RunState = created.state;
  for (let i = 0; i < 3; i++) {
    const win = transitionRun(run, { type: 'completeBattle', runId: run.id, revision: run.revision,
      encounterId: run.encounters[i], boundaryId: runBoundaryId(run), outcome: 'victory', party: run.party }, runContext.definition, runContext.catalog);
    assert(win.ok); run = win.state;
    if (run.phase === 'reward') {
      const next = transitionRun(run, { type: 'acknowledgeReward', runId: run.id, revision: run.revision,
        encounterId: run.encounters[i], boundaryId: runBoundaryId(run) }, runContext.definition, runContext.catalog);
      assert(next.ok); run = next.state;
    }
  }
  expect(authoredRunRecord(run, 123, true)).toEqual({ mode: 'run', id: run.id, outcome: 'victory', recordedAt: 123,
    battlesWon: 3, floorsCleared: null, deepestFloor: null });
  expect(authoredRunRecord({ ...ready, phase: 'defeat', pendingReward: null, party: ready.party.map(h => ({ ...h, hp: 0 })) }, 100, true))
    .toMatchObject({ outcome: 'defeat', battlesWon: 1 });
});

it('projects cumulative dungeon facts on backtracking and never declares a floor or boss win terminal', () => {
  const fresh = freshDungeon('dungeon', 13), floor = fresh.floors[0];
  // Explicit projection-only fixtures: two visited floors, currently back on floor one.
  const state: DungeonState = { ...fresh, floors: [{ ...floor, completed: 3 },
    { ...floor, completed: 2, descriptor: { ...floor.descriptor, depth: 2 } }] };
  const before = JSON.stringify(state);
  for (const phase of ['ready', 'battle', 'reward'] as const) expect(dungeonRunRecord({ ...state, phase }, 100)).toBeNull();
  expect(dungeonRunRecord(state, 100, true)).toMatchObject({ outcome: 'abandoned', battlesWon: 5, floorsCleared: 1, deepestFloor: 2 });
  expect(dungeonRunRecord({ ...state, phase: 'defeat' }, 100, true)).toMatchObject({ outcome: 'defeat', battlesWon: 5 });
  expect(JSON.stringify(state)).toBe(before);
});

it('validates bounded counters, applicable fields, IDs and recording time', () => {
  const valid = recordFixture(); expect(readRunRecord(valid)).toEqual(valid);
  for (const patch of [{ id: '' }, { id: 'x'.repeat(65) }, { id: '<script>' }, { recordedAt: -1 }, { recordedAt: NaN },
    { recordedAt: 8_640_000_000_000_001 }, { battlesWon: 1.5 }, { battlesWon: 4 }, { floorsCleared: 0 }, { deepestFloor: 1 },
    { outcome: 'win' }, { outcome: 'victory' }, { extra: true }]) expect(readRunRecord({ ...valid, ...patch })).toBeNull();
  const dungeon = { ...valid, mode: 'dungeon', floorsCleared: 1, deepestFloor: 2, battlesWon: 3 };
  expect(readRunRecord(dungeon)).toEqual(dungeon);
  for (const patch of [{ deepestFloor: 0 }, { deepestFloor: 8193 }, { floorsCleared: 3 }, { battlesWon: 2 }, { battlesWon: 7 },
    { outcome: 'victory' }]) expect(readRunRecord({ ...dungeon, ...patch })).toBeNull();
});

it('freezes the first result, uses stable newest-first ordering and retains at most 100 summaries', () => {
  const first = recordFixture('first', 1), initial = appendRunRecord(emptyRunRecords(), first), before = JSON.stringify(initial);
  expect(appendRunRecord(initial, { ...first, outcome: 'abandoned', recordedAt: 999 })).toBe(initial);
  expect(JSON.stringify(initial)).toBe(before);
  let history = initial;
  for (let i = 0; i < RECORD_LIMIT; i++) history = appendRunRecord(history,
    { ...first, mode: 'dungeon', id: `dungeon-${String(i).padStart(3, '0')}`, recordedAt: 100,
      floorsCleared: 0, deepestFloor: 1 });
  expect(history.records).toHaveLength(100); expect(history.records[0].id).toBe('dungeon-000');
  expect(history.records.some(r => r.id === 'first')).toBe(false);
  // The still-current authored terminal save cannot resurrect its evicted record.
  expect(appendRunRecord(history, { ...first, recordedAt: 1000 })).toBe(history);
  expect(readRunRecords(history)).toEqual(history);
});

it('admits two bounded receipts and rejects duplicate keys, getters, sparse arrays and invalid pending identities', () => {
  const history = appendRunRecord(emptyRunRecords(), recordFixture());
  const pending = { ...history, receipts: { run: { kind: 'pending', record: recordFixture(), newId: 'next' }, dungeon: null } };
  expect(readRunRecords(pending)).toEqual(pending);
  for (const bad of [{ ...history, version: 2 }, { ...history, records: [recordFixture(), recordFixture()] },
    { ...history, records: new Array(1) }, { ...history, receipts: { ...history.receipts, extra: null } },
    { ...pending, receipts: { run: { ...pending.receipts.run, newId: 'run-1' }, dungeon: null } },
    { ...pending, receipts: { run: null, dungeon: pending.receipts.run } }]) expect(readRunRecords(bad)).toBeNull();
  const getter = { ...recordFixture() }; Object.defineProperty(getter, 'id', { enumerable: true, get() { throw Error('accessor'); } });
  expect(readRunRecord(getter)).toBeNull();
  const read = readRunRecords(history)!; (read.records[0] as { id: string }).id = 'changed';
  expect(history.records[0].id).toBe('run-1');
});
it('accepts bounded paired intent/seals without changing legacy v1 receipts and rejects malformed extensions', () => {
  const legacy = { ...emptyRunRecords(), receipts: { run: { kind: 'pending', record: recordFixture(), newId: 'next' }, dungeon: null } };
  expect(readRunRecords(legacy)).toEqual(legacy);
  const receipt = { ...legacy.receipts.run, other: recordFixture('unsaved'), sealed: { kind: 'sealed', id: 'frozen', otherId: 'also-frozen' } };
  const paired = { ...legacy, receipts: { ...legacy.receipts, run: receipt } };
  expect(readRunRecords(paired)).toEqual(paired);
  for (const patch of [{ other: recordFixture('run-1') }, { other: recordFixture('next') }, { other: null },
    { other: { ...recordFixture('unsaved'), mode: 'dungeon' } }, { extra: recordFixture('third') },
    { sealed: { kind: 'sealed', id: 'frozen', otherId: 'frozen' } }, { sealed: { kind: 'sealed', id: 'frozen', otherId: ['a', 'b'] } },
    { sealed: { kind: 'sealed', id: 'frozen', thirdId: 'third' } }, { sealed: null }]) {
    expect(readRunRecords({ ...paired, receipts: { ...paired.receipts, run: { ...receipt, ...patch } } })).toBeNull();
  }
  const accessor = { ...receipt }; Object.defineProperty(accessor, 'other', { enumerable: true, get() { throw Error('getter'); } });
  expect(readRunRecords({ ...paired, receipts: { ...paired.receipts, run: accessor } })).toBeNull();
  const read = readRunRecords(paired)!; const copy = read.receipts.run; assert(copy?.kind === 'pending' && copy.other);
  (copy.other as { id: string }).id = 'mutated'; expect(receipt.other.id).toBe('unsaved');
});
