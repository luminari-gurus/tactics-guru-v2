import { createGame } from './createGame';

export async function startProof(status: (state: 'loading' | 'ready' | 'error') => void, error: (message: string) => void): Promise<() => void> {
  const sceneName = new URLSearchParams(location.search).get('scene');
  const scene = sceneName === 'content-smoke' ? new (await import('./ContentSmokeScene')).ContentSmokeScene(status, error)
    : sceneName === 'proof' ? new (await import('./FitScene')).FitScene(status, error)
    : new (await import('./BattleScene')).BattleScene(status, error);
  const game = createGame(scene, 'requestRestart' in scene);
  if ('requestRestart' in scene) {
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
  return () => { if('requestRestart' in scene)scene.requestRestart();else scene.scene.restart(); };
}
