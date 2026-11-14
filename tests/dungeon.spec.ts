import { dungeonContent } from '../src/content/dungeon';
import { walkDungeon, reenterDungeonStair, continueSavedDungeon, openDungeonInventory, collectDungeonEncounterLoot } from './helpers/dungeonTraversal';
import { atEncounter, atStairApproach, checkedDungeon, stagedMageAbility, snaredDefeatBoundary } from './helpers/dungeonFixtures';
import { expect,railTest as test,type Page } from './helpers/dungeonEntropy';
import { readFileSync, writeFileSync } from 'node:fs';
import type { Locator } from '@playwright/test';
import { dungeonCapacityFixture, dungeonVictoryBoundary } from './helpers/dungeonFixtures';
import { dungeonBattle, startDungeonBattle, acceptDungeonBattle, dungeonBoundary, dungeonItem, freshDungeon, readDungeon, type DungeonState } from '../src/domain/dungeon';
import { progressHero } from '../src/domain/progression';
import { decodeDungeon, encodeDungeon } from '../src/domain/dungeonSaveEnvelope';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { RUN_RECORD_KEYS } from '../src/persistence/runRecordsStorage';
import { COMBAT_CONTROLS_KEY } from '../src/ui/combatControls';
import { readSession,playCommand,playUndo,checkActivePlaytime,checkBackgroundPlaytime } from './helpers/battlePolicy';
import { playerDecision, fighterDecision } from './helpers/playerPolicy';
import { journeyPreparation, healedFighterBoundary, shamanJourney } from './helpers/dungeonFixtures';
import { dispatch, replayCommandSequence } from '../src/domain/turns';
import { previewMovement } from '../src/domain/grid';
import { generateMap } from '../src/map/generate';
import type { Command, BattleEvent } from '../src/domain/types';
import { movementBlockSource } from '../src/domain/effects';

const fixedSeedTest = test.extend({ pinDungeonSeed: 28 });
async function snapshot(page:Page):Promise<DungeonState>{return JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!);}
const boardReport=async(page:Page)=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
async function checkSnares(page:Page, fitted=false) {
 const state=(await readSession(page)).state,r=await boardReport(page);
 for(const unit of state.units) {
  const rendered=r.units.find((u:any)=>u.id===unit.id),badge=rendered.snare;
  expect(badge.visible).toBe(unit.movementBlock?.abilityId==='ability:frost_snare'&&!!movementBlockSource(unit,state.units));
  expect(badge.interactive).toBe(false);
  if(!badge.visible)continue;
  expect(badge.width).toBeGreaterThanOrEqual(11.99);
  expect(badge.depth).toBeGreaterThan(rendered.depth);expect(badge.depth).toBeLessThan(10000);
  expect(badge.screen.y+badge.height/2).toBeLessThan(rendered.health.screen.y-4);
  expect(badge.screen.x).toBeCloseTo(r.transform.x+badge.position.x*r.transform.scale,4);
  expect(badge.screen.y).toBeCloseTo(r.transform.y+badge.position.y*r.transform.scale,4);
  if(fitted) {
   expect(badge.screen.x-badge.width/2).toBeGreaterThanOrEqual(r.region.x);
   expect(badge.screen.y-badge.height/2).toBeGreaterThanOrEqual(r.region.y);
   expect(badge.screen.x+badge.width/2).toBeLessThanOrEqual(r.region.x+r.region.width);
   expect(badge.screen.y+badge.height/2).toBeLessThanOrEqual(r.region.y+r.region.height);
  }
 }
}

test('dungeon statistics: active exploration excludes recovery, visibility, blur and menu sessions',async({page},info)=>{
 test.setTimeout(90000);await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('#dungeon-map')).toBeVisible();
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Dungeon save recovery',exact:true})).toBeVisible();
 const clock=await checkActivePlaytime(page,DUNGEON_KEYS.primary,'#dungeon-close-recovery');
 await page.getByRole('link',{name:'Main menu',exact:true}).last().click({force:true});
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeVisible();
 const saved=await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary);
 await page.clock.fastForward(60000);expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(saved);
 await page.clock.resume();await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('#dungeon-map')).toBeVisible();expect((await snapshot(page)).stats?.activeMs).toBe(clock.activeMs);
 await info.attach('active-playtime',{body:JSON.stringify({...clock,visibility:'synthetic hidden/blur; fake browser clock',navigation:'actual menu departure and Continue'}),contentType:'application/json'});
});

test('dungeon statistics: actual background tab pauses active exploration time',async({page},info)=>{
 test.setTimeout(60000);await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('#dungeon-map')).toBeVisible();
 const evidence=await checkBackgroundPlaytime(page,DUNGEON_KEYS.primary);
 await info.attach('actual-background-playtime',{body:JSON.stringify(evidence),contentType:'application/json'});
});
async function historyRows(page:Page){return page.evaluate(keys=>{
 const text=localStorage.getItem(keys.primary);return text?JSON.parse(text).records:[];
},RUN_RECORD_KEYS);}

// UI witnesses straddle the Frost Snare gate; exact XP/HP/caster projections and
// forged save rejection live in dungeonProgressionBoundary.test.ts.
for(const [xp,level,maxHp]of [[0,1,11],[180,3,19]])test(`menu dungeon restores Mage XP ${xp}, caster level and exact active boundary`,async({page})=>{
 // Explicit boundary fixture; earned progression is covered by the extended journeys.
 const fresh=freshDungeon(`menu-caster-${xp}`,190);
 const progressed={...fresh,party:fresh.party.map(hero=>progressHero(hero.heroId,xp,1,dungeonContent.catalog))};
 const started=startDungeonBattle(atEncounter(progressed));if(!started.ok)throw Error(started.reason);
 const battle=started.state.activeBattle!,mage=battle.units.find(unit=>unit.defId==='mage')!;
 const boundary={...started.state,activeBattle:{...battle,activeIndex:battle.initiative.indexOf(mage.id)}};
 await seed(page,boundary);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const before=await snapshot(page);expect(before.party.find(hero=>hero.heroId==='mage')).toMatchObject({xp,level,maxHp});
 await page.locator('#battle-party').click();await expect(page.locator('#battle-dialog-message')).toContainText(`Level ${level}`);await page.locator('#inspection-close').click();
 await page.reload();await continueSavedDungeon(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect(await snapshot(page)).toEqual(before);expect((await readSession(page)).state).toEqual(before.activeBattle);expect((await readSession(page)).events).toEqual([]);
 await expect(page.locator('#battle-ability option[value="ability:frost_snare"]')).toHaveCount(level>=3?1:0);
 const catalog=dungeonBattle(await snapshot(page))!.catalog,missile=catalog.abilities['ability:magic_missile'];expect(missile.kind).toBe('magicMissile');
 if(missile.kind==='magicMissile')expect(missile.casterLevel).toBe(level);
});

for(const abilityId of ['ability:frost_snare','ability:magic_missile'] as const)test(`staged Mage ${abilityId} accepts exact effects replay and saved active reload`,async({page})=>{
 // The level/position boundary is deliberately staged. The extended journey alone proves earned XP.
 const fixture=stagedMageAbility(abilityId),catalog=dungeonBattle(fixture.state)!.catalog;
 const expected=dispatch(fixture.state.activeBattle!,fixture.command,catalog);expect(expected.ok).toBe(true);if(!expected.ok)throw Error(expected.reason);
 await seed(page,fixture.state);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const before=await readSession(page);expect(before.state).toEqual(fixture.state.activeBattle);expect(before.events).toEqual([]);
 if(abilityId==='ability:frost_snare') {
  await checkSnares(page,true);
  const target=before.state.units.find(u=>u.id===fixture.command.target.unitId)!;
  await page.locator('[data-action="ability:frost_snare"]').click();
  await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
  await page.locator('#battle-cancel').click();await checkSnares(page,true);
  expect((await readSession(page)).state).toEqual(before.state);
  await page.locator('[data-action="ability:frost_snare"]').click();await page.locator('canvas').focus();
  // Native target selection moved the cursor; deliberately navigate back to the caster.
  const caster=before.state.units.find(u=>u.id===fixture.command.unitId)!;
  for(let i=0;i<Math.abs(caster.cell.x-target.cell.x);i++)await page.keyboard.press(caster.cell.x>target.cell.x?'ArrowRight':'ArrowLeft');
  for(let i=0;i<Math.abs(caster.cell.y-target.cell.y);i++)await page.keyboard.press(caster.cell.y>target.cell.y?'ArrowDown':'ArrowUp');
  await page.keyboard.press('Enter');await expect(page.locator('#battle-review')).toBeDisabled();
  await checkSnares(page,true);expect((await readSession(page)).state).toEqual(before.state);
  await page.locator('#battle-cancel').click();
 }
 await playCommand(page,fixture.command);
 await expect.poll(async()=>(await readSession(page)).state.commandCount).toBe(before.state.commandCount+1);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const accepted=await readSession(page);expect(accepted.state).toEqual(expected.state);expect(accepted.events).toEqual(expected.events);
 const history=accepted.replay??accepted.continuation!;
 expect(replayCommandSequence('initial' in history?history.initial:history.snapshot,history.commands,catalog))
   .toEqual({ok:true,state:accepted.state,events:accepted.events});
 if(abilityId==='ability:frost_snare') {
   await checkSnares(page,true);await page.screenshot({path:test.info().outputPath('snared-cast.png')});
   expect(accepted.state.rng).toEqual(before.state.rng);expect(accepted.state.units.map(u=>u.hp)).toEqual(before.state.units.map(u=>u.hp));
   expect(accepted.events).toContainEqual({type:'movementBlocked',unitId:fixture.command.target.unitId,sourceId:fixture.command.unitId,abilityId});
 } else expect(accepted.events.filter(e=>e.type==='missileRolled')).toHaveLength(2);
 const saved=await snapshot(page),slots=await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),[DUNGEON_KEYS.primary,DUNGEON_KEYS.backup]);
 await page.reload();await continueSavedDungeon(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const resumed=await readSession(page);expect(await snapshot(page)).toEqual(saved);expect(resumed.state).toEqual(accepted.state);expect(resumed.events).toEqual([]);
 expect(await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),[DUNGEON_KEYS.primary,DUNGEON_KEYS.backup])).toEqual(slots);
 if(abilityId==='ability:frost_snare') {
  await checkSnares(page,true);expect((await boardReport(page)).feedbackBounds).toEqual([]);
  await page.screenshot({path:test.info().outputPath('snared-resumed.png')});
  // Accepted Mage and Ranger Waits plus an unrelated Archer attack preserve Snare.
  for(const id of [3,2]) {
   expect((await readSession(page)).state.initiative[(await readSession(page)).state.activeIndex]).toBe(id);
   await playCommand(page,{type:'endTurn',unitId:id});await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
   await checkSnares(page,true);expect((await boardReport(page)).units.find((u:any)=>u.id===fixture.command.target.unitId).snare.visible).toBe(true);
  }
  expect((await readSession(page)).events.some(e=>e.type==='attackRolled'&&e.unitId===5)).toBe(true);
  await playCommand(page,{type:'endTurn',unitId:1});await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const expired=await readSession(page);await checkSnares(page,true);
  expect(expired.events).toContainEqual({type:'turnEnded',unitId:fixture.command.target.unitId});
  expect(expired.events).toContainEqual({type:'movementBlockExpired',unitId:fixture.command.target.unitId,sourceId:3,abilityId});
  expect((await boardReport(page)).units.every((u:any)=>!u.snare.visible)).toBe(true);
  await page.screenshot({path:test.info().outputPath('snared-expired.png')});
 }
 await test.info().attach('staged-mage-boundary',{body:JSON.stringify({fixture:'staged level/position; not earned progression',command:fixture.command,before:before.state,after:accepted.state,events:accepted.events}),contentType:'application/json'});
});

test('Snared badge follows camera and narrow portrait landscape layouts without capturing input',async({page,browserName},info)=>{
 const f=stagedMageAbility('ability:frost_snare');await seed(page,f.state);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await playCommand(page,f.command);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const state=(await readSession(page)).state,size=page.viewportSize()!;
 for(const viewport of [{width:320,height:568},{width:568,height:320},size]) {
  await page.setViewportSize(viewport);await expect.poll(async()=>(await boardReport(page)).viewport).toEqual(viewport);
  await checkSnares(page,true);
  await page.screenshot({path:info.outputPath(`snared-${viewport.width}x${viewport.height}.png`)});
 }
 const r=await boardReport(page),badge=r.units.find((u:any)=>u.id===f.command.target.unitId).snare;
 const center={x:badge.screen.x,y:badge.screen.y};
 if(info.project.use.hasTouch)await page.touchscreen.tap(center.x,center.y);else await page.mouse.click(center.x,center.y);
 expect((await readSession(page)).state).toEqual(state);
 if(browserName==='chromium'&&info.project.use.hasTouch) {
  const cdp=await page.context().newCDPSession(page),points=(d:number)=>[{x:center.x-d,y:center.y,id:1},{x:center.x+d,y:center.y,id:2}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(10)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(20)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 } else if(browserName==='webkit') {
  // WebKit's driver has no multipoint touch; exercise the production pointer handlers.
  await page.locator('canvas').evaluate((canvas,p)=>{
   const capture=canvas.setPointerCapture;canvas.setPointerCapture=()=>{};
   try {for(const [type,id,x] of [['pointerdown',91,-10],['pointerdown',92,10],['pointermove',92,20],['pointerup',92,20],['pointerup',91,-10]] as const)
    canvas.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,clientX:p.x+x,clientY:p.y,bubbles:true}));
   } finally {canvas.setPointerCapture=capture;}
  },center);
 } else {await page.mouse.move(center.x,center.y);await page.mouse.wheel(0,-150);}
 await expect.poll(async()=>(await boardReport(page)).transform.scale).toBeGreaterThan(r.transform.scale);
 await checkSnares(page);
 const zoomed=await boardReport(page),p={x:r.region.x+r.region.width/2,y:r.region.y+r.region.height/2};
 await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+40,p.y+20,{steps:8});await page.mouse.up();
 await expect.poll(async()=>(await boardReport(page)).transform.x).not.toBe(zoomed.transform.x);
 await checkSnares(page);expect((await readSession(page)).state).toEqual(state);
 await page.screenshot({path:info.outputPath('snared-camera.png')});
 // Replace the scene while Snare is active, then enter a new battle with no stale badge.
 await page.locator('#fit-restart').click();await page.locator('#dungeon-confirm-new').click();
 await expect.poll(async()=>(await snapshot(page)).phase).toBe('ready');
 await walkDungeon(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await checkSnares(page,true);expect((await boardReport(page)).units.every((u:any)=>!u.snare.visible)).toBe(true);
});

for(const kind of ['source','target'] as const)test(`Snared badge clears on legal ${kind} defeat`,async({page})=>{
 const f=snaredDefeatBoundary(kind),encoded=encodeDungeon(f.state);if(!encoded.ok)throw Error(encoded.reason);
 const replayed=replayCommandSequence(f.initial,f.commands,dungeonBattle(f.state)!.catalog);
 expect(replayed.ok).toBe(true);if(replayed.ok)expect(replayed.state).toEqual(f.expected);
 await page.clock.install();await page.goto('./?game=dungeon');
 await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});await page.reload();
 await expect(page.locator('#dungeon-screen')).toHaveAttribute('data-boot','ready',{timeout:60000});
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click({force:true});
 // The saved menu lazily imports its engine; advance RAF while waiting for that
 // real scene, then sample its first presented snapshot before defeat settles.
 await expect.poll(async()=>{await page.clock.runFor(16);return await page.locator('#game').getAttribute('data-battle-report')!==null;},{timeout:60000}).toBe(true);
 expect((await boardReport(page)).units.find((u:any)=>u.id===f.targetId).snare.visible).toBe(true);
 if(f.command) {
  await page.clock.resume();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await checkSnares(page,true);
  await playCommand(page,f.command);
 } else await page.clock.runFor(1000);
 await expect.poll(async()=>(await readSession(page)).state.units.find(u=>u.id===f.defeatedId)!.hp).toBe(0);
 await expect.poll(async()=>(await boardReport(page)).units.find((u:any)=>u.id===f.targetId).snare.visible).toBe(false);
 expect((await readSession(page)).events).toContainEqual({type:'movementBlockExpired',unitId:f.targetId,sourceId:3,abilityId:'ability:frost_snare'});
 await page.screenshot({path:test.info().outputPath(`snared-${kind}-defeated.png`)});
 await test.info().attach('legal-defeat-boundary',{body:JSON.stringify(f),contentType:'application/json'});
});

test('Snared badge excludes a legally Pinned enemy on saved resume',async({page})=>{
 const f=stagedMageAbility('ability:frost_snare'),initial=f.state.activeBattle!,ranger=initial.units.find(u=>u.defId==='ranger')!,mage=initial.units.find(u=>u.defId==='mage')!;
 const before={...initial,activeIndex:initial.initiative.indexOf(ranger.id),units:initial.units.map(u=>({...u,cell:u.id===mage.id?ranger.cell:u.id===ranger.id?mage.cell:u.cell}))};
 const pin=dispatch(before,{type:'useAbility',unitId:ranger.id,abilityId:'ability:pinning_shot',target:f.command.target},dungeonBattle(f.state)!.catalog);
 if(!pin.ok)throw Error(pin.reason);await seed(page,checkedDungeon(readDungeon({...f.state,activeBattle:pin.state})));
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await checkSnares(page,true);
 expect((await readSession(page)).state.units.find(u=>u.id===f.command.target.unitId)!.movementBlock?.abilityId).toBe('ability:pinning_shot');
 expect((await boardReport(page)).units.every((u:any)=>!u.snare.visible)).toBe(true);
});

// Saved New Game avoids its initial dormant seed; draw 27 so the playable seed
// is 28, matching the existing complete legal first-floor witness.
for(const saved of [false,true])(saved?test.extend({pinDungeonSeed:27}):fixedSeedTest)(saved?'saved menu dungeon keeps proof tools hidden across legal encounters':'testing dungeon legally clears a floor, descends and backtracks without accessing saves',async({page,isMobile})=>{
 test.setTimeout(300000); // Three complete battles plus normal exploration and stair input.
 // Reuse the complete first floor of the existing legal Fighter journey.
 const errors:string[]=[];let taunted=false;const lootJourney:unknown[]=[];page.on('pageerror',error=>errors.push(error.message));
 if(!saved)await page.addInitScript(()=>{
  const get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
  const gameKey=(key:string)=>key.startsWith('tactics-guru:phaser:')||key.startsWith('tactics-guru:records:')||key==='tactics-guru:menu-new-dungeon-review';
  Storage.prototype.getItem=function(key){if(gameKey(key))throw Error('Testing saved-game read');return get.call(this,key);};
  Storage.prototype.setItem=function(key,value){if(gameKey(key))throw Error('Testing saved-game write');set.call(this,key,value);};
  Storage.prototype.removeItem=function(key){if(gameKey(key))throw Error('Testing saved-game removal');remove.call(this,key);};
 });
 if(saved){await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();}
 else{await page.goto('./dungeon');await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();}
 await expect(page.locator('#dungeon-map')).toBeVisible();
 expect((await snapshot(page)).seed).toBe(28);
 expect((await snapshot(page)).stats).toEqual(saved?expect.objectContaining({coverage:'whole-run',movesTaken:0,enemiesKilled:0}):undefined);
 let expectedKills=0;
 for(let slot=0;slot<3;slot++){
  await walkDungeon(page,undefined,isMobile?'touch':'keyboard');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const encounterEntry=await snapshot(page);
  expectedKills+=encounterEntry.activeBattle!.units.filter(unit=>unit.side==='enemy').length;
  await expect(page.getByRole('complementary',{name:'Dungeon battle controls',exact:true})).toBeVisible();
  await expect(page.getByText('Board controls',{exact:true})).not.toBeVisible();
  await expect(page.getByText('Measurements',{exact:true})).not.toBeVisible();
  await expect(page.getByRole('button',{name:'Play test sound',exact:true})).not.toBeVisible();
  await expect(page.locator('#fit-restart')).toBeEnabled();
  await expect(page.locator('#battle-sound')).toBeVisible();
  if(saved&&slot===0){
   await page.getByRole('button',{name:'Save recovery',exact:true}).click();await page.locator('#dungeon-close-recovery').click();
   await page.locator('#fit-restart').click();await page.locator('#dungeon-cancel-new').click();
   await expect(page.locator('#fit-restart')).toBeFocused();
  }
  if(saved)await page.screenshot({path:test.info().outputPath(`gameplay-battle-${slot}.png`)});
  for(let step=0;step<500;step++){
   await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page))?.phase==='player';}).toBe(true);
   const s=await snapshot(page);if(s.phase!=='battle')break;
   const command=fighterDecision((await readSession(page)).state,dungeonBattle(s)!.catalog,taunted);
   await playCommand(page,command);taunted ||= command.type==='useAbility'&&command.abilityId==='ability:taunt';
   await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page))?.phase==='player';}).toBe(true);
  }
  const finished=await snapshot(page);expect(finished.phase).not.toBe('defeat');expect(finished.floors[0].completed).toBe(slot+1);
  expect(finished.phase).toBe('ready');expect(finished.offer).toBeNull();expect(finished.floors[0].loot).toHaveLength(slot+1);
  await expect(page.getByRole('region',{name:'Rewards',exact:true})).toHaveCount(0);
  if(saved){expect(finished.stats?.enemiesKilled).toBe(expectedKills);expect(finished.stats!.movesTaken).toBeGreaterThan(0);}
  else expect(finished.stats).toBeUndefined();
  if(saved)expect(await historyRows(page)).toEqual([]);
  await collectDungeonEncounterLoot(page,encounterEntry,isMobile?'touch':'keyboard');
  for(let i=0;i<20;i++){
   const s=await snapshot(page),command=journeyPreparation(s);if(!command)break;
   if(command.type==='claimReward')await page.getByRole('button',{name:`Claim ${dungeonContent.items[command.itemId].label}`,exact:true}).click();
   else if(command.type==='useItem'){await openDungeonInventory(page);const label=dungeonContent.items[command.itemId].label;await page.getByRole('combobox',{name:`${label} target`,exact:true}).selectOption(command.heroId);await page.getByRole('button',{name:`Use ${label}`,exact:true}).click();}
   else if(command.type==='equipItem'){await openDungeonInventory(page);const row=page.locator(`[data-instance-id="${command.instanceId}"]`);await row.locator('select').selectOption(command.heroId);const item=s.ownership.equipment.find(e=>e.instanceId===command.instanceId)!;await row.getByRole('button',{name:`Equip ${dungeonContent.items[item.itemId].label}`,exact:true}).click();}
   else throw Error('Unexpected preparation command');await page.locator('#dungeon-item-confirm').click();
  }
  const prepared=await snapshot(page);
  lootJourney.push({slot,contact:encounterEntry.encounterEntry?.contact,reward:finished.floors[0].loot!.at(-1),
   partyBeforeBattle:encounterEntry.party,partyAfterBattle:finished.party,partyAfterPreparation:prepared.party,ownership:prepared.ownership});
 }
 const cleared=await snapshot(page);await walkDungeon(page,cleared.floors[0].descriptor.downstairs,isMobile?'touch':'keyboard');
 const second=await snapshot(page);expect(second.depth).toBe(2);expect(second.party).toEqual(cleared.party);expect(second.ownership).toEqual(cleared.ownership);
 await reenterDungeonStair(page,'ascend',isMobile?'touch':'keyboard');
 const returned=await snapshot(page);expect(returned.depth).toBe(1);expect(returned.floors[0].completed).toBe(3);expect(returned.party).toEqual(cleared.party);expect(returned.ownership).toEqual(cleared.ownership);
 expect(returned.floors[0].loot).toEqual(cleared.floors[0].loot);
 writeFileSync(test.info().outputPath('ground-loot-first-floor.json'),JSON.stringify({seed:returned.seed,saved,collection:'manual',encounters:lootJourney,returned},null,2));
 if(saved){expect(returned.stats?.enemiesKilled).toBe(cleared.stats?.enemiesKilled);expect(returned.stats!.movesTaken).toBeGreaterThan(cleared.stats!.movesTaken);}
 await expect(page.getByRole('button',{name:'Save recovery',exact:true})).toHaveCount(saved?1:0);
 if(saved){
  expect(await historyRows(page)).toEqual([]);
  await page.getByRole('link',{name:'Main menu',exact:true}).last().click();
  await page.getByRole('button',{name:'Hall of Records',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('No finished journeys recorded yet.');
  await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Start new dungeon',exact:true}).click();
  await expect(page.locator('#dungeon-map')).toBeVisible();
  await expect.poll(()=>historyRows(page)).toMatchObject([{id:returned.id,outcome:'abandoned',battlesWon:3,floorsCleared:1,
   stats:{coverage:'whole-run',enemiesKilled:returned.stats!.enemiesKilled,movesTaken:returned.stats!.movesTaken}}]);
  const rows=await historyRows(page);expect(rows[0].stats.activeMs).toBeGreaterThanOrEqual(returned.stats!.activeMs);
  const bests=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).bests.dungeon,RUN_RECORD_KEYS.primary);
  expect(Object.keys(bests)).toHaveLength(5);expect(rows[0].stats.activeMs).toBeGreaterThan(0);
  expect(Object.values(bests).every((row:any)=>row.id===returned.id)).toBe(true);
 }
 expect(errors).toEqual([]);
});

// Use the same legal New Game seed as the complete saved first-floor journey above.
test.extend({pinDungeonSeed:27})('saved dungeon downloads only after explicit recovery export',async({page,isMobile})=>{
 test.setTimeout(120000);
 // Playtime checkpoints write saves when recovery opens or the page reloads.
 // Disable time accrual here so exact byte checks isolate export behavior.
 await page.addInitScript(()=>{document.hasFocus=()=>false;});
 const downloads:string[]=[];
 page.on('download',download=>downloads.push(download.suggestedFilename()));
 const activate=async(control:Locator)=>{if(isMobile)await control.tap();else await control.click();};
 const stored=()=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),DUNGEON_KEYS);
 const dialog=page.getByRole('dialog'),recovery=page.getByRole('button',{name:'Save recovery',exact:true});

 await test.step('ordinary exploration, accepted movement and an enemy turn never download',async()=>{
  await page.goto('./');await activate(page.getByRole('button',{name:'New Game',exact:true}));
  await expect(page.locator('#dungeon-map')).toBeVisible();
  expect((await snapshot(page)).seed).toBe(28);
  await walkDungeon(page,undefined,isMobile?'touch':'keyboard');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const before=await readSession(page),actor=before.state.initiative[before.state.activeIndex];
  const reach=previewMovement(before.state,actor,dungeonBattle(await snapshot(page))!.catalog);
  if(!reach.ok)throw Error(reach.reason);
  const destination=reach.cells.find(cell=>cell.cost>0);
  if(!destination)throw Error('Legal opening battle has no movement destination');
  await activate(page.locator('#battle-move'));
  await page.locator('#battle-target').selectOption(`${destination.cell.x},${destination.cell.y}`);
  await activate(page.locator('#battle-review'));
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const moved=await readSession(page);
  expect(moved.state.commandCount).toBe(before.state.commandCount+1);
  expect(moved.state.units.find(unit=>unit.id===actor)?.cell).toEqual(destination.cell);
  expect(downloads).toEqual([]);

  const enemies=new Set(before.state.units.filter(unit=>unit.side==='enemy').map(unit=>unit.id));
  let enemyTurn=false;
  for(let turn=0;turn<before.state.initiative.length&&!enemyTurn;turn++){
   const previous=await readSession(page);
   await activate(page.getByRole('button',{name:'Wait / End turn',exact:true}));
   await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
   const current=await readSession(page);
   expect(current.state.commandCount).toBeGreaterThan(previous.state.commandCount);
   enemyTurn=current.events.slice(previous.events.length).some(event=>event.type==='turnStarted'&&enemies.has(event.unitId));
   expect(downloads).toEqual([]);
  }
  expect(enemyTurn,'the legal witness must cross an enemy turn and return to player control').toBe(true);
 });

 const saved=await stored(),boundary=await snapshot(page),battle=(await readSession(page)).state;
 expect(saved.primary).not.toBeNull();expect(saved.backup).not.toBeNull();
 const unchanged=async()=>{
  expect(await stored()).toEqual(saved);
  expect(await snapshot(page)).toEqual(boundary);
  expect((await readSession(page)).state).toEqual(battle);
 };
 await test.step('recovery lists each live export once before reloading',async()=>{
  await activate(recovery);await expect(dialog).toHaveAccessibleName('Dungeon save recovery');
  for(const label of ['Export current progress','Export primary save','Export backup save']){
   await expect(dialog.getByRole('button',{name:label,exact:true})).toHaveCount(1);
  }
  await activate(page.locator('#dungeon-close-recovery'));await expect(dialog).not.toBeVisible();
  await unchanged();expect(downloads).toEqual([]);
 });

 await test.step('reload and Continue preserve the accepted boundary without downloading',async()=>{
  await page.reload();await continueSavedDungeon(page);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await unchanged();expect(downloads).toEqual([]);
 });

 await test.step('native pointer or touch recovery open, close and removal cancel never download',async()=>{
  await activate(recovery);await expect(dialog).toHaveAccessibleName('Dungeon save recovery');
  await activate(page.locator('#dungeon-close-recovery'));await expect(dialog).not.toBeVisible();
  await activate(recovery);await activate(page.locator('#dungeon-remove-primary'));
  await expect(dialog).toHaveAccessibleName('Remove reviewed save?');
  await activate(page.locator('#dungeon-remove-cancel'));await expect(dialog).toHaveAccessibleName('Dungeon save recovery');
  await activate(page.locator('#dungeon-close-recovery'));await expect(dialog).not.toBeVisible();
  await unchanged();expect(downloads).toEqual([]);
 });

 await test.step('a fresh Enter after opening recovery or cancelling removal cannot export',async()=>{
  const heading=dialog.getByRole('heading',{name:'Dungeon save recovery'});
  await recovery.focus();await page.keyboard.press('Enter');
  await expect(dialog).toHaveAccessibleName('Dungeon save recovery');
  await expect(heading).toBeFocused();
  await page.keyboard.press('Enter');await expect(dialog).toHaveAccessibleName('Dungeon save recovery');
  await page.keyboard.press('Tab');await expect(dialog.getByRole('button').first()).toBeFocused();
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
  await unchanged();expect(downloads).toEqual([]);

  await activate(recovery);await activate(page.locator('#dungeon-remove-primary'));
  await expect(dialog).toHaveAccessibleName('Remove reviewed save?');
  await page.locator('#dungeon-remove-cancel').focus();await page.keyboard.press('Enter');
  await expect(dialog).toHaveAccessibleName('Dungeon save recovery');
  await expect(heading).toBeFocused();
  await page.keyboard.press('Enter');await expect(dialog).toHaveAccessibleName('Dungeon save recovery');
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
  await unchanged();expect(downloads).toEqual([]);
 });

 for(const key of ['Enter','Space'])await test.step(`held ${key} cannot activate export across recovery or dialog replacement`,async()=>{
  await recovery.focus();await page.keyboard.down(key);
  if(key==='Enter')await expect(dialog).toHaveAccessibleName('Dungeon save recovery');
  else await expect(dialog).not.toBeVisible(); // Native Space activates on release.
  await page.keyboard.down(key);await page.keyboard.down(key);await page.keyboard.up(key);
  await expect(dialog).toHaveAccessibleName('Dungeon save recovery');
  await expect(dialog.getByRole('heading',{name:'Dungeon save recovery'})).toBeFocused();
  await unchanged();expect(downloads).toEqual([]);

  await activate(page.locator('#dungeon-remove-primary'));
  await expect(dialog).toHaveAccessibleName('Remove reviewed save?');
  await page.locator('#dungeon-remove-cancel').focus();await page.keyboard.down(key);
  await expect(dialog).toHaveAccessibleName(key==='Enter'?'Dungeon save recovery':'Remove reviewed save?');
  await page.keyboard.down(key);await page.keyboard.down(key);await page.keyboard.up(key);
  await expect(dialog).toHaveAccessibleName('Dungeon save recovery');
  await expect(dialog.getByRole('heading',{name:'Dungeon save recovery'})).toBeFocused();
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
  await unchanged();expect(downloads).toEqual([]);
 });

 await test.step('one explicit export downloads the exact reviewed bytes without changing saves or state',async()=>{
  await activate(recovery);await expect(dialog).toHaveAccessibleName('Dungeon save recovery');
  const exportPrimary=page.getByRole('button',{name:'Export primary save',exact:true});
  const exportId=await exportPrimary.getAttribute('id');expect(exportId).toMatch(/^dungeon-export-\d+$/);
  const expectedName=`tactics-guru-dungeon-${exportId!.replace('dungeon-export-','')}.json`;
  expect(downloads).toEqual([]);
  const pending=page.waitForEvent('download');await activate(exportPrimary);
  const download=await pending,file=await download.path();
  expect(file).not.toBeNull();expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toBe(expectedName);
  expect(readFileSync(file!,'utf8')).toBe(saved.primary);
  await expect(dialog).not.toBeVisible();await unchanged();
  expect(downloads).toEqual([expectedName]);
 });
});

test('new dungeons use fresh layouts across reloads and saved dungeons retain theirs',async({page})=>{
 await page.goto('./?game=dungeon');
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
 const first=await snapshot(page);
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 expect(await snapshot(page)).toEqual(first);
 await page.reload();await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
 const second=await snapshot(page);
 expect(second.seed).not.toBe(first.seed);
 expect(generateMap(second.floors[0].descriptor.seed,'rooms').cells).not.toEqual(generateMap(first.floors[0].descriptor.seed,'rooms').cells);
});
test('play unsaved dungeon uses a fresh layout each visit and does not write a save',async({page})=>{
 await page.goto('./?game=dungeon');
 await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
 const first=await snapshot(page);
 await page.reload();
 await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
 const second=await snapshot(page);
 expect(second.seed).not.toBe(first.seed);
 expect(generateMap(second.floors[0].descriptor.seed,'rooms').cells).not.toEqual(generateMap(first.floors[0].descriptor.seed,'rooms').cells);
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes(':dungeon:')))).toEqual([]);
});

test('Shaman production journey uses Hex and ally healing, reloads Weakened and replays a complete legal battle',async({page,isMobile},info)=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const witness=shamanJourney(189),catalog=dungeonBattle(witness.entry)!.catalog;
 // This is the canonical unplayed save: level 1, full HP, no fabricated inventory or combat boundary.
 await seed(page,freshDungeon('shaman-production-journey',189));
 await walkDungeon(page,undefined,isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const first=await readSession(page);expect(first.state.units.find(u=>u.id===6)?.defId).toBe('goblin_shaman');
 const board=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
 const shaman=board.units.find((u:any)=>u.unitId==='goblin_shaman');
 expect(shaman).toMatchObject({assetId:'asset:goblin_shaman_sprite'});expect(shaman.anchorError).toBeLessThan(0.001);
 await page.screenshot({path:info.outputPath('shaman-production-board.png')});
 await page.locator('#battle-party').click();await page.locator('#inspect-unit-6').click();
 await expect(page.getByRole('dialog')).toContainText('Weakening Hex range 2–4');
 await expect(page.getByRole('dialog')).toContainText('Heal Goblin range 1–4');
 await expect(page.getByRole('dialog')).toContainText('Fighter #1 50%');
 await expect(page.getByRole('dialog')).toContainText('Ranger #2 45%');
 await expect(page.getByRole('dialog')).toContainText('Mage #3 55%');
 await page.screenshot({path:info.outputPath('shaman-abilities-inspection.png')});await page.locator('#inspection-close').click();
 let reloaded=false;let prefixCommands:readonly Command[]=[],prefixEvents:readonly BattleEvent[]=[];
 for(let step=0;(await snapshot(page)).phase==='battle'&&step<500;step++) {
  await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page)).phase==='player';}).toBe(true);
  if((await snapshot(page)).phase!=='battle')break;
  const before=await readSession(page),weak=before.state.units.find(u=>u.weakenedBy!==undefined);
  if(weak&&!reloaded) {
   const saved=await snapshot(page);
   await page.locator('#battle-log-open').click();await expect(page.getByRole('dialog')).toContainText('Will save fails');
   await expect(page.getByRole('dialog')).toContainText('50% save chance');
   await page.screenshot({path:info.outputPath('shaman-will-save-log.png')});await page.locator('#log-close').click();
   await page.locator('#battle-party').click();await page.locator(`#inspect-unit-${weak.id}`).click();
   await expect(page.getByRole('dialog')).toContainText('Weakened by Goblin Shaman #6');
   await expect(page.getByRole('dialog')).toContainText('−2 accuracy');
   await page.screenshot({path:info.outputPath('shaman-weakened-inspection.png')});await page.locator('#inspection-close').click();
   const commands=before.replay?.commands??before.continuation!.commands;
   if(commands.some(c=>c.type==='undoMove'))throw Error('Unexpected undo in Shaman witness');
   prefixCommands=commands as readonly Command[];prefixEvents=before.events;
   expect(prefixEvents.some(e=>e.type==='saveRolled'&&!e.saved)).toBe(true);
   await page.reload();await continueSavedDungeon(page);
   await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
   expect((await snapshot(page)).activeBattle).toEqual(saved.activeBattle);
   expect((await readSession(page)).events).toEqual([]);reloaded=true;continue;
  }
  await playCommand(page,playerDecision(before.state,catalog));
  await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page)).state.commandCount>before.state.commandCount;}).toBe(true);
 }
 expect(reloaded).toBe(true);
 const record=JSON.parse((await page.locator('#game').getAttribute('data-dungeon-battle-record'))!);
 const commands=[...prefixCommands,...(record.replay?.commands??record.continuation.commands)],events=[...prefixEvents,...record.events];
 // The HUD submits one automatic missile as unitId; the pure policy uses its equivalent one-entry array.
 const expectedCommands=witness.commands.map(c=>c.type==='useAbility'&&c.abilityId==='ability:magic_missile'&&'missileTargets' in c.target&&c.target.missileTargets.length===1
  ?{...c,target:{unitId:c.target.missileTargets[0]}}:c);
 expect(commands).toEqual(expectedCommands);expect(record.state).toEqual(witness.state);
 expect(events.filter(e=>e.type==='healed')).toHaveLength(2);expect(events.some(e=>e.type==='weakenedExpired')).toBe(true);
 let replayed=witness.entry.activeBattle!;const replayEvents:BattleEvent[]=[];
 for(const command of commands){const r=dispatch(replayed,command,catalog);if(!r.ok)throw Error(r.reason);replayed=r.state;replayEvents.push(...r.events);}
 expect({state:replayed,events:replayEvents}).toEqual({state:record.state,events});
 expect(record.state.outcome).toBe('playerWin');expect((await snapshot(page)).party.every(h=>!Object.hasOwn(h,'weakenedBy'))).toBe(true);
 expect(errors).toEqual([]);
 writeFileSync(info.outputPath('shaman-production-journey.json'),JSON.stringify({seed:189,entry:witness.entry,commands,events,state:record.state,reloaded,final:await snapshot(page)},null,2));
 await page.screenshot({path:info.outputPath('shaman-terminal.png'),fullPage:true});
});

test('automatic stairs preserve healed Fighter carry and fresh battle resources',async({page,isMobile})=>{
 test.setTimeout(90000);
 // Generate the legal boundary under current rules; the historical #163 receipt remains immutable.
 const record=healedFighterBoundary();expect(record.state.units.find(u=>u.defId==='fighter')!.secondWindUsed).toBe(true);
 const completed=acceptDungeonBattle(record.entry,record.state);if(!completed.ok)throw Error(completed.reason);
 const approach=atStairApproach(declineReward(completed.state)),party=approach.party,ownership=approach.ownership;
 expect(party.find(h=>h.heroId==='fighter')!.hp).toBeGreaterThan(0);expect(party.find(h=>h.heroId==='fighter')!.learned).toContain('ability:second_wind');
 await seed(page,approach);await walkDungeon(page,approach.floors[0].descriptor.downstairs,isMobile?'touch':'keyboard');
 const arrived=await snapshot(page);expect(arrived.depth).toBe(2);expect(arrived.revision).toBe(approach.revision+1);expect(arrived.party).toEqual(party);expect(arrived.ownership).toEqual(ownership);
 expect(arrived.party.every(h=>!Object.hasOwn(h,'secondWindUsed')&&!Object.hasOwn(h,'tauntedBy'))).toBe(true);
 await page.screenshot({path:test.info().outputPath('healed-party-automatic-arrival.png'),fullPage:true});
 await page.reload();await continueSavedDungeon(page);expect(await snapshot(page)).toEqual(arrived);
 await walkDungeon(page,undefined,isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const entry=await snapshot(page),built=dungeonBattle(entry)!;expect(built.state.units.find(u=>u.defId==='fighter')!.hp).toBe(party.find(h=>h.heroId==='fighter')!.hp);
 expect((await readSession(page)).state.units.every(u=>!u.secondWindUsed&&u.tauntedBy===undefined)).toBe(true);
 await page.locator('#battle-party').click();await page.locator('#inspect-unit-1').click();await expect(page.getByRole('dialog')).toContainText('Second Wind 1/1');
 await page.screenshot({path:test.info().outputPath('fresh-resource-after-automatic-stairs.png')});
});
async function seed(page:Page,s:DungeonState){const encoded=encodeDungeon(s);if(!encoded.ok)throw Error(encoded.reason);await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>{localStorage.setItem(key,text);}, {key:DUNGEON_KEYS.primary,text:encoded.text});await page.reload();await continueSavedDungeon(page);}
function fixture(slot:number){for(let seed=1;seed<=50;seed++){const f=dungeonVictoryBoundary(seed,slot);if(f)return f;}throw Error('No legal fixture');}
function declineReward(state: DungeonState) {
 return checkedDungeon(dungeonItem(state, { ...dungeonBoundary(state), type: 'declineReward', offerId: state.offer!.id }));
}
fixedSeedTest('dungeon battle undo survives reload and a legal defeat journey',async({page,isMobile})=>{
 test.setTimeout(300000);
 // This case qualifies undo/reload/defeat; random-layout identity has its own case.
 await page.goto('./?game=dungeon');
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
 await walkDungeon(page,undefined,isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const entry=await snapshot(page);const restored=await playUndo(page,dungeonBattle(entry)!.catalog,isMobile);
 await page.reload();await continueSavedDungeon(page);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await readSession(page)).state).toEqual(restored);
 await expect(page.locator('#battle-undo')).toBeDisabled();
 for(let i=0;i<100;i++){
  if((await snapshot(page)).phase!=='battle')break;
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  if(isMobile)await page.locator('#battle-next').tap();else await page.locator('#battle-next').click();
  await expect.poll(async()=>{const state=await snapshot(page);return state.phase!=='battle'||(await readSession(page)).phase==='player';}).toBe(true);
 }
 await expect(page.getByRole('heading',{name:/Dungeon defeat/})).toBeVisible();
 const ended=await snapshot(page);
 await expect.poll(()=>historyRows(page)).toMatchObject([{id:ended.id,outcome:'defeat'}]);
 const recorded=await historyRows(page),slots=await page.evaluate(keys=>[localStorage.getItem(keys.primary),localStorage.getItem(keys.backup)],DUNGEON_KEYS);
 await page.reload();await continueSavedDungeon(page);
 await expect(page.getByRole('heading',{name:/Dungeon defeat/})).toBeVisible();
 expect(await snapshot(page)).toEqual(ended);expect(await historyRows(page)).toEqual(recorded);
 expect(await page.evaluate(keys=>[localStorage.getItem(keys.primary),localStorage.getItem(keys.backup)],DUNGEON_KEYS)).toEqual(slots);
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
 await expect(page.getByRole('heading',{name:/Dungeon · Floor 1/})).toBeVisible();
 expect(await historyRows(page)).toEqual(recorded);
});
fixedSeedTest('read-only entry, keyboard new dungeon, real action and active resume',async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 // This witnesses startup/input/resume; fresh random layouts have separate coverage.
 await page.goto('./?game=dungeon');
 await expect(page.getByRole('button',{name:'Continue saved dungeon',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)))).toEqual({[COMBAT_CONTROLS_KEY]:'rail'});
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).focus();await page.keyboard.press('Enter');await page.locator('#dungeon-confirm-new').click();
 await expect(page.locator('#dungeon-descend')).toHaveCount(0);await expect(page.locator('#dungeon-ascend')).toHaveCount(0);
 const frame=await page.locator('#dungeon-screen').boundingBox();expect(frame!.y).toBe(0);expect(frame!.height).toBe(page.viewportSize()!.height);
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('floor-entry.png'),fullPage:true});
 await walkDungeon(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const shortcutEntry=await snapshot(page);
 await page.locator('canvas').focus();await page.keyboard.press('a');
 await expect(page.locator('[data-action=basic]')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('m');await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
 expect(await snapshot(page)).toEqual(shortcutEntry);
 await page.locator('#battle-party').focus();
 if(isMobile)await page.locator('#fit-restart').tap();else await page.locator('#fit-restart').click();
 await page.locator('#dungeon-cancel-new').click();await expect(page.locator('#fit-restart')).toBeFocused();
 const before=await snapshot(page),cmd=playerDecision((await readSession(page)).state,dungeonBattle(before)!.catalog);
 await playCommand(page,cmd);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const saved=await snapshot(page);await page.reload();await continueSavedDungeon(page);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await readSession(page)).state).toEqual(saved.activeBattle);expect((await readSession(page)).events).toEqual([]);
 await page.screenshot({path:test.info().outputPath('battle-resumed.png')});expect(errors).toEqual([]);
});
test('legal reward and guardian boundaries, travel reload, backtracking and isolated saves',async({page,isMobile})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const slot of [0,1,2]){
  const f=fixture(slot);writeFileSync(test.info().outputPath(`legal-boundary-${slot}.json`),JSON.stringify(f));
  await seed(page,f.snapshot);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await playCommand(page,f.command);await expect(page.locator('#dungeon-screen')).toBeVisible();
  const s=await snapshot(page),result=dispatch(f.snapshot.activeBattle!,f.command,dungeonBattle(f.snapshot)!.catalog);expect(result.ok).toBe(true);
  if(result.ok){const expected=acceptDungeonBattle(f.snapshot,result.state);expect(expected.ok).toBe(true);if(expected.ok){expect(s).toEqual({...expected.state,stats:expect.objectContaining({coverage:'since-upgrade',enemiesKilled:1,movesTaken:0})});expect(s.stats?.boundary).toEqual({battle:slot,command:result.state.commandCount});}}
  const rewards=page.getByRole('region',{name:'Rewards',exact:true});
  const descentHint=page.getByText('Descent unlocked. Walk onto the downstairs to continue.',{exact:true});
  const status=page.locator('.dungeon-status');
  await expect(descentHint).toHaveCount(0);
  await expect(rewards).toBeInViewport({ratio:1});
  await expect(status).toContainText('Dungeon saved on this device');
  await page.reload();await continueSavedDungeon(page);expect(await snapshot(page)).toEqual(s);
  await expect(rewards).toBeInViewport({ratio:1});
  if(slot===2){
   await expect(page.locator('#dungeon-map').getByText('↓',{exact:true})).toHaveCount(0);
   for(const direction of ['north','east','south','west'])await expect(page.locator(`#dungeon-step-${direction}`)).toBeDisabled();
  }
  const claim=rewards.getByRole('button',{name:/^Claim /}).first();
  const item=(await claim.textContent())!.replace(/^Claim /,'');
  const nextStep=slot===2?'unlock descent':'prepare the next encounter';
  const choose=async()=>{if(isMobile)await claim.tap();else await claim.click();};
  await choose();await expect(page.locator('#battle-dialog-message')).toHaveText(`Claim ${item} and ${nextStep}?`);
  await page.locator('#dungeon-item-cancel').click();expect(await snapshot(page)).toEqual(s);
  await choose();await page.locator('#dungeon-item-confirm').click();
  await expect(status).toContainText('Dungeon saved on this device');
  const claimed=await snapshot(page);
  expect(claimed).toMatchObject({phase:'ready',offer:null});
  expect(claimed.ownership).not.toEqual(s.ownership);
  if(slot===2){
   await expect(descentHint).toBeVisible();
   await page.reload();await continueSavedDungeon(page);expect(await snapshot(page)).toEqual(claimed);
   await expect(rewards).toHaveCount(0);
   await page.evaluate(()=>localStorage.setItem('tactics-guru:phaser:run:primary:v1','preserved-short-run'));
   await walkDungeon(page,s.floors[s.depth-1].descriptor.downstairs,isMobile?'touch':'keyboard');expect((await snapshot(page)).depth).toBe(2);const second=await snapshot(page);
   await page.screenshot({path:test.info().outputPath('automatic-descent.png'),fullPage:true});
   await page.reload();await continueSavedDungeon(page);expect(await snapshot(page)).toEqual(second);
   await reenterDungeonStair(page,'ascend');const returned=await snapshot(page);expect(returned.depth).toBe(1);expect(returned.floors[0].completed).toBe(3);expect(returned.ownership).toEqual(second.ownership);expect(returned.floors[0].position).toBe(returned.floors[0].descriptor.downstairs);
   await expect(page.locator('#dungeon-start-encounter')).toHaveCount(0);await reenterDungeonStair(page,'descend');const revisited=await snapshot(page);expect(revisited.floors.map(f=>f.descriptor)).toEqual(second.floors.map(f=>f.descriptor));expect(revisited.floors.map(f=>f.completed)).toEqual(second.floors.map(f=>f.completed));
   expect((await snapshot(page)).depth).toBe(2);expect((await snapshot(page)).party).toEqual(second.party);expect((await snapshot(page)).ownership).toEqual(second.ownership);
   expect(await page.evaluate(()=>localStorage.getItem('tactics-guru:phaser:run:primary:v1'))).toBe('preserved-short-run');
   await page.screenshot({path:test.info().outputPath('floor-two-revisited.png'),fullPage:true});
  }
 }
 expect(errors).toEqual([]);
});
test('corrupt bytes stay exportable and uncertain travel requires explicit recovery',async({page})=>{
 // Keep elapsed playtime from changing the fixture during refused travel.
 await page.addInitScript(()=>{document.hasFocus=()=>false;});
 test.setTimeout(90000);const f=fixture(2),result=dispatch(f.snapshot.activeBattle!,f.command,dungeonBattle(f.snapshot)!.catalog);if(!result.ok)throw Error('fixture failed');
 const cleared=acceptDungeonBattle(f.snapshot,result.state);if(!cleared.ok)throw Error(cleared.reason);
 const approach=atStairApproach(declineReward(cleared.state));await seed(page,approach);
 await page.evaluate(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){original.call(this,k,v);if(k===key&&JSON.parse(v).payload.depth===2)throw Error('uncertain travel write');};},DUNGEON_KEYS.primary);
 await page.locator(`#dungeon-map [data-cell="${approach.floors[0].descriptor.downstairs}"]`).click();
 await expect(page.locator('.dungeon-status')).toContainText('Travel not published');
 expect(await snapshot(page)).toMatchObject({depth:approach.depth,revision:approach.revision,floors:approach.floors});
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();await page.locator('#dungeon-continue-primary').click();expect((await snapshot(page)).depth).toBe(2);
 await page.evaluate(key=>localStorage.setItem(key,'broken save bytes'),DUNGEON_KEYS.primary).catch(()=>{});await page.reload();
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export primary save',exact:true}).click();await downloadPromise;
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe('broken save bytes');
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();await page.locator('#dungeon-remove-primary').click();await page.locator('#dungeon-remove-cancel').click();
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe('broken save bytes');
});

test('declining a dungeon reward preserves inventory and allows the next encounter',async({page,isMobile})=>{
 const initial=dungeonCapacityFixture();await seed(page,initial);
 const viewport=page.viewportSize()!;
 const rewards=page.getByRole('region',{name:'Rewards',exact:true});
 for(const size of [{width:393,height:852},{width:740,height:360}]){
  await page.setViewportSize(size);
  await page.screenshot({path:test.info().outputPath(`saved-reward-choice-${size.width}x${size.height}.png`)});
  await expect(rewards).toBeInViewport({ratio:1});
 }
 await page.setViewportSize(viewport);
 const decline=page.getByRole('button',{name:'Decline reward',exact:true});
 const activate=async()=>{if(isMobile)await decline.tap();else await decline.press('Enter');};
 await activate();await page.locator('#dungeon-item-cancel').click();
 expect(await snapshot(page)).toEqual(initial);
 await activate();await page.locator('#dungeon-item-confirm').click();
 const next=await snapshot(page);
 expect(next).toMatchObject({phase:'ready',offer:null,ownership:initial.ownership});
 await expect(rewards).toHaveCount(0);
 await expect(page.locator('.dungeon-status')).toContainText('Dungeon saved on this device');
 await page.reload();await continueSavedDungeon(page);expect(await snapshot(page)).toEqual(next);
 await walkDungeon(page,undefined,isMobile?'touch':'keyboard');
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
});

test('confirmed charm discard frees full capacity without cancelling or duplicating the pending reward',async({page,isMobile})=>{
 const initial=dungeonCapacityFixture();await seed(page,initial);
 const rewards=page.getByRole('region',{name:'Rewards',exact:true});
 const manage=rewards.getByRole('button',{name:'Manage owned items',exact:true});
 const inventory=page.locator('#dungeon-inventory');
 const saved=await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary);
 await expect(rewards).toContainText('Charm inventory is full');
 await expect(inventory).toHaveJSProperty('open',false);
 await rewards.getByRole('button',{name:/^Claim /}).first().click();
 await page.locator('#dungeon-item-confirm').click();
 await expect(page.locator('.dungeon-status')).toContainText('Choice refused: capacity');
 expect(await snapshot(page)).toEqual(initial);
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(saved);
 if(isMobile)await manage.tap();else await manage.press('Enter');
 await expect(inventory).toHaveJSProperty('open',true);
 await expect(inventory.locator('summary')).toBeFocused();
 const target=initial.ownership.equipment[0].instanceId;
 const discard=()=>page.locator(`[data-instance-id="${target}"]`).getByRole('button',{name:'Discard Warding Charm',exact:true});
 for(const cancellation of ['Cancel','Escape']){
  if(isMobile)await discard().tap();else await discard().click();
  await expect(page.getByRole('dialog')).toContainText('unequip it from fighter');await expect(page.locator('#dungeon-discard-cancel')).toBeFocused();
  if(cancellation==='Cancel'){await page.screenshot({path:test.info().outputPath('discard-confirmation.png')});await page.locator('#dungeon-discard-cancel').click();}else await page.keyboard.press('Escape');
  expect(await snapshot(page)).toEqual(initial);expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(saved);
 }
 await discard().click();await page.locator('#dungeon-discard-confirm').click();
 const disposed=await snapshot(page);expect(disposed.ownership.equipment).toHaveLength(5);expect(disposed.ownership.assignments).toEqual([]);expect(disposed.offer).toEqual(initial.offer);expect(disposed.party).toEqual(initial.party);expect(disposed.phase).toBe('reward');
 await expect(manage).toHaveCount(0);
 await expect(page.locator('#dungeon-descend')).toHaveCount(0);
 await page.reload();await continueSavedDungeon(page);expect(await snapshot(page)).toEqual(disposed);
 await page.getByRole('button',{name:/^Claim /}).first().click();await page.locator('#dungeon-item-confirm').click();
 const claimed=await snapshot(page);expect(claimed.ownership.equipment).toHaveLength(6);expect(claimed.ownership.equipment.some(e=>e.instanceId===target)).toBe(false);expect(claimed.phase).toBe('ready');expect(claimed.offer).toBeNull();
 await page.screenshot({path:test.info().outputPath('discard-capacity-recovered.png'),fullPage:true});
 await page.reload();await continueSavedDungeon(page);expect(await snapshot(page)).toEqual(claimed);
 await openDungeonInventory(page);
 await page.getByRole('button',{name:/^Discard /}).first().click();await page.locator('#dungeon-discard-confirm').click();
 const prepared=await snapshot(page);expect(prepared.phase).toBe('ready');expect(prepared.ownership.equipment).toHaveLength(5);
 await walkDungeon(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await expect(page.getByRole('button',{name:/^Discard /})).toHaveCount(0);
});

test('a claimed Revive Kit restores a fallen dungeon hero across Continue and next encounter',async({page,isMobile})=>{
 const witness=dungeonVictoryBoundary(13);if(!witness)throw Error('Missing victory witness');
 const {snapshot:entry,command}=witness;
 const result=dispatch(entry.activeBattle,command,dungeonBattle(entry)!.catalog);if(!result.ok)throw Error(result.reason);
 const victory=acceptDungeonBattle(entry,result.state);if(!victory.ok)throw Error(victory.reason);
 expect(victory.state.party[2].hp).toBe(0);
 await seed(page,victory.state);
 const mageHealth = page.locator('meter[aria-label="Mage health"]');
 await expect(mageHealth).toHaveAttribute('aria-valuetext','0 of 11 hit points, defeated');
 await expect(page.locator('#dungeon-hero-mage')).toBeEnabled();
 const activate=async(name:string)=>{const button=page.getByRole('button',{name,exact:true});if(isMobile)await button.tap();else await button.click();};
 await activate('Claim Revive Kit');await activate('Confirm');
 await openDungeonInventory(page);
 await expect(page.getByRole('combobox',{name:'Revive Kit target'})).toHaveValue('mage');
 await activate('Use Revive Kit');
 await expect(page.getByRole('dialog')).toContainText('mage will have 3/11 HP');
 await activate('Confirm');
 expect((await snapshot(page)).ownership.consumables).toEqual([]);
 await expect(mageHealth).toHaveAttribute('aria-valuetext','3 of 11 hit points, injured');
 await page.reload();await continueSavedDungeon(page);
 expect((await snapshot(page)).party[2].hp).toBe(3);
 await expect(mageHealth).toHaveAttribute('aria-valuetext','3 of 11 hit points, injured');
 await walkDungeon(page,undefined,isMobile?'touch':'keyboard');
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect((await readSession(page)).state.units.find(u=>u.defId==='mage')?.hp).toBe(3);
});

test('an earned Healing Draught survives dungeon Continue and settles once after a legal battle',async({page,isMobile})=>{
 test.setTimeout(180000);
 const witness=dungeonVictoryBoundary(13);if(!witness)throw Error('Missing victory witness');
 const won=dispatch(witness.snapshot.activeBattle,witness.command,dungeonBattle(witness.snapshot)!.catalog);if(!won.ok)throw Error(won.reason);
 const victory=acceptDungeonBattle(witness.snapshot,won.state);if(!victory.ok)throw Error(victory.reason);
 await seed(page,victory.state);
 const claim=page.getByRole('button',{name:'Claim Healing Draught',exact:true});
 if(isMobile)await claim.tap();else await claim.click();
 await page.locator('#dungeon-item-confirm').click();
 await walkDungeon(page,undefined,isMobile?'touch':'keyboard');
 let used=false;
 for(let i=0;i<500;i++){
  await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||await page.locator('#game').getAttribute('data-phase')==='player';}).toBe(true);
  const current=await snapshot(page);if(current.phase!=='battle')break;
  const before=(await readSession(page)).state, actor=before.units.find(u=>u.id===before.initiative[before.activeIndex])!;
  const button=page.locator('#battle-draught');
  if(!used&&await button.isEnabled()){
   await playCommand(page,{type:'drinkDraught',unitId:actor.id});
   await expect(button).toHaveText('Healing Draught ×0 · None left');
   const accepted=(await readSession(page)).state;
   expect(accepted.rng).toEqual(before.rng);
   expect(accepted.units.find(u=>u.id===actor.id)!.hp).toBeGreaterThan(actor.hp);
   await page.reload();await continueSavedDungeon(page);
   await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
   expect((await readSession(page)).state).toEqual(accepted);used=true;
  } else await playCommand(page,playerDecision(before,dungeonBattle(current)!.catalog));
 }
 await expect(page.locator('#dungeon-screen')).toBeVisible();
 expect(used).toBe(true);
 const final=await snapshot(page);
 expect(final.activeBattle).toBeNull();
 expect(final.ownership.consumables).toEqual([]);
 await page.reload();await continueSavedDungeon(page);
 expect(await snapshot(page)).toEqual(final);
});

test('fresh dungeon keeps the map and party in view and opens the selected character sheet', async ({page,isMobile}) => {
 await page.route('**/battle/portraits/mage.png', route => route.abort());
 await page.goto('./');
 const newGame = page.getByRole('button',{name:'New Game',exact:true});
 if (isMobile) await newGame.tap(); else await newGame.click();
 const map = page.locator('#dungeon-map'), party = page.getByRole('region',{name:'Party',exact:true});
 await expect(map).toBeInViewport();
 await expect(party).toBeInViewport();
 expect(await page.locator('#dungeon-screen').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
 const fighter = party.getByRole('button',{name:'Fighter',exact:true});
 const mage = party.getByRole('button',{name:'Mage',exact:true});
 await expect(fighter.locator('img')).toHaveJSProperty('naturalWidth',96);
 await expect(mage.locator('img')).toHaveCount(0);
 await expect(party.locator('meter[aria-label="Fighter health"]')).toHaveAttribute('aria-valuetext','18 of 18 hit points');
 const before = await snapshot(page);
 const direction = await page.locator('.dungeon-directions button:enabled').first().getAttribute('aria-label');
 const arrow = {North:'ArrowUp',East:'ArrowRight',South:'ArrowDown',West:'ArrowLeft'}[direction as 'North'|'East'|'South'|'West'];
 expect(arrow).toBeDefined();
 if (isMobile) await fighter.tap();
 else { await fighter.focus(); await page.keyboard.press('Enter'); }
 const dialog = page.getByRole('dialog',{name:'Fighter character sheet'});
 await expect(dialog.locator('img')).toHaveJSProperty('naturalWidth',192);
 await expect(dialog).toContainText('18/18 HP');
 await expect(dialog).toContainText('Level 1');
 await expect(dialog).toContainText('Accuracy');
 await expect(dialog).toContainText('Armor class');
 await page.screenshot({path:test.info().outputPath('character-sheet.png')});
 await page.keyboard.press(arrow);
 expect(await snapshot(page)).toEqual(before);
 await page.keyboard.press('Escape');
 await expect(dialog).not.toBeVisible();
 await expect(fighter).toBeFocused();
 if (isMobile) await mage.tap(); else await mage.click();
 const mageSheet = page.getByRole('dialog',{name:'Mage character sheet'});
 await expect(mageSheet).toContainText('11/11 HP');
 await mageSheet.getByRole('button',{name:'Close',exact:true}).click();
 await expect(mage).toBeFocused();
 expect(await snapshot(page)).toEqual(before);
});

test('hero progression commits once, heals at a threshold and survives inspection and reload',async({page})=>{
 test.setTimeout(90000);
 const f=fixture(1),built=dungeonBattle(f.snapshot)!;
 const resolved=dispatch(f.snapshot.activeBattle!,f.command,built.catalog);if(!resolved.ok)throw Error(resolved.reason);
 const completed=acceptDungeonBattle(f.snapshot,resolved.state);if(!completed.ok)throw Error(completed.reason);
 const leveled=completed.state.party.filter((h,i)=>h.level>f.snapshot.party[i].level);
 expect(leveled.length).toBeGreaterThan(0);for(const h of leveled)expect(h.hp).toBe(h.maxHp);
 await seed(page,f.snapshot);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await page.locator('#battle-party').click();await expect(page.getByRole('dialog')).toContainText('Level 1');await page.locator('#inspection-close').click();
 await playCommand(page,f.command);
 await expect(page.locator('#dungeon-screen')).toBeVisible();
 expect((await snapshot(page)).party).toEqual(completed.state.party);
 await page.locator(`#dungeon-hero-${leveled[0].heroId}`).click();
 await expect(page.getByRole('dialog')).toContainText('Level 2');
 await expect(page.getByRole('dialog')).toContainText('XP');
 await page.locator('#dungeon-sheet-close').click();
 await expect(page.locator('.dungeon-status')).toContainText('reached level 2');
 await expect(page.locator('.dungeon-status')).toContainText('learned Second Wind');
 await expect(page.locator('.dungeon-status')).not.toContainText('ability:');
 await page.locator('section[aria-label="Party"]').scrollIntoViewIfNeeded();
 await expect(page.locator('section[aria-label="Party"]')).toBeVisible();
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('hero-level-up.png'),fullPage:true});
 const saved=await snapshot(page);await page.reload();await continueSavedDungeon(page);
 expect((await snapshot(page)).party).toEqual(saved.party);
 await expect(page.locator('.dungeon-status')).not.toContainText('reached level');
 const offer=saved.offer!;await page.getByRole('button',{name:`Claim ${dungeonContent.items[offer.options[0].itemId].label}`,exact:true}).click();await page.locator('#dungeon-item-confirm').click();
 expect((await snapshot(page)).party).toEqual(saved.party);
});

test('character sheets switch heroes and show equipped charms through equip, resume, and unequip', async ({page,isMobile}) => {
 const initial = dungeonCapacityFixture();
 await seed(page, initial);
 const party = page.getByRole('region',{name:'Party',exact:true});
 const fighter = party.getByRole('button',{name:'Fighter',exact:true});
 const ranger = party.getByRole('button',{name:'Ranger',exact:true});
 const dialog = page.getByRole('dialog');
 const close = dialog.getByRole('button',{name:'Close',exact:true});
 const open = async (portrait: Locator) => {
  if (isMobile) await portrait.tap();
  else { await portrait.focus(); await page.keyboard.press('Enter'); }
 };
 const activate = async (control: Locator) => {
  if (isMobile) await control.tap();
  else { await expect(control).toBeFocused(); await page.keyboard.press('Enter'); }
 };
 const expectSheet = async (hero: string, stats: string[], expected: string) => {
  await expect(dialog).toHaveAccessibleName(`${hero} character sheet`);
  await expect(dialog.locator('.dungeon-sheet > dl dd')).toHaveText(stats);
  const image = dialog.locator('img');
  await expect(image).toHaveAttribute('src', new RegExp(`/${hero.toLowerCase()}[.-]`));
  await expect(image).toHaveJSProperty('naturalWidth',192);
  const equipment = dialog.getByRole('region',{name:'Equipment',exact:true});
  await expect(equipment.locator('dt')).toHaveText('Charm');
  await expect(equipment.locator('dd')).toHaveText(expected);
 };
 const previous = dialog.getByRole('button',{name:'Previous hero',exact:true});
 const next = dialog.getByRole('button',{name:'Next hero',exact:true});
 const charm = 'Warding Charm · +1 armor class';
 await open(fighter);
 await expectSheet('Fighter', ['18/18 HP','4','15'], charm);
 await dialog.evaluate(element => {
  element.addEventListener('close', () => element.setAttribute('data-closed-during-switch', 'true'), { once: true });
 });
 if (!isMobile) await page.keyboard.press('Tab');
 await activate(previous);
 await expectSheet('Mage', ['11/11 HP','3','11'], 'Empty');
 if (!isMobile) { await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); }
 await activate(next);
 await expectSheet('Fighter', ['18/18 HP','4','15'], charm);
 if (!isMobile) { await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); }
 await activate(next);
 await expectSheet('Ranger', ['12/12 HP','5','12'], 'Empty');
 await expect(dialog).toBeVisible();
 await expect(dialog).not.toHaveAttribute('data-closed-during-switch', 'true');
 await page.keyboard.press('Escape');
 await expect(dialog).not.toBeVisible();
 await expect(fighter).toBeFocused();
 const unassigned = initial.ownership.equipment[1];
 const row = page.locator(`[data-instance-id="${unassigned.instanceId}"]`);
 await openDungeonInventory(page);
 await row.getByRole('combobox').selectOption('ranger');
 await row.getByRole('button',{name:'Equip Warding Charm',exact:true}).click();
 await page.locator('#dungeon-item-confirm').click();
 await open(ranger);
 await expectSheet('Ranger', ['12/12 HP','5','13'], charm);
 if (!isMobile) { await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); }
 await activate(next);
 await expectSheet('Mage', ['11/11 HP','3','11'], 'Empty');
 if (isMobile) await close.tap();
 else { await page.keyboard.press('Shift+Tab'); await activate(close); }
 await expect(dialog).not.toBeVisible();
 await expect(ranger).toBeFocused();
 await expect.poll(async () => {
  const text = await page.evaluate(key => localStorage.getItem(key), DUNGEON_KEYS.primary);
  const saved = text === null ? null : decodeDungeon(text);
  return saved?.ok ? saved.state.ownership.assignments : [];
 }).toContainEqual({ heroId: 'ranger', slot: 'charm', instanceId: unassigned.instanceId });
 await page.reload();
 await continueSavedDungeon(page);
 await open(ranger);
 await expectSheet('Ranger', ['12/12 HP','5','13'], charm);
 await close.click();
 await openDungeonInventory(page);
 await row.getByRole('button',{name:'Unequip Warding Charm',exact:true}).click();
 await page.locator('#dungeon-item-confirm').click();
 await open(ranger);
 await expectSheet('Ranger', ['12/12 HP','5','12'], 'Empty');
 if (!isMobile) await page.keyboard.press('Tab');
 await activate(previous);
 await expectSheet('Fighter', ['18/18 HP','4','15'], charm);
 await close.click();
});

test('dungeon recovery separates status and preserves exploration scroll', async ({page}) => {
 await page.goto('./?game=dungeon');
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();
 await page.locator('#dungeon-confirm-new').click();
 await expect(page.locator('#dungeon-map')).toBeVisible();
 await page.locator('#dungeon-recovery').focus();
 const before=await page.locator('#dungeon-screen').evaluate(node=>node.scrollTop);
 await page.keyboard.press('Enter');
 await expect(page.getByRole('dialog',{name:'Dungeon save recovery'})).toBeVisible();
 const message=await page.locator('#battle-dialog-message').boundingBox();
 const actions=await page.locator('#battle-dialog .fit-controls').boundingBox();
 expect(actions!.y-message!.y-message!.height).toBeGreaterThanOrEqual(15);
 expect(await page.locator('#dungeon-screen').evaluate(node=>node.scrollTop)).toBe(before);
 await page.screenshot({path:test.info().outputPath('recovery-spacing.png')});
 await page.locator('#dungeon-close-recovery').click();
 await expect(page.locator('#dungeon-screen h1')).toBeFocused();
});
