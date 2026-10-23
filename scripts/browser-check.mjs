import { chromium, webkit } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { platform, release, arch } from 'node:os';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
await mkdir('verification-receipts/browser-environment', { recursive: true });
const directory = await mkdtemp('verification-receipts/browser-environment/run-');
const report = {
  createdAt: new Date().toISOString(),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  node: process.version, playwright: require('@playwright/test/package.json').version,
  platform: platform(), release: release(), arch: arch(), browsers: {}, passed: true,
};
for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const override = name === 'chromium' ? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE : undefined;
  const executable = override || type.executablePath();
  const entry = { executable, override: Boolean(override), channel: name === 'chromium' ? 'chromium' : null };
  let browser;
  try {
    entry.executable = await realpath(executable);
    browser = await type.launch({ ...(name === 'chromium' ? { channel: 'chromium', executablePath: override } : {}), timeout: 15000 });
    entry.version = browser.version();
    const page = await browser.newPage();
    await page.setContent('<title>Browser setup check</title><canvas width=1 height=1></canvas>');
    if (await page.title() !== 'Browser setup check') throw new Error('Page did not render');
    let graphicsTimer;
    try {
      entry.graphics = await Promise.race([
        page.evaluate(() => {
          const started = performance.now();
          const canvas = document.querySelector('canvas');
          const gl = canvas.getContext('webgl');
          const contextMs = performance.now() - started;
          let pixel, renderer;
          if (gl) {
            gl.clearColor(0, 1, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            pixel = new Uint8Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            const debug = gl.getExtension('WEBGL_debug_renderer_info');
            renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
          } else {
            const context = canvas.getContext('2d');
            if (!context) throw new Error('No WebGL or Canvas renderer');
            context.fillStyle = '#00ff00';
            context.fillRect(0, 0, 1, 1);
            pixel = context.getImageData(0, 0, 1, 1).data;
            renderer = 'Canvas 2D';
          }
          return { mode: gl ? 'webgl' : 'canvas', renderer, contextMs, elapsedMs: performance.now() - started,
            pixel: [...pixel], passed: pixel[0] === 0 && pixel[1] === 255 && pixel[2] === 0 && pixel[3] === 255 };
        }),
        new Promise((_, reject) => { graphicsTimer = setTimeout(() => reject(new Error('Graphics setup exceeded 15000 ms')), 15000); }),
      ]);
    } finally { clearTimeout(graphicsTimer); }
    if (!entry.graphics.passed) throw new Error('Graphics setup did not render the expected pixel');
    console.log(`${name}: ${entry.graphics.mode} graphics setup ${entry.graphics.elapsedMs.toFixed(1)}ms (${entry.graphics.renderer})`);
    entry.passed = true;
    console.log(`${name}: PASS (${entry.version}) ${entry.executable}`);
  } catch (error) {
    entry.passed = false;
    entry.error = String(error);
    report.passed = false;
    console.error(`${name}: FAIL\n${entry.error}`);
  } finally {
    await browser?.close();
  }
  report.browsers[name] = entry;
}
await writeFile(join(directory, 'environment.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Browser environment receipt: ${directory}/environment.json`);
if (!report.passed) {
  console.error('Run npm ci, then npm run setup:browsers (Linux: npm run setup:browsers:linux). See docs/browser-testing.md.');
  process.exitCode = 1;
}
