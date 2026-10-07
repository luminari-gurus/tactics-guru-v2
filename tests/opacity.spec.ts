import { expect, test } from '@playwright/test';

test('opacity slider previews 0–100, preserves its choice across fixtures and restart', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  const slider = page.getByRole('slider', { name: 'Tree opacity (unit behind)' });
  await expect(slider).toHaveAttribute('min', '0');
  await expect(slider).toHaveAttribute('max', '100');
  await expect(slider).toHaveValue('40');
  await page.getByRole('button', { name: 'Raised: Behind', exact: true }).click();
  await slider.focus();
  for (const [key, value] of [['Home', '0'], ['End', '100'], ['ArrowLeft', '99']] as const) {
    await slider.press(key);
    await expect(slider).toHaveValue(value);
    await expect(page.locator('#tree-opacity-value')).toHaveText(`${value}%`);
    expect(await page.evaluate(() => window.fitDiagnostics().proof?.propAlpha)).toBe(Number(value) / 100);
  }
  await page.getByRole('button', { name: 'Raised: In front', exact: true }).click();
  expect(await page.evaluate(() => window.fitDiagnostics().proof?.propAlpha)).toBe(1);
  await page.getByRole('button', { name: 'Ground: Behind', exact: true }).click();
  expect(await page.evaluate(() => window.fitDiagnostics().proof?.propAlpha)).toBe(0.99);
  for (let run = 2; run <= 3; run++) {
    await page.getByRole('button', { name: 'Restart proof scene' }).click();
    await expect(page.getByRole('status')).toHaveText('Ready');
    await expect(page.locator('#game')).toHaveAttribute('data-run', String(run));
    await expect(slider).toHaveValue('99');
    expect(await page.evaluate(() => window.fitDiagnostics().proof?.propAlpha)).toBe(0.99);
  }
  await slider.focus();
  await slider.press('Home');
  expect(await page.evaluate(() => window.fitDiagnostics().proof?.propAlpha)).toBe(0);
});
