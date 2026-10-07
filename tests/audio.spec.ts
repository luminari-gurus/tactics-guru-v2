import { expect, test, type Page } from '@playwright/test';

// Headless Chromium creates Phaser's AudioContext suspended and a Playwright click is trusted input,
// so the locked -> played path below does exercise Chromium's gesture gate. iOS Safari's rules
// (touch-only activation, silent switch, the `interrupted` state) and Android Chrome on hardware are
// not reproduced here; the physical checklist in docs/qa/issue-19-lifecycle.md covers them.

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

const audio = (page: Page) => page.evaluate(() => window.fitDiagnostics().audio!);

test('the test tone plays only from its button and reports played each time', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Play test sound' });
  const status = page.locator('#audio-status');
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(button).toBeEnabled();
  const before = await audio(page);
  expect(before).toMatchObject({ manager: 'webaudio', attempts: 0, playedCount: 0, lastError: null, cached: { mp3: true, ogg: true }, device: { mp3: true, webAudio: true } });
  expect(['locked', 'ready']).toContain(before.state);
  await expect(status).toHaveText(before.state === 'locked' ? 'Locked' : 'Ready');
  // Panning the board first is a gesture for Phaser's body unlock but must not play anything.
  const view = await page.evaluate(() => window.fitDiagnostics().board!.transform);
  await page.mouse.move(view.x, view.y + 120 * view.scale);
  await page.mouse.down();
  await page.mouse.move(view.x + 40, view.y + 120 * view.scale + 20, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect(await audio(page)).toMatchObject({ attempts: 0, playedCount: 0 });
  await button.click();
  await expect(status).toHaveText('Played', { timeout: 5000 });
  expect(await audio(page)).toMatchObject({ state: 'played', contextState: 'running', locked: false, attempts: 1, playedCount: 1, lastError: null });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(status).toHaveText('Played', { timeout: 5000 });
  await expect.poll(() => page.evaluate(() => window.fitDiagnostics().audio!.playedCount)).toBe(2);
  expect((await audio(page)).attempts).toBe(2);
  expect(errors).toEqual([]);
});

test('a context that will not resume is reported as blocked with retry, then plays once it can', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    const resume = AudioContext.prototype.resume;
    AudioContext.prototype.resume = function (this: AudioContext) {
      if (window.__allowAudio) return resume.call(this);
      return Promise.reject(new Error('resume refused by test'));
    };
  });
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Play test sound' });
  const status = page.locator('#audio-status');
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(button).toBeEnabled();
  await button.click();
  await expect(status).toHaveText(/^Blocked: /, { timeout: 5000 });
  const blocked = await audio(page);
  expect(blocked).toMatchObject({ state: 'blocked', attempts: 1, playedCount: 0 });
  expect(blocked.lastError).toMatch(/refused|suspended/);
  await expect(button).toBeEnabled();
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.getByRole('button', { name: 'Restart proof scene' })).toBeEnabled();
  await button.click();
  await expect(status).toHaveText(/^Blocked: /, { timeout: 5000 });
  expect((await audio(page)).attempts).toBe(2);
  await page.evaluate(() => { window.__allowAudio = true; });
  await button.click();
  await expect(status).toHaveText('Played', { timeout: 5000 });
  expect(await audio(page)).toMatchObject({ state: 'played', contextState: 'running', attempts: 3, playedCount: 1, lastError: null });
  expect(errors).toEqual([]);
});

test('a missing tone file leaves the board usable and the audio control unavailable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/proof/unlock-tone.mp3', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.locator('#audio-status')).toHaveText('Unavailable: Could not load unlock-tone');
  await expect(page.getByRole('button', { name: 'Play test sound' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Restart proof scene' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Start diagnostic move', exact: true })).toBeDisabled();
  await page.getByLabel('Move destination').selectOption('raised-front');
  await expect(page.getByRole('button', { name: 'Start diagnostic move', exact: true })).toBeEnabled();
  expect(await audio(page)).toMatchObject({ state: 'unavailable', attempts: 0, playedCount: 0, cached: { mp3: false, ogg: true } });
  expect(await page.evaluate(() => window.fitDiagnostics().proof?.assetCount)).toBe(4);
  await page.getByRole('button', { name: 'Restart proof scene' }).click();
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.locator('#game')).toHaveAttribute('data-run', '2');
  await expect(page.locator('#audio-status')).toHaveText('Unavailable: Could not load unlock-tone');
  expect(errors).toEqual([]);
});

test('restart during playback resets the audio control for the new run without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Play test sound' });
  const status = page.locator('#audio-status');
  await expect(page.getByRole('status')).toHaveText('Ready');
  await button.click();
  await page.getByRole('button', { name: 'Restart proof scene' }).click();
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.locator('#game')).toHaveAttribute('data-run', '2');
  await expect(status).toHaveText('Ready');
  expect(await audio(page)).toMatchObject({ state: 'ready', contextState: 'running', attempts: 0, playedCount: 0, lastError: null });
  await expect(button).toBeEnabled();
  await page.waitForTimeout(1500);
  expect(await audio(page)).toMatchObject({ state: 'ready', attempts: 0, playedCount: 0 });
  await button.click();
  await expect(status).toHaveText('Played', { timeout: 5000 });
  expect(await audio(page)).toMatchObject({ attempts: 1, playedCount: 1 });
  expect(errors).toEqual([]);
});

declare global { interface Window { __allowAudio?: boolean } }
