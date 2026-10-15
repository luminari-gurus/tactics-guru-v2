import {expect,test,type Page} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {readSession,playCommand} from './helpers/battlePolicy';
import {playerDecision} from './helpers/playerPolicy';
import {runContext} from './helpers/runItemFixtures';
import {runBattleCatalog,type RunSnapshot} from '../src/domain/runSaveEnvelope';
import {replayRunBattle} from '../src/domain/runBattle';
// Exercise actual BFCache rather than Playwright's default disabled cache.
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,ignoreDefaultArgs:['--disable-back-forward-cache']}});
import {RUN_STORAGE_KEYS} from '../src/persistence/runStorage';
async function snapshot(page:Page):Promise<RunSnapshot>{return JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);}
async function start(page:Page){await page.goto('/run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');}
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
test('legal three encounter run, rewards, preparation, final resume and fresh restart',async({page})=>{
 test.setTimeout(300000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);await page.locator('#battle-sound').click();const records=[];
 for(let index=0;index<3;index++){
  await fight(page);if(index===0)await page.screenshot({path:test.info().outputPath('run-reward.png')});const current=await snapshot(page);expect(current.items.run.phase).toBe(index===2?'victory':'reward');expect(current.items.run.encounterIndex).toBe(index);
  const record=JSON.parse((await page.locator('#game').getAttribute('data-run-battle-record'))!);const replay=replayRunBattle(record.replay,record.entry,runContext);expect(replay.ok).toBe(true);if(replay.ok){expect(replay.state).toEqual(record.state);expect(replay.events).toEqual(record.events);}records.push(record);
  if(index<2){
   // The pending offer and claimed/prepared boundary survive the real Continue path.
   if(index===1){await page.reload();await page.locator('#run-continue').click();expect(await snapshot(page)).toEqual(current);}
   await prepare(page);const prepared=await snapshot(page);if(index===1){await page.reload();await page.locator('#run-continue').click();expect(await snapshot(page)).toEqual(prepared);}
   await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
   await expect(page.locator('#battle-sound')).toHaveAttribute('aria-pressed',index===0?'true':'false');
  }
 }
 const final=await snapshot(page);await expect(page.getByRole('heading',{name:'Run victory',exact:true})).toBeVisible();
 await page.screenshot({path:test.info().outputPath('run-victory.png')});
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
 await page.goto('/run');await page.evaluate(key=>localStorage.setItem(key,'{bad'),RUN_STORAGE_KEYS.primary);await page.reload();
 expect(await page.evaluate(key=>localStorage.getItem(key),RUN_STORAGE_KEYS.primary)).toBe('{bad');
 await page.locator('#run-recovery').click();await expect(page.getByRole('dialog')).toContainText('primary: invalid');
 for(let i=0;i<8;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);}
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
