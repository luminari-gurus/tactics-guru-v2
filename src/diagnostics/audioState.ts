// Pure audio diagnostic state for the proof scene. No Phaser, DOM or browser globals.
export const AUDIO_STATES = ['loading', 'unavailable', 'locked', 'ready', 'unlocking', 'playing', 'played', 'blocked'] as const;
export type AudioStateName = (typeof AUDIO_STATES)[number];
/** `interrupted` is the iOS state after a call or Siri; it is not in the DOM typings. */
export type AudioContextStateName = 'unknown' | 'running' | 'suspended' | 'interrupted' | 'closed';

export interface AudioState {
  state: AudioStateName;
  contextState: AudioContextStateName;
  /** Explicit button presses this scene run. */
  attempts: number;
  /** Plays that reached the sound's COMPLETE event this scene run. */
  playedCount: number;
  lastError: string | null;
}

export type AudioEvent =
  | { type: 'loaded'; contextState: AudioContextStateName }
  | { type: 'loadFailed'; reason: string }
  | { type: 'unsupported'; reason: string }
  | { type: 'gesture' }
  | { type: 'contextState'; contextState: AudioContextStateName }
  | { type: 'playStarted' }
  | { type: 'playCompleted' }
  | { type: 'playFailed'; reason: string }
  | { type: 'timeout' }
  | { type: 'restart' };

export const initialAudioState: AudioState = Object.freeze({ state: 'loading', contextState: 'unknown', attempts: 0, playedCount: 0, lastError: null });

const LABELS: Record<AudioStateName, string> = {
  loading: 'Loading',
  unavailable: 'Unavailable',
  locked: 'Locked',
  ready: 'Ready',
  unlocking: 'Unlocking',
  playing: 'Playing',
  played: 'Played',
  blocked: 'Blocked',
};
const RETRYABLE: ReadonlySet<AudioStateName> = new Set<AudioStateName>(['locked', 'ready', 'played', 'blocked']);
const ATTEMPTING: ReadonlySet<AudioStateName> = new Set<AudioStateName>(['unlocking', 'playing']);

/** True when the play button should accept a gesture. `blocked` always retries; `unavailable` never does. */
export function canRetry(state: AudioState): boolean {
  return RETRYABLE.has(state.state);
}

export function audioStatusText(state: AudioState): string {
  const label = LABELS[state.state];
  return state.lastError && (state.state === 'blocked' || state.state === 'unavailable') ? `${label}: ${state.lastError}` : label;
}

export function reduceAudio(state: AudioState, event: AudioEvent): AudioState {
  switch (event.type) {
    case 'restart':
      return initialAudioState;
    case 'loadFailed':
    case 'unsupported':
      return { ...state, state: 'unavailable', lastError: event.reason };
    case 'loaded':
      if (state.state !== 'loading') return state;
      return { ...state, contextState: event.contextState, state: event.contextState === 'running' ? 'ready' : 'locked' };
    case 'gesture':
      if (!canRetry(state)) return state;
      return { ...state, state: 'unlocking', attempts: state.attempts + 1, lastError: null };
    case 'contextState': {
      const next = { ...state, contextState: event.contextState };
      if (state.state === 'unlocking' && event.contextState !== 'running') return { ...next, state: 'blocked', lastError: `Audio context is ${event.contextState}` };
      if (state.state === 'locked' && event.contextState === 'running') return { ...next, state: 'ready' };
      return next;
    }
    case 'playStarted':
      return state.state === 'unlocking' ? { ...state, state: 'playing' } : state;
    case 'playCompleted':
      return state.state === 'playing' ? { ...state, state: 'played', playedCount: state.playedCount + 1 } : state;
    case 'playFailed':
      return ATTEMPTING.has(state.state) ? { ...state, state: 'blocked', lastError: event.reason } : state;
    case 'timeout':
      if (state.state === 'unlocking') return { ...state, state: 'blocked', lastError: 'Audio context did not resume in time' };
      if (state.state === 'playing') return { ...state, state: 'blocked', lastError: 'Playback did not complete in time' };
      return state;
  }
}
