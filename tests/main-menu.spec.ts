import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { menuFixture, terminalMenuBattle } from './helpers/menuFixtures';
import { BATTLE_STORAGE_KEYS } from '../src/persistence/battleStorage';
import { RUN_STORAGE_KEYS } from '../src/persistence/runStorage';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
const keys={battle:BATTLE_STORAGE_KEYS,run:RUN_STORAGE_KEYS,dungeon:DUNGEON_KEYS};
test('main menu: read-only root, separate artwork and isolated loading',async({page})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>{Storage.prototype.setItem=function(k,v){throw Error(`Unexpected menu write ${k}`);};});
 await page.goto('./');
 await expect(page.locator('[data-menu-action]')).toHaveText(['Continue','New Game','Hall of Records','Settings']);
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 const image=page.getByRole('img',{name:'Tactics Guru'});await expect(image).toBeVisible();
 expect(await image.evaluate(n=>(n as HTMLImageElement).naturalWidth/(n as HTMLImageElement).naturalHeight)).toBe(3);
 await expect(page.locator('canvas')).toHaveCount(0);
 expect(requests.some(url=>/\/start-[^/]+\.js|\.mp3|\.ogg|\/battle\/audio/.test(url))).toBe(false);
 await page.getByRole('button',{name:'Hall of Records'}).click();await expect(page.getByRole('dialog')).toContainText('Records are not collected yet');
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Hall of Records'})).toBeFocused();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Sound controls');
 await page.getByRole('dialog').locator('summary').focus();await page.keyboard.press('Tab');
 await expect(page.getByRole('button',{name:'Close',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');
 await expect(page.getByRole('dialog').locator('summary')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused();
 await page.screenshot({path:test.info().outputPath('menu.png'),fullPage:true});
});
for(const mode of ['battle','run','dungeon'] as const)test(`main menu: Continue resumes ${mode} through its owner`,async({page})=>{
 const text=menuFixture(mode);await page.addInitScript(({key,text})=>localStorage.setItem(key,text),{key:keys[mode].primary,text});
 await page.goto('./');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page).toHaveURL(new RegExp(`/${mode}$`));
 if(mode==='battle')await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 else if(mode==='run')await expect(page.locator('#run-start-encounter')).toBeVisible();
 else await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
 await expect(page.getByRole('link',{name:'Main menu',exact:true}).first()).toBeVisible();
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
test('main menu: New Game requires confirmation and preserves other save families',async({page})=>{
 const text=menuFixture('dungeon');await page.addInitScript(({keys,text})=>{localStorage.setItem(keys.dungeon.primary,text);localStorage.setItem(keys.battle.primary,'battle sentinel');},{keys,text});
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Start new dungeon?');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.dungeon.primary)).toBe(text);
 await page.reload();await expect(page.locator('dialog')).toHaveCount(1);await expect(page.locator('dialog')).not.toBeVisible();
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
 await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.battle.primary)).toBe('battle sentinel');
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
 await page.goto('./battle?entry=continue');await expect(page.getByRole('dialog')).toContainText('Saved battle');
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes(':battle:')))).toEqual([]);
 await page.goto('./run?entry=continue');await expect(page.getByRole('dialog')).toContainText('Run save recovery');
 await page.goto('./dungeon?entry=continue');await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes(':dungeon:')||key.includes(':run:')))).toEqual([]);
 await page.goto('./dungeon?entry=unrecognized');await expect(page.locator('dialog')).not.toBeVisible();
 await expect(page).toHaveURL(/\/dungeon$/);
});
test('main menu: failed new-game write retains exportable recovery copies',async({page})=>{
 const text=menuFixture('dungeon');
 await page.addInitScript(({key,text})=>{
  localStorage.setItem(key,text);const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(key.includes(':dungeon:'))throw new DOMException('full','QuotaExceededError');original.call(this,key,value);};
 },{key:keys.dungeon.primary,text});
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
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
});
test('main menu: unsaved return cancellation opens recovery and accepted leave reaches menu',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}}));
 await page.goto('./run');await page.getByRole('button',{name:'Play unsaved run',exact:true}).click();
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'Main menu',exact:true}).last().click();
 await expect(page.getByRole('dialog')).toContainText('Run save recovery');
 await page.locator('#run-close-recovery').click();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('link',{name:'Main menu',exact:true}).last().click();
 await expect(page.locator('#main-menu')).toBeVisible();await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
});
