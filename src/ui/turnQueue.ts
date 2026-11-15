import { RULE_BOUNDS } from '../domain/constants';
import type { BattleState, UnitState } from '../domain/types';

export type TurnQueueEntry =
  | { readonly kind: 'unit'; readonly unit: UnitState; readonly current: boolean; readonly round: number }
  | { readonly kind: 'round'; readonly round: number };

/**
 * Read one cycle of living actors from a validated battle snapshot. Initiative is
 * already authoritative: this projection neither rolls nor sorts it. The boundary
 * stays visible even when every next-round actor in this cycle has been defeated.
 */
export function turnQueue(state: BattleState): readonly TurnQueueEntry[] {
  if (state.outcome !== 'ongoing') return [];
  const units = new Map(state.units.map(unit => [unit.id, unit]));
  const entries: TurnQueueEntry[] = [];
  let round = state.round;
  for (let offset = 0; offset < state.initiative.length; offset++) {
    const index = (state.activeIndex + offset) % state.initiative.length;
    if (offset > 0 && index === 0) {
      if (round === RULE_BOUNDS.round.max) break;
      entries.push({ kind: 'round', round: ++round });
    }
    const unit = units.get(state.initiative[index])!;
    if (unit.hp > 0) entries.push({ kind: 'unit', unit, current: offset === 0, round });
  }
  if (state.activeIndex === 0 && round < RULE_BOUNDS.round.max) {
    entries.push({ kind: 'round', round: round + 1 });
  }
  return entries;
}
