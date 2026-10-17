import type { Page } from '@playwright/test';
import type { captureTarget } from './measure-fit-options.ts';

/** Only used in fresh collector-owned browser contexts; keep the HTTP cache and legacy saves. */
export async function navigateCapture(page: Page, target: ReturnType<typeof captureTarget>, cache: 'cold' | 'warm') {
  if (cache === 'cold') await page.goto(target.url);
  else {
    await page.evaluate(() => {
      for (const kind of ['battle', 'run']) for (const slot of ['primary', 'backup']) {
        localStorage.removeItem(`tactics-guru:phaser:${kind}:${slot}:v1`);
      }
    });
    await page.reload();
  }
  if (target.route === 'run') {
    await page.locator('#run-start').click();
    await page.locator('#run-start-encounter').click();
  }
  await page.getByRole('button', { name: target.restart, exact: true }).waitFor();
}
