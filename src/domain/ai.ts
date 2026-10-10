import type { CellPosition, ContentCatalog } from '../content/types';
import { previewCommand, readBattleState } from './battle';
import { previewAttack, type AttackPreview } from './combat';
import { D20_SIDES, NATURAL_AUTO_MISS, NATURAL_CRITICAL } from './constants';
import { moveUnit, previewMovement } from './grid';
import { manhattanDistance } from './targeting';
import { dispatch } from './turns';
import type { BattleEvent, BattleState, Command, Rejection } from './types';

export type EnemyRejection = Rejection | { readonly ok: false; readonly reason: 'notEnemyUnit' };
export type EnemyPlan = { readonly ok: true; readonly commands: readonly Command[] } | EnemyRejection;
export type EnemyRun = ({ readonly ok: true; readonly state: BattleState } |
  (EnemyRejection & { readonly state: BattleState | undefined })) &
  { readonly commands: readonly Command[]; readonly events: readonly BattleEvent[] };

/** The shared reader requires ID order; accept equivalent permutations without mutating the caller's units. */
function readEnemyState(input: unknown, catalog: ContentCatalog) {
  if (input === null || typeof input !== 'object' || !('units' in input) || !Array.isArray(input.units) ||
    !input.units.every(u => u !== null && typeof u === 'object' && typeof u.id === 'number'))
    return { ok: false, reason: 'invalidState' } as const;
  return readBattleState({ ...input, units: [...input.units].sort((a, b) => a.id - b.id) }, catalog);
}
type Position = { readonly cell: CellPosition; readonly cost: number; readonly state: BattleState; readonly move?: Command };
type AttackCandidate = Position & { readonly command: Extract<Command, { type: 'useAbility' }>; readonly score: number; readonly targetId: number };
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const cellOrder = (a: Position, b: Position) => a.cell.y - b.cell.y || a.cell.x - b.cell.x;
/** Sum damage across all equally likely d20 faces. Previews supply every combat modifier; no RNG is drawn. */
function damageScore(preview: AttackPreview): number {
  let score = 0;
  for (let natural = 1; natural <= D20_SIDES; natural++) {
    if (natural === NATURAL_CRITICAL) score += preview.criticalDamage;
    else if (natural !== NATURAL_AUTO_MISS && natural + preview.bonus >= preview.armorClass) score += preview.damage;
  }
  return score;
}
const attackOrder = (a: AttackCandidate, b: AttackCandidate) => b.score - a.score || a.cost - b.cost ||
  a.targetId - b.targetId || lexical(a.command.abilityId, b.command.abilityId) || cellOrder(a, b);

/** At most one move, one ordinary attack, and Wait. Hypothetical moves use the same resolver as real moves. */
export function planEnemyTurn(input: unknown, unitId: number, catalog: ContentCatalog): EnemyPlan {
  const checked = readEnemyState(input, catalog); if (!checked.ok) return checked;
  const state = checked.state;
  const wait = { type: 'endTurn', unitId } as const;
  const intent = previewCommand(state, wait, catalog); if (!intent.ok) return intent;
  const actor = state.units.find(u => u.id === unitId)!;
  if (actor.side !== 'enemy') return { ok: false, reason: 'notEnemyUnit' };
  const positions: Position[] = [{ cell: actor.cell, cost: 0, state }];
  if (!actor.hasMoved) {
    const reachable = previewMovement(state, unitId, catalog); if (!reachable.ok) return reachable;
    for (const { cell, cost } of reachable.cells) {
      if (cost === 0) continue;
      const move = { type: 'move', unitId, to: cell } as const;
      const moved = moveUnit(state, move, catalog);
      if (moved.ok) positions.push({ cell, cost, state: moved.state, move });
    }
  }
  const targets = state.units.filter(u => u.side === 'player' && u.hp > 0).sort((a, b) => a.id - b.id);
  const abilities = Object.values(catalog.abilities).filter(a => a.kind === 'attack' && a.owners.includes(actor.defId))
    .sort((a, b) => lexical(a.id, b.id));
  const attacks: AttackCandidate[] = [];
  if (!actor.hasActed) for (const position of positions) for (const target of targets) for (const ability of abilities) {
    const command = { type: 'useAbility', unitId, abilityId: ability.id, target: { unitId: target.id } } as const;
    const preview = previewAttack(position.state, command, catalog);
    if (preview.ok) attacks.push({ ...position, command, score: damageScore(preview), targetId: target.id });
  }
  const best = attacks.sort(attackOrder)[0];
  if (best) return { ok: true, commands: [...(best.move ? [best.move] : []), best.command, wait] };
  const nearest = (cell: CellPosition) => targets.map(target => ({ distance: manhattanDistance(cell, target.cell), targetId: target.id }))
    .sort((a, b) => a.distance - b.distance || a.targetId - b.targetId)[0];
  const originDistance = nearest(actor.cell).distance;
  const closer = positions.filter(p => p.move).map(p => ({ ...p, ...nearest(p.cell) }))
    .filter(p => p.distance < originDistance)
    .sort((a, b) => a.distance - b.distance || a.cost - b.cost || a.targetId - b.targetId || cellOrder(a, b))[0];
  if (closer) return { ok: true, commands: [closer.move!, wait] };
  return { ok: true, commands: [wait] };
}

/** A rejection reports the accepted prefix. The caller adopts that snapshot and records only accepted commands. */
export function runEnemyTurn(input: unknown, unitId: number, catalog: ContentCatalog): EnemyRun {
  const checked = readEnemyState(input, catalog);
  if (!checked.ok) return { ...checked, state: undefined, commands: [], events: [] };
  const plan = planEnemyTurn(checked.state, unitId, catalog);
  if (!plan.ok) return { ...plan, state: checked.state, commands: [], events: [] };
  let state = checked.state;
  const commands: Command[] = [], events: BattleEvent[] = [];
  for (const command of plan.commands) {
    const result = dispatch(state, command, catalog);
    if (!result.ok) return { ...result, state, commands, events };
    state = result.state; commands.push(command); events.push(...result.events);
    if (state.outcome !== 'ongoing') break;
  }
  return { ok: true, state, commands, events };
}
