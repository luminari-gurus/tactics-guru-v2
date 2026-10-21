import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Integration check: requires the installed full Chromium, no application server.
test('focused diagnostics preserve failures, zero retries and separate receipts', () => {
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
    }
    assert.notEqual(runs[0], runs[1]);
    assert.ok(existsSync(join(runs[0], 'results.json')), 'second run must retain first receipt');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
