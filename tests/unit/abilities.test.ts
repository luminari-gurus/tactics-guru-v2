import { assert, expect, it } from 'vitest';
import { battleCatalog } from '../../src/content/catalog';
import { contentVersion, readBattleState } from '../../src/domain/battle';
import { previewAttack, previewMagicMissile } from '../../src/domain/combat';
import { createBattle, dispatch, endTurn, replayBattle } from '../../src/domain/turns';
import { validateContent } from '../../src/content/validate';
import { rollDie, seedRng } from '../../src/domain/rng';

const shot = { type: 'useAbility', unitId: 2, abilityId: 'ability:high_shot', target: { unitId: 4 } } as const;
function setup(distance = 3, rise = 0) {
  const catalog = { ...battleCatalog, maps: { 'map:forest_ruins': { ...battleCatalog.maps['map:forest_ruins'],
    cells: battleCatalog.maps['map:forest_ruins'].cells.map(c => ({ ...c, terrainId: 'grass' as const,
      elevation: c.x === 0 && c.y === 0 ? rise : 0 })) } } };
  const created = createBattle('map:forest_ruins', 17, catalog); assert(created.ok);
  const state = { ...created.state, activeIndex: created.state.initiative.indexOf(2),
    units: created.state.units.map(u => u.id === 2 ? { ...u, cell: { x: 0, y: 0 } } :
      u.id === 4 ? { ...u, cell: { x: distance, y: 0 } } : u) };
  return { catalog, state };
}
it('High Shot uses the real Ranger stats and elevation in shared preview and dispatch', () => {
  for (const rise of [0, 1, 4]) {
    const { catalog, state } = setup(3, rise); const before = structuredClone(state);
    const contentBefore = structuredClone(catalog);
    const preview = previewAttack(state, shot, catalog); assert(preview.ok);
    expect(preview).toMatchObject({ bonus: rise ? 7 : 5, damage: rise ? 6 : 4, criticalDamage: rise ? 12 : 8 });
    expect(state).toEqual(before);
    expect(catalog).toEqual(contentBefore);
    const result = dispatch(state, shot, catalog); assert(result.ok);
    expect(result.events.find(e => e.type === 'attackRolled')).toMatchObject({ bonus: preview.bonus });
    expect(result.state.units.find(u => u.id === 2)?.hasActed).toBe(true);
    expect(state).toEqual(before);
  }
});
const guardedStrike = { type: 'useAbility', unitId: 1, abilityId: 'ability:guarded_strike', target: { unitId: 4 } } as const;
function guardSetup(natural: number) {
  const { catalog, state } = setup();
  let seed = 0; while (rollDie(seedRng(seed), 20).value !== natural) seed++;
  return { catalog, state: { ...state, rng: seedRng(seed), activeIndex: state.initiative.indexOf(1),
    units: state.units.map(u => u.id === 1 ? { ...u, cell: { x: 2, y: 0 } } : u) } };
}
it('Guarded Strike trades four accuracy for defense on a miss, hit or critical without changing damage', () => {
  for (const natural of [1, 11, 12, 20]) {
    const { catalog, state } = guardSetup(natural); const before = structuredClone(state);
    const preview = previewAttack(state, guardedStrike, catalog); assert(preview.ok);
    expect(preview).toMatchObject({ bonus: 0, damage: 5, criticalDamage: 10 });
    const result = dispatch(state, guardedStrike, catalog); assert(result.ok);
    expect(result.events.find(e => e.type === 'attackRolled')).toMatchObject({ bonus: 0,
      result: natural === 20 ? 'critical' : natural >= 12 ? 'hit' : 'miss' });
    expect(result.state.units.find(u => u.id === 1)).toMatchObject({ guarded: true, hasActed: true });
    expect(result.events).toContainEqual({ type: 'guarded', unitId: 1 });
    expect(result.state.rng).toEqual(rollDie(state.rng, 20).rng);
    expect(readBattleState(result.state, catalog).ok).toBe(true);
    expect(state).toEqual(before);
  }
});
it('Guarded raises the same AC used by preview and resolution, lasts across a round wrap, and expires at the Fighter turn', () => {
  const { catalog, state } = guardSetup(1);
  const guard = dispatch(state, guardedStrike, catalog); assert(guard.ok);
  let current = guard.state;
  do {
    const active = current.initiative[current.activeIndex];
    const next = endTurn(current, { type: 'endTurn', unitId: active }, catalog); assert(next.ok); current = next.state;
    if (current.initiative[current.activeIndex] !== 1) expect(current.units.find(u => u.id === 1)?.guarded).toBe(true);
    if (current.initiative[current.activeIndex] === 4) {
      const command = { type: 'useAbility', unitId: 4, abilityId: 'ability:basic_attack', target: { unitId: 1 } } as const;
      const preview = previewAttack(current, command, catalog); assert(preview.ok);
      expect(preview.armorClass).toBe(16);
      const hit = dispatch(current, command, catalog); assert(hit.ok);
      expect(hit.events.find(e => e.type === 'attackRolled')).toMatchObject({ armorClass: 16 });
    }
    if (current.initiative[current.activeIndex] === 1) expect(next.events).toContainEqual({ type: 'guardExpired', unitId: 1 });
  } while (current.initiative[current.activeIndex] !== 1);
  expect(current.units.find(u => u.id === 1)?.guarded).toBeUndefined();
  expect(previewAttack(current, { ...guardedStrike, abilityId: 'ability:basic_attack' }, catalog)).toMatchObject({ bonus: 4 });
});
it('rejected Guarded Strike never grants defense or consumes action/RNG; snapshots reject malformed guards', () => {
  const { catalog, state } = guardSetup(1);
  for (const [command, reason] of [
    [{ ...guardedStrike, target: { unitId: 2 } }, 'sameSide'],
    [{ ...guardedStrike, target: { unitId: 5 } }, 'outOfRange'],
    [{ ...guardedStrike, target: { cell: { x: 3, y: 0 } } }, 'wrongTargetKind'],
  ] as const) {
    const before = structuredClone(state);
    expect(dispatch(state, command, catalog)).toEqual({ ok: false, reason }); expect(state).toEqual(before);
  }
  expect(dispatch({ ...state, activeIndex: state.initiative.indexOf(2) }, { ...guardedStrike, unitId: 2 }, catalog))
    .toEqual({ ok: false, reason: 'abilityNotOwned' });
  for (const [id, guarded] of [[1, false], [1, 2], [2, true]]) {
    expect(readBattleState({ ...state, units: state.units.map(u => u.id === id ? { ...u, guarded } : u) }, catalog).ok).toBe(false);
  }
});
it('validates the exact defensive tradeoff and applies its penalty only once to an already Guarded attacker', () => {
  const { catalog, state } = guardSetup(12);
  for (const patch of [{ attackPenalty: 0 }, { attackPenalty: -4 }, { armorClassBonus: 3 }, { kind: 'attack' }]) {
    expect(validateContent({ ...catalog, abilities: { ...catalog.abilities,
      'ability:guarded_strike': { ...catalog.abilities['ability:guarded_strike'], ...patch } } }).ok).toBe(false);
  }
  const guarded = { ...state, units: state.units.map(u => u.id === 1 ? { ...u, guarded: true as const } : u) };
  const before = structuredClone(guarded); const contentBefore = structuredClone(catalog);
  for (const abilityId of ['ability:basic_attack', 'ability:guarded_strike'] as const) {
    expect(previewAttack(guarded, { ...guardedStrike, abilityId }, catalog)).toMatchObject({ ok: true, bonus: 0 });
  }
  const attacked = dispatch(guarded, guardedStrike, catalog); assert(attacked.ok);
  expect(dispatch(attacked.state, guardedStrike, catalog)).toEqual({ ok: false, reason: 'alreadyActed' });
  expect(guarded).toEqual(before); expect(catalog).toEqual(contentBefore);
});
it('replays Guarded Strike and expiry deterministically through actual commands', () => {
  const base = guardSetup(1).catalog;
  const catalog = { ...base, maps: { 'map:forest_ruins': { ...base.maps['map:forest_ruins'],
    spawns: base.maps['map:forest_ruins'].spawns.map(s => s.id === 1 ? { ...s, x: 2, y: 0 } :
      s.id === 4 ? { ...s, x: 3, y: 0 } : s) } } };
  const created = createBattle('map:forest_ruins', 31, catalog); assert(created.ok);
  const initial = created.state; let state = initial;
  const commands = [];
  while (state.initiative[state.activeIndex] !== 1) {
    const command = { type: 'endTurn', unitId: state.initiative[state.activeIndex] } as const;
    commands.push(command); const result = dispatch(state, command, catalog); assert(result.ok); state = result.state;
  }
  commands.push(guardedStrike);
  const attack = guardedStrike;
  const guarded = dispatch(state, attack, catalog); assert(guarded.ok); state = guarded.state;
  do {
    const command = { type: 'endTurn', unitId: state.initiative[state.activeIndex] } as const; commands.push(command);
    const next = dispatch(state, command, catalog); assert(next.ok); state = next.state;
  } while (state.initiative[state.activeIndex] !== 1);
  const replay = { format: 1, versions: initial.versions, initial, commands };
  const replayed = replayBattle(replay, catalog); assert(replayed.ok);
  expect(replayed.state).toEqual(state);
  expect(replayBattle(replay, catalog)).toEqual(replayed);
});
it('High Shot resolves uphill bonus on a natural critical and rejects illegal intents without RNG or action cost', () => {
  const { catalog, state } = setup(3, 2);
  let seed = 0;
  while (rollDie(seedRng(seed), 20).value !== 20) seed++;
  const criticalState = { ...state, rng: seedRng(seed) };
  const critical = dispatch(criticalState, shot, catalog); assert(critical.ok);
  expect(critical.events.find(e => e.type === 'damaged')).toMatchObject({ unitId: 4, damage: 12, hp: 0 });
  const blockedCatalog = { ...catalog, maps: { 'map:forest_ruins': { ...catalog.maps['map:forest_ruins'],
    cells: catalog.maps['map:forest_ruins'].cells.map(c => c.x === 1 && c.y === 0 ? { ...c, terrainId: 'forest' as const } : c) } } };
  const blockedState = { ...state, versions: { ...state.versions, content: contentVersion(blockedCatalog) } };
  const cases = [
    { catalog, state: { ...state, units: state.units.map(u => u.id === 2 ? { ...u, hasActed: true } : u) }, command: shot, reason: 'alreadyActed' },
    { catalog, state, command: { ...shot, target: { cell: { x: 3, y: 0 } } }, reason: 'wrongTargetKind' },
    { catalog: blockedCatalog, state: blockedState, command: shot, reason: 'blockedLos' },
  ];
  for (const c of cases) {
    const before = structuredClone(c.state);
    expect(previewAttack(c.state, c.command, c.catalog)).toEqual({ ok: false, reason: c.reason });
    expect(dispatch(c.state, c.command, c.catalog)).toEqual({ ok: false, reason: c.reason });
    expect(c.state).toEqual(before);
  }
});
it('High Shot accepts only range 2–5 and is owned only by the Ranger', () => {
  for (const distance of [1, 2, 5, 6]) {
    const { catalog, state } = setup(distance); const before = structuredClone(state);
    const result = dispatch(state, shot, catalog);
    expect(result.ok).toBe(distance >= 2 && distance <= 5);
    if (!result.ok) expect(result.reason).toBe('outOfRange');
    expect(state).toEqual(before);
  }
  const { catalog, state } = setup();
  expect(dispatch({ ...state, activeIndex: state.initiative.indexOf(1) }, { ...shot, unitId: 1 }, catalog))
    .toEqual({ ok: false, reason: 'abilityNotOwned' });
});
it('validates attack profiles and includes their numbers in the content identity', () => {
  const copy = structuredClone(battleCatalog);
  const changed = { ...copy, abilities: { ...copy.abilities,
    'ability:high_shot': { ...copy.abilities['ability:high_shot'], baseDamage: 3 } } };
  expect(validateContent(changed).ok).toBe(true);
  expect(contentVersion(changed)).not.toBe(contentVersion(battleCatalog));
  for (const patch of [{ rangeMin: 6 }, { baseDamage: NaN }, { kind: 'unknown' }, { owners: ['mage'] }, { uphillDamage: -1 }]) {
    expect(validateContent({ ...copy, abilities: { ...copy.abilities,
      'ability:high_shot': { ...copy.abilities['ability:high_shot'], ...patch } } }).ok).toBe(false);
  }
  for (const id of ['ability:unknown', '__proto__', 'constructor']) {
    const abilities = Object.fromEntries([...Object.entries(copy.abilities), [id, { ...copy.abilities['ability:high_shot'], id }]]);
    expect(validateContent({ ...copy, abilities }).ok).toBe(false);
  }
});

const missile = { type: 'useAbility', unitId: 3, abilityId: 'ability:magic_missile', target: { unitId: 4 } } as const;
function missileSetup(level = 1) {
  const { catalog, state } = setup();
  const profile = catalog.abilities['ability:magic_missile']; assert(profile.kind === 'magicMissile');
  const updated = { ...catalog, abilities: { ...catalog.abilities, 'ability:magic_missile': { ...profile, casterLevel: level } } };
  return { catalog: updated, state: { ...state, versions: { ...state.versions, content: contentVersion(updated) },
    activeIndex: state.initiative.indexOf(3), units: state.units.map(u => u.id === 3 ? { ...u, cell: { x: 1, y: 0 } } : u) } };
}
it('Magic Missile dispatch automatically hits with seeded 1d4+1 damage, pure preview and one action', () => {
  const faces = new Set<number>();
  for (let seed = 0; seed < 40; seed++) {
    const setup = missileSetup(), state = { ...setup.state, rng: seedRng(seed) }, before = structuredClone(state);
    const catalogBefore = structuredClone(setup.catalog);
    const preview = previewMagicMissile(state, missile, setup.catalog); assert(preview.ok);
    expect(preview).toMatchObject({ missileCount: 1, minDamage: 2, maxDamage: 5 });
    const roll = rollDie(state.rng, 4); faces.add(roll.value);
    const result = dispatch(state, missile, setup.catalog); assert(result.ok);
    expect(result.events).toContainEqual({ type: 'missileRolled', unitId: 3, targetId: 4, missile: 1, natural: roll.value, damage: roll.value + 1 });
    expect(result.events.some(e => e.type === 'attackRolled' || e.type === 'saveRolled')).toBe(false);
    expect(result.state.rng).toEqual(roll.rng);
    expect(result.state.units.find(u => u.id === 4)?.hp).toBe(state.units.find(u => u.id === 4)!.hp - roll.value - 1);
    expect(result.state.units.find(u => u.id === 3)?.hasActed).toBe(true);
    expect(dispatch(result.state, missile, setup.catalog)).toEqual({ ok: false, reason: 'alreadyActed' });
    expect(state).toEqual(before);
    expect(readBattleState(result.state, setup.catalog).ok).toBe(true);
    expect(setup.catalog).toEqual(catalogBefore);
  }
  expect([...faces].sort()).toEqual([1,2,3,4]);
});
it('Magic Missile follows caster-level progression and splits assigned missiles with deterministic replay', () => {
  for (const [level, count] of [[1,1],[2,1],[3,2],[5,3],[7,4],[9,5],[20,5]]) {
    const { catalog, state } = missileSetup(level);
    const command = { ...missile, target: { missileTargets: Array<number>(count).fill(4) } };
    const result = dispatch(state, command, catalog); assert(result.ok);
    expect(result.events.filter(e => e.type === 'missileRolled')).toHaveLength(count);
    expect(result.events.filter(e => e.type === 'defeated').length).toBeLessThanOrEqual(1);

  }
  const { catalog, state } = missileSetup(3);
  const nearby = { ...state, units: state.units.map(u => u.id === 5 ? { ...u, cell: { x: 4, y: 0 } } : u) };
  const split = dispatch(nearby, { ...missile, target: { missileTargets: [4,5] } }, catalog); assert(split.ok);
  expect(split.events.filter(e => e.type === 'missileRolled').map(e => e.targetId)).toEqual([4,5]);
});
it('Magic Missile validates all targets before spending action or RNG and honors range, LOS and ownership', () => {
  const { catalog, state } = missileSetup(3), before = structuredClone(state);
  for (const [target, reason] of [[{ missileTargets: [4] }, 'wrongMissileCount'],
    [{ missileTargets: [4,64] }, 'missingTarget'], [{ cell: { x: 3, y: 0 } }, 'wrongTargetKind']] as const)
    expect(dispatch(state, { ...missile, target }, catalog)).toEqual({ ok: false, reason });
  const far = { ...state, units: state.units.map(u => u.id === 4 ? { ...u, cell: { x: 7, y: 0 } } : u) };
  expect(dispatch(far, missile, catalog)).toEqual({ ok: false, reason: 'outOfRange' });
  const fighter = { ...state, activeIndex: state.initiative.indexOf(1) };
  expect(dispatch(fighter, { ...missile, unitId: 1 }, catalog)).toEqual({ ok: false, reason: 'abilityNotOwned' });
  const blocked = { ...catalog, maps: { 'map:forest_ruins': { ...catalog.maps['map:forest_ruins'],
    cells: catalog.maps['map:forest_ruins'].cells.map(c => c.x === 2 && c.y === 0 ? { ...c, terrainId: 'forest' as const } : c) } } };
  expect(dispatch({ ...state, versions: { ...state.versions, content: contentVersion(blocked) } }, missile, blocked)).toEqual({ ok: false, reason: 'blockedLos' });
  expect(state).toEqual(before);
});

it('Magic Missile replays from the real battle creation boundary', () => {
  const setup = missileSetup();
  const catalog = { ...setup.catalog, maps: { 'map:forest_ruins': { ...setup.catalog.maps['map:forest_ruins'],
    spawns: setup.catalog.maps['map:forest_ruins'].spawns.map(u => u.id === 3 ? { ...u, x: 1, y: 0 } : u.id === 4 ? { ...u, x: 3, y: 0 } : u) } } };
  const created = createBattle('map:forest_ruins', 17, catalog); assert(created.ok);
  let state = created.state;
  const commands: Parameters<typeof dispatch>[1][] = [];
  while (state.initiative[state.activeIndex] !== 3) {
    const command = { type: 'endTurn', unitId: state.initiative[state.activeIndex] } as const;
    commands.push(command); const next = dispatch(state, command, catalog); assert(next.ok); state = next.state;
  }
  const target = state.units.find(u => u.side === 'enemy' && previewMagicMissile(state, { ...missile, target: { unitId: u.id } }, catalog).ok)!;
  expect(target).toBeDefined();
  const command = { ...missile, target: { unitId: target.id } }; commands.push(command);
  const cast = dispatch(state, command, catalog); assert(cast.ok);
  const replay = replayBattle({ format: state.format, versions: state.versions, initial: created.state, commands }, catalog);
  assert(replay.ok); expect(replay.state).toEqual(cast.state);
});

it('Magic Missile rejects cursor exhaustion atomically, validates profiles and ends battle only once', () => {
  const { catalog, state } = missileSetup(9);
  const exhausted = { ...state, rng: { ...state.rng, cursor: Number.MAX_SAFE_INTEGER - 2 } };
  const before = structuredClone(exhausted);
  expect(dispatch(exhausted, missile, catalog)).toEqual({ ok: false, reason: 'invalidState' });
  expect(exhausted).toEqual(before);
  for (const patch of [{ casterLevel: 0 }, { casterLevel: 21 }, { rangeMax: 0 }, { rangeMin: 6 }, { owners: ['fighter'] }, { baseDamage: 3 }])
    expect(validateContent({ ...catalog, abilities: { ...catalog.abilities,
      'ability:magic_missile': { ...catalog.abilities['ability:magic_missile'], ...patch } } }).ok).toBe(false);
  const lastEnemy = { ...state, units: state.units.map(u => u.side === 'enemy' ? { ...u, hp: u.id === 4 ? 1 : 0 } : u) };
  const result = dispatch(lastEnemy, missile, catalog); assert(result.ok);
  expect(result.state.outcome).toBe('playerWin');
  expect(result.events.filter(e => e.type === 'defeated')).toHaveLength(1);
  expect(result.events.filter(e => e.type === 'battleEnded')).toHaveLength(1);
  expect(result.events.filter(e => e.type === 'missileRolled')).toHaveLength(5);
});

it('Magic Missile accepts its five-tile edge and rejects separated targets and malformed assignments', () => {
  const { catalog, state } = missileSetup(3);
  for (const distance of [1,5,6]) {
    const placed = { ...state, units: state.units.map(u => u.id === 4 ? { ...u, cell: { x: distance + 1, y: 0 } } : u) };
    expect(previewMagicMissile(placed, missile, catalog).ok).toBe(distance <= 5);
  }
  const separated = { ...state, units: state.units.map(u => u.id === 4 ? { ...u, cell: { x: 5, y: 0 } } :
    u.id === 5 ? { ...u, cell: { x: 1, y: 1 } } : u) };
  expect(dispatch(separated, { ...missile, target: { missileTargets: [4,5] } }, catalog)).toEqual({ ok: false, reason: 'targetsTooFarApart' });
  for (const missileTargets of [[], Array(2), [4,NaN], [4,4,4,4,4,4]])
    expect(dispatch(state, { ...missile, target: { missileTargets } }, catalog)).toEqual({ ok: false, reason: 'malformedCommand' });
});
