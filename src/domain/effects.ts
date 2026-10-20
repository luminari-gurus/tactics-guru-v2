import { GUARDED_STRIKE_TRADEOFF } from '../content/constants';
import type { ContentCatalog } from '../content/types';
import type { UnitState } from './types';

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
