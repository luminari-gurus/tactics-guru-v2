import { routineCutscenesEnabled } from './cutscenePreference';
import type { BattleDialogs } from './dialogs';
import { publicAssetUrl } from './publicAssetUrl';

export interface Cutscene {
  readonly title: string;
  readonly path: string;
  readonly category: 'routine' | 'progression';
}

export const battleCutscenes = {
  playerWin: { title: 'Victory', path: '/cutscenes/victory.mp4', category: 'routine' },
  playerLoss: { title: 'Defeat', path: '/cutscenes/defeat.mp4', category: 'routine' },
} as const satisfies Record<string, Cutscene>;

// Bound both startup and total time so a stalled download cannot hold the outcome UI.
const STARTUP_TIMEOUT_MS = 2000;
const PLAYBACK_TIMEOUT_MS = 7000;

export function playCutscene(
  dialogs: BattleDialogs, clip: Cutscene, scene: AbortSignal, complete: () => void,
): void {
  if (scene.aborted) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (document.hidden || motion.matches || (clip.category === 'routine' && !routineCutscenesEnabled())) {
    complete();
    return;
  }

  const playback = new AbortController();
  const { signal } = playback;
  const video = document.createElement('video');
  video.className = 'cutscene-video';
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('aria-hidden', 'true');

  let startupTimeout: number;
  let playbackTimeout: number;
  const cleanup = () => {
    playback.abort();
    clearTimeout(startupTimeout);
    clearTimeout(playbackTimeout);
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.remove();
  };
  const finish = () => {
    if (signal.aborted) return;
    const ownsDialog = dialogs.element.contains(video);
    cleanup();
    if (!ownsDialog) return;
    if (dialogs.open) dialogs.close(complete);
    else complete();
  };

  scene.addEventListener('abort', () => {
    const ownsDialog = dialogs.element.contains(video);
    cleanup();
    if (ownsDialog && dialogs.open) dialogs.close();
  }, { signal });
  window.addEventListener('pagehide', finish, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); }, { signal });
  motion.addEventListener('change', event => { if (event.matches) finish(); }, { signal });
  video.addEventListener('playing', () => clearTimeout(startupTimeout), { once: true, signal });
  video.addEventListener('ended', finish, { signal });
  video.addEventListener('error', finish, { signal });
  dialogs.showChoices(clip.title, video, [
    { id: 'cutscene-skip', label: 'Skip cutscene', run: finish, keepOpen: true },
  ], finish);

  startupTimeout = window.setTimeout(finish, STARTUP_TIMEOUT_MS);
  playbackTimeout = window.setTimeout(finish, PLAYBACK_TIMEOUT_MS);
  video.src = publicAssetUrl(clip.path);
  void video.play().catch(finish);
}
