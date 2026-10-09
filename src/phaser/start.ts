import Phaser from 'phaser';
import { FitScene } from './FitScene';
import { ContentSmokeScene } from './ContentSmokeScene';
import { BattleScene } from './BattleScene';

export function startProof(status: (state: 'loading' | 'ready' | 'error') => void, error: (message: string) => void): () => void {
  const sceneName = new URLSearchParams(location.search).get('scene');
  const scene = sceneName === 'content-smoke' ? new ContentSmokeScene(status, error)
    : sceneName === 'proof' ? new FitScene(status, error) : new BattleScene(status, error);
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#172033',
    // Right click and long press are cancel gestures, never a browser menu (tech design §5.6).
    disableContextMenu: true,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene,
  });
  return () => { scene.scene.restart(); };
}
