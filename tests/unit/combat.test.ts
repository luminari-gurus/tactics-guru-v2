import { assert, describe, expect, it, vi } from 'vitest';
import { catalogFixture } from './fixtures/contentContract';
import type { CellPosition, ContentCatalog, MapRecord, TerrainId, UnitId, UnitStats } from '../../src/content/types';
import type { BattleState, UnitState } from '../../src/domain/types';
import { contentVersion, readBattleState } from '../../src/domain/battle';
import { rollDie, seedRng } from '../../src/domain/rng';
import { moveUnit } from '../../src/domain/grid';
import { endTurn } from '../../src/domain/turns';
import { previewAttack, resolveAttack } from '../../src/domain/combat';

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value;
}
// Seeds whose first d20 is a chosen natural; the snapshot RNG is real, never stubbed.
const seeds = new Map<number, number>();
function seedFor(natural: number): number {
  if (!seeds.has(natural)) for (let s = 0; ; s++) if (rollDie(seedRng(s), 20).value === natural) { seeds.set(natural, s); break; }
  return seeds.get(natural)!;
}
type Setup = { stats?: Partial<Record<UnitId, Partial<UnitStats>>>; cells?: readonly (CellPosition & { elevation?: number; terrainId?: TerrainId })[];
  natural?: number; units?: Record<number, Partial<UnitState>>; activeIndex?: number };
// 6 × 3 map. Defaults: ranger (0,0), fighter (1,1), grunt (2,1) adjacent to the fighter, archer (4,1) three cells away.
// Every unit uses the fixture stats (accuracy 4, AC 14, power 3, 18 HP) unless overridden. Forest blocks line of sight.
function setup(o: Setup = {}): { catalog: ContentCatalog; state: BattleState } {
  const cells = Array.from({ length: 18 }, (_, i) => {
    const cell = { x: i % 6, y: Math.floor(i / 6), elevation: 0, terrainId: 'grass' as TerrainId };
    return { ...cell, ...o.cells?.find(c => c.x === cell.x && c.y === cell.y) };
  });
  const map: MapRecord = { id: 'map:combat_fixture', width: 6, height: 3, cells, spawns: [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 1, y: 1 }, { id: 2, side: 'heroes', unitId: 'ranger', x: 0, y: 0 },
    { id: 3, side: 'enemies', unitId: 'goblin_grunt', x: 2, y: 1 }, { id: 4, side: 'enemies', unitId: 'goblin_archer', x: 4, y: 1 } ] };
  const base: ContentCatalog = copy(catalogFixture);
  const withStats = <T extends { stats: UnitStats }>(r: T, id: UnitId): T => ({ ...r, stats: { ...r.stats, ...o.stats?.[id] } });
  const catalog: ContentCatalog = { ...base, maps: { [map.id]: map },
    heroes: { fighter: withStats(base.heroes.fighter, 'fighter'), ranger: withStats(base.heroes.ranger, 'ranger'), mage: base.heroes.mage },
    enemies: { goblin_grunt: withStats(base.enemies.goblin_grunt, 'goblin_grunt'), goblin_archer: withStats(base.enemies.goblin_archer, 'goblin_archer') },
    terrains: { ...base.terrains, forest: { ...base.terrains.forest, blocksLineOfSight: true } } };
  const unit = (id: number, side: 'player' | 'enemy', defId: UnitId, x: number, y: number) =>
    ({ id, side, defId, cell: { x, y }, hp: 18, hasMoved: false, hasActed: false, ...o.units?.[id] }) as UnitState;
  const seed = seedFor(o.natural ?? 10);
  const units = [unit(1, 'player', 'fighter', 1, 1), unit(2, 'player', 'ranger', 0, 0), unit(3, 'enemy', 'goblin_grunt', 2, 1), unit(4, 'enemy', 'goblin_archer', 4, 1)];
  const livingPlayer = units.some(u => u.side === 'player' && u.hp > 0), livingEnemy = units.some(u => u.side === 'enemy' && u.hp > 0);
  const state: BattleState = { format: 1, versions: { rules: 1, rng: 1, content: contentVersion(catalog) }, seed, rng: seedRng(seed), mapId: map.id,
    units, initiative: [1, 2, 3, 4], activeIndex: o.activeIndex ?? 0, round: 1,
    outcome: !livingPlayer ? 'playerLoss' : !livingEnemy ? 'playerWin' : 'ongoing', commandCount: 0 };
  return { catalog, state };
}
const attack = (unitId: number, targetId: number, ability = 'basic_attack') =>
  ({ type: 'useAbility' as const, unitId, abilityId: `ability:${ability}` as const, target: { unitId: targetId } });
function rolled(o: Setup, command = attack(1, 3)) {
  const { catalog, state } = setup(o);
  const result = resolveAttack(state, command, catalog);
  assert(result.ok, JSON.stringify(result));
  return result.events.find(e => e.type === 'attackRolled')!;
}
const dealt = (o: Setup) => {
  const { catalog, state } = setup(o);
  const result = resolveAttack(state, attack(1, 3), catalog); assert(result.ok);
  return result.events.find(e => e.type === 'damaged');
};

describe('d20 attack numbers (legacy CombatResolver.gd:1236-1260; test_combat_resolver.gd:66-155)', () => {
  it('hits when the total equals AC and misses one below', () => {
    expect(rolled({ natural: 10 })).toMatchObject({ natural: 10, bonus: 4, total: 14, armorClass: 14, result: 'hit' });
    expect(dealt({ natural: 10 })).toEqual({ type: 'damaged', unitId: 3, damage: 5, hp: 13 });
    expect(rolled({ natural: 9 })).toMatchObject({ natural: 9, total: 13, armorClass: 14, result: 'miss' });
    expect(dealt({ natural: 9 })).toBeUndefined();
  });
  it('makes natural 1 always miss and natural 20 always a doubled critical', () => {
    expect(rolled({ natural: 1, stats: { fighter: { accuracy: 20 }, goblin_grunt: { armorClass: 1 } } })).toMatchObject({ total: 21, armorClass: 1, result: 'miss' });
    expect(rolled({ natural: 20, stats: { fighter: { accuracy: -10 }, goblin_grunt: { armorClass: 30 } } })).toMatchObject({ total: 10, armorClass: 30, result: 'critical' });
    expect(dealt({ natural: 20, stats: { fighter: { accuracy: -10 }, goblin_grunt: { armorClass: 30 } } })).toMatchObject({ damage: 10, hp: 8 });
  });
  it('floors hit damage at 1 before a critical doubles it', () => {
    // Power below the content bounds, as in the legacy test; only #8 modifiers could reach this with real content.
    const weak = { fighter: { accuracy: 8, power: -5 }, goblin_grunt: { armorClass: 10 } };
    expect(dealt({ natural: 10, stats: weak })).toMatchObject({ damage: 1, hp: 17 });
    expect(dealt({ natural: 20, stats: weak })).toMatchObject({ damage: 2, hp: 16 });
  });
  it('adds exactly +2 from higher ground and -2 from lower ground (test_m4_height_attack.gd)', () => {
    const at = (attacker: number, target: number) => {
      const { catalog, state } = setup({ cells: [{ x: 1, y: 1, elevation: attacker }, { x: 2, y: 1, elevation: target }] });
      const preview = previewAttack(state, attack(1, 3), catalog); assert(preview.ok); return preview.bonus;
    };
    expect([at(2, 0), at(4, 0), at(0, 2), at(0, 4), at(3, 3)]).toEqual([6, 6, 2, 2, 4]);
    const legacy = (attacker: number, target: number) => rolled({ natural: 10, stats: { fighter: { accuracy: 0 }, goblin_grunt: { armorClass: 12 } },
      cells: [{ x: 1, y: 1, elevation: attacker }, { x: 2, y: 1, elevation: target }] });
    expect(legacy(2, 0)).toMatchObject({ bonus: 2, total: 12, result: 'hit' });
    expect(legacy(0, 2)).toMatchObject({ bonus: -2, total: 8, result: 'miss' });
  });
});

describe('attack legality (legacy TargetingService.gd:28-49)', () => {
  it('rejects in a fixed order, identically in preview and resolution, without change or RNG', () => {
    const cases: [Setup, ReturnType<typeof attack> | object, string][] = [
      [{ units: { 1: { hasActed: true } } }, attack(1, 3, 'fireball'), 'alreadyActed'],
      [{}, attack(1, 3, 'fireball'), 'unknownAbility'],
      [{}, { ...attack(1, 3, 'shortbow_shot'), target: { cell: { x: 2, y: 1 } } }, 'abilityNotOwned'],
      [{ activeIndex: 3 }, attack(4, 1, 'basic_attack'), 'abilityNotOwned'],
      [{ activeIndex: 2 }, attack(3, 1, 'shortbow_shot'), 'abilityNotOwned'],
      [{}, { ...attack(1, 3), target: { cell: { x: 2, y: 1 } } }, 'wrongTargetKind'],
      [{}, attack(1, 9), 'missingTarget'],
      [{ units: { 2: { hp: 0 } } }, attack(1, 2), 'targetDefeated'],
      [{ units: { 3: { hp: 0 } } }, attack(1, 3), 'targetDefeated'],
      [{}, attack(1, 2), 'sameSide'],
      [{}, attack(1, 1), 'sameSide'],
      [{}, attack(1, 4), 'outOfRange'],
      [{ units: { 3: { cell: { x: 2, y: 2 } } } }, attack(1, 3), 'outOfRange'],
      [{ activeIndex: 3, cells: [{ x: 1, y: 0, terrainId: 'forest' }] }, attack(4, 2, 'shortbow_shot'), 'outOfRange'],
      [{ activeIndex: 3, units: { 1: { cell: { x: 5, y: 1 } } } }, attack(4, 1, 'shortbow_shot'), 'outOfRange'],
      [{ activeIndex: 3, cells: [{ x: 3, y: 1, terrainId: 'forest' }] }, attack(4, 1, 'shortbow_shot'), 'blockedLos'],
      [{ units: { 2: { hp: 0 } } }, attack(2, 3), 'unitDefeated'],
      [{}, attack(2, 3), 'notActiveUnit'],
      [{}, { type: 'endTurn', unitId: 1 }, 'malformedCommand'],
    ];
    vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy'); });
    try {
      for (const [o, command, reason] of cases) {
        const { catalog, state } = setup(o); freeze(state); const before = JSON.stringify(state);
        expect(resolveAttack(state, command, catalog), `${reason} ${JSON.stringify(command)}`).toEqual({ ok: false, reason });
        expect(previewAttack(state, command, catalog)).toEqual({ ok: false, reason });
        expect(JSON.stringify(state)).toBe(before);
      }
    } finally { vi.restoreAllMocks(); }
  });
  it('accepts exactly the profile range, and units never block line of sight', () => {
    const shot = (fighter: CellPosition) => {
      const { catalog, state } = setup({ activeIndex: 3, units: { 1: { cell: fighter } } });
      return previewAttack(state, attack(4, 1, 'shortbow_shot'), catalog).ok;
    };
    // Archer at (4,1): distances 1, 2, 3, 4 and 5 against Shortbow Shot's range 2–4.
    expect([{ x: 3, y: 1 }, { x: 3, y: 2 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 2 }].map(shot)).toEqual([false, true, true, true, false]);
    const { catalog, state } = setup({ activeIndex: 3 }); // the grunt stands at (2,1), between the archer and the fighter
    expect(resolveAttack(state, attack(4, 1, 'shortbow_shot'), catalog).ok).toBe(true);
  });
  it('rejects exhausted command and RNG counters as invalid state instead of throwing', () => {
    const { catalog, state } = setup();
    expect(resolveAttack({ ...state, commandCount: Number.MAX_SAFE_INTEGER }, attack(1, 3), catalog)).toEqual({ ok: false, reason: 'invalidState' });
    const exhausted = { ...state, rng: { words: [state.rng.words[0], state.rng.words[1], state.rng.words[2], 12], cursor: Number.MAX_SAFE_INTEGER } };
    // One draw left, but that draw (2^32 - 9) falls in the rejection band, so the d20 needs a second draw.
    const redraw = { ...state, rng: { words: [0x100000000 - 20, 0, 0, 11], cursor: Number.MAX_SAFE_INTEGER - 1 } };
    for (const s of [exhausted, redraw]) {
      expect(readBattleState(s, catalog).ok).toBe(true);
      expect(resolveAttack(s, attack(1, 3), catalog)).toEqual({ ok: false, reason: 'invalidState' });
    }
    expect(resolveAttack({ ...redraw, rng: { ...redraw.rng, words: [0, 0, 0, 11] } }, attack(1, 3), catalog).ok).toBe(true);
  });
});

describe('attack resolution', () => {
  it('previews purely and resolves with one d20 from the snapshot RNG', () => {
    const { catalog, state } = setup({ natural: 10 }); freeze(state); const before = JSON.stringify(state);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('clock'); });
    try {
      const preview = previewAttack(state, attack(1, 3), catalog);
      expect(preview).toEqual({ ok: true, command: attack(1, 3), targetId: 3, bonus: 4, armorClass: 14, damage: 5, criticalDamage: 10 });
      const result = resolveAttack(state, attack(1, 3), catalog); assert(result.ok);
      expect(result.events).toEqual([
        { type: 'abilityUsed', unitId: 1, abilityId: 'ability:basic_attack', target: { unitId: 3 } },
        { type: 'attackRolled', unitId: 1, targetId: 3, natural: 10, bonus: 4, total: 14, armorClass: 14, result: 'hit' },
        { type: 'damaged', unitId: 3, damage: 5, hp: 13 },
      ]);
      expect(result.state).toEqual({ ...state, rng: rollDie(state.rng, 20).rng, commandCount: 1,
        units: state.units.map(u => u.id === 1 ? { ...u, hasActed: true } : u.id === 3 ? { ...u, hp: 13 } : u) });
      expect(readBattleState(result.state, catalog).ok).toBe(true);
      expect(JSON.stringify(state)).toBe(before);
    } finally { vi.restoreAllMocks(); }
  });
  it('allows one move and one action in either order', () => {
    const { catalog, state } = setup({ natural: 9 });
    const attacked = resolveAttack(state, attack(1, 3), catalog); assert(attacked.ok);
    expect(attacked.events.map(e => e.type)).toEqual(['abilityUsed', 'attackRolled']);
    const moved = moveUnit(attacked.state, { type: 'move', unitId: 1, to: { x: 1, y: 2 } }, catalog); assert(moved.ok);
    expect(moved.state.units[0]).toMatchObject({ hasMoved: true, hasActed: true });
    expect(resolveAttack(moved.state, attack(1, 3), catalog)).toEqual({ ok: false, reason: 'alreadyActed' });
    const first = moveUnit(state, { type: 'move', unitId: 1, to: { x: 2, y: 2 } }, catalog); assert(first.ok);
    const then = resolveAttack(first.state, attack(1, 3), catalog); assert(then.ok);
    expect(then.state.units[0]).toMatchObject({ cell: { x: 2, y: 2 }, hasMoved: true, hasActed: true });
  });
});

describe('defeat and outcome (legacy CombatResolver.gd:1188-1194; BattleController.gd:1910-1930)', () => {
  it('defeats once, frees the cell, and skips the defeated unit in turn order', () => {
    const { catalog, state } = setup({ natural: 10, units: { 3: { hp: 3 } } });
    const ranger = { type: 'move' as const, unitId: 2, to: { x: 2, y: 1 } };
    expect(moveUnit({ ...state, activeIndex: 1 }, ranger, catalog)).toEqual({ ok: false, reason: 'occupied' });
    const hit = resolveAttack(state, attack(1, 3), catalog); assert(hit.ok);
    expect(hit.events.slice(2)).toEqual([{ type: 'damaged', unitId: 3, damage: 5, hp: 0 }, { type: 'defeated', unitId: 3 }]);
    expect(hit.state).toMatchObject({ outcome: 'ongoing', activeIndex: 0 });
    const rangerTurn = endTurn(hit.state, { type: 'endTurn', unitId: 1 }, catalog); assert(rangerTurn.ok);
    expect(resolveAttack(rangerTurn.state, attack(2, 3), catalog)).toEqual({ ok: false, reason: 'targetDefeated' });
    const moved = moveUnit(rangerTurn.state, ranger, catalog); assert(moved.ok);
    const archerTurn = endTurn(moved.state, { type: 'endTurn', unitId: 2 }, catalog); assert(archerTurn.ok);
    expect(archerTurn.state.activeIndex).toBe(3);
    expect(archerTurn.events[1]).toEqual({ type: 'turnStarted', unitId: 4, round: 1 });
  });
  it('ends the battle once when the last enemy falls, then rejects every command', () => {
    const { catalog, state } = setup({ natural: 20, units: { 3: { hp: 7 }, 4: { hp: 0 } } });
    const win = resolveAttack(state, attack(1, 3), catalog); assert(win.ok);
    expect(win.events.slice(2)).toEqual([{ type: 'damaged', unitId: 3, damage: 10, hp: 0 }, { type: 'defeated', unitId: 3 }, { type: 'battleEnded', outcome: 'playerWin' }]);
    expect(win.state).toMatchObject({ outcome: 'playerWin', activeIndex: 0 });
    expect(readBattleState(win.state, catalog).ok).toBe(true);
    for (const result of [endTurn(win.state, { type: 'endTurn', unitId: 1 }, catalog), moveUnit(win.state, { type: 'move', unitId: 1, to: { x: 1, y: 2 } }, catalog),
      resolveAttack(win.state, attack(1, 3), catalog), previewAttack(win.state, attack(1, 3), catalog)])
      expect(result).toEqual({ ok: false, reason: 'battleOver' });
  });
  it('gives the enemy side the win when the last player falls', () => {
    const { catalog, state } = setup({ natural: 10, activeIndex: 2, units: { 1: { hp: 5 }, 2: { hp: 0 } } });
    const loss = resolveAttack(state, attack(3, 1), catalog); assert(loss.ok);
    expect(loss.events.slice(2)).toEqual([{ type: 'damaged', unitId: 1, damage: 5, hp: 0 }, { type: 'defeated', unitId: 1 }, { type: 'battleEnded', outcome: 'playerLoss' }]);
    expect(loss.state.outcome).toBe('playerLoss');
    expect(readBattleState(loss.state, catalog).ok).toBe(true);
  });
});
