import type { AbilityId, CellPosition } from '../content/types';
import type { Point } from '../geometry/iso';
import { displayName, previewText } from './hud';
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
  private holdOrigin: Point = { x: 0, y: 0 };
  private cell: CellPosition | null = null;
  mode: 'hold' | 'tap' | null = null;
  private aimed: RadialSliceId | 'hub' = 'hub';
  private subOpen = false;
  private leftHub = false;
  private readonly onCommit: (cell: CellPosition, slice: RadialSliceId, abilityId?: AbilityId) => void;
  private readonly onInspect: () => void;
  private readonly onPlan: () => void;
  private readonly onCancel: () => void;
  constructor(
    private readonly selection: BattleSelection,
    callbacks: {
      commit: (cell: CellPosition, slice: RadialSliceId, abilityId?: AbilityId) => void;
      inspect: () => void;
      plan: () => void;
      cancel: () => void;
    },
  ) {
    this.onCommit = callbacks.commit;
    this.onInspect = callbacks.inspect;
    this.onPlan = callbacks.plan;
    this.onCancel = callbacks.cancel;
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
      button.addEventListener('click', () => {
        if (this.mode !== 'tap' || button.disabled) return;
        this.activate(button.dataset.slice as RadialSliceId);
      }, { signal });
      button.addEventListener('pointerenter', () => {
        if (this.open && !button.disabled) this.aim(button.dataset.slice as RadialSliceId);
      }, { signal });
    });
    this.root.querySelector('#battle-radial-hub')!.addEventListener('click', () => {
      if (this.mode === 'tap') this.cancel();
    }, { signal });
  }

  get open(): boolean { return !this.root.hidden; }

  show(cell: CellPosition, options: RadialOpenOptions): void {
    this.cell = cell;
    this.mode = options.mode;
    this.subOpen = false;
    this.leftHub = false;
    this.root.hidden = false;
    const def = this.selection.planning && this.selection.planMove ? 'attack' : this.selection.defaultSlice(cell);
    // Render first: fitted labels can change the Plan control's height.
    this.aim(def);
    const marginX = this.root.offsetWidth / 2 + 2;
    const marginY = this.root.offsetHeight / 2 + 2;
    const plan = this.root.querySelector<HTMLElement>('#battle-radial-plan')!;
    const bottomMargin = this.root.offsetHeight / 2 + 14 + Math.ceil(plan.getBoundingClientRect().height);
    // Keep the initial press as the hold cancel point even when the visible disk is clamped.
    this.holdOrigin = options.origin;
    const origin = {
      x: Math.min(innerWidth - marginX, Math.max(marginX, options.origin.x)),
      y: Math.min(innerHeight - bottomMargin, Math.max(marginY, options.origin.y)),
    };
    this.origin = origin;
    this.root.style.left = `${origin.x}px`;
    this.root.style.top = `${origin.y}px`;
    const live = document.querySelector('#battle-preview');
    if (live) live.textContent = this.announce();
    if (options.mode === 'tap') {
      const focusId = def === 'plan' ? 'battle-radial-plan' : `battle-radial-${def}`;
      this.root.querySelector<HTMLButtonElement>(`#${focusId}:not(:disabled)`)?.focus();
    }
  }

  aimAt(point: Point): void {
    if (!this.open || !this.cell) return;
    const dx = point.x - this.origin.x, dy = point.y - this.origin.y;
    const slice = this.sliceAt(point);
    const cardinal = cardinalFromVector(dx, dy);
    const inPressHub = this.inPressHub(point);
    if (inPressHub || (cardinal === 'hub' && slice !== 'plan')) {
      this.aim('hub');
      return;
    }
    this.leftHub = true;
    if (this.subOpen) {
      const chip = this.chipAt(point);
      if (chip) { this.highlightChip(chip); return; }
    }
    this.aim(slice ?? CARDINAL_SLICE[cardinal === 'hub' ? 's' : cardinal]);
  }

  releaseAt(point: Point): 'commit' | 'cancel' | 'open-sub' | 'inspect' | 'plan' | 'none' {
    if (!this.open || !this.cell) return 'none';
    const dx = point.x - this.origin.x, dy = point.y - this.origin.y;
    const slice = this.sliceAt(point);
    const inHub = this.inPressHub(point)
      || (hubContains(dx, dy) && slice !== 'plan');
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
    const shifted = this.origin.x !== this.holdOrigin.x || this.origin.y !== this.holdOrigin.y;
    return hubContains(point.x - this.holdOrigin.x, point.y - this.holdOrigin.y, shifted ? 12 : 44);
  }

  private defaultId(): RadialSliceId {
    return this.cell ? (this.selection.planning && this.selection.planMove ? 'attack' : this.selection.defaultSlice(this.cell)) : 'move';
  }

  private announce(): string {
    const slice = this.slices().find(entry => entry.id === (this.aimed === 'hub' ? this.defaultId() : this.aimed));
    const cell = this.cell;
    return cell ? `Cell (${cell.x}, ${cell.y}). ${slice ? `${slice.label}: ${slice.detail}` : 'Choose an action'}` : 'Choose an action';
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
  }

  private activate(slice: RadialSliceId): 'commit' | 'cancel' | 'open-sub' | 'inspect' | 'plan' | 'none' {
    if (!this.cell) return 'none';
    const view = this.slices().find(entry => entry.id === slice);
    if (!view || view.disabled) return 'none';
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
    if (this.selection.planning && this.selection.planMove) {
      this.paintHub(displayName(abilityId), 'Choose a target');
      return;
    }
    const preview = previewAction(this.selection.session, abilityId, this.cell, this.selection.planMove).preview;
    const lines = uniqueHubLines(displayName(abilityId), preview ? previewText(preview) : '', preview && !preview.ok ? previewText(preview) : null, Boolean(preview && !preview.ok));
    this.paintHub(lines.title, lines.subtitle);
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
    }
    const sub = this.root.querySelector<HTMLElement>('#battle-radial-sub')!;
    const specials = selectableSpecials(this.selection.session, this.cell, this.selection.planMove);
    const followUp = Boolean(this.selection.planning && this.selection.planMove);
    sub.hidden = !this.subOpen || specials.length < 2;
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
        button.addEventListener('click', () => { if (this.mode === 'tap') this.pickSpecial(ability.id); });
        return button;
      }));
      // Keep choices clear of Special: a hold release there must not select a chip.
      const root = this.root.getBoundingClientRect();
      const width = sub.offsetWidth, height = sub.offsetHeight;
      const left = root.right + 6 + width <= innerWidth ? root.right + 6 : Math.max(0, root.left - width - 6);
      sub.style.left = `${left - root.left}px`;
      sub.style.top = `${Math.max(0, Math.min(innerHeight - height, root.top + 8)) - root.top}px`;
    }
    this.writeHub(this.aimed);
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
