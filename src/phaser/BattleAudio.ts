import type Phaser from 'phaser';
import type { ContentCatalog } from '../content/types';
import type { BattleEvent } from '../domain/types';
import { battleCues, BATTLE_CUES, type BattleCue } from '../audio/battleCues';

export const REQUEST_TIMEOUT_MS = 5000;
export const LOAD_TIMEOUT_MS = 6500;
export const UNLOCK_TIMEOUT_MS = 2000;
const PLAY_GRACE_MS = 500;
type Timer = ReturnType<typeof setTimeout>;
type Host = Pick<Phaser.Scene, 'sound'|'cache'|'game'>;
export interface BattleAudioSnapshot {
  enabled: boolean; status: 'muted'|'loading'|'unavailable'|'hidden'|'unlocking'|'blocked'|'ready';
  load: 'loading'|'ready'|'unavailable'; context: string; error: string|null;
  generation: number; lastToken: number; started: number; completed: number; dropped: number;
  active: BattleCue|null; recent: BattleCue[]; ownedSounds: number;
}

/** Disposable presentation consumer. No callback can dispatch or complete a battle command. */
export class BattleAudio {
  private live = true;
  private enabled: boolean;
  private load: BattleAudioSnapshot['load'] = 'loading';
  private error: string|null = null;
  private generation = 0;
  private attempt = 0;
  private lastToken = 0;
  private started = 0;
  private completed = 0;
  private dropped = 0;
  private recent: BattleCue[] = [];
  private queue: BattleCue[] = [];
  private active: BattleCue|null = null;
  private sounds = new Map<BattleCue, Phaser.Sound.BaseSound>();
  private completion: (()=>void)|undefined;
  private playTimer?: Timer;
  private unlockTimer?: Timer;
  private loadTimer?: Timer;
  private requests = new Map<AbortController, Timer>();
  private media = new Map<string, {tag: HTMLAudioElement; url: string; cleanup: ()=>void}>();

  constructor(private readonly host: Host, private readonly catalog: ContentCatalog, enabled: boolean,
    private readonly changed: (snapshot: BattleAudioSnapshot)=>void) {
    this.enabled = enabled;
    this.context()?.addEventListener('statechange', this.onContext);
    host.sound.on('unlocked', this.onContext);
    document.addEventListener('visibilitychange', this.onVisibility);
    void this.loadCues();
  }

  private context(): AudioContext|null { return 'context' in this.host.sound ? this.host.sound.context : null; }
  private contextState(): string { return this.context()?.state ?? (this.host.sound.locked ? 'locked' : 'running'); }
  snapshot(): BattleAudioSnapshot {
    const context = this.contextState();
    const status = this.load === 'unavailable' ? 'unavailable' : !this.enabled ? 'muted' : document.hidden ? 'hidden'
      : this.unlockTimer ? 'unlocking' : this.error || context !== 'running' || this.host.sound.locked ? 'blocked'
      : this.load === 'loading' ? 'loading' : 'ready';
    return {enabled:this.enabled,status,load:this.load,context,error:this.error,generation:this.generation,lastToken:this.lastToken,
      started:this.started,completed:this.completed,dropped:this.dropped,active:this.active,recent:[...this.recent],ownedSounds:this.sounds.size};
  }
  private notify() { if(this.live) this.changed(this.snapshot()); }
  private eligible() { return this.live && this.snapshot().status === 'ready'; }

  present(token: number, events: readonly BattleEvent[]): void {
    if (!this.live || token <= this.lastToken) return;
    this.lastToken = token; // Suppression consumes the batch permanently.
    this.stop();
    const cues = battleCues(events, this.catalog);
    if (!this.eligible()) { this.dropped += cues.length; this.notify(); return; }
    this.queue = cues;
    this.next(this.generation);
  }
  setEnabled(enabled: boolean): void {
    if (!this.live) return;
    this.enabled = enabled;
    this.cancelUnlock(); this.stop();
    if (enabled) this.unlock(); else this.notify();
  }
  /** Called directly in the DOM activation handler, before any await. */
  unlock(): void {
    if (!this.live || !this.enabled || document.hidden || this.load === 'unavailable') return;
    this.cancelUnlock(); this.stop(); this.error = null;
    const attempt = this.attempt;
    this.unlockTimer = setTimeout(()=>{
      if (!this.live || attempt !== this.attempt) return;
      this.cancelUnlock(); this.block('Sound unlock timed out. Retry sound.');
    }, UNLOCK_TIMEOUT_MS);
    try {
      const context = this.context();
      // HTML5 media is primed silently inside the gesture; never queue a historical cue.
      const resumed = context ? context.resume() : Promise.all([...this.media.values()].map(({tag})=>{
        tag.muted = true;
        return tag.play().then(()=>{tag.pause();tag.currentTime=0;tag.muted=false;});
      }));
      void resumed.then(()=>{
        if (!this.live || attempt !== this.attempt) return;
        this.cancelUnlock();
        if (this.contextState() !== 'running') this.block('Sound is locked. Retry sound.');
        else this.notify();
      }, ()=>{
        if (!this.live || attempt !== this.attempt) return;
        this.cancelUnlock(); this.block('Sound unlock refused. Retry sound.');
      });
    } catch { this.cancelUnlock(); this.block('Sound unlock refused. Retry sound.'); }
    this.notify();
  }
  private cancelUnlock() {
    this.attempt++; clearTimeout(this.unlockTimer); this.unlockTimer=undefined;
    for(const {tag} of this.media.values()) { tag.pause(); tag.muted=false; }
  }
  private block(message: string) { this.error=message; this.stop(); this.notify(); }
  private readonly onVisibility = () => {
    if(document.hidden) { this.cancelUnlock(); this.stop(); }
    this.notify();
  };
  private readonly onContext = () => {
    if(this.contextState() !== 'running') { this.cancelUnlock(); this.stop(); }
    this.notify(); // Visibility/running transitions never drain a queue.
  };
  private clearActive() {
    clearTimeout(this.playTimer);this.playTimer=undefined;
    if(this.active) {
      const sound=this.sounds.get(this.active);
      if(this.completion) sound?.off('complete',this.completion);
      try { sound?.stop(); } catch { /* A failed sound must not prevent teardown. */ }
    }
    this.active=null; this.completion=undefined;
  }
  private stop() {
    this.generation++;this.dropped+=this.queue.length;this.queue=[];this.clearActive();
  }
  private next(generation: number) {
    if(generation !== this.generation || !this.eligible()) return;
    const cue=this.queue.shift(); if(!cue) {this.notify();return;}
    try {
      let sound=this.sounds.get(cue);
      if(!sound) {sound=this.host.sound.add(BATTLE_CUES[cue].key);this.sounds.set(cue,sound);}
      this.active=cue;
      this.completion=()=>{
        if(!this.live || generation !== this.generation) return;
        this.completed++;this.clearActive();this.next(generation);
      };
      sound.once('complete',this.completion);
      if(!sound.play({volume:0.5})) {this.block('Sound playback refused. Retry sound.');return;}
      this.started++;this.recent.push(cue);this.recent=this.recent.slice(-32);
      this.playTimer=setTimeout(()=>{
        if(this.live && generation === this.generation) this.block('Sound playback timed out. Retry sound.');
      }, BATTLE_CUES[cue].durationMs+PLAY_GRACE_MS);
      this.notify();
    } catch {this.block('Sound playback failed. Retry sound.');}
  }

  private async loadCues() {
    const device=this.host.game.device.audio;
    if(this.host.game.config.audio.noAudio || !device.mp3 || (!device.webAudio && !device.audioData)) {
      this.loadFailed('Audio is not supported in this browser.');return;
    }
    const pending=Object.values(BATTLE_CUES).filter(c=>!this.host.cache.audio.exists(c.key));
    this.loadTimer=setTimeout(()=>this.loadFailed('Audio loading or decoding timed out.'),LOAD_TIMEOUT_MS);
    this.notify();
    try {
      const decoded=await Promise.all(pending.map(async cue=>{
        const request=new AbortController();
        this.requests.set(request,setTimeout(()=>this.loadFailed('Audio request timed out.'),REQUEST_TIMEOUT_MS));
        let bytes: ArrayBuffer;
        try {
          const response=await fetch(cue.url,{signal:request.signal});
          if(!response.ok) throw Error('Missing audio');
          bytes=await response.arrayBuffer();
        } finally {clearTimeout(this.requests.get(request));this.requests.delete(request);}
        if(!this.live || this.load !== 'loading') return null;
        const context=this.context();
        const data=context ? await context.decodeAudioData(bytes) : await this.prepareMedia(cue.key,bytes);
        return {key:cue.key,data};
      }));
      if(!this.live || this.load !== 'loading') return;
      for(const value of decoded) if(value) this.host.cache.audio.add(value.key,value.data);
      this.load='ready';clearTimeout(this.loadTimer);this.loadTimer=undefined;this.notify();
    } catch {this.loadFailed('Could not load or decode battle audio.');}
  }
  private prepareMedia(key: string, bytes: ArrayBuffer): Promise<HTMLAudioElement[]> {
    return new Promise((resolve,reject)=>{
      const tag=new Audio(),url=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'}));
      const cleanup=()=>{tag.oncanplaythrough=null;tag.onerror=null;};
      this.media.set(key,{tag,url,cleanup});
      tag.oncanplaythrough=()=>{cleanup();resolve([tag]);};
      tag.onerror=()=>{cleanup();reject(Error('Unsupported media'));};
      tag.preload='auto';tag.dataset.locked='false';tag.dataset.used='false';tag.src=url;tag.load();
    });
  }
  private abortRequests() {
    clearTimeout(this.loadTimer);this.loadTimer=undefined;
    for(const [request,timer] of this.requests) {clearTimeout(timer);request.abort();}
    this.requests.clear();
  }
  private releaseMedia() {
    for(const [key,{tag,url,cleanup}] of this.media) {
      cleanup();tag.pause();tag.removeAttribute('src');tag.load();URL.revokeObjectURL(url);
      this.host.cache.audio.remove(key);
    }
    this.media.clear();
  }
  private loadFailed(message: string) {
    if(!this.live || this.load !== 'loading') return;
    this.load='unavailable';this.error=message;this.abortRequests();this.cancelUnlock();this.stop();this.releaseMedia();this.notify();
  }
  destroy(): void {
    if(!this.live) return;
    this.live=false;this.cancelUnlock();this.stop();this.abortRequests();
    this.context()?.removeEventListener('statechange',this.onContext);
    this.host.sound.off('unlocked',this.onContext);
    document.removeEventListener('visibilitychange',this.onVisibility);
    for(const sound of this.sounds.values()) {try {sound.destroy();} catch { /* Continue releasing other owned sounds. */ }}
    this.sounds.clear();this.releaseMedia();
  }
}
