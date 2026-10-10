import { assert, describe, expect, it, vi } from 'vitest';
import { catalogFixture } from './fixtures/contentContract';
import type { ContentCatalog, MapRecord } from '../../src/content/types';
import type { BattleState, Command, UnitState } from '../../src/domain/types';
import { contentVersion, readBattleState } from '../../src/domain/battle';
import { rollDie, seedRng } from '../../src/domain/rng';
import { createBattle, dispatch, replayBattle } from '../../src/domain/turns';
import { RULE_BOUNDS } from '../../src/domain/constants';
import { battleCatalog } from '../../src/content/catalog';
import { previewAttack } from '../../src/domain/combat';
import { planEnemyTurn, runEnemyTurn } from '../../src/domain/ai';

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function setup(archer = false) {
  const map: MapRecord = { id: 'map:ai_fixture', width: 7, height: 3,
    cells: Array.from({ length: 21 }, (_, i) => ({ x: i % 7, y: Math.floor(i / 7), elevation: 0, terrainId: 'grass' })),
    spawns: [{ id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 1 },
      { id: 2, side: 'heroes', unitId: 'ranger', x: 0, y: 2 },
      { id: 3, side: 'enemies', unitId: archer ? 'goblin_archer' : 'goblin_grunt', x: 4, y: 1 }] };
  const catalog: ContentCatalog = { ...copy(catalogFixture), maps: { [map.id]: map } };
  const units: UnitState[] = map.spawns.map(s => ({ id: s.id, side: s.side === 'heroes' ? 'player' : 'enemy', defId: s.unitId,
    cell: { x: s.x, y: s.y }, hp: 18, hasMoved: false, hasActed: false }) as UnitState);
  const state: BattleState = { format: 1, versions: { rules: 1, rng: 1, content: contentVersion(catalog) }, seed: 0, rng: seedRng(0),
    mapId: map.id, units, initiative: [3, 1, 2], activeIndex: 0, round: 1, outcome: 'ongoing', commandCount: 0 };
  assert(readBattleState(state, catalog).ok);
  return { catalog, state };
}
const wait = { type: 'endTurn', unitId: 3 } as const;
const attack = (target = 1, archer = false): Command => ({ type: 'useAbility', unitId: 3,
  abilityId: archer ? 'ability:shortbow_shot' : 'ability:basic_attack', target: { unitId: target } });
const changeUnit = (s: BattleState, id: number, changes: Partial<UnitState>): BattleState =>
  ({ ...s, units: s.units.map(u => u.id === id ? { ...u, ...changes } as UnitState : u) });
function commands(state: BattleState, catalog: ContentCatalog) {
  const result = planEnemyTurn(state, 3, catalog); assert(result.ok, JSON.stringify(result)); return result.commands;
}
function checkLegal(state: BattleState, catalog: ContentCatalog, list: readonly Command[]) {
  for (const command of list) {
    const result = dispatch(state, command, catalog); assert(result.ok, JSON.stringify(result)); state = result.state;
    if (state.outcome !== 'ongoing') break;
  }
  return state;
}

describe('enemy candidate selection', () => {
  it('moves to a reachable melee attack, then Waits using shared dispatch', () => {
    const { state, catalog } = setup();
    const list = commands(state, catalog);
    expect(list).toEqual([{ type: 'move', unitId: 3, to: { x: 1, y: 1 } }, attack(), wait]);
    const ended = checkLegal(state, catalog, list);
    expect(ended.initiative[ended.activeIndex]).toBe(1);
  });
  it('prefers no movement and the lowest target ID on equal expected damage', () => {
    const { state, catalog } = setup(true);
    const s = changeUnit(state, 2, { cell: { x: 1, y: 2 } });
    expect(commands(s, catalog)).toEqual([attack(1, true), wait]);
  });
  it('breaks equal attack-position costs by cell y then x', () => {
    const { state, catalog } = setup();
    const s = changeUnit(changeUnit(changeUnit(state, 1, { cell: { x: 0, y: 0 } }), 2, { hp: 0 }),
      3, { cell: { x: 2, y: 2 } });
    expect(commands(s, catalog)).toEqual([{ type: 'move', unitId: 3, to: { x: 1, y: 0 } }, attack(), wait]);
    checkLegal(s, catalog, commands(s, catalog));
  });
  it('normalizes unit order and ignores catalog insertion order without mutation or entropy', () => {
    const { state, catalog } = setup(true);
    const reordered = { ...catalog, abilities: Object.fromEntries(Object.entries(catalog.abilities).reverse()) } as ContentCatalog;
    const reversed = { ...state, units: [...state.units].reverse() };
    const before = JSON.stringify({ reversed, reordered });
    vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('clock'); });
    try {
      expect(commands(reversed, reordered)).toEqual(commands(state, catalog));
      expect(JSON.stringify({ reversed, reordered })).toBe(before);
    } finally { vi.restoreAllMocks(); }
  });
  it('rejects malformed state, unknown, inactive, defeated and player actors without touching input', () => {
    const { state, catalog } = setup();
    const cases: [unknown, number, string][] = [[{}, 3, 'invalidState'], [state, 4, 'unknownUnit'],
      [state, 1, 'notActiveUnit'], [changeUnit(state, 1, { hp: 0 }), 1, 'unitDefeated'],
      [{ ...state, activeIndex: 1 }, 1, 'notEnemyUnit'],
      [{ ...state, commandCount: 10000 }, 3, 'commandLimit']];
    for (const [s, actor, reason] of cases) {
      const before = JSON.stringify(s);
      expect(planEnemyTurn(s, actor, catalog)).toEqual({ ok: false, reason });
      expect(JSON.stringify(s)).toBe(before);
    }
  });
  it('does not normalize invalid units into valid snapshots', () => {
    const { state, catalog } = setup();
    for (const units of [[...state.units, state.units[2]], [state.units[0], state.units[0], state.units[2]],
      [state.units[0], null, state.units[2]], [state.units[0], undefined, state.units[2]]]) {
      expect(planEnemyTurn({ ...state, units }, 3, catalog)).toEqual({ ok: false, reason: 'invalidState' });
    }
  });
  it.each(['hidden field', 'record prototype', 'array field', 'array prototype', 'units getter', 'array getter', 'id getter', 'other getter'])(
    'rejects %s before normalization without evaluating accessors', kind => {
      const { state, catalog } = setup();
      const getter = vi.fn(() => { throw Error('untrusted getter executed'); });
      if (kind === 'hidden field') Object.defineProperty(state, 'unexpected', { value: true });
      if (kind === 'record prototype') Object.setPrototypeOf(state, { unexpected: true });
      if (kind === 'array field') Object.defineProperty(state.units, 'extra', { value: true, enumerable: true });
      if (kind === 'array prototype') Object.setPrototypeOf(state.units, Object.create(Array.prototype));
      if (kind === 'units getter') Object.defineProperty(state, 'units', { enumerable: true, get: getter });
      if (kind === 'array getter') Object.defineProperty(state.units, '0', { enumerable: true, get: getter });
      if (kind === 'id getter') Object.defineProperty(state.units[0], 'id', { enumerable: true, get: getter });
      if (kind === 'other getter') Object.defineProperty(state, 'round', { enumerable: true, get: getter });
      expect(readBattleState(state, catalog)).toEqual({ ok: false, reason: 'invalidState' });
      expect(planEnemyTurn(state, 3, catalog)).toEqual({ ok: false, reason: 'invalidState' });
      expect(runEnemyTurn(state, 3, catalog)).toEqual({ ok: false, reason: 'invalidState',
        state: undefined, commands: [], events: [] });
      expect(getter).not.toHaveBeenCalled();
    });
  it('normalizes reversed units for execution without mutating the input', () => {
    const { state, catalog } = setup();
    const reversed = { ...state, units: [...state.units].reverse() };
    const before = JSON.stringify(reversed);
    expect(runEnemyTurn(reversed, 3, catalog)).toEqual(runEnemyTurn(state, 3, catalog));
    expect(JSON.stringify(reversed)).toBe(before);
  });
  it('ignores defeated targets and rejects completed battles', () => {
    const { state, catalog } = setup(true);
    const one = changeUnit(state, 1, { hp: 0 });
    expect(commands(one, catalog)).toContainEqual(attack(2, true));
    const over = { ...changeUnit(one, 2, { hp: 0 }), outcome: 'playerLoss' as const };
    expect(planEnemyTurn(over, 3, catalog)).toEqual({ ok: false, reason: 'battleOver' });
  });
  it('uses higher ground to improve expected damage despite greater movement cost', () => {
    const { state, catalog } = setup(true);
    const map = catalog.maps[state.mapId];
    const raised = { ...catalog, maps: { [map.id]: { ...map, cells: map.cells.map(c =>
      c.x === 3 && c.y === 1 ? { ...c, elevation: 1 } : c) } } };
    const s = { ...state, versions: { ...state.versions, content: contentVersion(raised) } };
    expect(commands(s, raised)).toEqual([{ type: 'move', unitId: 3, to: { x: 3, y: 1 } }, attack(1, true), wait]);
    checkLegal(s, raised, commands(s, raised));
  });
  it('respects line of sight and the archer minimum range when movement is spent', () => {
    const { state, catalog } = setup(true);
    const map = catalog.maps[state.mapId];
    const blocked = { ...catalog, terrains: { ...catalog.terrains, forest: { ...catalog.terrains.forest, blocksLineOfSight: true } },
      maps: { [map.id]: { ...map, cells: map.cells.map(c => c.x === 2 ? { ...c, terrainId: 'forest' as const } : c) } } };
    const s = { ...changeUnit(state, 3, { hasMoved: true }), versions: { ...state.versions, content: contentVersion(blocked) } };
    expect(commands(s, blocked)).toEqual([wait]);
    const near = changeUnit(changeUnit(state, 3, { cell: { x: 0, y: 0 }, hasMoved: true }), 2, { hp: 0 });
    expect(commands(near, catalog)).toEqual([wait]);
  });
  it('orders tied abilities lexically and excludes unowned hero signatures', () => {
    const { state, catalog } = setup();
    const twin = { ...catalog, abilities: { ...catalog.abilities,
      'ability:shortbow_shot': { ...catalog.abilities['ability:shortbow_shot'], owners: ['goblin_grunt' as const], rangeMin: 1, rangeMax: 1 } } };
    const s = { ...state, versions: { ...state.versions, content: contentVersion(twin) } };
    expect(commands(s, twin)[1]).toEqual(attack());
    expect(commands(state, catalog).filter(c => c.type === 'useAbility').map(c => c.abilityId)).toEqual(['ability:basic_attack']);
  });
  it('uses target defense and natural roll boundaries for expected damage ranking', () => {
    const { state, catalog } = setup(true);
    const s = changeUnit(state, 2, { cell: { x: 1, y: 2 } });
    const rank = (accuracy: number, fighterAC: number, rangerAC: number) => {
      const c = { ...catalog,
        heroes: { ...catalog.heroes, fighter: { ...catalog.heroes.fighter, stats: { ...catalog.heroes.fighter.stats, armorClass: fighterAC } },
          ranger: { ...catalog.heroes.ranger, stats: { ...catalog.heroes.ranger.stats, armorClass: rangerAC } } },
        enemies: { ...catalog.enemies, goblin_archer: { ...catalog.enemies.goblin_archer,
          stats: { ...catalog.enemies.goblin_archer.stats, accuracy } } } };
      return commands({ ...s, versions: { ...s.versions, content: contentVersion(c) } }, c)[0];
    };
    expect(rank(4, 30, 14)).toEqual(attack(2, true));
    // Both can hit only on natural 20, so target ID decides despite different AC.
    expect(rank(-10, 30, 29)).toEqual(attack(1, true));
    // Both hit on every face except natural 1; extra overkill accuracy does not improve the score.
    expect(rank(20, 14, 1)).toEqual(attack(1, true));
  });
});

describe('movement and Wait fallback', () => {
  it('moves closer when no attack is reachable', () => {
    const { state, catalog } = setup();
    const slow = { ...catalog, enemies: { ...catalog.enemies, goblin_grunt: { ...catalog.enemies.goblin_grunt,
      stats: { ...catalog.enemies.goblin_grunt.stats, move: 1 } } } };
    const s = { ...state, versions: { ...state.versions, content: contentVersion(slow) } };
    expect(commands(s, slow)).toEqual([{ type: 'move', unitId: 3, to: { x: 3, y: 1 } }, wait]);
    checkLegal(s, slow, commands(s, slow));
  });
  it('Waits at an occupied chokepoint without stepping into a living ally', () => {
    const { state, catalog } = setup();
    const map = catalog.maps[state.mapId];
    const corridor: ContentCatalog = { ...catalog, maps: { [map.id]: { ...map,
      spawns: [...map.spawns, { id: 4, side: 'enemies', unitId: 'goblin_grunt', x: 3, y: 1 }],
      cells: map.cells.map(c => c.y !== 1 && !(c.x === 0 && c.y === 2) ? { ...c, terrainId: 'water' } : c) } } };
    const s = { ...state, versions: { ...state.versions, content: contentVersion(corridor) }, initiative: [...state.initiative, 4],
      units: [...state.units, { ...state.units[2], id: 4, cell: { x: 3, y: 1 } }] };
    expect(commands(s, corridor)).toEqual([wait]);
    const freed = changeUnit(s, 4, { hp: 0 });
    expect(commands(freed, corridor)[0]).toMatchObject({ type: 'move', to: { x: 1, y: 1 } });
    checkLegal(freed, corridor, commands(freed, corridor));
  });
  it('Waits at an impassable wall even with a living unreachable target', () => {
    const { state, catalog } = setup();
    const map = catalog.maps[state.mapId];
    const wall = { ...catalog, maps: { [map.id]: { ...map, cells: map.cells.map(c => c.x === 3 ? { ...c, terrainId: 'water' as const } : c) } } };
    const s = { ...state, versions: { ...state.versions, content: contentVersion(wall) } };
    expect(commands(s, wall)).toEqual([wait]);
    checkLegal(s, wall, [wait]);
  });
  it('never spends move/action twice and preserves the input snapshot and RNG', () => {
    const { state, catalog } = setup(true);
    const before = JSON.stringify(state);
    expect(commands(changeUnit(state, 3, { hasMoved: true }), catalog)).toEqual([attack(1, true), wait]);
    expect(commands(changeUnit(state, 3, { hasActed: true }), catalog)).toEqual([
      { type: 'move', unitId: 3, to: { x: 1, y: 1 } }, wait]);
    expect(commands(changeUnit(state, 3, { hasActed: true, hasMoved: true }), catalog)).toEqual([wait]);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('bounded enemy execution', () => {
  it('dispatches move/attack/Wait and exposes the accepted commands and events', () => {
    const { state, catalog } = setup();
    const before = JSON.stringify(state);
    const result = runEnemyTurn(state, 3, catalog); assert(result.ok);
    expect(result.commands).toEqual(commands(state, catalog));
    let expected = state;
    const events = [];
    for (const command of result.commands) {
      const step = dispatch(expected, command, catalog); assert(step.ok); expected = step.state; events.push(...step.events);
    }
    expect(result.state).toEqual(expected);
    expect(result.events).toEqual(events);
    expect(result.commands).toHaveLength(3);
    expect(JSON.stringify(state)).toBe(before);
  });
  it('executes immediate attack/Wait and no-action Wait', () => {
    const { state, catalog } = setup(true);
    const hit = runEnemyTurn(state, 3, catalog); assert(hit.ok);
    expect(hit.commands).toEqual([attack(1, true), wait]);
    const spent = runEnemyTurn(changeUnit(state, 3, { hasActed: true, hasMoved: true }), 3, catalog); assert(spent.ok);
    expect(spent.commands).toEqual([wait]);
    expect(spent.state.initiative[spent.state.activeIndex]).toBe(1);
  });
  it('stops after the last player falls without an illegal turn end', () => {
    const { state, catalog } = setup(true);
    let seed = 0;
    while (rollDie(seedRng(seed), 20).value < 10) seed++;
    const s = { ...changeUnit(changeUnit(state, 1, { hp: 1 }), 2, { hp: 0 }), seed, rng: seedRng(seed) };
    const result = runEnemyTurn(s, 3, catalog); assert(result.ok);
    expect(result.commands).toEqual([attack(1, true)]);
    expect(result.state).toMatchObject({ outcome: 'playerLoss', activeIndex: 0 });
    expect(result.events.filter(e => e.type === 'battleEnded')).toHaveLength(1);
    expect(result.events.some(e => e.type === 'turnEnded')).toBe(false);
  });
  it('reports a first resolution rejection without changing turn ownership or RNG', () => {
    const { state, catalog } = setup(true);
    const exhausted: BattleState = { ...state, rng: { words: [0, 0, 0, 12], cursor: Number.MAX_SAFE_INTEGER } };
    const result = runEnemyTurn(exhausted, 3, catalog);
    expect(result).toEqual({ ok: false, reason: 'invalidState', state: exhausted, commands: [], events: [] });
  });
  it('reports an accepted move prefix when the following attack rejects', () => {
    const { state, catalog } = setup();
    const exhausted: BattleState = { ...state, rng: { words: [0, 0, 0, 12], cursor: Number.MAX_SAFE_INTEGER } };
    const result = runEnemyTurn(exhausted, 3, catalog); assert(!result.ok && result.state);
    const moved = dispatch(exhausted, commands(exhausted, catalog)[0], catalog); assert(moved.ok);
    expect(result).toEqual({ ok: false, reason: 'invalidState', state: moved.state,
      commands: [commands(exhausted, catalog)[0]], events: moved.events });
    expect(result.state.activeIndex).toBe(exhausted.activeIndex);
    expect(result.state.rng).toEqual(exhausted.rng);
  });
  it('stops at command and round limits without retries or implicit ownership changes', () => {
    const { state, catalog } = setup(true);
    const limited = { ...state, commandCount: RULE_BOUNDS.commandCount.max - 1 };
    const result = runEnemyTurn(limited, 3, catalog); assert(!result.ok && result.state);
    expect(result.reason).toBe('commandLimit');
    expect(result.commands).toEqual([attack(1, true)]);
    expect(result.state.activeIndex).toBe(state.activeIndex);
    const max = runEnemyTurn({ ...state, commandCount: RULE_BOUNDS.commandCount.max }, 3, catalog);
    expect(max).toEqual({ ok: false, reason: 'commandLimit', commands: [], events: [],
      state: { ...state, commandCount: RULE_BOUNDS.commandCount.max } });
    const last = { ...changeUnit(state, 3, { hasActed: true, hasMoved: true }), initiative: [1, 2, 3], activeIndex: 2,
      round: RULE_BOUNDS.round.max };
    expect(runEnemyTurn(last, 3, catalog)).toEqual({ ok: false, reason: 'invalidState', state: last, commands: [], events: [] });
  });
  it('returns no state for malformed input and canonical state for rejected player input', () => {
    const { state, catalog } = setup();
    expect(runEnemyTurn(null, 3, catalog)).toEqual({ ok: false, reason: 'invalidState', state: undefined, commands: [], events: [] });
    const player = { ...state, activeIndex: 1 };
    expect(runEnemyTurn(player, 1, catalog)).toEqual({ ok: false, reason: 'notEnemyUnit', state: player, commands: [], events: [] });
  });
});

describe('seeded battle replay', () => {
  it.each([0, 1, 42])('repeats authored battle commands, events and outcome from seed %i', seed => {
    const simulate = () => {
      const created = createBattle('map:forest_ruins', seed, battleCatalog); assert(created.ok);
      let state = created.state;
      const commands: Command[] = [], events = [...created.events];
      for (let turn = 0; turn < 200 && state.outcome === 'ongoing'; turn++) {
        const actor = state.units.find(u => u.id === state.initiative[state.activeIndex])!;
        if (actor.side === 'enemy') {
          const result = runEnemyTurn(state, actor.id, battleCatalog); assert(result.ok, JSON.stringify(result));
          expect(result.commands.length).toBeLessThanOrEqual(3);
          state = result.state; commands.push(...result.commands); events.push(...result.events);
        } else {
          // Fixed player policy: first legal basic attack in ID order, then Wait. No hidden random choices.
          for (const target of state.units.filter(u => u.side === 'enemy' && u.hp > 0)) {
            const command: Command = { type: 'useAbility', unitId: actor.id, abilityId: 'ability:basic_attack', target: { unitId: target.id } };
            if (!previewAttack(state, command, battleCatalog).ok) continue;
            const result = dispatch(state, command, battleCatalog); assert(result.ok);
            state = result.state; commands.push(command); events.push(...result.events); break;
          }
          if (state.outcome !== 'ongoing') break;
          const command: Command = { type: 'endTurn', unitId: actor.id };
          const result = dispatch(state, command, battleCatalog); assert(result.ok);
          state = result.state; commands.push(command); events.push(...result.events);
        }
      }
      expect(state.outcome).not.toBe('ongoing');
      expect(commands.some(c => c.type === 'move')).toBe(true);
      expect(events.some(e => e.type === 'attackRolled')).toBe(true);
      const replay = replayBattle({ format: 1, versions: created.state.versions, initial: created.state, commands }, battleCatalog);
      assert(replay.ok);
      expect(replay.state).toEqual(state);
      expect(replay.events).toEqual(events.slice(created.events.length));
      return { state, commands, events };
    };
    vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('clock'); });
    try { expect(simulate()).toEqual(simulate()); } finally { vi.restoreAllMocks(); }
  });
});
