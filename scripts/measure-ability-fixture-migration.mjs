// Temporary, bounded qualification harness; removed after retaining the receipts.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { discoverSelection } from './verification-selection.mjs';
import { runCommand } from './verification-timings.mjs';
import { stageEnvironment } from './verify-full.mjs';

const directory = resolve('verification-receipts/ability-fixture-migration');
mkdirSync(directory, { recursive: true });
const path = 'tests/ability-picker.spec.ts';
const base = '19529c5a47f48489e2c9e169af774ac9d37759a5';
const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
const original = readFileSync(path);
const baseline = execFileSync('git', ['show', `${base}:${path}`]);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const json = (name, value) => writeFileSync(join(directory, name), JSON.stringify(value, null, 2) + '\n');
const receipt = { base, source: git(['rev-parse', 'HEAD']), tree: git(['rev-parse', 'HEAD^{tree}']),
  runner: process.env.RUNNER_NAME, node: process.version, lockSha256: sha256(readFileSync('package-lock.json')),
  conditions: 'Sequential same-process baseline then candidate on qualified VM01; persistent caches; host workloads not independently controlled. Baseline replaces only the spec with exact base bytes; all other inputs remain the candidate tree.', results: [] };
json('source.json', receipt);
writeFileSync(join(directory, 'baseline-spec.ts'), baseline);
writeFileSync(join(directory, 'candidate-spec.ts'), original);
let failed = false;
const controller = new AbortController();
const interrupt = () => controller.abort();
process.once('SIGTERM', interrupt);
process.once('SIGINT', interrupt);
try {
  for (const [id, bytes, count] of [['baseline', baseline, 12], ['candidate', original, 9]]) {
    if (controller.signal.aborted) { failed = true; break; }
    writeFileSync(path, bytes);
    const selections = Object.fromEntries(['playwright.fixtures.config.ts', 'playwright.abilities.config.ts'].map(config =>
      [config, discoverSelection(['-c', config])]));
    json(`${id}-selection.json`, selections);
    const args = ['node_modules/playwright/cli.js', 'test', '-c', 'playwright.fixtures.config.ts', path,
      '-g', 'progression XP ', '--reporter=line,json', '--trace=retain-on-failure', '--retries=0', `--output=${join(directory, id + '-artifacts')}`];
    const result = await runCommand(process.execPath, args, { timeoutMs: 5 * 60_000,
      logPath: join(directory, `${id}.log`), signal: controller.signal,
      env: stageEnvironment({ id }, directory) });
    let stats, reportSha256, validationError;
    try {
      const reportBytes = readFileSync(join(directory, `${id}.json`));
      stats = JSON.parse(reportBytes).stats;
      reportSha256 = sha256(reportBytes);
      assert.deepEqual({ expected: stats.expected, unexpected: stats.unexpected, skipped: stats.skipped, flaky: stats.flaky },
        { expected: count, unexpected: 0, skipped: 0, flaky: 0 });
    } catch (error) { validationError = error.message; }
    const passed = result.exitCode === 0 && !result.signal && !result.error && !result.timedOut && !result.interrupted && !validationError;
    receipt.results.push({ id, specSha256: sha256(bytes), args, ...result, stats, reportSha256, validationError, passed });
    failed ||= !passed;
    json('source.json', receipt);
    // A failed cleanup cannot safely be followed by a second browser process.
    if (result.cleanup?.complete === false || controller.signal.aborted) break;
  }
  if (receipt.results.length === 2) {
    const before = JSON.parse(readFileSync(join(directory, 'baseline-selection.json')));
    const after = JSON.parse(readFileSync(join(directory, 'candidate-selection.json')));
    const mappings = [];
    for (const [config, selection] of Object.entries(before)) {
      const next = after[config];
      assert.deepEqual(next.projects, selection.projects);
      assert.equal(next.workers, selection.workers);
      const old = new Map(selection.tests.map(row => [row.id, row]));
      const remaining = new Map(next.tests.map(row => [row.id, row]));
      assert.equal(old.size, selection.tests.length);
      assert.equal(remaining.size, next.tests.length);
      for (const row of next.tests) assert.deepEqual(row, old.get(row.id), 'Retained test metadata changed');
      const removed = selection.tests.filter(row => !remaining.has(row.id));
      assert.equal(removed.length, 3);
      for (const row of removed) {
        assert.equal(row.title, 'progression XP 600 gates learned fixture actions and resets on reload');
        const target = next.tests.find(other => other.project === row.project && other.title === 'progression XP 180 gates learned fixture actions and resets on reload');
        assert.ok(target);
        mappings.push({ config, removed: row, retained: target,
          unit: 'tests/unit/abilityFixtureProgression.test.ts: XP 600 exact level/HP/choices/three missiles/fresh reconstruction',
          ui: 'XP 180 retains full-health DOM, same three picker choices, level inspection, legal cast and actual reload on this profile. XP 0/60 retain the other distinct picker states.' });
      }
    }
    json('coverage-map.json', mappings);
  } else failed = true;
} catch (error) {
  failed = true;
  receipt.error = error.stack;
} finally {
  writeFileSync(path, original);
  process.removeListener('SIGTERM', interrupt);
  process.removeListener('SIGINT', interrupt);
  receipt.restoredSpecSha256 = sha256(readFileSync(path));
  receipt.passed = !failed;
  json('source.json', receipt);
}
process.exitCode = failed ? 1 : 0;
