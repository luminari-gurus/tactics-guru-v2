import { test as base, type Browser, type TestInfo } from '@playwright/test';
import { writeFileSync } from 'node:fs';
export { expect } from '@playwright/test';

const qualified = new WeakSet<Browser>();

async function qualify(browser: Browser, info: TestInfo) {
  if (qualified.has(browser)) return;
  const started = performance.now();
  const receipt: Record<string, unknown> = { project: info.project.name,
    browser: browser.version(), passed: false, startedAt: new Date().toISOString() };
  const context = await browser.newContext();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const page = await context.newPage();
    await page.setContent('<canvas width="1" height="1"></canvas>');
    receipt.graphics = await Promise.race([
      page.evaluate(() => {
        const start = performance.now(), canvas = document.querySelector('canvas')!;
        const gl = canvas.getContext('webgl');
        const contextMs = performance.now() - start;
        let pixel: Uint8Array | Uint8ClampedArray;
        if (gl) {
          gl.clearColor(0, 1, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
          pixel = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        } else {
          const canvas2d = canvas.getContext('2d');
          if (!canvas2d) throw Error('No WebGL or Canvas renderer');
          canvas2d.fillStyle = '#00ff00'; canvas2d.fillRect(0, 0, 1, 1);
          pixel = canvas2d.getImageData(0, 0, 1, 1).data;
        }
        if (pixel[0] !== 0 || pixel[1] !== 255 || pixel[2] !== 0 || pixel[3] !== 255) {
          throw Error('Core graphics setup pixel mismatch');
        }
        return { mode: gl ? 'webgl' : 'canvas', contextMs, elapsedMs: performance.now() - start, pixel: [...pixel] };
      }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Core graphics setup exceeded 15000ms')), 15_000); }),
    ]);
    receipt.passed = true;
    qualified.add(browser);
  } catch (error) { receipt.error = String(error); throw error; }
  finally {
    clearTimeout(timer);
    await context.close();
    receipt.elapsedMs = performance.now() - started;
    writeFileSync(info.outputPath('graphics-setup.json'), JSON.stringify(receipt, null, 2) + '\n');
  }
}

// Functional core journeys start after recorded setup in the actual worker browser.
// No app page, storage or network cache is touched. Cold-start budgets remain in
// explicit performance qualification; this fixture does not certify cold startup.
export const test = base.extend({
  context: async ({ context, browser }, use, info) => {
    if (info.project.name.startsWith('pr-')) await qualify(browser, info);
    await use(context);
  },
});
