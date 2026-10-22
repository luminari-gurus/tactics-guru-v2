import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand } from '../../scripts/verification-timings.mjs';
import { summarizeVitest, summarizePlaywright } from '../../scripts/verification-report.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);

// Real runners, synthetic cases only: no browser fixture, server, application or production retries.
test('real Vitest JSON and sidecar retain failures, pending cases and retry diagnostics', async () => {
  mkdirSync(join(root, 'tmp'), { recursive: true });
  const dir = mkdtempSync(join(root, 'tmp', 'timing-vitest-'));
  try {
    const raw = join(dir, 'raw.json'), metadata = join(dir, 'metadata.json');
    writeFileSync(join(dir, 'vitest.config.mjs'), `export default { test: { root: ${JSON.stringify(dir)}, include: ['contract.test.mjs'], maxWorkers: 1, retry: 1 } };`);
    writeFileSync(join(dir, 'contract.test.mjs'), `import { it, expect } from ${JSON.stringify(resolve(root, 'node_modules/vitest/dist/index.js'))};
let attempts = 0;
it('passes', () => expect(true).toBe(true));
it('fails intentionally', () => expect(true).toBe(false));
it('retries once', () => expect(++attempts).toBe(2));
it.skip('pending intentionally', () => {});`);
    const result = await runCommand(process.execPath, [resolve(root, 'node_modules/vitest/vitest.mjs'), 'run', '--config', join(dir, 'vitest.config.mjs'),
      '--reporter=json', '--reporter=' + resolve(root, 'scripts/verification-vitest-reporter.mjs'), '--outputFile.json=' + raw], {
      cwd: root, env: { ...process.env, VERIFICATION_VITEST_METADATA: metadata }, logPath: join(dir, 'run.log'), timeoutMs: 30000,
    });
    assert.equal(result.exitCode, 1, readFileSync(join(dir, 'run.log'), 'utf8'));
    const report = summarizeVitest(JSON.parse(readFileSync(raw, 'utf8')));
    assert.equal(report.counts.total, 4); assert.equal(report.counts.failed, 1);
    assert.equal(report.counts.passed, 2); assert.equal(report.counts.pending, 1);
    const sidecar = JSON.parse(readFileSync(metadata, 'utf8'));
    assert.equal(sidecar.retryAttempts, 2);
    assert.equal(sidecar.configuredWorkers, 1);
    assert.ok(sidecar.diagnostics.length > 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('real browser-free Playwright reporter survives output cleanup and preserves flaky/failure/skip results', async () => {
  mkdirSync(join(root, 'tmp'), { recursive: true });
  const dir = mkdtempSync(join(root, 'tmp', 'timing-playwright-'));
  try {
    const output = join(dir, 'disposable-output'), receipts = join(dir, 'receipts');
    mkdirSync(output); mkdirSync(receipts);
    const sentinel = join(output, 'cleanup-sentinel'); writeFileSync(sentinel, 'remove me');
    const retained = join(receipts, 'previous.json'); writeFileSync(retained, '{"retained":true}\n');
    const raw = join(receipts, 'raw.json');
    writeFileSync(join(dir, 'playwright.config.cjs'), `module.exports = { testDir: ${JSON.stringify(dir)}, testMatch: 'contract.spec.cjs', workers: 1, retries: 1, reporter: [['json'], [${JSON.stringify(resolve(root, 'scripts/verification-playwright-reporter.mjs'))}]], outputDir: ${JSON.stringify(output)} };`);
    writeFileSync(join(dir, 'contract.spec.cjs'), `const { test, expect } = require(${JSON.stringify(require.resolve('@playwright/test'))});
test('passes', () => expect(true).toBe(true));
test('fails intentionally', () => expect(true).toBe(false));
test('flaky intentionally', ({}, info) => expect(info.retry).toBe(1));
test.skip('skips intentionally', () => {});`);
    const result = await runCommand(process.execPath, [resolve(root, 'node_modules/playwright/cli.js'), 'test', '-c', join(dir, 'playwright.config.cjs')], {
      cwd: root, env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: raw, VERIFICATION_PLAYWRIGHT_EVENTS: join(receipts, 'cases.jsonl') }, logPath: join(dir, 'run.log'), timeoutMs: 30000,
    });
    assert.equal(result.exitCode, 1, readFileSync(join(dir, 'run.log'), 'utf8'));
    const report = summarizePlaywright(JSON.parse(readFileSync(raw, 'utf8')));
    assert.equal(report.counts.total, 4); assert.equal(report.counts.expected, 1);
    assert.equal(report.counts.unexpected, 1); assert.equal(report.counts.flaky, 1);
    assert.equal(report.counts.skipped, 1); assert.equal(report.counts.retryAttempts, 2);
    assert.equal(report.configuredWorkers, 1);
    const events = readFileSync(join(receipts, 'cases.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.filter(row => row.event === 'testEnd').length, 6);
    assert.equal(events.filter(row => row.event === 'testEnd' && row.retry === 1).length, 2);
    assert.ok(events.some(row => row.event === 'testEnd' && row.status === 'skipped'));
    assert.ok(events.some(row => row.event === 'testEnd' && row.errors.length > 0));
    assert.equal(events.at(-1).event, 'end');
    assert.equal(existsSync(sentinel), false);
    assert.equal(readFileSync(retained, 'utf8'), '{"retained":true}\n');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// The runner is killed during its second case: there is deliberately no final
// Playwright report, but the first completed case must already be durable.
test('Playwright case checkpoints survive a timed-out runner', { timeout: 15000 }, async () => {
  mkdirSync(join(root, 'tmp'), { recursive: true });
  const dir = mkdtempSync(join(root, 'tmp', 'timing-partial-'));
  const events = join(dir, 'cases.jsonl');
  try {
    writeFileSync(join(dir, 'playwright.config.cjs'), `module.exports = { testDir: ${JSON.stringify(dir)}, testMatch: 'partial.spec.cjs', workers: 1, retries: 0, reporter: [[${JSON.stringify(resolve(root, 'scripts/verification-playwright-reporter.mjs'))}]] };`);
    writeFileSync(join(dir, 'partial.spec.cjs'), `const { test } = require(${JSON.stringify(require.resolve('@playwright/test'))});
      test('completed before cutoff', () => {});
      test('interrupted case', async () => { await new Promise(() => {}); });`);
    const result = await runCommand(process.execPath, [resolve(root, 'node_modules/playwright/cli.js'), 'test', '-c', join(dir, 'playwright.config.cjs')], {
      cwd: root, env: { ...process.env, VERIFICATION_PLAYWRIGHT_EVENTS: events }, logPath: join(dir, 'run.log'), timeoutMs: 4000,
    });
    assert.equal(result.timedOut, true);
    const rows = readFileSync(events, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(rows[0].planned, 2);
    assert.ok(rows.some(row => row.event === 'testEnd' && row.title.includes('completed before cutoff') && row.status === 'passed'));
    assert.ok(rows.some(row => row.event === 'testBegin' && row.title.includes('interrupted case')));
    assert.equal(result.cleanup.complete, process.platform === 'linux' ? true : null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
