import { expect, test } from '@playwright/test';

for (const route of ['', '?scene=proof', '?scene=content-smoke', 'run']) {
  test(`missing engine chunk reports a recoverable startup error on ${route || 'battle'}`, { tag: '@canonical' }, async ({page}) => {
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route(/\/start-[^/]+\.js$/,r=>r.abort());
    await page.goto('./battle'+route);
    await expect(page.locator('#fit-status')).toContainText('Could not load');
    await expect(page.locator('#fit-status')).toContainText('Reload');
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('battle keeps its Canvas renderer fallback without WebGL', async ({page}) => {
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext as (this:HTMLCanvasElement,id:string,options?:unknown)=>RenderingContext|null;
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,id:string,options?:unknown){
      if (['webgl','webgl2','experimental-webgl'].includes(id))return null;
      return original.call(this,id,options);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('./battle');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  expect(await page.locator('canvas').evaluate(canvas=>(canvas as HTMLCanvasElement).getContext('2d')!==null)).toBe(true);
  await page.screenshot({path:test.info().outputPath('canvas-fallback.png')});
});

test('boots a Phaser scene and fits the viewport after resize', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?scene=proof');
  await expect(page).toHaveTitle('Tactics Guru v2');
  await expect(page.locator('#game[data-ready="true"] canvas')).toBeVisible();
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => page.locator('canvas').evaluate(canvas => {
      const rect = canvas.getBoundingClientRect();
      return Math.abs(rect.width - innerWidth) < 2 && Math.abs(rect.height - innerHeight) < 2;
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
