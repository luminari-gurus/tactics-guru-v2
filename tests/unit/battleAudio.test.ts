import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { BattleAudio, LOAD_TIMEOUT_MS, REQUEST_TIMEOUT_MS, UNLOCK_TIMEOUT_MS } from '../../src/phaser/BattleAudio';
import { BATTLE_CUES } from '../../src/audio/battleCues';
import { battleCatalog as catalog } from '../../src/content/catalog';
import type { BattleEvent } from '../../src/domain/types';

const move: readonly BattleEvent[] = Object.freeze([{type:'moved',unitId:1,path:[]}]);
class Sound extends EventEmitter {
  play=vi.fn(()=>true); stop=vi.fn(); destroy=vi.fn();
}
function fixture(cached=true, html5=false) {
  const document = Object.assign(new EventTarget(),{hidden:false}); vi.stubGlobal('document',document);
  const window=new EventTarget();vi.stubGlobal('window',window);
  const context=Object.assign(new EventTarget(), {state:'running',resume:vi.fn(()=>Promise.resolve()),decodeAudioData:vi.fn(()=>Promise.resolve({duration:.2}))});
  const sounds:Sound[]=[];
  const cache=new Map<string,unknown>(cached?Object.values(BATTLE_CUES).map(c=>[c.key,{}]):[]);
  const sound=Object.assign(new EventEmitter(),{...(!html5?{context}:{}),locked:html5,pauseOnBlur:true,unlock:vi.fn(),add:vi.fn(()=>{const s=new Sound();sounds.push(s);return s;})});
  sound.unlock.mockImplementation(()=>{sound.locked=false;});
  const host={sound,cache:{audio:{exists:(k:string)=>cache.has(k),add:(k:string,v:unknown)=>cache.set(k,v),remove:(k:string)=>cache.delete(k)}},game:{config:{audio:{}},device:{audio:{mp3:true,webAudio:true,audioData:true}}}};
  const render=vi.fn();
  const audio=new BattleAudio(host as unknown as ConstructorParameters<typeof BattleAudio>[0],catalog,false,render);
  return {audio,document,window,context,sounds,sound,cache,render};
}
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})));});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

describe('scene audio lifetime',()=>{
  it('refreshes Phaser HTML5 lock state in the enabling gesture',async()=>{
    const f=fixture(true,true);await flush();f.audio.setEnabled(true);
    expect(f.sound.unlock).toHaveBeenCalledTimes(1);await flush();
    expect(f.audio.snapshot().status).toBe('ready');f.audio.present(1,move);
    expect(f.audio.snapshot().started).toBe(1);f.audio.destroy();
  });
  it('drops HTML5 feedback on blur even without an AudioContext state event',async()=>{
    const f=fixture(true,true);await flush();f.audio.setEnabled(true);await flush();
    expect(f.sound.pauseOnBlur).toBe(false);
    f.audio.present(1,move);f.window.dispatchEvent(new Event('blur'));
    expect(f.sounds[0].stop).toHaveBeenCalled();f.audio.present(2,move);
    f.window.dispatchEvent(new Event('focus'));f.audio.present(2,move);
    expect(f.audio.snapshot()).toMatchObject({active:null,started:1});f.audio.destroy();
    expect(f.sound.pauseOnBlur).toBe(true);
  });
  it('consumes muted/duplicate/old batches and only plays future batches once',async()=>{
    const f=fixture(); f.audio.present(1,move); f.audio.setEnabled(true); await flush();
    f.audio.present(1,move);f.audio.present(0,move);expect(f.sounds).toHaveLength(0);
    f.audio.present(2,move);expect(f.sounds[0].play).toHaveBeenCalledTimes(1);
    f.audio.present(2,move);expect(f.sounds[0].play).toHaveBeenCalledTimes(1);
    expect(f.audio.snapshot()).toMatchObject({lastToken:2,started:1,dropped:1}); f.audio.destroy();expect(vi.getTimerCount()).toBe(0);
  });
  it('sequences one sound at a time, supersedes feedback, and ignores stale completions',async()=>{
    const f=fixture();f.audio.setEnabled(true);await flush();
    f.audio.present(1,[...move,{type:'defeated',unitId:2},{type:'battleEnded',outcome:'playerWin'}]);
    const late=f.sounds[0].listeners('complete')[0];expect(f.sounds).toHaveLength(1);
    f.sounds[0].emit('complete');expect(f.sounds).toHaveLength(2);
    f.audio.present(2,move);expect(f.sounds[1].stop).toHaveBeenCalled();late();
    expect(f.audio.snapshot().recent).toEqual(['move','unit-defeat','move']);f.audio.destroy();
    expect(f.sounds.every(s=>s.destroy.mock.calls.length===1)).toBe(true);expect(vi.getTimerCount()).toBe(0);
  });
  it('mutes immediately; hide and interruption discard queues without resume backlog',async()=>{
    const f=fixture();f.audio.setEnabled(true);await flush(); f.audio.present(1,move); f.audio.setEnabled(false);
    expect(f.sounds[0].stop).toHaveBeenCalled();f.audio.setEnabled(true);await flush();f.audio.present(2,move);
    f.document.hidden=true;f.document.dispatchEvent(new Event('visibilitychange'));
    expect(f.sounds[0].stop).toHaveBeenCalledTimes(2);f.audio.present(3,move);
    f.document.hidden=false;f.document.dispatchEvent(new Event('visibilitychange'));f.audio.present(3,move);
    expect(f.audio.snapshot().started).toBe(2);
    f.audio.present(4,move);f.context.state='interrupted';f.context.dispatchEvent(new Event('statechange'));f.audio.present(5,move);
    f.context.state='running';f.context.dispatchEvent(new Event('statechange'));f.audio.present(5,move);
    expect(f.audio.snapshot()).toMatchObject({started:3,active:null});f.audio.destroy();
  });
  it.each(['reject','pending','throw'] as const)('bounds %s unlock and permits explicit retry',async mode=>{
    const f=fixture();let resolve!:()=>void;
    f.context.resume.mockImplementation(()=>{if(mode==='throw')throw Error('refused');return mode==='reject'?Promise.reject(Error('refused')):new Promise<void>(r=>resolve=r);});
    f.audio.setEnabled(true);expect(f.context.resume).toHaveBeenCalledTimes(1);await flush();
    await vi.advanceTimersByTimeAsync(UNLOCK_TIMEOUT_MS);expect(f.audio.snapshot().status).toBe('blocked');
    f.audio.present(1,move);resolve?.();await flush();expect(f.audio.snapshot().status).toBe('blocked');
    f.context.resume.mockResolvedValue();f.audio.unlock();await flush();f.audio.present(1,move);expect(f.sounds).toHaveLength(0);
    f.audio.present(2,move);expect(f.audio.snapshot().started).toBe(1);f.audio.destroy();
  });
  it('never lets late unlock change a muted or destroyed controller',async()=>{
    const f=fixture();let resolve!:()=>void;f.context.resume.mockImplementation(()=>new Promise<void>(r=>resolve=r));
    f.audio.setEnabled(true);f.audio.setEnabled(false);resolve();await flush();expect(f.audio.snapshot().status).toBe('muted');
    f.audio.setEnabled(true);f.audio.destroy();const count=f.render.mock.calls.length;resolve();await flush();
    expect(f.render).toHaveBeenCalledTimes(count);expect(vi.getTimerCount()).toBe(0);expect(f.sound.listenerCount('unlocked')).toBe(0);
  });
  it.each(['refused','throw','stalled'] as const)('contains %s playback and clears its sequence',async mode=>{
    const f=fixture();f.audio.setEnabled(true);await flush();
    f.sound.add.mockImplementation(()=>{const s=new Sound();if(mode==='refused')s.play.mockReturnValue(false);if(mode==='throw')s.play.mockImplementation(()=>{throw Error('play failed');});f.sounds.push(s);return s;});
    f.audio.present(1,[...move,{type:'battleEnded',outcome:'playerWin'}]);await vi.advanceTimersByTimeAsync(2000);
    expect(f.audio.snapshot()).toMatchObject({status:'blocked',active:null});expect(f.sounds).toHaveLength(1);f.audio.destroy();expect(vi.getTimerCount()).toBe(0);
  });
  it('loads asynchronously without reviving batches suppressed while loading',async()=>{
    const f=fixture(false);f.audio.setEnabled(true);f.audio.present(1,move);await flush();
    expect(f.audio.snapshot().load).toBe('ready');expect(f.cache.size).toBe(8);f.audio.present(1,move);expect(f.sounds).toHaveLength(0);f.audio.destroy();
  });
  it.each(['missing','corrupt','decode-stall','request-stall'] as const)('bounds %s media and ignores late work',async mode=>{
    let resolve!:()=>void;
    if(mode==='missing')vi.mocked(fetch).mockResolvedValue({ok:false,status:404} as Response);
    if(mode==='request-stall')vi.mocked(fetch).mockImplementation(()=>new Promise(()=>{}));
    const f=fixture(false);
    if(mode==='corrupt')f.context.decodeAudioData.mockRejectedValue(Error('bad media'));
    if(mode==='decode-stall')f.context.decodeAudioData.mockImplementation(()=>new Promise<any>(r=>resolve=()=>r({})));
    await flush();await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS);
    expect(f.audio.snapshot().load).toBe('unavailable');expect(f.cache.size).toBe(0);
    resolve?.();await flush();expect(f.cache.size).toBe(0);expect(vi.getTimerCount()).toBe(0);f.audio.destroy();
    expect(REQUEST_TIMEOUT_MS).toBeLessThan(LOAD_TIMEOUT_MS);
  });
  it('releases requests, timers and listeners across five restarts during decode',async()=>{
    for(let i=0;i<5;i++){
      const f=fixture(false);let resolve!:(v:any)=>void;f.context.decodeAudioData.mockImplementation(()=>new Promise(r=>resolve=r));await flush();
      f.audio.destroy();f.audio.destroy();const renders=f.render.mock.calls.length;resolve({});await flush();
      expect(f.cache.size).toBe(0);expect(f.render).toHaveBeenCalledTimes(renders);expect(vi.getTimerCount()).toBe(0);
      expect(f.sound.listenerCount('unlocked')).toBe(0);
    }
  });
});
