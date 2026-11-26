import { describe, expect, it } from 'vitest';
import { battleCatalog } from '../../src/content/catalog';
import { createBattle } from '../../src/domain/turns';
import type { BattleEvent } from '../../src/domain/types';
import { BattleLog, filterBattleLog, groupBattleLog, serializeBattleLog } from '../../src/ui/battleLog';
import { displayName, eventText } from '../../src/ui/hud';

const created = createBattle('map:forest_ruins', 1, battleCatalog);
if (!created.ok) throw Error(created.reason);
const initial = created.state;
const fighter = initial.units.find(unit => unit.defId === 'fighter')!;
const foe = initial.units.find(unit => unit.side === 'enemy')!;
const fighterTurn = { ...initial, activeIndex: initial.initiative.indexOf(fighter.id) };
const foeTurn = { ...initial, activeIndex: initial.initiative.indexOf(foe.id) };
const strike = { type: 'abilityUsed', unitId: fighter.id, abilityId: 'ability:guarded_strike', target: { unitId: foe.id } } as const;
const attack = { type: 'attackRolled', unitId: fighter.id, targetId: foe.id, natural: 17, bonus: 2,
  total: 19, armorClass: 13, result: 'hit' } as const;
const damage = { type: 'damaged', unitId: foe.id, damage: 3, hp: 4 } as const;
const heal = { type: 'healed', unitId: fighter.id, healing: 3, hp: 11 } as const;
const build = { commit: 'test-commit', dirty: true };

describe('battle log', () => {
  it('keeps accepted actions distinct and orders expiry before the new round and actor', () => {
    const log = new BattleLog(fighterTurn, false, displayName, eventText);
    log.append(fighterTurn, [strike, attack, damage, { type: 'guarded', unitId: fighter.id }]);
    log.append({ ...fighterTurn, commandCount: 1 }, [heal]);
    log.append({ ...fighterTurn, commandCount: 2 }, [
      { type: 'turnEnded', unitId: fighter.id },
      { type: 'guardExpired', unitId: foe.id },
      { type: 'turnStarted', round: 2, unitId: foe.id },
    ]);
    log.append({ ...foeTurn, round: 2, commandCount: 3 }, [
      { type: 'abilityUsed', unitId: foe.id, abilityId: 'ability:heal_goblin', target: { unitId: foe.id } },
      { ...heal, unitId: foe.id },
    ]);
    const { entries } = log.snapshot();
    const groups = groupBattleLog(entries);

    expect(groups.map(({ round, actor, action, commandNumber, entries }) =>
      [round, actor.id, action.type, commandNumber, entries.map(event => event.type)])).toEqual([
      [1, fighter.id, 'turnStart', 0, ['turnStarted']],
      [1, fighter.id, 'ability', 1, ['abilityUsed', 'attackRolled', 'damaged', 'guarded']],
      [1, fighter.id, 'drinkDraught', 2, ['healed']],
      [1, fighter.id, 'endTurn', 3, ['turnEnded', 'guardExpired']],
      [2, foe.id, 'turnStart', 3, ['turnStarted']],
      [2, foe.id, 'ability', 4, ['abilityUsed', 'healed']],
    ]);
    expect(groups[1].entries[1]).toMatchObject({
      unit: { id: fighter.id }, target: { id: foe.id },
      result: { outcome: 'hit', natural: 17, bonus: 2, total: 19, armorClass: 13 },
    });
    expect(groups[1].entries[2]).toMatchObject({ unit: { id: foe.id }, result: { damage: 3, hp: 4 } });

    const damageGroups = groupBattleLog(filterBattleLog(entries, 'damageHealing'));
    expect(damageGroups[0]).toMatchObject({ actor: { id: fighter.id }, action: { abilityId: strike.abilityId } });
    expect(damageGroups.flatMap(group => group.entries.map(entry => entry.type))).toEqual([
      'attackRolled', 'damaged', 'healed', 'healed',
    ]);
    expect(filterBattleLog(entries, 'statusSaves').map(entry => entry.type)).toEqual(['guarded', 'guardExpired']);
    expect(filterBattleLog(entries, 'actions').map(entry => entry.type)).toEqual([
      'turnStarted', 'abilityUsed', 'turnEnded', 'turnStarted', 'abilityUsed',
    ]);
    expect(filterBattleLog(entries, 'all')).toBe(entries);
  });

  it('keeps 40 events in a long battle and retains the context of a partial first action', () => {
    const log = new BattleLog(fighterTurn, false, displayName, eventText);
    const opening = log.snapshot();
    for (let i = 0; i < 1000; i++) {
      log.append({ ...fighterTurn, round: i + 1, commandCount: i }, [strike, damage]);
    }
    log.append({ ...fighterTurn, round: 1001, commandCount: 1000 }, [
      { type: 'moved', unitId: fighter.id, path: [fighter.cell, { x: 1, y: 2 }] },
    ]);
    const snapshot = log.snapshot();
    expect(opening).toMatchObject({ resumed: false, truncated: false, entries: [{ type: 'turnStarted' }] });
    expect(snapshot.entries).toHaveLength(40);
    expect(snapshot.truncated).toBe(true);
    expect(snapshot.entries[0]).toMatchObject({
      type: 'damaged',
      context: { round: 981, commandNumber: 981, actor: { id: fighter.id }, action: { abilityId: strike.abilityId } },
    });
    expect(groupBattleLog(snapshot.entries)[0].entries.map(entry => entry.type)).toEqual(['damaged']);
    expect(snapshot.entries.at(-1)).toMatchObject({ type: 'moved', context: { commandNumber: 1001 } });

    const resumed = new BattleLog({ ...foeTurn, round: 1001, commandCount: 1001 }, true, displayName, eventText).snapshot();
    expect(resumed).toMatchObject({
      resumed: true, truncated: false, entries: [{
        type: 'turnStarted', context: { round: 1001, commandNumber: 1001, actor: { id: foe.id } },
      }],
    });
    expect(resumed.entries).toHaveLength(1);
  });

  it('exports only the documented fields and round-trips multiline and special text', () => {
    const unusual = 'First line & <status>\n"Second" \\ 🛡';
    const format = (event: BattleEvent, name: (id: number) => string) =>
      event.type === 'abilityUsed' ? unusual : eventText(event, name);
    const log = new BattleLog(fighterTurn, true, displayName, format);
    log.append(fighterTurn, [
      { ...strike, target: { cell: { x: 5, y: 3 } } },
      { type: 'saveRolled', unitId: foe.id, natural: 4, modifier: 2, total: 6, dc: 12, saved: false },
      { type: 'missileRolled', unitId: fighter.id, targetId: foe.id, missile: 1, natural: 4, damage: 5 },
      { type: 'battleEnded', outcome: 'playerWin' },
    ]);
    const output = serializeBattleLog(log.snapshot(), build, initial.versions);
    const parsed = JSON.parse(output);
    expect(output).toContain('\n  "version": 1,\n');
    expect(parsed).toEqual({
      format: 'tactics-guru-combat-log',
      version: 1,
      build,
      versions: initial.versions,
      history: { limit: 40, resumed: true, truncated: false },
      groups: [
        { round: 1, actor: { id: fighter.id, name: `Fighter #${fighter.id}` }, commandNumber: 0,
          action: { type: 'turnStart', label: 'Turn begins' },
          entries: [{ type: 'turnStarted', text: `Round 1: Fighter #${fighter.id}'s turn`,
            unit: { id: fighter.id, name: `Fighter #${fighter.id}` } }] },
        expect.objectContaining({ entries: [
          { type: 'abilityUsed', text: unusual, unit: { id: fighter.id, name: `Fighter #${fighter.id}` } },
          expect.objectContaining({ type: 'saveRolled', result: { natural: 4, modifier: 2, total: 6, dc: 12, saved: false } }),
          expect.objectContaining({ type: 'missileRolled', result: { missile: 1, natural: 4, damage: 5 } }),
          { type: 'battleEnded', text: 'Victory', result: { outcome: 'playerWin' } },
        ] }),
      ],
    });
    expect(output).not.toMatch(/"(seed|cell|path|snapshot|commands|url|playerId)"\s*:/);
  });
});
