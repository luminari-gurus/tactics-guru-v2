import type { ContentCatalog } from '../content/types';
import { readBattleState } from './battle';
import { previewAbility } from './combat';
import { moveUnit, previewMovement } from './grid';
import type { BattleState, Rejection } from './types';

export type Threat = { readonly targetId: number; readonly enemyIds: readonly number[] };

/** Present-state potential attacks against living heroes, not a prediction of AI choice. */
export function enemyThreats(input: BattleState, catalog: ContentCatalog): { readonly ok: true; readonly targets: readonly number[]; readonly threats: readonly Threat[] } | Rejection {
  const checked = readBattleState(input, catalog);
  if (!checked.ok) return checked;
  const state = checked.state;
  if (state.outcome !== 'ongoing') return { ok: true, targets: [], threats: [] } as const;
  const byTarget = new Map<number, Set<number>>();
  for (const enemy of state.units) {
    if (enemy.side !== 'enemy' || enemy.hp === 0) continue;
    // Starting the next turn refreshes this enemy’s action and movement budgets.
    // Pins and taunts expire at the end of the affected turn, so they remain in force.
    // No other future actions are predicted.
    const index = state.initiative.indexOf(enemy.id);
    if (index < 0) continue;
    const hypothetical: BattleState = { ...state, activeIndex: index,
      units: state.units.map(u => u.id === enemy.id ? {...u,hasMoved:false,hasActed:false} : u) };
    const positions = [hypothetical];
    const reach = previewMovement(hypothetical, enemy.id, catalog);
    if (reach.ok) for (const {cell, cost} of reach.cells) {
      if (!cost) continue;
      const result = moveUnit(hypothetical, {type:'move', unitId:enemy.id, to:cell}, catalog);
      if (result.ok) positions.push(result.state);
    }
    const abilities = Object.values(catalog.abilities).filter(a => (a.kind === 'attack' || a.kind === 'weakeningHex') && a.owners.includes(enemy.defId));
    for (const position of positions) for (const hero of state.units) {
      if (hero.side !== 'player' || hero.hp === 0 || byTarget.get(hero.id)?.has(enemy.id)) continue;
      if (abilities.some(ability => previewAbility(position, {type:'useAbility', unitId:enemy.id, abilityId:ability.id, target:{unitId:hero.id}}, catalog).ok)) {
        const enemies = byTarget.get(hero.id) ?? new Set<number>();
        enemies.add(enemy.id);
        byTarget.set(hero.id, enemies);
      }
    }
  }
  const threats = [...byTarget].sort(([a],[b]) => a-b).map(([targetId,enemies]) =>
    ({targetId,enemyIds:[...enemies].sort((a,b) => a-b)}));
  return { ok: true, targets: threats.map(threat => threat.targetId), threats } as const;
}
