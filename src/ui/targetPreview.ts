import type { CellPosition } from '../content/types';
import type { BattleSession } from '../app/BattleSession';
import { actionCommand, type Action } from './hud';

export interface TargetOverlay {
  readonly cell: CellPosition;
  readonly valid: boolean;
  readonly selected: boolean;
  readonly reason: string | null;
}

/** Presentation only: use the same preview as confirmation, without preparing a command or drawing RNG. */
export function targetOverlays(session: BattleSession, action: Action | null, selected: CellPosition | null): TargetOverlay[] {
  if (session.phase !== 'player' || !action || action === 'move' || session.active.hasActed) return [];
  const cells = session.state.units.filter(unit => unit.hp > 0 && unit.side !== session.active.side).map(unit => unit.cell);
  if (selected && !cells.some(cell => cell.x === selected.x && cell.y === selected.y)) cells.push(selected);
  return cells.map(cell => {
    const command = actionCommand(session, action, cell);
    const preview = command ? session.preview(command) : null;
    return { cell, valid: preview?.ok === true,
      selected: cell.x === selected?.x && cell.y === selected.y,
      reason: preview?.ok ? null : preview?.reason ?? 'missingTarget' };
  });
}
