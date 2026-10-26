import type { AbilityId, CellPosition } from '../content/types';
import type { BattleSession } from '../app/BattleSession';
import type { Command } from '../domain/types';

export type Action = 'move' | 'basic' | AbilityId;
export function ownedAbilities(session: BattleSession) {
  return Object.values(session.catalog.abilities).filter(a=>a.id!=='ability:basic_attack' && a.owners.includes(session.active.defId))
    .sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
export function actionCommand(session: BattleSession, action: Action, cell: CellPosition): Command | null {
  const actor=session.active;
  if(action==='move')return {type:'move',unitId:actor.id,to:cell};
  const abilityId=action==='basic'?'ability:basic_attack':action;
  const ability=session.catalog.abilities[abilityId];
  if(!ability?.owners.includes(actor.defId))return null;
  const target=session.state.units.find(u=>u.hp>0 && u.cell.x===cell.x && u.cell.y===cell.y);
  return target?{type:'useAbility',unitId:actor.id,abilityId,target:{unitId:target.id}}:null;
}
export function actionTargets(session: BattleSession, action: Action) {
  const ability=session.catalog.abilities[action==='basic'?'ability:basic_attack':action as AbilityId];
  return session.state.units.filter(u=>u.hp>0 && (ability?.kind==='secondWind'?u.id===session.active.id:ability?.kind==='magicMissile' || u.side!==session.active.side));
}
export function friendlyFire(session: BattleSession, command: Command): string {
  if(command.type!=='useAbility')return '';
  if(session.catalog.abilities[command.abilityId]?.kind==='secondWind')return '';
  const ids='unitId' in command.target?[command.target.unitId]:'missileTargets' in command.target?command.target.missileTargets:[];
  const allies=session.state.units.filter(u=>ids.includes(u.id) && u.side===session.active.side);
  return allies.length?`Friendly fire: this damages ${allies.map(u=>`${u.defId} #${u.id}`).join(', ')}. `:'';
}
