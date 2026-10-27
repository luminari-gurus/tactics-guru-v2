import { GUARDED_STRIKE_TRADEOFF } from '../content/constants';
import type { ContentCatalog, HeroId } from '../content/types';
import type { BattleEvent, UnitState } from './types';

/** Supported runtime case only. Source and target are the same Fighter instance. */
export function guardedEffect(unit: UnitState): { readonly kind: 'guarded'; readonly sourceId: number; readonly targetId: number } | null {
  return unit.hp > 0 && unit.guarded ? { kind: 'guarded', sourceId: unit.id, targetId: unit.id } : null;
}
/** Catalog stats already include equipment. Prospective Guarded Strike and active guard apply once. */
export function combatStats(unit: UnitState, catalog: ContentCatalog, guarding = false) {
  const stats = unit.side === 'player' ? catalog.heroes[unit.defId].stats : catalog.enemies[unit.defId].stats;
  const guard = guardedEffect(unit) !== null;
  return { accuracy: stats.accuracy - (guard || guarding ? GUARDED_STRIKE_TRADEOFF.attackPenalty : 0),
    armorClass: stats.armorClass + (guard ? GUARDED_STRIKE_TRADEOFF.armorClassBonus : 0) };
}
export function removeGuard(unit: UnitState): UnitState {
  if (!unit.guarded) return unit;
  const { guarded, ...rest } = unit;
  return rest;
}
export function grantGuard(unit: UnitState): UnitState {
  return unit.hp > 0 ? { ...unit, guarded: true } : removeGuard(unit);
}
/** Readers retain historic inert flags until an accepted damage or turn transition. */
export function clearDefeatedGuard(unit: UnitState): UnitState {
  return unit.hp === 0 ? removeGuard(unit) : unit;
}

export function tauntSource(unit: UnitState, units: readonly UnitState[]): UnitState | undefined {
  return unit.hp > 0 ? units.find(source=>source.id===unit.tauntedBy && source.hp>0 && source.side!==unit.side) : undefined;
}
export function removeTaunt(unit: UnitState): UnitState {
  const { tauntedBy, ...rest } = unit;
  return rest;
}
/** Accepted damage clears references immediately, including friendly missiles defeating the taunter. */
export function clearDefeatedTaunts(units: readonly UnitState[], events: BattleEvent[]): UnitState[] {
  return units.map(u=>{
    if (u.tauntedBy===undefined || tauntSource(u,units)) return u;
    events.push({type:'tauntExpired',unitId:u.id,sourceId:u.tauntedBy});
    return removeTaunt(u);
  });
}
function rangerSource(unit: UnitState, units: readonly UnitState[], sourceId: number | undefined): UnitState | undefined {
  return unit.hp > 0 && unit.side === 'enemy' ? units.find(source => source.id === sourceId &&
    source.hp > 0 && source.side === 'player' && source.defId === 'ranger') : undefined;
}
export const markSource = (unit: UnitState, units: readonly UnitState[]) => rangerSource(unit, units, unit.markedBy);
export const movementBlockSource = (unit: UnitState, units: readonly UnitState[]) => rangerSource(unit, units, unit.pinnedBy);
export function removeMark(unit: UnitState): UnitState {
  const { markedBy, ...rest } = unit;
  return rest;
}
export function removePin(unit: UnitState): UnitState {
  const { pinnedBy, ...rest } = unit;
  return rest;
}
/** All damage paths clean target/source defeat before adopting the next validated snapshot. */
export function clearDefeatedRangerEffects(units: readonly UnitState[], events: BattleEvent[]): UnitState[] {
  return units.map(unit => {
    if (unit.markedBy !== undefined && !markSource(unit, units)) {
      events.push({ type: 'markExpired', unitId: unit.id, sourceId: unit.markedBy });
      unit = removeMark(unit);
    }
    if (unit.pinnedBy !== undefined && !movementBlockSource(unit, units)) {
      events.push({ type: 'pinExpired', unitId: unit.id, sourceId: unit.pinnedBy });
      unit = removePin(unit);
    }
    return unit;
  });
}
/** Aggregate readers retain encounter-entry bounds except for this bounded, spent heal. */
export function encounterHpLimit(unit: {readonly defId:HeroId;readonly secondWindUsed?:true}, entryHp: number, catalog: ContentCatalog): number {
  if (entryHp===0) return 0;
  const stats=catalog.heroes[unit.defId].stats;
  const heal=Object.values(catalog.abilities).find(a=>a.kind==='secondWind' && a.owners.includes(unit.defId));
  return Math.min(stats.maxHp,entryHp+(unit.secondWindUsed && heal?.kind==='secondWind'?heal.healBase+stats.power:0));
}
