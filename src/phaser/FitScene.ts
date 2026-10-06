import Phaser from 'phaser';
import { FIT_MARKS, measurements, setBoardDiagnostics } from '../diagnostics/browser';
import { BoardRenderer } from './BoardRenderer';

export const FIT_SCENE_KEY = 'fit';

export class FitScene extends Phaser.Scene {
  constructor(private readonly status: (state: 'loading' | 'ready') => void) {
    super(FIT_SCENE_KEY);
  }

  init(): void {
    setBoardDiagnostics(null);
    this.status('loading');
    for (const name of FIT_MARKS) performance.clearMarks(name);
    performance.mark('fit:scene-start');
    measurements.begin(performance.now());
  }

  create(): void {
    const board = new BoardRenderer(this);
    const panel = document.querySelector<HTMLElement>('#fit-panel')!;
    const layoutBoard = (): void => {
      setBoardDiagnostics(board.fit(this.scale.width, this.scale.height, panel.getBoundingClientRect().bottom));
    };
    const panelObserver = new ResizeObserver(layoutBoard);
    panelObserver.observe(panel);
    const rendered = (): void => {
      performance.mark('fit:controls-usable');
      measurements.controlsUsable(performance.now());
      this.status('ready');
    };
    const visibilityChanged = (): void => { measurements.frame(performance.now(), false); };
    layoutBoard();
    this.scale.on(Phaser.Scale.Events.RESIZE, layoutBoard);
    this.game.events.once(Phaser.Core.Events.POST_RENDER, rendered);
    document.addEventListener('visibilitychange', visibilityChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layoutBoard);
      panelObserver.disconnect();
      setBoardDiagnostics(null);
      this.game.events.off(Phaser.Core.Events.POST_RENDER, rendered);
      document.removeEventListener('visibilitychange', visibilityChanged);
    });
    // No external proof assets in this increment: create is the scene/assets-ready boundary.
    performance.mark('fit:scene-ready');
    measurements.sceneReady(performance.now());
  }

  update(): void {
    measurements.frame(performance.now(), document.visibilityState === 'visible');
  }
}
