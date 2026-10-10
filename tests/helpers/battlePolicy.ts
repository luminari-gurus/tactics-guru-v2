import type { Page } from '@playwright/test';
import { battleCatalog as catalog } from '../../src/content/catalog';
import { previewMovement, moveUnit } from '../../src/domain/grid';
import { previewAttack, previewMagicMissile } from '../../src/domain/combat';
import { manhattanDistance } from '../../src/domain/targeting';
import type { BattleState, Command, Replay, BattleEvent } from '../../src/domain/types';

/** Test-only player policy. Browser tests enact its decision using real controls. */
export function playerDecision(state:BattleState):Command {
  const actor=state.units.find(u=>u.id===state.initiative[state.activeIndex])!;
  const wait:Command={type:'endTurn',unitId:actor.id};
  if(actor.hasActed)return wait;
  const targets=state.units.filter(u=>u.hp>0 && u.side==='enemy');
  const positions:{state:BattleState;move?:Command;cost:number}[]=[{state,cost:0}];
  const reach=previewMovement(state,actor.id,catalog);
  if(reach.ok)for(const cell of reach.cells.filter(c=>c.cost>0)){
    const move:Command={type:'move',unitId:actor.id,to:cell.cell},result=moveUnit(state,move,catalog);
    if(result.ok)positions.push({state:result.state,move,cost:cell.cost});
  }
  const candidates:{command:Command;move?:Command;score:number;cost:number}[]=[];
  for(const position of positions)for(const target of targets)for(const ability of Object.values(catalog.abilities).filter(a=>a.owners.includes(actor.defId))){
    const command:Command={type:'useAbility',unitId:actor.id,abilityId:ability.id,target:ability.kind==='magicMissile'?{missileTargets:[target.id]}:{unitId:target.id}};
    const preview=ability.kind==='magicMissile'?previewMagicMissile(position.state,command,catalog):previewAttack(position.state,command,catalog);
    if(!preview.ok)continue;
    const score='bonus' in preview ? Array.from({length:20},(_,i)=>i+1).reduce((sum,n)=>sum+(n===20?Math.min(target.hp,preview.criticalDamage):n!==1 && n+preview.bonus>=preview.armorClass?Math.min(target.hp,preview.damage):0),0)/20
      : Math.min(target.hp,3.5);
    candidates.push({command,move:position.move,score:score+(ability.kind==='guardedAttack'?0.7:0)+(ability.id!=='ability:basic_attack'?0.05:0),cost:position.cost});
  }
  candidates.sort((a,b)=>b.score-a.score || a.cost-b.cost);
  if(candidates.length)return candidates[0].move??candidates[0].command;
  if(reach.ok){
    const distance=(cell:{x:number;y:number})=>Math.min(...targets.map(t=>manhattanDistance(cell,t.cell)));
    const closer=reach.cells.filter(c=>c.cost>0 && distance(c.cell)<distance(actor.cell)).sort((a,b)=>distance(a.cell)-distance(b.cell) || a.cost-b.cost);
    if(closer.length)return {type:'move',unitId:actor.id,to:closer[0].cell};
  }
  return wait;
}

export async function session(page:Page):Promise<{state:BattleState;replay:Replay;events:BattleEvent[];phase:string}> {
  return JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
}
export async function playCommand(page:Page,command:Command){
  if(command.type==='endTurn') {await page.getByRole('button',{name:'Wait / End turn',exact:true}).click();return;}
  const snapshot=(await session(page)).state;
  await page.getByRole('button',{name:command.type==='move'?'Move':command.abilityId==='ability:basic_attack'?'Basic attack':/^Signature:/,exact:command.type==='move' || command.type==='useAbility' && command.abilityId==='ability:basic_attack'}).click();
  const cell=command.type==='move'?command.to:snapshot.units.find(u=>u.id===('unitId' in command.target?command.target.unitId:'missileTargets' in command.target?command.target.missileTargets[0]:-1))!.cell;
  await page.locator('#battle-target').selectOption(`${cell.x},${cell.y}`);
  await page.getByRole('button',{name:'Review action'}).click();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
}
