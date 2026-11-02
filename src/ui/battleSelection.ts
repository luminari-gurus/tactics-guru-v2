import type { AbilityId, CellPosition } from '../content/types';
import type { BattleSession } from '../app/BattleSession';
import type { Command } from '../domain/types';
import { previewMovement } from '../domain/grid';
import { previewTacticalPlan } from '../domain/tacticalPlan';
import { actionCommand, friendlyFire, ownedAbilities, type Action } from './battleActions';
import { previewText, displayName } from './hud';
import { targetOverlays } from './targetPreview';
import type { RadialSliceId } from './radialGesture';

export type RadialSubject = 'empty' | 'enemy' | 'self' | 'ally';

export interface RadialSliceView {
  readonly id: RadialSliceId;
  readonly label: string;
  readonly detail: string;
  readonly disabled: boolean;
  readonly reason: string | null;
  readonly isDefault: boolean;
}

function sameCell(a: CellPosition | null, b: CellPosition | null): boolean {
  return a?.x === b?.x && a?.y === b?.y;
}

function occupant(session: BattleSession, cell: CellPosition) {
  const units = session.state.units.filter(u => u.cell.x === cell.x && u.cell.y === cell.y);
  return units.find(u => u.hp > 0) ?? units[0] ?? null;
}

export function classifyCell(session: BattleSession, cell: CellPosition): RadialSubject {
  const unit = occupant(session, cell);
  if (!unit || unit.hp <= 0) return 'empty';
  if (unit.id === session.active.id) return 'self';
  return unit.side === session.active.side ? 'ally' : 'enemy';
}

export function cellReachable(session: BattleSession, cell: CellPosition): boolean {
  const reach = session.phase === 'player' ? previewMovement(session.state, session.active.id, session.catalog) : null;
  return Boolean(reach?.ok && reach.cells.some(entry => sameCell(entry.cell, cell) && entry.cost > 0));
}

export function previewAction(session: BattleSession, action: Action, cell: CellPosition, planMove: Extract<Command, { type: 'move' }> | null = null) {
  const command = actionCommand(session, action, cell);
  if (!command) return { command: null, preview: null as ReturnType<BattleSession['preview']> | null };
  if (planMove && command.type === 'useAbility') {
    const planned = previewTacticalPlan(session.state, planMove, command, session.catalog);
    return { command, preview: planned.ok ? planned.preview : planned };
  }
  return { command, preview: session.preview(command) };
}

export function legalSpecials(session: BattleSession, cell: CellPosition, planMove: Extract<Command, { type: 'move' }> | null = null) {
  return ownedAbilities(session).filter(ability => previewAction(session, ability.id, cell, planMove).preview?.ok === true);
}

/** Shared action/target model. HUD skins are views; session calls stay authoritative. */
export class BattleSelection {
  selectedCell: CellPosition | null = null;
  selectedAction: Action | null = null;
  planning = false;
  planMove: Extract<Command, { type: 'move' }> | null = null;
  showDanger = false;
  message = 'Choose an action and target';
  followUp: Action | null = null;
  private initializedTurn: { round: number; unitId: number } | null = null;
  private readonly lastSpecial = new Map<number, AbilityId>();

  constructor(readonly session: BattleSession) {}

  get preview() {
    if (this.session.pendingPlan) return previewTacticalPlan(this.session.state, this.session.pendingPlan.move, this.session.pendingPlan.ability, this.session.catalog);
    if (this.session.pending) return this.session.preview(this.session.pending);
    return null;
  }

  applyTurnDefault(): void {
    const s = this.session;
    if (s.phase !== 'player') return;
    if (this.initializedTurn?.round === s.state.round && this.initializedTurn.unitId === s.active.id) return;
    this.initializedTurn = { round: s.state.round, unitId: s.active.id };
    if (previewMovement(s.state, s.active.id, s.catalog).ok) {
      this.selectedAction = 'move';
      this.message = 'Select a destination';
    }
  }

  clear(preserveQueued = false): void {
    if (preserveQueued) this.session.clearPrepared();
    else this.session.cancel();
    this.planning = false;
    this.planMove = null;
    this.followUp = null;
    this.selectedAction = null;
    this.message = 'Choose an action and target';
  }

  setAction(action: Action): void {
    this.session.cancel();
    if (this.planning && action !== 'move' && !this.planMove) {
      this.message = 'Choose a reachable move destination first';
      return;
    }
    if (this.planning && action === 'move') this.planMove = null;
    if (this.planning && action !== 'move') this.selectedCell = null;
    this.selectedAction = action;
    this.message = 'Select a target';
    if (this.selectedCell) this.applyCell(this.selectedCell);
  }

  selectCell(cell: CellPosition | null): void {
    this.session.cancel();
    this.selectedCell = cell;
    this.followUp = null;
    if (cell && this.selectedAction) this.applyCell(cell);
    else if (!cell) {
      this.message = this.selectedAction === 'move' ? 'Select a destination'
        : this.selectedAction ? 'Select a target' : 'Choose an action and target';
    }
  }

  applyCell(cell: CellPosition): void {
    const command = this.selectedAction ? actionCommand(this.session, this.selectedAction, cell) : null;
    this.message = command ? this.describe(command) : 'Unavailable: choose a living target';
  }

  describe(command: Command): string {
    if (this.planning && command.type === 'move') {
      const result = this.session.preview(command);
      this.planMove = result.ok ? command : null;
      return result.ok ? 'Move planned. Choose an ability and target.' : previewText(result);
    }
    const plan = this.planning && this.planMove && command.type === 'useAbility' ? this.session.preparePlan(this.planMove, command) : null;
    const text = plan
      ? (plan.ok ? `Move to (${this.planMove!.to.x}, ${this.planMove!.to.y}) + ability · ${previewText(plan.preview)}` : previewText(plan))
      : previewText(this.session.prepare(command));
    if (command.type !== 'useAbility') return text;
    const ability = this.session.catalog.abilities[command.abilityId];
    const effect = ability.kind === 'guardedAttack' ? ` · −${ability.attackPenalty} attack / +${ability.armorClassBonus} AC until your next turn` : '';
    return `${friendlyFire(this.session, command)}${text} · range ${ability.rangeMin}–${ability.rangeMax}${effect}`;
  }

  rememberSpecial(id: AbilityId): void { this.lastSpecial.set(this.session.active.id, id); }

  lastUsedSpecial(): AbilityId | null {
    const owned = ownedAbilities(this.session);
    const last = this.lastSpecial.get(this.session.active.id);
    if (last && owned.some(ability => ability.id === last)) return last;
    return owned[0]?.id ?? null;
  }

  startPlan(): void {
    this.session.cancel();
    this.planning = true;
    this.planMove = null;
    this.followUp = null;
    this.selectedAction = 'move';
    this.selectedCell = null;
    this.message = 'Choose a reachable move destination';
  }

  choosePlanDestination(cell: CellPosition): boolean {
    this.selectedAction = 'move';
    this.selectedCell = cell;
    this.applyCell(cell);
    return this.planMove !== null;
  }

  armFollowUp(action: Action): void {
    this.followUp = action;
    this.selectedAction = action;
    this.message = action === 'basic' ? 'Tap an enemy to attack after the planned move' : 'Tap a target for the planned ability';
  }

  toggleDanger(): void { this.showDanger = !this.showDanger; }

  endTurn(): void {
    this.session.prepare({ type: 'endTurn', unitId: this.session.active.id });
  }

  canConfirm(): boolean { return Boolean(this.session.pending || this.session.pendingPlan); }

  defaultSlice(cell: CellPosition): RadialSliceId {
    const subject = classifyCell(this.session, cell);
    if (subject === 'enemy') return 'attack';
    if (subject === 'self' || subject === 'ally') return 'inspect';
    return 'move';
  }

  slices(cell: CellPosition): RadialSliceView[] {
    const s = this.session;
    const actor = s.active;
    const subject = classifyCell(s, cell);
    const reachable = cellReachable(s, cell);
    const standing = sameCell(cell, actor.cell);
    const followUp = this.planning && this.planMove !== null;
    const specials = followUp ? ownedAbilities(s) : legalSpecials(s, cell, this.planMove);
    const last = specials.find(ability => ability.id === this.lastUsedSpecial()) ?? specials[0];
    const movement = s.phase === 'player' ? previewMovement(s.state, actor.id, s.catalog) : null;
    const movePreview = previewAction(s, 'move', cell);
    const attackPreview = previewAction(s, 'basic', cell, this.planMove);
    const inspectUnit = occupant(s, cell);
    const moveDisabled = actor.hasMoved || (!reachable && !standing) || !movement?.ok;
    const attackDisabled = actor.hasActed || (!followUp && (subject !== 'enemy' || attackPreview.preview?.ok !== true));
    const specialDisabled = actor.hasActed || specials.length === 0;
    const inspectLabel = inspectUnit ? displayName(inspectUnit.defId) : 'Empty tile';
    const defaultId = this.planning && this.planMove ? 'attack' : this.defaultSlice(cell);
    const moveReason = actor.hasMoved ? 'Movement spent' : !movement?.ok ? 'No legal move' : !reachable && !standing ? 'Not reachable' : null;
    const attackReason = actor.hasActed ? 'Action spent' : followUp ? null : subject !== 'enemy' ? 'Need an enemy' : attackPreview.preview && !attackPreview.preview.ok ? previewText(attackPreview.preview) : null;
    const specialReason = actor.hasActed ? 'Action spent' : specials.length === 0 ? (followUp ? 'No owned special' : subject === 'enemy' ? 'No legal special' : 'Need a legal target') : null;
    const planDisabled = actor.hasMoved || actor.hasActed || !movement?.ok;
    return [
      {
        id: 'attack', label: 'Attack',
        detail: attackPreview.preview?.ok ? previewText(attackPreview.preview) : (attackReason ?? 'Need an enemy'),
        disabled: attackDisabled, reason: attackDisabled ? attackReason : null, isDefault: defaultId === 'attack',
      },
      {
        id: 'special', label: last ? displayName(last.id) : 'Special',
        detail: specials.length ? `${specials.length} legal${last ? ` · ${displayName(last.id)}` : ''}` : (specialReason ?? 'Unavailable'),
        disabled: specialDisabled, reason: specialDisabled ? specialReason : null, isDefault: defaultId === 'special',
      },
      {
        id: 'inspect', label: 'Inspect', detail: inspectLabel,
        disabled: false, reason: null, isDefault: defaultId === 'inspect',
      },
      {
        id: 'move', label: 'Move',
        detail: movePreview.preview?.ok ? previewText(movePreview.preview) : (moveReason ?? 'Unavailable'),
        disabled: moveDisabled, reason: moveDisabled ? moveReason : null, isDefault: defaultId === 'move',
      },
      {
        id: 'plan', label: 'Plan move', detail: planDisabled ? 'Unavailable' : 'Move then ability',
        disabled: planDisabled, reason: planDisabled ? (actor.hasMoved || actor.hasActed ? 'Budgets spent' : 'No legal move') : null,
        isDefault: false,
      },
    ];
  }

  aimSlice(cell: CellPosition, slice: RadialSliceId): { ok: boolean; message: string; commit: boolean } {
    const view = this.slices(cell).find(entry => entry.id === slice);
    if (!view || view.disabled) return { ok: false, message: view?.reason ?? 'Unavailable', commit: false };
    this.selectedCell = cell;
    if (slice === 'inspect' || slice === 'plan') return { ok: true, message: view.detail, commit: false };
    if (slice === 'move') {
      this.selectedAction = 'move';
      this.applyCell(cell);
      return { ok: this.canConfirm(), message: this.message, commit: this.canConfirm() };
    }
    if (slice === 'attack') {
      if (this.planning && this.planMove) {
        this.armFollowUp('basic');
        return { ok: true, message: this.message, commit: false };
      }
      this.selectedAction = 'basic';
      this.applyCell(cell);
      return { ok: this.canConfirm(), message: this.message, commit: this.canConfirm() };
    }
    const specials = legalSpecials(this.session, cell, this.planMove);
    const chosen = specials.find(ability => ability.id === this.lastUsedSpecial()) ?? specials[0];
    if (!chosen) return { ok: false, message: 'No legal special', commit: false };
    if (this.planning && this.planMove && chosen.kind !== 'secondWind') {
      this.armFollowUp(chosen.id);
      return { ok: true, message: this.message, commit: false };
    }
    this.selectedAction = chosen.id;
    this.applyCell(cell);
    if (this.canConfirm()) this.rememberSpecial(chosen.id);
    return { ok: this.canConfirm(), message: this.message, commit: this.canConfirm() };
  }

  commitSpecial(cell: CellPosition, abilityId: AbilityId): { ok: boolean; message: string; commit: boolean } {
    const legal = legalSpecials(this.session, cell, this.planMove).some(ability => ability.id === abilityId);
    if (!legal) return { ok: false, message: 'Unavailable', commit: false };
    this.selectedCell = cell;
    if (this.planning && this.planMove && this.session.catalog.abilities[abilityId]?.kind !== 'secondWind') {
      this.armFollowUp(abilityId);
      this.rememberSpecial(abilityId);
      return { ok: true, message: this.message, commit: false };
    }
    this.selectedAction = abilityId;
    this.applyCell(cell);
    if (this.canConfirm()) this.rememberSpecial(abilityId);
    return { ok: this.canConfirm(), message: this.message, commit: this.canConfirm() };
  }

  overlays() {
    return targetOverlays(this.session, this.selectedAction, this.selectedCell, this.planning ? this.planMove : null);
  }
}
