import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');

// Integration check: requires installed full Chromium and WebKit, no application server.
test('ordinary Playwright cleanup preserves environment, JSON and failure traces', () => {
  mkdirSync('tmp', { recursive: true });
  const fixture = mkdtempSync('tmp/browser-diagnostics-');
  try {
    writeFileSync(join(fixture, 'contract.config.ts'), `
      import { defineConfig } from '@playwright/test';
      export default defineConfig({ testDir: '.', testMatch: 'contract.spec.ts', workers: 1,
        retries: 2, use: { channel: 'chromium', launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } } });
    `);
    writeFileSync(join(fixture, 'contract.spec.ts'), `
      import { test, expect } from '@playwright/test';
      test('diagnostic contract', async ({ page }) => {
        await page.setContent('<p>Browser diagnostic contract</p>');
        expect(await page.locator('p').textContent()).toBe(process.env.DIAGNOSTIC_EXPECTED);
      });
    `);
    const preflight = spawnSync(process.execPath, ['scripts/browser-check.mjs'], {
      encoding: 'utf8', timeout: 60000,
    });
    assert.equal(preflight.status, 0, preflight.stdout + preflight.stderr);
    const environmentPath = /Browser environment receipt: (.+)/.exec(preflight.stdout)?.[1];
    assert.ok(environmentPath, preflight.stdout);
    const receipts = [environmentPath];
    const runs = [];
    for (const failing of [true, false]) {
      const run = spawnSync(process.execPath, ['scripts/browser-test.mjs', '-c',
        resolve(fixture, 'contract.config.ts'), '--diagnostics'], {
        encoding: 'utf8', timeout: 60000,
        env: { ...process.env, DIAGNOSTIC_EXPECTED: failing ? 'intentional mismatch' : 'Browser diagnostic contract' },
      });
      assert.equal(run.status, failing ? 1 : 0, run.stdout + run.stderr);
      const directory = /Browser receipts: (.+)/.exec(run.stdout)?.[1];
      assert.ok(directory, run.stdout);
      runs.push(directory);
      const report = JSON.parse(readFileSync(join(directory, 'results.json'), 'utf8'));
      assert.equal(report.stats.unexpected, failing ? 1 : 0);
      assert.equal(report.stats.expected, failing ? 0 : 1);
      const result = report.suites[0].specs[0].tests[0];
      assert.equal(result.results.length, 1, 'wrapper must override configured retries');
      const traces = readdirSync(join(directory, 'artifacts'), { recursive: true })
        .filter(name => name.endsWith('trace.zip'));
      assert.equal(traces.length, failing ? 1 : 0, 'retain only failed traces');
      receipts.push(join(directory, 'results.json'), ...traces.map(path => join(directory, 'artifacts', path)));
    }
    assert.notEqual(runs[0], runs[1]);
    assert.ok(existsSync(join(runs[0], 'results.json')), 'second run must retain first receipt');
    const before = new Map(receipts.map(path => [path, hash(path)]));
    // Match npm test's default output root; this must exercise real cleanup.
    mkdirSync('test-results', { recursive: true });
    const sentinel = join('test-results', 'diagnostic-cleanup-sentinel');
    writeFileSync(sentinel, 'Playwright must delete this file');
    const ordinary = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'),
      'test', '-c', resolve(fixture, 'contract.config.ts'), '--retries=0',
      '--output', resolve('test-results')], {
      encoding: 'utf8', timeout: 60000,
      env: { ...process.env, DIAGNOSTIC_EXPECTED: 'Browser diagnostic contract' },
    });
    assert.equal(ordinary.status, 0, ordinary.stdout + ordinary.stderr);
    assert.equal(existsSync(sentinel), false, 'ordinary run must actually clean test-results');
    for (const [path, digest] of before) {
      assert.ok(existsSync(path), `ordinary run deleted ${path}`);
      assert.equal(hash(path), digest, `ordinary run changed ${path}`);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
