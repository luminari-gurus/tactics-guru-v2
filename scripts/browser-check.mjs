import { chromium, webkit } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { platform, release, arch } from 'node:os';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
await mkdir('test-results/browser-environment', { recursive: true });
const directory = await mkdtemp('test-results/browser-environment/run-');
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
    await page.setContent('<title>Browser setup check</title><canvas></canvas>');
    if (await page.title() !== 'Browser setup check') throw new Error('Page did not render');
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
