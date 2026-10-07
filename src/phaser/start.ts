import Phaser from 'phaser';
import { FitScene } from './FitScene';

export function startProof(status: (state: 'loading' | 'ready' | 'error') => void, error: (message: string) => void): () => void {
  const scene = new FitScene(status, error);
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#172033',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene,
  });
  return () => { scene.scene.restart(); };
}
