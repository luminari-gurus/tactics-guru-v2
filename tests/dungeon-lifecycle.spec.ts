import { atEncounter } from './helpers/dungeonFixtures';
import {continueSavedDungeon} from './helpers/dungeonTraversal';
import {expect,test,type Page} from '@playwright/test';
import {dungeonVictoryBoundary} from './helpers/dungeonFixtures';
import {freshDungeon,startDungeonBattle,dungeonBattle,type DungeonState} from '../src/domain/dungeon';
import {BattleSession} from '../src/app/BattleSession';
import {encodeDungeon} from '../src/domain/dungeonSaveEnvelope';
import {DUNGEON_KEYS} from '../src/persistence/dungeonStorage';
import {playCommand,readSession} from './helpers/battlePolicy';
import { readFileSync } from 'node:fs';
import { encodeBattleSave } from '../src/domain/saveEnvelope';
import { standaloneCatalog } from './helpers/playerPolicy';
import { BATTLE_STORAGE_KEYS } from '../src/persistence/battleStorage';
import { RUN_STORAGE_KEYS } from '../src/persistence/runStorage';
import { encodeRunSave } from '../src/domain/runSaveEnvelope';
import { freshRunSnapshot } from '../src/domain/runBattle';
import { runContext } from './helpers/runItemFixtures';
import { canonical, hashJson } from '../src/domain/contentIdentity';

for(const route of ['battle','run','dungeon'] as const)test(`${route} previous-format recovery preserves and exports both original slots`,async({page})=>{
 const encoded=route==='battle'?encodeBattleSave(new BattleSession(standaloneCatalog,'map:forest_ruins',2).state,standaloneCatalog):
  route==='run'?encodeRunSave(freshRunSnapshot('previous-format-run',1,runContext),runContext):encodeDungeon(freshDungeon('previous-format-dungeon',1));
 if(!encoded.ok)throw Error(encoded.reason);
 // Explicit version-boundary fixtures, not a claim that a current payload ran in
 // the historical build. Recompute the digest so corruption is not the trigger.
 const {digest,...body}=JSON.parse(encoded.text);
 if(route==='battle'){body.payload.format=2;body.payload.versions.rules=3;}else body.format=route==='run'?4:5;
 const old=canonical({...body,digest:hashJson(body)}),texts={primary:` \n${old}\n `,backup:`\t${old}\n`};
 const keys=route==='battle'?BATTLE_STORAGE_KEYS:route==='run'?RUN_STORAGE_KEYS:DUNGEON_KEYS;
 await page.goto(route==='battle'?'battle':route);
 await page.evaluate(({keys,texts})=>{localStorage.setItem(keys.primary,texts.primary);localStorage.setItem(keys.backup,texts.backup);localStorage.setItem('issue164-unrelated','retain');},{keys,texts});
 await page.reload();
 const stored=()=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup),unrelated:localStorage.getItem('issue164-unrelated')}),keys);
 expect(await stored()).toEqual({...texts,unrelated:'retain'});
 if(route!=='battle')await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText(route==='battle'?'incompatible':'primary: invalid. backup: invalid.');
 if(route==='battle') {
  const pending=page.waitForEvent('download');await page.locator('#save-export').click();const download=await pending,file=await download.path();
  const exported=JSON.parse(readFileSync(file!,'utf8'));
  expect(exported.slots).toEqual(expect.arrayContaining([{slot:'primary',text:texts.primary},{slot:'backup',text:texts.backup}]));
 } else for(const slot of ['primary','backup'] as const) {
  if(slot==='backup')await page.getByRole('button',{name:'Save recovery',exact:true}).click();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:`Export ${slot} save`,exact:true}).click();
  const download=await pending,file=await download.path(),raw=readFileSync(file!,'utf8');
  if(route==='dungeon')expect(raw).toBe(texts[slot]);else expect(JSON.parse(raw)).toEqual({slot,text:texts[slot]});
 }
 expect(await stored()).toEqual({...texts,unrelated:'retain'});
 await page.reload();expect(await stored()).toEqual({...texts,unrelated:'retain'});
});
async function snapshot(page:Page):Promise<DungeonState>{return JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!);}
async function load(page:Page,s:DungeonState){const saved=encodeDungeon(s);if(!saved.ok)throw Error(saved.reason);await page.goto('dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:saved.text});await page.reload();await continueSavedDungeon(page);}
test('restart during accepted presentation discards old callbacks and history',async({page})=>{
 const f=dungeonVictoryBoundary(1,0);if(!f)throw Error('legal victory fixture changed');await load(page,f.snapshot);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const cmd=f.command,state=(await readSession(page)).state;if(cmd.type!=='useAbility')throw Error('expected finishing attack');
 await page.locator(`[data-action="${cmd.abilityId==='ability:basic_attack'?'basic':'signature'}"]`).click();const target=state.units.find(u=>u.id===('unitId'in cmd.target?cmd.target.unitId:'missileTargets'in cmd.target?cmd.target.missileTargets[0]:-1))!;
 await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.locator('#battle-review').click({force:true});
 expect((await snapshot(page)).phase).toBe('reward');
 const accepted=await snapshot(page);
 await page.locator('#fit-restart').click({force:true});await page.locator('#dungeon-confirm-new').click({force:true});await page.clock.resume();
 await expect(page.locator('#dungeon-screen')).toBeVisible();const fresh=await snapshot(page);expect(fresh.id).not.toBe(accepted.id);expect(fresh.phase).toBe('ready');expect(fresh.ownership).toEqual({consumables:[],equipment:[],assignments:[]});
 await page.waitForTimeout(300);expect(await snapshot(page)).toEqual(fresh);await page.reload();await continueSavedDungeon(page);expect(await snapshot(page)).toEqual(fresh);
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
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();expect((await snapshot(page)).party.every(h=>h.hp>0)).toBe(true);expect((await snapshot(page)).floors).toHaveLength(1);
});
test('run navigation reaches the base-aware dungeon entry and returns to existing modes',async({page,baseURL})=>{
 await page.goto('run');await page.getByRole('link',{name:'Dungeon floors',exact:true}).click();expect(page.url()).toBe(new URL('dungeon',baseURL).href);
 await expect(page.getByRole('heading',{name:'Dungeon floors',exact:true})).toBeVisible();await page.getByRole('link',{name:'Three-battle scenario',exact:true}).click();
 await expect(page.locator('#run-start')).toBeVisible();
});

test('visibility interruption finishes an accepted terminal presentation exactly once',async({page})=>{
 const f=dungeonVictoryBoundary(1,0);if(!f)throw Error('fixture changed');await load(page,f.snapshot);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const cmd=f.command,state=(await readSession(page)).state;if(cmd.type!=='useAbility')throw Error('expected attack');
 await page.locator(`[data-action="${cmd.abilityId==='ability:basic_attack'?'basic':'signature'}"]`).click();const target=state.units.find(u=>u.id===('unitId'in cmd.target?cmd.target.unitId:'missileTargets'in cmd.target?cmd.target.missileTargets[0]:-1))!;
 await page.locator('#battle-target').selectOption(`${target.cell.x},${target.cell.y}`);
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.locator('#battle-review').click({force:true});const committed=await snapshot(page);expect(committed.phase).toBe('reward');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.clock.resume();
 await expect(page.locator('#dungeon-screen')).toBeVisible();expect(await snapshot(page)).toEqual(committed);await page.waitForTimeout(300);expect(await snapshot(page)).toEqual(committed);
});
