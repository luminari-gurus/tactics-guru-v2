import { confirmRestart } from './helpers/battlePolicy';
import { expect, test, type Page } from '@playwright/test';
import { readSession, session, playCommand, playerDecision } from './helpers/battlePolicy';
import { standaloneCatalog as catalog } from './helpers/playerPolicy';
import { replayBattle } from '../src/domain/turns';
import { battleCues, type BattleCue } from '../src/audio/battleCues';
import { LOAD_TIMEOUT_MS } from '../src/phaser/BattleAudio';
import { BATTLE_STORAGE_KEYS } from '../src/persistence/battleStorage';
import { decodeBattleSave, encodeBattleSave } from '../src/domain/saveEnvelope';

const audio=(page:Page)=>page.evaluate(()=>window.fitDiagnostics().battleAudio!);
async function ready(page:Page) {await expect(page.locator('#game')).toHaveAttribute('data-phase','player');}
async function enable(page:Page) {
  await page.locator('#battle-sound').click();
  await expect.poll(()=>audio(page)).toMatchObject({enabled:true,status:'ready'});
}
function errors(page:Page) {
  const found:string[]=[];
  page.on('pageerror',e=>found.push(e.message));
  page.on('console',m=>{if(m.type()==='error')found.push(m.text());});return found;
}

test('sound control uses real gestures, preserves previews, modal focus and restart preference',async({page})=>{
  const found=errors(page);await page.goto('/');await ready(page);
  expect(await audio(page)).toMatchObject({enabled:false,started:0,status:'muted'});
  const before=await session(page);
  await page.locator('#battle-sound').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#battle-sound')).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>audio(page)).toMatchObject({status:'ready',started:0});
  expect((await session(page)).state).toEqual(before.state);
  await page.locator('#battle-sound').click();
  await page.locator('#battle-sound').scrollIntoViewIfNeeded();
  const box=(await page.locator('#battle-sound').boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  const point={x:box.x+box.width/2,y:box.y+box.height/2};
  if(test.info().project.use.hasTouch)await page.touchscreen.tap(point.x,point.y);
  else {
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await cdp.detach();
  }
  await expect.poll(()=>audio(page)).toMatchObject({enabled:true,status:'ready',started:0});
  expect((await session(page)).state).toEqual(before.state);
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});
  await page.locator('#battle-party').click();await page.keyboard.press('Tab');
  expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);
  await page.keyboard.press('Escape');await page.locator('#battle-cancel').click();expect((await audio(page)).started).toBe(0);
  expect((await session(page)).state).toEqual(before.state);
  for(let run=2;run<=6;run++){
    if(run===4)await page.locator('#battle-sound').click();
    await page.locator('#fit-restart').click();await confirmRestart(page);await expect(page.locator('#game')).toHaveAttribute('data-run',String(run));
    await ready(page);expect((await audio(page)).enabled).toBe(run<4);
    expect((await audio(page)).ownedSounds).toBeLessThanOrEqual(8);
    await expect(page.locator('#battle-sound')).toHaveCount(1);
  }
  await page.reload();await page.locator('#save-continue').click();await ready(page);expect(await audio(page)).toMatchObject({enabled:false,started:0});expect(found).toEqual([]);
});

test('mute, hidden and context interruptions discard active feedback while commands finish',async({page})=>{
  // Fixed future anchors avoid a protocol round-trip racing a running Date.now().
  const start=Date.UTC(2026,0,1),found=errors(page);await page.clock.install({time:start});await page.goto('/');await ready(page);
  // WebKit can omit the synthetic mouse click here; the gesture case owns pointer/touch proof.
  await page.locator('#battle-sound').focus();await page.keyboard.press('Enter');
  await expect.poll(()=>audio(page)).toMatchObject({enabled:true,status:'ready'});
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});
  await page.clock.pauseAt(start+60000);
  const before=(await session(page)).state.commandCount;
  await page.locator('#battle-review').click({force:true});
  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
  expect((await audio(page)).recent).toContain('move');
  await page.locator('#battle-sound').click({force:true});expect((await audio(page)).active).toBeNull();
  await page.clock.resume();await ready(page);expect((await session(page)).state.commandCount).toBe(before+1);
  await enable(page);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect.poll(()=>audio(page)).toMatchObject({status:'blocked',active:null});
  const count=(await audio(page)).started;
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect.poll(()=>audio(page)).toMatchObject({status:'ready',started:count});
  await page.locator('#battle-next').click();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  expect((await audio(page)).active).toBeNull();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
  await ready(page);await page.locator('#battle-sound').click();expect((await audio(page)).enabled).toBe(false);
  await enable(page);
  await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page); // Seed 2 begins with a player.
  await page.clock.pauseAt(start+120000);
  let enemy:Awaited<ReturnType<typeof session>>|undefined;
  for(let i=0;i<12;i++) {
    const current=await session(page),command=current.replay.commands.at(-1);
    if(current.phase==='presenting' && command && current.state.units.find(u=>u.id===command.unitId)!.side==='enemy') {enemy=current;break;}
    if(current.phase==='player')await page.locator('#battle-next').click({force:true});
    await page.clock.runFor(48);
  }
  expect(enemy).toBeDefined();
  await expect(page.locator('#battle-sound')).toBeEnabled();
  await page.locator('#battle-sound').click({force:true});
  expect(await audio(page)).toMatchObject({enabled:false,active:null});expect((await session(page)).state).toEqual(enemy!.state);
  await page.clock.resume();await ready(page);
  expect(found).toEqual([]);
});

for(const mode of ['reject','pending'] as const) test(`gesture unlock ${mode} remains bounded and retryable`,async({page})=>{
  const found=errors(page);
  await page.addInitScript(mode=>{
    const original=AudioContext.prototype.resume;
    const state=Object.getOwnPropertyDescriptor(BaseAudioContext.prototype,'state')!.get!;
    // Guarantee Phaser sees the initial lock, even when headless autoplay starts running.
    Object.defineProperty(AudioContext.prototype,'state',{get(){return window.__allowAudio?state.call(this):'suspended';}});
    AudioContext.prototype.resume=function(){return window.__allowAudio?original.call(this):mode==='reject'?Promise.reject(Error('refused')):new Promise(()=>{});};
  },mode);
  await page.goto('/');await ready(page);await page.locator('#battle-sound').click();
  await expect.poll(()=>audio(page)).toMatchObject({status:'blocked',started:0});
  await expect(page.locator('#battle-next')).toBeEnabled();
  await page.evaluate(()=>{window.__allowAudio=true;});await page.locator('#battle-sound-retry').click();
  await expect.poll(()=>audio(page)).toMatchObject({status:'ready',started:0});expect(found).toEqual([]);
});

for(const mode of ['reject','pending'] as const) test(`automatic recovery ${mode} after successful unlock stays nonfatal and bounded`,async({page})=>{
  const found=errors(page);
  await page.addInitScript(mode=>{
    const Original=AudioContext, resume=Original.prototype.resume;
    window.AudioContext=new Proxy(Original,{construct(target,args){
      const context=new target(...args);window.__battleContext=context;return context;
    }});
    window.__resumeCalls=0;
    Original.prototype.resume=function(){
      if(!window.__resumeFailure)return resume.call(this);
      window.__resumeCalls!++;
      return mode==='reject'?Promise.reject(new DOMException('Resume refused','NotAllowedError')):new Promise<void>((resolve,reject)=>{
        window.__releaseResume=()=>{void resume.call(this).then(resolve,reject);};
      });
    };
  },mode);
  await page.goto('/');await ready(page);await enable(page);
  await page.evaluate(async()=>{window.__resumeFailure=true;await window.__battleContext!.suspend();window.dispatchEvent(new Event('focus'));});
  await expect.poll(()=>audio(page)).toMatchObject({status:'blocked',active:null});
  await expect(page.locator('#battle-sound-retry')).toBeVisible();
  // Exercise the engine's delayed visible handler as well as focused frame recovery.
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await page.waitForTimeout(250);
  expect(await page.evaluate(()=>window.__resumeCalls)).toBe(1);
  await expect(page.locator('#fit-status')).toHaveText('Battle ready');
  await expect(page.locator('#battle-next')).toBeEnabled();await expect(page.locator('#fit-restart')).toBeEnabled();
  const before=(await session(page)).state.commandCount;
  await page.locator('#battle-next').click();await ready(page);
  expect((await session(page)).state.commandCount).toBeGreaterThan(before);
  const started=(await audio(page)).started;
  await page.evaluate(()=>{window.__resumeFailure=false;});await page.locator('#battle-sound-retry').click();
  await expect.poll(()=>audio(page)).toMatchObject({status:'ready',started});
  await page.locator('#fit-restart').click();await confirmRestart(page);await expect(page.locator('#game')).toHaveAttribute('data-run','2');await ready(page);
  const afterRestart=await audio(page);
  await page.evaluate(()=>window.__releaseResume?.());await page.waitForTimeout(100);
  expect(await audio(page)).toEqual(afterRestart);
  expect((await audio(page)).enabled).toBe(true);expect(found).toEqual([]);
});

for(const early of [true,false]) test(`HTML5 per-element permission survives ${early?'early enable':'enabled restart'}`,async({page})=>{
  const found=errors(page);
  await page.addInitScript(()=>{
    Object.defineProperty(window,'AudioContext',{value:undefined});Object.defineProperty(window,'webkitAudioContext',{value:undefined});
    const original=HTMLMediaElement.prototype.play,primed=new WeakSet<HTMLMediaElement>();
    let gesture=false;
    // A gesture lasts only through dispatch, not through later media/network callbacks.
    for(const event of ['click','keydown','touchend'])document.addEventListener(event,e=>{
      if(!e.isTrusted)return;gesture=true;setTimeout(()=>{gesture=false;},0);
    },true);
    window.__mediaPolicy={primed:0,rejected:0};
    HTMLMediaElement.prototype.play=function(){
      if(this.muted && gesture && !primed.has(this)){primed.add(this);window.__mediaPolicy!.primed++;}
      if(!primed.has(this)){window.__mediaPolicy!.rejected++;return Promise.reject(new DOMException('Element requires a gesture','NotAllowedError'));}
      return original.call(this);
    };
  });
  let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
  if(early)await page.route('**/audio/battle/**',async route=>{await held;await route.continue();});
  await page.goto('/');await ready(page);
  if(early){await page.locator('#battle-sound').click();release();}
  else {await enable(page);await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);}
  await expect.poll(()=>audio(page)).toMatchObject({enabled:true,load:'ready',status:'blocked',started:0});
  await expect(page.locator('#battle-sound-retry')).toBeVisible();
  const primed=early?0:8;
  expect(await page.evaluate(()=>window.__mediaPolicy)).toEqual({primed,rejected:0});
  await page.locator('#battle-next').click();await ready(page);
  expect((await audio(page)).started).toBe(0);
  await page.locator('#battle-sound-retry').click();await expect.poll(()=>audio(page)).toMatchObject({status:'ready',started:0});
  expect(await page.evaluate(()=>window.__mediaPolicy)).toEqual({primed:primed+8,rejected:0});
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();
  await expect.poll(async()=>(await audio(page)).completed).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.__mediaPolicy!.rejected)).toBe(0);expect(found).toEqual([]);
});

test('unrelated asynchronous failures still reach the fatal application handler',async({page})=>{
  await page.goto('/');await ready(page);
  await page.evaluate(()=>{void Promise.reject(Error('unrelated application failure'));});
  await expect(page.locator('#fit-status')).toContainText('asynchronous error');
  await expect(page.locator('#fit-restart')).toBeDisabled();
});

declare global { interface Window {
  __battleContext?:AudioContext;__resumeFailure?:boolean;__resumeCalls?:number;__releaseResume?:()=>void;
  __mediaPolicy?:{primed:number;rejected:number};
} }

for(const mode of ['missing','corrupt','stalled','decode-stalled'] as const) test(`${mode} optional media leaves legal controls usable`,async({page})=>{
  const found:string[]=[];page.on('pageerror',e=>found.push(e.message));
  if(mode==='decode-stalled')await page.addInitScript(()=>{AudioContext.prototype.decodeAudioData=()=>new Promise(()=>{});});
  else await page.route('**/audio/battle/move.mp3',route=>mode==='stalled'?undefined:route.fulfill({status:mode==='missing'?404:200,contentType:'audio/mpeg',body:'invalid audio'}));
  await page.goto('/');await ready(page);
  if(mode==='stalled' || mode==='decode-stalled'){
    // Restart while optional work is pending, five times; old callbacks must stay inert.
    for(let run=2;run<=6;run++) {await page.locator('#fit-restart').click();await confirmRestart(page);await expect(page.locator('#game')).toHaveAttribute('data-run',String(run));}
    await ready(page);
  }
  await expect.poll(()=>audio(page),{timeout:LOAD_TIMEOUT_MS+3000}).toMatchObject({load:'unavailable',started:0});
  await expect(page.locator('#battle-sound-status')).toContainText('Sound unavailable');
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});
  const before=(await session(page)).state.commandCount;await page.locator('#battle-review').click();await ready(page);
  expect((await session(page)).state.commandCount).toBe(before+1);expect(found).toEqual([]);
});

test('HTML5 fallback loads and plays future cues after a gesture',async({page})=>{
  const found=errors(page);
  await page.addInitScript(()=>{
    Object.defineProperty(window,'AudioContext',{value:undefined});Object.defineProperty(window,'webkitAudioContext',{value:undefined});
    const original=HTMLMediaElement.prototype.play;window.__mediaPlays=0;
    HTMLMediaElement.prototype.play=function(){window.__mediaPlays!++;return original.call(this);};
  });
  await page.goto('/');await ready(page);await enable(page);
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();
  await expect.poll(()=>audio(page)).toMatchObject({started:1,completed:1,active:null});
  await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);expect((await audio(page)).enabled).toBe(true);
  await expect.poll(()=>audio(page)).toMatchObject({load:'ready',status:'blocked'});
  await page.locator('#battle-sound-retry').click();await expect.poll(()=>audio(page)).toMatchObject({status:'ready'});
  // Blur in the same event after the real Confirm handler starts the cue, before it can finish.
  await page.evaluate(()=>document.addEventListener('click',e=>{if((e.target as HTMLElement).id==='battle-review')window.dispatchEvent(new Event('blur'));}));
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();
  expect(await audio(page)).toMatchObject({status:'blocked',active:null});
  const plays=await page.evaluate(()=>window.__mediaPlays);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(200);
  expect(await page.evaluate(()=>window.__mediaPlays)).toBe(plays);expect((await audio(page)).active).toBeNull();expect(found).toEqual([]);
});

declare global { interface Window { __mediaPlays?: number } }

test('unsupported audio has a useful nonfatal status',async({page})=>{
  const found=errors(page);await page.addInitScript(()=>{HTMLMediaElement.prototype.canPlayType=()=>'';});
  await page.goto('/');await ready(page);await expect.poll(()=>audio(page)).toMatchObject({load:'unavailable'});
  await expect(page.locator('#battle-next')).toBeEnabled();expect(found).toEqual([]);
});

test('late decode from a destroyed scene cannot alter replacement controls or playback',async({page})=>{
  const found=errors(page);
  await page.addInitScript(()=>{
    const original=AudioContext.prototype.decodeAudioData;
    let calls=0;const late:(()=>void)[]=[];
    Object.assign(window,{__releaseDecodes:()=>late.splice(0).forEach(f=>f())});
    AudioContext.prototype.decodeAudioData=function(bytes){
      if(++calls>8)return original.call(this,bytes);
      return new Promise<AudioBuffer>((resolve,reject)=>{late.push(()=>{void original.call(this,bytes).then(resolve,reject);});});
    };
  });
  await page.goto('/');await ready(page);expect((await audio(page)).load).toBe('loading');
  await page.locator('#fit-restart').click();await confirmRestart(page);
  // Restart is queued by Phaser; do not accept the outgoing scene's player phase.
  await expect.poll(async()=>(await session(page)).state.seed).toBe(2);await ready(page);
  await expect.poll(()=>audio(page)).toMatchObject({load:'ready',enabled:false,started:0});
  const before=await audio(page);
  await page.evaluate(()=>(window as unknown as {__releaseDecodes:()=>void}).__releaseDecodes());
  await page.waitForTimeout(200);
  expect(await audio(page)).toEqual(before);expect(found).toEqual([]);
});

async function startSeed(page:Page,seed:number,enabled:boolean) {
  await page.goto('/');await ready(page);
  if(enabled)await enable(page);
  if(seed===2){await page.locator('#fit-restart').click();await confirmRestart(page);await expect.poll(async()=>(await session(page)).state.seed).toBe(2);await ready(page);}
  if(enabled)await expect.poll(()=>audio(page)).toMatchObject({enabled:true,status:'ready'});
}

for(const seed of [1,2]) test(`seed ${seed}: short sound on/off legal checkpoints preserve session and saved bytes`,async({page})=>{
  const found=errors(page),silent:{session:Awaited<ReturnType<typeof session>>;saved:{primary:string|null;backup:string|null}}[]=[];
  const stored=()=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),BATTLE_STORAGE_KEYS);
  for(const enabled of [false,true]){
    if(enabled)await page.evaluate(keys=>Object.values(keys).forEach(key=>localStorage.removeItem(key)),BATTLE_STORAGE_KEYS);
    await startSeed(page,seed,enabled);
    for(let i=0;i<=2;i++){
      const current=await session(page),saved=await stored(),checkpoint={session:current,saved};
      const encoded=encodeBattleSave(current.state,catalog);expect(encoded.ok).toBe(true);
      if(encoded.ok){expect(saved.primary).toBe(encoded.text);expect(decodeBattleSave(encoded.text,catalog)).toEqual({ok:true,state:current.state});}
      const replay=replayBattle(current.replay,catalog);expect(replay.ok).toBe(true);if(replay.ok)expect(replay.state).toEqual(current.state);
      if(enabled)expect(checkpoint).toEqual(silent[i]);else {silent.push(checkpoint);expect((await audio(page)).started).toBe(0);}
      if(i===2)break;
      const command=playerDecision(current.state),previous=(await audio(page)).started;
      await playCommand(page,command);await ready(page);
      if(enabled && command.type!=='endTurn'){
        const expected=battleCues((await session(page)).events.slice(current.events.length),catalog),snapshot=await audio(page);
        expect(snapshot.started).toBeGreaterThan(previous);
        expect(snapshot.recent.slice(-(snapshot.started-previous))).toContain(expected[0]);
      }
    }
    if(enabled){
      expect((await audio(page)).started).toBeGreaterThan(0);
      await page.screenshot({path:test.info().outputPath('audio-checkpoint.png')});
      await page.reload();await page.locator('#save-continue').click();await ready(page);
      expect((await readSession(page)).state).toEqual(silent[2].session.state);
      await enable(page);expect((await audio(page)).started).toBe(0);
      expect(await stored()).toEqual(silent[2].saved);
    }
  }
  expect(found).toEqual([]);
});

for(const [seed,outcome] of [[1,'playerLoss'],[2,'playerWin']] as const) test(`seed ${seed}: complete audible legal battle delivers committed cues and ${outcome}`,async({page})=>{
  test.setTimeout(360000);const found=errors(page),heard=new Set<BattleCue>();
  await startSeed(page,seed,true);
  for(let i=0;i<200;i++){
    await expect.poll(async()=>(await session(page)).phase,{timeout:10000}).toMatch(/^(player|ended|error)$/);
    (await audio(page)).recent.forEach(c=>heard.add(c));
    const s=await session(page);if(s.phase==='ended')break;expect(s.phase).toBe('player');
    const command=playerDecision(s.state),previous=(await audio(page)).started;
    await playCommand(page,command);
    if(command.type!=='endTurn'){
      const committed=(await session(page)).events.slice(s.events.length),expected=battleCues(committed,catalog),snapshot=await audio(page);
      expect(snapshot.started).toBeGreaterThan(previous);
      expect(snapshot.recent.slice(-(snapshot.started-previous))).toContain(expected[0]);
    }
  }
  const final=await session(page);expect(final.state.outcome).toBe(outcome);
  const replay=replayBattle(final.replay,catalog);expect(replay.ok).toBe(true);if(replay.ok)expect(replay.state).toEqual(final.state);
  await expect.poll(async()=>(await audio(page)).recent).toContain(seed===2?'victory':'loss');
  (await audio(page)).recent.forEach(c=>heard.add(c));
  expect([...heard]).toEqual(expect.arrayContaining(['move','hit','miss','unit-defeat',seed===2?'victory':'loss']));
  if(seed===2){
    expect([...heard]).toContain('magic');
    expect(final.replay.commands.filter(c=>c.type==='useAbility').map(c=>c.abilityId)).toEqual(expect.arrayContaining(['ability:basic_attack','ability:guarded_strike','ability:high_shot','ability:magic_missile']));
  }
  await page.screenshot({path:test.info().outputPath('audio-outcome.png')});
  await test.info().attach('audio',{body:JSON.stringify({seed,heard:[...heard],snapshot:await audio(page),replay:final.replay}),contentType:'application/json'});
  expect(found).toEqual([]);
});
