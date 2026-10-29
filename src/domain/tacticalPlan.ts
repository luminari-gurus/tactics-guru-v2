import type { ContentCatalog } from '../content/types';
import { previewAbility } from './combat';
import { moveUnit } from './grid';
import type { BattleState, Command } from './types';

type Move = Extract<Command, { type: 'move' }>;
type Ability = Extract<Command, { type: 'useAbility' }>;

/** Check both components against one snapshot without changing it or drawing RNG. */
export function previewTacticalPlan(state: BattleState, move: Move, ability: Ability, catalog: ContentCatalog) {
  if (move.unitId !== ability.unitId) return { ok: false, reason: 'notActiveUnit' } as const;
  const moved = moveUnit(state, move, catalog);
  if (!moved.ok) return moved;
  const preview = previewAbility(moved.state, ability, catalog);
  if (!preview.ok) return preview;
  return { ok: true, move, ability, preview } as const;
}
