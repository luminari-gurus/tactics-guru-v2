import type { AbilityId, CellPosition } from '../content/types';
import type { Point } from '../geometry/iso';
import { displayName, previewText, shortcutHint } from './hud';
import { BATTLE_KEYS, ownedAbilities, type Action } from './battleActions';
import { BattleSelection, previewAction, selectableSpecials, type RadialSliceView } from './battleSelection';
import { CARDINAL_SLICE, type RadialSliceId, cardinalFromVector, hubContains, specialSliceActivation } from './radialGesture';
import { fitRadialLabels, stripUnavailablePrefix, uniqueHubLines } from './radialLabels';

export interface RadialOpenOptions {
  readonly mode: 'hold' | 'tap';
  readonly origin: Point;
}

/**
 * Option C overlay. Slices are real buttons; hold aiming uses coordinates because
 * the canvas still holds pointer capture.
 */
export class BattleRadial {
  readonly root: HTMLElement;
  private readonly abort = new AbortController();
  private origin: Point = { x: 0, y: 0 };
  private anchor: Point = { x: 0, y: 0 };
  private cell: CellPosition | null = null;
  mode: 'hold' | 'tap' | null = null;
  private aimed: RadialSliceId | 'hub' = 'hub';
  private subOpen = false;
  private leftHub = false;
  private readonly onCommit: (cell: CellPosition, slice: RadialSliceId, abilityId?: AbilityId) => void;
  private readonly onInspect: () => void;
  private readonly onPlan: () => void;
  private readonly onCancel: () => void;
  private readonly onPreview: () => void;
  constructor(
    private readonly selection: BattleSelection,
    callbacks: {
      commit: (cell: CellPosition, slice: RadialSliceId, abilityId?: AbilityId) => void;
      inspect: () => void;
      plan: () => void;
      cancel: () => void;
      preview: () => void;
    },
  ) {
    this.onCommit = callbacks.commit;
    this.onInspect = callbacks.inspect;
    this.onPlan = callbacks.plan;
    this.onCancel = callbacks.cancel;
    this.onPreview = callbacks.preview;
    this.root = document.createElement('div');
    this.root.id = 'battle-radial';
    this.root.hidden = true;
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', 'Battle actions');
    this.root.innerHTML = `
      <div class="battle-radial-disk" aria-hidden="true"></div>
      <button type="button" id="battle-radial-attack" class="battle-radial-slice n" data-slice="attack"><strong>Attack</strong><span></span></button>
      <button type="button" id="battle-radial-special" class="battle-radial-slice e" data-slice="special"><strong>Special</strong><span></span></button>
      <button type="button" id="battle-radial-inspect" class="battle-radial-slice s" data-slice="inspect"><strong>Inspect</strong><span></span></button>
      <button type="button" id="battle-radial-move" class="battle-radial-slice w" data-slice="move"><strong>Move</strong><span></span></button>
      <button type="button" id="battle-radial-plan" class="battle-radial-plan" data-slice="plan"><strong>Plan move</strong><span>Move then ability</span></button>
      <div id="battle-radial-hub"><strong>Choose an action</strong><span></span></div>
      <div id="battle-radial-sub" hidden></div>`;
    document.body.append(this.root);
    const signal = this.abort.signal;
    this.root.addEventListener('pointerdown', event => event.stopPropagation(), { signal });
    this.root.querySelectorAll<HTMLButtonElement>('[data-slice]').forEach(button => {
      const slice = button.dataset.slice as RadialSliceId;
      button.addEventListener('click', () => {
        if (this.mode !== 'tap' || button.disabled) return;
        this.activate(slice);
      }, { signal });
      button.addEventListener('focus', () => {
        if (this.mode === 'tap' && !button.disabled) this.aim(slice);
      }, { signal });
      // Opening or repositioning the menu can put a slice under a stationary pointer.
      button.addEventListener('pointermove', () => {
        if (this.mode === 'tap' && !button.disabled && this.aimed !== slice) button.focus({ preventScroll: true });
      }, { signal });
    });
    this.root.querySelector('#battle-radial-hub')!.addEventListener('click', () => {
      if (this.mode === 'tap') this.cancel();
    }, { signal });
  }

  get open(): boolean { return !this.root.hidden; }

  /** Aim existing controls without using their click/commit path. */
  focusShortcut(cell: CellPosition, slice: 'move' | 'attack' | 'special', origin: Point, abilityId?: AbilityId): boolean {
    if (this.selection.planning && !this.selection.planMove && slice !== 'move') return false;
    if (this.mode === 'hold' || this.selection.slices(cell).find(view => view.id === slice)?.disabled) return false;
    if (abilityId && !selectableSpecials(this.selection.session, cell, this.selection.planMove).some(ability => ability.id === abilityId)) return false;
    this.selection.session.clearPrepared();
    this.selection.selectedCell = cell;
    this.selection.followUp = null;
    if (!this.open || this.cell?.x !== cell.x || this.cell?.y !== cell.y) this.show(cell, { mode: 'tap', origin });
    this.subOpen = Boolean(abilityId);
    this.aim(slice);
    const button = abilityId
      ? this.root.querySelector<HTMLButtonElement>(`[data-radial-ability="${abilityId}"]`)
      : this.root.querySelector<HTMLButtonElement>(`[data-slice="${slice}"]`);
    if (!button || button.disabled || button.closest('[hidden]')) return false;
    button.focus();
    return true;
  }

  confirmShortcut(): boolean {
    const button = document.activeElement;
    if (!this.open || this.mode !== 'tap' || !(button instanceof HTMLButtonElement) ||
        !this.root.contains(button) || button.disabled || button.closest('[hidden]')) return false;
    if (button.dataset.slice && button.dataset.slice !== this.aimed) return false;
    if (button.dataset.radialAbility && button.getAttribute('aria-pressed') !== 'true') return false;
    button.click();
    return true;
  }

  show(cell: CellPosition, options: RadialOpenOptions): void {
    this.cell = cell;
    this.mode = options.mode;
    this.subOpen = false;
    this.leftHub = false;
    this.root.hidden = false;
    this.root.setAttribute('aria-label', `Battle actions at cell (${cell.x}, ${cell.y})`);
    const def = this.selection.planning && this.selection.planMove ? 'attack' : this.selection.defaultSlice(cell);
    // The press remains the hold cancel point even when the menu moves.
    this.anchor = options.origin;
    // Render first: fitted labels can change the Plan control's height.
    this.aim(def);
    this.reposition();
    if (options.mode === 'tap') {
      const focusId = def === 'plan' ? 'battle-radial-plan' : `battle-radial-${def}`;
      this.root.querySelector<HTMLButtonElement>(`#${focusId}:not(:disabled)`)?.focus();
    }
  }

  reposition(): void {
    if (!this.open) return;
    const marginX = this.root.offsetWidth / 2 + 2;
    const marginY = this.root.offsetHeight / 2 + 2;
    const plan = this.root.querySelector<HTMLElement>('#battle-radial-plan')!;
    const bottomMargin = this.root.offsetHeight / 2 + 14 + Math.ceil(plan.getBoundingClientRect().height);
    const board = document.querySelector('#battle-board-region')?.getBoundingClientRect();
    // Prefer the drawable board. On a board smaller than the menu, retain
    // viewport bounds so every control remains reachable.
    const left = board && board.width >= marginX * 2 ? board.left : 0;
    const right = board && board.width >= marginX * 2 ? board.right : innerWidth;
    const top = board && board.height >= marginY + bottomMargin ? board.top : 0;
    const bottom = board && board.height >= marginY + bottomMargin ? board.bottom : innerHeight;
    const origin = {
      x: Math.max(left + marginX, Math.min(right - marginX, this.anchor.x)),
      y: Math.min(bottom - bottomMargin, Math.max(top + marginY, this.anchor.y)),
    };
    this.origin = origin;
    this.root.style.left = `${origin.x}px`;
    this.root.style.top = `${origin.y}px`;
    const sub = this.root.querySelector<HTMLElement>('#battle-radial-sub')!;
    if (!sub.hidden) this.positionSubmenu(sub);
  }

  aimAt(point: Point): void {
    if (!this.open || !this.cell) return;
    const dx = point.x - this.origin.x, dy = point.y - this.origin.y;
    const slice = this.sliceAt(point);
    const cardinal = cardinalFromVector(dx, dy);
    const aim = slice ?? (cardinal === 'hub' ? 'hub' : CARDINAL_SLICE[cardinal]);
    if (this.inPressHub(point) || aim === 'hub') {
      this.aim('hub');
      return;
    }
    this.leftHub = true;
    if (this.subOpen) {
      const chip = this.chipAt(point);
      if (chip) { this.highlightChip(chip); return; }
    }
    this.aim(aim);
  }

  releaseAt(point: Point): 'commit' | 'cancel' | 'open-sub' | 'inspect' | 'plan' | 'none' {
    if (!this.open || !this.cell) return 'none';
    const dx = point.x - this.origin.x, dy = point.y - this.origin.y;
    const slice = this.sliceAt(point);
    const inHub = this.inPressHub(point) || (!slice && hubContains(dx, dy));
    if (inHub) {
      if (this.leftHub || this.mode === 'tap') { this.cancel(); return 'cancel'; }
      return this.activate(this.defaultId());
    }
    if (this.subOpen) {
      const chip = this.chipAt(point);
      if (chip) { this.pickSpecial(chip); return 'commit'; }
    }
    if (slice) return this.activate(slice);
    const cardinal = cardinalFromVector(dx, dy);
    if (cardinal === 'hub') { this.cancel(); return 'cancel'; }
    return this.activate(CARDINAL_SLICE[cardinal]);
  }

  cancel(): void {
    if (!this.open) return;
    this.hide();
    this.onCancel();
  }

  hide(): void {
    const returnFocus = this.mode === 'tap';
    this.root.hidden = true;
    this.mode = null;
    this.cell = null;
    this.subOpen = false;
    this.leftHub = false;
    this.root.querySelector('#battle-radial-sub')!.replaceChildren();
    (this.root.querySelector('#battle-radial-sub') as HTMLElement).hidden = true;
    if (returnFocus) document.querySelector<HTMLElement>('canvas')?.focus();
  }

  dispose(): void {
    this.abort.abort();
    this.root.remove();
  }

  private inPressHub(point: Point): boolean {
    if (this.mode !== 'hold') return false;
    // When the disk shifts, a full-size cancel area can cover an entire slice.
    const shifted = this.origin.x !== this.anchor.x || this.origin.y !== this.anchor.y;
    return hubContains(point.x - this.anchor.x, point.y - this.anchor.y, shifted ? 12 : 44);
  }

  private defaultId(): RadialSliceId {
    return this.cell ? (this.selection.planning && this.selection.planMove ? 'attack' : this.selection.defaultSlice(this.cell)) : 'move';
  }

  private slices(): RadialSliceView[] {
    return this.cell ? this.selection.slices(this.cell) : [];
  }

  private aim(slice: RadialSliceId | 'hub'): void {
    this.aimed = slice;
    this.root.dataset.aim = slice;
    if (slice === 'special') {
      if (this.cell && this.mode === 'hold') {
        const specials = selectableSpecials(this.selection.session, this.cell, this.selection.planMove);
        if (specials.length > 1) this.subOpen = true;
      }
    } else if (slice !== 'hub') this.subOpen = false;
    this.render();
    if (slice !== 'hub') {
      if (slice === 'special' && this.cell) {
        const specials = selectableSpecials(this.selection.session, this.cell, this.selection.planMove);
        const offered = specials.find(ability => ability.id === this.selection.lastUsedSpecial()) ?? specials[0];
        if (offered) { this.highlightChip(offered.id); return; }
      }
      this.review(slice === 'move' ? 'move' : slice === 'attack' ? 'basic' : null,
        this.slices().find(view => view.id === slice)!.detail);
    } else {
      this.review(this.leftHub ? null : this.selection.selectedAction,
        this.leftHub ? 'Release to cancel · Nothing commits' : `Release to confirm · ${this.slices().find(view => view.isDefault)?.detail ?? ''}`);
    }
  }

  private activate(slice: RadialSliceId): 'commit' | 'cancel' | 'open-sub' | 'inspect' | 'plan' | 'none' {
    if (!this.cell) return 'none';
    const view = this.slices().find(entry => entry.id === slice);
    if (!view || view.disabled) {
      if (this.mode === 'hold') { this.cancel(); return 'cancel'; }
      return 'none';
    }
    if (slice === 'inspect') { this.hide(); this.onInspect(); return 'inspect'; }
    if (slice === 'plan') { this.hide(); this.onPlan(); return 'plan'; }
    if (slice === 'special') {
      const specials = selectableSpecials(this.selection.session, this.cell, this.selection.planMove);
      const kind = specialSliceActivation(specials.length);
      if (kind === 'none') return 'none';
      if (kind === 'open-sub') {
        this.subOpen = true;
        this.mode = 'tap';
        this.aim('special');
        this.root.querySelector<HTMLButtonElement>('#battle-radial-sub button:not(:disabled)')?.focus();
        return 'open-sub';
      }
      const chosen = specials.find(ability => ability.id === this.selection.lastUsedSpecial()) ?? specials[0];
      if (!chosen) return 'none';
      const cell = this.cell;
      this.hide();
      this.onCommit(cell, 'special', chosen.id);
      return 'commit';
    }
    const cell = this.cell;
    this.hide();
    this.onCommit(cell, slice);
    return 'commit';
  }

  private pickSpecial(abilityId: AbilityId): void {
    const cell = this.cell;
    if (!cell) return;
    this.hide();
    this.onCommit(cell, 'special', abilityId);
  }

  private sliceAt(point: Point): RadialSliceId | null {
    const node = document.elementFromPoint(point.x, point.y);
    const button = node?.closest<HTMLElement>('[data-slice]');
    return (button?.dataset.slice as RadialSliceId | undefined) ?? null;
  }

  private chipAt(point: Point): AbilityId | null {
    const node = document.elementFromPoint(point.x, point.y);
    const button = node?.closest<HTMLElement>('[data-radial-ability]');
    return button?.dataset.radialAbility as AbilityId | undefined ?? null;
  }

  private highlightChip(abilityId: AbilityId): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-radial-ability]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.radialAbility === abilityId));
    });
    if (!this.cell) return;
    const self = this.selection.session.catalog.abilities[abilityId]?.kind === 'secondWind';
    if (this.selection.planning && this.selection.planMove && !self) {
      this.paintHub(displayName(abilityId), 'Choose a target');
      this.review(abilityId, `${displayName(abilityId)} · Choose a target`);
      return;
    }
    const {command, preview} = previewAction(this.selection.session, abilityId,
      self ? this.selection.session.active.cell : this.cell, this.selection.planMove);
    const lines = uniqueHubLines(displayName(abilityId), preview ? previewText(preview) : '', preview && !preview.ok ? previewText(preview) : null, Boolean(preview && !preview.ok));
    this.paintHub(lines.title, lines.subtitle);
    const prefix = this.selection.planning && this.selection.planMove
      ? `Move to (${this.selection.planMove.to.x}, ${this.selection.planMove.to.y}) + ability`
      : displayName(abilityId);
    const text = `${prefix} · ${preview ? previewText(preview) : 'Unavailable target'}`;
    this.review(abilityId, command ? this.selection.reviewText(command, text) : text);
  }

  /** The fitted hub and full HUD follow the same aim/focus in both gesture modes. */
  private review(action: Action | null, message: string): void {
    if (!this.open) return;
    if (this.selection.selectedAction !== action || action === null) this.selection.session.clearPrepared();
    this.selection.selectedAction = action;
    this.selection.message = message;
    this.onPreview();
  }

  private render(): void {
    if (!this.cell) return;
    const slices = this.slices();
    for (const view of slices) {
      const button = this.root.querySelector<HTMLButtonElement>(`[data-slice="${view.id}"]`);
      if (!button) continue;
      button.disabled = view.disabled;
      button.setAttribute('aria-pressed', String(this.aimed === view.id || (this.aimed === 'hub' && view.isDefault)));
      button.querySelector('strong')!.textContent = view.label;
      const visible = view.disabled ? stripUnavailablePrefix(view.reason ?? view.detail) : (view.id === 'plan' ? view.detail : '');
      button.querySelector('span')!.textContent = visible && visible.toLowerCase() !== view.label.toLowerCase() ? visible : '';
      const preview = view.disabled ? view.reason ?? view.detail : view.detail;
      button.setAttribute('aria-label', view.disabled ? `${view.label}, unavailable: ${preview}` : `${view.label}, ${preview}`);
      const key = view.id === 'move' ? BATTLE_KEYS.move : view.id === 'attack' ? BATTLE_KEYS.basic : view.id === 'special' ? BATTLE_KEYS.ability : null;
      if (key) shortcutHint(button, key, view.label);
    }
    const sub = this.root.querySelector<HTMLElement>('#battle-radial-sub')!;
    const specials = selectableSpecials(this.selection.session, this.cell, this.selection.planMove);
    const followUp = Boolean(this.selection.planning && this.selection.planMove);
    sub.hidden = !this.subOpen || specials.length === 0;
    this.root.dataset.subOpen = String(!sub.hidden);
    if (!sub.hidden) {
      const last = this.selection.lastUsedSpecial();
      sub.replaceChildren(...specials.map((ability, index) => {
        const preview = followUp ? null : previewAction(this.selection.session, ability.id, this.cell!, this.selection.planMove).preview;
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.radialAbility = ability.id;
        button.className = `battle-radial-sub n${index + 1}`;
        button.setAttribute('aria-pressed', String(ability.id === last || (!last && index === 0)));
        const detail = followUp ? 'Choose a target' : (preview ? previewText(preview) : '');
        button.innerHTML = `<strong>${displayName(ability.id)}</strong><span>${ability.id === last ? 'Last used' : stripUnavailablePrefix(detail)}</span>`;
        button.setAttribute('aria-label', `${displayName(ability.id)}, ${detail}`);
        const shortcutIndex = ownedAbilities(this.selection.session).findIndex(owned => owned.id === ability.id);
        if (shortcutIndex >= 0 && shortcutIndex < 9) shortcutHint(button, String(shortcutIndex + 1), displayName(ability.id));
        button.addEventListener('focus', () => this.highlightChip(ability.id));
        button.addEventListener('click', () => { if (this.mode === 'tap') this.pickSpecial(ability.id); });
        return button;
      }));
      this.positionSubmenu(sub);
    }
    this.writeHub(this.aimed);
  }

  private positionSubmenu(sub: HTMLElement): void {
    // Keep choices clear of Special: a hold release there must not select a chip.
    const root = this.root.getBoundingClientRect();
    const width = sub.offsetWidth, height = sub.offsetHeight;
    const left = root.right + 6 + width <= innerWidth ? root.right + 6 : Math.max(0, root.left - width - 6);
    sub.style.left = `${left - root.left}px`;
    sub.style.top = `${Math.max(0, Math.min(innerHeight - height, root.top + 8)) - root.top}px`;
  }

  private writeHub(slice: RadialSliceId | 'hub'): void {
    if (slice === 'hub') {
      const fallback = this.slices().find(entry => entry.isDefault);
      this.paintHub(
        this.leftHub ? 'Release to cancel' : 'Release to confirm',
        this.leftHub ? 'Nothing commits' : stripUnavailablePrefix(fallback?.detail ?? ''),
      );
      return;
    }
    const view = this.slices().find(entry => entry.id === slice);
    const lines = uniqueHubLines(view?.label ?? '', view?.detail ?? '', view?.reason ?? null, Boolean(view?.disabled));
    this.paintHub(lines.title, lines.subtitle);
  }

  private paintHub(title: string, subtitle: string): void {
    const hub = this.root.querySelector('#battle-radial-hub')!;
    hub.querySelector('strong')!.textContent = title;
    const secondary = hub.querySelector('span')!;
    secondary.textContent = subtitle;
    (secondary as HTMLElement).hidden = !subtitle;
    fitRadialLabels(this.root);
  }
}

export function clientPointFromCanvas(canvas: HTMLCanvasElement, point: Point, viewport: { width: number; height: number }): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: rect.left + point.x * rect.width / viewport.width, y: rect.top + point.y * rect.height / viewport.height };
}
