import {expect,test,type Page} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {readSession,playCommand} from './helpers/battlePolicy';
import {playerDecision} from './helpers/playerPolicy';
import {runContext} from './helpers/runItemFixtures';
import {runBattleCatalog,type RunSnapshot} from '../src/domain/runSaveEnvelope';
import {replayRunBattle} from '../src/domain/runBattle';
// Exercise actual BFCache rather than Playwright's default disabled cache.
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,ignoreDefaultArgs:['--disable-back-forward-cache']}});
import {legalDefeatSaves} from './helpers/runRecoveryFixtures';
import {RUN_STORAGE_KEYS} from '../src/persistence/runStorage';
async function loadLegalDefeat(page:Page){
 await test.step('reach legal outcome',async()=>{
  const {primary,backup}=legalDefeatSaves();
  await page.goto('/run');
  await page.evaluate(({keys,primary,backup})=>{
   localStorage.setItem(keys.primary,primary);localStorage.setItem(keys.backup,backup);
  },{keys:RUN_STORAGE_KEYS,primary,backup});
  await page.reload();await page.locator('#run-continue').click();
  await expect(page.getByRole('heading',{name:'Run defeat',exact:true})).toBeVisible();
  expect(await page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),RUN_STORAGE_KEYS)).toEqual({primary,backup});
 });
}
async function snapshot(page:Page):Promise<RunSnapshot>{return JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);}
async function start(page:Page){
 await page.goto('/run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await expect(page.locator('#battle-actor')).toBeVisible();
 const drawable=await page.locator('#battle-board-region').boundingBox();
 expect(drawable!.width).toBeGreaterThan(0);
 expect(drawable!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height*0.3-1);
}
async function ready(page:Page){await expect.poll(async()=>await page.locator('#game').getAttribute('data-phase')??'boundary',{timeout:15000}).toMatch(/player|ended|boundary/);}
async function fight(page:Page,wait=false){
 for(let i=0;i<500;i++){
  await ready(page);const current=await snapshot(page);if(current.items.run.phase!=='battle')break;
  const battle=await readSession(page);expect(battle.phase).toBe('player');const catalog=runBattleCatalog(current.items,runContext)!;
  await playCommand(page,wait?{type:'endTurn',unitId:battle.state.initiative[battle.state.activeIndex]}:playerDecision(battle.state,catalog));
 }
 await expect(page.locator('#run-screen')).toBeVisible();
}
async function prepare(page:Page){
 const current=await snapshot(page),offer=current.items.offer!;
 const choice=offer.options.find(o=>o.itemId==='item:healing_draught')??offer.options[0];
 await page.getByRole('button',{name:`Claim ${runContext.items[choice.itemId].label}`,exact:true}).click();await page.locator('#item-confirm').click();
 await expect(page.locator('#run-start-encounter')).toBeVisible();
 for(const equipment of (await snapshot(page)).items.ownership.equipment){
  const now=await snapshot(page);if(now.items.ownership.assignments.some(a=>a.instanceId===equipment.instanceId))continue;
  const def=runContext.items[equipment.itemId];const hero=now.items.run.party.find(h=>h.hp>0 && def.eligibleHeroes.includes(h.heroId));
  if(hero){await page.locator(`[id="target-${equipment.instanceId}"]`).selectOption(hero.heroId);await page.getByRole('button',{name:`Equip ${def.label}`,exact:true}).click();await page.locator('#item-confirm').click();}
 }
 for(const hero of (await snapshot(page)).items.run.party){
  const now=await snapshot(page);if(hero.hp===0 || hero.hp===runContext.catalog.heroes[hero.heroId].stats.maxHp || !now.items.ownership.consumables.length)continue;
  await page.locator('[id="target-item:healing_draught"]').selectOption(hero.heroId);
  await page.getByRole('button',{name:'Use Healing Draught',exact:true}).click();await page.locator('#item-confirm').click();
 }
}
test('legal run outcomes, earned rewards, terminal resume and fresh restart',async({page})=>{
 test.setTimeout(300000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);await page.locator('#battle-sound').click();const records=[];
 for(let index=0;index<3;index++){
  // Each encounter constructs a fresh shared renderer; prior selections cannot leak.
  const board=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
  expect(board.selected).toBeNull();expect(board.selectionEvents).toBe(0);
  await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#battle-target')).toHaveValue('');await expect(page.locator('#battle-review')).toBeDisabled();
  const runBefore=await snapshot(page);
  const corner=board.tiles.find((t:{x:number;y:number})=>t.x===11&&t.y===11);
  const x=(corner.x-corner.y)*40,y=(corner.x+corner.y)*20-corner.elevation*24;
  await page.mouse.click(board.transform.x+x*board.transform.scale,board.transform.y+y*board.transform.scale);
  expect(JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).selected).toEqual({x:11,y:11,elevation:corner.elevation});
  expect(await snapshot(page)).toEqual(runBefore);
  // Each new scene owns exactly its current actor cue; a finished encounter tears it down.
  await expect.poll(async()=>{
   const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
   const actor=report.units.find((unit:any)=>unit.id===report.activeId);
   expect(report.units.filter((unit:any)=>unit.id!==report.activeId).every((unit:any)=>unit.bobOffset===0)).toBe(true);
   return actor.bobOffset;
  }).toBeLessThan(-0.2);
  const beforeBob=await snapshot(page);
  await page.screenshot({path:test.info().outputPath(`encounter-${index+1}-active-bob.png`)});
  expect(await snapshot(page)).toEqual(beforeBob);
  await fight(page);
  await expect(page.locator('#game')).not.toHaveAttribute('data-battle-report');if(index===0)await page.screenshot({path:test.info().outputPath('run-reward.png')});const current=await snapshot(page);expect(index===2?['victory','defeat']:['reward','defeat']).toContain(current.items.run.phase);expect(current.items.run.encounterIndex).toBe(index);
  const record=JSON.parse((await page.locator('#game').getAttribute('data-run-battle-record'))!);const replay=replayRunBattle(record.replay,record.entry,runContext);expect(replay.ok).toBe(true);if(replay.ok){expect(replay.state).toEqual(record.state);expect(replay.events).toEqual(record.events);}records.push(record);
  if(current.items.run.phase==='defeat')break;
  if(index<2){
   // The pending offer and claimed/prepared boundary survive the real Continue path.
   if(index===1){await page.reload();await page.locator('#run-continue').click();expect(await snapshot(page)).toEqual(current);}
   await prepare(page);const prepared=await snapshot(page);if(index===1){await page.reload();await page.locator('#run-continue').click();expect(await snapshot(page)).toEqual(prepared);}
   await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
   await expect(page.locator('#battle-sound')).toHaveAttribute('aria-pressed',index===0?'true':'false');
  }
 }
 const final=await snapshot(page);await expect(page.getByRole('heading',{name:final.items.run.phase==='victory'?'Run victory':'Run defeat',exact:true})).toBeVisible();
 await page.screenshot({path:test.info().outputPath('run-terminal.png')});
 writeFileSync(test.info().outputPath('run-records.json'),JSON.stringify(records,null,2));
 await page.reload();await page.locator('#run-continue').click();expect(await snapshot(page)).toEqual(final);
 await page.locator('#run-new').dblclick();const fresh=await snapshot(page);expect(fresh.items.run.seed).toBe(14);expect(fresh.items.run.id).not.toBe(final.items.run.id);expect(fresh.items.ownership).toEqual({consumables:[],equipment:[],assignments:[]});expect(fresh.items.run.party.every(h=>h.hp===runContext.catalog.heroes[h.heroId].stats.maxHp)).toBe(true);
 expect(errors).toEqual([]);
});
test('legal defeat reload, native keyboard restart and isolated single-battle save',async({page})=>{
 test.setTimeout(180000);await start(page);await fight(page,true);await expect(page.getByRole('heading',{name:'Run defeat',exact:true})).toBeVisible();
 const ended=await snapshot(page);await page.reload();await page.locator('#run-continue').click();expect(await snapshot(page)).toEqual(ended);
 await page.locator('#run-new').focus();await page.keyboard.press('Enter');await expect(page.locator('#run-start-encounter')).toBeVisible();
 await page.getByRole('link',{name:'Single battle',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const run=await page.evaluate(key=>localStorage.getItem(key),RUN_STORAGE_KEYS.primary);expect(JSON.parse(run!).payload.items.run.encounterIndex).toBe(0);
 await page.getByRole('link',{name:'Play three-encounter run'}).click();await page.locator('#run-continue').click();await expect(page.locator('#run-start-encounter')).toBeVisible();
});
test('accepted player presentation reload preserves exact boundary without old cues',async({page})=>{
 await start(page);await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.locator('#dialog-confirm').click({force:true});
 await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');const committed=await snapshot(page);
 await page.reload();await page.clock.resume();await page.locator('#run-continue').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect((await readSession(page)).state).toEqual(committed.activeBattle);expect((await readSession(page)).events).toEqual([]);expect(await page.evaluate(()=>window.fitDiagnostics().battleAudio?.lastToken)).toBe(0);
 await expect(page.locator('#battle-move')).toBeDisabled();await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','false');
});
test('enemy presentation reload resumes the same commands and RNG as an uninterrupted run',async({page,browser,baseURL})=>{
 const other=await browser.newContext({viewport:page.viewportSize(),baseURL});const control=await other.newPage();
 try {
  for(const p of [page,control]){
   await p.clock.install();await start(p);await p.clock.pauseAt(await p.evaluate(()=>Date.now()+1000));
   for(let i=0;i<100;i++){
    const s=await readSession(p),last=s.replay?.commands.at(-1);
    if(s.phase==='presenting' && last && s.state.units.find(u=>u.id===last.unitId)!.side==='enemy')break;
    if(s.phase==='player')await p.locator('#battle-next').click({force:true});
    await p.clock.runFor(32);
   }
  }
  const boundary=await readSession(page);expect(boundary.phase).toBe('presenting');const last=boundary.replay!.commands.at(-1)!;expect(boundary.state.units.find(u=>u.id===last.unitId)!.side).toBe('enemy');
  expect((await readSession(control)).state).toEqual(boundary.state);
  await page.reload();await page.clock.resume();await page.locator('#run-continue').click();await control.clock.resume();
  for(const p of [page,control])await expect(p.locator('#game')).toHaveAttribute('data-phase','player');
  const resumed=await readSession(page),uninterrupted=await readSession(control);expect(resumed.state).toEqual(uninterrupted.state);
  const catalog=runBattleCatalog((await snapshot(page)).items,runContext)!;const command=playerDecision(resumed.state,catalog);
  for(const p of [page,control]){await playCommand(p,command);await expect(p.locator('#game')).toHaveAttribute('data-phase','player');}
  expect((await readSession(page)).state).toEqual((await readSession(control)).state);
 }finally{await other.close();}
});
test('run startup preserves corrupt bytes, recovery captures input, and unavailable storage permits unsaved play',async({page})=>{
 await page.goto('/run');
 await expect(page.locator('#run-start')).toBeVisible();
 expect(await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),Object.values(RUN_STORAGE_KEYS))).toEqual([null,null]);
 expect((await snapshot(page)).activeBattle).toBeNull();
 await page.evaluate(key=>localStorage.setItem(key,'{bad'),RUN_STORAGE_KEYS.primary);await page.reload();
 expect(await page.evaluate(key=>localStorage.getItem(key),RUN_STORAGE_KEYS.primary)).toBe('{bad');
 await page.locator('#run-recovery').click();await expect(page.getByRole('dialog')).toContainText('primary: invalid');
 const visited=new Set<string>();
 for(const key of ['Tab','Shift+Tab'])for(let i=0;i<8;i++){
  await page.keyboard.press(key);expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);
  visited.add(await page.evaluate(()=>document.activeElement!.id));
 }
 for(const id of await page.getByRole('dialog').getByRole('button').evaluateAll(buttons=>buttons.map(b=>b.id)))expect(visited.has(id)).toBe(true);
 await page.locator('#run-close-recovery').click();await page.locator('#run-start').click();await page.locator('#run-confirm-new').click();await expect(page.locator('#run-start-encounter')).toBeVisible();
 await page.reload();await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}});});await page.reload();
 await page.locator('#run-unsaved').click();await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await expect(page.locator('#battle-persistence')).toContainText('unsaved');
});
test('run preparation and dialogs retain 44px controls, native touch and narrow layout',async({page},info)=>{
 await page.goto('/run');const activate=async(selector:string)=>{if(info.project.use.hasTouch)await page.locator(selector).tap();else await page.locator(selector).click();};
 await activate('#run-start');await expect(page.locator('#run-start-encounter')).toBeVisible();
 for(const viewport of [{width:320,height:568},{width:915,height:412},{width:412,height:915}]){
  await page.setViewportSize(viewport);
  const boxes=await page.locator('#run-screen button,#run-screen a,#run-screen select').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>{n.scrollIntoView({block:'nearest'});const r=n.getBoundingClientRect();return{width:r.width,height:r.height,left:r.left,right:r.right};}));
  for(const box of boxes){expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(viewport.width);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await activate('#run-start-encounter');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await page.locator('#fit-restart').click();await expect(page.getByRole('dialog')).toBeVisible();const before=await snapshot(page);await page.mouse.click(3,3);expect(await snapshot(page)).toEqual(before);await page.locator('#run-cancel-new').click();
 await expect(page.locator('#fit-restart')).toBeFocused();
 await page.locator('#battle-sound').click();await page.locator('#fit-restart').click();await page.locator('#run-confirm-new').click();await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await expect(page.locator('#battle-sound')).toHaveAttribute('aria-pressed','true');
});

test('cached run return cannot overwrite either slot of a newer replacement',async({page,context,baseURL})=>{
 await start(page);const first=(await snapshot(page)).items.run.id;
 await page.goto(new URL('map',baseURL).href);await expect(page.locator('#map-grid span')).toHaveCount(400);
 const replacement=await context.newPage();await replacement.goto('/run');
 await replacement.locator('#run-start').click();await replacement.locator('#run-confirm-new').click();
 const fresh=await snapshot(replacement);expect(fresh.items.run.id).not.toBe(first);expect(fresh.items.run.seed).toBe(14);
 const stored=()=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),RUN_STORAGE_KEYS);
 const before=await stored();await replacement.close();await page.goBack({waitUntil:'commit'});
 await expect(page.locator('#run-continue')).toBeVisible();expect(await stored()).toEqual(before);
 await page.locator('#run-continue').click();expect(await snapshot(page)).toEqual(fresh);
});

test('review: in-flow Continue resumes an ongoing backup battle after legal defeat',async({page})=>{
 await loadLegalDefeat(page);
 await expect(page.getByRole('heading',{name:'Run defeat',exact:true})).toBeVisible();
 const backup=await page.evaluate(key=>localStorage.getItem(key),RUN_STORAGE_KEYS.backup);
 const expected=JSON.parse(backup!).payload.activeBattle;expect(expected.outcome).toBe('ongoing');
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Remove primary save',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Remove reviewed save',exact:true}).click();
 if(await page.getByRole('dialog').isVisible())await page.getByRole('dialog').getByRole('button',{name:/^(Close|Cancel)$/}).click();
 await page.getByRole('button',{name:'Continue saved run',exact:true}).click();
 await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('dialog').getByRole('button',{name:'Continue',exact:true}).click({force:true});
 await page.clock.runFor(32);
 await expect(page.locator('#run-screen')).toBeHidden();await expect(page.locator('#game')).toHaveCSS('visibility','visible');
 expect((await readSession(page)).continuation?.snapshot).toEqual(expected);expect(await page.locator('canvas').count()).toBe(1);
 await page.clock.resume();await expect(page.getByRole('heading',{name:'Run defeat',exact:true})).toBeVisible();
});
test('review: read-level SecurityError permits explicit unsaved play without changing inaccessible bytes',async({page})=>{
 await page.goto('/run');await page.evaluate(keys=>{localStorage.setItem(keys.primary,'preserve primary');localStorage.setItem(keys.backup,'preserve backup');},RUN_STORAGE_KEYS);
 await page.addInitScript(keys=>{
  const read=Storage.prototype.getItem,write=Storage.prototype.setItem,remove=Storage.prototype.removeItem,calls:string[]=[];
  const owns=(key:string)=>Object.values(keys).some(value=>value===key);
  Storage.prototype.getItem=function(key){if(owns(key))throw new DOMException('Read denied','SecurityError');return read.call(this,key);};
  Storage.prototype.setItem=function(key,value){if(owns(key))calls.push('write:'+key);return write.call(this,key,value);};
  Storage.prototype.removeItem=function(key){if(owns(key))calls.push('remove:'+key);return remove.call(this,key);};
  Object.assign(window,{reviewReadEvidence:()=>({primary:read.call(localStorage,keys.primary),backup:read.call(localStorage,keys.backup),calls})});
 },RUN_STORAGE_KEYS);
 await page.reload();await expect(page.locator('#run-continue')).toHaveCount(0);
 await page.locator('#run-recovery').click();await expect(page.getByRole('dialog')).toContainText('primary: unavailable. backup: unavailable');await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('#run-unsaved').click();await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await page.locator('#battle-next').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await expect(page.locator('#battle-persistence')).toContainText('unsaved');
 expect(await page.evaluate(()=>(window as unknown as {reviewReadEvidence:()=>unknown}).reviewReadEvidence())).toEqual({primary:'preserve primary',backup:'preserve backup',calls:[]});
});
test('review: reopened outcome recovery exports the exact retained backup after partial reset',async({page})=>{
 await loadLegalDefeat(page);const ended=await snapshot(page);
 const saved=await page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),RUN_STORAGE_KEYS);expect(saved.backup).not.toBeNull();
 await page.evaluate(primary=>{const remove=Storage.prototype.removeItem;Storage.prototype.removeItem=function(key){if(key===primary)throw new DOMException('Removal denied','SecurityError');return remove.call(this,key);};},RUN_STORAGE_KEYS.primary);
 await page.locator('#run-new').click();await expect(page.getByRole('button',{name:'Export backup save',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 await expect(page.getByRole('button',{name:'Export backup save',exact:true})).toBeVisible();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup save',exact:true}).click();const download=await downloadPromise;
 expect(JSON.parse(readFileSync((await download.path())!,'utf8'))).toEqual({slot:'backup',text:saved.backup});
 expect(await snapshot(page)).toEqual(ended);
 expect(await page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),RUN_STORAGE_KEYS)).toEqual({primary:saved.primary,backup:null});
});
for(const dismiss of ['Escape','Close'] as const)test(`review: recovery dismissal via ${dismiss} retains connected visible keyboard focus`,async({page})=>{
 async function checkFocus(){
  const recovery=page.getByRole('button',{name:'Save recovery',exact:true});const before=await snapshot(page);
  await recovery.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();
  if(before.activeBattle){
   const viewport=page.viewportSize()!;
   await page.setViewportSize({width:viewport.height,height:viewport.width});
   await page.setViewportSize(viewport);
  }
  if(dismiss==='Escape')await page.keyboard.press('Escape');
  else {await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).focus();await page.keyboard.press('Enter');}
  await expect(page.getByRole('dialog')).not.toBeVisible();await expect(recovery).toBeVisible();await expect(recovery).toBeFocused();await expect(recovery).toBeInViewport();
  expect(await recovery.evaluate(node=>node.isConnected && document.activeElement===node)).toBe(true);expect(await snapshot(page)).toEqual(before);
 }
 await page.goto('/run');await page.locator('#run-start').click();await expect(page.locator('#run-start-encounter')).toBeVisible();
 await checkFocus(); // The mounted preparation controls are replaced on dismissal.
 await page.reload();await expect(page.locator('#run-continue')).toBeVisible();await checkFocus();
 await page.locator('#run-continue').click();await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await checkFocus(); // Battle controls stay mounted and keep their existing return behavior.
});

for(const exit of ['Cancel','Escape','Export'] as const)test(`review repair: startup Continue survives ${exit}`,async({page})=>{
 await page.goto('/run');await page.locator('#run-start').click();
 const saved=await snapshot(page);expect(saved.items.run.seed).toBe(13);
 const bytes=await page.evaluate(keys=>Object.values(keys).map(k=>localStorage.getItem(k)),RUN_STORAGE_KEYS);
 await page.reload();
 if(exit==='Export'){
  await page.locator('#run-recovery').click();const pending=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export primary save',exact:true}).click();const download=await pending;
  expect(JSON.parse(readFileSync((await download.path())!,'utf8')).text).toBe(bytes[0]);
 }else{
  await page.locator('#run-start').click();
  if(exit==='Cancel')await page.locator('#run-cancel-new').click();else await page.keyboard.press('Escape');
 }
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.locator('#run-continue').click();await expect(page.locator('#run-start-encounter')).toBeVisible();
 expect(await snapshot(page)).toEqual(saved);
 expect(await page.evaluate(keys=>Object.values(keys).map(k=>localStorage.getItem(k)),RUN_STORAGE_KEYS)).toEqual(bytes);
});

test('review repair: deleting both loaded slots starts a fresh playable run',async({page})=>{
 await start(page);const old=await snapshot(page);await page.reload();await page.locator('#run-recovery').click();
 for(const slot of ['primary','backup']){await page.locator('#run-remove-'+slot).click();await page.locator('#run-confirm-remove').click();}
 expect(await page.evaluate(keys=>Object.values(keys).map(k=>localStorage.getItem(k)),RUN_STORAGE_KEYS)).toEqual([null,null]);
 await page.locator('#run-close-recovery').click();await page.locator('#run-start').click();
 await expect(page.locator('#run-start-encounter')).toBeVisible();const fresh=await snapshot(page);
 expect(fresh.items.run.id).not.toBe(old.items.run.id);expect(fresh.items.run.seed).toBe((old.items.run.seed+1)>>>0);
 expect(fresh.activeBattle).toBeNull();expect(fresh.items.ownership).toEqual({consumables:[],equipment:[],assignments:[]});
 expect(fresh.items.run.party.every(h=>h.hp===runContext.catalog.heroes[h.heroId].stats.maxHp)).toBe(true);
 await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await page.screenshot({path:test.info().outputPath('fresh-after-removal.png')});
});

for(const choice of ['continue','replace'] as const)test(`review repair: recovered storage preserves unsaved bytes until explicit ${choice}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/run');await page.locator('#run-start').click();await page.reload();
 await page.locator('#run-start').click();await page.locator('#run-confirm-new').click();
 const saved=await snapshot(page);expect(saved.items.run.seed).toBe(14);
 const bytes=await page.evaluate(keys=>Object.values(keys).map(k=>localStorage.getItem(k)),RUN_STORAGE_KEYS);
 await page.addInitScript(keys=>{
  Object.assign(window,{denyRunReads:true});const read=Storage.prototype.getItem;
  Storage.prototype.getItem=function(key){if((window as unknown as {denyRunReads:boolean}).denyRunReads && Object.values(keys).some(value=>value===key))throw new DOMException('Read denied','SecurityError');return read.call(this,key);};
 },RUN_STORAGE_KEYS);
 await page.reload();await page.locator('#run-unsaved').click();await page.locator('#run-start-encounter').click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await page.evaluate(()=>Object.assign(window,{denyRunReads:false}));
 for(let i=0;i<2;i++){await page.locator('#battle-next').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');}
 expect(await page.evaluate(keys=>Object.values(keys).map(k=>localStorage.getItem(k)),RUN_STORAGE_KEYS)).toEqual(bytes);
 await expect(page.locator('#battle-persistence')).toContainText('unsaved');
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();await page.locator('#run-retry-save').click();
 expect(await page.evaluate(keys=>Object.values(keys).map(k=>localStorage.getItem(k)),RUN_STORAGE_KEYS)).toEqual(bytes);
 if(choice==='continue'){
  await page.locator('#run-recover-continue').click();await expect(page.locator('#run-start-encounter')).toBeVisible();
  expect(await snapshot(page)).toEqual(saved);await page.locator('#run-start-encounter').click();
 }else{
  await page.locator('#run-close-recovery').click();await page.locator('#fit-restart').click();await page.locator('#run-confirm-new').click();
  await expect(page.locator('#run-start-encounter')).toBeVisible();expect((await snapshot(page)).items.run.id).not.toBe(saved.items.run.id);
  await page.locator('#run-start-encounter').click();
 }
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const now=await snapshot(page);expect(JSON.parse((await page.evaluate(key=>localStorage.getItem(key),RUN_STORAGE_KEYS.primary))!).payload.items.run.id).toBe(now.items.run.id);
 await expect(page.locator('#battle-persistence')).toContainText('Run saved on this device');expect(errors).toEqual([]);
});
