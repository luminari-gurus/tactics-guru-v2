import type { ContentCatalog } from '../src/content/types';
import { neighbors, poiCell } from '../src/domain/exploration';
import { MOVEMENT_DIRECTIONS } from '../src/domain/constants';
import { previewMovement } from '../src/domain/grid';
import { LEGACY_ENCOUNTER_POLICY } from '../src/domain/dungeonEncounters';
import { atEncounter, priorDungeonEnvelope } from './helpers/dungeonFixtures';
import {openSavedDungeon,openDungeonWithStorage,expectDungeonResumed,expectSameProgress} from './helpers/dungeonTraversal';
import {expect,railTest as test,type Page} from './helpers/dungeonEntropy';
import {dungeonVictoryBoundary} from './helpers/dungeonFixtures';
import {freshDungeon,startDungeonBattle,dungeonBattle,floorMap,type DungeonState} from '../src/domain/dungeon';
import {BattleSession} from '../src/app/BattleSession';
import {encodeDungeon} from '../src/domain/dungeonSaveEnvelope';
import {DUNGEON_KEYS} from '../src/persistence/dungeonStorage';
import {endTurn, playCommand,readSession} from './helpers/battlePolicy';
import { readFileSync } from 'node:fs';
import { canonical, hashJson } from '../src/domain/contentIdentity';
import { RUN_RECORD_KEYS } from '../src/persistence/runRecordsStorage';

test('boxed-in hero can cancel Wait before acting and end immediately after acting', { tag: '@desktop-chromium-portrait-webkit' }, async ({page, isMobile}) => {
 const base = freshDungeon('boxed-in-wait', 1);
 const ready = {...base, party: base.party.map(hero => ({...hero, hp: hero.maxHp - 1})),
  ownership: {...base.ownership, consumables: [{itemId: 'item:healing_draught' as const, quantity: 1}]}};
 const made = startDungeonBattle(atEncounter(ready));
 if (!made.ok) throw Error(made.reason);
 const battle = made.state.activeBattle!;
 const catalog: ContentCatalog = dungeonBattle(made.state)!.catalog;
 const map = catalog.maps[battle.mapId];
 const walkable = map.cells.filter(cell => catalog.terrains[cell.terrainId].walkable);
 const origin = walkable.find(cell => cell.x === 0 && cell.y === 0) ?? walkable[0];
 const adjacent = walkable.filter(cell => MOVEMENT_DIRECTIONS.some(delta =>
  cell.x === origin.x + delta.x && cell.y === origin.y + delta.y));
 const placements = [origin, ...adjacent, ...walkable.filter(cell => cell !== origin && !adjacent.includes(cell))];
 const actor = battle.units.find(unit => unit.side === 'player')!;
 const units = [actor, ...battle.units.filter(unit => unit.id !== actor.id)].map((unit, index) => ({
  ...unit, cell: {x: placements[index].x, y: placements[index].y},
 })).sort((a, b) => a.id - b.id);
 const activeBattle = {...battle, units, activeIndex: battle.initiative.indexOf(actor.id)};
 const movement = previewMovement(activeBattle, actor.id, catalog);
 expect(movement.ok && movement.cells.map(cell => cell.cost)).toEqual([0]);
 await openSavedDungeon(page, {...made.state, activeBattle});
 await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
 const before = await readSession(page);
 const wait = page.getByRole('button', {name: 'Wait / End turn', exact: true});
 if (isMobile) await wait.tap(); else await wait.click();
 const dialog = page.getByRole('dialog', {name: 'End Turn?'});
 await expect(dialog).toHaveAccessibleDescription('This unit has not acted. End turn anyway?');
 const cancel = dialog.getByRole('button', {name: 'Cancel', exact: true});
 if (isMobile) await cancel.tap(); else await cancel.click();
 await expect(dialog).toBeHidden();
 expect(await readSession(page)).toEqual(before);
 // Drinking spends the action while keeping every adjacent cell occupied.
 await playCommand(page, {type:'drinkDraught', unitId:actor.id});
 const acted = (await readSession(page)).state;
 expect(acted.units.find(unit => unit.id === actor.id)?.hasActed).toBe(true);
 await expect(page.locator('#battle-draught')).toHaveText('Healing Draught ×0 · None left');
 await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).payload.activeBattle.commandCount,
  DUNGEON_KEYS.primary)).toBe(acted.commandCount);
 await page.reload(); await expectDungeonResumed(page);
 await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
 expect((await readSession(page)).state).toEqual(acted);
 if (isMobile) await wait.tap(); else await wait.click();
 await expect(dialog).toBeHidden();
 await expect.poll(async () => (await readSession(page)).state.commandCount).toBeGreaterThan(acted.commandCount);
});

test('dungeon statistics: confirmed replacement pauses pending enemy turns through history', { tag: '@desktop-chromium-portrait-webkit' }, async({page},info)=>{
 test.setTimeout(60000);
 const made=startDungeonBattle(atEncounter(freshDungeon('enemy-replacement',1)));if(!made.ok)throw Error(made.reason);
 const battle=made.state.activeBattle!,order=battle.initiative;
 const activeIndex=order.findIndex((id,index)=>battle.units.find(unit=>unit.id===id)!.side==='player'&&battle.units.find(unit=>unit.id===order[(index+1)%order.length])!.side==='enemy');
 if(activeIndex<0)throw Error('Missing player-to-enemy boundary');
 await openSavedDungeon(page,{...made.state,activeBattle:{...battle,activeIndex}});await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await page.evaluate(key=>new Promise<void>(granted=>{void navigator.locks.request(key,()=>new Promise<void>(release=>{(window as any).releaseHistoryBoundary=release;granted();}));}),RUN_RECORD_KEYS.primary);
 try {
  const oldId=(await snapshot(page)).id;await endTurn(page);
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

test('dungeon previous-format recovery preserves and exports both original slots', { tag: '@desktop-chromium-portrait-webkit' }, async({page})=>{
 const encoded=encodeDungeon(freshDungeon('previous-format-dungeon',1));
 if(!encoded.ok)throw Error(encoded.reason);
 // Explicit version-boundary fixtures, not a claim that a current payload ran in
 // the historical build. Recompute the digest so corruption is not the trigger.
 const {digest,...body}=JSON.parse(encoded.text);
 body.format=5;
 const old=canonical({...body,digest:hashJson(body)});
 const legacy=priorDungeonEnvelope(freshDungeon('legacy-browser',13,LEGACY_ENCOUNTER_POLICY),1);
 const texts={primary:` \n${legacy}\n `,backup:`\t${old}\n`};
 const keys=DUNGEON_KEYS;
 await openDungeonWithStorage(page, {
  [keys.primary]: texts.primary, [keys.backup]: texts.backup, 'issue164-unrelated': 'retain',
 });
 const stored=()=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup),unrelated:localStorage.getItem('issue164-unrelated')}),keys);
 await expect(page.locator('#main-menu')).toBeVisible();
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 await page.getByRole('dialog').getByRole('link',{name:/Dungeon/}).click();
 await expect(page.getByRole('dialog')).toContainText('primary: invalid. backup: invalid.');
 await expect(page.getByRole('button',{name:'Export current progress',exact:true})).toHaveCount(0);
 for(const slot of ['primary','backup'] as const) {
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:`Export ${slot} save`,exact:true}).click();
  const download=await pending,file=await download.path(),raw=readFileSync(file!,'utf8');
  expect(raw).toBe(texts[slot]);
 }
 await page.reload();await expect(page.locator('#main-menu')).toBeVisible();expect(await stored()).toEqual({...texts,unrelated:'retain'});
});
async function snapshot(page:Page):Promise<DungeonState>{return JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!);}
test('restart during accepted presentation discards old callbacks and history', { tag: '@desktop-chromium-portrait-webkit' }, async({page})=>{
 const f=dungeonVictoryBoundary(1,0);if(!f)throw Error('legal victory fixture changed');await openSavedDungeon(page,f.snapshot);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const cmd=f.command,state=(await readSession(page)).state;if(cmd.type!=='useAbility')throw Error('expected finishing attack');
 await page.locator(`[data-action="${cmd.abilityId==='ability:basic_attack'?'basic':cmd.abilityId}"]`).click();const target=state.units.find(u=>u.id===('unitId'in cmd.target?cmd.target.unitId:'missileTargets'in cmd.target?cmd.target.missileTargets[0]:-1))!;
 await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.locator('#battle-review').click({force:true});
 expect((await snapshot(page)).phase).toBe('reward');
 const accepted=await snapshot(page);
 await page.locator('#fit-restart').click({force:true});await page.locator('#dungeon-confirm-new').click({force:true});await page.clock.resume();
 await expect(page.locator('#dungeon-screen')).toBeVisible();const fresh=await snapshot(page);expect(fresh.id).not.toBe(accepted.id);expect(fresh.phase).toBe('ready');
 // Reload checkpoints the new journey's real exploration time, not old callbacks.
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 const checkpoint=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).payload,DUNGEON_KEYS.primary);
 expect(checkpoint.stats.activeMs).toBeGreaterThanOrEqual(fresh.stats!.activeMs);
 expect({...checkpoint,stats:{...checkpoint.stats,activeMs:fresh.stats!.activeMs}}).toEqual(fresh);
 await page.reload();await expectDungeonResumed(page);expectSameProgress(await snapshot(page),checkpoint);
});
test('legal enemy defeat waits for its save and returns to the menu during a pending history write', { tag: '@desktop-chromium-portrait-webkit' }, async({page,isMobile})=>{
 const made=startDungeonBattle(atEncounter(freshDungeon('dungeon-defeat-fixture',1)));if(!made.ok)throw Error(made.reason);const entry=made.state,built=dungeonBattle(entry)!;
 const session=new BattleSession(built.catalog,entry.activeBattle!,entry.activeBattle!.seed,undefined,true,built.battlefield);let before=entry.activeBattle!;
 for(let i=0;i<400&&session.state.outcome==='ongoing';i++){
  before=session.state;const p=session.phase==='enemy'?session.nextEnemy():(session.prepare({type:'endTurn',unitId:session.active.id}),session.confirm());if(!p)throw Error('fixture stalled');session.finishPresentation(p.token);
 }
 expect(session.state.outcome).toBe('playerLoss');
 await page.addInitScript(key=>{
  // Install on the prototype so the hold survives WebKit's LockManager wrapper lifecycle.
  const prototype=Object.getPrototypeOf(navigator.locks) as LockManager;
  prototype.request=new Proxy(prototype.request,{apply(target,locks,args){
   const state=document.querySelector<HTMLElement>('#game')?.dataset.dungeonSnapshot;
   if(args[0]===key&&state&&JSON.parse(state).phase==='defeat'){
    return new Promise(resolve=>{
     const release=()=>{
      window.removeEventListener('test-release-defeat-write',release);
      resolve(Reflect.apply(target,locks,args));
     };
     window.addEventListener('test-release-defeat-write',release);
    });
   }
   return Reflect.apply(target,locks,args);
  }});
 },DUNGEON_KEYS.primary);
 const lockOwner=await page.context().newPage();
 try {
  await lockOwner.goto('./');
  await lockOwner.evaluate(key=>new Promise<void>(acquired=>{
   void navigator.locks.request(key,()=>new Promise<void>(release=>{
    window.addEventListener('test-release-defeat-history',()=>release(),{once:true});
    acquired();
   }));
  }),RUN_RECORD_KEYS.primary);
  await page.bringToFront();
  await openSavedDungeon(page,{...entry,activeBattle:before});
  await expect(page.locator('#game')).toHaveAttribute('data-phase','ended');
  expect((await snapshot(page)).phase).toBe('defeat');
  await expect(page.locator('#main-menu')).toHaveCount(0);
  await page.getByRole('button',{name:'Save recovery',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Saving journey',exact:true})).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new Event('test-release-defeat-write')));
  const inBattleRecovery=page.getByRole('dialog',{name:'Dungeon save recovery',exact:true});
  await expect(inBattleRecovery.getByRole('button',{name:'Export primary save',exact:true})).toBeVisible();
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).payload.phase,DUNGEON_KEYS.primary)).toBe('defeat');
  await inBattleRecovery.getByRole('button',{name:'Close',exact:true}).click();
  const summary=page.getByRole('dialog',{name:'Dungeon defeat',exact:true});
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Deepest floor');
  await expect(summary).toContainText('Battles won');
  await expect(summary).toContainText('Active playtime');
  await summary.getByRole('button',{name:'Hall of Records',exact:true}).click();
  const records=page.getByRole('dialog',{name:'Hall of Records',exact:true});
  await expect(records).toContainText('No finished journeys recorded yet.');
  await lockOwner.evaluate(()=>window.dispatchEvent(new Event('test-release-defeat-history')));
  await expect(records).toContainText('Dungeon · Defeat');
  await records.getByRole('button',{name:'Close',exact:true}).click();
 }finally{await lockOwner.close();}
 const readRecords = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).records, RUN_RECORD_KEYS.primary);
 const readSlots = () => page.evaluate(keys => [localStorage.getItem(keys.primary), localStorage.getItem(keys.backup)], DUNGEON_KEYS);
 const recorded = await readRecords(), slots = await readSlots();
 expect(recorded).toMatchObject([{ id: entry.id, outcome: 'defeat' }]);
 await page.reload();
 await expect(page.locator('#main-menu')).toBeVisible();
 await expect(page.getByRole('dialog', { name: 'Dungeon defeat', exact: true })).toHaveCount(0);
 expect(await readRecords()).toEqual(recorded);
 expect(await readSlots()).toEqual(slots);
 await page.goto('./?game=dungeon');
 await expect(page.locator('#main-menu')).toBeVisible();
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 await page.getByRole('link',{name:/^Dungeon/}).click();
 const recovery=page.getByRole('dialog',{name:'Dungeon save recovery',exact:true});
 await expect(recovery.getByRole('button',{name:'Export primary save',exact:true})).toBeVisible();
 await expect(recovery.getByRole('button',{name:'Continue primary dungeon',exact:true})).toHaveCount(0);
 await expect(recovery.getByRole('button',{name:'Export backup save',exact:true})).toBeVisible();
 await expect(recovery.getByRole('button',{name:'Continue backup dungeon',exact:true})).toHaveCount(0);
 await expect(recovery.getByRole('button',{name:'Remove primary save',exact:true})).toHaveCount(0);
 await expect(recovery).toContainText('Remove the earlier checkpoint before removing the defeated save.');
 await recovery.getByRole('button',{name:'Remove backup save',exact:true}).click();
 await page.getByRole('button',{name:'Remove reviewed save',exact:true}).click();
 await expect(recovery.getByRole('button',{name:'Remove primary save',exact:true})).toBeVisible();
 await page.goto('./');
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 const newGame=page.getByRole('button',{name:'New Game',exact:true});
 if(isMobile)await newGame.tap();else{await newGame.focus();await page.keyboard.press('Enter');}
 await expect(page.locator('#dungeon-map')).toBeVisible();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 expect((await snapshot(page)).id).not.toBe(entry.id);
 expect((await snapshot(page)).party.every(h=>h.hp>0)).toBe(true);expect((await snapshot(page)).floors).toHaveLength(1);
 expect(await readRecords()).toEqual(recorded);
});
test('visibility interruption finishes an accepted terminal presentation exactly once', { tag: '@desktop-chromium-portrait-webkit' }, async({page})=>{
 const f=dungeonVictoryBoundary(1,0);if(!f)throw Error('fixture changed');await openSavedDungeon(page,f.snapshot);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const cmd=f.command,state=(await readSession(page)).state;if(cmd.type!=='useAbility')throw Error('expected attack');
 await page.locator(`[data-action="${cmd.abilityId==='ability:basic_attack'?'basic':cmd.abilityId}"]`).click();const target=state.units.find(u=>u.id===('unitId'in cmd.target?cmd.target.unitId:'missileTargets'in cmd.target?cmd.target.missileTargets[0]:-1))!;
 await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.locator('#battle-review').click({force:true});const committed=await snapshot(page);expect(committed.phase).toBe('reward');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.clock.resume();
 await expect(page.locator('#dungeon-screen')).toBeVisible();expect(await snapshot(page)).toEqual(committed);
});

for (const departure of ['reload', 'close'] as const)
test(`${departure} recovers the last four seconds exactly once across a held dungeon lock`, { tag: '@desktop-chromium-portrait-webkit' }, async ({page: original, context}) => {
 const holder = await context.newPage();
 try {
  await holder.goto('./');
  await context.addInitScript(() => {
    let now = 0;
    Object.defineProperty(performance, 'now', { value: () => now });
    document.hasFocus = () => true;
    window.addEventListener('advance-playtime', () => { now = 4000; });
  });
  let page = original;
  if (departure === 'close') {
    const opened = holder.waitForEvent('popup');
    await holder.evaluate(() => { window.open('about:blank'); });
    page = await opened;
  }
  await openSavedDungeon(page, freshDungeon('reload-clock', 13, undefined, true));
  await holder.evaluate(key => new Promise<void>(acquired => {
    void navigator.locks.request(key, () => new Promise<void>(release => {
      window.addEventListener('release-clock', () => release(), { once: true }); acquired();
    }));
  }), DUNGEON_KEYS.primary);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('advance-playtime'));
    window.dispatchEvent(new Event('blur'));
  });
  await expect.poll(() => holder.evaluate(async key =>
    (await navigator.locks.query()).pending?.filter(lock => lock.name === key).length, DUNGEON_KEYS.primary)).toBe(1);
  if (departure === 'reload') {
    await page.reload();
  } else {
    const closed = page.waitForEvent('close');
    await page.evaluate(() => window.close());
    await closed;
    page = original;
    await page.goto('./?game=dungeon');
  }
  await holder.evaluate(() => window.dispatchEvent(new Event('release-clock')));
  const storedTime = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).payload.stats.activeMs, DUNGEON_KEYS.primary);
  await expect.poll(storedTime).toBe(4000);
  await page.reload(); await expectDungeonResumed(page);
  expect((await snapshot(page)).stats?.activeMs).toBe(4000);
  expect(await storedTime()).toBe(4000);
 } finally { await holder.close(); }
});

test('dungeon tabs serialize spatial publication and refuse the stale owner', { tag: '@desktop-chromium-portrait-webkit' }, async ({page,context,isMobile}) => {
  // Freeze only playtime; the origin Web Lock and both tabs are real.
  await context.addInitScript(()=>Object.defineProperty(performance,'now',{value:()=>0}));
  const initial = freshDungeon('exclusive-spatial-tabs',13,undefined,true);
  await openSavedDungeon(page,initial);
  const other = await context.newPage();await other.goto('./?game=dungeon'); await expectDungeonResumed(other);
  const floor = initial.floors[0], map = floorMap(floor.descriptor);
  const destination = neighbors(floor.position,map.width,map.height).find(n => map.cells[n] && !floor.exploration.pois.some(p => poiCell(p,map.width) === n))!;
  const delta = destination-floor.position, direction = delta === -map.width ? 'north' : delta === map.width ? 'south' : delta === 1 ? 'east' : 'west';
  // Hold the actual origin Web Lock; both rendered owners must wait without publishing.
  await page.evaluate(key => {
    const state = window as unknown as {releaseDungeonLock: () => void; dungeonLockHeld: boolean};
    void navigator.locks.request(key,async () => {state.dungeonLockHeld=true;await new Promise<void>(resolve => {state.releaseDungeonLock=resolve;});});
  },DUNGEON_KEYS.primary);
  await expect.poll(() => page.evaluate(() => (window as unknown as {dungeonLockHeld:boolean}).dungeonLockHeld)).toBe(true);
  const step = async (tab: Page) => {
    const button = tab.locator('#dungeon-step-'+direction);
    if (isMobile) await button.tap(); else await button.click();
  };
  await step(page);
  await expect.poll(() => page.evaluate(async key =>
    (await navigator.locks.query()).pending?.filter(lock => lock.name === key).length, DUNGEON_KEYS.primary)).toBe(1);
  await step(other);
  await expect(other.locator('.dungeon-status')).toContainText('another tab is saving');
  expect(await snapshot(page)).toEqual(initial); expect(await snapshot(other)).toEqual(initial);
  await page.evaluate(() => (window as unknown as {releaseDungeonLock:()=>void}).releaseDungeonLock());
  await expect.poll(async () => (await snapshot(page)).stats?.movesTaken).toBe(1);
  // Another attempt after the write is visible must also refuse the stale owner via CAS.
  await expect.poll(() => other.evaluate(key => JSON.parse(localStorage.getItem(key)!).payload.stats.movesTaken, DUNGEON_KEYS.primary)).toBe(1);
  await step(other);
  await expect(other.locator('.dungeon-status')).toContainText('changed');
  expect(await snapshot(other)).toEqual(initial);
  const durable = await page.evaluate(keys => ({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),DUNGEON_KEYS);
  expect(JSON.parse(durable.primary!).payload).toEqual(await snapshot(page));
  expect(JSON.parse(durable.backup!).payload.stats.movesTaken).toBe(0);
  await other.close();
 });
