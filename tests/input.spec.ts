import { expect, test } from '@playwright/test';
import { pickTile, screenToBoard } from '../src/geometry/picking';
import { BOARD_FIXTURE } from '../src/diagnostics/boardFixture';

test('picks visible cells through art after transforms, resize and restart', async ({ page }) => {
  await page.goto('/?scene=proof');
  await expect(page.getByRole('status')).toHaveText('Ready');
  for (const viewport of [{width:390,height:844},{width:844,height:390}]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(150);
    const view = await page.evaluate(() => window.fitDiagnostics().board!.transform);
    // Front corner is visible in every orientation and clear of the diagnostic panel.
    const point = {x:view.x,y:view.y+120*view.scale};
    await page.mouse.click(point.x,point.y);
    const selected = pickTile(BOARD_FIXTURE,screenToBoard(point,view));
    expect(selected).not.toBeNull();
    expect(await page.evaluate(() => window.fitDiagnostics().board!.selected)).toEqual(selected);
    await page.mouse.move(point.x,point.y);
    await page.mouse.wheel(0,-100);
    await expect.poll(() => page.evaluate(() => window.fitDiagnostics().board!.scale)).toBeGreaterThan(view.scale);
    await page.mouse.down();
    await page.mouse.move(point.x+25,point.y-15,{steps:5});
    await page.mouse.up();
    expect(await page.evaluate(() => window.fitDiagnostics().board!.selected)).toEqual(selected);
    const transformed = await page.evaluate(() => window.fitDiagnostics().board!.transform);
    const next = {x:transformed.x,y:transformed.y+120*transformed.scale};
    await page.mouse.click(next.x,next.y);
    expect(await page.evaluate(() => window.fitDiagnostics().board!.selected)).toEqual(pickTile(BOARD_FIXTURE,screenToBoard(next,transformed)));
    await page.mouse.click(2,viewport.height-2);
    expect(await page.evaluate(() => window.fitDiagnostics().board!.selected)).toBeNull();
    await page.getByRole('button',{name:'Restart proof scene'}).click();
    await expect(page.getByRole('status')).toHaveText('Ready');
    expect(await page.evaluate(() => window.fitDiagnostics().board!.selected)).toBeNull();
  }
});

test('touch tap selects, pinch and its trailing pointer do not', async ({page,browserName}) => {
  test.skip(browserName !== 'chromium');
  await page.goto('/?scene=proof');
  await expect(page.getByRole('status')).toHaveText('Ready');
  const view = await page.evaluate(() => window.fitDiagnostics().board!.transform);
  const x = view.x, y = view.y+120*view.scale;
  const session = await page.context().newCDPSession(page);
  const touch = async (type:'touchStart'|'touchMove'|'touchEnd', points:{x:number;y:number;id:number}[]) => session.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  await touch('touchStart',[{x,y,id:1}]);
  await touch('touchEnd',[]);
  const selected = await page.evaluate(() => window.fitDiagnostics().board!.selected);
  expect(selected).not.toBeNull();
  await touch('touchStart',[{x:x-10,y,id:1},{x:x+10,y,id:2}]);
  await touch('touchMove',[{x:x-25,y,id:1},{x:x+25,y,id:2}]);
  await touch('touchEnd',[{x:x-25,y,id:1}]);
  await touch('touchEnd',[]);
  expect(await page.evaluate(() => window.fitDiagnostics().board!.selected)).toEqual(selected);
  expect(await page.evaluate(() => window.fitDiagnostics().board!.scale)).toBeGreaterThan(view.scale);
});

test('selection survives a live device pixel ratio change', async ({page}) => {
  await page.goto('/?scene=proof');
  await expect(page.getByRole('status')).toHaveText('Ready');
  const session = await page.context().newCDPSession(page);
  const viewport = page.viewportSize()!;
  for (const dpr of [1,3]) {
    await session.send('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:dpr,mobile:false});
    await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(dpr);
    const view = await page.evaluate(() => window.fitDiagnostics().board!.transform);
    await page.mouse.click(view.x,view.y+120*view.scale);
    expect(await page.evaluate(() => window.fitDiagnostics().board!.selected)).toEqual({x:3,y:3,elevation:0});
  }
  await session.send('Emulation.clearDeviceMetricsOverride');
});
