import { assert, expect, it } from 'vitest';
import { BattleSession } from '../../src/app/BattleSession';
import { acceptBattleStats, authoredWins, dungeonProgressStats, freshRunStats, readRunStats, type AcceptedBattle } from '../../src/domain/runStats';
import { previewMovement } from '../../src/domain/grid';
import { replayCommandSequence } from '../../src/domain/turns';
import { freshRunSnapshot } from '../../src/domain/runBattle';
import { freshDungeon } from '../../src/domain/dungeon';
import { runContext, rewardSnapshot } from '../helpers/runItemFixtures';
import { playerDecision } from '../helpers/playerPolicy';

it.each([-1, 0.1, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '1'])('rejects invalid stat count %s', value => {
  for (const field of ['enemiesKilled', 'movesTaken', 'activeMs']) expect(readRunStats({ ...freshRunStats(), [field]: value })).toBeNull();
});
it('validates exact versioned shapes and copies its bounded receipt', () => {
  const stats = { ...freshRunStats('since-upgrade'), boundary: { battle: 0, command: 2 } };
  expect(readRunStats(stats)).toEqual(stats); expect(readRunStats(stats)?.boundary).not.toBe(stats.boundary);
  for (const patch of [{ version: 3 }, { coverage: 'unknown' }, { timeCoverage: 'unknown' }, { extra: 1 }, { boundary: { battle: -1, command: 0 } },
    { boundary: { battle: 24577, command: 1 } }, { boundary: { battle: 0, command: 1, extra: 0 } }]) {
    expect(readRunStats({ ...stats, ...patch })).toBeNull();
  }
  expect(readRunStats({ ...stats, activeMs: Number.MAX_SAFE_INTEGER })).not.toBeNull();
});

it('preserves whole counter-only facts while starting time coverage at the clock upgrade', () => {
  const {timeCoverage:_,...counter}=freshRunStats();
  expect(readRunStats({...counter,version:1,enemiesKilled:3,movesTaken:4})).toMatchObject({
    version:2,coverage:'whole-run',timeCoverage:'since-upgrade',enemiesKilled:3,movesTaken:4,activeMs:0,
  });
});

it('reduces legal multi-cell movement and undo once while leaving active time and RNG intact', () => {
  let stats = { ...freshRunStats(), activeMs: 1234 }, last: AcceptedBattle | undefined;
  const initial = freshRunSnapshot('stats-undo', 13, runContext);
  const created = BattleSession.fromRun(initial.items, runContext, (_state, batch) => {
    last = batch; stats = acceptBattleStats(stats, 0, batch);
  }); assert(created.ok); const battle = created.session;
  while (battle.phase === 'enemy') { const step = battle.nextEnemy(); assert(step); battle.finishPresentation(step.token); }
  const reach = previewMovement(battle.state, battle.active.id, battle.catalog); assert(reach.ok);
  const destination = reach.cells.find(cell => cell.cost > 1); assert(destination);
  assert(battle.prepare({ type: 'move', unitId: battle.active.id, to: destination.cell }).ok);
  const before = battle.state, moved = battle.confirm(); assert(moved); battle.finishPresentation(moved.token);
  expect(stats.movesTaken).toBe(1); expect(battle.state.rng).toEqual(before.rng);
  const once = stats; expect(acceptBattleStats(stats, 0, last!)).toBe(once);
  const undo = battle.undoMove(); assert(undo); battle.finishPresentation(undo.token);
  expect(stats).toMatchObject({ movesTaken: 0, activeMs: 1234 });
  expect(acceptBattleStats(stats, 0, moved)).toBe(stats);
  expect(acceptBattleStats(stats, 0, { ...last!, after: last!.before })).toBe(stats);
  expect(replayCommandSequence(battle.replay!.initial, battle.replay!.commands, battle.catalog)).toMatchObject({ ok: true, state: battle.state });
});

it('counts exact enemy defeats through a complete legal battle, including the terminal batch, with replay parity', () => {
  let stats = freshRunStats(); const batches: AcceptedBattle[] = [];
  const initial = freshRunSnapshot('stats-legal', 13, runContext), created = BattleSession.fromRun(initial.items, runContext,
    (_state, batch) => { batches.push(batch); stats = acceptBattleStats(stats, 0, batch); }); assert(created.ok);
  const battle = created.session;
  for (let i = 0; i < 500 && battle.state.outcome === 'ongoing'; i++) {
    const step = battle.phase === 'enemy' ? battle.nextEnemy() :
      (battle.prepare(playerDecision(battle.state, battle.catalog)), battle.confirm());
    assert(step); battle.finishPresentation(step.token);
  }
  expect(battle.state.outcome).not.toBe('ongoing');
  const enemyIds = new Set(battle.state.units.filter(unit => unit.side === 'enemy').map(unit => unit.id));
  expect(stats.enemiesKilled).toBe(battle.events.filter(event => event.type === 'defeated' && enemyIds.has(event.unitId)).length);
  expect(stats.enemiesKilled).toBeGreaterThan(0);
  expect(stats.movesTaken).toBe(battle.events.filter(event => event.type === 'moved' && !enemyIds.has(event.unitId)).length);
  for (const batch of batches) expect(acceptBattleStats(stats, 0, batch)).toBe(stats);
  const replay = battle.replay!;
  expect(replayCommandSequence(replay.initial, replay.commands, battle.catalog)).toEqual({ ok: true, state: battle.state, events: battle.events });
  const terminal = batches.at(-1)!;
  expect(acceptBattleStats(freshRunStats(), 0, { ...terminal, events: [...terminal.events, ...terminal.events] }).enemiesKilled)
    .toBe(acceptBattleStats(freshRunStats(), 0, terminal).enemiesKilled);
});

it('projects wins and unique floors from validated progress rather than accumulating observations', () => {
  expect(authoredWins(rewardSnapshot().items.run)).toBe(1);
  const dungeon = freshDungeon('stats-floors', 13);
  expect(dungeonProgressStats(dungeon)).toEqual({ battlesWon: 0, floorsCleared: 0 });
});

it('ignores hero defeats and enemy moves, saturates bounded counts, and rejects stale encounters', () => {
  const created = BattleSession.fromRun(freshRunSnapshot('stats-bounds', 13, runContext).items, runContext); assert(created.ok);
  const before = created.session.state, enemy = before.units.find(unit => unit.side === 'enemy')!, hero = before.units.find(unit => unit.side === 'player')!;
  const after = { ...before, commandCount: before.commandCount + 1,
    units: before.units.map(unit => unit.id === enemy.id || unit.id === hero.id ? { ...unit, hp: 0 } : unit) };
  const accepted: AcceptedBattle = { before, after, events: [{ type: 'defeated', unitId: hero.id },
    { type: 'defeated', unitId: enemy.id }, { type: 'moved', unitId: enemy.id, path: [] }] };
  const max = { ...freshRunStats(), enemiesKilled: Number.MAX_SAFE_INTEGER, movesTaken: Number.MAX_SAFE_INTEGER };
  expect(acceptBattleStats(max, 1, accepted)).toMatchObject({ enemiesKilled: Number.MAX_SAFE_INTEGER, movesTaken: Number.MAX_SAFE_INTEGER });
  const counted = acceptBattleStats(freshRunStats(), 1, accepted); expect(counted.enemiesKilled).toBe(1); expect(counted.movesTaken).toBe(0);
  expect(acceptBattleStats(counted, 0, accepted)).toBe(counted);
  expect(acceptBattleStats(counted, -1, accepted)).toBe(counted);
});
