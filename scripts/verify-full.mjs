import { spawnSync } from 'node:child_process';
import { mkdirSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const npm = (id, args, extra = {}) => ({ id, args, ...extra });
const browser = (id, args = [], extra = {}) => npm(id,
  ['exec', '--no', '--', 'playwright', 'test', ...args], { browser: true, ...extra });
const preview = (id, args = [], extra = {}) => browser(id, args, { needs: ['build-root'], ...extra });
// The units include content validation. Reuse that result and both type scopes
// before every ordinary bundle; standalone `npm run build` stays self-validating.
const bundle = (id, args = []) => npm(id, ['run', 'build:bundle', ...args],
  { needs: ['units', 'typecheck'] });

// Sequential: browser processes share a GPU and most suites own port 4173.
// Keep independent suites running after failures; failed builds block only consumers.
export const stages = [
  npm('tooling', ['run', 'test:verification']),
  npm('units', ['run', 'test:unit']),
  npm('typecheck', ['run', 'typecheck']),
  npm('build-integration', ['run', 'test:build']),
  bundle('build-root'),
  preview('chromium', ['-c', 'playwright.regression.config.ts']),
  preview('webkit-acceptance', ['-c', 'playwright.device-acceptance.config.ts']),
  preview('webkit-exploration', ['-c', 'playwright.exploration.config.ts']),
  browser('assets-root-dev', ['-c', 'playwright.regression.config.ts', 'tests/public-asset-base.spec.ts', '--project=desktop'],
    { env: { PLAYWRIGHT_SERVER_MODE: 'dev' } }),
  npm('performance', ['run', 'measure:fit'], { needs: ['build-root'] }),
  bundle('build-prefix', ['--', '--base=/prototype/']),
  browser('assets-prefix-preview', ['-c', 'playwright.prefix-assets.config.ts'],
    { needs: ['build-prefix'], env: { PLAYWRIGHT_BASE_PATH: '/prototype/' } }),
  browser('assets-prefix-dev', ['-c', 'playwright.prefix-assets.config.ts'],
    { env: { PLAYWRIGHT_BASE_PATH: '/prototype/', PLAYWRIGHT_SERVER_MODE: 'dev' } }),
  // Restore even after prefix failures; never leave an accidentally prefixed dist.
  bundle('restore-root'),
];

export function runStages(plan, execute, record = () => {}) {
  const results = [];
  for (const stage of plan) {
    const blockedBy = (stage.needs ?? []).filter(id =>
      results.find(result => result.id === id)?.status !== 'passed');
    let result;
    if (blockedBy.length) result = { id: stage.id, status: 'blocked', blockedBy };
    else {
      const start = Date.now();
      try {
        const execution = execute(stage);
        result = { id: stage.id, ...execution,
          status: execution.exitCode === 0 && !execution.signal && !execution.error ? 'passed' : 'failed',
          durationMs: Date.now() - start };
      } catch (error) {
        result = { id: stage.id, status: 'failed', error: String(error), durationMs: Date.now() - start };
      }
    }
    results.push(result);
    record(results);
  }
  return { results, exitCode: results.every(result => result.status === 'passed') ? 0 : 1 };
}

export function stageEnvironment(stage, directory, inherited = process.env) {
  const env = { ...inherited };
  // Explicit modes and local performance provenance must not inherit a prior invocation.
  for (const key of Object.keys(env)) {
    if (key.startsWith('VITE_POSTHOG_') || key.startsWith('PLAYWRIGHT_JSON_') ||
        ['FIT_URL', 'POSTHOG_SOURCEMAPS', 'PLAYWRIGHT_BASE_PATH', 'PLAYWRIGHT_SERVER_MODE',
          'PLAYWRIGHT_TELEMETRY_DEV'].includes(key)) delete env[key];
  }
  return { ...env, ...stage.env,
    PLAYWRIGHT_JSON_OUTPUT_FILE: join(directory, `${stage.id}.json`) };
}

export function main(args = process.argv.slice(2)) {
  if (args.length && !(args.length === 1 && args[0] === '--list')) {
    throw new Error('Usage: npm run verify:full [-- --list] (filters belong on test:regression)');
  }
  if (args[0] === '--list') { console.log(JSON.stringify(stages, null, 2)); return 0; }
  const directory = resolve('tmp/verification', `full-${new Date().toISOString().replaceAll(':', '-')}-${process.pid}`);
  mkdirSync(directory, { recursive: true });
  const source = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout?.trim();
  console.log(`Verification reports: ${directory}`);
  const result = runStages(stages, stage => {
    const log = join(directory, `${stage.id}.log`);
    const argv = [...stage.args];
    const performanceCapture = join(directory, 'performance.json');
    if (stage.id === 'performance') argv.push('--', performanceCapture);
    if (stage.browser) argv.push('--reporter=line,json', '--output', join(directory, `${stage.id}-artifacts`));
    console.log(`Running ${stage.id}; log: ${log}`);
    const fd = openSync(log, 'w');
    try {
      // npm_execpath avoids a shell (and npm.cmd quoting) on every supported OS.
      const child = spawnSync(process.execPath, [process.env.npm_execpath, ...argv], {
        env: stageEnvironment(stage, directory), stdio: ['ignore', fd, fd],
      });
      const receipt = { exitCode: child.status, signal: child.signal, error: child.error?.message, command: ['npm', ...argv], log };
      if (stage.id !== 'performance' || child.status !== 0) return receipt;

      const evaluationPath = join(directory, 'performance-evaluation.json');
      const evaluation = spawnSync(process.execPath, [
        '--experimental-strip-types', 'scripts/evaluate-fit.ts', performanceCapture, evaluationPath,
      ], { stdio: ['ignore', fd, fd] });
      return { ...receipt, exitCode: evaluation.status, signal: evaluation.signal, error: evaluation.error?.message, evaluationPath };
    } finally { closeSync(fd); }
  }, results => {
    writeFileSync(join(directory, 'summary.json'), JSON.stringify({ source, results }, null, 2) + '\n');
    const latest = results.at(-1);
    console.log(`${latest.id}: ${latest.status}`);
  });
  return result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main();
}
