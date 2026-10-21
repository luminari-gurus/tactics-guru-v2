import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

// An explicit wrapper avoids npm test's implicit posttest suites for focused triage.
const args = process.argv.slice(2);
const diagnostic = args.includes('--diagnostics');
const forwarded = args.filter(arg => arg !== '--diagnostics');
if (forwarded.some(arg => /^--(output|reporter|trace|retries)(=|$)/.test(arg))) {
  console.error('This wrapper owns output/reporter/trace/retries. Use --diagnostics for failure traces, or the Playwright CLI directly.');
  process.exit(2);
}
mkdirSync('verification-receipts/browser-runs', { recursive: true });
const directory = resolve(mkdtempSync('verification-receipts/browser-runs/run-'));
console.log(`Browser receipts: ${directory}`);
const require = createRequire(import.meta.url);
const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', ...forwarded,
  '--output', `${directory}/artifacts`, '--reporter', 'list,json',
  '--trace', diagnostic ? 'retain-on-failure' : 'off', '--retries', '0'], {
  stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: `${directory}/results.json` },
});
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
