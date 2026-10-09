import { expect, test } from '@playwright/test';
import { projectTile } from '../src/geometry/iso';
import { proofDepth } from '../src/diagnostics/proofAssets';

test('actual move controls reject repeated input, complete, and cancel on repeated restart', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?scene=proof');
  await expect(page.locator('#fit-status')).toHaveText('Ready');
  const start = page.getByRole('button', { name: 'Start diagnostic move', exact: true });
  const state = page.locator('#move-status');
  await expect(start).toBeDisabled();
  for (let run = 0; run < 2; run++) {
    await page.getByLabel('Move destination').selectOption('raised-front');
    expect(await page.evaluate(() => window.fitDiagnostics().board?.selected)).toEqual({ x: 2, y: 2, elevation: 2 });
    await start.click();
    await expect(state).toHaveText('Moving');
    await expect(start).toBeDisabled();
    await start.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
    await expect.poll(() => page.evaluate(() => window.fitDiagnostics().proof?.heroDepth)).toBeGreaterThan(10);
    await page.getByRole('button', { name: 'Restart proof scene' }).click();
    await expect(page.locator('#fit-status')).toHaveText('Ready');
    await expect(state).toHaveText('Idle');
    expect(await page.evaluate(() => window.fitDiagnostics().proof?.fixture)).toBe('ground-behind');
    await page.waitForTimeout(2200);
    await expect(state).toHaveText('Idle');
    await start.click();
    await expect(state).toHaveText('Moving');
    const samples = await page.evaluate(async () => {
      const samples: NonNullable<ReturnType<typeof window.fitDiagnostics>['proof']>[] = [];
      while (document.querySelector('#move-status')!.textContent === 'Moving') {
        const proof = window.fitDiagnostics().proof;
        if (proof) samples.push(proof);
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
      return samples;
    });
    expect(samples.some(sample => sample.heroDepth < sample.propDepth && sample.propAlpha === 0.4)).toBe(true);
    expect(samples.some(sample => sample.heroDepth > sample.propDepth && sample.propAlpha === 1)).toBe(true);
    expect(samples.some(sample => sample.heroTile.elevation > 0 && sample.heroTile.elevation < 1)).toBe(true);
    for (const sample of samples) {
      expect(sample.heroPosition).toEqual(projectTile(sample.heroTile));
      expect(sample.heroDepth).toBe(proofDepth(sample.heroTile, 2.5));
    }
    await expect(state).toHaveText('Completed');
    await expect(start).toBeEnabled();
    await page.screenshot({ path: test.info().outputPath(`completed-${run}.png`) });
    const proof = await page.evaluate(() => window.fitDiagnostics().proof);
    expect(proof?.heroDepth).toBeGreaterThan(proof!.propDepth);
    expect(proof?.propAlpha).toBe(1);
  }
  expect(errors).toEqual([]);
});
