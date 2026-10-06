import { expect, test } from '@playwright/test';

test('proof controls survive repeated restart and expose distinct ready markers', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  const restart = page.getByRole('button', { name: 'Restart proof scene' });
  await expect(restart).toBeEnabled();
  await expect(page.getByRole('status')).toHaveText('Ready');
  for (let run = 1; run <= 6; run++) {
    await expect(page.locator('#game')).toHaveAttribute('data-run', String(run));
    await expect(page.locator('canvas')).toHaveCount(1);
    const timing = await page.evaluate(() => {
      const scene = performance.getEntriesByName('fit:scene-ready', 'mark')[0];
      const controls = performance.getEntriesByName('fit:controls-usable', 'mark')[0];
      return { scene: scene?.startTime, controls: controls?.startTime, count: performance.getEntriesByName('fit:controls-usable', 'mark').length };
    });
    expect(timing.scene).toBeGreaterThan(0);
    expect(timing.controls).toBeGreaterThanOrEqual(timing.scene);
    expect(timing.count).toBe(1);
    await page.setViewportSize(run % 2 ? { width: 390, height: 844 } : { width: 844, height: 390 });
    await expect(restart).toBeInViewport();
    await expect.poll(() => page.locator('canvas').evaluate(canvas => {
      const rect = canvas.getBoundingClientRect();
      return Math.abs(rect.width - innerWidth) < 2 && Math.abs(rect.height - innerHeight) < 2;
    })).toBe(true);
    if (run < 6) await restart.click();
  }
  await expect(page.locator('#game')).toHaveAttribute('data-run', '6');
  await page.waitForFunction(() => window.fitDiagnostics().frames.count >= 3);
  await page.getByText('Measurements', { exact: true }).click();
  await page.getByRole('button', { name: 'Refresh measurements' }).click();
  const report = JSON.parse(await page.locator('#fit-report').innerText());
  expect(report.run).toBe(6);
  expect(report.controlsUsableMs).toBeGreaterThanOrEqual(report.sceneReadyMs);
  expect(report.frames.count).toBeGreaterThanOrEqual(3);
  expect(report.resources.length).toBeGreaterThan(0);
  expect(report.build.commit).toMatch(/^[a-f0-9]{40}$/);
  await page.getByText('Measurements', { exact: true }).click();
  await page.screenshot({ path: test.info().outputPath('fit-scene.png') });
  expect(errors).toEqual([]);
});

test('shows loading before boot and a controlled error if the engine module cannot load', async ({ page }) => {
  await page.route('**/assets/start-*.js', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Error');
  await expect(page.getByRole('button', { name: 'Restart proof scene' })).toBeDisabled();
});

test('shell initially displays loading while the engine is delayed', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/start-*.js', async route => { await gate; await route.continue(); });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.getByRole('status')).toHaveText('Loading');
  await expect(page.getByRole('button', { name: 'Restart proof scene' })).toBeDisabled();
  release();
  await expect(page.getByRole('status')).toHaveText('Ready');
});
