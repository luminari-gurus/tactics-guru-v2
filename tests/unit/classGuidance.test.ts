import { assert, describe, expect, it, vi } from 'vitest';
import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog } from '../../src/content/catalog';
import { HERO_IDS, MAGIC_MISSILE } from '../../src/content/constants';
import type { AbilityId, ContentCatalog, HeroId } from '../../src/content/types';
import { progressHero, projectProgression } from '../../src/domain/progression';
import { ownedAbilities } from '../../src/ui/battleActions';
import { classTipForTurn, previewLesson } from '../../src/ui/classGuidance';
import { abilitySession } from '../helpers/abilityCatalog';

const tipId = (id: AbilityId) => `skill:${id}:v1`;
function sessionFor(hero: HeroId, xp = 180, round = 1, base: ContentCatalog = battleCatalog) {
  const party = HERO_IDS.map(id => progressHero(id, xp, base.heroes[id].stats.maxHp, base));
  const session = abilitySession(hero, projectProgression(party, base));
  return new BattleSession(session.catalog, { ...session.state, round }, session.state.seed);
}
function tipFor(session: BattleSession, abilityId: AbilityId) {
  const seen = ownedAbilities(session).filter(ability => ability.id !== abilityId).map(ability => tipId(ability.id));
  const tip = classTipForTurn(session, seen);
  assert(tip); expect(tip.abilityId).toBe(abilityId);
  return tip;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

describe('contextual class tips', () => {
  it('only teaches skills owned in the projected catalog and prioritizes skills newly learned at each level', () => {
    const seen = [tipId('ability:guarded_strike')];
    expect(classTipForTurn(sessionFor('fighter', 0), seen)?.abilityId).toBe('ability:guarded_strike');
    expect(classTipForTurn(sessionFor('fighter', 60), seen)?.abilityId).toBe('ability:second_wind');
    expect(classTipForTurn(sessionFor('fighter', 180), [...seen, tipId('ability:second_wind')])?.abilityId).toBe('ability:taunt');
    expect(classTipForTurn(sessionFor('mage', 0), [])?.abilityId).toBe('ability:magic_missile');
    expect(classTipForTurn(sessionFor('mage', 180), [tipId('ability:magic_missile')])?.abilityId).toBe('ability:frost_snare');
    expect(classTipForTurn(sessionFor('ranger', 60), [tipId('ability:high_shot')])?.abilityId).toBe('ability:mark_target');
  });

  it('covers all current player skills with current mechanics, including tradeoffs and friendly fire', () => {
    const fighter = sessionFor('fighter'), ranger = sessionFor('ranger'), mage = sessionFor('mage');
    expect(tipFor(fighter, 'ability:guarded_strike')).toMatchObject({
      id: 'skill:ability:guarded_strike:v1', title: 'Fighter tip · Guarded Strike',
      text: '−2 to attack rolls, +2 AC until your next turn, even on a miss. Does not stack.',
    });
    expect(tipFor(fighter, 'ability:second_wind').text).toContain('Heal yourself up to 7 HP');
    expect(tipFor(fighter, 'ability:second_wind').text).toContain('1 use per battle');
    expect(tipFor(fighter, 'ability:taunt').text).toContain('An enemy must target you with offensive actions until its next turn ends or either unit is defeated');
    expect(tipFor(ranger, 'ability:high_shot').text).toContain('+2 damage when you stand above the target');
    expect(tipFor(ranger, 'ability:mark_target').text).toContain('+2 accuracy for the next player attack roll against the marked enemy; consumed even on a miss');
    for (const [session, id] of [[ranger, 'ability:pinning_shot'], [mage, 'ability:frost_snare']] as const) {
      const tip = tipFor(session, id);
      expect(tip.text).toContain('Blocks enemy movement until its next turn ends or either unit is defeated');
      expect(tip.text).toContain('no damage or roll');
    }
    const missiles = tipFor(mage, 'ability:magic_missile');
    expect(missiles.text).toContain('2 missiles hit automatically for 1d4+1 force each');
    expect(missiles.text).toContain('Can damage allies');
    expect([fighter, ranger, mage].flatMap(session => ownedAbilities(session).map(ability => tipFor(session, ability.id).text)).join(' '))
      .not.toMatch(/Ember Burst|Arc Bolt|after a miss|area.of.effect/i);
  });

  it('uses effective catalog values and agrees with healing and missile previews', () => {
    const base = structuredClone(battleCatalog);
    const high = base.abilities['ability:high_shot']; assert(high.kind === 'attack');
    const missile = base.abilities['ability:magic_missile']; assert(missile.kind === 'magicMissile');
    const catalog: ContentCatalog = { ...base,
      heroes: { ...base.heroes, fighter: { ...base.heroes.fighter, stats: { ...base.heroes.fighter.stats, power: 9 } } },
      abilities: { ...base.abilities,
        'ability:high_shot': { ...high, uphillDamage: 5 },
        'ability:magic_missile': { ...missile, casterLevel: 7 },
      },
    };
    expect(tipFor(abilitySession('ranger', catalog), 'ability:high_shot').text).toBe('Hits deal +5 damage when you stand above the target.');
    const fighter = abilitySession('fighter', catalog);
    const injured = new BattleSession(catalog, { ...fighter.state,
      units: fighter.state.units.map(unit => unit.id === fighter.active.id ? { ...unit, hp: 2 } : unit) }, fighter.state.seed);
    const healing = injured.preview({ type: 'useAbility', unitId: injured.active.id, abilityId: 'ability:second_wind', target: { unitId: injured.active.id } });
    assert(healing.ok && 'healing' in healing);
    expect(tipFor(injured, 'ability:second_wind').text).toContain(`up to ${healing.healing} HP`);
    const mage = abilitySession('mage', catalog), ally = mage.state.units.find(unit => unit.defId === 'fighter')!;
    const preview = mage.preview({ type: 'useAbility', unitId: mage.active.id, abilityId: 'ability:magic_missile', target: { unitId: ally.id } });
    assert(preview.ok && 'missileCount' in preview);
    expect(tipFor(mage, 'ability:magic_missile').text).toContain(`${preview.missileCount} missiles hit automatically for 1d${MAGIC_MISSILE.damageDie}+${MAGIC_MISSILE.damageBonus} force each`);
  });

  it('prioritizes unseen IDs, repeats known skills by round and does not depend on catalog insertion order', () => {
    const ids = ['ability:guarded_strike', 'ability:second_wind', 'ability:taunt'] as const;
    const seen = ids.map(tipId);
    expect(classTipForTurn(sessionFor('fighter', 180, 3), [seen[0]])?.abilityId).toBe('ability:second_wind');
    expect([1, 2, 3, 4].map(round => classTipForTurn(sessionFor('fighter', 180, round), seen)?.abilityId)).toEqual([...ids, ids[0]]);
    const reverse = { ...battleCatalog, abilities: Object.fromEntries(Object.entries(battleCatalog.abilities).reverse()) };
    expect(classTipForTurn(sessionFor('fighter', 180, 2, reverse), seen)).toEqual(classTipForTurn(sessionFor('fighter', 180, 2), seen));
    expect(classTipForTurn(sessionFor('fighter', 180, 2), ['skill:ability:guarded_strike:v0', 'skill:ability:unknown:v1'])?.id).toBe(seen[0]);
  });

  it('never selects run-dismissed tips, including after all remaining lessons are seen', () => {
    const guarded = tipId('ability:guarded_strike'), wind = tipId('ability:second_wind'), taunt = tipId('ability:taunt');
    const seen = [guarded, wind, taunt];
    const dismissed = Object.freeze([guarded, taunt]);
    for (const round of [1, 2, 3, 4]) {
      expect(classTipForTurn(sessionFor('fighter', 180, round), [], dismissed)?.id).toBe(wind);
      expect(classTipForTurn(sessionFor('fighter', 180, round), seen, dismissed)?.id).toBe(wind);
      expect(classTipForTurn(sessionFor('fighter', 180, round), seen, seen)).toBeNull();
    }
    expect(classTipForTurn(sessionFor('fighter', 0), [], [guarded])).toBeNull();
    expect(classTipForTurn(sessionFor('fighter', 60), [guarded], [guarded])?.id).toBe(wind);
    expect(classTipForTurn(sessionFor('mage', 0), [], dismissed)?.id).toBe(tipId('ability:magic_missile'));
    // A fresh run can teach an acknowledged skill again.
    expect(classTipForTurn(sessionFor('fighter', 0), [guarded], [])?.id).toBe(guarded);
    expect(dismissed).toEqual([guarded, taunt]);
  });

  it('does not prepare, cancel, resolve, consume entropy, or change an existing preview', () => {
    const catalog = freeze(structuredClone(battleCatalog)), session = abilitySession('mage', catalog);
    session.prepare({ type: 'endTurn', unitId: session.active.id });
    const seen = Object.freeze([tipId('ability:magic_missile')]);
    const snapshot = () => JSON.stringify({ state: session.state, replay: session.replay, pending: session.pending,
      pendingPlan: session.pendingPlan, events: session.events, phase: session.phase, catalog: session.catalog, seen });
    const before = snapshot();
    for (const method of ['prepare', 'preparePlan', 'clearPrepared', 'confirm', 'confirmPlan', 'nextEnemy', 'cancel'] as const) {
      vi.spyOn(session, method).mockImplementation(() => { throw Error(`Unexpected ${method}`); });
    }
    vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('clock'); });
    try {
      expect(classTipForTurn(session, seen)).toEqual(classTipForTurn(session, seen));
      previewLesson('rail'); previewLesson('radial');
      expect(snapshot()).toBe(before);
    } finally { vi.restoreAllMocks(); }
  });

  it('suppresses enemy turns, unsettled phases, terminal battles and catalogs without owned skills', () => {
    const session = sessionFor('fighter'), enemy = session.state.units.find(unit => unit.side === 'enemy')!;
    const enemyTurn = new BattleSession(session.catalog, { ...session.state, activeIndex: session.state.initiative.indexOf(enemy.id) }, session.state.seed);
    expect(classTipForTurn(enemyTurn, [])).toBeNull();
    for (const phase of ['presenting', 'error', 'disposed'] as const) {
      session.phase = phase; expect(classTipForTurn(session, [])).toBeNull();
    }
    for (const outcome of ['playerWin', 'playerLoss'] as const) {
      const state = { ...session.state, outcome, units: session.state.units.map(unit =>
        unit.side === (outcome === 'playerWin' ? 'enemy' : 'player') ? { ...unit, hp: 0 } : unit) };
      expect(classTipForTurn(new BattleSession(session.catalog, state, state.seed), [])).toBeNull();
    }
    const noSkills = { ...battleCatalog, abilities: { 'ability:basic_attack': battleCatalog.abilities['ability:basic_attack'] } };
    expect(classTipForTurn(abilitySession('fighter', noSkills), [])).toBeNull();
  });
});

it('teaches rail confirmation and the radial direct-activation contract with separate lesson IDs', () => {
  const rail = previewLesson('rail'), radial = previewLesson('radial');
  expect(rail.id).toBe('preview:rail:v1'); expect(radial.id).toBe('preview:radial:v1');
  expect(rail.text).toContain('review the preview, then Confirm action (C)');
  expect(rail.text).toContain('Wait / End turn asks for confirmation');
  expect(radial.text).toContain('Tapping an action or releasing a hold can execute it');
  expect(radial.text).toContain('Special may open skill choices');
  expect(radial.text).toContain('End turn asks for confirmation');
  expect(radial.text).not.toContain('then Confirm action');
});
