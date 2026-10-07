import { describe, expect, it } from 'vitest';
import { AUDIO_STATES, audioStatusText, canRetry, initialAudioState, reduceAudio, type AudioEvent, type AudioState } from '../../src/diagnostics/audioState';

function run(events: AudioEvent[], from: AudioState = initialAudioState): AudioState {
  return events.reduce(reduceAudio, from);
}

describe('audio diagnostic reducer', () => {
  it('starts loading with no attempts, plays or error', () => {
    expect(initialAudioState).toEqual({ state: 'loading', contextState: 'unknown', attempts: 0, playedCount: 0, lastError: null });
    expect(canRetry(initialAudioState)).toBe(false);
  });

  it('becomes ready when loaded with a running context and locked otherwise', () => {
    expect(run([{ type: 'loaded', contextState: 'running' }]).state).toBe('ready');
    expect(run([{ type: 'loaded', contextState: 'suspended' }]).state).toBe('locked');
    expect(run([{ type: 'loaded', contextState: 'suspended' }, { type: 'contextState', contextState: 'running' }]).state).toBe('ready');
    expect(canRetry(run([{ type: 'loaded', contextState: 'suspended' }]))).toBe(true);
  });

  it('counts a completed play after an explicit gesture', () => {
    const played = run([{ type: 'loaded', contextState: 'suspended' }, { type: 'gesture' }, { type: 'contextState', contextState: 'running' }, { type: 'playStarted' }, { type: 'playCompleted' }]);
    expect(played).toMatchObject({ state: 'played', contextState: 'running', attempts: 1, playedCount: 1, lastError: null });
    expect(canRetry(played)).toBe(true);
    const again = run([{ type: 'gesture' }, { type: 'contextState', contextState: 'running' }, { type: 'playStarted' }, { type: 'playCompleted' }], played);
    expect(again).toMatchObject({ state: 'played', attempts: 2, playedCount: 2 });
  });

  it('disables the control while an attempt is in flight', () => {
    const unlocking = run([{ type: 'loaded', contextState: 'running' }, { type: 'gesture' }]);
    expect(unlocking.state).toBe('unlocking');
    expect(canRetry(unlocking)).toBe(false);
    const playing = run([{ type: 'contextState', contextState: 'running' }, { type: 'playStarted' }], unlocking);
    expect(playing.state).toBe('playing');
    expect(canRetry(playing)).toBe(false);
  });

  it('blocks with retry when the context does not reach running after a gesture', () => {
    const blocked = run([{ type: 'loaded', contextState: 'suspended' }, { type: 'gesture' }, { type: 'contextState', contextState: 'suspended' }]);
    expect(blocked).toMatchObject({ state: 'blocked', contextState: 'suspended', attempts: 1, playedCount: 0 });
    expect(blocked.lastError).toMatch(/suspended/);
    expect(canRetry(blocked)).toBe(true);
    expect(run([{ type: 'gesture' }, { type: 'contextState', contextState: 'interrupted' }], blocked).lastError).toMatch(/interrupted/);
  });

  it('blocks with retry when playback fails or times out', () => {
    const base = run([{ type: 'loaded', contextState: 'running' }, { type: 'gesture' }, { type: 'contextState', contextState: 'running' }]);
    const failed = reduceAudio(base, { type: 'playFailed', reason: 'play threw' });
    expect(failed).toMatchObject({ state: 'blocked', lastError: 'play threw' });
    expect(canRetry(failed)).toBe(true);
    const timedOut = run([{ type: 'playStarted' }, { type: 'timeout' }], base);
    expect(timedOut.state).toBe('blocked');
    expect(timedOut.lastError).toMatch(/complete/);
    expect(timedOut.playedCount).toBe(0);
    expect(canRetry(timedOut)).toBe(true);
  });

  it('is unavailable without retry when the file fails or the format is unsupported', () => {
    const failed = run([{ type: 'loadFailed', reason: 'Could not load unlock-tone' }]);
    expect(failed).toMatchObject({ state: 'unavailable', lastError: 'Could not load unlock-tone' });
    expect(canRetry(failed)).toBe(false);
    const unsupported = run([{ type: 'unsupported', reason: 'MP3 playback is not supported' }]);
    expect(unsupported).toMatchObject({ state: 'unavailable', lastError: 'MP3 playback is not supported' });
    expect(canRetry(unsupported)).toBe(false);
    expect(run([{ type: 'loaded', contextState: 'running' }, { type: 'gesture' }], failed).state).toBe('unavailable');
  });

  it('ignores events that do not apply to the current state', () => {
    const ready = run([{ type: 'loaded', contextState: 'running' }]);
    expect(run([{ type: 'playStarted' }, { type: 'playCompleted' }, { type: 'timeout' }, { type: 'playFailed', reason: 'x' }], ready)).toEqual(ready);
    const unlocking = reduceAudio(ready, { type: 'gesture' });
    expect(reduceAudio(unlocking, { type: 'gesture' })).toEqual(unlocking);
    expect(reduceAudio(unlocking, { type: 'playCompleted' })).toEqual(unlocking);
  });

  it('restart returns to the initial state', () => {
    const played = run([{ type: 'loaded', contextState: 'running' }, { type: 'gesture' }, { type: 'contextState', contextState: 'running' }, { type: 'playStarted' }, { type: 'playCompleted' }]);
    expect(reduceAudio(played, { type: 'restart' })).toEqual(initialAudioState);
  });

  it('gives every state a non-empty label and surfaces the last error', () => {
    for (const state of AUDIO_STATES) {
      expect(audioStatusText({ ...initialAudioState, state }).length).toBeGreaterThan(0);
    }
    expect(audioStatusText({ ...initialAudioState, state: 'blocked', lastError: 'Audio context is suspended' })).toBe('Blocked: Audio context is suspended');
    expect(audioStatusText({ ...initialAudioState, state: 'played', playedCount: 2 })).toBe('Played');
  });
});
