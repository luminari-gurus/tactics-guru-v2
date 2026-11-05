import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stageEnvironment } from './verify-full.mjs';
import { runCommand } from './verification-timings.mjs';

export const stages = [
  ['tooling', ['exec', '--no', '--', 'node', '--test', 'tests/tooling/verify-pr.test.mjs', 'tests/tooling/verify-full.test.mjs']],
  ['units', ['run', 'test:unit', '--', '--reporter=json']],
  ['typecheck', ['run', 'typecheck']],
  ['build-integration', ['run', 'test:build', '--', '--reporter=json']],
  // All unit/content validation and both type scopes have succeeded at this point.
  ['bundle', ['run', 'build:bundle']],
  ['journeys', ['exec', '--no', '--', 'playwright', 'test', '-c', 'playwright.pr.config.ts', '--reporter=line,json']],
];

export function validateReport(id, report) {
  if (id === 'journeys') {
    const stats = report.stats;
    if (stats?.expected !== 7 || stats.unexpected !== 0 || stats.flaky !== 0 || stats.skipped !== 0) {
      throw Error('Expected seven passing core journeys with no failures, retries or skips');
    }
  } else if (id === 'units' || id === 'build-integration') {
    if (!(report.numTotalTests > 0) || report.numPassedTests !== report.numTotalTests ||
        report.numFailedTests !== 0 || report.numPendingTests !== 0 || report.numTodoTests > 0) {
      throw Error(`Incomplete ${id} results`);
    }
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length) throw new Error('Usage: npm run verify:pr (use test:pr for browser filters)');
  const directory = resolve('verification-receipts/pr', `${Date.now()}-${process.pid}`);
  mkdirSync(directory, { recursive: true });
  const git = args => spawnSync('git', args, { encoding: 'utf8' }).stdout?.trim();
  const receipt = { source: git(['rev-parse', 'HEAD']), dirty: git(['status', '--porcelain']),
    node: process.version, startedAt: new Date().toISOString(), budgetMs: 8 * 60_000, results: [] };
  const started = Date.now();
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  process.once('SIGTERM', interrupt);
  process.once('SIGINT', interrupt);
  console.log(`PR receipts: ${directory}`);
  try {
    for (const [id, command] of stages) {
      const remaining = receipt.budgetMs - (Date.now() - started);
      if (remaining <= 0) {
        receipt.results.push({ id, status: 'failed', error: 'PR verification exceeded eight minutes' });
      } else {
        const argv = [...command];
        if (id === 'units' || id === 'build-integration') argv.push(`--outputFile=${join(directory, `${id}.json`)}`);
        if (id === 'journeys') argv.push(`--output=${join(directory, 'artifacts')}`);
        const log = join(directory, `${id}.log`);
        console.log(`Running ${id}; log: ${log}`);
        const child = await runCommand(process.execPath, [process.env.npm_execpath, ...argv], {
          timeoutMs: remaining, logPath: log, signal: controller.signal,
          env: stageEnvironment({ id }, directory),
        });
        if (child.exitCode === 0 && ['units', 'build-integration', 'journeys'].includes(id)) {
          try { validateReport(id, JSON.parse(readFileSync(join(directory, `${id}.json`), 'utf8'))); }
          catch (error) { child.error = error.message; }
        }
        const status = child.exitCode === 0 && !child.signal && !child.error && !child.timedOut && !child.interrupted ? 'passed' : 'failed';
        receipt.results.push({ id, command: ['npm', ...argv], log, durationMs: child.wallMs, status, ...child });
        console.log(`${id}: ${status} (${(child.wallMs / 1000).toFixed(1)}s)`);
        if (status !== 'passed') console.error(readFileSync(log, 'utf8').slice(-12_000));
      }
      receipt.durationMs = Date.now() - started;
      writeFileSync(join(directory, 'summary.json'), JSON.stringify(receipt, null, 2) + '\n');
      // Never bundle after failed validation or run against a stale build.
      if (receipt.results.at(-1).status !== 'passed') return 1;
    }
    console.log(`PR verification passed in ${(receipt.durationMs / 1000).toFixed(1)}s`);
    return 0;
  } finally {
    process.removeListener('SIGTERM', interrupt);
    process.removeListener('SIGINT', interrupt);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
