import { expect, railTest as test } from './helpers/startupDiagnostics';
import { battleTool } from './helpers/battlePolicy';
import { walkDungeon } from './helpers/dungeonTraversal';

const fixedSeedTest = test.extend({ pinDungeonSeed: 28 });

for (const backend of ['Web Audio', 'HTML5']) {
  fixedSeedTest(`${backend} dungeon audio loads at the base and plays a committed move`, {
    tag: '@touch-audio',
  }, async ({ page }) => {
  // This workload qualifies audio/base delivery, not random-layout pursuit. Use
  // the existing legal Fighter journey's initial floor for deterministic travel.
  if (backend === 'HTML5') await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: undefined });
    Object.defineProperty(window, 'webkitAudioContext', { value: undefined });
  });
  await page.goto('./dungeon');
  await walkDungeon(page, undefined, test.info().project.use.hasTouch ? 'touch' : 'keyboard');
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  await expect.poll(() => page.evaluate(() => window.fitDiagnostics().battleAudio!.load)).toBe('ready');
  await (await battleTool(page, '#battle-sound')).click();
  await expect.poll(() => page.evaluate(() => window.fitDiagnostics().battleAudio!.status)).toBe('ready');
  await page.locator('#battle-move').click();
  await page.locator('#battle-target').selectOption({ index: 1 });
  await page.locator('#battle-review').click();
  await expect.poll(() => page.evaluate(() => window.fitDiagnostics().battleAudio!.completed)).toBeGreaterThan(0);
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
});
}

test('menu public artwork and navigation respect the configured base',async({page,baseURL})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('./');
 const image=page.getByRole('img',{name:'Tactics Guru'});await expect(image).toBeVisible();
 const base=new URL(baseURL!).pathname;
 for(const image of await page.locator('#main-menu img').all()){
  expect(new URL(await image.getAttribute('src')??'',baseURL).pathname.startsWith(`${base}menu/`)).toBe(true);
  expect(await image.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 }
 for(const anchor of await page.locator('.menu-secondary a').all())expect(new URL(await anchor.getAttribute('href')??'',baseURL).pathname.startsWith(base)).toBe(true);
 await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('#dungeon-map')).toBeVisible();
 await expect(page).toHaveURL(new URL('./?game=dungeon',baseURL!).href);
 await page.getByRole('link',{name:'Main menu',exact:true}).click();
 await expect(page.locator('#main-menu')).toBeVisible();
 await expect(page).toHaveURL(new URL('./',baseURL!).href);
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
 expect(errors).toEqual([]);
});
