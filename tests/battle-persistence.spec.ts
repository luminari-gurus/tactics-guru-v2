import { test as baseTest } from '@playwright/test';
import { walkDungeon } from './helpers/dungeonTraversal';
import { expect, test, type Page, installRailControls } from './helpers/forceRailControls';
import { readFileSync } from 'node:fs';
import { BATTLE_STORAGE_KEYS as keys } from '../src/persistence/battleStorage';
import { decodeBattleSave, encodeBattleSave } from '../src/domain/saveEnvelope';
import { standaloneCatalog as catalog } from './helpers/playerPolicy';
import { confirmRestart, playCommand, playerDecision, readSession, combatSkin } from './helpers/battlePolicy';
import { BattleSession } from '../src/app/BattleSession';
import { previewMovement } from '../src/domain/grid';
import { RULE_BOUNDS } from '../src/domain/constants';
import type { BattleState } from '../src/domain/types';
import { menuFixture } from './helpers/menuFixtures';
import { RUN_STORAGE_KEYS } from '../src/persistence/runStorage';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';

// Playwright disables BFCache by default; persistence coverage must include cached documents.
test.use({launchOptions:async({browserName},use)=>{
  await use({executablePath:browserName==='chromium'?process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE:undefined,ignoreDefaultArgs:['--disable-back-forward-cache']});
}});

const ready=(page:Page)=>expect(page.locator('#game')).toHaveAttribute('data-phase','player');
const stored=(page:Page)=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),keys);

declare global {
  interface Window {
    testingSaveAudit: { calls: string[]; snapshot: () => Record<string, string | null> };
  }
}
for(const condition of ['missing','valid','corrupt','backup-only','unavailable'] as const) test(`testing routes: fresh play never accesses ${condition} saved games`,async({page})=>{
  const families={battle:keys,run:RUN_STORAGE_KEYS,dungeon:DUNGEON_KEYS};
  const values:Record<string,string>={'isolation-unrelated':'preserve'};
  for(const mode of ['battle','run','dungeon'] as const)for(const slot of ['primary','backup'] as const){
    if(condition==='missing'||condition==='backup-only'&&slot==='primary')continue;
    values[families[mode][slot]]=condition==='corrupt'?'broken saved bytes':menuFixture(mode);
  }
  // Harness setup precedes the application spy; subsequent assertion reads bypass it explicitly.
  await page.goto('./');
  await page.evaluate(values=>{
    for(const [key,text]of Object.entries(values))localStorage.setItem(key,text);
    sessionStorage.setItem('tactics-guru:menu-new-dungeon-review','review sentinel');
  },values);
  const progressKeys=Object.values(families).flatMap(slots=>Object.values(slots));
  const expected=Object.fromEntries([...progressKeys,'isolation-unrelated'].map(key=>[key,values[key]??null]));
  expected['tactics-guru:menu-new-dungeon-review']='review sentinel';
  await page.addInitScript(({progressKeys,unavailable})=>{
    const local=window.localStorage,session=window.sessionStorage;
    const get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem,clear=Storage.prototype.clear;
    const watched=new Set([...progressKeys,'tactics-guru:menu-new-dungeon-review']);
    const calls:string[]=[];
    window.testingSaveAudit={calls,snapshot:()=>Object.fromEntries([
      ...[...progressKeys,'isolation-unrelated'].map(key=>[key,get.call(local,key)]),
      ['tactics-guru:menu-new-dungeon-review',get.call(session,'tactics-guru:menu-new-dungeon-review')],
    ])};
    Storage.prototype.getItem=function(key){if(watched.has(String(key)))calls.push(`read:${key}`);return get.call(this,key);};
    Storage.prototype.setItem=function(key,value){if(watched.has(String(key)))calls.push(`write:${key}`);set.call(this,key,value);};
    Storage.prototype.removeItem=function(key){if(watched.has(String(key)))calls.push(`remove:${key}`);remove.call(this,key);};
    Storage.prototype.clear=function(){calls.push('clear');clear.call(this);};
    if(unavailable)Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}});
  },{progressKeys,unavailable:condition==='unavailable'});
  const audit=async()=>{
    expect(await page.evaluate(()=>window.testingSaveAudit.calls)).toEqual([]);
    expect(await page.evaluate(()=>window.testingSaveAudit.snapshot())).toEqual(expected);
    await expect(page.getByRole('button',{name:/Continue saved|Save recovery|Play unsaved/})).toHaveCount(0);
  };
  const entries=[
    ['battle','./battle/?game=dungeon&entry=continue'],['run','./run?game=battle&entry=recovery'],
    ['dungeon','./dungeon?game=run&entry=new'],['map','./map?game=dungeon&entry=new'],
    ['battle','./?scene=battle&game=run&entry=continue'],['proof','./?scene=proof&game=dungeon&entry=new'],
    ['content-smoke','./?scene=content-smoke&game=run&entry=recovery'],
  ];
  for(const [mode,url]of entries)await test.step(mode+' '+url,async()=>{
    await page.goto(url);
    const ready=async()=>{
      if(mode==='battle')await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
      else if(mode==='run')await expect(page.locator('#run-start')).toBeVisible();
      else if(mode==='dungeon')await expect(page.getByRole('button',{name:'Start new dungeon',exact:true})).toBeVisible();
      else if(mode==='map')await expect(page.locator('#map-grid span')).toHaveCount(400);
      else await expect(page.locator('#fit-status')).toHaveText(mode==='proof'?'Ready':'Content ready');
    };
    await ready();await audit();
    if(mode==='battle'){
      const before=await readSession(page);await page.locator('#battle-next').click();
      await expect.poll(async()=>(await readSession(page)).state.commandCount).toBeGreaterThan(before.state.commandCount);
      await page.locator('#fit-restart').click();
      await expect.poll(async()=>JSON.parse(await page.locator('#game').getAttribute('data-session')??'null')?.state.seed).toBe(2);
    }else if(mode==='run'){
      await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();
      await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await page.locator('#battle-next').click();
      await page.locator('#fit-restart').click();await expect(page.locator('#run-start-encounter')).toBeVisible();
    }else if(mode==='dungeon'){
      await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();
      await expect(page.locator('#dungeon-map')).toBeVisible();
      await page.locator('.dungeon-directions button:not(:disabled)').first().click();
      await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();
      await expect(page.locator('#dungeon-map')).toBeVisible();
    }else if(mode==='proof')await page.locator('#fit-restart').click();
    await audit();
    await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));});
    await audit();await page.reload();await ready();await audit();
    if(mode==='battle'){
      const fresh=(await readSession(page)).state;expect(fresh.seed).toBe(1);
      await page.locator('#battle-next').click();
      await expect.poll(async()=>(await readSession(page)).state.commandCount).toBeGreaterThan(fresh.commandCount);await audit();
      await page.goto('./map');await expect(page.locator('#map-grid span')).toHaveCount(400);await audit();
      await page.goBack({waitUntil:'commit'});await ready();await audit();
      expect((await readSession(page)).state).toEqual(fresh);
    }
    if(mode==='run')expect(JSON.parse(await page.locator('#game').getAttribute('data-run-snapshot')??'null').items.run.encounterIndex).toBe(0);
  });
  await page.goto('./');
  expect(await page.evaluate(()=>window.testingSaveAudit.snapshot())).toEqual(expected);
  if(condition==='valid'||condition==='backup-only'){
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByRole('dialog').getByRole('link',{name:/^Dungeon/}).click();
    await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
    expect(await page.evaluate(()=>window.testingSaveAudit.snapshot())).toEqual(expected);
  }else await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
});
async function seedTwo(page:Page) {
  await page.goto('./?game=battle');await ready(page);await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);
}
test('undo stays unavailable after a move exhausts the command limit',async({page})=>{
  const initial=new BattleSession(catalog,'map:forest_ruins',2).state,hero=initial.units.find(u=>u.side==='player')!;
  const state={...initial,activeIndex:initial.initiative.indexOf(hero.id),commandCount:RULE_BOUNDS.commandCount.max-1};
  await continueSnapshot(page,state);await chooseMove(page);await page.locator('#battle-review').click();await ready(page);
  expect((await readSession(page)).state.commandCount).toBe(RULE_BOUNDS.commandCount.max);
  await expect(page.locator('#battle-undo')).toBeDisabled();
});
async function freeze(page:Page) {await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));}
async function chooseMove(page:Page) {
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});
}
async function touch(page:Page,selector:string) {
  const element=page.locator(selector);await element.scrollIntoViewIfNeeded();const box=(await element.boundingBox())!;
  if(test.info().project.use.hasTouch){await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);return;}
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
}

async function continueSnapshot(page:Page,state:BattleState){
  const save=encodeBattleSave(state,catalog);if(!save.ok)throw Error(save.reason);
  await page.addInitScript(({key,text})=>localStorage.setItem(key,text),{key:keys.primary,text:save.text});
  await page.goto('./?game=battle');await page.locator('#save-continue').click();await ready(page);
  expect((await readSession(page)).state).toEqual(state);
  return save.text;
}

test('undo stays unavailable for the resumed turn after a prior undo',async({page})=>{
  await page.goto('./?game=battle');await ready(page);
  await chooseMove(page);await page.locator('#battle-review').click();await ready(page);
  await expect(page.locator('#battle-undo')).toBeEnabled();await page.locator('#battle-undo').click();await ready(page);
  const before=await readSession(page);
  await page.reload();await page.locator('#save-continue').click();await ready(page);
  expect((await readSession(page)).state).toEqual(before.state);
  await chooseMove(page);await page.locator('#battle-review').click();await ready(page);
  await expect(page.locator('#battle-undo')).toBeDisabled();
  await page.locator('#battle-next').click();await ready(page);
  await chooseMove(page);await page.locator('#battle-review').click();await ready(page);
  await expect(page.locator('#battle-undo')).toBeEnabled();
});
test('default Move Continue is read-only and confirmed movement keeps the remaining-action flow',async({page})=>{
  await page.goto('./?game=battle');await ready(page);const before=await readSession(page),saved=await stored(page);
  await page.reload();await page.locator('#save-continue').click();await ready(page);
  await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#fit-restart')).toBeFocused();
  expect((await readSession(page)).state).toEqual(before.state);expect(await stored(page)).toEqual(saved);
  await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-cancel').click();
  await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#battle-review')).toBeDisabled();expect(await stored(page)).toEqual(saved);
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();await ready(page);
  const moved=await readSession(page);expect(moved.state.commandCount).toBe(before.state.commandCount+1);
  expect(moved.continuation!.commands).toHaveLength(1);expect(moved.continuation!.commands[0].type).toBe('move');
  expect(moved.state.units.find(u=>u.id===moved.state.initiative[moved.state.activeIndex])).toMatchObject({hasMoved:true,hasActed:false});
  await expect(page.locator('#battle-move')).toBeDisabled();await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('[data-action=basic]')).toBeEnabled();await expect(page.locator('#battle-target')).toBeDisabled();
  await page.locator('#battle-scroll').evaluate(e=>{e.scrollTop=0;});
  await page.screenshot({path:test.info().outputPath('post-move.png')});
  const committed=await stored(page);await page.reload();await page.locator('#save-continue').click();await ready(page);
  expect((await readSession(page)).state).toEqual(moved.state);expect(await stored(page)).toEqual(committed);
  await expect(page.locator('#battle-move')).toBeDisabled();await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#battle-target')).toBeDisabled();await expect(page.locator('#battle-review')).toBeDisabled();
});

test('default Move does not return after a legally reached attack before movement',async({page})=>{
  const fixture=new BattleSession(catalog,'map:forest_ruins',2);
  for(let i=0;i<200;i++){
    const command=fixture.phase==='player'?playerDecision(fixture.state):null;
    if(command?.type==='useAbility' && !fixture.active.hasMoved && !fixture.active.hasActed)break;
    if(command)expect(fixture.prepare(command).ok).toBe(true);
    const step=command?fixture.confirm():fixture.nextEnemy();if(!step)throw Error('Missing legal attack boundary');fixture.finishPresentation(step.token);
  }
  const command=playerDecision(fixture.state);expect(command.type).toBe('useAbility');expect(fixture.active.hasMoved).toBe(false);
  await continueSnapshot(page,fixture.state);await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
  await playCommand(page,command);await ready(page);
  const after=await readSession(page);expect(after.state.round).toBe(fixture.state.round);expect(after.state.activeIndex).toBe(fixture.state.activeIndex);
  expect(after.state.units.find(u=>u.id===fixture.active.id)).toMatchObject({hasMoved:false,hasActed:true});
  await expect(page.locator('#battle-move')).toBeEnabled();await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#battle-target')).toBeDisabled();await expect(page.locator('#battle-review')).toBeDisabled();
  await page.locator('#battle-log-open').click();await page.locator('#log-close').click();await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','false');
  await page.locator('#battle-move').click();await expect(page.locator('#battle-target')).toBeEnabled();
  expect(fixture.prepare(command).ok).toBe(true);const step=fixture.confirm()!;fixture.finishPresentation(step.token);expect(after.state).toEqual(fixture.state);
});

for(const boundary of ['command limit','origin only'] as const)test(`default Move respects ${boundary} without an intent or save mutation`,async({page})=>{
  // Validated artificial snapshots isolate domain boundaries; they are not legal-play claims.
  const fixture=new BattleSession(catalog,'map:forest_ruins',2);
  while(fixture.phase==='enemy'){const step=fixture.nextEnemy()!;fixture.finishPresentation(step.token);}
  const actor=fixture.active;
  let state:BattleState;
  if(boundary==='command limit')state={...fixture.state,commandCount:RULE_BOUNDS.commandCount.max};
  else {
    const blockers=fixture.state.units.filter(u=>u.id!==actor.id).slice(0,2);
    state={...fixture.state,units:fixture.state.units.map(u=>({...u,cell:u.id===actor.id?{x:0,y:0}:u.id===blockers[0].id?{x:1,y:0}:u.id===blockers[1].id?{x:0,y:1}:u.cell}))};
  }
  const reach=previewMovement(state,actor.id,catalog);
  if(boundary==='origin only'){expect(reach).toEqual({ok:true,cells:[{cell:{x:0,y:0},cost:0}]});}
  else expect(reach).toEqual({ok:false,reason:'commandLimit'});
  const text=await continueSnapshot(page,state);
  await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed',boundary==='origin only'?'true':'false');
  if(boundary==='command limit')await expect(page.locator('#battle-move')).toBeDisabled();
  else {await expect(page.locator('#battle-move')).toBeEnabled();await expect(page.locator('#battle-target option')).toHaveCount(1);}
  await expect(page.locator('#battle-target')).toHaveValue('');await expect(page.locator('#battle-review')).toBeDisabled();
  expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!).pending).toBeNull();
  expect((await stored(page)).primary).toBe(text);expect((await readSession(page)).state).toEqual(state);
});

test('startup is read-only, keyboard Continue rebuilds no historical presentation, and recovery captures touch/focus',async({page})=>{
  await seedTwo(page);await playCommand(page,playerDecision((await readSession(page)).state));await ready(page);
  const before=await readSession(page),saved=await stored(page);
  await page.reload();await expect(page.locator('#save-continue')).toBeVisible();
  expect(await stored(page)).toEqual(saved);expect(await page.locator('#game').getAttribute('data-session')).toBeNull();
  expect(await page.evaluate(()=>window.fitDiagnostics().battleAudio)).toBeNull();
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeVisible();
  for(let i=0;i<9;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);}
  await page.screenshot({path:test.info().outputPath('continue.png')});
  await page.locator('#save-continue').focus();await page.keyboard.press('Enter');await ready(page);
  await expect(page.locator('#fit-restart')).toBeFocused();
  const after=await readSession(page);expect(after.state).toEqual(before.state);expect(after.replay).toBeNull();expect(after.events).toEqual([]);
  expect(after.continuation).toEqual({snapshot:before.state,commands:[],events:[]});
  expect(await page.evaluate(()=>window.fitDiagnostics().battleAudio)).toMatchObject({lastToken:0,started:0});
  expect(await stored(page)).toEqual(saved);
  await touch(page,'#battle-recovery');await expect(page.getByRole('dialog')).toBeVisible();
  const boxes=await page.getByRole('dialog').locator('button').evaluateAll(buttons=>buttons.map(button=>{
    button.scrollIntoView({block:'nearest'});const r=button.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,bottom:r.bottom};
  }));
  const viewport=page.viewportSize()!;
  for(const box of boxes){expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(viewport.width);expect(box.bottom).toBeLessThanOrEqual(viewport.height);}
  await page.mouse.click(3,viewport.height-3);expect((await readSession(page)).state).toEqual(before.state);
  // Let the browser's native touch highlight fade for the retained image.
  await page.waitForTimeout(350);
  await page.screenshot({path:test.info().outputPath('recovery.png')});
  await touch(page,'#save-close');await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('#battle-recovery')).toBeFocused();expect((await readSession(page)).state).toEqual(before.state);
});

test('held confirmation Enter cannot flow through Restart and replace either saved slot',async({page})=>{
  await page.goto('./?game=battle');await ready(page);
  const before=await readSession(page),old=await stored(page);
  await chooseMove(page);await page.locator('#battle-review').focus();
  await page.keyboard.down('Enter');
  const accepted=await stored(page);
  expect(accepted.primary).not.toBe(old.primary);expect(accepted.backup).toBe(old.primary);
  expect((await readSession(page)).state.commandCount).toBe(before.state.commandCount+1);
  await page.waitForTimeout(600);await page.keyboard.down('Enter');
  await page.waitForTimeout(50);await page.keyboard.down('Enter');await page.keyboard.up('Enter');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect((await readSession(page)).state.seed).toBe(before.state.seed);
  expect(await stored(page)).toEqual(accepted);
  // A fresh press may open reset, but holding that press must not also confirm it.
  await page.locator('#fit-restart').focus();await page.keyboard.down('Enter');
  await expect(page.locator('#save-confirm-reset')).toBeFocused();
  await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
  await expect(page.locator('#save-confirm-reset')).toBeVisible();expect(await stored(page)).toEqual(accepted);
  // Space retains its native keyup activation after repeated keydowns.
  await page.keyboard.down('Space');await page.keyboard.down('Space');
  expect(await stored(page)).toEqual(accepted);await page.keyboard.up('Space');await ready(page);
  expect((await readSession(page)).state.seed).toBe(before.state.seed+1);
  for(const text of Object.values(await stored(page)))expect(text).not.toBe(accepted.primary);
});

for(const side of ['player','enemy'] as const)test(`reload during legal ${side} presentation matches an uninterrupted browser`,async({page,browser,baseURL})=>{
  test.setTimeout(60000);
  const controlContext=await browser.newContext({viewport:page.viewportSize(),baseURL});
  await installRailControls(controlContext);
  const control=await controlContext.newPage();
  const errors:string[]=[];for(const p of [page,control])p.on('pageerror',e=>errors.push(e.message));
  try {
    for(const p of [page,control]){await p.clock.install();await seedTwo(p);}
    expect(await control.evaluate(()=>window.fitDiagnostics().build)).toEqual(await page.evaluate(()=>window.fitDiagnostics().build));
    if(side==='player'){
      for(const p of [page,control]){await chooseMove(p);await freeze(p);await p.locator('#battle-review').click({force:true});}
    }else {
      // Wait through actual player controls and advance just enough to reach an enemy's accepted command.
      for(const p of [page,control]){
        await freeze(p);
        for(let i=0;i<30;i++){
          const s=await readSession(p),command=s.replay?.commands.at(-1);
          if(s.phase==='presenting' && command && s.state.units.find(u=>u.id===command.unitId)!.side==='enemy')break;
          if(s.phase==='player')await p.locator('#battle-next').click({force:true});
          await p.clock.runFor(32);
        }
      }
    }
    const boundary=await readSession(page);expect(boundary.phase).toBe('presenting');expect((await readSession(control)).state).toEqual(boundary.state);
    const last=boundary.replay!.commands.at(-1)!;expect(boundary.state.units.find(u=>u.id===last.unitId)!.side).toBe(side);
    const save=(await stored(page)).primary!,decoded=decodeBattleSave(save,catalog);expect(decoded.ok).toBe(true);if(decoded.ok)expect(decoded.state).toEqual(boundary.state);
    await page.reload();await page.clock.resume();await expect(page.locator('#save-continue')).toBeVisible();
    await page.locator('#save-continue').click();await control.clock.resume();
    await ready(page);await ready(control);
    expect((await readSession(page)).state).toEqual((await readSession(control)).state);
    const resumed=await readSession(page);expect(resumed.continuation!.snapshot).toEqual(boundary.state);
    expect(resumed.replay).toBeNull();
    const future=(await readSession(control)).events.slice(boundary.events.length);
    expect(resumed.events).toEqual(future);
    // Next legal player command and ensuing enemy continuation must also agree.
    const command=playerDecision(resumed.state);
    await playCommand(page,command);await playCommand(control,command);await ready(page);await ready(control);
    expect((await readSession(page)).state).toEqual((await readSession(control)).state);
    expect((await readSession(page)).events).toEqual((await readSession(control)).events.slice(boundary.events.length));
    await expect(page.locator('canvas')).toHaveCount(1);expect(errors).toEqual([]);
  } finally {await controlContext.close();}
});

test('backup recovery retains damaged primary, exports exact text, removes only after confirmation and resumes saving',async({page})=>{
  await seedTwo(page);const snapshot=(await stored(page)).primary!;
  const broken='\ud800\u0000<script>bad</script>'+'x'.repeat(20000);
  await page.evaluate(({keys,snapshot,broken})=>{localStorage.setItem(keys.backup,snapshot);localStorage.setItem(keys.primary,broken);localStorage.setItem('unrelated','keep');},{keys,snapshot,broken});
  await page.reload();await expect(page.locator('#save-continue')).toHaveText('Continue backup');
  await expect(page.getByRole('dialog')).toContainText('some progress may be lost');
  const downloading=page.waitForEvent('download');await page.locator('#save-export').click();const download=await downloading;
  const file=await download.path();expect(file).not.toBeNull();const exported=JSON.parse(readFileSync(file!,'utf8'));
  expect(exported.slots).toEqual(expect.arrayContaining([{slot:'primary',text:broken},{slot:'backup',text:snapshot}]));
  await page.locator('#save-continue').click();await ready(page);await expect(page.locator('#battle-save-status')).toContainText('unsaved');
  const before=(await readSession(page)).state.commandCount;await playCommand(page,playerDecision((await readSession(page)).state));await ready(page);
  expect((await readSession(page)).state.commandCount).toBeGreaterThan(before);expect((await stored(page)).primary).toBe(broken);
  await page.locator('#battle-recovery').click();await page.locator('#save-remove-primary').click();await page.locator('#save-cancel-remove').click();
  expect((await stored(page)).primary).toBe(broken);
  await page.locator('#save-remove-primary').click();await page.locator('#save-confirm-remove').click();
  expect((await stored(page)).primary).toBeNull();await page.locator('#save-retry').click();await page.locator('#save-close').click();
  await expect(page.locator('#battle-save-status')).toContainText('Battle saved');
  const decoded=decodeBattleSave((await stored(page)).primary!,catalog);expect(decoded.ok).toBe(true);if(decoded.ok)expect(decoded.state).toEqual((await readSession(page)).state);
  expect(await page.evaluate(()=>localStorage.getItem('unrelated'))).toBe('keep');
});

test('unknown storage blocks startup until retry; writes remain nonfatal during play',async({page})=>{
  await page.addInitScript(()=>{
    const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
    Object.assign(window,{denyRead:true,denyWrite:false});
    Storage.prototype.getItem=function(key){if((window as any).denyRead && key.startsWith('tactics-guru:phaser:'))throw new DOMException('Denied','SecurityError');return get.call(this,key);};
    Storage.prototype.setItem=function(key,value){if((window as any).denyWrite && key.startsWith('tactics-guru:phaser:'))throw new DOMException('Full','QuotaExceededError');return set.call(this,key,value);};
  });
  await page.goto('./?game=battle');await expect(page.getByRole('dialog')).toContainText('unreadable');expect(await page.locator('#game').getAttribute('data-session')).toBeNull();
  await page.locator('#save-new').click();await page.locator('#save-confirm-reset').click();
  await expect(page.getByRole('dialog')).toContainText('Reset incomplete');expect(await page.locator('#game').getAttribute('data-session')).toBeNull();
  await page.evaluate(()=>Object.assign(window,{denyRead:false,denyWrite:true}));await page.locator('#save-retry').click();await ready(page);
  await expect(page.locator('#battle-save-status')).toContainText('unsaved');
  const before=(await readSession(page)).state.commandCount;await page.locator('#battle-next').click();await ready(page);
  expect((await readSession(page)).state.commandCount).toBeGreaterThan(before);
  await page.evaluate(()=>Object.assign(window,{denyWrite:false}));await page.locator('#battle-recovery').click();await page.locator('#save-retry').click();await page.locator('#save-close').click();
  await expect(page.locator('#battle-save-status')).toContainText('Battle saved');
});

test('failed partial reset retains battle, seed, recovery copies and usable controls; a retry succeeds once',async({page})=>{
  await seedTwo(page);const before=await readSession(page),old=await stored(page);
  await page.evaluate(keys=>{
    const remove=Storage.prototype.removeItem;
    Storage.prototype.removeItem=function(key){if(key===keys.primary)throw new DOMException('Denied','SecurityError');return remove.call(this,key);};
    Object.assign(window,{restoreRemove:()=>{Storage.prototype.removeItem=remove;}});
  },keys);
  await page.locator('#fit-restart').click();await page.locator('#save-confirm-reset').click();
  await expect(page.getByRole('dialog')).toContainText('Reset incomplete');expect((await readSession(page)).state).toEqual(before.state);
  expect((await stored(page)).backup).toBeNull();expect((await stored(page)).primary).toBe(old.primary);
  const downloadEvent=page.waitForEvent('download');await page.locator('#save-export').click();const download=await downloadEvent;
  expect(JSON.parse(readFileSync((await download.path())!,'utf8')).slots).toEqual(expect.arrayContaining([{slot:'primary',text:old.primary},{slot:'backup',text:old.backup}]));
  await page.locator('#save-close').click();await expect(page.locator('#fit-restart')).toBeEnabled();await expect(page.locator('#fit-status')).toHaveText('Battle ready');
  await page.evaluate(()=>(window as any).restoreRemove());await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);
  expect((await readSession(page)).state.seed).toBe(3);await expect(page.locator('canvas')).toHaveCount(1);
  await page.reload();await page.locator('#save-continue').click();await ready(page);expect((await readSession(page)).state.seed).toBe(3);
});

test('changed saved data refuses an old confirmation and requires fresh review',async({page})=>{
  await seedTwo(page);await page.locator('#fit-restart').click();
  await page.evaluate(keys=>localStorage.setItem(keys.primary,'changed'),keys);
  await page.locator('#save-confirm-reset').click();await expect(page.getByRole('dialog')).toContainText('Reset incomplete');
  expect((await stored(page)).primary).toBe('changed');expect((await readSession(page)).state.seed).toBe(2);
  await page.locator('#save-close').click();await page.locator('#battle-party').focus();await page.locator('#fit-restart').click();await page.locator('#save-cancel-reset').click();
  expect((await stored(page)).primary).toBe('changed');await expect(page.locator('#fit-restart')).toBeFocused();
});

test('successful reset with failed fresh save cannot recover an old battle on reload',async({page})=>{
  await seedTwo(page);
  await page.evaluate(()=>{
    const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('tactics-guru:phaser:'))throw new DOMException('Full','QuotaExceededError');return set.call(this,key,value);};
  });
  await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);expect((await readSession(page)).state.seed).toBe(3);
  expect(await stored(page)).toEqual({primary:null,backup:null});await expect(page.locator('#battle-save-status')).toContainText('unsaved');
  await page.reload();await ready(page);expect((await readSession(page)).state.seed).toBe(1);await expect(page.getByRole('dialog')).not.toBeVisible();
});

for(const invalid of ['{broken',JSON.stringify({kind:'tactics-guru:battle-snapshot',format:99,payload:{},digest:'sha256:'+'0'.repeat(64)})])test(`invalid startup requires explicit reset: ${invalid.slice(0,12)}`,async({page})=>{
  await page.goto('/?scene=proof');await page.evaluate(({keys,invalid})=>localStorage.setItem(keys.primary,invalid),{keys,invalid});
  await page.goto('./?game=battle');await expect(page.getByRole('dialog')).toContainText('needs recovery');await expect(page.locator('#save-continue')).toHaveCount(0);
  if(invalid.includes('"format":99'))await expect(page.getByRole('dialog')).toContainText('incompatible');
  expect((await stored(page)).primary).toBe(invalid);await page.locator('#save-new').click();
  await expect(page.locator('#save-confirm-reset')).toBeFocused();
  await page.locator('#save-cancel-reset').click();
  await expect(page.locator('#save-new')).toBeFocused();
  expect((await stored(page)).primary).toBe(invalid);await page.locator('#save-new').click();await page.locator('#save-confirm-reset').click();await ready(page);
  expect((await readSession(page)).state.seed).toBe(1);expect((await stored(page)).primary).not.toBe(invalid);
});

test.describe('browser history with BFCache enabled',()=>{
  test.beforeEach(async({page})=>{
    await page.addInitScript(()=>window.addEventListener('pageshow',event=>{
      if(event.persisted)sessionStorage.setItem('test:bfcache-return',location.href);
    }));
  });

  for(const cached of ['battle','recovery dialog'])test(`cached ${cached} cannot overwrite either slot of its replacement`,async({page,baseURL})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    const first=new URL('./?game=battle&history=first',baseURL).href,map=new URL('map',baseURL).href;
    await page.goto(first);await ready(page);
    expect((await readSession(page)).state.seed).toBe(1);
    if(cached==='recovery dialog'){await page.reload();await expect(page.locator('#save-continue')).toBeVisible();}
    await page.goto(map);await expect(page.locator('#map-grid span')).toHaveCount(400);await page.goto(new URL('./?game=battle',baseURL).href);
    await page.locator('#save-new').click();await page.locator('#save-confirm-reset').click();await ready(page);
    const replacement=await readSession(page),saved=await stored(page);
    expect(replacement.state.seed).toBe(2);
    await page.goBack({waitUntil:'commit'});await expect(page).toHaveURL(map);
    await page.goBack({waitUntil:'commit'});
    await expect(page.locator('#save-continue')).toBeVisible();
    expect(await page.evaluate(()=>sessionStorage.getItem('test:bfcache-return'))).toBe(first);
    expect(await stored(page)).toEqual(saved);
    expect(await page.locator('#game').getAttribute('data-session')).toBeNull();
    await page.screenshot({path:test.info().outputPath('cached-return-recovery.png')});
    await page.locator('#save-continue').click();await ready(page);
    expect((await readSession(page)).state).toEqual(replacement.state);
    expect(await stored(page)).toEqual(saved);
    await page.locator('#battle-next').click();await ready(page);
    const after=await stored(page);
    for(const text of [after.primary,after.backup]){
      const decoded=decodeBattleSave(text!,catalog);expect(decoded.ok).toBe(true);
      if(decoded.ok)expect(decoded.state.seed).toBe(2);
    }
    expect(errors).toEqual([]);
  });

  for(const departure of ['player','presentation'])test(`cached return after restart at ${departure} preserves the accepted boundary`,async({page,baseURL})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    const first=new URL('./?game=battle&history=first',baseURL).href,map=new URL('map',baseURL).href;
    await page.goto(first);await ready(page);
    await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);
    // Observe the last accepted boundary before the application's pagehide shutdown.
    await page.evaluate(keys=>window.addEventListener('pagehide',()=>{
      sessionStorage.setItem('test:departure',JSON.stringify({
        primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup),
      }));
    },{capture:true,once:true}),keys);
    if(departure==='presentation'){
      await page.evaluate(map=>{
        document.querySelector<HTMLButtonElement>('#battle-next')!.click();
        sessionStorage.setItem('test:departure-phase',document.querySelector<HTMLElement>('#game')!.dataset.phase!);
        location.assign(map);
      },map);
      await expect(page).toHaveURL(map);
      expect(await page.evaluate(()=>sessionStorage.getItem('test:departure-phase'))).toBe('presenting');
    }else await page.goto(map);
    await expect(page.locator('#map-grid span')).toHaveCount(400);
    const saved=JSON.parse((await page.evaluate(()=>sessionStorage.getItem('test:departure')))!);
    expect(await stored(page)).toEqual(saved);
    await page.goBack({waitUntil:'commit'});
    await expect(page.locator('#save-continue')).toBeVisible();
    expect(await page.evaluate(()=>sessionStorage.getItem('test:bfcache-return'))).toBe(first);
    expect(await stored(page)).toEqual(saved);
    await page.locator('#save-continue').click();await ready(page);
    const continued=await readSession(page),decoded=decodeBattleSave(saved.primary,catalog);
    expect(decoded.ok).toBe(true);
    if(decoded.ok)expect(continued.continuation!.snapshot).toEqual(decoded.state);
    expect(continued.state.seed).toBe(2);
    if(departure==='player'){expect(await stored(page)).toEqual(saved);expect(continued.events).toEqual([]);}
    await page.screenshot({path:test.info().outputPath(`continued-${departure}.png`)});
    expect(errors).toEqual([]);
  });
});

// Exercise Radial inside this file's existing real BFCache harness.
const radialTest=baseTest.extend({context:async({context},use)=>{
  await context.addInitScript(()=>{
    (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';
    try {localStorage.setItem('tactics-guru:combat-controls','radial');} catch { /* private mode */ }
  });
  await use(context);
}});
radialTest('radial testing routes preserve saved games through actions restart reload and Back',async({page,isMobile})=>{
    const families={battle:keys,run:RUN_STORAGE_KEYS,dungeon:DUNGEON_KEYS};
    const values:Record<string,string>={'radial-unrelated':'preserve'};
    for(const mode of ['battle','run','dungeon'] as const)for(const slot of ['primary','backup'] as const)values[families[mode][slot]]=menuFixture(mode);
    await page.goto('./');
    await page.evaluate(values=>{for(const [key,text]of Object.entries(values))localStorage.setItem(key,text);sessionStorage.setItem('tactics-guru:menu-new-dungeon-review','radial review');},values);
    const progressKeys=Object.values(families).flatMap(slots=>Object.values(slots));
    const expected={...values,'tactics-guru:menu-new-dungeon-review':'radial review'};
    await page.addInitScript(progressKeys=>{
      const local=window.localStorage,session=window.sessionStorage;
      const get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem,clear=Storage.prototype.clear;
      const watched=new Set([...progressKeys,'tactics-guru:menu-new-dungeon-review']),calls:string[]=[];
      window.testingSaveAudit={calls,snapshot:()=>Object.fromEntries([...progressKeys,'radial-unrelated'].map(key=>[key,get.call(local,key)]).concat([['tactics-guru:menu-new-dungeon-review',get.call(session,'tactics-guru:menu-new-dungeon-review')]]))};
      Storage.prototype.getItem=function(key){if(watched.has(String(key)))calls.push(`read:${key}`);return get.call(this,key);};
      Storage.prototype.setItem=function(key,value){if(watched.has(String(key)))calls.push(`write:${key}`);set.call(this,key,value);};
      Storage.prototype.removeItem=function(key){if(watched.has(String(key)))calls.push(`remove:${key}`);remove.call(this,key);};
      Storage.prototype.clear=function(){calls.push('clear');clear.call(this);};
      const draw=crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues=((array:ArrayBufferView<ArrayBuffer>)=>{if(array instanceof Uint32Array&&array.length===1){array[0]=28;return array;}return draw(array);}) as typeof crypto.getRandomValues;
    },progressKeys);
    const audit=async()=>{
      expect(await page.evaluate(()=>window.testingSaveAudit.calls)).toEqual([]);
      expect(await page.evaluate(()=>window.testingSaveAudit.snapshot())).toEqual(expected);
      await expect(page.getByRole('button',{name:/Continue saved|Save recovery|Play unsaved/})).toHaveCount(0);
    };
    for(const mode of ['battle','run','dungeon'] as const){
      await page.goto(`./${mode}`);
      if(mode==='run'){await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();}
      if(mode==='dungeon'){await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await walkDungeon(page,undefined,isMobile?'touch':'keyboard');}
      await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await expect.poll(()=>combatSkin(page)).toBe('radial');
      const fresh=(await readSession(page)).state;
      await page.getByRole('button',{name:'End turn',exact:true}).click();
      await expect.poll(async()=>(await readSession(page)).state.commandCount).toBeGreaterThan(fresh.commandCount);
      await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await audit();
      if(mode==='battle'){
        await page.goto('./map');await page.goBack({waitUntil:'commit'});
        await expect.poll(async()=>(await readSession(page))?.state).toEqual(fresh);await audit();
      }
      await page.locator('#fit-restart').click();
      if(mode==='battle')await expect.poll(async()=>(await readSession(page))?.state.seed).toBe(2);
      else await expect(page.locator(mode==='run'?'#run-start-encounter':'#dungeon-map')).toBeVisible();
      await audit();await page.reload();
      if(mode==='battle'){await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await readSession(page)).state).toEqual(fresh);}
      else await expect(mode==='run'?page.locator('#run-start'):page.getByRole('button',{name:'Start new dungeon',exact:true})).toBeVisible();
      await audit();
    }
    await page.getByRole('link',{name:'Main menu',exact:true}).click();
    expect(await page.evaluate(()=>window.testingSaveAudit.snapshot())).toEqual(expected);
    await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('dialog').getByRole('link',{name:'Dungeon',exact:true}).click();
    await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
    expect(await page.evaluate(()=>window.testingSaveAudit.snapshot())).toEqual(expected);
  });
