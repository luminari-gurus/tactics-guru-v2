import { neighbors, poiCell } from '../src/domain/exploration';
import { atEncounter } from './helpers/dungeonFixtures';
import {continueSavedDungeon} from './helpers/dungeonTraversal';
import {expect,railTest as test,type Page} from './helpers/dungeonEntropy';
import {dungeonVictoryBoundary} from './helpers/dungeonFixtures';
import {freshDungeon,startDungeonBattle,dungeonBattle,floorMap,type DungeonState} from '../src/domain/dungeon';
import {BattleSession} from '../src/app/BattleSession';
import {encodeDungeon} from '../src/domain/dungeonSaveEnvelope';
import {DUNGEON_KEYS} from '../src/persistence/dungeonStorage';
import {playCommand,readSession} from './helpers/battlePolicy';
import { readFileSync } from 'node:fs';
import { canonical, hashJson } from '../src/domain/contentIdentity';
import { RUN_RECORD_KEYS } from '../src/persistence/runRecordsStorage';

test('dungeon statistics: confirmed replacement pauses pending enemy turns through history',async({page},info)=>{
 test.setTimeout(60000);
 const made=startDungeonBattle(atEncounter(freshDungeon('enemy-replacement',1)));if(!made.ok)throw Error(made.reason);
 const battle=made.state.activeBattle!,order=battle.initiative;
 const activeIndex=order.findIndex((id,index)=>battle.units.find(unit=>unit.id===id)!.side==='player'&&battle.units.find(unit=>unit.id===order[(index+1)%order.length])!.side==='enemy');
 if(activeIndex<0)throw Error('Missing player-to-enemy boundary');
 await load(page,{...made.state,activeBattle:{...battle,activeIndex}});await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await page.evaluate(key=>new Promise<void>(granted=>{void navigator.locks.request(key,()=>new Promise<void>(release=>{(window as any).releaseHistoryBoundary=release;granted();}));}),RUN_RECORD_KEYS.primary);
 try {
  const oldId=(await snapshot(page)).id;await page.getByRole('button',{name:'Wait / End turn',exact:true}).click();
  await page.locator('#fit-restart').click();await page.locator('#dungeon-confirm-new').click();
  await expect(page.getByRole('heading',{name:'Preparing new dungeon',exact:true})).toBeVisible();
  const before=await page.evaluate(key=>localStorage.getItem(key)!,DUNGEON_KEYS.primary),frozen=JSON.parse(before).payload;
  await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.clock.fastForward(60000);
  expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(before);
  await page.evaluate(()=>(window as any).releaseHistoryBoundary());await expect(page.locator('#dungeon-map')).toBeVisible();
  expect((await snapshot(page)).id).not.toBe(oldId);
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).records,RUN_RECORD_KEYS.primary)).toMatchObject([{id:oldId,outcome:'abandoned'}]);
  const record=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).records[0],RUN_RECORD_KEYS.primary),{boundary:_,...stats}=frozen.stats;
  expect(record.stats).toEqual(stats);
  await info.attach('paused-replacement',{body:JSON.stringify({fixture:'staged valid player-to-enemy boundary',oldId,stats}),contentType:'application/json'});
 }finally{await page.evaluate(()=>(window as any).releaseHistoryBoundary?.());await page.clock.resume();}
});

test('dungeon previous-format recovery preserves and exports both original slots',async({page})=>{
 const encoded=encodeDungeon(freshDungeon('previous-format-dungeon',1));
 if(!encoded.ok)throw Error(encoded.reason);
 // Explicit version-boundary fixtures, not a claim that a current payload ran in
 // the historical build. Recompute the digest so corruption is not the trigger.
 const {digest,...body}=JSON.parse(encoded.text);
 body.format=5;
 const old=canonical({...body,digest:hashJson(body)}),texts={primary:` \n${old}\n `,backup:`\t${old}\n`};
 const keys=DUNGEON_KEYS;
 await page.goto('./?game=dungeon');
 await page.evaluate(({keys,texts})=>{localStorage.setItem(keys.primary,texts.primary);localStorage.setItem(keys.backup,texts.backup);localStorage.setItem('issue164-unrelated','retain');},{keys,texts});
 await page.reload();
 const stored=()=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup),unrelated:localStorage.getItem('issue164-unrelated')}),keys);
 expect(await stored()).toEqual({...texts,unrelated:'retain'});
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('primary: invalid. backup: invalid.');
 for(const slot of ['primary','backup'] as const) {
  if(slot==='backup')await page.getByRole('button',{name:'Save recovery',exact:true}).click();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:`Export ${slot} save`,exact:true}).click();
  const download=await pending,file=await download.path(),raw=readFileSync(file!,'utf8');
  expect(raw).toBe(texts[slot]);
 }
 expect(await stored()).toEqual({...texts,unrelated:'retain'});
 await page.reload();expect(await stored()).toEqual({...texts,unrelated:'retain'});
});
async function snapshot(page:Page):Promise<DungeonState>{return JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!);}
async function load(page:Page,s:DungeonState){const saved=encodeDungeon(s);if(!saved.ok)throw Error(saved.reason);await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:saved.text});await page.reload();await continueSavedDungeon(page);}
test('restart during accepted presentation discards old callbacks and history',async({page})=>{
 const f=dungeonVictoryBoundary(1,0);if(!f)throw Error('legal victory fixture changed');await load(page,f.snapshot);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const cmd=f.command,state=(await readSession(page)).state;if(cmd.type!=='useAbility')throw Error('expected finishing attack');
 await page.locator(`[data-action="${cmd.abilityId==='ability:basic_attack'?'basic':cmd.abilityId}"]`).click();const target=state.units.find(u=>u.id===('unitId'in cmd.target?cmd.target.unitId:'missileTargets'in cmd.target?cmd.target.missileTargets[0]:-1))!;
 await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.locator('#battle-review').click({force:true});
 expect((await snapshot(page)).phase).toBe('reward');
 const accepted=await snapshot(page);
 await page.locator('#fit-restart').click({force:true});await page.locator('#dungeon-confirm-new').click({force:true});await page.clock.resume();
 await expect(page.locator('#dungeon-screen')).toBeVisible();const fresh=await snapshot(page);expect(fresh.id).not.toBe(accepted.id);expect(fresh.phase).toBe('ready');expect(fresh.ownership).toEqual({consumables:[],equipment:[],assignments:[]});
 await page.waitForTimeout(300);expect(await snapshot(page)).toEqual(fresh);
 // Reload checkpoints the new journey's real exploration time, not old callbacks.
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 const checkpoint=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).payload,DUNGEON_KEYS.primary);
 expect(checkpoint.stats.activeMs).toBeGreaterThanOrEqual(fresh.stats!.activeMs);
 expect({...checkpoint,stats:{...checkpoint.stats,activeMs:fresh.stats!.activeMs}}).toEqual(fresh);
 await page.reload();await continueSavedDungeon(page);expect(await snapshot(page)).toEqual(checkpoint);
});
test('legal enemy defeat boundary resumes once and a confirmed new dungeon resets it',async({page})=>{
 const made=startDungeonBattle(atEncounter(freshDungeon('dungeon-defeat-fixture',1)));if(!made.ok)throw Error(made.reason);const entry=made.state,built=dungeonBattle(entry)!;
 const session=new BattleSession(built.catalog,entry.activeBattle!,entry.activeBattle!.seed,undefined,true,built.battlefield);let before=entry.activeBattle!;
 for(let i=0;i<400&&session.state.outcome==='ongoing';i++){
  before=session.state;const p=session.phase==='enemy'?session.nextEnemy():(session.prepare({type:'endTurn',unitId:session.active.id}),session.confirm());if(!p)throw Error('fixture stalled');session.finishPresentation(p.token);
 }
 expect(session.state.outcome).toBe('playerLoss');await load(page,{...entry,activeBattle:before});await expect(page.getByRole('heading',{name:/^Dungeon defeat/})).toBeVisible();
 const defeat=await snapshot(page);await expect(page.locator('#dungeon-descend')).toHaveCount(0);await expect(page.locator('#dungeon-ascend')).toHaveCount(0);
 await page.reload();await continueSavedDungeon(page);expect(await snapshot(page)).toEqual(defeat);
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-cancel-new').click();expect(await snapshot(page)).toEqual(defeat);
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
 await expect.poll(async()=>(await snapshot(page)).id).not.toBe(defeat.id);await expect(page.locator('#dungeon-map')).toBeVisible();
 expect((await snapshot(page)).party.every(h=>h.hp>0)).toBe(true);expect((await snapshot(page)).floors).toHaveLength(1);
});
test('run navigation reaches the base-aware dungeon entry and returns to existing modes',async({page,baseURL})=>{
 await page.goto('./?game=run');await page.getByRole('link',{name:'Dungeon floors',exact:true}).click();expect(page.url()).toBe(new URL('dungeon',baseURL).href);
 await expect(page.getByRole('heading',{name:'Dungeon floors',exact:true})).toBeVisible();await page.getByRole('link',{name:'Three-battle scenario',exact:true}).click();
 await expect(page.locator('#run-start')).toBeVisible();
});

test('visibility interruption finishes an accepted terminal presentation exactly once',async({page})=>{
 const f=dungeonVictoryBoundary(1,0);if(!f)throw Error('fixture changed');await load(page,f.snapshot);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const cmd=f.command,state=(await readSession(page)).state;if(cmd.type!=='useAbility')throw Error('expected attack');
 await page.locator(`[data-action="${cmd.abilityId==='ability:basic_attack'?'basic':cmd.abilityId}"]`).click();const target=state.units.find(u=>u.id===('unitId'in cmd.target?cmd.target.unitId:'missileTargets'in cmd.target?cmd.target.missileTargets[0]:-1))!;
 await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.locator('#battle-review').click({force:true});const committed=await snapshot(page);expect(committed.phase).toBe('reward');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.clock.resume();
 await expect(page.locator('#dungeon-screen')).toBeVisible();expect(await snapshot(page)).toEqual(committed);await page.waitForTimeout(300);expect(await snapshot(page)).toEqual(committed);
});

 test('dungeon tabs serialize spatial publication and refuse the stale owner', async ({page,context}) => {
  // Freeze only playtime; the origin Web Lock and both tabs are real.
  await context.addInitScript(()=>Object.defineProperty(performance,'now',{value:()=>0}));
  const initial = freshDungeon('exclusive-spatial-tabs',13,undefined,true);
  await load(page,initial);
  const other = await context.newPage();await other.goto('./?game=dungeon'); await continueSavedDungeon(other);
  const floor = initial.floors[0], map = floorMap(floor.descriptor);
  const destination = neighbors(floor.position,map.width,map.height).find(n => map.cells[n] && !floor.exploration.pois.some(p => poiCell(p,map.width) === n))!;
  const delta = destination-floor.position, direction = delta === -map.width ? 'north' : delta === map.width ? 'south' : delta === 1 ? 'east' : 'west';
  // Hold the actual origin Web Lock; both rendered owners must wait without publishing.
  await page.evaluate(key => {
    const state = window as unknown as {releaseDungeonLock: () => void; dungeonLockHeld: boolean};
    void navigator.locks.request(key,async () => {state.dungeonLockHeld=true;await new Promise<void>(resolve => {state.releaseDungeonLock=resolve;});});
  },DUNGEON_KEYS.primary);
  await expect.poll(() => page.evaluate(() => (window as unknown as {dungeonLockHeld:boolean}).dungeonLockHeld)).toBe(true);
  await page.locator('#dungeon-step-'+direction).click();
  await other.locator('#dungeon-step-'+direction).click();
  expect(await snapshot(page)).toEqual(initial); expect(await snapshot(other)).toEqual(initial);
  await page.evaluate(() => (window as unknown as {releaseDungeonLock:()=>void}).releaseDungeonLock());
  await expect.poll(async () => (await snapshot(page)).stats?.movesTaken).toBe(1);
  await expect(other.locator('.dungeon-status')).toContainText('changed');
  expect(await snapshot(other)).toEqual(initial);
  const durable = await page.evaluate(keys => ({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),DUNGEON_KEYS);
  expect(JSON.parse(durable.primary!).payload).toEqual(await snapshot(page));
  expect(JSON.parse(durable.backup!).payload.stats.movesTaken).toBe(0);
  await other.close();
 });
