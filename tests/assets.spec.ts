import { expect, test } from '@playwright/test';

test('canonical assets, near/far fixtures and restart remain stable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?scene=proof');
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.getByRole('img', { name: 'Fighter portrait' })).toBeVisible();
  // The portrait is the 96 × 96 export (48 CSS px × DOM density cap 2, issue #35), decoded by the DOM image.
  expect(await page.locator('#proof-portrait').evaluate((image: HTMLImageElement) => ({ complete: image.complete, width: image.naturalWidth, height: image.naturalHeight }))).toEqual({ complete: true, width: 96, height: 96 });
  for (const elevation of ['Ground', 'Raised']) {
    for (const relation of ['Behind', 'In front']) {
      await page.getByRole('button', { name: `${elevation}: ${relation}`, exact: true }).click();
      const proof = await page.evaluate(() => window.fitDiagnostics().proof);
      expect(proof?.relation).toBe(relation === 'Behind' ? 'behind' : 'front');
      expect(proof?.propElevation).toBe(elevation === 'Ground' ? 0 : 1);
      expect(proof?.assetCount).toBe(13);
      expect(proof?.propAlpha).toBe(relation === 'Behind' ? 0.4 : 1);
      expect(proof?.heroDepth! < proof?.propDepth!).toBe(relation === 'Behind');
      await page.screenshot({ path: test.info().outputPath(`${elevation}-${relation}.png`) });
    }
  }
  for (let run = 2; run <= 4; run++) {
    await page.getByRole('button', { name: 'Restart proof scene' }).click();
    await expect(page.getByRole('status')).toHaveText('Ready');
    await expect(page.locator('#game')).toHaveAttribute('data-run', String(run));
    expect(await page.evaluate(() => window.fitDiagnostics().proof?.fixture)).toBe('ground-behind');
    expect(await page.evaluate(() => window.fitDiagnostics().proof?.objectCount)).toBe(72);
    expect(await page.evaluate(() => window.fitDiagnostics().proof?.propAlpha)).toBe(0.4);
  }
  expect(errors).toEqual([]);
});

test('failed canonical asset load gives a controlled visible error', async ({ page }) => {
  await page.route('**/proof/fighter.png', route => route.abort());
  await page.goto('/?scene=proof');
  await expect(page.getByRole('status')).toContainText('Error: Could not load proof asset fighter');
  await expect(page.getByRole('button', { name: 'Restart proof scene' })).toBeDisabled();
  await expect(page.getByRole('slider', { name: 'Tree opacity (unit behind)' })).toBeDisabled();
  expect(await page.evaluate(() => window.fitDiagnostics().proof)).toBeNull();
});

// Phaser 4.2.1 loads images by XHR. A 200 response the browser cannot decode goes through File.onProcessError, which
// only logs, so FILE_LOAD_ERROR never fires and create() has to report the missing texture itself (#35 review, finding 1).
test('a proof image that downloads but cannot be decoded gives a controlled visible error', async ({ page }) => {
  await page.route('**/proof/tree-grass-v1-480.webp', route => route.fulfill({ status: 200, contentType: 'image/webp', body: Buffer.from('RIFF not a decodable image') }));
  await page.goto('/?scene=proof');
  await expect(page.getByRole('status')).toContainText('Error: Could not load proof asset tree');
  await expect(page.getByRole('button', { name: 'Restart proof scene' })).toBeDisabled();
  await expect(page.getByRole('slider', { name: 'Tree opacity (unit behind)' })).toBeDisabled();
  expect(await page.evaluate(() => window.fitDiagnostics().proof)).toBeNull();
});

// The Pages deploy and `vite preview` answer a missing /proof/ path with index.html and status 200, so a missing or
// renamed proof asset takes the same decode path, never the network path the abort case above exercises.
test('a proof asset answered by the HTML shell (missing file on the deploy) gives a controlled visible error', async ({ page }) => {
  await page.route('**/proof/fighter-portrait-96.webp', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Tactics Guru v2</title>' }));
  await page.goto('/?scene=proof');
  await expect(page.getByRole('status')).toContainText('Error: Could not load proof asset fighter-portrait');
  await expect(page.getByRole('button', { name: 'Restart proof scene' })).toBeDisabled();
  expect(await page.evaluate(() => window.fitDiagnostics().proof)).toBeNull();
});
