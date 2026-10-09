import Phaser from 'phaser';
import { FitScene } from './FitScene';
import { ContentSmokeScene } from './ContentSmokeScene';

export function startProof(status: (state: 'loading' | 'ready' | 'error') => void, error: (message: string) => void): () => void {
  const contentSmoke = new URLSearchParams(location.search).get('scene') === 'content-smoke';
  const scene = contentSmoke ? new ContentSmokeScene(status, error) : new FitScene(status, error);
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
