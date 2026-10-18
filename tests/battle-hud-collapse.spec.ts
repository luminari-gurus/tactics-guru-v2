import { expect, test, type Page } from '@playwright/test';
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
