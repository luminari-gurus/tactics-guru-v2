import { assert, describe, expect, it } from 'vitest';
import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog } from '../../src/content/catalog';
import type { AbilityId, ContentCatalog, MapRecord } from '../../src/content/types';
import { rollDie, seedRng } from '../../src/domain/rng';
import { decodeBattleSave, encodeBattleSave } from '../../src/domain/saveEnvelope';
import { createBattle, dispatch, replayBattle } from '../../src/domain/turns';
import type { BattleEvent, BattleState, Command } from '../../src/domain/types';
import { criticalImpacts, drawCriticalImpact } from '../../src/phaser/criticalImpact';
import { playerDecision } from '../helpers/battlePolicy';
import { catalogFixture } from './fixtures/contentContract';

const map: MapRecord = {
  id: 'map:critical_impact', width: 8, height: 5,
  cells: Array.from({ length: 40 }, (_, i) => ({ x: i % 8, y: Math.floor(i / 8), elevation: 0, terrainId: 'grass' })),
  spawns: [
    { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 3 },
    { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 3 },
    { id: 3, side: 'heroes', unitId: 'mage', x: 2, y: 3 },
    { id: 4, side: 'enemies', unitId: 'goblin_grunt', x: 3, y: 3 },
    { id: 5, side: 'enemies', unitId: 'goblin_archer', x: 4, y: 3 },
    { id: 6, side: 'enemies', unitId: 'goblin_shaman', x: 5, y: 3 },
  ],
};
const catalog: ContentCatalog = { ...catalogFixture, maps: { [map.id]: map } };
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function rngFor(natural: number) {
  for (let seed = 0; ; seed++) {
    const rng = seedRng(seed);
    if (rollDie(rng, 20).value === natural) return rng;
  }
}
function fixture(actorId = 1, targetId = 4, distance = 1, natural = 20, lethal = false, final = false): BattleState {
  const created = createBattle(map.id, 17, catalog); assert(created.ok);
  const actor = created.state.units.find(unit => unit.id === actorId)!;
  return freeze({ ...created.state, activeIndex: created.state.initiative.indexOf(actorId), rng: rngFor(natural),
    units: created.state.units.map(unit => ({ ...unit,
      cell: unit.id === actorId ? { x: 1, y: 1 } : unit.id === targetId ? { x: 1 + distance, y: 1 } : unit.cell,
      hp: unit.id === targetId && lethal ? 1 : final && unit.side !== actor.side && unit.id !== targetId ? 0 : unit.hp,
    })),
  });
}
const command = (unitId: number, targetId: number, abilityId: AbilityId = 'ability:basic_attack'): Command =>
  ({ type: 'useAbility', unitId, abilityId, target: { unitId: targetId } });
const roll = (unitId: number, targetId: number, result: 'critical' | 'hit' | 'miss', natural = 20): BattleEvent =>
  ({ type: 'attackRolled', unitId, targetId, result, natural, bonus: 4, total: natural + 4, armorClass: 14 });

describe('resolved critical impact presentation', () => {
  it('keeps reduced-motion geometry and opacity stationary throughout the impact', () => {
    const capture = (progress: number, reducedMotion: boolean) => {
      const calls: unknown[][] = [];
      const graphics = new Proxy({}, { get: (_target, method) => (...args: unknown[]) => {
        calls.push([method, ...args]); return graphics;
      } });
      drawCriticalImpact(graphics as Parameters<typeof drawCriticalImpact>[0], { x: 74, y: -28 }, progress, 1.2, reducedMotion);
      return calls;
    };
    const stationary = capture(0, true);
    expect(stationary.length).toBeGreaterThan(0);
    for (const progress of [0.25, 0.8, 1]) expect(capture(progress, true)).toEqual(stationary);
    expect(capture(0, false)).not.toEqual(capture(0.8, false));
  });

  it('uses the authoritative result, never the natural roll, damage, defeat, or a non-attack roll', () => {
    const events: BattleEvent[] = [
      roll(1, 4, 'hit'), roll(5, 2, 'miss'),
      { type: 'damaged', unitId: 4, damage: 10, hp: 0 }, { type: 'defeated', unitId: 4 },
      { type: 'missileRolled', unitId: 3, targetId: 5, missile: 1, natural: 4, damage: 5 },
      { type: 'initiativeRolled', unitId: 1, natural: 20, total: 24 },
      { type: 'saveRolled', unitId: 2, natural: 20, modifier: 1, total: 21, dc: 12, saved: true },
    ];
    expect(criticalImpacts(freeze(events))).toEqual([]);
    // Deliberately inconsistent raw numbers demonstrate that the presentation does not reroll or reclassify.
    expect(criticalImpacts([roll(1, 4, 'critical', 1)])).toEqual([{ actorId: 1, targetId: 4 }]);
    expect(criticalImpacts([])).toEqual([]);
  });

  it('preserves one impact per resolved critical, including consecutive attacks on the same target', () => {
    const events = freeze([roll(1, 4, 'critical'), roll(2, 4, 'critical'), roll(5, 1, 'critical')]);
    const expected = [{ actorId: 1, targetId: 4 }, { actorId: 2, targetId: 4 }, { actorId: 5, targetId: 1 }];
    expect(criticalImpacts(events)).toEqual(expected);
    expect(criticalImpacts(events)).toEqual(expected);
    expect(criticalImpacts([roll(1, 4, 'hit')])).toEqual([]);
  });

  const attacks = Object.values(catalog.abilities)
    .filter(ability => ability.kind === 'attack' || ability.kind === 'guardedAttack')
    .flatMap(ability => ability.owners.map(owner => ({ abilityId: ability.id, owner,
      actorId: map.spawns.find(spawn => spawn.unitId === owner)!.id, distance: ability.rangeMin })));

  it.each(attacks)('presents actual $owner $abilityId results without altering accepted state, saves, or RNG', ({ actorId, abilityId, distance }) => {
    const targetId = actorId <= 3 ? 4 : 1;
    for (const natural of [1, 12, 20]) {
      const before = fixture(actorId, targetId, distance, natural);
      const result = dispatch(before, command(actorId, targetId, abilityId), catalog); assert(result.ok);
      freeze(result);
      const copy = structuredClone(result), save = encodeBattleSave(result.state, catalog), next = rollDie(result.state.rng, 20);
      expect(criticalImpacts(result.events)).toEqual(natural === 20 ? [{ actorId, targetId }] : []);
      expect(criticalImpacts(result.events)).toEqual(natural === 20 ? [{ actorId, targetId }] : []);
      expect(result).toEqual(copy);
      expect(encodeBattleSave(result.state, catalog)).toEqual(save);
      expect(rollDie(result.state.rng, 20)).toEqual(next);
    }
  });

  it.each([
    [3, 4, 'ability:magic_missile', 2], [1, 1, 'ability:second_wind', 0],
    [1, 4, 'ability:taunt', 1], [2, 4, 'ability:mark_target', 2],
    [2, 4, 'ability:pinning_shot', 2], [3, 4, 'ability:frost_snare', 2],
    [6, 1, 'ability:weakening_hex', 2], [6, 4, 'ability:heal_goblin', 2],
  ] as const)('retains non-critical eligibility for unit %i target %i %s', (actorId, targetId, abilityId, distance) => {
    const before = fixture(actorId, targetId, distance, 20, true);
    const result = dispatch(before, command(actorId, targetId, abilityId), catalog); assert(result.ok);
    expect(result.events.some(event => event.type === 'attackRolled')).toBe(false);
    expect(criticalImpacts(freeze(result.events))).toEqual([]);
  });

  it.each([false, true])('keeps a lethal player critical exactly once through completion, save and resume (final: %s)', final => {
    const before = fixture(1, 4, 1, 20, true, final);
    const session = new BattleSession(catalog, before, before.seed);
    const accepted = command(1, 4), direct = dispatch(before, accepted, catalog); assert(direct.ok);

    expect(session.preview(accepted).ok).toBe(true);
    expect(session.prepare(command(1, 1)).ok).toBe(false);
    expect(session.confirm()).toBeNull();
    expect(criticalImpacts(session.events)).toEqual([]);
    expect(session.state).toEqual(before);
    expect(session.prepare(accepted).ok).toBe(true);
    expect(criticalImpacts(session.events)).toEqual([]);

    const step = session.confirm(); assert(step);
    expect(criticalImpacts(step.events)).toEqual([{ actorId: 1, targetId: 4 }]);
    expect(step.events).toContainEqual({ type: 'defeated', unitId: 4 });
    expect(step.after).toEqual(direct.state);
    expect(session.phase).toBe('presenting');
    expect(session.confirm()).toBeNull();
    expect(session.nextEnemy()).toBeNull();
    expect(session.continuation!.commands).toEqual([accepted]);

    const save = encodeBattleSave(session.state, catalog); assert(save.ok);
    const restored = decodeBattleSave(save.text, catalog); assert(restored.ok);
    const resumed = BattleSession.fromSnapshot(catalog, restored.state); assert(resumed.ok);
    expect(criticalImpacts(resumed.session.events)).toEqual([]);
    expect(resumed.session.phase).not.toBe('presenting');
    expect(resumed.session.state).toEqual(step.after);

    session.finishPresentation(step.token + 1);
    expect(session.phase).toBe('presenting');
    session.finishPresentation(step.token);
    session.finishPresentation(step.token);
    expect(session.phase).toBe(final ? 'ended' : 'player');
    expect(session.state).toEqual(direct.state);
    expect(session.events).toEqual(direct.events);
    expect(session.continuation!.events).toEqual(direct.events);
  });

  it('leaves a complete legal battle replay and its accepted critical results unchanged', () => {
    const session = new BattleSession(battleCatalog, 'map:forest_ruins', 1);
    let criticalCount = 0;
    for (let i = 0; i < 300 && !['ended', 'error'].includes(session.phase); i++) {
      if (session.phase === 'player') {
        expect(session.prepare(playerDecision(session.state, battleCatalog)).ok).toBe(true);
      }
      const step = session.phase === 'enemy' ? session.nextEnemy() : session.confirm(); assert(step);
      const before = structuredClone(step), record = session.replay;
      criticalCount += criticalImpacts(step.events).length;
      expect(criticalImpacts(step.events)).toHaveLength(step.events.filter(event => event.type === 'attackRolled' && event.result === 'critical').length);
      expect(step).toEqual(before);
      expect(session.replay).toEqual(record);
      session.finishPresentation(step.token);
    }
    expect(session.phase).toBe('ended');
    expect(criticalCount).toBeGreaterThan(0);
    expect(replayBattle(session.replay, battleCatalog)).toEqual({ ok: true, state: session.state, events: session.events });
  });

  it('presents an enemy critical once and ignores completion after disposal', () => {
    const initial = fixture(4, 1), before = freeze({ ...initial,
      units: initial.units.map(unit => unit.id === 4 ? { ...unit, hasMoved: true } : unit),
    });
    const session = new BattleSession(catalog, before, before.seed, undefined, true);
    expect(session.phase).toBe('enemy');
    const step = session.nextEnemy(); assert(step);
    expect(criticalImpacts(step.events)).toEqual([{ actorId: 4, targetId: 1 }]);
    expect(session.nextEnemy()).toBeNull();
    const state = session.state, replay = session.replay;
    session.dispose();
    session.finishPresentation(step.token);
    expect(session.phase).toBe('disposed');
    expect(session.state).toBe(state);
    expect(session.replay).toEqual(replay);
    expect(session.nextEnemy()).toBeNull();
  });
});
