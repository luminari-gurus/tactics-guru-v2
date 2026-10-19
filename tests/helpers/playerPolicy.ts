import { battleCatalog as defaultCatalog } from '../../src/content/catalog';
import type { ContentCatalog } from '../../src/content/types';
import { previewMovement, moveUnit } from '../../src/domain/grid';
import { previewAttack, previewMagicMissile } from '../../src/domain/combat';
import { lineOfSightBlocked, manhattanDistance } from '../../src/domain/targeting';
import type { BattleState, Command } from '../../src/domain/types';

/** Test-only player policy. Browser tests enact its decision using real controls. */
export function playerDecision(state:BattleState, catalog:ContentCatalog = defaultCatalog):Command {
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
    const map=catalog.maps[state.mapId],key=(c:{x:number;y:number})=>`${c.x},${c.y}`;
    const blocked=new Set(state.units.filter(u=>u.hp>0&&u.id!==actor.id).map(u=>key(u.cell)));
    const stats=(actor.side==='player'?catalog.heroes[actor.defId]:catalog.enemies[actor.defId]).stats;
    const goals=map.cells.filter(cell=>catalog.terrains[cell.terrainId].walkable&&!blocked.has(key(cell))&&targets.some(t=>Object.values(catalog.abilities).some(a=>a.owners.includes(actor.defId)&&manhattanDistance(cell,t.cell)>=a.rangeMin&&manhattanDistance(cell,t.cell)<=a.rangeMax&&!lineOfSightBlocked(catalog,map.id,cell,t.cell))));
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
