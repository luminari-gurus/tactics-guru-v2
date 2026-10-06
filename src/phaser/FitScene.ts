import Phaser from 'phaser';
import { FIT_MARKS, measurements } from '../diagnostics/browser';

export const FIT_SCENE_KEY = 'fit';
const TEXT_COLOR = '#f6f1e7';

export class FitScene extends Phaser.Scene {
  constructor(private readonly status: (state: 'loading' | 'ready') => void) {
    super(FIT_SCENE_KEY);
  }

  init(): void {
    this.status('loading');
    for (const name of FIT_MARKS) performance.clearMarks(name);
    performance.mark('fit:scene-start');
    measurements.begin(performance.now());
  }

  create(): void {
    const title = this.add.text(0, 0, 'Tactics Guru v2\nPhaser 4 proof scene', {
      fontFamily: 'sans-serif', fontSize: '24px', color: TEXT_COLOR, align: 'center',
    }).setOrigin(0.5);
    const centerTitle = (): void => { title.setPosition(this.scale.width / 2, this.scale.height / 2); };
    const rendered = (): void => {
      performance.mark('fit:controls-usable');
      measurements.controlsUsable(performance.now());
      this.status('ready');
    };
    const visibilityChanged = (): void => { measurements.frame(performance.now(), false); };
    centerTitle();
    this.scale.on(Phaser.Scale.Events.RESIZE, centerTitle);
    this.game.events.once(Phaser.Core.Events.POST_RENDER, rendered);
    document.addEventListener('visibilitychange', visibilityChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, centerTitle);
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
