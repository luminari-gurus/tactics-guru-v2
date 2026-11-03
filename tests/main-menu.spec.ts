import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { preparedSnapshot, rewardSnapshot, runContext } from './helpers/runItemFixtures';
import { encodeRunSave, type RunSnapshot } from '../src/domain/runSaveEnvelope';
import { readFile } from 'node:fs/promises';
import { menuFixture, terminalMenuBattle, rewardRunFixture } from './helpers/menuFixtures';
import { BATTLE_STORAGE_KEYS } from '../src/persistence/battleStorage';
import { RUN_STORAGE_KEYS } from '../src/persistence/runStorage';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
const keys={battle:BATTLE_STORAGE_KEYS,run:RUN_STORAGE_KEYS,dungeon:DUNGEON_KEYS};
test('main menu: read-only root, separate artwork and isolated loading',async({page})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>{Storage.prototype.setItem=function(k,v){throw Error(`Unexpected menu write ${k}`);};});
 await page.goto('./');
 await expect(page.locator('[data-menu-action]')).toHaveText(['Continue','New Game','Hall of Records','Settings']);
 await expect(page.getByText('A path through the forgotten realms')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 const image=page.getByRole('img',{name:'Tactics Guru'});await expect(image).toBeVisible();
 expect(await image.evaluate(n=>(n as HTMLImageElement).naturalWidth/(n as HTMLImageElement).naturalHeight)).toBe(3);
 await expect(page.locator('canvas')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Standalone battle',exact:true})).toHaveAttribute('href',/\?game=battle$/);
 await expect(page.getByRole('link',{name:'Three-encounter run',exact:true})).toHaveAttribute('href',/\?game=run$/);
 await expect(page.getByRole('link',{name:'Map inspection',exact:true})).toHaveAttribute('href',/\/map$/);
 expect(requests.some(url=>/\/start-[^/]+\.js|\.mp3|\.ogg|\/battle\/audio/.test(url))).toBe(false);
 await page.getByRole('button',{name:'Hall of Records'}).click();await expect(page.getByRole('dialog')).toContainText('Records are not collected yet');
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Hall of Records'})).toBeFocused();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Sound controls');
 await expect(page.getByRole('dialog')).toContainText('Combat controls');
 await expect(page.getByRole('radio',{name:'Auto'})).toBeChecked();
 await page.getByRole('dialog').locator('summary').focus();await page.keyboard.press('Tab');
 await expect(page.getByRole('button',{name:'Close',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');
 await expect(page.getByRole('dialog').locator('summary')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused();
 await page.screenshot({path:test.info().outputPath('menu.png'),fullPage:true});
});
for(const mode of ['battle','run','dungeon'] as const)test(`main menu: Continue resumes ${mode} through its owner`,async({page})=>{
 const text=menuFixture(mode);await page.addInitScript(({key,text})=>{
  if(!new URLSearchParams(location.search).has('game'))localStorage.setItem(key,text);
 },{key:keys[mode].primary,text});
 await page.goto('./');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page).toHaveURL(new RegExp(`\\/\\?game=${mode}$`));
 if(mode==='battle')await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 else if(mode==='run')await expect(page.locator('#run-start-encounter')).toBeVisible();
 else await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
 await expect(page.getByRole('link',{name:'Main menu',exact:true}).first()).toBeVisible();
 const saved=await page.evaluate(key=>localStorage.getItem(key),keys[mode].primary);
 await page.reload();
 await expect(page).toHaveURL(new RegExp(`\\/\\?game=${mode}$`));
 if(mode==='battle')await page.locator('#save-continue').click();
 else await page.getByRole('button',{name:`Continue saved ${mode}`,exact:true}).click();
 if(mode==='battle')await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 else if(mode==='run')await expect(page.locator('#run-start-encounter')).toBeVisible();
 else await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
 expect(await page.evaluate(key=>localStorage.getItem(key),keys[mode].primary)).toBe(saved);
});
test('main menu: multiple modes, backup warning, recovery and fresh save inspection',async({page})=>{
 const battle=menuFixture('battle'),run=menuFixture('run');
 await page.addInitScript(({keys,battle,run})=>{localStorage.setItem(keys.battle.primary,'broken');localStorage.setItem(keys.battle.backup,battle);localStorage.setItem(keys.run.primary,run);localStorage.setItem('godot:save','legacy');},{keys,battle,run});
 await page.goto('./');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Standalone battle · backup (some progress may be lost)');
 expect(await page.getByRole('dialog').locator('a').allTextContents()).toEqual(['Three-encounter run','Standalone battle · backup (some progress may be lost) · recovery needed']);
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeFocused();
 await page.evaluate(keys=>{localStorage.removeItem(keys.run.primary);localStorage.removeItem(keys.battle.backup);window.dispatchEvent(new Event('storage'));},keys);
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();await expect(page.getByRole('dialog').locator('a')).toHaveCount(3);
 expect(await page.evaluate(()=>localStorage.getItem('godot:save'))).toBe('legacy');
});
test('main menu: New Game confirms over the menu and preserves other save families',async({page})=>{
 const text=menuFixture('dungeon');await page.addInitScript(({keys,text})=>{localStorage.setItem(keys.dungeon.primary,text);localStorage.setItem(keys.battle.primary,'battle sentinel');},{keys,text});
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('#main-menu')).toBeVisible();await expect(page.getByRole('dialog')).toContainText('Start new dungeon?');
 await page.getByRole('button',{name:'Close',exact:true}).click();await expect(page.getByRole('button',{name:'New Game',exact:true})).toBeFocused();
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.dungeon.primary)).toBe(text);
 await page.getByRole('button',{name:'New Game',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Start new dungeon',exact:true}).click();
 await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');await expect(page.locator('dialog')).not.toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.battle.primary)).toBe('battle sentinel');
});
test('main menu: New Game starts immediately when no dungeon save exists',async({page})=>{
 await page.addInitScript(({keys})=>{localStorage.setItem(keys.battle.primary,'battle sentinel');localStorage.setItem(keys.run.primary,'run sentinel');},{keys});
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
 await expect(page.locator('dialog')).not.toBeVisible();
 await expect.poll(()=>page.evaluate(key=>localStorage.getItem(key),keys.dungeon.primary)).not.toBeNull();
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.battle.primary)).toBe('battle sentinel');
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.run.primary)).toBe('run sentinel');
});
test('main menu: a dungeon save appearing during navigation requires confirmation',async({page})=>{
 await page.addInitScript(key=>{if(new URLSearchParams(location.search).get('game')==='dungeon')localStorage.setItem(key,'newly arrived save');},keys.dungeon.primary);
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Start new dungeon?');
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.dungeon.primary)).toBe('newly arrived save');
});
test('main menu: changed dungeon save requires a fresh confirmation',async({page})=>{
 const text=menuFixture('dungeon');await page.goto('./');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:keys.dungeon.primary,text});
 await page.getByRole('button',{name:'New Game',exact:true}).click();
 await page.evaluate(key=>localStorage.setItem(key,'changed while confirming'),keys.dungeon.primary);
 await page.getByRole('dialog').getByRole('button',{name:'Start new dungeon',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Start new dungeon?');
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.dungeon.primary)).toBe('changed while confirming');
});
test('main menu: a backup-only dungeon still requires confirmation',async({page})=>{
 const text=menuFixture('dungeon');await page.addInitScript(({key,text})=>localStorage.setItem(key,text),{key:keys.dungeon.backup,text});
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Start new dungeon?');
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.dungeon.backup)).toBe(text);
});
test('main menu: unavailable storage and failed artwork keep native actions usable',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}}));
 await page.route('**/menu/*',route=>route.abort());await page.goto('./');
 await expect(page.getByRole('heading',{name:'Tactics Guru'})).toBeVisible();await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Save recovery',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByText('Privacy & analytics', {exact:true}).click();
 await expect(page.getByRole('dialog').locator('[data-telemetry-status]')).toBeVisible();await page.getByRole('checkbox').uncheck();await expect(page.getByRole('dialog')).toContainText('could not save your preference');
});
test('main menu: portrait composition scrolls at narrow, short and enlarged text sizes',async({page})=>{
 await page.goto('./');
 for(const [width,height] of [[320,568],[915,412],[1280,720]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const bounds=await page.locator('#main-menu').boundingBox();expect(bounds!.width).toBeLessThanOrEqual(512);
  for(const button of await page.locator('[data-menu-action]').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('link',{name:'Map inspection'}).scrollIntoViewIfNeeded();await expect(page.getByRole('link',{name:'Map inspection'})).toBeInViewport();
  await page.screenshot({path:test.info().outputPath(`menu-${width}x${height}.png`),fullPage:true});
 }
});
test('main menu: supplied background compositions remain independent of controls',async({page})=>{
 await page.goto('./');
 for(const art of ['dawn','midnight']){
  await page.locator('.menu-backdrop').evaluate((node,name)=>{(node as HTMLImageElement).src=`${(node as HTMLImageElement).src.replace(/[^/]+$/,'')}${name}.webp`;},art);
  await expect.poll(()=>page.locator('.menu-backdrop').evaluate(n=>(n as HTMLImageElement).complete&&(n as HTMLImageElement).naturalWidth>0)).toBe(true);
  await page.screenshot({path:test.info().outputPath(`background-${art}.png`),fullPage:true});
  await expect(page.locator('[data-menu-action]')).toHaveText(['Continue','New Game','Hall of Records','Settings']);
 }
});
test('main menu: stale Continue and closed-set intents preserve missing or damaged saves',async({page})=>{
 await page.goto('./?game=battle&entry=continue');await expect(page.getByRole('dialog')).toContainText('Saved battle');
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes(':battle:')))).toEqual([]);
 await page.goto('./?game=run&entry=continue');await expect(page.getByRole('dialog')).toContainText('Run save recovery');
 await page.goto('./?game=dungeon&entry=continue');await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes(':dungeon:')||key.includes(':run:')))).toEqual([]);
 await page.goto('./?game=dungeon&entry=unrecognized');await expect(page.locator('dialog')).not.toBeVisible();
 await expect(page).toHaveURL(/\/\?game=dungeon$/);
 await page.goto('./?game=battle&entry=new');await expect(page.getByRole('dialog')).toContainText('Start a new battle?');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.goto('./?game=run&entry=new');await expect(page.getByRole('dialog')).toContainText('Start new run?');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.goto('./?game=battle&entry=unrecognized');await expect(page.locator('dialog')).not.toBeVisible();
 await expect(page).toHaveURL(/\/\?game=battle$/);
 await page.goto('./?game=run&entry=unrecognized');await expect(page.locator('dialog')).not.toBeVisible();
 await expect(page).toHaveURL(/\/\?game=run$/);
});
test('main menu: failed new-game write retains exportable recovery copies',async({page})=>{
 const text=menuFixture('dungeon');
 await page.addInitScript(({key,text})=>{
  localStorage.setItem(key,text);const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(key.includes(':dungeon:'))throw new DOMException('full','QuotaExceededError');original.call(this,key,value);};
 },{key:keys.dungeon.primary,text});
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Start new dungeon',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:/Export primary/}).click();
 const file=await (await download).path();expect(readFileSync(file!,'utf8')).toBe(text);
 await expect(page.locator('#dungeon-screen')).toContainText('Progress unsaved');
});

test('main menu: terminal battle saves resume their existing outcome UI',async({page})=>{
 const text=terminalMenuBattle();await page.addInitScript(({key,text})=>localStorage.setItem(key,text),{key:keys.battle.primary,text});
 await page.goto('./');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','ended');
 await expect(page.getByRole('dialog')).toContainText(/Victory|Defeat/);
 await page.getByRole('dialog').getByRole('button',{name:'Main menu',exact:true}).focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('#main-menu')).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.battle.primary)).toBe(text);
});
test('main menu: unsaved run still warns after a rejected reward command',async({page})=>{
 const text=rewardRunFixture();
 await page.addInitScript(({key,text})=>{
  localStorage.setItem(key,text);const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(String(key).includes(':run:'))throw new DOMException('full','QuotaExceededError');original.call(this,key,value);};
 },{key:keys.run.primary,text});
 await page.goto('./?game=run');await page.getByRole('button',{name:'Continue saved run',exact:true}).click();
 const claim=page.getByRole('button',{name:/^Claim /}).first();
 await expect(claim).toBeVisible();await claim.click();await page.locator('#item-confirm').click();
 await expect(page.locator('#run-item-status')).toContainText(/unsaved/i);
 const action=page.getByRole('button',{name:/^(Use|Equip) /}).first();
 await expect(action).toBeVisible();
 const select=page.locator('#run-screen select').first();
 if(await select.count())await select.evaluate(node=>{const target=node as HTMLSelectElement;const mage=[...target.options].find(option=>option.value==='mage');if(mage){mage.disabled=false;target.value='mage';}});
 await action.click({force:true});await page.locator('#item-confirm').click();
 await expect(page.locator('#run-item-status')).toContainText('Nothing changed');
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'Main menu',exact:true}).last().click();
 await expect(page.getByRole('dialog')).toContainText('Run save recovery');
});
test('main menu: unsaved return cancellation opens recovery and accepted leave reaches menu',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}}));
 await page.goto('./?game=run');await page.getByRole('button',{name:'Play unsaved run',exact:true}).click();
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'Main menu',exact:true}).last().click();
 await expect(page.getByRole('dialog')).toContainText('Run save recovery');
 await page.locator('#run-close-recovery').click();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('link',{name:'Main menu',exact:true}).last().click();
 await expect(page.locator('#main-menu')).toBeVisible();await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
});

for(const path of ['unsaved play','failed replacement'] as const)test(`main menu: dungeon departure after rejected movement retains ${path} warning`,async({page})=>{
 if(path==='failed replacement')await page.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.includes(':dungeon:'))throw new DOMException('full','QuotaExceededError');set.call(this,key,value);};});
 await page.goto('./?game=dungeon');
 if(path==='unsaved play'){
  await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
  await page.locator('.dungeon-directions button:not(:disabled)').first().click();
 }else{
  await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
  await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
  await page.locator('#dungeon-close-recovery').click();
 }
 const before=await page.locator('#game').getAttribute('data-dungeon-snapshot');
 const blocked=await page.locator('.dungeon-directions button:disabled').first().getAttribute('aria-label');
 const arrows:Record<string,string>={North:'ArrowUp',East:'ArrowRight',South:'ArrowDown',West:'ArrowLeft'};
 await page.locator('#dungeon-map').press(arrows[blocked!]);
 await expect(page.locator('.dungeon-status')).toContainText('Movement refused');
 const cancel=page.waitForEvent('dialog');
 const departure=page.getByRole('link',{name:'Main menu',exact:true}).click();
 await (await cancel).dismiss();await departure;
 await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
 expect(await page.locator('#game').getAttribute('data-dungeon-snapshot')).toBe(before);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export current progress',exact:true}).last().click();
 const file=await (await download).path();expect(JSON.parse(readFileSync(file!,'utf8')).payload).toEqual(JSON.parse(before!));
 const accept=page.waitForEvent('dialog');const leave=page.getByRole('link',{name:'Main menu',exact:true}).click();
 await (await accept).accept();await leave;await expect(page.locator('#main-menu')).toBeVisible();
});
for(const condition of ['missing','invalid','unavailable'] as const)test(`main menu: startup battle recovery can return with ${condition} storage`,async({page})=>{
 if(condition==='invalid')await page.addInitScript(key=>localStorage.setItem(key,'invalid preserved battle'),keys.battle.primary);
 if(condition==='unavailable')await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}}));
 await page.goto('./?game=battle&entry=recovery');await expect(page.getByRole('dialog')).toContainText('Saved battle');
 await page.getByRole('dialog').getByRole('button',{name:'Main menu',exact:true}).click();
 await expect(page.locator('#main-menu')).toBeVisible();
 if(condition!=='unavailable')expect(await page.evaluate(key=>localStorage.getItem(key),keys.battle.primary)).toBe(condition==='invalid'?'invalid preserved battle':null);
});

// Item durability uses the menu's real run owner; the dev fixture stays transient.
async function menuItemReport(page:Page) { return {snapshot:JSON.parse(await page.locator('#game').getAttribute('data-run-snapshot')??'null')}; }
async function openMenuRunItems(page:Page,snapshot:RunSnapshot) {
 const encoded=encodeRunSave(snapshot,runContext);if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./?game=run');
 await page.evaluate(({keys,text})=>{localStorage.setItem(keys.primary,text);localStorage.setItem(keys.backup,text);},{keys:RUN_STORAGE_KEYS,text:encoded.text});
 await reloadMenuRunItems(page);
}
async function reloadMenuRunItems(page:Page) {
 await page.reload();await page.locator('#run-continue').click();await expect(page.locator('#run-item-status')).toBeVisible();
}
async function confirmMenuItem(page:Page) {await page.locator('#item-confirm').click();await expect(page.locator('dialog')).not.toBeVisible();}
async function activateMenuItem(page:Page,name:string,touch:boolean) {
 const button=page.getByRole('button',{name,exact:true});if(touch)await button.tap();else await button.click();
}
test('main menu: reward claim advances exactly once and survives pending/claimed reload', async ({ page }, info) => {
  const seed = Array.from({ length: 100 }, (_, i) => i).find(s => rewardSnapshot(s).items.offer!.options.some(o => o.itemId === 'item:healing_draught'))!;
  await openMenuRunItems(page,rewardSnapshot(seed)); const pending = (await menuItemReport(page)).snapshot;
  await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(pending);
  await activateMenuItem(page, 'Claim Healing Draught', info.project.name !== 'desktop');
  if (info.project.name === 'desktop') await page.getByRole('button', { name: 'Confirm', exact: true }).dblclick();
  else {
    const box = await page.getByRole('button', { name: 'Confirm', exact: true }).boundingBox();
    for (let i = 0; i < 2; i++) await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    if (await page.locator('dialog').isVisible()) await page.keyboard.press('Escape');
  }
  await expect(page.getByRole('heading', { name: 'Party items', exact: true })).toBeVisible();
  const claimed = (await menuItemReport(page)).snapshot;
  expect(claimed.items.run.encounterIndex).toBe(1); expect(claimed.items.itemRevision).toBe(1);
  expect(claimed.items.ownership.consumables).toEqual([{ itemId: 'item:healing_draught', quantity: 1 }]);
  await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(claimed);
});
test('main menu: real item use, equip and unequip preserve ownership/stats across reload', async ({ page }, info) => {
  await openMenuRunItems(page,preparedSnapshot());
  const select = page.getByRole('combobox', { name: 'Healing Draught target' });
  await expect(select.locator('option', { hasText: 'Mage (defeated)' })).toBeDisabled();
  await select.selectOption('ranger');
  await activateMenuItem(page, 'Use Healing Draught', info.project.name !== 'desktop'); await confirmMenuItem(page);
  const used = (await menuItemReport(page)).snapshot;
  expect(used.items.run.party[1].hp).toBe(10); expect(used.items.ownership.consumables[0].quantity).toBe(1);
  await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(used);
  await page.getByRole('combobox', { name: 'Warding Charm target' }).selectOption('ranger');
  await activateMenuItem(page, 'Equip Warding Charm', info.project.name !== 'desktop'); await confirmMenuItem(page);
  const equipped = (await menuItemReport(page)).snapshot;
  expect(equipped.items.ownership.assignments).toHaveLength(1);
  const fighter = await page.getByRole('region', { name: 'Party', exact: true }).textContent();
  await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(equipped);
  expect(await page.getByRole('region', { name: 'Party', exact: true }).textContent()).toBe(fighter);
  await page.getByRole('button', { name: 'Continue saved run', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  expect((await menuItemReport(page)).snapshot).toEqual(equipped);
  await page.getByRole('button', { name: 'Unequip Warding Charm' }).click(); await confirmMenuItem(page);
  expect((await menuItemReport(page)).snapshot.items.ownership.assignments).toEqual([]);
});
test('main menu: corruption preserves bytes, exports raw data and requires reviewed removal before saving', async ({ page }) => {
  await openMenuRunItems(page,preparedSnapshot());
  const backup = await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.backup);
  await page.evaluate(key => localStorage.setItem(key, '  {broken raw\n\ud800'), RUN_STORAGE_KEYS.primary);
  await reloadMenuRunItems(page);
  await expect(page.locator('#run-item-status')).toContainText('Continued backup');
  await page.getByRole('button', { name: 'Use Healing Draught' }).click(); await confirmMenuItem(page);
  await expect(page.locator('#run-item-status')).toContainText('unsaved');
  expect(await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.primary)).toBe('  {broken raw\n\ud800');
  expect(await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.backup)).toBe(backup);
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export primary save' }).click();
  const file = await download; expect(JSON.parse(await readFile((await file.path())!, 'utf8'))).toEqual({ slot: 'primary', text: '  {broken raw\n\ud800' });
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  await page.getByRole('button', { name: 'Remove primary save' }).click();
  await page.getByRole('button', { name: 'Remove reviewed save' }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.primary)).toBeNull();
  await page.locator('#run-close-recovery').click();
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  await page.getByRole('button', { name: 'Retry saving' }).click();
  await expect(page.locator('#run-item-status')).toContainText('Run saved');
  const saved = (await menuItemReport(page)).snapshot; await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(saved);
});
test('main menu: stale recovery review refuses changed bytes', async ({ page }) => {
  await openMenuRunItems(page,preparedSnapshot());
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  await page.getByRole('button', { name: 'Remove primary save' }).click();
  // Simulate a different tab writing after the review, without editing session state.
  await page.evaluate(key => localStorage.setItem(key, 'newer foreign bytes'), RUN_STORAGE_KEYS.primary);
  await page.getByRole('button', { name: 'Remove reviewed save' }).click();
  await expect(page.getByRole('dialog')).toContainText('primary: invalid');
  expect(await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.primary)).toBe('newer foreign bytes');
});
test('main menu: unavailable storage remains playable with owned items', async ({ page }) => {
  await openMenuRunItems(page,preparedSnapshot());
  await page.evaluate(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}}));
  await page.getByRole('button', { name: 'Use Healing Draught' }).click(); await confirmMenuItem(page);
  await expect(page.locator('#run-item-status')).toContainText('unsaved');
  expect((await menuItemReport(page)).snapshot.items.ownership.consumables[0].quantity).toBe(1);
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  await expect(page.locator('dialog')).toContainText('Storage security');
  await page.keyboard.press('Escape');
});
