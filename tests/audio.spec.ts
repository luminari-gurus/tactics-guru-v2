import { expect, test as base, type Page } from '@playwright/test';
import { AUDIO_LOAD_TIMEOUT_MS } from '../src/diagnostics/proofAssets';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// These cases test audio behavior after graphics setup, not cold GPU initialization.
// Qualify the same browser process that the test's isolated context will use.
const test = base.extend({ browser: [async ({ browser }, use, worker) => {
  const started = performance.now();
  const receipt: Record<string, unknown> = { project: worker.project.name, worker: worker.workerIndex,
    browser: browser.version(), startedAt: new Date().toISOString(), passed: false };
  const context = await browser.newContext();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const page = await context.newPage();
    await page.setContent('<canvas width=1 height=1></canvas>');
    receipt.graphics = await Promise.race([
      page.evaluate(() => {
        const started = performance.now(), canvas = document.querySelector('canvas')!;
        const gl = canvas.getContext('webgl');
        const contextMs = performance.now()-started;
        let pixel: Uint8Array | Uint8ClampedArray;
        if (gl) {
          gl.clearColor(0,1,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
          pixel = new Uint8Array(4); gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        } else {
          const context = canvas.getContext('2d');
          if (!context) throw new Error('No WebGL or Canvas renderer');
          context.fillStyle='#00ff00'; context.fillRect(0,0,1,1); pixel=context.getImageData(0,0,1,1).data;
        }
        if (pixel[0]!==0 || pixel[1]!==255 || pixel[2]!==0 || pixel[3]!==255) throw new Error('Graphics setup pixel mismatch');
        return {mode:gl?'webgl':'canvas',contextMs,elapsedMs:performance.now()-started,pixel:[...pixel]};
      }),
      new Promise((_,reject) => { timer=setTimeout(()=>reject(new Error('Audio worker graphics setup exceeded 15000ms')),15000); }),
    ]);
    receipt.passed = true;
  } catch (error) { receipt.error=String(error); throw error; }
  finally {
    clearTimeout(timer);
    await context.close();
    receipt.elapsedMs=performance.now()-started;
    const directory='verification-receipts/browser-graphics'; mkdirSync(directory,{recursive:true});
    writeFileSync(join(directory,`worker-${process.pid}-${worker.workerIndex}-${Date.now()}.json`),JSON.stringify(receipt,null,2)+'\n');
  }
  await use(browser);
}, {scope:'worker'}] });

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

test.afterEach(async ({page}, info) => {
  if (!info.title.startsWith('the test tone plays only') || info.status === info.expectedStatus) return;
  const snapshot = await page.evaluate(() => ({
    now: performance.now(), visibility: document.visibilityState,
    ready: document.querySelector('#fit-status')?.textContent,
    portrait: {complete: document.querySelector<HTMLImageElement>('#proof-portrait')?.complete,
      width: document.querySelector<HTMLImageElement>('#proof-portrait')?.naturalWidth},
    diagnostics: window.fitDiagnostics?.(),
    marks: performance.getEntriesByType('mark').map(({name,startTime})=>({name,startTime})),
    resources: performance.getEntriesByType('resource').map(({name,startTime,duration})=>({name,startTime,duration})),
  })).catch(error => ({ diagnosticError: String(error) }));
  await info.attach('initial-readiness', {body: JSON.stringify(snapshot), contentType: 'application/json'});
});

test('the test tone plays only from its button and reports played each time', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?scene=proof');
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
  await page.goto('/?scene=proof');
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
  await page.goto('/?scene=proof');
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.locator('#audio-status')).toHaveText('Unavailable: Could not load unlock-tone');
  await expect(page.getByRole('button', { name: 'Play test sound' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Restart proof scene' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Start diagnostic move', exact: true })).toBeDisabled();
  await page.getByLabel('Move destination').selectOption('raised-front');
  await expect(page.getByRole('button', { name: 'Start diagnostic move', exact: true })).toBeEnabled();
  expect(await audio(page)).toMatchObject({ state: 'unavailable', attempts: 0, playedCount: 0, cached: { mp3: false, ogg: true } });
  expect(await page.evaluate(() => window.fitDiagnostics().proof?.assetCount)).toBe(13);
  await page.getByRole('button', { name: 'Restart proof scene' }).click();
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.locator('#game')).toHaveAttribute('data-run', '2');
  await expect(page.locator('#audio-status')).toHaveText('Unavailable: Could not load unlock-tone');
  expect(errors).toEqual([]);
});

test('restart during playback resets the audio control for the new run without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?scene=proof');
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

test('a resume() that never settles is reported as blocked with retry, then plays once it can', async ({ page }) => {
  const errors = watchErrors(page);
  // Chrome keeps resume() pending while the context is not allowed to start; WebKit keeps it pending
  // for the length of an interruption. Neither rejects, so only a watchdog can hand the button back.
  await page.addInitScript(() => {
    const resume = AudioContext.prototype.resume;
    AudioContext.prototype.resume = function (this: AudioContext) {
      if (window.__allowAudio) return resume.call(this);
      return new Promise<void>(() => {});
    };
  });
  await page.goto('/?scene=proof');
  const button = page.getByRole('button', { name: 'Play test sound' });
  const status = page.locator('#audio-status');
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(button).toBeEnabled();
  await button.click();
  await expect(status).toHaveText('Unlocking');
  await expect(button).toBeDisabled();
  await expect(status).toHaveText(/^Blocked: /, { timeout: 5000 });
  const blocked = await audio(page);
  expect(blocked).toMatchObject({ state: 'blocked', attempts: 1, playedCount: 0 });
  expect(blocked.lastError).toMatch(/resume/);
  await expect(button).toBeEnabled();
  await expect(page.getByRole('status')).toHaveText('Ready');
  await page.evaluate(() => { window.__allowAudio = true; });
  await button.click();
  await expect(status).toHaveText('Played', { timeout: 5000 });
  expect(await audio(page)).toMatchObject({ state: 'played', contextState: 'running', attempts: 2, playedCount: 1, lastError: null });
  expect(errors).toEqual([]);
});

test.afterEach(async ({ page }, info) => {
  if (!info.title.startsWith('a stalled tone request')) return;
  await info.attach('audio-request-events', { body: JSON.stringify(await page.evaluate(() =>
    (window as unknown as { audioRequestEvents: unknown[] }).audioRequestEvents)), contentType: 'application/json' });
});

test('a stalled tone request never holds the board; the control reports unavailable after the load timeout', async ({ page }) => {
  await page.addInitScript(() => {
    const events: unknown[] = [];
    (window as unknown as { audioRequestEvents: unknown[] }).audioRequestEvents = events;
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    const urls = new WeakMap<XMLHttpRequest, string>();
    let sequence = 0;
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL) {
      urls.set(this, String(url));
      return Reflect.apply(open, this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
      const url = urls.get(this) ?? '';
      if (url.includes('unlock-tone')) {
        const id = ++sequence;
        const record = (event: string) => events.push({id, url, event, timeout: this.timeout,
          at: performance.now(), run: document.querySelector<HTMLElement>('#game')?.dataset.run});
        for (const event of ['load', 'error', 'timeout', 'abort', 'loadend']) this.addEventListener(event, () => record(event));
        record('send');
      }
      return send.call(this, body);
    };
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Never fulfilled, never aborted: the request neither completes nor errors on its own.
  await page.route('**/proof/unlock-tone.mp3', () => {});
  await page.goto('/?scene=proof');
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#audio-status')).toHaveText('Loading');
  await expect(page.getByRole('button', { name: 'Play test sound' })).toBeDisabled();
  expect(await page.evaluate(() => window.fitDiagnostics().audio)).toBeNull();
  expect(await page.evaluate(() => window.fitDiagnostics().proof?.assetCount)).toBe(13);
  await expect(page.getByRole('button', { name: 'Restart proof scene' })).toBeEnabled();
  await page.getByLabel('Move destination').selectOption('raised-front');
  await expect(page.getByRole('button', { name: 'Start diagnostic move', exact: true })).toBeEnabled();
  // Restart is allowed while the audio pass is in flight; the new run starts its own pass.
  await page.getByRole('button', { name: 'Restart proof scene' }).click();
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.locator('#game')).toHaveAttribute('data-run', '2');
  await expect(page.locator('#audio-status')).toHaveText('Loading');
  // The old run must cancel its request, not let its timeout callbacks retry through the restarted loader.
  await expect.poll(() => page.evaluate(() =>
    (window as unknown as { audioRequestEvents: {id: number; event: string}[] }).audioRequestEvents
      .filter(event => event.id === 1 && event.event === 'abort').length)).toBe(1);
  // Each attempt times out after AUDIO_LOAD_TIMEOUT_MS and Phaser's loader retries twice by default (`loader.maxRetries`).
  await expect(page.locator('#audio-status')).toHaveText('Unavailable: Could not load unlock-tone', { timeout: AUDIO_LOAD_TIMEOUT_MS * 3 + 5000 });
  await expect(page.getByRole('button', { name: 'Play test sound' })).toBeDisabled();
  expect(await audio(page)).toMatchObject({ state: 'unavailable', attempts: 0, playedCount: 0, cached: { mp3: false, ogg: true } });
  const events = await page.evaluate(() =>
    (window as unknown as { audioRequestEvents: {id: number; url: string; event: string}[] }).audioRequestEvents);
  expect(events.filter(event => event.id === 1 && event.event === 'timeout')).toEqual([]);
  // One canceled request in run 1, followed by the unchanged three attempts in run 2.
  expect(events.filter(event => event.url.endsWith('unlock-tone.mp3') && event.event === 'send')).toHaveLength(4);
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.locator('#game')).toHaveAttribute('data-run', '2');
  expect(errors).toEqual([]);
});

test('the control follows the audio context: a body gesture unlock reads Ready and a suspension reads Locked, with no attempt', async ({ page }) => {
  const errors = watchErrors(page);
  // Force the context to start suspended, as under an enforced autoplay policy.
  await page.addInitScript(() => {
    const Real = AudioContext;
    window.AudioContext = class extends Real {
      constructor(...args: ConstructorParameters<typeof AudioContext>) {
        super(...args);
        void this.suspend();
      }
    };
  });
  await page.goto('/?scene=proof');
  const button = page.getByRole('button', { name: 'Play test sound' });
  const status = page.locator('#audio-status');
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(status).toHaveText('Locked');
  await expect.poll(() => audio(page)).toMatchObject({ state: 'locked', contextState: 'suspended', locked: true, attempts: 0, playedCount: 0 });
  // Phaser's own body unlock resumes the context on any mousedown; the control must notice without a press.
  await page.getByRole('button', { name: 'Raised: Behind', exact: true }).click();
  await expect(status).toHaveText('Ready');
  await expect.poll(() => audio(page)).toMatchObject({ state: 'ready', contextState: 'running', locked: false, attempts: 0, playedCount: 0 });
  // A context that stops running before the next press is shown as Locked. Phaser suspends the context on
  // window blur (`pauseOnBlur`) and resumes a suspended or interrupted one on every step while the game has
  // focus, so blur is the way a suspension persists in emulation; a bare suspend() is undone within a frame.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(status).toHaveText('Locked');
  await expect.poll(() => audio(page)).toMatchObject({ state: 'locked', contextState: 'suspended', attempts: 0 });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(status).toHaveText('Ready');
  await expect.poll(() => audio(page)).toMatchObject({ state: 'ready', contextState: 'running', attempts: 0 });
  await button.click();
  await expect(status).toHaveText('Played', { timeout: 5000 });
  expect(await audio(page)).toMatchObject({ state: 'played', contextState: 'running', attempts: 1, playedCount: 1, lastError: null });
  expect(errors).toEqual([]);
});

declare global { interface Window { __allowAudio?: boolean } }
