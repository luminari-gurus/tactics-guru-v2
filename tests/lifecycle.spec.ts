import { expect, test, type Page } from '@playwright/test';

// Phaser's VisibilityHandler and the scene's own listeners both read `document.hidden` /
// `document.visibilityState`, so redefining them and dispatching `visibilitychange` drives every
// hidden/visible path the scene has. The page itself stays visible, so animation frames keep running:
// this exercises the scene's explicit freeze, not the browser's frame throttling (a physical check).
async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate(hidden => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

const lifecycle = (page: Page) => page.evaluate(() => window.fitDiagnostics().lifecycle!);
const audio = (page: Page) => page.evaluate(() => window.fitDiagnostics().audio!);

test('hidden and visible while idle count once each, keep rendering and never start audio', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  expect(await lifecycle(page)).toEqual({ hidden: 0, visible: 0, blur: 0, focus: 0, moveFrozenAt: null, moveCompleted: 0 });
  for (let cycle = 1; cycle <= 3; cycle++) {
    await setHidden(page, true);
    expect((await lifecycle(page)).hidden).toBe(cycle);
    await setHidden(page, false);
    expect((await lifecycle(page)).visible).toBe(cycle);
  }
  const frames = await page.evaluate(() => window.fitDiagnostics().frames.count);
  await expect.poll(() => page.evaluate(() => window.fitDiagnostics().frames.count)).toBeGreaterThan(frames);
  expect(await lifecycle(page)).toMatchObject({ hidden: 3, visible: 3, moveFrozenAt: null, moveCompleted: 0 });
  expect(await audio(page)).toMatchObject({ attempts: 0, playedCount: 0 });
  await expect(page.locator('#audio-status')).not.toHaveText(/Playing|Played/);
  await expect(page.getByRole('status')).toHaveText('Ready');
  expect(errors).toEqual([]);
});

test('a move in flight freezes while hidden and completes exactly once after resume, also after restart', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  const start = page.getByRole('button', { name: 'Start diagnostic move', exact: true });
  const status = page.locator('#move-status');
  for (let run = 1; run <= 2; run++) {
    await page.evaluate(() => {
      window.__completedCount = 0;
      window.__completedObserver?.disconnect();
      window.__completedObserver = new MutationObserver(() => { if (document.querySelector('#move-status')!.textContent === 'Completed') window.__completedCount!++; });
      window.__completedObserver.observe(document.querySelector('#move-status')!, { childList: true, characterData: true, subtree: true });
    });
    await page.getByLabel('Move destination').selectOption('raised-front');
    await start.click();
    await expect(status).toHaveText('Moving');
    await expect.poll(() => page.evaluate(() => window.fitDiagnostics().proof!.heroTile.x)).toBeGreaterThan(0.3);
    await setHidden(page, true);
    const frozen = await lifecycle(page);
    expect(frozen.moveFrozenAt).toBeGreaterThan(0);
    expect(frozen.moveFrozenAt).toBeLessThan(1);
    const first = await page.evaluate(() => window.fitDiagnostics().proof!.heroTile);
    await page.waitForTimeout(300);
    const second = await page.evaluate(() => window.fitDiagnostics().proof!.heroTile);
    expect(second).toEqual(first);
    await expect(status).toHaveText('Moving');
    await expect(start).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Ground: Behind', exact: true })).toBeDisabled();
    await setHidden(page, false);
    await expect(status).toHaveText('Completed', { timeout: 5000 });
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => window.__completedCount)).toBe(1);
    expect(await lifecycle(page)).toMatchObject({ hidden: run, visible: run, moveCompleted: 1 });
    expect(await page.evaluate(() => window.fitDiagnostics().proof!.heroTile)).toEqual({ x: 2, y: 2, elevation: 2 });
    await expect(start).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Ground: Behind', exact: true })).toBeEnabled();
    if (run === 1) {
      await page.getByRole('button', { name: 'Restart proof scene' }).click();
      await expect(page.getByRole('status')).toHaveText('Ready');
      await expect(page.locator('#game')).toHaveAttribute('data-run', '2');
      expect(await lifecycle(page)).toEqual({ hidden: 0, visible: 0, blur: 0, focus: 0, moveFrozenAt: null, moveCompleted: 0 });
      await expect(status).toHaveText('Idle');
      // Hidden handlers from the previous run must be gone: a hide/show pair in the new run counts once.
      await setHidden(page, true);
      await setHidden(page, false);
      expect(await lifecycle(page)).toMatchObject({ hidden: 1, visible: 1, moveFrozenAt: null });
    }
  }
  expect(errors).toEqual([]);
});

test('a pointer held down across hide and show cannot pan or select on resume', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  const view = await page.evaluate(() => window.fitDiagnostics().board!.transform);
  const point = { x: view.x, y: view.y + 120 * view.scale };
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 3, point.y, { steps: 2 });
  await setHidden(page, true);
  await setHidden(page, false);
  await page.mouse.move(point.x + 80, point.y + 40, { steps: 8 });
  expect(await page.evaluate(() => window.fitDiagnostics().board!.transform)).toEqual(view);
  await page.mouse.up();
  expect(await page.evaluate(() => window.fitDiagnostics().board!.selected)).toBeNull();
  expect(await page.evaluate(() => window.fitDiagnostics().board!.transform)).toEqual(view);
  // A fresh press still works: tap selects, drag pans.
  await page.mouse.click(point.x, point.y);
  expect(await page.evaluate(() => window.fitDiagnostics().board!.selected)).not.toBeNull();
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 60, point.y + 30, { steps: 6 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.fitDiagnostics().board!.transform)).not.toEqual(view);
  expect(errors).toEqual([]);
});

test('window blur and focus are counted and never start or repeat audio', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  const blurFocus = () => page.evaluate(() => { window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus')); });
  await blurFocus();
  expect(await lifecycle(page)).toMatchObject({ blur: 1, focus: 1 });
  expect(await audio(page)).toMatchObject({ attempts: 0, playedCount: 0 });
  await page.getByRole('button', { name: 'Play test sound' }).click();
  await blurFocus();
  await expect.poll(() => page.evaluate(() => window.fitDiagnostics().audio!.state), { timeout: 5000 }).toMatch(/^(played|blocked)$/);
  const after = await audio(page);
  expect(after.attempts).toBe(1);
  expect(after.playedCount).toBeLessThanOrEqual(1);
  expect(await lifecycle(page)).toMatchObject({ blur: 2, focus: 2 });
  await page.waitForTimeout(500);
  expect((await audio(page)).playedCount).toBe(after.playedCount);
  await expect(page.getByRole('button', { name: 'Play test sound' })).toBeEnabled();
  expect(errors).toEqual([]);
});

declare global { interface Window { __completedCount?: number; __completedObserver?: MutationObserver } }
