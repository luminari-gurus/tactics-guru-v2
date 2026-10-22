import { expect, test, type Page } from '@playwright/test';
import { walkDungeon } from './helpers/dungeonTraversal';
import { projectTile } from '../src/geometry/iso';
import { confirmRestart, readSession } from './helpers/battlePolicy';

async function settled(page:Page) {
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))));
  return JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
}
async function activate(page:Page, selector='#battle-hud-toggle') {
  if(test.info().project.use.hasTouch) await page.locator(selector).tap();
  else await page.locator(selector).click();
}
for(const [width,height] of [[390,844],[360,640],[844,390],[915,412]]) {
  test(`mobile HUD preserves intent, geometry and accessible input at ${width}x${height}`,async({page},info)=>{
    await page.setViewportSize({width,height});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const toggle=page.locator('#battle-hud-toggle');await expect(toggle).toHaveAttribute('aria-expanded','true');
    await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});
    const before=await page.locator('#game').getAttribute('data-session');
    const actor=await page.locator('#battle-actor').textContent(),preview=await page.locator('#battle-preview').textContent();
    const initial=await settled(page);
    for(let i=0;i<3;i++) {
      await activate(page);await expect(toggle).toHaveAttribute('aria-expanded','false');
      await expect(page.locator('#battle-hud-contents')).toBeHidden();
      const collapsed=await settled(page);
      expect(collapsed.region.width*collapsed.region.height).toBeGreaterThan(initial.region.width*initial.region.height);
      expect(collapsed.selectionEvents).toBe(initial.selectionEvents);
      expect(await page.locator('#game').getAttribute('data-session')).toBe(before);
      const box=(await toggle.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(height);
      await toggle.focus();await page.keyboard.press('Tab');
      expect(await page.evaluate(()=>!!document.activeElement?.closest('#battle-hud-contents'))).toBe(false);
      await toggle.focus();await page.keyboard.press('Enter');await expect(toggle).toHaveAttribute('aria-expanded','true');
      expect(await page.locator('#battle-actor').textContent()).toBe(actor);expect(await page.locator('#battle-preview').textContent()).toBe(preview);
      expect(await page.locator('#game').getAttribute('data-session')).toBe(before);
    }
    await page.locator('#battle-review').focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    // Native modal capture blocks the toggle while reviewing.
    await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);
    await page.locator('#dialog-cancel').click();
    await activate(page);await page.screenshot({path:info.outputPath(`collapsed-${width}x${height}.png`)});
    const collapsed=await settled(page);
    const cell=collapsed.tiles.find((tile:any)=>{
      const p=projectTile(tile),x=collapsed.transform.x+p.x*collapsed.transform.scale,y=collapsed.transform.y+p.y*collapsed.transform.scale;
      return x>collapsed.region.x+20&&x<collapsed.region.x+collapsed.region.width-20&&y>collapsed.region.y+20&&y<collapsed.region.y+collapsed.region.height-20;
    });
    expect(cell).toBeTruthy();const p=projectTile(cell),x=collapsed.transform.x+p.x*collapsed.transform.scale,y=collapsed.transform.y+p.y*collapsed.transform.scale;
    if(info.project.use.hasTouch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
    const picked=await settled(page);expect(picked.selectionEvents).toBe(collapsed.selectionEvents+1);
    expect(picked.selected).toEqual({x:cell.x,y:cell.y,elevation:cell.elevation});
    expect((await readSession(page)).state).toEqual(JSON.parse(before!).state);
    await page.setViewportSize({width:1280,height:720});await expect(toggle).toBeHidden();await expect(page.locator('#battle-hud-contents')).toBeVisible();
    await page.setViewportSize({width:height,height:width});await expect(toggle).toHaveAttribute('aria-expanded','false');
    await page.setViewportSize({width:1280,height:720});await expect(page.locator('#battle-hud-contents')).toBeVisible();
    await page.locator('#fit-restart').click();await confirmRestart(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    await page.setViewportSize({width:height,height:width});await expect(toggle).toHaveAttribute('aria-expanded','false');
    await page.reload();await expect(toggle).toHaveAttribute('aria-expanded','true');
    expect(errors).toEqual([]);
  });
}

test('collapsed camera navigation, stale gestures and presentation remain safe',async({page})=>{
  await page.setViewportSize({width:915,height:412});await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await activate(page);const initial=await settled(page),r=initial.region;
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.wheel(0,-180);
  const zoomed=await settled(page);expect(zoomed.transform.scale).toBeGreaterThan(initial.transform.scale);
  await page.mouse.down();await page.mouse.move(r.x+r.width/2+25,r.y+r.height/2+10,{steps:4});await page.mouse.up();
  const panned=await settled(page);const count=(await readSession(page)).state.commandCount;
  await activate(page);await activate(page);const restored=await settled(page);
  expect(restored.transform.scale).toBeCloseTo(panned.transform.scale,5);expect(restored.selectionEvents).toBe(panned.selectionEvents);
  // Resize resets an in-flight pointer before its release can select a tile.
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.setViewportSize({width:844,height:390});await settled(page);await page.mouse.up();
  expect((await settled(page)).selectionEvents).toBe(restored.selectionEvents);expect((await readSession(page)).state.commandCount).toBe(count);
  await activate(page);await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.locator('#dialog-confirm').click({force:true});
  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');
  await page.locator('#battle-hud-toggle').click({force:true});await page.locator('#battle-hud-toggle').click({force:true});
  await expect(page.locator('#battle-next')).toBeDisabled();expect((await readSession(page)).state.commandCount).toBe(count+1);
  await page.clock.resume();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
});

test('collapsed runtime errors remain reachable and recovery modal returns to visible toggle',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await activate(page);await page.evaluate(()=>window.dispatchEvent(new ErrorEvent('error',{message:'controlled HUD acceptance error'})));
  await activate(page);await expect(page.locator('#fit-status')).toContainText('Error:');
  await page.reload();await page.locator('#save-continue').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await activate(page);await page.setViewportSize({width:1280,height:720});
  await expect(page.locator('#battle-hud-contents')).toBeVisible();
  await page.locator('#fit-restart').focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.locator('#save-cancel-reset').click();await expect(page.locator('#battle-hud-toggle')).toBeFocused();
  await expect(page.locator('#battle-hud-contents')).toBeHidden();
});

for(const route of ['/', '/run', '/dungeon'])for(const collapsed of [false,true]) {
  test(`touch contact stream supports landscape pinch and pan ${route} collapsed=${collapsed}`,async({page})=>{
    await page.setViewportSize({width:915,height:412});await page.goto(route);
    if(route==='/run'){await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();}
    if(route==='/dungeon'){
      await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();
      await page.locator('#dungeon-confirm-new').click();await walkDungeon(page);
    }
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');if(collapsed)await activate(page);
    const initial=await settled(page),r=initial.region,x=r.x+r.width/2,y=r.y+r.height/2;
    const contact=(identifier:number,x:number)=>({identifier,clientX:x,clientY:y});
    const touch=async(type:string,changed:ReturnType<typeof contact>[],active=changed)=>page.evaluate(({type,changed,active})=>{
      const canvas=document.querySelector('canvas')!;
      // WebKit exposes Touch but prohibits constructing it. Inject contact records
      // through DOM listeners; native Chromium multitouch is tested separately.
      const make=(p:{identifier:number;clientX:number;clientY:number})=>({...p,target:canvas,pageX:p.clientX,pageY:p.clientY,screenX:p.clientX,screenY:p.clientY});
      const event=Object.assign(new Event(type,{bubbles:true,cancelable:true}),{changedTouches:changed.map(make),touches:active.map(make),targetTouches:active.map(make)});
      canvas.dispatchEvent(event);
    },{type,changed,active});
    await touch('touchstart',[contact(1,x-30),contact(2,x+30)]);
    // Compatibility pointer events must not add a third contact or reset touches.
    await page.locator('canvas').dispatchEvent('pointerdown',{pointerType:'touch',pointerId:700,button:0,clientX:x-30,clientY:y});
    await page.locator('canvas').dispatchEvent('pointercancel',{pointerType:'touch',pointerId:700,clientX:0,clientY:0});
    await touch('touchmove',[contact(1,x-60),contact(2,x+60)]);
    const zoomed=await settled(page);expect(zoomed.transform.scale).toBeCloseTo(initial.transform.scale*2,6);
    await touch('touchend',[contact(2,x+60)],[contact(1,x-60)]);
    await touch('touchmove',[contact(1,x-30)]);
    const panned=await settled(page);expect(panned.transform.scale).toBeCloseTo(zoomed.transform.scale,6);expect(panned.transform.x).toBeCloseTo(zoomed.transform.x+30,6);
    await touch('touchcancel',[contact(1,x-30)],[]);
    await touch('touchmove',[contact(1,x)],[]);
    const cancelled=await settled(page);expect(cancelled.transform).toEqual(panned.transform);
    expect(cancelled.selectionEvents).toBe(initial.selectionEvents);expect(cancelled.commandCount).toBe(initial.commandCount);
  });
}

 test('opt-in input report captures landscape touches locally',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await page.goto('/?input-debug=1');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const region=(await page.locator('#battle-board-region').boundingBox())!;
  await page.touchscreen.tap(region.x+region.width/2,region.y+region.height/2);
  await page.getByText('Input report',{exact:true}).click();
  await page.getByRole('button',{name:'Capture / copy report'}).click();
  const report=JSON.parse(await page.getByRole('textbox',{name:'Input diagnostic report'}).inputValue());
  expect(report.counts.touchstart).toBeGreaterThan(0);
  expect(report.counts['accepted-start']).toBeGreaterThan(0);
  expect(report.build.commit).toBeTruthy();
  await page.goto('/');
  await expect(page.getByText('Input report',{exact:true})).toHaveCount(0);
});
