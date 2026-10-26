import type { CellPosition } from '../content/types';
import type { BattleSession } from '../app/BattleSession';
import { actionCommand, actionTargets, type Action } from './battleActions';
import { lineOfSightBlocked, manhattanDistance } from '../domain/targeting';
import { previewAbility } from '../domain/combat';

export interface HoverPreview {
  readonly origin: CellPosition;
  readonly cells: readonly CellPosition[];
  readonly targets: readonly CellPosition[];
}

export function hoverPreview(session: BattleSession, origin: CellPosition | null): HoverPreview | null {
  if (session.phase !== 'player' || !origin || session.active.hasMoved || session.active.hasActed) return null;
  const {catalog,state,active}=session;
  const map=catalog.maps[state.mapId],tile=map.cells.find(c=>c.x===origin.x && c.y===origin.y);
  if(!tile || !catalog.terrains[tile.terrainId].walkable
    || state.units.some(u=>u.hp>0 && u.id!==active.id && u.cell.x===origin.x && u.cell.y===origin.y))return null;
  const abilities=Object.values(catalog.abilities).filter(a=>a.owners.includes(active.defId) && a.kind!=='secondWind');
  const cells=map.cells.filter(cell=>{
    const distance=manhattanDistance(origin,cell);
    return abilities.some(a=>distance>=a.rangeMin && distance<=a.rangeMax)
      && !lineOfSightBlocked(catalog,state.mapId,origin,cell);
  }).map(({x,y})=>({x,y}));
  // Query a relocated snapshot only; never prepare or resolve a command in the live session.
  const hypothetical={...state,units:state.units.map(u=>u.id===active.id?{...u,cell:origin}:u)};
  const targets=state.units.filter(u=>u.hp>0 && u.id!==active.id && abilities.some(a=>{
    const command={type:'useAbility' as const,unitId:active.id,abilityId:a.id,target:{unitId:u.id}};
    return previewAbility(hypothetical,command,catalog).ok;
  })).map(u=>u.cell);
  return {origin,cells,targets};
}

export interface TargetOverlay {
  readonly cell: CellPosition;
  readonly valid: boolean;
  readonly selected: boolean;
  readonly reason: string | null;
}

/** Presentation only: use the same preview as confirmation, without preparing a command or drawing RNG. */
export function targetOverlays(session: BattleSession, action: Action | null, selected: CellPosition | null): TargetOverlay[] {
  if (session.phase !== 'player' || !action || action === 'move' || session.active.hasActed) return [];
  const cells = actionTargets(session, action).map(unit => unit.cell);
  if (selected && !cells.some(cell => cell.x === selected.x && cell.y === selected.y)) cells.push(selected);
  return cells.map(cell => {
    const command = actionCommand(session, action, cell);
    const preview = command ? session.preview(command) : null;
    return { cell, valid: preview?.ok === true,
      selected: cell.x === selected?.x && cell.y === selected.y,
      reason: preview?.ok ? null : preview?.reason ?? 'missingTarget' };
  });
}
