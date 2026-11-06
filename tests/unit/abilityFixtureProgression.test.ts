import { assert, expect, it } from 'vitest';
import { BattleSession } from '../../src/app/BattleSession';
import { HERO_IDS } from '../../src/content/constants';
import { progressHero, projectProgression } from '../../src/domain/progression';
import { actionCommand, ownedAbilities } from '../../src/ui/battleActions';
import { abilityCatalog, abilitySession } from '../helpers/abilityCatalog';

// Match the XP fixture's catalog composition, including its synthetic level-two
// action. Production-catalog progression tests do not cover that picker input.
const boundaries = [
  [0, 1, 11, 1], [59, 1, 11, 1], [60, 2, 15, 1],
  [179, 2, 15, 1], [180, 3, 19, 2], [359, 3, 19, 2],
  [360, 4, 23, 2], [599, 4, 23, 2], [600, 5, 27, 3],
] as const;

for (const [xp, level, maxHp, missiles] of boundaries) {
  it(`projects the Mage XP ${xp} fixture into exact picker choices and a fresh legal cast`, () => {
    const base = abilityCatalog(2);
    const party = HERO_IDS.map(id => progressHero(id, xp, 1, base));
    const catalog = projectProgression(party, base);
    // The browser fixture promotes the helper's positioned snapshot to a fresh
    // session; calling the helper alone would instead model a resumed battle.
    const freshSession = () => new BattleSession(catalog, abilitySession('mage', catalog).state, 2, undefined, true);
    const session = freshSession();
    const initial = structuredClone(session.state);
    const target = session.state.units.find(unit => unit.side === 'enemy')!;
    expect(party.find(hero => hero.heroId === 'mage')).toMatchObject({ xp, level, maxHp });
    expect(session.active.hp).toBe(maxHp);
    expect(ownedAbilities(session).map(ability => ability.id)).toEqual([
      ...(level >= 3 ? ['ability:frost_snare'] : []),
      'ability:magic_missile',
      ...(level >= 2 ? ['ability:zz_mage'] : []),
    ]);

    // The real HUD consumes these helpers. Locked actions must never become a
    // command, while preview/cancellation must leave RNG and state untouched.
    for (const abilityId of ['ability:frost_snare', 'ability:zz_mage'] as const) {
      const unlocked = level >= (abilityId === 'ability:frost_snare' ? 3 : 2);
      expect(actionCommand(session, abilityId, target.cell) !== null).toBe(unlocked);
    }
    const command = actionCommand(session, 'ability:magic_missile', target.cell);
    assert(command);
    expect(session.prepare(command)).toMatchObject({ ok: true, missileCount: missiles });
    session.cancel();
    expect(session.state).toEqual(initial);
    expect(session.events).toEqual([]);
    expect(session.replay?.commands).toEqual([]);

    assert(session.prepare(command).ok);
    const cast = session.confirm();
    assert(cast);
    expect(cast.events.filter(event => event.type === 'missileRolled')).toHaveLength(missiles);
    expect(cast.after.commandCount).toBe(initial.commandCount + 1);
    expect(session.confirm()).toBeNull();
    session.finishPresentation(cast.token);
    expect(session.prepare(command)).toEqual({ ok: false, reason: 'alreadyActed' });

    // Rebuilding a transient fixture must discard the accepted action. Actual
    // browser reload, DOM, touch and health-bar rendering remain E2E obligations.
    const reset = freshSession();
    expect(reset.state).toEqual(initial);
    expect(reset.events).toEqual([]);
    expect(reset.replay?.commands).toEqual([]);
    expect(reset.active.hp).toBe(maxHp);
    session.dispose();
    reset.dispose();
  });
}
