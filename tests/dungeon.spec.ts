import { dungeonContent } from '../src/content/dungeon';
import { walkDungeon, reenterDungeonStair } from './helpers/dungeonTraversal';
import { atStairApproach } from './helpers/dungeonFixtures';
import { expect,test,type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { dungeonCapacityFixture, dungeonVictoryBoundary } from './helpers/dungeonFixtures';
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
 await expect(page.locator('#dungeon-descend')).toHaveCount(0);await expect(page.locator('#dungeon-ascend')).toHaveCount(0);
 const frame=await page.locator('#dungeon-screen').boundingBox();expect(frame!.y).toBe(0);expect(frame!.height).toBe(page.viewportSize()!.height);
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('floor-entry.png'),fullPage:true});
 await walkDungeon(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
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
   await expect(page.locator('#dungeon-descend')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Choose one reward'})).toBeVisible();
   await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(s);
   await page.getByRole('button',{name:/^Claim /}).first().click();await page.locator('#dungeon-item-cancel').click();expect(await snapshot(page)).toEqual(s);
   await page.getByRole('button',{name:/^Claim /}).first().click();await page.locator('#dungeon-item-confirm').click();expect((await snapshot(page)).phase).toBe('ready');
  }else{
   await page.evaluate(()=>localStorage.setItem('tactics-guru:phaser:run:primary:v1','preserved-short-run'));
   await walkDungeon(page,s.floors[s.depth-1].descriptor.downstairs);expect((await snapshot(page)).depth).toBe(2);const second=await snapshot(page);
   await page.screenshot({path:test.info().outputPath('automatic-descent.png'),fullPage:true});
   await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(second);
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
 test.setTimeout(90000);const f=fixture(2),result=dispatch(f.snapshot.activeBattle!,f.command,dungeonBattle(f.snapshot)!.catalog);if(!result.ok)throw Error('fixture failed');
 const cleared=acceptDungeonBattle(f.snapshot,result.state);if(!cleared.ok)throw Error(cleared.reason);
 const approach=atStairApproach(cleared.state);await seed(page,approach);await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){original.call(this,k,v);if(k==='tactics-guru:phaser:dungeon:primary:v1')throw Error('uncertain primary write');};});
 await page.locator(`#dungeon-map [data-cell="${approach.floors[0].descriptor.downstairs}"]`).click();expect(await snapshot(page)).toEqual(approach);await expect(page.locator('.dungeon-status')).toContainText('Travel not published');
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();await page.locator('#dungeon-continue-primary').click();expect((await snapshot(page)).depth).toBe(2);
 await page.evaluate(key=>localStorage.setItem(key,'broken save bytes'),DUNGEON_KEYS.primary).catch(()=>{});await page.reload();
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export primary save',exact:true}).click();await downloadPromise;
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe('broken save bytes');
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();await page.locator('#dungeon-remove-primary').click();await page.locator('#dungeon-remove-cancel').click();
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe('broken save bytes');
});

test('confirmed charm discard frees full capacity without cancelling or duplicating the pending reward',async({page,isMobile})=>{
 const initial=dungeonCapacityFixture();await seed(page,initial);
 const target=initial.ownership.equipment[0].instanceId;
 const discard=()=>page.locator(`[data-instance-id="${target}"]`).getByRole('button',{name:'Discard Warding Charm',exact:true});
 const saved=await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary);
 for(const cancellation of ['Cancel','Escape']){
  if(isMobile)await discard().tap();else await discard().click();
  await expect(page.getByRole('dialog')).toContainText('unequip it from fighter');await expect(page.locator('#dungeon-discard-cancel')).toBeFocused();
  if(cancellation==='Cancel'){await page.screenshot({path:test.info().outputPath('discard-confirmation.png')});await page.locator('#dungeon-discard-cancel').click();}else await page.keyboard.press('Escape');
  expect(await snapshot(page)).toEqual(initial);expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(saved);
 }
 await discard().click();await page.locator('#dungeon-discard-confirm').click();
 const disposed=await snapshot(page);expect(disposed.ownership.equipment).toHaveLength(5);expect(disposed.ownership.assignments).toEqual([]);expect(disposed.offer).toEqual(initial.offer);expect(disposed.party).toEqual(initial.party);expect(disposed.phase).toBe('reward');
 await expect(page.locator('#dungeon-descend')).toHaveCount(0);
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(disposed);
 await page.getByRole('button',{name:/^Claim /}).first().click();await page.locator('#dungeon-item-confirm').click();
 const claimed=await snapshot(page);expect(claimed.ownership.equipment).toHaveLength(6);expect(claimed.ownership.equipment.some(e=>e.instanceId===target)).toBe(false);expect(claimed.phase).toBe('ready');expect(claimed.offer).toBeNull();
 await page.screenshot({path:test.info().outputPath('discard-capacity-recovered.png'),fullPage:true});
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(claimed);
 await page.getByRole('button',{name:/^Discard /}).first().click();await page.locator('#dungeon-discard-confirm').click();
 const prepared=await snapshot(page);expect(prepared.phase).toBe('ready');expect(prepared.ownership.equipment).toHaveLength(5);
 await walkDungeon(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await expect(page.getByRole('button',{name:/^Discard /})).toHaveCount(0);
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
 await expect(page.locator('section[aria-label="Party"]')).toContainText('Level 2');
 await expect(page.locator('section[aria-label="Party"]')).toContainText('XP');
 await expect(page.locator('.dungeon-status')).toContainText('reached level 2');
 await page.locator('section[aria-label="Party"]').scrollIntoViewIfNeeded();
 await expect(page.locator('section[aria-label="Party"]')).toBeVisible();
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('hero-level-up.png'),fullPage:true});
 const saved=await snapshot(page);await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 expect((await snapshot(page)).party).toEqual(saved.party);
 await expect(page.locator('.dungeon-status')).not.toContainText('reached level');
 const offer=saved.offer!;await page.getByRole('button',{name:`Claim ${dungeonContent.items[offer.options[0].itemId].label}`,exact:true}).click();await page.locator('#dungeon-item-confirm').click();
 expect((await snapshot(page)).party).toEqual(saved.party);
});
