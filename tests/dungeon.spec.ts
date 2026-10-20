import { expect,test,type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { dungeonVictoryBoundary } from './helpers/dungeonFixtures';
import { dungeonBattle, acceptDungeonBattle, type DungeonState } from '../src/domain/dungeon';
import { encodeDungeon } from '../src/domain/dungeonSaveEnvelope';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { readSession,playCommand } from './helpers/battlePolicy';
import { playerDecision } from './helpers/playerPolicy';
import { dispatch } from '../src/domain/turns';
async function snapshot(page:Page):Promise<DungeonState>{return JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!);}
async function seed(page:Page,s:DungeonState){const encoded=encodeDungeon(s);if(!encoded.ok)throw Error(encoded.reason);await page.goto('dungeon');await page.evaluate(({key,text})=>{localStorage.setItem(key,text);}, {key:DUNGEON_KEYS.primary,text:encoded.text});await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();}
function fixture(slot:number){for(let seed=1;seed<=50;seed++){const f=dungeonVictoryBoundary(seed,slot);if(f)return f;}throw Error('No legal fixture');}
test('read-only entry, keyboard new dungeon, real action and active resume',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('dungeon');
 await expect(page.getByRole('button',{name:'Continue saved dungeon',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).focus();await page.keyboard.press('Enter');await page.locator('#dungeon-confirm-new').click();
 await expect(page.locator('#dungeon-descend')).toBeDisabled();await expect(page.locator('#dungeon-ascend')).toBeDisabled();
 const frame=await page.locator('#dungeon-screen').boundingBox();expect(frame!.y).toBe(0);expect(frame!.height).toBe(page.viewportSize()!.height);
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('floor-entry.png'),fullPage:true});
 await page.locator('#dungeon-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const before=await snapshot(page),cmd=playerDecision((await readSession(page)).state,dungeonBattle(before)!.catalog);
 await playCommand(page,cmd);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const saved=await snapshot(page);await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await readSession(page)).state).toEqual(saved.activeBattle);expect((await readSession(page)).events).toEqual([]);
 await page.screenshot({path:test.info().outputPath('battle-resumed.png')});expect(errors).toEqual([]);
});
test('legal reward and guardian boundaries, travel reload, backtracking and isolated saves',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const slot of [0,1,2]){
  const f=fixture(slot);writeFileSync(test.info().outputPath(`legal-boundary-${slot}.json`),JSON.stringify(f));
  await seed(page,f.snapshot);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await playCommand(page,f.command);await expect(page.locator('#dungeon-screen')).toBeVisible();
  const s=await snapshot(page),result=dispatch(f.snapshot.activeBattle!,f.command,dungeonBattle(f.snapshot)!.catalog);expect(result.ok).toBe(true);
  if(result.ok){const expected=acceptDungeonBattle(f.snapshot,result.state);expect(expected.ok).toBe(true);if(expected.ok)expect(s).toEqual(expected.state);}
  if(slot<2){
   await expect(page.locator('#dungeon-descend')).toBeDisabled();await expect(page.getByRole('heading',{name:'Choose one reward'})).toBeVisible();
   await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(s);
   await page.getByRole('button',{name:/^Claim /}).first().click();await page.locator('#dungeon-item-cancel').click();expect(await snapshot(page)).toEqual(s);
   await page.getByRole('button',{name:/^Claim /}).first().click();await page.locator('#dungeon-item-confirm').click();expect((await snapshot(page)).phase).toBe('ready');
  }else{
   await expect(page.locator('#dungeon-descend')).toBeEnabled();await page.screenshot({path:test.info().outputPath('guardian-cleared.png'),fullPage:true});
   await page.evaluate(()=>localStorage.setItem('tactics-guru:phaser:run:primary:v1','preserved-short-run'));
   await page.locator('#dungeon-descend').click();expect((await snapshot(page)).depth).toBe(2);const second=await snapshot(page);
   await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(second);
   await page.locator('#dungeon-ascend').click();const returned=await snapshot(page);expect(returned.depth).toBe(1);expect(returned.floors[0].completed).toBe(3);expect(returned.ownership).toEqual(second.ownership);expect(returned.floors[0].position).toBe(returned.floors[0].descriptor.downstairs);
   await expect(page.locator('#dungeon-start-encounter')).toBeDisabled();await page.locator('#dungeon-descend').click();expect((await snapshot(page)).floors).toEqual(second.floors);
   expect(await page.evaluate(()=>localStorage.getItem('tactics-guru:phaser:run:primary:v1'))).toBe('preserved-short-run');
   await page.screenshot({path:test.info().outputPath('floor-two-revisited.png'),fullPage:true});
  }
 }
 expect(errors).toEqual([]);
});
test('corrupt bytes stay exportable and uncertain travel requires explicit recovery',async({page})=>{
 test.setTimeout(90000);const f=fixture(2),result=dispatch(f.snapshot.activeBattle!,f.command,dungeonBattle(f.snapshot)!.catalog);if(!result.ok)throw Error('fixture failed');
 const cleared=acceptDungeonBattle(f.snapshot,result.state);if(!cleared.ok)throw Error(cleared.reason);
 await seed(page,cleared.state);await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){original.call(this,k,v);if(k==='tactics-guru:phaser:dungeon:primary:v1')throw Error('uncertain primary write');};});
 await page.locator('#dungeon-descend').click();expect((await snapshot(page)).depth).toBe(1);await expect(page.getByRole('status')).toContainText('Travel not published');
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();await page.locator('#dungeon-continue-primary').click();expect((await snapshot(page)).depth).toBe(2);
 await page.evaluate(key=>localStorage.setItem(key,'broken save bytes'),DUNGEON_KEYS.primary).catch(()=>{});await page.reload();
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export primary save',exact:true}).click();await downloadPromise;
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe('broken save bytes');
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();await page.locator('#dungeon-remove-primary').click();await page.locator('#dungeon-remove-cancel').click();
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe('broken save bytes');
});
