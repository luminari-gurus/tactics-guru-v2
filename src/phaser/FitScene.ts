import Phaser from 'phaser';
import { MOVE_DURATION_MS, MOVE_PATH, sampleMove } from '../diagnostics/scriptedMove';
import { FIT_MARKS, measurements, setBoardDiagnostics, setLifecycleDiagnostics, setProofDiagnostics, type LifecycleDiagnostics } from '../diagnostics/browser';
import { PROOF_ASSETS, PROOF_IMAGES, PROOF_FIXTURES, type ProofFixture } from '../diagnostics/proofAssets';
import { bindBoardInput } from './BoardInput';
import { BoardRenderer } from './BoardRenderer';
import { PROOF_AUDIO_KEYS, ProofAudio } from './ProofAudio';

export const FIT_SCENE_KEY = 'fit';

export class FitScene extends Phaser.Scene {
  private readonly audioLoadErrors = new Set<string>();

  constructor(private readonly status: (state: 'loading' | 'ready' | 'error') => void, private readonly error: (message: string) => void) {
    super(FIT_SCENE_KEY);
  }

  init(): void {
    setBoardDiagnostics(null);
    setProofDiagnostics(null);
    setLifecycleDiagnostics(null);
    this.audioLoadErrors.clear();
    this.status('loading');
    for (const name of FIT_MARKS) performance.clearMarks(name);
    performance.mark('fit:scene-start');
    measurements.begin(performance.now());
  }

  preload(): void {
    // Audio failures are recorded and shown by the audio control; image failures stay fatal.
    const failed = (file: Phaser.Loader.File): void => {
      if (PROOF_AUDIO_KEYS.has(file.key)) this.audioLoadErrors.add(file.key);
      else this.error(`Could not load proof asset ${file.key}`);
    };
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, failed);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, failed));
    for (const asset of PROOF_ASSETS) {
      if (asset.kind === 'image') { if (!this.textures.exists(asset.key)) this.load.image(asset.key, asset.url); }
      else if (!this.cache.audio.exists(asset.key)) this.load.audio(asset.key, asset.url);
    }
  }

  create(): void {
    if (PROOF_IMAGES.some(asset => !this.textures.exists(asset.key))) return;
    const board = new BoardRenderer(this);
    const audio = new ProofAudio(this, this.audioLoadErrors);
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
    const moveButton = document.querySelector<HTMLButtonElement>('#move-start')!;
    const destination = document.querySelector<HTMLSelectElement>('#move-destination')!;
    const moveStatus = document.querySelector<HTMLElement>('#move-status')!;
    let moving = false;
    let tween: Phaser.Tweens.Tween | undefined;
    const lifecycle: LifecycleDiagnostics = { hidden: 0, visible: 0, blur: 0, focus: 0, moveFrozenAt: null, moveCompleted: 0 };
    const publishLifecycle = (): void => { setLifecycleDiagnostics({ ...lifecycle }); };
    publishLifecycle();
    moveStatus.textContent = 'Idle';
    const previewMove = (): void => {
      if (destination.value !== 'raised-front') return;
      board.selectTile(MOVE_PATH[MOVE_PATH.length - 1]);
      moveButton.disabled = moving;
    };
    destination.addEventListener('change', previewMove);
    const startMove = (): void => {
      if (moving || moveButton.disabled || destination.value !== 'raised-front') return;
      moving = true;
      moveStatus.textContent = 'Moving';
      moveButton.disabled = destination.disabled = true;
      for (const button of buttons) { button.disabled = true; button.setAttribute('aria-pressed', 'false'); }
      board.showFixture('raised-behind');
      previewMove();
      board.moveHero(MOVE_PATH[0]);
      const clock = { elapsed: 0 };
      tween = this.tweens.add({ targets: clock, elapsed: MOVE_DURATION_MS, duration: MOVE_DURATION_MS,
        ease: 'Linear', onUpdate: () => board.moveHero(sampleMove(clock.elapsed)),
        onComplete: () => {
          board.moveHero(MOVE_PATH[MOVE_PATH.length - 1]);
          moving = false;
          lifecycle.moveCompleted++;
          publishLifecycle();
          moveStatus.textContent = 'Completed';
          moveButton.disabled = destination.disabled = false;
          for (const button of buttons) button.disabled = false;
        } });
    };
    moveButton.addEventListener('click', startMove);
    // A move in flight freezes while the page is hidden and continues from the same progress once visible.
    // Phaser's loop keeps stepping whenever the browser still runs animation frames, so the pause is explicit.
    // Blur alone (window still visible) does not freeze. Nothing here starts audio.
    const onHidden = (): void => {
      lifecycle.hidden++;
      if (moving && tween && !tween.isPaused()) { lifecycle.moveFrozenAt = tween.progress; tween.pause(); }
      publishLifecycle();
    };
    const onVisible = (): void => {
      lifecycle.visible++;
      if (moving && tween?.isPaused()) tween.resume();
      publishLifecycle();
    };
    const onBlur = (): void => { lifecycle.blur++; publishLifecycle(); };
    const onFocus = (): void => { lifecycle.focus++; publishLifecycle(); };
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    this.game.events.on(Phaser.Core.Events.VISIBLE, onVisible);
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.game.events.on(Phaser.Core.Events.FOCUS, onFocus);
    const showFixture = (event: Event): void => {
      if (moving) return;
      moveStatus.textContent = 'Idle';
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
    portrait.src = PROOF_IMAGES.find(asset => asset.key === 'fighter-portrait')!.url;
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
      tween?.stop();
      this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden);
      this.game.events.off(Phaser.Core.Events.VISIBLE, onVisible);
      this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
      this.game.events.off(Phaser.Core.Events.FOCUS, onFocus);
      setLifecycleDiagnostics(null);
      audio.destroy();
      moveButton.removeEventListener('click', startMove);
      destination.removeEventListener('change', previewMove);
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
