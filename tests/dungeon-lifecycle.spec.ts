import { atEncounter } from './helpers/dungeonFixtures';
import {expect,test,type Page} from '@playwright/test';
import {dungeonVictoryBoundary} from './helpers/dungeonFixtures';
import {freshDungeon,startDungeonBattle,dungeonBattle,type DungeonState} from '../src/domain/dungeon';
import {BattleSession} from '../src/app/BattleSession';
import {encodeDungeon} from '../src/domain/dungeonSaveEnvelope';
import {DUNGEON_KEYS} from '../src/persistence/dungeonStorage';
import {playCommand,readSession} from './helpers/battlePolicy';
async function snapshot(page:Page):Promise<DungeonState>{return JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!);}
async function load(page:Page,s:DungeonState){const saved=encodeDungeon(s);if(!saved.ok)throw Error(saved.reason);await page.goto('dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:saved.text});await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();}
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
 await page.waitForTimeout(300);expect(await snapshot(page)).toEqual(fresh);await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(fresh);
});
test('legal enemy defeat boundary resumes once and a confirmed new dungeon resets it',async({page})=>{
 const made=startDungeonBattle(atEncounter(freshDungeon('dungeon-defeat-fixture',1)));if(!made.ok)throw Error(made.reason);const entry=made.state,built=dungeonBattle(entry)!;
 const session=new BattleSession(built.catalog,entry.activeBattle!,entry.activeBattle!.seed,undefined,true,built.battlefield);let before=entry.activeBattle!;
 for(let i=0;i<400&&session.state.outcome==='ongoing';i++){
  before=session.state;const p=session.phase==='enemy'?session.nextEnemy():(session.prepare({type:'endTurn',unitId:session.active.id}),session.confirm());if(!p)throw Error('fixture stalled');session.finishPresentation(p.token);
 }
 expect(session.state.outcome).toBe('playerLoss');await load(page,{...entry,activeBattle:before});await expect(page.getByRole('heading',{name:/^Dungeon defeat/})).toBeVisible();
 const defeat=await snapshot(page);await expect(page.locator('#dungeon-descend')).toBeDisabled();await expect(page.locator('#dungeon-ascend')).toBeDisabled();
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(defeat);
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
