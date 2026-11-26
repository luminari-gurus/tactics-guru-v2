import { describe, expect, it } from 'vitest';
import { filterBattleLog, type BattleLogEntry } from '../../src/ui/battleLog';

describe('battle log filters', () => {
  const entries = [
    { type: 'turnStarted', text: 'Round 1' },
    { type: 'attackRolled', text: 'Fighter misses' },
    { type: 'guardExpired', text: 'Guarded expires' },
    { type: 'moved', text: 'Ranger moves' },
    { type: 'missileRolled', text: 'Missile 1 rolls damage' },
    { type: 'saveRolled', text: 'Will save fails' },
    { type: 'damaged', text: 'Goblin takes damage' },
    { type: 'healed', text: 'Goblin heals' },
    { type: 'defeated', text: 'Goblin defeated' },
    { type: 'movementBlocked', text: 'Goblin is pinned' },
    { type: 'battleEnded', text: 'Victory' },
  ] as const satisfies readonly BattleLogEntry[];

  it('projects matching entries without changing the retained history', () => {
    const original = [...entries];
    expect(filterBattleLog(entries, 'actions').map(entry => entry.type)).toEqual([
      'turnStarted', 'moved', 'battleEnded',
    ]);
    expect(filterBattleLog(entries, 'damageHealing').map(entry => entry.type)).toEqual([
      'attackRolled', 'missileRolled', 'damaged', 'healed', 'defeated',
    ]);
    expect(filterBattleLog(entries, 'statusSaves').map(entry => entry.type)).toEqual([
      'guardExpired', 'saveRolled', 'movementBlocked',
    ]);
    expect(filterBattleLog(entries.slice(0, 1), 'statusSaves')).toEqual([]);
    expect(filterBattleLog(entries, 'all')).toEqual(original);
  });
});
