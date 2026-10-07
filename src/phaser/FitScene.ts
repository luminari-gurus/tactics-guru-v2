import Phaser from 'phaser';
import { FIT_MARKS, measurements, setBoardDiagnostics, setProofDiagnostics } from '../diagnostics/browser';
import { PROOF_ASSETS, PROOF_FIXTURES, type ProofFixture } from '../diagnostics/proofAssets';
import { bindBoardInput } from './BoardInput';
import { BoardRenderer } from './BoardRenderer';

export const FIT_SCENE_KEY = 'fit';

export class FitScene extends Phaser.Scene {
  constructor(private readonly status: (state: 'loading' | 'ready' | 'error') => void, private readonly error: (message: string) => void) {
    super(FIT_SCENE_KEY);
  }

  init(): void {
    setBoardDiagnostics(null);
    setProofDiagnostics(null);
    this.status('loading');
    for (const name of FIT_MARKS) performance.clearMarks(name);
    performance.mark('fit:scene-start');
    measurements.begin(performance.now());
  }

  preload(): void {
    const failed = (file: Phaser.Loader.File): void => { this.error(`Could not load proof asset ${file.key}`); };
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, failed);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, failed));
    for (const asset of PROOF_ASSETS) if (!this.textures.exists(asset.key)) this.load.image(asset.key, asset.url);
  }

  create(): void {
    if (PROOF_ASSETS.some(asset => !this.textures.exists(asset.key))) return;
    const board = new BoardRenderer(this);
    const removeBoardInput = bindBoardInput(this.game.canvas, board, () => ({width: this.scale.width, height: this.scale.height}));
    const opacitySlider = document.querySelector<HTMLInputElement>('#tree-opacity')!;
    const opacityValue = document.querySelector<HTMLElement>('#tree-opacity-value')!;
    const updateOpacity = (): void => {
      const percent = opacitySlider.valueAsNumber;
      board.setOccludingOpacity(percent / 100);
      opacityValue.textContent = `${percent}%`;
      opacitySlider.setAttribute('aria-valuetext', `${percent}%`);
    };
    opacitySlider.addEventListener('input', updateOpacity);
    updateOpacity();
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-fixture]')];
    const showFixture = (event: Event): void => {
      const fixture = (event.currentTarget as HTMLButtonElement).dataset.fixture!;
      if (!(fixture in PROOF_FIXTURES)) return;
      board.showFixture(fixture as ProofFixture);
      for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.fixture === fixture));
    };
    for (const button of buttons) {
      button.addEventListener('click', showFixture);
      button.setAttribute('aria-pressed', String(button.dataset.fixture === 'ground-behind'));
    }
    const portrait = document.querySelector<HTMLImageElement>('#proof-portrait')!;
    let frameRendered = false;
    let portraitError = false;
    let usable = false;
    const markUsable = (): void => {
      if (usable || portraitError || !frameRendered || !portrait.complete || !portrait.naturalWidth) return;
      usable = true;
      performance.mark('fit:controls-usable');
      measurements.controlsUsable(performance.now());
      this.status('ready');
    };
    const portraitFailed = (): void => {
      portraitError = true;
      this.error('Could not display proof asset fighter-portrait');
    };
    portrait.addEventListener('error', portraitFailed);
    portrait.addEventListener('load', markUsable);
    portrait.src = PROOF_ASSETS.find(asset => asset.key === 'fighter-portrait')!.url;
    portrait.hidden = false;
    const panel = document.querySelector<HTMLElement>('#fit-panel')!;
    const layoutBoard = (): void => {
      setBoardDiagnostics(board.fit(this.scale.width, this.scale.height, panel.getBoundingClientRect().bottom));
    };
    const panelObserver = new ResizeObserver(layoutBoard);
    panelObserver.observe(panel);
    const rendered = (): void => {
      frameRendered = true;
      markUsable();
    };
    const visibilityChanged = (): void => { measurements.frame(performance.now(), false); };
    layoutBoard();
    this.scale.on(Phaser.Scale.Events.RESIZE, layoutBoard);
    this.game.events.once(Phaser.Core.Events.POST_RENDER, rendered);
    document.addEventListener('visibilitychange', visibilityChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layoutBoard);
      panelObserver.disconnect();
      removeBoardInput();
      opacitySlider.removeEventListener('input', updateOpacity);
      for (const button of buttons) button.removeEventListener('click', showFixture);
      portrait.removeEventListener('error', portraitFailed);
      portrait.removeEventListener('load', markUsable);
      portrait.hidden = true;
      portrait.removeAttribute('src');
      setProofDiagnostics(null);
      setBoardDiagnostics(null);
      this.game.events.off(Phaser.Core.Events.POST_RENDER, rendered);
      document.removeEventListener('visibilitychange', visibilityChanged);
    });
    // Readiness includes all four canonical assets, not just generated geometry.
    performance.mark('fit:scene-ready');
    measurements.sceneReady(performance.now());
  }

  update(): void {
    measurements.frame(performance.now(), document.visibilityState === 'visible');
  }
}
