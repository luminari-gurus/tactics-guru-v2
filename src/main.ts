import Phaser from 'phaser';
import './style.css';

const BACKGROUND_COLOR = '#172033';
const TEXT_COLOR = '#f6f1e7';
const TITLE_SIZE = '24px';
const SCENE_KEY = 'boot';
const GAME_CONTAINER = 'game';

class BootScene extends Phaser.Scene {
  constructor() { super(SCENE_KEY); }

  create(): void {
    const title = this.add.text(0, 0, 'Tactics Guru v2\nPhaser 4 ready', {
      fontFamily: 'sans-serif', fontSize: TITLE_SIZE, color: TEXT_COLOR, align: 'center',
    }).setOrigin(0.5);
    const centerTitle = (): void => { title.setPosition(this.scale.width / 2, this.scale.height / 2); };
    centerTitle();
    this.scale.on(Phaser.Scale.Events.RESIZE, centerTitle);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, centerTitle);
    });
    document.getElementById(GAME_CONTAINER)!.dataset.ready = 'true';
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: GAME_CONTAINER,
  backgroundColor: BACKGROUND_COLOR,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: BootScene,
});
