import { assert, expect, it } from 'vitest';
import { appendRunRecord, authoredRunRecord, dungeonRunRecord, emptyRunRecords, readRunRecord, readRunRecords, RECORD_LIMIT, BEST_STATS, type RunRecord } from '../../src/domain/runRecords';
import { preparedSnapshot, rewardSnapshot, runContext } from '../helpers/runItemFixtures';
import { createRun, runBoundaryId, transitionRun, type RunState } from '../../src/domain/run';
import { freshDungeon, type DungeonState } from '../../src/domain/dungeon';

export const recordFixture = (id = 'run-1', recordedAt = 100): RunRecord => ({ mode: 'run', id, outcome: 'defeat', recordedAt,
  battlesWon: 1, floorsCleared: null, deepestFloor: null });
const trackedRecord = (id: string, at: number, value: number): RunRecord => ({ ...recordFixture(id, at),
  stats: { version: 2, coverage: 'whole-run', timeCoverage: 'whole-run', enemiesKilled: value, movesTaken: value, activeMs: value } });

it('ranks known counter-only kills/moves independently of partial playtime', () => {
  const counter=readRunRecord({...recordFixture('counter',100),stats:{version:1,coverage:'whole-run',enemiesKilled:50,movesTaken:80,activeMs:0}})!;
  let history=appendRunRecord(emptyRunRecords(),counter);
  expect(history.bests.run.enemiesKilled?.id).toBe('counter');expect(history.bests.run.activeMs).toBeUndefined();
  history=appendRunRecord(history,trackedRecord('timed',200,10));
  expect(history.bests.run.enemiesKilled?.id).toBe('counter');expect(history.bests.run.movesTaken?.id).toBe('counter');
  expect(history.bests.run.activeMs?.id).toBe('timed');
});

it('reads earlier nested v1 summaries without retaining an unproven complete-time maximum', () => {
  const counter={...recordFixture('older-counter',100),stats:{version:1,coverage:'whole-run',enemiesKilled:50,movesTaken:80,activeMs:1000}};
  const read=readRunRecords({...emptyRunRecords(),records:[counter],bests:{run:{activeMs:counter,enemiesKilled:counter},dungeon:{}}});assert(read);
  expect(read.legacyBestCoverage).toBe(true);expect(read.bests.run.activeMs).toBeUndefined();
  expect(read.bests.run.enemiesKilled?.stats).toMatchObject({version:2,coverage:'whole-run',timeCoverage:'since-upgrade',enemiesKilled:50});
});

it('retains attributed maxima after recent eviction, freezes their first result, and ranks duration by longest play', () => {
  const winner = trackedRecord('old-winner', 1, 9999);
  let history = appendRunRecord(emptyRunRecords(), winner);
  for (let i = 0; i < 101; i++) history = appendRunRecord(history, trackedRecord(`new-${i}`, i + 2, i));
  expect(history.records).toHaveLength(100); expect(history.records.some(row => row.id === winner.id)).toBe(false);
  for (const stat of ['enemiesKilled', 'movesTaken', 'activeMs'] as const) expect(history.bests.run[stat]).toEqual(winner);
  expect(appendRunRecord(history, trackedRecord(winner.id, 1000, 99999))).toBe(history);
  expect(Object.values(history.bests.run).length).toBeLessThanOrEqual(5);
  expect(readRunRecords(history)).toEqual(history);
});

it('selects newest tied maxima then stable identity, keeps modes separate and excludes partial totals', () => {
  let history = appendRunRecord(emptyRunRecords(), trackedRecord('older', 1, 10));
  history = appendRunRecord(history, trackedRecord('z-newer', 2, 10));
  history = appendRunRecord(history, trackedRecord('a-newer', 2, 10));
  expect(history.bests.run.activeMs?.id).toBe('a-newer');
  const partial = { ...trackedRecord('partial', 3, 99999), stats: { ...trackedRecord('partial', 3, 99999).stats!, coverage: 'since-upgrade' as const, timeCoverage: 'since-upgrade' as const } };
  history = appendRunRecord(history, partial);
  expect(history.bests.run.enemiesKilled?.id).toBe('a-newer');
  expect(history.bests.run.battlesWon?.id).toBe('partial');
  const dungeon: RunRecord = { ...trackedRecord('dungeon', 4, 500), mode: 'dungeon', floorsCleared: 1, battlesWon: 3, deepestFloor: 1 };
  history = appendRunRecord(history, dungeon);
  expect(history.bests.dungeon.floorsCleared).toEqual(dungeon); expect(history.bests.run.floorsCleared).toBeUndefined();
  for (const stat of BEST_STATS) if (stat !== 'floorsCleared') expect(history.bests.dungeon[stat]).toEqual(dungeon);
  const stats = trackedRecord('mutable', 5, 50000), frozen = appendRunRecord(history, stats);
  (stats.stats as { enemiesKilled: number }).enemiesKilled = 0;
  expect(frozen.bests.run.enemiesKilled?.stats?.enemiesKilled).toBe(50000);
});

it('migrates only retained legacy facts and preserves honest historical best coverage', () => {
  const old = { version: 1, records: [recordFixture()], receipts: { run: null, dungeon: null } };
  const migrated = readRunRecords(old)!; expect(migrated.legacyBestCoverage).toBe(true);
  expect(migrated.bests.run.battlesWon).toEqual(recordFixture());
  expect(migrated.bests.run.movesTaken).toBeUndefined(); expect(migrated.records[0].stats).toBeUndefined();
  expect(appendRunRecord(migrated, trackedRecord('new', 200, 1)).legacyBestCoverage).toBe(true);
  expect(emptyRunRecords().legacyBestCoverage).toBe(false);
});

it('rejects unsupported stats, partial winners, inconsistent summaries and accessor best maps', () => {
  const history = appendRunRecord(emptyRunRecords(), trackedRecord('winner', 10, 10));
  for (const patch of [{ version: 3 }, { activeMs: -1 }, { boundary: null }])
    expect(readRunRecord({ ...history.records[0], stats: { ...history.records[0].stats, ...patch } })).toBeNull();
  expect(readRunRecords({ ...history, bests: { run: { fastest: history.records[0] }, dungeon: {} } })).toBeNull();
  expect(readRunRecords({ ...history, bests: { run: { activeMs: { ...history.records[0], stats: { ...history.records[0].stats, timeCoverage: 'since-upgrade' } } }, dungeon: {} } })).toBeNull();
  expect(readRunRecords({ ...history, bests: { run: { activeMs: trackedRecord('winner', 10, 999) }, dungeon: {} } })).toBeNull();
  const getters = {}; Object.defineProperty(getters, 'activeMs', { enumerable: true, get() { throw Error('accessor'); } });
  expect(readRunRecords({ ...history, bests: { run: getters, dungeon: {} } })).toBeNull();
});

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
  for (const bad of [{ ...history, version: 3 }, { ...history, records: [recordFixture(), recordFixture()] },
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
