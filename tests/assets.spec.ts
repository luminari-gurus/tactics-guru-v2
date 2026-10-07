import { expect, test } from '@playwright/test';

test('canonical assets, near/far fixtures and restart remain stable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.getByRole('img', { name: 'Fighter portrait' })).toBeVisible();
  expect(await page.locator('#proof-portrait').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  for (const elevation of ['Ground', 'Raised']) {
    for (const relation of ['Behind', 'In front']) {
      await page.getByRole('button', { name: `${elevation}: ${relation}`, exact: true }).click();
      const proof = await page.evaluate(() => window.fitDiagnostics().proof);
      expect(proof?.relation).toBe(relation === 'Behind' ? 'behind' : 'front');
      expect(proof?.propElevation).toBe(elevation === 'Ground' ? 0 : 1);
      expect(proof?.assetCount).toBe(17);
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
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Error: Could not load proof asset fighter');
  await expect(page.getByRole('button', { name: 'Restart proof scene' })).toBeDisabled();
  await expect(page.getByRole('slider', { name: 'Tree opacity (unit behind)' })).toBeDisabled();
  expect(await page.evaluate(() => window.fitDiagnostics().proof)).toBeNull();
});
