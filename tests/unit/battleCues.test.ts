import { describe, expect, it } from 'vitest';
import { battleCues, BATTLE_CUES } from '../../src/audio/battleCues';
import { battleCatalog as catalog } from '../../src/content/catalog';
import type { BattleEvent } from '../../src/domain/types';
import { BattleSession } from '../../src/app/BattleSession';
import { playerDecision } from '../helpers/battlePolicy';
import { readFileSync } from 'node:fs';

const attack = (result: 'miss'|'hit'|'critical'): BattleEvent => ({type:'attackRolled',unitId:1,targetId:2,natural:10,bonus:1,total:11,armorClass:10,result});
describe('accepted event cue policy', () => {
  it('ships every fixed manifest asset within the combined byte budget', () => {
    const sizes=Object.values(BATTLE_CUES).map(c=>readFileSync(`public${c.url}`).byteLength);
    expect(sizes).toHaveLength(8); expect(sizes.every(n=>n>0)).toBe(true);
    expect(sizes.reduce((a,b)=>a+b,0)).toBeLessThanOrEqual(32768);
  });
  it('groups movement and ignores non-feedback events', () => {
    expect(battleCues([{type:'moved',unitId:1,path:[]},{type:'moved',unitId:1,path:[]},{type:'turnEnded',unitId:1},{type:'damaged',unitId:2,hp:2,damage:1}],catalog)).toEqual(['move']);
  });
  it.each(['ability:basic_attack','ability:guarded_strike','ability:high_shot'] as const)('uses recorded attack results for %s', abilityId => {
    for (const result of ['miss','hit','critical'] as const) expect(battleCues([{type:'abilityUsed',unitId:1,abilityId,target:{unitId:2}},attack(result)],catalog)).toEqual([result]);
  });
  it('offers one cast, one defeat, and a final outcome for multiple missiles and defeats', () => {
    const events: BattleEvent[] = [{type:'abilityUsed',unitId:1,abilityId:'ability:magic_missile',target:{missileTargets:[2,3]}}, ...[2,3].flatMap((id):BattleEvent[]=>[{type:'missileRolled',unitId:1,targetId:id,missile:id,natural:2,damage:3},{type:'defeated',unitId:id}])];
    expect(battleCues(events,catalog)).toEqual(['magic','unit-defeat']);
    expect(battleCues([...events,{type:'battleEnded',outcome:'playerWin'}],catalog)).toEqual(['magic','unit-defeat','victory']);
    expect(battleCues([{type:'battleEnded',outcome:'playerLoss'}],catalog)).toEqual(['loss']);
  });
  it('caps at four while retaining defeat and outcome', () => {
    expect(battleCues([attack('miss'),attack('hit'),attack('critical'),attack('hit'),{type:'defeated',unitId:2},{type:'battleEnded',outcome:'playerWin'}],catalog)).toEqual(['miss','hit','unit-defeat','victory']);
  });
  it('cannot mutate frozen accepted batches or affect seeded state/RNG', () => {
    const audible = new BattleSession(catalog,'map:forest_ruins',2), silent = new BattleSession(catalog,'map:forest_ruins',2);
    for(let i=0;i<300 && audible.phase!=='ended';i++) {
      const command=playerDecision(audible.state);
      const a=audible.phase==='enemy'?audible.nextEnemy():(audible.prepare(command),audible.confirm());
      const b=silent.phase==='enemy'?silent.nextEnemy():(silent.prepare(command),silent.confirm());
      expect(a).not.toBeNull(); expect(b).not.toBeNull();
      const before=structuredClone(a);
      battleCues(a!.events,catalog);
      expect(a).toEqual(before); expect(a).toEqual(b);
      audible.finishPresentation(a!.token); silent.finishPresentation(b!.token);
    }
    expect(audible.state.outcome).toBe('playerWin'); expect(audible.replay).toEqual(silent.replay);
  });
});
