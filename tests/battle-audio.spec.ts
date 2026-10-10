import { expect, test, type Page } from '@playwright/test';
import { session, playCommand, playerDecision } from './helpers/battlePolicy';
import { battleCatalog as catalog } from '../src/content/catalog';
import { replayBattle } from '../src/domain/turns';
import { battleCues, type BattleCue } from '../src/audio/battleCues';
import { LOAD_TIMEOUT_MS } from '../src/phaser/BattleAudio';

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
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>audio(page)).toMatchObject({enabled:true,status:'ready',started:0});
  expect((await session(page)).state).toEqual(before.state);
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});
  await page.locator('#battle-review').click();await page.keyboard.press('Tab');
  expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);
  await page.keyboard.press('Escape');expect((await audio(page)).started).toBe(0);
  expect((await session(page)).state).toEqual(before.state);
  for(let run=2;run<=6;run++){
    if(run===4)await page.locator('#battle-sound').click();
    await page.locator('#fit-restart').click();await expect(page.locator('#game')).toHaveAttribute('data-run',String(run));
    await ready(page);expect((await audio(page)).enabled).toBe(run<4);
    expect((await audio(page)).ownedSounds).toBeLessThanOrEqual(8);
    await expect(page.locator('#battle-sound')).toHaveCount(1);
  }
  await page.reload();await ready(page);expect(await audio(page)).toMatchObject({enabled:false,started:0});expect(found).toEqual([]);
});

test('mute, hidden and context interruptions discard active feedback while commands finish',async({page})=>{
  const found=errors(page);await page.clock.install();await page.goto('/');await ready(page);await enable(page);
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  const before=(await session(page)).state.commandCount;
  await page.locator('#dialog-confirm').click({force:true});
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
  await page.locator('#fit-restart').click();await ready(page); // Seed 2 begins with a player.
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
  await page.locator('#fit-restart').click({force:true});
  await page.clock.runFor(80); // Seed 3's initial enemy move is now presenting.
  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
  const enemy=await session(page);
  expect(enemy.state.units.find(u=>u.id===enemy.state.initiative[enemy.state.activeIndex])!.side).toBe('enemy');
  await expect(page.locator('#battle-sound')).toBeEnabled();
  await page.locator('#battle-sound').click({force:true});
  expect(await audio(page)).toMatchObject({enabled:false,active:null});expect((await session(page)).state).toEqual(enemy.state);
  await page.clock.resume();await ready(page);
  expect(found).toEqual([]);
});

for(const mode of ['reject','pending'] as const) test(`gesture unlock ${mode} remains bounded and retryable`,async({page})=>{
  const found=errors(page);
  await page.addInitScript(mode=>{
    const original=AudioContext.prototype.resume;
    AudioContext.prototype.resume=function(){return window.__allowAudio?original.call(this):mode==='reject'?Promise.reject(Error('refused')):new Promise(()=>{});};
  },mode);
  await page.goto('/');await ready(page);await page.locator('#battle-sound').click();
  await expect.poll(()=>audio(page)).toMatchObject({status:'blocked',started:0});
  await expect(page.locator('#battle-next')).toBeEnabled();
  await page.evaluate(()=>{window.__allowAudio=true;});await page.locator('#battle-sound-retry').click();
  await expect.poll(()=>audio(page)).toMatchObject({status:'ready',started:0});expect(found).toEqual([]);
});

for(const mode of ['missing','corrupt','stalled','decode-stalled'] as const) test(`${mode} optional media leaves legal controls usable`,async({page})=>{
  const found:string[]=[];page.on('pageerror',e=>found.push(e.message));
  if(mode==='decode-stalled')await page.addInitScript(()=>{AudioContext.prototype.decodeAudioData=()=>new Promise(()=>{});});
  else await page.route('**/audio/battle/move.mp3',route=>mode==='stalled'?undefined:route.fulfill({status:mode==='missing'?404:200,contentType:'audio/mpeg',body:'invalid audio'}));
  await page.goto('/');await ready(page);
  if(mode==='stalled' || mode==='decode-stalled'){
    // Restart while optional work is pending, five times; old callbacks must stay inert.
    for(let run=2;run<=6;run++) {await page.locator('#fit-restart').click();await expect(page.locator('#game')).toHaveAttribute('data-run',String(run));}
    await ready(page);
  }
  await expect.poll(()=>audio(page),{timeout:LOAD_TIMEOUT_MS+3000}).toMatchObject({load:'unavailable',started:0});
  await expect(page.locator('#battle-sound-status')).toContainText('Sound unavailable');
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();
  const before=(await session(page)).state.commandCount;await page.locator('#dialog-confirm').click();await ready(page);
  expect((await session(page)).state.commandCount).toBe(before+1);expect(found).toEqual([]);
});

test('HTML5 fallback loads and plays future cues after a gesture',async({page})=>{
  const found=errors(page);
  await page.addInitScript(()=>{Object.defineProperty(window,'AudioContext',{value:undefined});Object.defineProperty(window,'webkitAudioContext',{value:undefined});});
  await page.goto('/');await ready(page);await enable(page);
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();await page.locator('#dialog-confirm').click();
  await expect.poll(()=>audio(page)).toMatchObject({started:1,completed:1,active:null});
  await page.locator('#fit-restart').click();await ready(page);expect((await audio(page)).enabled).toBe(true);expect(found).toEqual([]);
});

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
  await page.locator('#fit-restart').click();await ready(page);
  await expect.poll(()=>audio(page)).toMatchObject({load:'ready',enabled:false,started:0});
  const before=await audio(page);
  await page.evaluate(()=>(window as unknown as {__releaseDecodes:()=>void}).__releaseDecodes());
  await page.waitForTimeout(200);
  expect(await audio(page)).toEqual(before);expect(found).toEqual([]);
});

for(const [seed,outcome] of [[1,'playerLoss'],[2,'playerWin']] as const) test(`seed ${seed}: sound on/off legal battles match with committed cues and ${outcome}`,async({page})=>{
  test.setTimeout(240000);const found=errors(page);let silent:Awaited<ReturnType<typeof session>>|undefined;
  const heard=new Set<BattleCue>();
  for(const enabled of [false,true]) {
    await page.goto('/');await ready(page);
    if(enabled)await enable(page);
    if(seed===2){await page.locator('#fit-restart').click();await expect.poll(async()=>(await session(page)).state.seed).toBe(2);}
    for(let i=0;i<200;i++){
      await expect.poll(async()=>(await session(page)).phase,{timeout:10000}).toMatch(/^(player|ended|error)$/);
      (await audio(page)).recent.forEach(c=>heard.add(c));
      const s=await session(page);if(s.phase==='ended')break;expect(s.phase).toBe('player');
      const command=playerDecision(s.state),previous=(await audio(page)).started;
      await playCommand(page,command);
      if(enabled && command.type!=='endTurn') {
        const committed=(await session(page)).events.slice(s.events.length),expected=battleCues(committed,catalog),snapshot=await audio(page);
        expect(snapshot.started).toBeGreaterThan(previous);
        expect(snapshot.recent.slice(-(snapshot.started-previous))).toContain(expected[0]);
      }
    }
    const final=await session(page);expect(final.state.outcome).toBe(outcome);
    const replay=replayBattle(final.replay,catalog);expect(replay.ok).toBe(true);if(replay.ok)expect(replay.state).toEqual(final.state);
    if(!enabled){silent=final;expect((await audio(page)).started).toBe(0);}
    else {
      expect(final).toEqual(silent);
      await expect.poll(async()=>(await audio(page)).recent).toContain(seed===2?'victory':'loss');
      (await audio(page)).recent.forEach(c=>heard.add(c));
      expect([...heard]).toEqual(expect.arrayContaining(['move','hit','miss','unit-defeat',seed===2?'victory':'loss']));
      if(seed===2){
        expect([...heard]).toContain('magic');
        expect(final.replay.commands.filter(c=>c.type==='useAbility').map(c=>c.abilityId)).toEqual(expect.arrayContaining(['ability:basic_attack','ability:guarded_strike','ability:high_shot','ability:magic_missile']));
      }
      await test.info().attach('audio',{body:JSON.stringify({seed,heard:[...heard],snapshot:await audio(page),replay:final.replay}),contentType:'application/json'});
    }
  }
  expect(found).toEqual([]);
});
