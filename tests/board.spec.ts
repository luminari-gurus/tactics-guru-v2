import { expect, test } from '@playwright/test';

test('shows the complete elevated board in both orientations and after restart', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  for (const [orientation, viewport] of Object.entries({ portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } })) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => {
      const board = window.fitDiagnostics().board;
      const panel = document.querySelector('#fit-panel')!.getBoundingClientRect();
      return Boolean(board && board.bounds.left >= 15 && board.bounds.top >= panel.bottom + 15 && board.bounds.right <= innerWidth - 15 && board.bounds.bottom <= innerHeight - 15);
    })).toBe(true);
    const board = await page.evaluate(() => window.fitDiagnostics().board);
    expect(board?.tileCount).toBe(16);
    expect(board?.elevations).toEqual([0, 1, 2]);
    await page.screenshot({ path: test.info().outputPath(`board-${orientation}.png`) });
    await page.getByRole('button', { name: 'Restart proof scene' }).click();
    await expect(page.getByRole('status')).toHaveText('Ready');
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(await page.evaluate(() => window.fitDiagnostics().board?.tileCount)).toBe(16);
  }
  expect(errors).toEqual([]);
});
