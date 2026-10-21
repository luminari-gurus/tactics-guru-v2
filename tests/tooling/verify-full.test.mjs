import test from 'node:test';
import assert from 'node:assert/strict';
import { runStages, stages, stageEnvironment, main } from '../../scripts/verify-full.mjs';

test('required failures do not suppress later suites and fail the aggregate', () => {
  const visited = [];
  const result = runStages([{ id: 'main' }, { id: 'fixtures' }], stage => {
    visited.push(stage.id); return { exitCode: stage.id === 'main' ? 1 : 0 };
  });
  assert.deepEqual(visited, ['main', 'fixtures']);
  assert.deepEqual(result.results.map(r => r.status), ['failed', 'passed']);
  assert.equal(result.exitCode, 1);
});

test('failed build blocks stale preview but still runs dev fixtures and restoration', () => {
  const visited = [];
  const result = runStages(stages, stage => {
    visited.push(stage.id); return { exitCode: stage.id.startsWith('build-') ? 1 : 0 };
  });
  for (const id of ['chromium', 'webkit-acceptance', 'webkit-exploration', 'health-bars', 'performance', 'assets-prefix-preview']) {
    assert.equal(result.results.find(r => r.id === id).status, 'blocked');
    assert.ok(!visited.includes(id));
  }
  for (const id of ['fixtures', 'placement-dev', 'telemetry-production', 'telemetry-development', 'assets-prefix-dev', 'restore-root']) assert.ok(visited.includes(id));
  assert.equal(result.exitCode, 1);
});

test('signals, spawn errors and exceptions remain failures; results are checkpointed', () => {
  const snapshots = [];
  const result = runStages([{ id: 'signal' }, { id: 'error' }, { id: 'throw' }, { id: 'ok' }], stage => {
    if (stage.id === 'throw') throw new Error('launch failed');
    return stage.id === 'signal' ? { exitCode: null, signal: 'SIGTERM' }
      : stage.id === 'error' ? { exitCode: null, error: 'ENOENT' } : { exitCode: 0 };
  }, rows => snapshots.push(rows.length));
  assert.deepEqual(result.results.map(r => r.status), ['failed', 'failed', 'failed', 'passed']);
  assert.deepEqual(snapshots, [1, 2, 3, 4]);
  assert.equal(result.exitCode, 1);
});

test('all successful stages pass and fixture selection is combined exactly once', () => {
  assert.equal(runStages(stages, () => ({ exitCode: 0 })).exitCode, 0);
  assert.equal(stages.filter(s => s.id === 'fixtures').length, 1);
  assert.ok(stages.find(s => s.id === 'fixtures').args.includes('playwright.fixtures.config.ts'));
});

test('explicit modes isolate inherited build/report flags but preserve browser selection', () => {
  const env = stageEnvironment(stages.find(s => s.id === 'telemetry-development'), '/reports', {
    PLAYWRIGHT_BASE_PATH: '/wrong/', PLAYWRIGHT_SERVER_MODE: 'dev',
    PLAYWRIGHT_TELEMETRY_DEV: 'false', VITE_POSTHOG_ENABLED: 'true', POSTHOG_SOURCEMAPS: 'true',
    PLAYWRIGHT_JSON_OUTPUT_DIR: '/wrong/', PLAYWRIGHT_CHROMIUM_EXECUTABLE: '/browser',
  });
  assert.equal(env.PLAYWRIGHT_BASE_PATH, undefined);
  assert.equal(env.PLAYWRIGHT_SERVER_MODE, undefined);
  assert.equal(env.VITE_POSTHOG_ENABLED, undefined);
  assert.equal(env.POSTHOG_SOURCEMAPS, undefined);
  assert.equal(env.PLAYWRIGHT_TELEMETRY_DEV, 'true');
  assert.equal(env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, '/browser');
  assert.equal(env.PLAYWRIGHT_JSON_OUTPUT_FILE, '/reports/telemetry-development.json');
  assert.equal(env.PLAYWRIGHT_JSON_OUTPUT_DIR, undefined);
});

test('aggregate refuses filters that could silently narrow required coverage', () => {
  assert.throws(() => main(['--project=desktop']), /filters belong/);
});

test('actual child process exit codes preserve later execution and separate logs', async () => {
  const { spawnSync } = await import('node:child_process');
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'tg-verification-'));
  try {
    const result = runStages([{ id: 'first' }, { id: 'second' }], stage => {
      const child = spawnSync(process.execPath, ['-e',
        `console.log(${JSON.stringify(stage.id)}); process.exit(${stage.id === 'first' ? 7 : 0})`], { encoding: 'utf8' });
      writeFileSync(join(dir, stage.id), child.stdout);
      return { exitCode: child.status, signal: child.signal };
    });
    assert.equal(result.exitCode, 1);
    assert.equal(result.results[0].exitCode, 7);
    assert.equal(readFileSync(join(dir, 'first'), 'utf8'), 'first\n');
    assert.equal(readFileSync(join(dir, 'second'), 'utf8'), 'second\n');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
