import Phaser from 'phaser';
import { battleCatalog } from '../content/catalog';
import type { CellPosition, ContentCatalog } from '../content/types';
import { createBattle, dispatch } from '../domain/turns';
import { previewMove, previewMovement } from '../domain/grid';
import type { BattleState } from '../domain/types';
import { measurements } from '../diagnostics/browser';
import { BoardRenderer } from './BoardRenderer';
import { bindBoardInput } from './BoardInput';
import { contentLoadPlan, loadContentAssets } from './contentLoading';

export const FIRST_BATTLE_MAP_ID = 'map:forest_ruins';

/** Controller owns the snapshot; renderer only presents it and reports cell selection. */
export class BattleScene extends Phaser.Scene {
  private seed = 1;

  constructor(private readonly status: (state: 'loading' | 'ready' | 'error') => void, private readonly error: (message: string) => void) {
    super('battle');
  }

  create(): void {
    this.status('loading');
    measurements.begin(performance.now());
    let catalog: ContentCatalog;
    try { catalog = contentLoadPlan(battleCatalog); }
    catch (error) { this.error(error instanceof Error ? error.message : 'Invalid battle content'); return; }
    loadContentAssets(this, catalog, () => {
      try { this.begin(catalog); }
      catch (error) { this.error(error instanceof Error ? error.message : 'Could not render battle'); }
    }, this.error);
  }

  private begin(catalog: ContentCatalog): void {
    const created = createBattle(FIRST_BATTLE_MAP_ID, this.seed++, catalog);
    if (!created.ok) throw new Error(`Could not create battle: ${created.reason}`);
    let state: BattleState = created.state;
    let selected: CellPosition | null = null;
    const moveButton = document.querySelector<HTMLButtonElement>('#battle-move')!;
    const nextButton = document.querySelector<HTMLButtonElement>('#battle-next')!;
    const label = document.querySelector<HTMLElement>('#battle-selection')!;
    const activeLabel = document.querySelector<HTMLElement>('#battle-active')!;
    const refresh = () => {
      const activeId = state.initiative[state.activeIndex];
      const active = state.units.find(unit => unit.id === activeId)!;
      const preview = previewMovement(state, activeId, catalog);
      board.present(state, preview.ok ? preview.cells.map(value => value.cell) : [], selected);
      activeLabel.textContent = `Round ${state.round} · ${active.defId.replaceAll('_', ' ')} #${activeId}`;
      label.textContent = selected ? `Selected (${selected.x}, ${selected.y})` : 'Select a tile';
      moveButton.disabled = !selected || !previewMove(state, { type: 'move', unitId: activeId, to: selected }, catalog).ok;
      nextButton.disabled = state.outcome !== 'ongoing';
    };
    const board = new BoardRenderer(this, catalog, FIRST_BATTLE_MAP_ID, cell => { selected = cell; refresh(); });
    const move = () => {
      if (!selected || moveButton.disabled) return;
      const result = dispatch(state, { type: 'move', unitId: state.initiative[state.activeIndex], to: selected }, catalog);
      if (result.ok) state = result.state;
      refresh();
    };
    const next = () => {
      const result = dispatch(state, { type: 'endTurn', unitId: state.initiative[state.activeIndex] }, catalog);
      if (result.ok) state = result.state;
      refresh();
    };
    const removeInput = bindBoardInput(this.game.canvas, board, () => ({ width: this.scale.width, height: this.scale.height }));
    const panel = document.querySelector<HTMLElement>('#fit-panel')!;
    const fit = () => board.fit(this.scale.width, this.scale.height, panel.getBoundingClientRect().bottom);
    const observer = new ResizeObserver(fit);
    observer.observe(panel);
    this.scale.on(Phaser.Scale.Events.RESIZE, fit);
    moveButton.addEventListener('click', move);
    nextButton.addEventListener('click', next);
    refresh();
    fit();
    const ready = () => { this.status('ready'); refresh(); };
    this.game.events.once(Phaser.Core.Events.POST_RENDER, ready);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      removeInput();
      observer.disconnect();
      this.scale.off(Phaser.Scale.Events.RESIZE, fit);
      this.game.events.off(Phaser.Core.Events.POST_RENDER, ready);
      moveButton.removeEventListener('click', move);
      nextButton.removeEventListener('click', next);
      moveButton.disabled = nextButton.disabled = true;
      delete document.querySelector<HTMLElement>('#game')!.dataset.battleReport;
    });
  }
}
