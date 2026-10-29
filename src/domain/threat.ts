import type { ContentCatalog } from '../content/types';
import { readBattleState } from './battle';
import { previewAttack } from './combat';
import { moveUnit, previewMovement } from './grid';
import type { BattleState, Rejection } from './types';

/** Present-state potential attacks against living heroes, not a prediction of AI choice. */
export function enemyThreats(input: BattleState, catalog: ContentCatalog): { readonly ok: true; readonly targets: readonly number[] } | Rejection {
  const checked = readBattleState(input, catalog);
  if (!checked.ok) return checked;
  const state = checked.state;
  if (state.outcome !== 'ongoing') return { ok: true, targets: [] } as const;
  const targets = new Set<number>();
  for (const enemy of state.units) {
    if (enemy.side !== 'enemy' || enemy.hp === 0 || enemy.hasActed) continue;
    // Only change the decision owner in this disposable copy. Budgets and
    // statuses are retained; the real initiative and RNG never change.
    const hypothetical = { ...state, activeIndex: state.initiative.indexOf(enemy.id) };
    const positions = [hypothetical];
    const reach = previewMovement(hypothetical, enemy.id, catalog);
    if (reach.ok) for (const {cell, cost} of reach.cells) {
      if (!cost) continue;
      const result = moveUnit(hypothetical, {type:'move', unitId:enemy.id, to:cell}, catalog);
      if (result.ok) positions.push(result.state);
    }
    const abilities = Object.values(catalog.abilities).filter(a => a.kind === 'attack' && a.owners.includes(enemy.defId));
    for (const position of positions) for (const hero of state.units) {
      if (hero.side !== 'player' || hero.hp === 0 || targets.has(hero.id)) continue;
      if (abilities.some(ability => previewAttack(position, {type:'useAbility', unitId:enemy.id, abilityId:ability.id, target:{unitId:hero.id}}, catalog).ok)) targets.add(hero.id);
    }
  }
  return { ok: true, targets: [...targets].sort((a,b) => a-b) } as const;
}
