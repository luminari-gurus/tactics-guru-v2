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
    callbacks: { preBoot(game) {
      if(sceneName === 'proof' || sceneName === 'content-smoke' || !('context' in game.sound)) return;
      // Phaser 4.2.1 resumes without a rejection handler on focus, every focused frame,
      // and a delayed VISIBLE callback. BattleAudio owns bounded recovery instead.
      // Install once for the game so scene loading/restart gaps are protected too.
      const recovery=game.sound as unknown as {onFocus:()=>void;onGameVisible:()=>void};
      game.sound.pauseOnBlur=false;
      recovery.onFocus=()=>{};
      game.events.off(Phaser.Core.Events.VISIBLE,recovery.onGameVisible,game.sound);
    } },
    scene,
  });
  return () => { scene.scene.restart(); };
}
