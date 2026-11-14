import {expect,test,type Page} from './helpers/forceRailControls';
import {writeFileSync} from 'node:fs';
import {readSession,playCommand,playUndo} from './helpers/battlePolicy';
import {playerDecision} from './helpers/playerPolicy';
import {runContext} from './helpers/runItemFixtures';
import {runBattleCatalog,type RunSnapshot} from '../src/domain/runSaveEnvelope';
import {replayRunBattle} from '../src/domain/runBattle';
import {RUN_STORAGE_KEYS} from '../src/persistence/runStorage';
import {RUN_RECORD_KEYS} from '../src/persistence/runRecordsStorage';

async function snapshot(page:Page):Promise<RunSnapshot>{return JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);}
async function start(page:Page){
 await page.goto('/?game=run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await expect(page.locator('#battle-actor')).toBeVisible();
 const drawable=await page.locator('#battle-board-region').boundingBox();
 expect(drawable!.width).toBeGreaterThan(0);
 expect(drawable!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height*0.3-1);
}
async function ready(page:Page){await expect.poll(async()=>await page.locator('#game').getAttribute('data-phase')??'boundary',{timeout:15000}).toMatch(/player|ended|boundary/);}
async function fight(page:Page,wait=false,useDraught=false){
 let drank=false;
 for(let i=0;i<500;i++){
  await ready(page);const current=await snapshot(page);if(current.items.run.phase!=='battle')break;
  const battle=await readSession(page);expect(battle.phase).toBe('player');const catalog=runBattleCatalog(current.items,runContext)!;
  const unitId=battle.state.initiative[battle.state.activeIndex];
  if(useDraught && !drank && battle.state.draughts && await page.locator('#battle-draught').isEnabled()) {
   await playCommand(page,{type:'drinkDraught',unitId});drank=true;
  } else await playCommand(page,wait?{type:'endTurn',unitId}:playerDecision(battle.state,catalog));
 }
 await expect(page.locator('#run-screen')).toBeVisible();
 await expect(page.locator('#run-item-status')).not.toHaveText('Saving run…');
 return drank;
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
 await expect(page.locator('#run-item-status')).not.toHaveText('Saving run…');
}
test('run battle undo and a legal terminal journey reset on reload',async({page,isMobile})=>{
 test.setTimeout(300000);await start(page);const entry=await snapshot(page);
 expect(entry.stats).toBeUndefined();
 await page.locator('canvas').focus();await page.keyboard.press('a');
 await expect(page.locator('[data-action=basic]')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('m');await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
 expect(await snapshot(page)).toEqual(entry);
 const catalog=runBattleCatalog(entry.items,runContext)!;const restored=await playUndo(page,catalog,isMobile);
 expect((await readSession(page)).state).toEqual(restored);
 await expect(page.locator('#battle-undo')).toBeDisabled();
 await fight(page,true);await expect(page.getByRole('heading',{name:'Run defeat',exact:true})).toBeVisible();
 const ended=await snapshot(page);await page.keyboard.press('c');await page.keyboard.press('w');
 expect(await snapshot(page)).toEqual(ended);
 await page.reload();await expect(page.locator('#run-start')).toBeVisible();
 await expect(page.locator('#run-continue')).toHaveCount(0);
 expect((await snapshot(page)).items.run.id).not.toBe(ended.items.run.id);
 expect(await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),[...Object.values(RUN_STORAGE_KEYS),...Object.values(RUN_RECORD_KEYS)])).toEqual([null,null,null,null]);
});
test('legal run outcomes, earned rewards and fresh restart',async({page})=>{
 test.setTimeout(300000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);await page.locator('#battle-sound').click();const records=[];let usedDraught=false;
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
  usedDraught=(await fight(page,false,true))||usedDraught;
  await expect(page.locator('#game')).not.toHaveAttribute('data-battle-report');if(index===0)await page.screenshot({path:test.info().outputPath('run-reward.png')});const current=await snapshot(page);expect(index===2?['victory','defeat']:['reward','defeat']).toContain(current.items.run.phase);expect(current.items.run.encounterIndex).toBe(index);
  const record=JSON.parse((await page.locator('#game').getAttribute('data-run-battle-record'))!);const replay=replayRunBattle(record.replay,record.entry,runContext);expect(replay.ok).toBe(true);if(replay.ok){expect(replay.state).toEqual(record.state);expect(replay.events).toEqual(record.events);}records.push(record);
  if(current.items.run.phase==='defeat')break;
  if(index<2){
   await prepare(page);
   expect((await snapshot(page)).items.run.encounterIndex).toBe(index+1);
   await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
   await expect(page.locator('#battle-sound')).toHaveAttribute('aria-pressed','true');
  }
 }
 const final=await snapshot(page);await expect(page.getByRole('heading',{name:final.items.run.phase==='victory'?'Run victory':'Run defeat',exact:true})).toBeVisible();
 expect(final.items.run.phase).toBe('victory');
 expect(records).toHaveLength(3);
 expect(usedDraught).toBe(true);
 expect(final.items.ownership.consumables.some(stack=>stack.itemId==='item:healing_draught')).toBe(false);
 await page.screenshot({path:test.info().outputPath('run-terminal.png')});
 writeFileSync(test.info().outputPath('run-records.json'),JSON.stringify(records,null,2));
 await page.locator('#run-new').dblclick();await expect(page.locator('#run-start-encounter')).toBeVisible();const fresh=await snapshot(page);expect(fresh.items.run.seed).toBe(14);expect(fresh.items.run.id).not.toBe(final.items.run.id);expect(fresh.items.ownership).toEqual({consumables:[],equipment:[],assignments:[]});expect(fresh.items.run.party.every(h=>h.hp===runContext.catalog.heroes[h.heroId].stats.maxHp)).toBe(true);
 expect(errors).toEqual([]);
});
test('testing routes: an earned combat draught stays in the transient authored run',async({page})=>{
 test.setTimeout(300000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
  const saved=(key:string)=>key.startsWith('tactics-guru:phaser:')||key==='tactics-guru:menu-new-dungeon-review';
  const attempts:string[]=[];
  (window as unknown as Record<string, unknown>).__draughtSaveAttempts=attempts;
  Storage.prototype.getItem=function(key){if(saved(key)){attempts.push('read');throw Error('Testing route read saved gameplay');}return get.call(this,key);};
  Storage.prototype.setItem=function(key,value){if(saved(key)){attempts.push('write');throw Error('Testing route wrote saved gameplay');}set.call(this,key,value);};
  Storage.prototype.removeItem=function(key){if(saved(key)){attempts.push('remove');throw Error('Testing route removed saved gameplay');}remove.call(this,key);};
 });
 await page.goto('./run');
 await page.locator('#run-start').click();
 await page.locator('#run-start-encounter').click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await fight(page);
 await expect(page.getByRole('button',{name:'Claim Healing Draught',exact:true})).toBeVisible();
 await prepare(page);
 await page.locator('#run-start-encounter').click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect(await fight(page,false,true)).toBe(true);
 expect((await snapshot(page)).items.ownership.consumables).toEqual([]);
 const attempts=()=>page.evaluate(()=>(window as unknown as Record<string, unknown>).__draughtSaveAttempts);
 expect(await attempts()).toEqual([]);
 await page.reload();
 await expect(page.locator('#run-start')).toBeVisible();
 await expect(page.locator('#run-continue')).toHaveCount(0);
 expect(await attempts()).toEqual([]);
 expect(errors).toEqual([]);
});
