import Phaser from 'phaser';
import { FitScene } from './FitScene';
import { ContentSmokeScene } from './ContentSmokeScene';
import { BattleScene } from './BattleScene';

export function startProof(status: (state: 'loading' | 'ready' | 'error') => void, error: (message: string) => void): () => void {
  const sceneName = new URLSearchParams(location.search).get('scene');
  const scene = sceneName === 'content-smoke' ? new ContentSmokeScene(status, error)
    : sceneName === 'proof' ? new FitScene(status, error) : new BattleScene(status, error);
  const game = createGame(scene, scene instanceof BattleScene);
  if (scene instanceof BattleScene) {
    window.addEventListener('pagehide', () => {
      status('loading');
      // Stop synchronously: queued scene operations may not run before BFCache freezes us.
      // Existing shutdown disposes the session, pending presentation and recovery controls.
      game.scene.stop(scene);
    }, { once: true });
    window.addEventListener('pageshow', event => {
      // Another history entry may have replaced the save. Re-enter read-only startup.
      if (event.persisted) location.reload();
    });
  }
  return () => { if(scene instanceof BattleScene)scene.requestRestart();else scene.scene.restart(); };
}

/** Shared engine/audio initialization; caller owns the scene lifecycle. */
export function createGame(scene: Phaser.Scene | Phaser.Scene[], battle: boolean) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#172033',
    // Right click and long press are cancel gestures, never a browser menu (tech design §5.6).
    disableContextMenu: true,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    callbacks: { preBoot(game) {
      if(!battle || !('context' in game.sound)) return;
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
}
