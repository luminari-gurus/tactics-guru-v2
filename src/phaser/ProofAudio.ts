import Phaser from 'phaser';
import { audioStatusText, canRetry, initialAudioState, reduceAudio, type AudioContextStateName, type AudioEvent, type AudioState } from '../diagnostics/audioState';
import { setAudioDiagnostics, type AudioDiagnostics } from '../diagnostics/browser';
import { PROOF_AUDIO, UNLOCK_TONE_KEY, UNLOCK_TONE_PROBE_KEY } from '../diagnostics/proofAssets';

/** Grace beyond the sound's own duration before an attempt is reported as blocked. */
export const PLAY_TIMEOUT_MS = 1000;
/**
 * Wall-clock grace for `context.resume()` to settle after the gesture. Its promise may never settle
 * (Chrome while the context is not allowed to start, WebKit for the length of an interruption), and
 * the scene clock does not advance while animation frames are stopped, so this is a `setTimeout`.
 */
export const UNLOCK_TIMEOUT_MS = 2000;

/**
 * Scene-owned adapter between the pure audio reducer, Phaser's sound manager and the panel controls.
 * `play()` is only ever called from the button's click handler: nothing here reacts to visibility,
 * focus, unlock or context state events by starting sound.
 */
export class ProofAudio {
  private state: AudioState = initialAudioState;
  private sound: Phaser.Sound.BaseSound | undefined;
  private timer: Phaser.Time.TimerEvent | undefined;
  private unlockWatchdog: number | undefined;
  private attempt = 0;
  private readonly button = document.querySelector<HTMLButtonElement>('#audio-play')!;
  private readonly status = document.querySelector<HTMLElement>('#audio-status')!;

  constructor(private readonly scene: Phaser.Scene, loadErrors: ReadonlySet<string>) {
    this.button.addEventListener('click', this.onClick);
    // The context changes state outside play(): Phaser's body-gesture unlock, its blur/focus handling,
    // and an iOS interruption. The reducer follows those; the diagnostics read the live values.
    this.context()?.addEventListener('statechange', this.onContextStateChange);
    setAudioDiagnostics(() => this.snapshot());
    const manager = scene.sound;
    const cached = scene.cache.audio.exists(UNLOCK_TONE_KEY);
    if (manager instanceof Phaser.Sound.NoAudioSoundManager) this.dispatch({ type: 'unsupported', reason: 'No audio output on this device' });
    else if (loadErrors.has(UNLOCK_TONE_KEY)) this.dispatch({ type: 'loadFailed', reason: `Could not load ${UNLOCK_TONE_KEY}` });
    else if (!cached && !scene.game.device.audio.mp3) this.dispatch({ type: 'unsupported', reason: 'MP3 playback is not supported' });
    else if (!cached) this.dispatch({ type: 'loadFailed', reason: `Could not decode ${UNLOCK_TONE_KEY}` });
    else this.dispatch({ type: 'loaded', contextState: this.contextState() });
  }

  private context(): AudioContext | null {
    const manager = this.scene.sound;
    return manager instanceof Phaser.Sound.WebAudioSoundManager ? manager.context : null;
  }

  private contextState(): AudioContextStateName {
    const context = this.context();
    if (!context) return this.scene.sound instanceof Phaser.Sound.NoAudioSoundManager ? 'unknown' : 'running';
    return context.state as AudioContextStateName;
  }

  private dispatch(event: AudioEvent): void {
    this.state = reduceAudio(this.state, event);
    this.render();
  }

  private render(): void {
    this.button.disabled = !canRetry(this.state);
    this.status.textContent = audioStatusText(this.state);
  }

  /** Taken when `fitDiagnostics()` runs: `contextState`, `locked` and `cached` are read then, not frozen at the last dispatch. */
  snapshot(): AudioDiagnostics {
    const manager = this.scene.sound;
    const device = this.scene.game.device.audio;
    return {
      ...this.state,
      contextState: this.contextState(),
      manager: manager instanceof Phaser.Sound.WebAudioSoundManager ? 'webaudio' : manager instanceof Phaser.Sound.HTML5AudioSoundManager ? 'html5' : 'none',
      locked: manager.locked,
      device: { mp3: device.mp3, ogg: device.ogg, webAudio: device.webAudio },
      cached: { mp3: this.scene.cache.audio.exists(UNLOCK_TONE_KEY), ogg: this.scene.cache.audio.exists(UNLOCK_TONE_PROBE_KEY) },
    };
  }

  private readonly onContextStateChange = (): void => {
    this.dispatch({ type: 'contextState', contextState: this.contextState() });
  };

  private readonly onClick = (): void => {
    if (this.button.disabled || !canRetry(this.state)) return;
    this.dispatch({ type: 'gesture' });
    void this.play(++this.attempt);
  };

  private async play(attempt: number): Promise<void> {
    try {
      const context = this.context();
      if (context) {
        // resume() runs synchronously inside the click handler; the await only waits for its promise.
        // The watchdog is armed before the await because that promise is allowed never to settle.
        const resumed = context.resume();
        this.armUnlockWatchdog(attempt);
        try { await resumed; } finally { if (attempt === this.attempt) this.clearUnlockWatchdog(); }
        // The watchdog, a restart or a context state change may already have resolved this attempt.
        if (attempt !== this.attempt || this.state.state !== 'unlocking') return;
        this.dispatch({ type: 'contextState', contextState: context.state as AudioContextStateName });
        if (context.state !== 'running') return;
      }
      const sound = this.sound ??= this.scene.sound.add(UNLOCK_TONE_KEY);
      sound.once(Phaser.Sound.Events.COMPLETE, this.onComplete);
      if (!sound.play()) {
        sound.off(Phaser.Sound.Events.COMPLETE, this.onComplete);
        this.dispatch({ type: 'playFailed', reason: 'Playback was refused' });
        return;
      }
      this.dispatch({ type: 'playStarted' });
      this.timer?.remove();
      // Scene clock on purpose: the sound manager and this clock both stop with the frames while hidden.
      this.timer = this.scene.time.delayedCall(sound.duration * 1000 + PLAY_TIMEOUT_MS, () => {
        sound.off(Phaser.Sound.Events.COMPLETE, this.onComplete);
        this.dispatch({ type: 'timeout' });
      });
    } catch (error) {
      if (attempt !== this.attempt || this.state.state !== 'unlocking') return;
      this.dispatch({ type: 'playFailed', reason: error instanceof Error ? error.message : String(error) });
    }
  }

  private armUnlockWatchdog(attempt: number): void {
    this.clearUnlockWatchdog();
    this.unlockWatchdog = window.setTimeout(() => {
      this.unlockWatchdog = undefined;
      if (attempt !== this.attempt) return;
      this.attempt++; // a late settlement of this attempt's resume() is ignored
      this.dispatch({ type: 'timeout' }); // unlocking -> blocked; the button is enabled again
    }, UNLOCK_TIMEOUT_MS);
  }

  private clearUnlockWatchdog(): void {
    if (this.unlockWatchdog === undefined) return;
    window.clearTimeout(this.unlockWatchdog);
    this.unlockWatchdog = undefined;
  }

  private readonly onComplete = (): void => {
    this.timer?.remove();
    this.timer = undefined;
    this.dispatch({ type: 'playCompleted' });
  };

  /** Scene SHUTDOWN: the sound instance belongs to the global manager and must be released here. */
  destroy(): void {
    this.attempt++;
    this.clearUnlockWatchdog();
    this.context()?.removeEventListener('statechange', this.onContextStateChange);
    this.button.removeEventListener('click', this.onClick);
    this.timer?.remove();
    this.timer = undefined;
    if (this.sound) {
      this.sound.off(Phaser.Sound.Events.COMPLETE, this.onComplete);
      this.sound.stop();
      this.sound.destroy();
      this.sound = undefined;
    }
    this.state = reduceAudio(this.state, { type: 'restart' });
    this.button.disabled = true;
    this.status.textContent = audioStatusText(this.state);
    setAudioDiagnostics(null);
  }
}

export const PROOF_AUDIO_KEYS: ReadonlySet<string> = new Set(PROOF_AUDIO.map(asset => asset.key));
