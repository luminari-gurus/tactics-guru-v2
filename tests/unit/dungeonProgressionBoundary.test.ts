import { assert, expect, it } from 'vitest';
import { BattleSession } from '../../src/app/BattleSession';
import { dungeonContent } from '../../src/content/dungeon';
import { dungeonBattle, freshDungeon, startDungeonBattle } from '../../src/domain/dungeon';
import { decodeDungeon, encodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { progressHero } from '../../src/domain/progression';
import { atEncounter } from '../helpers/dungeonFixtures';

for (const [xp, level, maxHp] of [[0, 1, 11], [59, 1, 11], [60, 2, 15],
  [179, 2, 15], [180, 3, 19], [360, 4, 23], [600, 5, 27]]) {
  it(`restores exact active Mage boundary and projected abilities at XP ${xp}`, () => {
    const fresh = freshDungeon(`menu-caster-${xp}`, 190);
    const progressed = { ...fresh, party: fresh.party.map(hero =>
      progressHero(hero.heroId, xp, 1, dungeonContent.catalog)) };
    const started = startDungeonBattle(atEncounter(progressed));
    assert(started.ok);
    const battle = started.state.activeBattle!;
    const mage = battle.units.find(unit => unit.defId === 'mage')!;
    const boundary = { ...started.state, activeBattle: { ...battle,
      activeIndex: battle.initiative.indexOf(mage.id) } };
    const encoded = encodeDungeon(boundary);
    assert(encoded.ok);
    const decoded = decodeDungeon(encoded.text);
    assert(decoded.ok);
    expect(decoded.state).toEqual(boundary);
    expect(decoded.state.party.find(hero => hero.heroId === 'mage')).toMatchObject({ xp, level, maxHp });
    const restored = dungeonBattle(decoded.state)!;
    const continued = BattleSession.fromSnapshot(restored.catalog, decoded.state.activeBattle);
    assert(continued.ok);
    expect(continued.session.state).toEqual(boundary.activeBattle);
    expect(continued.session.active.defId).toBe('mage');
    expect(continued.session.phase).toBe('player');
    expect(continued.session.events).toEqual([]);
    expect(continued.session.replay).toBeNull();
    expect(restored.catalog.abilities['ability:magic_missile']).toMatchObject({ kind: 'magicMissile', casterLevel: level });
    expect(Boolean(restored.catalog.abilities['ability:frost_snare'])).toBe(level >= 3);
    expect(encodeDungeon(decoded.state)).toEqual(encoded);

    // Recompute validation from canonical XP; reject forged persisted projections.
    for (const patch of [{ level: level === 5 ? 4 : level + 1 }, { maxHp: maxHp + 1 }, { learned: [] }]) {
      expect(encodeDungeon({ ...boundary, party: boundary.party.map(hero =>
        hero.heroId === 'mage' ? { ...hero, ...patch } : hero) }).ok).toBe(false);
    }
  });
}
