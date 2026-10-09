import { assert, describe, expect, it, vi } from 'vitest';
import { catalogFixture } from './fixtures/contentContract';
import type { CellPosition, ContentCatalog, MapRecord, TerrainId } from '../../src/content/types';
import type { AbilityId, BattleEvent, BattleState, Command } from '../../src/domain/types';
import { contentVersion, readBattleState, readReplay } from '../../src/domain/battle';
import { rollDie, seedRng } from '../../src/domain/rng';
import { moveUnit, previewMovement } from '../../src/domain/grid';
import { previewAttack, resolveAttack } from '../../src/domain/combat';
import { manhattanDistance } from '../../src/domain/targeting';
import { createBattle, dispatch, endTurn, orderInitiative, replayBattle, restartBattle } from '../../src/domain/turns';

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value;
}
// 4 × 3 open map; spawn IDs deliberately not in side order. Dexterity differs per definition.
const map = {
  id: 'map:turns_fixture', width: 4, height: 3,
  cells: Array.from({ length: 12 }, (_, i) => ({ x: i % 4, y: Math.floor(i / 4), elevation: 0, terrainId: 'grass' as TerrainId })),
  spawns: [
    { id: 4, side: 'enemies', unitId: 'goblin_archer', x: 3, y: 1 }, { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
    { id: 3, side: 'enemies', unitId: 'goblin_grunt', x: 3, y: 2 }, { id: 2, side: 'heroes', unitId: 'ranger', x: 0, y: 1 },
  ],
} as const satisfies MapRecord;
const dexterity = { fighter: 2, ranger: 3, mage: 0, goblin_grunt: 0, goblin_archer: 1 } as const;
const base: ContentCatalog = copy(catalogFixture);
const catalog: ContentCatalog = { ...base, maps: { [map.id]: map },
  heroes: { ...base.heroes, fighter: { ...base.heroes.fighter, stats: { ...base.heroes.fighter.stats, maxHp: 20, dexterity: dexterity.fighter } },
    ranger: { ...base.heroes.ranger, stats: { ...base.heroes.ranger.stats, maxHp: 16, dexterity: dexterity.ranger } } },
  enemies: { goblin_grunt: { ...base.enemies.goblin_grunt, stats: { ...base.enemies.goblin_grunt.stats, maxHp: 12, dexterity: dexterity.goblin_grunt } },
    goblin_archer: { ...base.enemies.goblin_archer, stats: { ...base.enemies.goblin_archer.stats, maxHp: 10, dexterity: dexterity.goblin_archer } } } };
// A hand-built mid-battle snapshot: initiative 1, 3, 2, 4 with unit 1 active.
function snapshot(): BattleState {
  return { format: 1, versions: { rules: 1, rng: 1, content: contentVersion(catalog) }, seed: 7, rng: seedRng(7), mapId: map.id,
    units: [
      { id: 1, side: 'player', defId: 'fighter', cell: { x: 0, y: 0 }, hp: 20, hasMoved: true, hasActed: true },
      { id: 2, side: 'player', defId: 'ranger', cell: { x: 0, y: 1 }, hp: 16, hasMoved: true, hasActed: false },
      { id: 3, side: 'enemy', defId: 'goblin_grunt', cell: { x: 3, y: 2 }, hp: 12, hasMoved: true, hasActed: true },
      { id: 4, side: 'enemy', defId: 'goblin_archer', cell: { x: 3, y: 1 }, hp: 10, hasMoved: false, hasActed: true },
    ],
    initiative: [1, 3, 2, 4], activeIndex: 0, round: 3, outcome: 'ongoing', commandCount: 9 };
}
const withHp = (s: BattleState, hp: Record<number, number>): BattleState => ({ ...s, units: s.units.map(u => u.id in hp ? { ...u, hp: hp[u.id] } : u) });
const wait = (unitId: number) => ({ type: 'endTurn' as const, unitId });

describe('initiative order (legacy TurnManager.gd:8-27,101-108; test_turn_manager.gd:43-95)', () => {
  const entry = (unitId: number, side: 'player' | 'enemy', natural: number, dex: number) => ({ unitId, side, natural, dexterity: dex });
  it('sorts by total, then Dexterity, then player side, then lower ID, regardless of input order', () => {
    const cases = [
      [[entry(1, 'player', 10, 0), entry(2, 'player', 7, 5), entry(3, 'player', 20, -1)], [3, 2, 1]],
      [[entry(1, 'player', 12, 1), entry(2, 'player', 10, 3)], [2, 1]],
      [[entry(1, 'enemy', 10, 2), entry(2, 'player', 10, 2)], [2, 1]],
      [[entry(2, 'player', 10, 1), entry(1, 'player', 10, 1)], [1, 2]],
    ] as const;
    for (const [entries, order] of cases) {
      expect(orderInitiative(entries)).toEqual(order);
      expect(orderInitiative([...entries].reverse())).toEqual(order);
    }
  });
});

describe('battle creation', () => {
  it('builds units from spawns and rolls one d20 per unit in ID order from the seeded RNG only', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('clock'); });
    try {
      const result = createBattle(map.id, 7, freeze(copy(catalog)));
      assert(result.ok);
      expect(result.state.units).toEqual([
        { id: 1, side: 'player', defId: 'fighter', cell: { x: 0, y: 0 }, hp: 20, hasMoved: false, hasActed: false },
        { id: 2, side: 'player', defId: 'ranger', cell: { x: 0, y: 1 }, hp: 16, hasMoved: false, hasActed: false },
        { id: 3, side: 'enemy', defId: 'goblin_grunt', cell: { x: 3, y: 2 }, hp: 12, hasMoved: false, hasActed: false },
        { id: 4, side: 'enemy', defId: 'goblin_archer', cell: { x: 3, y: 1 }, hp: 10, hasMoved: false, hasActed: false },
      ]);
      let rng = seedRng(7);
      const rolls = result.state.units.map(u => { const roll = rollDie(rng, 20); rng = roll.rng; return { u, natural: roll.value }; });
      expect(result.state.rng).toEqual(rng);
      expect(result.events.slice(0, 4)).toEqual(rolls.map(({ u, natural }) =>
        ({ type: 'initiativeRolled', unitId: u.id, natural, total: natural + dexterity[u.defId] })));
      expect(result.state.initiative).toEqual(orderInitiative(rolls.map(({ u, natural }) => ({ unitId: u.id, side: u.side, natural, dexterity: dexterity[u.defId] }))));
      expect(result.events.slice(4)).toEqual([{ type: 'turnStarted', unitId: result.state.initiative[0], round: 1 }]);
      expect(result.state).toMatchObject({ seed: 7, mapId: map.id, activeIndex: 0, round: 1, outcome: 'ongoing', commandCount: 0,
        versions: { rules: 1, rng: 1, content: contentVersion(catalog) } });
      expect(readBattleState(copy(result.state), catalog)).toEqual({ ok: true, state: result.state });
      expect(readReplay({ format: 1, versions: result.state.versions, initial: result.state, commands: [] }, catalog).ok).toBe(true);
      expect(createBattle(map.id, 7, catalog)).toEqual(result);
      const other = createBattle(map.id, 8, catalog); assert(other.ok);
      expect(other.state.rng).not.toEqual(result.state.rng);
    } finally { vi.restoreAllMocks(); }
  });
  it('rejects an unknown map or a seed outside uint32', () => {
    for (const seed of [-1, 1.5, NaN, 0x100000000]) expect(createBattle(map.id, seed, catalog)).toEqual({ ok: false, reason: 'invalidState' });
    expect(createBattle('map:not_here', 7, catalog)).toEqual({ ok: false, reason: 'invalidState' });
    expect(createBattle('constructor' as never, 7, catalog)).toEqual({ ok: false, reason: 'invalidState' });
  });
});

describe('end turn (legacy Wait; TurnManager.gd:64-73,90-94,119-137)', () => {
  it('ends the turn without a move or action, and starts the next unit with cleared flags', () => {
    const input = freeze(snapshot()); const before = JSON.stringify(input);
    const result = endTurn(input, wait(1), catalog);
    assert(result.ok);
    expect(result.events).toEqual([{ type: 'turnEnded', unitId: 1 }, { type: 'turnStarted', unitId: 3, round: 3 }]);
    expect(result.state).toEqual({ ...input, activeIndex: 1, commandCount: 10,
      units: input.units.map(u => u.id === 3 ? { ...u, hasMoved: false, hasActed: false } : u) });
    expect(result.state.units[0]).toMatchObject({ hasMoved: true, hasActed: true });
    expect(result.state.rng).toEqual(input.rng);
    expect(readBattleState(result.state, catalog).ok).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
  });
  it('adds one round when the order wraps', () => {
    const result = endTurn({ ...snapshot(), activeIndex: 3 }, wait(4), catalog);
    assert(result.ok);
    expect(result.state).toMatchObject({ activeIndex: 0, round: 4 });
    expect(result.events[1]).toEqual({ type: 'turnStarted', unitId: 1, round: 4 });
  });
  it('skips defeated units, adding one round at most once across the wrap', () => {
    const skip = endTurn(withHp(snapshot(), { 3: 0 }), wait(1), catalog);
    assert(skip.ok); expect(skip.state).toMatchObject({ activeIndex: 2, round: 3 });
    const acrossWrap = endTurn({ ...withHp(snapshot(), { 4: 0, 1: 0 }), activeIndex: 2 }, wait(2), catalog);
    assert(acrossWrap.ok);
    expect(acrossWrap.state).toMatchObject({ activeIndex: 1, round: 4 });
    expect(acrossWrap.events).toEqual([{ type: 'turnEnded', unitId: 2 }, { type: 'turnStarted', unitId: 3, round: 4 }]);
  });
  it('rejects other actors, other commands, finished battles and exhausted counters without change', () => {
    const s = freeze(snapshot()); const before = JSON.stringify(s);
    expect(endTurn(s, wait(3), catalog)).toEqual({ ok: false, reason: 'notActiveUnit' });
    expect(endTurn(s, wait(9), catalog)).toEqual({ ok: false, reason: 'unknownUnit' });
    expect(endTurn(s, { type: 'move', unitId: 1, to: { x: 1, y: 0 } }, catalog)).toEqual({ ok: false, reason: 'malformedCommand' });
    expect(endTurn(s, { type: 'endTurn', unitId: 1, extra: true }, catalog)).toEqual({ ok: false, reason: 'malformedCommand' });
    expect(endTurn({ ...withHp(s, { 3: 0, 4: 0 }), outcome: 'playerWin' }, wait(1), catalog)).toEqual({ ok: false, reason: 'battleOver' });
    expect(endTurn({ ...s, commandCount: Number.MAX_SAFE_INTEGER }, wait(1), catalog)).toEqual({ ok: false, reason: 'invalidState' });
    expect(endTurn({ ...s, activeIndex: 3, round: Number.MAX_SAFE_INTEGER }, wait(4), catalog)).toEqual({ ok: false, reason: 'invalidState' });
    expect(endTurn({ ...s, round: Number.MAX_SAFE_INTEGER }, wait(1), catalog).ok).toBe(true);
    expect(endTurn({ ...s, round: 0 }, wait(1), catalog)).toEqual({ ok: false, reason: 'invalidState' });
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('restart', () => {
  it('returns the seed\'s fresh battle from a mid-battle or finished snapshot', () => {
    const fresh = createBattle(map.id, 7, catalog); assert(fresh.ok);
    const waited = endTurn(fresh.state, wait(fresh.state.initiative[0]), catalog); assert(waited.ok);
    expect(restartBattle(freeze(waited.state), catalog)).toEqual(fresh);
    expect(restartBattle({ ...withHp(snapshot(), { 3: 0, 4: 0 }), outcome: 'playerWin' }, catalog)).toEqual(fresh);
    expect(restartBattle({ ...snapshot(), outcome: 'playerWin' }, catalog)).toEqual({ ok: false, reason: 'invalidState' });
  });
});

describe('dispatch and replay', () => {
  it('routes each command type to its resolver and rejects anything else', () => {
    const s = snapshot();
    const commands = [{ type: 'move', unitId: 1, to: { x: 1, y: 0 } }, { type: 'endTurn', unitId: 1 },
      { type: 'useAbility', unitId: 1, abilityId: 'ability:basic_attack', target: { unitId: 3 } }] as const;
    const fresh = { ...s, units: s.units.map(u => ({ ...u, hasMoved: false, hasActed: false })) };
    expect(dispatch(fresh, commands[0], catalog)).toEqual(moveUnit(fresh, commands[0], catalog));
    expect(dispatch(fresh, commands[1], catalog)).toEqual(endTurn(fresh, commands[1], catalog));
    expect(dispatch(fresh, commands[2], catalog)).toEqual(resolveAttack(fresh, commands[2], catalog));
    expect(dispatch(fresh, commands[2], catalog)).toEqual({ ok: false, reason: 'outOfRange' });
    for (const input of [null, { type: 'restart' }, { type: 'endTurn', unitId: 1, now: 0 }])
      expect(dispatch(fresh, input, catalog)).toEqual({ ok: false, reason: 'malformedCommand' });
  });

  // A greedy script stands in for players and #9's AI: attack if possible, else move to the first cell
  // (cost, y, x order) that allows an attack, else to the cell closest to an enemy, then attack and Wait.
  function playBattle(seed: number) {
    const created = createBattle(map.id, seed, catalog); assert(created.ok);
    let state = created.state;
    const commands: Command[] = [], events: BattleEvent[] = [];
    const apply = (command: Command) => {
      const result = dispatch(state, command, catalog); assert(result.ok, JSON.stringify(result));
      commands.push(command); events.push(...result.events); state = result.state;
    };
    const attackFrom = (s: BattleState, unitId: number) => {
      const abilityId: AbilityId = s.units.find(u => u.id === unitId)!.defId === 'goblin_archer' ? 'ability:shortbow_shot' : 'ability:basic_attack';
      return s.units.map(t => ({ type: 'useAbility' as const, unitId, abilityId, target: { unitId: t.id } }))
        .find(command => previewAttack(s, command, catalog).ok);
    };
    while (state.outcome === 'ongoing' && commands.length < 500) {
      const unitId = state.initiative[state.activeIndex];
      const actor = state.units.find(u => u.id === unitId)!;
      if (!attackFrom(state, unitId)) {
        const reach = previewMovement(state, unitId, catalog); assert(reach.ok);
        const cells = reach.cells.slice(1).map(r => r.cell);
        const nearest = (c: CellPosition) => Math.min(...state.units.filter(u => u.hp > 0 && u.side !== actor.side).map(u => manhattanDistance(c, u.cell)));
        const to = cells.find(c => { const moved = moveUnit(state, { type: 'move', unitId, to: c }, catalog); return moved.ok && attackFrom(moved.state, unitId); }) ??
          cells.reduce<CellPosition | undefined>((best, c) => best === undefined || nearest(c) < nearest(best) ? c : best, undefined);
        if (to) apply({ type: 'move', unitId, to });
      }
      const attack = attackFrom(state, unitId);
      if (attack) apply(attack);
      if (state.outcome === 'ongoing') apply({ type: 'endTurn', unitId });
    }
    return { initial: created.state, state, commands, events };
  }

  it('replays a full seeded battle command by command to the identical state and events', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('clock'); });
    try {
      const played = playBattle(7);
      expect(played.state.outcome).not.toBe('ongoing');
      expect(new Set(played.commands.map(c => c.type))).toEqual(new Set(['move', 'useAbility', 'endTurn']));
      const replay = { format: 1, versions: played.initial.versions, initial: played.initial, commands: played.commands };
      const replayed = replayBattle(freeze(copy(replay)), catalog);
      expect(replayed).toEqual({ ok: true, state: played.state, events: played.events });
      expect(replayBattle(JSON.parse(JSON.stringify(replay)), catalog)).toEqual(replayed);
      expect(readBattleState(played.state, catalog).ok).toBe(true);

      // Whole-battle invariants: one ending, one defeat per fallen unit, and no defeated unit ever starts a turn.
      expect(played.events.filter(e => e.type === 'battleEnded')).toEqual([{ type: 'battleEnded', outcome: played.state.outcome }]);
      expect(played.events.at(-1)?.type).toBe('battleEnded');
      const defeated = played.events.filter(e => e.type === 'defeated').map(e => e.unitId);
      expect(defeated.length).toBeGreaterThanOrEqual(2); // so a side kept fighting after a loss
      expect(defeated.sort()).toEqual(played.state.units.filter(u => u.hp === 0).map(u => u.id));
      const fallen = new Set<number>();
      for (const e of played.events) {
        if (e.type === 'defeated') fallen.add(e.unitId);
        if (e.type === 'turnStarted') expect(fallen.has(e.unitId)).toBe(false);
      }
    } finally { vi.restoreAllMocks(); }
  });
  it('names the first command that does not apply, and rejects a bad envelope', () => {
    const played = playBattle(7);
    const replay = { format: 1, versions: played.initial.versions, initial: played.initial, commands: played.commands };
    const index = played.commands.findIndex(c => c.type === 'useAbility');
    const tampered = copy(replay); tampered.commands.splice(index, 0, tampered.commands[index]);
    expect(replayBattle(tampered, catalog)).toEqual({ ok: false, reason: 'invalidReplay', index: index + 1, rejection: 'alreadyActed' });
    const extended = { ...copy(replay), commands: [...replay.commands, { type: 'endTurn', unitId: played.state.initiative[played.state.activeIndex] }] };
    expect(replayBattle(extended, catalog)).toEqual({ ok: false, reason: 'invalidReplay', index: replay.commands.length, rejection: 'battleOver' });
    expect(replayBattle({ ...copy(replay), initial: played.state }, catalog)).toEqual({ ok: false, reason: 'invalidReplay' });
    expect(replayBattle({ ...copy(replay), commands: [{ type: 'restart' }] }, catalog)).toEqual({ ok: false, reason: 'invalidReplay' });
  });
});
