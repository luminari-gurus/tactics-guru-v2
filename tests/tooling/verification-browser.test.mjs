import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { runCommand } from '../../scripts/verification-timings.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
// Explicit separate command: these are real Chromium + Vite lifecycle contracts,
// not ordinary browser-free tooling checks or a recovered gameplay matrix.
for (const mode of ['preview', 'dev']) {
  test(`Chromium and Vite ${mode} release port 4173 after timeout`, { timeout: 90000 }, async () => {
    mkdirSync(join(root, 'tmp'), { recursive: true });
    const dir = mkdtempSync(join(root, 'tmp', 'issue219-browser-'));
    const receipt = resolve(root, 'verification-receipts/issue219', mode);
    mkdirSync(receipt, { recursive: true });
    try {
      writeFileSync(join(dir, 'playwright.config.ts'), `import base from ${JSON.stringify(resolve(root, 'playwright.config.ts'))};
export default { ...base, testDir: ${JSON.stringify(dir)}, testMatch: 'contract.spec.cjs', testIgnore: [], retries: 0,
  projects: base.projects.filter(p => p.name === 'desktop'),
  webServer: { ...base.webServer, cwd: ${JSON.stringify(root)}, command: 'npm run ${mode} -- --port 4173 --strictPort', reuseExistingServer: false },
  outputDir: ${JSON.stringify(join(receipt, 'artifacts'))} };`);
      writeFileSync(join(dir, 'contract.spec.cjs'), `const { test, expect } = require(${JSON.stringify(require.resolve('@playwright/test'))});
test('completed real browser smoke', async ({page}) => { await page.goto('/'); await expect(page.locator('canvas')).toBeVisible(); });
test('deliberately interrupted browser', async ({page}) => { await page.goto('/'); await new Promise(() => {}); });`);
      const execute = (name, extra, timeoutMs) => runCommand(process.execPath, [resolve(root, 'node_modules/playwright/cli.js'),
        'test', '-c', join(dir, 'playwright.config.ts'), '--reporter=line,json,./scripts/verification-playwright-reporter.mjs', ...extra], {
        cwd: root, env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: join(receipt, name + '.json'),
          VERIFICATION_PLAYWRIGHT_EVENTS: join(receipt, name + '-cases.jsonl') }, logPath: join(receipt, name + '.log'), timeoutMs,
      });
      const interrupted = await execute('interrupted', [], 20000);
      writeFileSync(join(receipt, 'interrupted-process.json'), JSON.stringify(interrupted, null, 2));
      assert.equal(interrupted.timedOut, true);
      assert.equal(interrupted.cleanup.complete, true, JSON.stringify(interrupted.cleanup));
      const events = readFileSync(join(receipt, 'interrupted-cases.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
      assert.ok(events.some(row => row.event === 'testEnd' && row.title.includes('completed real browser smoke') && row.status === 'passed'));
      assert.ok(events.some(row => row.event === 'testBegin' && row.title.includes('deliberately interrupted browser')));
      // A fresh Playwright webServer owns the exact same port; stale reuse is off.
      const recovered = await execute('recovered', ['-g', 'completed real browser smoke'], 30000);
      writeFileSync(join(receipt, 'recovered-process.json'), JSON.stringify(recovered, null, 2));
      assert.equal(recovered.exitCode, 0, readFileSync(join(receipt, 'recovered.log'), 'utf8'));
      assert.equal(recovered.cleanup.complete, true, JSON.stringify(recovered.cleanup));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
