import { expect, test } from '@playwright/test';
import { battleCatalog } from '../src/content/catalog';
import { BATTLE_CUES } from '../src/audio/battleCues';
import { PROOF_ASSETS } from '../src/diagnostics/proofAssets';
import { BattleSession } from '../src/app/BattleSession';
import { readSession } from './helpers/battlePolicy';
import { navigateCapture } from '../scripts/measure-fit-controls';
import { captureTarget, parseMeasureArgs } from '../scripts/measure-fit-options';

for (const route of ['', 'run']) test(`collector cold/warm ${route || 'battle'} uses real controls and isolates only v2 saves`, async ({page,baseURL}) => {
  const target=captureTarget(parseMeasureArgs(['--scene=battle','--url',baseURL!+route],{}));
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await navigateCapture(page,target,'cold');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const cold=await page.evaluate(()=>window.fitDiagnostics());
  expect(cold.controlsUsableMs).not.toBeNull();
  await page.evaluate(()=>{
    localStorage.setItem('legacy-save','keep');
    localStorage.setItem('tactics-guru:phaser:unrelated','keep');
    for(const kind of ['battle','run']) for(const slot of ['primary','backup']) localStorage.setItem(`tactics-guru:phaser:${kind}:${slot}:v1`,'invalid test save');
  });
  await navigateCapture(page,target,'warm');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(()=>[localStorage.getItem('legacy-save'),localStorage.getItem('tactics-guru:phaser:unrelated')])).toEqual(['keep','keep']);
  expect(errors).toEqual([]);
  await page.screenshot({path:test.info().outputPath(`collector-${route || 'battle'}-warm.png`)});
});

for (const scene of ['battle', 'proof', 'content-smoke'] as const) {
  test(`${scene} direct entry and refresh resolve public assets`, async ({ page, baseURL }) => {
    const paths = new Set<string>(), errors: string[] = [];
    page.on('request', request => paths.add(new URL(request.url()).pathname));
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const base = new URL(baseURL!).pathname;
    const expected = scene === 'proof' ? PROOF_ASSETS.map(asset => asset.url)
      : [...Object.values(battleCatalog.assets).map(asset => asset.runtimePath),
        ...(scene === 'battle' ? Object.values(BATTLE_CUES).map(cue => cue.url) : [])];
    await page.goto(`./?scene=${scene}`);
    for (let visit = 0; visit < 2; visit++) {
      if (visit) {
        await page.reload();
        if (scene === 'battle') await page.locator('#save-continue').click();
      }
      await expect(page.locator('#fit-status')).toHaveText(scene === 'proof' ? 'Ready' : scene === 'battle' ? 'Battle ready' : 'Content ready');
      await expect(page.locator('canvas')).toHaveCount(1);
      for (const path of expected) await expect.poll(() => paths.has(base + path.slice(1))).toBe(true);
      if (base !== '/') for (const path of expected) expect(paths.has(path)).toBe(false);
      if (scene !== 'content-smoke') {
        const portraits = page.locator(scene === 'proof' ? '#proof-portrait' : '#battle-party img');
        expect(await portraits.count()).toBeGreaterThan(0);
        await expect.poll(() => portraits.evaluateAll(images => images.every(image => {
          const img = image as HTMLImageElement;
          return img.complete && img.naturalWidth > 0;
        }))).toBe(true);
        for (const src of await portraits.evaluateAll(images => images.map(image => (image as HTMLImageElement).src))) {
          expect(new URL(src).pathname.startsWith(base)).toBe(true);
        }
        if (scene === 'proof') {
          await expect(page.locator('#audio-play')).toBeEnabled();
          await page.locator('#audio-play').click();
          await expect(page.locator('#audio-status')).toHaveText('Played');
        } else {
          // A base change must not alter the seeded state or save identity.
          await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
          const expectedSession = new BattleSession(battleCatalog, 'map:forest_ruins', 1);
          while (expectedSession.phase === 'enemy') {
            const step = expectedSession.nextEnemy()!;
            expectedSession.finishPresentation(step.token);
          }
          expect((await readSession(page)).state).toEqual(expectedSession.state);
          await page.locator('#battle-sound').click();
          await expect.poll(() => page.evaluate(() => window.fitDiagnostics().battleAudio!.status)).toBe('ready');
        }
      }
    }
    expect(errors).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`${scene}.png`) });
  });
}

for (const backend of ['Web Audio', 'HTML5']) test(`${backend} battle audio loads at the base and plays a committed move`, async ({ page }) => {
  if (backend === 'HTML5') await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: undefined });
    Object.defineProperty(window, 'webkitAudioContext', { value: undefined });
  });
  await page.goto('./');
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  await expect.poll(() => page.evaluate(() => window.fitDiagnostics().battleAudio!.load)).toBe('ready');
  await page.locator('#battle-sound').click();
  await expect.poll(() => page.evaluate(() => window.fitDiagnostics().battleAudio!.status)).toBe('ready');
  await page.locator('#battle-move').click();
  await page.locator('#battle-target').selectOption({ index: 1 });
  await page.locator('#battle-review').click();
  await page.locator('#dialog-confirm').click();
  await expect.poll(() => page.evaluate(() => window.fitDiagnostics().battleAudio!.completed)).toBeGreaterThan(0);
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
});

test('content fixture uses the base and still validates input', async ({ page, baseURL }) => {
  const fixtureURL = new URL('battle/content-fixture.json', baseURL!).href;
  await page.route(fixtureURL, route => route.fulfill({ json: { invalid: true } }));
  await page.goto('./?scene=content-smoke&contentFixture=1');
  await expect(page.locator('#fit-status')).toContainText('Invalid content:');
  await expect(page.locator('#fit-status')).not.toContainText('fixture could not load');
});

test('extracted map route still loads directly and on refresh at the base', async ({ page }) => {
  await page.goto('./map');
  await expect(page.locator('#map-grid span')).toHaveCount(400);
  await page.reload();
  await expect(page.locator('#map-grid span')).toHaveCount(400);
  await expect(page.locator('canvas')).toHaveCount(0);
});

for (const failure of ['missing', 'corrupt', 'stalled'] as const) {
  test(`content image ${failure} stays controlled at the base`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/battle/terrain/grass.png', route => failure === 'stalled' ? undefined
      : route.fulfill(failure === 'missing' ? { status: 404 } : { contentType: 'image/png', body: 'invalid PNG' }));
    await page.goto('./?scene=content-smoke');
    await expect(page.locator('#fit-status')).toContainText('Error: Asset load failed:', { timeout: 15000 });
    await expect(page.locator('#game')).toHaveAttribute('data-ready', 'false');
    expect(errors).toEqual([]);
  });

  test(`battle audio ${failure} stays nonfatal at the base`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/audio/battle/move.mp3', route => failure === 'stalled' ? undefined
      : route.fulfill(failure === 'missing' ? { status: 404 } : { contentType: 'audio/mpeg', body: 'invalid MP3' }));
    await page.goto('./');
    await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
    await expect.poll(() => page.evaluate(() => window.fitDiagnostics().battleAudio!.load), { timeout: 10000 }).toBe('unavailable');
    await expect(page.locator('#battle-next')).toBeEnabled();
    await page.locator('#battle-next').click();
    await expect.poll(async () => (await readSession(page)).state.commandCount).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}
