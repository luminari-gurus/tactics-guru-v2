import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { BATTLE_STORAGE_KEYS as keys } from '../src/persistence/battleStorage';
import { decodeBattleSave } from '../src/domain/saveEnvelope';
import { battleCatalog as catalog } from '../src/content/catalog';
import { confirmRestart, playCommand, playerDecision, readSession } from './helpers/battlePolicy';

// Playwright disables BFCache by default; persistence coverage must include cached documents.
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,ignoreDefaultArgs:['--disable-back-forward-cache']}});

const ready=(page:Page)=>expect(page.locator('#game')).toHaveAttribute('data-phase','player');
const stored=(page:Page)=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),keys);
async function seedTwo(page:Page) {
  await page.goto('/');await ready(page);await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);
}
async function freeze(page:Page) {await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));}
async function chooseMove(page:Page) {
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();
}
async function touch(page:Page,selector:string) {
  const element=page.locator(selector);await element.scrollIntoViewIfNeeded();const box=(await element.boundingBox())!;
  if(test.info().project.use.hasTouch){await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);return;}
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
}

test('startup is read-only, keyboard Continue rebuilds no historical presentation, and recovery captures touch/focus',async({page})=>{
  await seedTwo(page);await playCommand(page,playerDecision((await readSession(page)).state));await ready(page);
  const before=await readSession(page),saved=await stored(page);
  await page.reload();await expect(page.locator('#save-continue')).toBeVisible();
  expect(await stored(page)).toEqual(saved);expect(await page.locator('#game').getAttribute('data-session')).toBeNull();
  expect(await page.evaluate(()=>window.fitDiagnostics().battleAudio)).toBeNull();
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeVisible();
  for(let i=0;i<9;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);}
  await page.screenshot({path:test.info().outputPath('continue.png')});
  await page.locator('#save-continue').focus();await page.keyboard.press('Enter');await ready(page);
  await expect(page.locator('#fit-restart')).toBeFocused();
  const after=await readSession(page);expect(after.state).toEqual(before.state);expect(after.replay).toBeNull();expect(after.events).toEqual([]);
  expect(after.continuation).toEqual({snapshot:before.state,commands:[],events:[]});
  expect(await page.evaluate(()=>window.fitDiagnostics().battleAudio)).toMatchObject({lastToken:0,started:0});
  expect(await stored(page)).toEqual(saved);
  await touch(page,'#battle-recovery');await expect(page.getByRole('dialog')).toBeVisible();
  const boxes=await page.getByRole('dialog').locator('button').evaluateAll(buttons=>buttons.map(button=>{
    button.scrollIntoView({block:'nearest'});const r=button.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,bottom:r.bottom};
  }));
  const viewport=page.viewportSize()!;
  for(const box of boxes){expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(viewport.width);expect(box.bottom).toBeLessThanOrEqual(viewport.height);}
  await page.mouse.click(3,viewport.height-3);expect((await readSession(page)).state).toEqual(before.state);
  // Let the browser's native touch highlight fade for the retained image.
  await page.waitForTimeout(350);
  await page.screenshot({path:test.info().outputPath('recovery.png')});
  await touch(page,'#save-close');await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('#battle-recovery')).toBeFocused();expect((await readSession(page)).state).toEqual(before.state);
});

test('held confirmation Enter cannot flow through Restart and replace either saved slot',async({page})=>{
  await page.goto('/');await ready(page);
  const before=await readSession(page),old=await stored(page);
  await chooseMove(page);await page.locator('#dialog-confirm').focus();
  await page.keyboard.down('Enter');
  const accepted=await stored(page);
  expect(accepted.primary).not.toBe(old.primary);expect(accepted.backup).toBe(old.primary);
  expect((await readSession(page)).state.commandCount).toBe(before.state.commandCount+1);
  await page.waitForTimeout(600);await page.keyboard.down('Enter');
  await page.waitForTimeout(50);await page.keyboard.down('Enter');await page.keyboard.up('Enter');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect((await readSession(page)).state.seed).toBe(before.state.seed);
  expect(await stored(page)).toEqual(accepted);
  // A fresh press may open reset, but holding that press must not also confirm it.
  await page.locator('#fit-restart').focus();await page.keyboard.down('Enter');
  await expect(page.locator('#save-confirm-reset')).toBeFocused();
  await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
  await expect(page.locator('#save-confirm-reset')).toBeVisible();expect(await stored(page)).toEqual(accepted);
  // Space retains its native keyup activation after repeated keydowns.
  await page.keyboard.down('Space');await page.keyboard.down('Space');
  expect(await stored(page)).toEqual(accepted);await page.keyboard.up('Space');await ready(page);
  expect((await readSession(page)).state.seed).toBe(before.state.seed+1);
  for(const text of Object.values(await stored(page)))expect(text).not.toBe(accepted.primary);
});

for(const side of ['player','enemy'] as const)test(`reload during legal ${side} presentation matches an uninterrupted browser`,async({page,browser,baseURL})=>{
  test.setTimeout(60000);
  const controlContext=await browser.newContext({viewport:page.viewportSize(),baseURL}),control=await controlContext.newPage();
  const errors:string[]=[];for(const p of [page,control])p.on('pageerror',e=>errors.push(e.message));
  try {
    for(const p of [page,control]){await p.clock.install();await seedTwo(p);}
    expect(await control.evaluate(()=>window.fitDiagnostics().build)).toEqual(await page.evaluate(()=>window.fitDiagnostics().build));
    if(side==='player'){
      for(const p of [page,control]){await chooseMove(p);await freeze(p);await p.locator('#dialog-confirm').click({force:true});}
    }else {
      // Wait through actual player controls and advance just enough to reach an enemy's accepted command.
      for(const p of [page,control]){
        await freeze(p);
        for(let i=0;i<30;i++){
          const s=await readSession(p),command=s.replay?.commands.at(-1);
          if(s.phase==='presenting' && command && s.state.units.find(u=>u.id===command.unitId)!.side==='enemy')break;
          if(s.phase==='player')await p.locator('#battle-next').click({force:true});
          await p.clock.runFor(32);
        }
      }
    }
    const boundary=await readSession(page);expect(boundary.phase).toBe('presenting');expect((await readSession(control)).state).toEqual(boundary.state);
    const last=boundary.replay!.commands.at(-1)!;expect(boundary.state.units.find(u=>u.id===last.unitId)!.side).toBe(side);
    const save=(await stored(page)).primary!,decoded=decodeBattleSave(save,catalog);expect(decoded.ok).toBe(true);if(decoded.ok)expect(decoded.state).toEqual(boundary.state);
    await page.reload();await page.clock.resume();await expect(page.locator('#save-continue')).toBeVisible();
    await page.locator('#save-continue').click();await control.clock.resume();
    await ready(page);await ready(control);
    expect((await readSession(page)).state).toEqual((await readSession(control)).state);
    const resumed=await readSession(page);expect(resumed.continuation!.snapshot).toEqual(boundary.state);
    expect(resumed.replay).toBeNull();
    const future=(await readSession(control)).events.slice(boundary.events.length);
    expect(resumed.events).toEqual(future);
    // Next legal player command and ensuing enemy continuation must also agree.
    const command=playerDecision(resumed.state);
    await playCommand(page,command);await playCommand(control,command);await ready(page);await ready(control);
    expect((await readSession(page)).state).toEqual((await readSession(control)).state);
    expect((await readSession(page)).events).toEqual((await readSession(control)).events.slice(boundary.events.length));
    await expect(page.locator('canvas')).toHaveCount(1);expect(errors).toEqual([]);
  } finally {await controlContext.close();}
});

test('backup recovery retains damaged primary, exports exact text, removes only after confirmation and resumes saving',async({page})=>{
  await seedTwo(page);const snapshot=(await stored(page)).primary!;
  const broken='\ud800\u0000<script>bad</script>'+'x'.repeat(20000);
  await page.evaluate(({keys,snapshot,broken})=>{localStorage.setItem(keys.backup,snapshot);localStorage.setItem(keys.primary,broken);localStorage.setItem('unrelated','keep');},{keys,snapshot,broken});
  await page.reload();await expect(page.locator('#save-continue')).toHaveText('Continue backup');
  await expect(page.getByRole('dialog')).toContainText('some progress may be lost');
  const downloading=page.waitForEvent('download');await page.locator('#save-export').click();const download=await downloading;
  const file=await download.path();expect(file).not.toBeNull();const exported=JSON.parse(readFileSync(file!,'utf8'));
  expect(exported.slots).toEqual(expect.arrayContaining([{slot:'primary',text:broken},{slot:'backup',text:snapshot}]));
  await page.locator('#save-continue').click();await ready(page);await expect(page.locator('#battle-save-status')).toContainText('unsaved');
  const before=(await readSession(page)).state.commandCount;await playCommand(page,playerDecision((await readSession(page)).state));await ready(page);
  expect((await readSession(page)).state.commandCount).toBeGreaterThan(before);expect((await stored(page)).primary).toBe(broken);
  await page.locator('#battle-recovery').click();await page.locator('#save-remove-primary').click();await page.locator('#save-cancel-remove').click();
  expect((await stored(page)).primary).toBe(broken);
  await page.locator('#save-remove-primary').click();await page.locator('#save-confirm-remove').click();
  expect((await stored(page)).primary).toBeNull();await page.locator('#save-retry').click();await page.locator('#save-close').click();
  await expect(page.locator('#battle-save-status')).toContainText('Battle saved');
  const decoded=decodeBattleSave((await stored(page)).primary!,catalog);expect(decoded.ok).toBe(true);if(decoded.ok)expect(decoded.state).toEqual((await readSession(page)).state);
  expect(await page.evaluate(()=>localStorage.getItem('unrelated'))).toBe('keep');
});

test('unknown storage blocks startup until retry; writes remain nonfatal during play',async({page})=>{
  await page.addInitScript(()=>{
    const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
    Object.assign(window,{denyRead:true,denyWrite:false});
    Storage.prototype.getItem=function(key){if((window as any).denyRead && key.startsWith('tactics-guru:phaser:'))throw new DOMException('Denied','SecurityError');return get.call(this,key);};
    Storage.prototype.setItem=function(key,value){if((window as any).denyWrite && key.startsWith('tactics-guru:phaser:'))throw new DOMException('Full','QuotaExceededError');return set.call(this,key,value);};
  });
  await page.goto('/');await expect(page.getByRole('dialog')).toContainText('unreadable');expect(await page.locator('#game').getAttribute('data-session')).toBeNull();
  await page.locator('#save-new').click();await page.locator('#save-confirm-reset').click();
  await expect(page.getByRole('dialog')).toContainText('Reset incomplete');expect(await page.locator('#game').getAttribute('data-session')).toBeNull();
  await page.evaluate(()=>Object.assign(window,{denyRead:false,denyWrite:true}));await page.locator('#save-retry').click();await ready(page);
  await expect(page.locator('#battle-save-status')).toContainText('unsaved');
  const before=(await readSession(page)).state.commandCount;await page.locator('#battle-next').click();await ready(page);
  expect((await readSession(page)).state.commandCount).toBeGreaterThan(before);
  await page.evaluate(()=>Object.assign(window,{denyWrite:false}));await page.locator('#battle-recovery').click();await page.locator('#save-retry').click();await page.locator('#save-close').click();
  await expect(page.locator('#battle-save-status')).toContainText('Battle saved');
});

test('failed partial reset retains battle, seed, recovery copies and usable controls; a retry succeeds once',async({page})=>{
  await seedTwo(page);const before=await readSession(page),old=await stored(page);
  await page.evaluate(keys=>{
    const remove=Storage.prototype.removeItem;
    Storage.prototype.removeItem=function(key){if(key===keys.primary)throw new DOMException('Denied','SecurityError');return remove.call(this,key);};
    Object.assign(window,{restoreRemove:()=>{Storage.prototype.removeItem=remove;}});
  },keys);
  await page.locator('#fit-restart').click();await page.locator('#save-confirm-reset').click();
  await expect(page.getByRole('dialog')).toContainText('Reset incomplete');expect((await readSession(page)).state).toEqual(before.state);
  expect((await stored(page)).backup).toBeNull();expect((await stored(page)).primary).toBe(old.primary);
  const downloadEvent=page.waitForEvent('download');await page.locator('#save-export').click();const download=await downloadEvent;
  expect(JSON.parse(readFileSync((await download.path())!,'utf8')).slots).toEqual(expect.arrayContaining([{slot:'primary',text:old.primary},{slot:'backup',text:old.backup}]));
  await page.locator('#save-close').click();await expect(page.locator('#fit-restart')).toBeEnabled();await expect(page.locator('#fit-status')).toHaveText('Battle ready');
  await page.evaluate(()=>(window as any).restoreRemove());await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);
  expect((await readSession(page)).state.seed).toBe(3);await expect(page.locator('canvas')).toHaveCount(1);
  await page.reload();await page.locator('#save-continue').click();await ready(page);expect((await readSession(page)).state.seed).toBe(3);
});

test('changed saved data refuses an old confirmation and requires fresh review',async({page})=>{
  await seedTwo(page);await page.locator('#fit-restart').click();
  await page.evaluate(keys=>localStorage.setItem(keys.primary,'changed'),keys);
  await page.locator('#save-confirm-reset').click();await expect(page.getByRole('dialog')).toContainText('Reset incomplete');
  expect((await stored(page)).primary).toBe('changed');expect((await readSession(page)).state.seed).toBe(2);
  await page.locator('#save-close').click();await page.locator('#fit-restart').click();await page.locator('#save-cancel-reset').click();
  expect((await stored(page)).primary).toBe('changed');await expect(page.locator('#fit-restart')).toBeFocused();
});

test('successful reset with failed fresh save cannot recover an old battle on reload',async({page})=>{
  await seedTwo(page);
  await page.evaluate(()=>{
    const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('tactics-guru:phaser:'))throw new DOMException('Full','QuotaExceededError');return set.call(this,key,value);};
  });
  await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);expect((await readSession(page)).state.seed).toBe(3);
  expect(await stored(page)).toEqual({primary:null,backup:null});await expect(page.locator('#battle-save-status')).toContainText('unsaved');
  await page.reload();await ready(page);expect((await readSession(page)).state.seed).toBe(1);await expect(page.getByRole('dialog')).not.toBeVisible();
});

for(const invalid of ['{broken',JSON.stringify({kind:'tactics-guru:battle-snapshot',format:99,payload:{},digest:'sha256:'+'0'.repeat(64)})])test(`invalid startup requires explicit reset: ${invalid.slice(0,12)}`,async({page})=>{
  await page.goto('/?scene=proof');await page.evaluate(({keys,invalid})=>localStorage.setItem(keys.primary,invalid),{keys,invalid});
  await page.goto('/');await expect(page.getByRole('dialog')).toContainText('needs recovery');await expect(page.locator('#save-continue')).toHaveCount(0);
  if(invalid.includes('"format":99'))await expect(page.getByRole('dialog')).toContainText('incompatible');
  expect((await stored(page)).primary).toBe(invalid);await page.locator('#save-new').click();
  await expect(page.locator('#save-confirm-reset')).toBeFocused();
  await page.locator('#save-cancel-reset').click();
  await expect(page.locator('#save-new')).toBeFocused();
  expect((await stored(page)).primary).toBe(invalid);await page.locator('#save-new').click();await page.locator('#save-confirm-reset').click();await ready(page);
  expect((await readSession(page)).state.seed).toBe(1);expect((await stored(page)).primary).not.toBe(invalid);
});

test.describe('browser history with BFCache enabled',()=>{
  test.beforeEach(async({page})=>{
    await page.addInitScript(()=>window.addEventListener('pageshow',event=>{
      if(event.persisted)sessionStorage.setItem('test:bfcache-return',location.href);
    }));
  });

  for(const cached of ['battle','recovery dialog'])test(`cached ${cached} cannot overwrite either slot of its replacement`,async({page,baseURL})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    const first=new URL('./?history=first',baseURL).href,map=new URL('map',baseURL).href;
    await page.goto(first);await ready(page);
    expect((await readSession(page)).state.seed).toBe(1);
    if(cached==='recovery dialog'){await page.reload();await expect(page.locator('#save-continue')).toBeVisible();}
    await page.goto(map);await expect(page.locator('#map-grid span')).toHaveCount(400);await page.goto(baseURL!);
    await page.locator('#save-new').click();await page.locator('#save-confirm-reset').click();await ready(page);
    const replacement=await readSession(page),saved=await stored(page);
    expect(replacement.state.seed).toBe(2);
    await page.goBack({waitUntil:'commit'});await expect(page).toHaveURL(map);
    await page.goBack({waitUntil:'commit'});
    await expect(page.locator('#save-continue')).toBeVisible();
    expect(await page.evaluate(()=>sessionStorage.getItem('test:bfcache-return'))).toBe(first);
    expect(await stored(page)).toEqual(saved);
    expect(await page.locator('#game').getAttribute('data-session')).toBeNull();
    await page.screenshot({path:test.info().outputPath('cached-return-recovery.png')});
    await page.locator('#save-continue').click();await ready(page);
    expect((await readSession(page)).state).toEqual(replacement.state);
    expect(await stored(page)).toEqual(saved);
    await page.locator('#battle-next').click();await ready(page);
    const after=await stored(page);
    for(const text of [after.primary,after.backup]){
      const decoded=decodeBattleSave(text!,catalog);expect(decoded.ok).toBe(true);
      if(decoded.ok)expect(decoded.state.seed).toBe(2);
    }
    expect(errors).toEqual([]);
  });

  for(const departure of ['player','presentation'])test(`cached return after restart at ${departure} preserves the accepted boundary`,async({page,baseURL})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    const first=new URL('./?history=first',baseURL).href,map=new URL('map',baseURL).href;
    await page.goto(first);await ready(page);
    await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);
    // Observe the last accepted boundary before the application's pagehide shutdown.
    await page.evaluate(keys=>window.addEventListener('pagehide',()=>{
      sessionStorage.setItem('test:departure',JSON.stringify({
        primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup),
      }));
    },{capture:true,once:true}),keys);
    if(departure==='presentation'){
      await page.evaluate(map=>{
        document.querySelector<HTMLButtonElement>('#battle-next')!.click();
        sessionStorage.setItem('test:departure-phase',document.querySelector<HTMLElement>('#game')!.dataset.phase!);
        location.assign(map);
      },map);
      await expect(page).toHaveURL(map);
      expect(await page.evaluate(()=>sessionStorage.getItem('test:departure-phase'))).toBe('presenting');
    }else await page.goto(map);
    await expect(page.locator('#map-grid span')).toHaveCount(400);
    const saved=JSON.parse((await page.evaluate(()=>sessionStorage.getItem('test:departure')))!);
    expect(await stored(page)).toEqual(saved);
    await page.goBack({waitUntil:'commit'});
    await expect(page.locator('#save-continue')).toBeVisible();
    expect(await page.evaluate(()=>sessionStorage.getItem('test:bfcache-return'))).toBe(first);
    expect(await stored(page)).toEqual(saved);
    await page.locator('#save-continue').click();await ready(page);
    const continued=await readSession(page),decoded=decodeBattleSave(saved.primary,catalog);
    expect(decoded.ok).toBe(true);
    if(decoded.ok)expect(continued.continuation!.snapshot).toEqual(decoded.state);
    expect(continued.state.seed).toBe(2);
    if(departure==='player'){expect(await stored(page)).toEqual(saved);expect(continued.events).toEqual([]);}
    await page.screenshot({path:test.info().outputPath(`continued-${departure}.png`)});
    expect(errors).toEqual([]);
  });
});
