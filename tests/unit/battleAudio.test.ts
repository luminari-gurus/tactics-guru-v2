import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { BattleAudio, LOAD_TIMEOUT_MS, REQUEST_TIMEOUT_MS, UNLOCK_TIMEOUT_MS } from '../../src/phaser/BattleAudio';
import { battleCues, BATTLE_CUES, type BattleCue } from '../../src/audio/battleCues';
import { BattleSession } from '../../src/app/BattleSession';
import { decodeBattleSave, encodeBattleSave } from '../../src/domain/saveEnvelope';
import { dispatch, replayBattle } from '../../src/domain/turns';
import { playerDecision } from '../helpers/playerPolicy';
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
function loadedHtml5() {
  class Media extends EventTarget {
    dataset:Record<string,string>={};src='';muted=false;currentTime=0;preload='';ended=false;
    oncanplaythrough:(()=>void)|null=null;onerror:(()=>void)|null=null;
    load(){queueMicrotask(()=>this.oncanplaythrough?.());}
    pause=vi.fn();removeAttribute(){this.src='';}
    play(){return Promise.resolve();}
  }
  vi.stubGlobal('Audio',Media);
  const f=fixture(false,true);
  return {...f,tag:(cue:BattleCue)=>(f.cache.get(BATTLE_CUES[cue].key) as Media[])[0]};
}

describe('scene audio lifetime',()=>{
  it.each([[1,'playerLoss'],[2,'playerWin']] as const)('seed %i: enabled/muted adapters preserve every legal boundary through %s',async(seed,outcome)=>{
    const audible=new BattleSession(catalog,'map:forest_ruins',seed),silent=new BattleSession(catalog,'map:forest_ruins',seed);
    const enabled=fixture(),muted=fixture();enabled.audio.setEnabled(true);await flush();
    expect(enabled.audio.snapshot().status).toBe('ready');
    const snapshot=(session:BattleSession)=>({state:session.state,events:session.events,replay:session.replay,
      continuation:session.continuation,pending:session.pending,phase:session.phase,error:session.error});
    const save=(session:BattleSession)=>{const encoded=encodeBattleSave(session.state,catalog);assert(encoded.ok);return encoded.text;};
    const step=(session:BattleSession)=>{
      if(session.phase==='player')expect(session.prepare(playerDecision(session.state,session.catalog)).ok).toBe(true);
      const accepted=session.phase==='enemy'?session.nextEnemy():session.confirm();assert(accepted);return accepted;
    };
    const heard=new Set<BattleCue>();let late:(()=>void)|undefined;
    for(let i=0;i<300 && audible.phase!=='ended';i++){
      const restored=decodeBattleSave(save(audible),catalog);assert(restored.ok);
      const a=step(audible),b=step(silent),accepted=structuredClone(a);
      expect(a).toEqual(b);expect(Object.isFrozen(a.events)).toBe(true);
      expect(a.events.every(event=>Object.isFrozen(event))).toBe(true);
      const cues=battleCues(a.events,catalog),started=enabled.audio.snapshot().started;
      enabled.audio.present(a.token,a.events);muted.audio.present(b.token,b.events);
      const first=enabled.sounds.find(sound=>sound.listenerCount('complete')>0);
      late??=first?.listeners('complete')[0] as (()=>void)|undefined;
      expect(enabled.audio.snapshot().started-started).toBe(cues.length?1:0);
      expect(audible.phase).toBe('presenting');expect(silent.phase).toBe('presenting');
      // Acknowledgement may precede or follow playback: audio cannot own its gate.
      if(i%2===0){audible.finishPresentation(a.token);silent.finishPresentation(b.token);}
      const beforeCallbacks=structuredClone(snapshot(audible));
      for(let j=0;j<cues.length;j++){
        const active=enabled.sounds.find(sound=>sound.listenerCount('complete')>0);assert(active);
        active.emit('complete');
      }
      expect(snapshot(audible)).toEqual(beforeCallbacks);
      expect(enabled.audio.snapshot()).toMatchObject({active:null,started:started+cues.length,completed:started+cues.length});
      if(cues.length)expect(enabled.audio.snapshot().recent.slice(-cues.length)).toEqual(cues);
      enabled.audio.snapshot().recent.forEach(cue=>heard.add(cue));
      const finished=enabled.audio.snapshot();
      enabled.audio.present(a.token,a.events);enabled.audio.present(a.token-1,a.events);
      expect(enabled.audio.snapshot()).toEqual(finished);
      expect(muted.audio.snapshot().started).toBe(0);expect(a).toEqual(accepted);
      if(i%2!==0){audible.finishPresentation(a.token);silent.finishPresentation(b.token);}
      expect(snapshot(audible)).toEqual(snapshot(silent));expect(save(audible)).toBe(save(silent));
      const decoded=decodeBattleSave(save(audible),catalog);assert(decoded.ok);expect(decoded.state).toEqual(a.after);
      expect(dispatch(restored.state,audible.replay!.commands.at(-1),catalog)).toEqual({ok:true,state:a.after,events:a.events});
    }
    expect(audible.phase).toBe('ended');expect(audible.state.outcome).toBe(outcome);
    const replay=replayBattle(audible.replay,catalog);assert(replay.ok);
    expect(replay.state).toEqual(audible.state);expect(replay.events).toEqual(audible.events);
    expect([...heard]).toEqual(expect.arrayContaining(['move','hit','miss','unit-defeat',seed===2?'victory':'loss']));
    if(seed===2){
      expect([...heard]).toContain('magic');
      expect(audible.replay!.commands.filter(command=>command.type==='useAbility').map(command=>command.abilityId))
        .toEqual(expect.arrayContaining(['ability:basic_attack','ability:guarded_strike','ability:high_shot','ability:magic_missile']));
    }
    const beforeLate=structuredClone(snapshot(audible)),last=muted.audio.snapshot().lastToken;
    muted.audio.setEnabled(true);await flush();muted.audio.present(last,move);muted.audio.present(last-1,move);
    expect(muted.audio.snapshot().started).toBe(0);
    enabled.audio.destroy();muted.audio.destroy();const disposed=enabled.audio.snapshot();late?.();await flush();
    expect(enabled.audio.snapshot()).toEqual(disposed);expect(snapshot(audible)).toEqual(beforeLate);
    expect(vi.getTimerCount()).toBe(0);
  });
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
  it('completes native HTML5 audio without a render tick and counts each cue only once',async()=>{
    const f=loadedHtml5();await flush();f.audio.setEnabled(true);await flush();
    f.audio.present(1,[...move,{type:'battleEnded',outcome:'playerWin'}]);
    const lateComplete=f.sounds[0].listeners('complete')[0];
    const moveTag=f.tag('move');
    moveTag.ended=true;moveTag.dispatchEvent(new Event('ended'));
    expect(f.audio.snapshot()).toMatchObject({completed:1,active:'victory',started:2});
    lateComplete();moveTag.dispatchEvent(new Event('ended'));
    expect(f.audio.snapshot()).toMatchObject({completed:1,active:'victory',started:2});
    f.sounds[1].emit('complete');
    const victoryTag=f.tag('victory');victoryTag.ended=true;victoryTag.dispatchEvent(new Event('ended'));
    await vi.advanceTimersByTimeAsync(2000);
    expect(f.audio.snapshot()).toMatchObject({completed:2,active:null,status:'ready',error:null});
    expect(vi.getTimerCount()).toBe(0);f.audio.destroy();
  });
  it('ignores a queued native end event after the same HTML5 tag is reused',async()=>{
    const f=loadedHtml5();await flush();f.audio.setEnabled(true);await flush();
    f.audio.present(1,move);f.audio.present(2,move);
    const tag=f.tag('move');tag.dispatchEvent(new Event('ended'));
    expect(f.audio.snapshot()).toMatchObject({completed:0,active:'move',started:2});
    tag.ended=true;tag.dispatchEvent(new Event('ended'));
    expect(f.audio.snapshot()).toMatchObject({completed:1,active:null,status:'ready'});f.audio.destroy();
  });
  it.each(['mute','hide','blur','destroy'] as const)('removes native HTML5 completion after %s',async action=>{
    const f=loadedHtml5();await flush();f.audio.setEnabled(true);await flush();
    f.audio.present(1,move);const tag=f.tag('move');
    if(action==='mute')f.audio.setEnabled(false);
    if(action==='hide'){f.document.hidden=true;f.document.dispatchEvent(new Event('visibilitychange'));}
    if(action==='blur')f.window.dispatchEvent(new Event('blur'));
    if(action==='destroy')f.audio.destroy();
    const before=f.audio.snapshot(),renders=f.render.mock.calls.length;
    tag.ended=true;tag.dispatchEvent(new Event('ended'));await vi.advanceTimersByTimeAsync(2000);
    expect(f.audio.snapshot()).toEqual(before);expect(f.render).toHaveBeenCalledTimes(renders);
    expect(vi.getTimerCount()).toBe(0);f.audio.destroy();
  });
  it('ignores late HTML5 priming promises after an explicit retry',async()=>{
    let retry=false;const late:(()=>void)[]=[],tags:Media[]=[];
    class Media extends EventTarget {
      dataset:Record<string,string>={};src='';muted=false;currentTime=0;preload='';
      oncanplaythrough:(()=>void)|null=null;onerror:(()=>void)|null=null;
      constructor(){super();tags.push(this);}
      load(){queueMicrotask(()=>this.oncanplaythrough?.());}
      pause=vi.fn();removeAttribute(){this.src='';}
      play(){return retry?Promise.resolve():new Promise<void>(resolve=>late.push(resolve));}
    }
    vi.stubGlobal('Audio',Media);
    const f=fixture(false,true);await flush();expect(f.audio.snapshot().load).toBe('ready');
    f.audio.setEnabled(true);await vi.advanceTimersByTimeAsync(UNLOCK_TIMEOUT_MS);
    expect(f.audio.snapshot().status).toBe('blocked');retry=true;f.audio.unlock();await flush();
    expect(f.audio.snapshot().status).toBe('ready');f.audio.present(1,move);
    const pauses=tags.map(t=>t.pause.mock.calls.length);late.forEach(resolve=>resolve());await flush();
    expect(tags.map(t=>t.pause.mock.calls.length)).toEqual(pauses);
    expect(f.audio.snapshot()).toMatchObject({active:'move',started:1});f.audio.destroy();
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
  it('uses the running Web Audio context after Phaser abandons a rejected body unlock',async()=>{
    const f=fixture();f.sound.locked=true;f.context.state='suspended';
    f.context.resume.mockRejectedValue(Error('refused'));f.audio.setEnabled(true);await flush();
    expect(f.audio.snapshot().status).toBe('blocked');f.audio.present(1,move);
    f.context.resume.mockImplementation(()=>{f.context.state='running';return Promise.resolve();});
    f.audio.unlock();await flush();
    expect(f.sound.locked).toBe(true);expect(f.audio.snapshot().status).toBe('ready');
    f.audio.present(1,move);expect(f.audio.snapshot().started).toBe(0);
    f.audio.present(2,move);expect(f.audio.snapshot().started).toBe(1);f.audio.destroy();
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
