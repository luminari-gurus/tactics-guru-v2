import { battleCatalog as baseCatalog } from '../../src/content/catalog';
import { HERO_IDS } from '../../src/content/constants';
import { progressHero, projectProgression } from '../../src/domain/progression';
import type { ContentCatalog } from '../../src/content/types';
import { previewMovement, moveUnit } from '../../src/domain/grid';
import { previewAttack, previewMagicMissile, previewAbility } from '../../src/domain/combat';
import { lineOfSightBlocked, manhattanDistance } from '../../src/domain/targeting';
import type { BattleState, Command } from '../../src/domain/types';

/** Same level-one boundary as standalone BattleScene; raw catalogs retain locked definitions. */
export const standaloneCatalog=projectProgression(HERO_IDS.map(id=>progressHero(id,0,baseCatalog.heroes[id].stats.maxHp,baseCatalog)),baseCatalog);

/** Acceptance witness chooses real unlocked Fighter actions, otherwise the established combat policy. */
export function fighterDecision(state:BattleState,catalog:ContentCatalog,tauntUsed:boolean):Command {
  const actor=state.units.find(u=>u.id===state.initiative[state.activeIndex])!;
  if(actor.defId==='fighter' && !actor.hasActed) {
    const heal={type:'useAbility',unitId:actor.id,abilityId:'ability:second_wind',target:{unitId:actor.id}} as const;
    if(previewAbility(state,heal,catalog).ok)return heal;
    if(!tauntUsed)for(const target of state.units.filter(u=>u.side==='enemy' && u.hp>0)) {
      const command={type:'useAbility',unitId:actor.id,abilityId:'ability:taunt',target:{unitId:target.id}} as const;
      if(previewAbility(state,command,catalog).ok)return command;
    }
  }
  return playerDecision(state,catalog,true);
}

/** Ranger acceptance witness uses each learned control once, then keeps the legal combat policy. */
export function rangerDecision(state:BattleState,catalog:ContentCatalog,used:{mark:boolean;pin:boolean}):Command {
  const actor=state.units.find(u=>u.id===state.initiative[state.activeIndex])!;
  if(actor.defId==='ranger' && !actor.hasActed)for(const abilityId of [
    ...(!used.pin?['ability:pinning_shot' as const]:[]),...(!used.mark?['ability:mark_target' as const]:[]),
  ]) {
    const targets=state.units.filter(u=>u.side==='enemy'&&u.hp>0);
    for(const target of targets){const command={type:'useAbility' as const,unitId:actor.id,abilityId,target:{unitId:target.id}};if(previewAbility(state,command,catalog).ok)return command;}
    if(!catalog.abilities[abilityId]||actor.hasMoved)continue;
    const reach=previewMovement(state,actor.id,catalog);if(!reach.ok)continue;
    for(const cell of reach.cells.filter(c=>c.cost>0)) {
      const move={type:'move' as const,unitId:actor.id,to:cell.cell},result=moveUnit(state,move,catalog);if(!result.ok)continue;
      if(targets.some(target=>previewAbility(result.state,{type:'useAbility',unitId:actor.id,abilityId,target:{unitId:target.id}},catalog).ok))return move;
    }
  }
  // Make the mark witness observable: preserve a marked target for a rolled
  // player attack rather than letting the next automatic missile defeat it.
  const decision=fighterDecision(state,catalog,true);
  if(decision.type==='useAbility'&&catalog.abilities[decision.abilityId]?.kind==='magicMissile') {
    const targetId='unitId' in decision.target?decision.target.unitId:'missileTargets' in decision.target?decision.target.missileTargets[0]:undefined;
    if(state.units.find(u=>u.id===targetId)?.markedBy!==undefined) {
      for(const target of state.units.filter(u=>u.side==='enemy'&&u.hp>0&&u.markedBy===undefined)) {
        const alternative={...decision,target:{unitId:target.id}};
        if(previewAbility(state,alternative,catalog).ok)return alternative;
      }
      return {type:'endTurn',unitId:actor.id};
    }
  }
  return decision;
}

/** Mage witness casts one learned Snare, then preserves the established combat policy. */
export function mageDecision(state:BattleState,catalog:ContentCatalog,snareUsed:boolean):Command {
  const actor=state.units.find(u=>u.id===state.initiative[state.activeIndex])!;
  if(actor.defId==='mage'&&!actor.hasActed&&!snareUsed&&catalog.abilities['ability:frost_snare']) {
    const targets=state.units.filter(u=>u.side==='enemy'&&u.hp>0);
    for(const target of targets){const command={type:'useAbility' as const,unitId:actor.id,abilityId:'ability:frost_snare' as const,target:{unitId:target.id}};if(previewAbility(state,command,catalog).ok)return command;}
    const reach=previewMovement(state,actor.id,catalog);
    if(!actor.hasMoved&&reach.ok)for(const cell of reach.cells.filter(c=>c.cost>0)) {
      const move={type:'move' as const,unitId:actor.id,to:cell.cell},result=moveUnit(state,move,catalog);if(!result.ok)continue;
      if(targets.some(target=>previewAbility(result.state,{type:'useAbility',unitId:actor.id,abilityId:'ability:frost_snare',target:{unitId:target.id}},catalog).ok))return move;
    }
  }
  return fighterDecision(state,catalog,true);
}

/** Test-only policy. Longer dungeon witnesses can prioritize finishing enemies and safer firing positions; established callers keep their policy. */
export function playerDecision(state:BattleState, catalog:ContentCatalog = standaloneCatalog, finishTargets = false):Command {
  const actor=state.units.find(u=>u.id===state.initiative[state.activeIndex])!;
  const wait:Command={type:'endTurn',unitId:actor.id};
  if(actor.hasActed)return wait;
  const targets=state.units.filter(u=>u.hp>0 && u.side!==actor.side);
  const positions:{state:BattleState;move?:Command;cost:number}[]=[{state,cost:0}];
  const reach=previewMovement(state,actor.id,catalog);
  if(reach.ok)for(const cell of reach.cells.filter(c=>c.cost>0)){
    const move:Command={type:'move',unitId:actor.id,to:cell.cell},result=moveUnit(state,move,catalog);
    if(result.ok)positions.push({state:result.state,move,cost:cell.cost});
  }
  const candidates:{command:Command;move?:Command;score:number;cost:number}[]=[];
  const offensive=Object.values(catalog.abilities).filter(a=>a.owners.includes(actor.defId) && (a.kind==='attack'||a.kind==='guardedAttack'||a.kind==='magicMissile'));
  for(const position of positions)for(const target of targets)for(const ability of offensive){
    const command:Command={type:'useAbility',unitId:actor.id,abilityId:ability.id,target:ability.kind==='magicMissile'?{missileTargets:Array.from({length:Math.min(5,Math.floor((ability.casterLevel+1)/2))},()=>target.id)}:{unitId:target.id}};
    const preview=ability.kind==='magicMissile'?previewMagicMissile(position.state,command,catalog):previewAttack(position.state,command,catalog);
    if(!preview.ok)continue;
    const score='bonus' in preview ? Array.from({length:20},(_,i)=>i+1).reduce((sum,n)=>sum+(n===20?Math.min(target.hp,preview.criticalDamage):n!==1 && n+preview.bonus>=preview.armorClass?Math.min(target.hp,preview.damage):0),0)/20
      : Math.min(target.hp,3.5);
    const killChance=!finishTargets?0:'bonus' in preview ? Array.from({length:20},(_,i)=>i+1).filter(n=>
      n===20?preview.criticalDamage>=target.hp:n!==1&&n+preview.bonus>=preview.armorClass&&preview.damage>=target.hp).length/20
      : [2,3,4,5].filter(damage=>damage>=target.hp).length/4;
    const safety=finishTargets?Math.min(...targets.map(t=>manhattanDistance(position.state.units.find(u=>u.id===actor.id)!.cell,t.cell))):0;
    candidates.push({command,move:position.move,score:score+(finishTargets?6*killChance+0.01*safety:0)+(ability.kind==='guardedAttack'?0.7:0)+(ability.id!=='ability:basic_attack'?0.05:0),cost:position.cost});
  }
  candidates.sort((a,b)=>b.score-a.score || a.cost-b.cost);
  if(candidates.length)return candidates[0].move??candidates[0].command;
  if(reach.ok){
    const map=catalog.maps[state.mapId],key=(c:{x:number;y:number})=>`${c.x},${c.y}`;
    const blocked=new Set(state.units.filter(u=>u.hp>0&&u.id!==actor.id).map(u=>key(u.cell)));
    const stats=(actor.side==='player'?catalog.heroes[actor.defId]:catalog.enemies[actor.defId]).stats;
    const goals=map.cells.filter(cell=>catalog.terrains[cell.terrainId].walkable&&!blocked.has(key(cell))&&targets.some(t=>offensive.some(a=>manhattanDistance(cell,t.cell)>=a.rangeMin&&manhattanDistance(cell,t.cell)<=a.rangeMax&&!lineOfSightBlocked(catalog,map.id,cell,t.cell))));
    const distances=new Map(goals.map(c=>[key(c),0])),queue=goals.map(cell=>({cell,cost:0}));
    while(queue.length){
      queue.sort((a,b)=>a.cost-b.cost);const {cell,cost}=queue.shift()!;
      if(distances.get(key(cell))!==cost)continue;
      for(const n of map.cells.filter(n=>manhattanDistance(n,cell)===1&&!blocked.has(key(n))&&catalog.terrains[n.terrainId].walkable)){
        const up=Math.max(0,cell.elevation-n.elevation),edge=catalog.terrains[cell.terrainId].moveCost+up;
        if(up>stats.jump||edge>stats.move||cost+edge>=(distances.get(key(n))??Infinity))continue;
        distances.set(key(n),cost+edge);queue.push({cell:n,cost:cost+edge});
      }
    }
    const closer=reach.cells.filter(c=>c.cost>0&&(distances.get(key(c.cell))??Infinity)<(distances.get(key(actor.cell))??Infinity))
      .sort((a,b)=>distances.get(key(a.cell))!-distances.get(key(b.cell))!||a.cost-b.cost||a.cell.y-b.cell.y||a.cell.x-b.cell.x);
    if(closer.length)return {type:'move',unitId:actor.id,to:closer[0].cell};
  }
  return wait;
}
