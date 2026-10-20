import { freshDungeon, startDungeonBattle, dungeonBattle, acceptDungeonBattle, dungeonItem, dungeonBoundary, type DungeonState, type DungeonResult } from '../../src/domain/dungeon';
import { BattleSession } from '../../src/app/BattleSession';
import { playerDecision } from './playerPolicy';
import type { Command } from '../../src/domain/types';
export const checkedDungeon = (r: DungeonResult) => { if(!r.ok)throw Error(r.reason);return r.state; };
/** Legal pure-domain play fixture, not a claim that all preceding turns used browser input. */
export function dungeonVictoryBoundary(seed: number, slot = 0) {
  let dungeon=freshDungeon('dungeon-browser-fixture',seed);
  const histories: unknown[]=[];
  for(let index=0;index<=slot;index++) {
    dungeon=checkedDungeon(startDungeonBattle(dungeon));
    const built=dungeonBattle(dungeon)!;
    const battle=new BattleSession(built.catalog,dungeon.activeBattle!,dungeon.activeBattle!.seed,undefined,true,built.battlefield);
    let last: { snapshot: DungeonState; command: Command }|null=null;
    for(let step=0;step<500&&battle.state.outcome==='ongoing';step++) {
      if(battle.phase==='enemy'){const p=battle.nextEnemy();if(!p)throw Error('enemy stalled');battle.finishPresentation(p.token);continue;}
      const command=playerDecision(battle.state,built.catalog);
      const before=battle.state;
      if(!battle.prepare(command).ok)throw Error('policy rejected');
      const p=battle.confirm();if(!p)throw Error('policy failed');
      if(p.after.outcome==='playerWin')last={snapshot:{...dungeon,activeBattle:before},command};
      battle.finishPresentation(p.token);
    }
    if(battle.state.outcome!=='playerWin'||!last)return null;
    histories.push(battle.replay);
    if(index===slot)return {...last,histories};
    dungeon=checkedDungeon(acceptDungeonBattle(dungeon,battle.state));
    const offer=dungeon.offer!;
    const itemId=offer.options.find(o=>o.itemId==='item:healing_draught')?.itemId??offer.options[0].itemId;
    dungeon=checkedDungeon(dungeonItem(dungeon,{...dungeonBoundary(dungeon),type:'claimReward',offerId:offer.id,itemId}));
    for(const hero of dungeon.party)if(hero.hp>0&&hero.hp<18&&dungeon.ownership.consumables.length) {
      const used=dungeonItem(dungeon,{...dungeonBoundary(dungeon),type:'useItem',itemId:'item:healing_draught',heroId:hero.heroId});if(used.ok)dungeon=used.state;
    }
  }
  return null;
}
