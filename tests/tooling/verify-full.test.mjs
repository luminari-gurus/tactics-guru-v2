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

test('ordinary bundles reuse one unit/content pass and both type scopes', () => {
  const commands = id => stages.filter(stage => stage.id === id);
  assert.equal(commands('units').length, 1);
  assert.equal(commands('typecheck').length, 1);
  assert.equal(commands('build-integration').length, 1);
  for (const id of ['build-root', 'build-prefix', 'restore-root']) {
    const stage = commands(id)[0];
    assert.deepEqual(stage.args.slice(0, 2), ['run', 'build:bundle']);
    assert.deepEqual(stage.needs, ['units', 'typecheck']);
    for (const prerequisite of stage.needs) {
      assert.ok(stages.indexOf(commands(prerequisite)[0]) < stages.indexOf(stage));
    }
  }
  assert.ok(commands('build-prefix')[0].args.includes('--base=/prototype/'));
  assert.equal(stages.some(stage => stage.args[1] === 'validate:content'), false);
});

test('failed units or types block unchecked bundles while independent coverage continues', () => {
  for (const failed of ['units', 'typecheck']) {
    const visited = [];
    const result = runStages(stages, stage => {
      visited.push(stage.id);
      return { exitCode: stage.id === failed ? 1 : 0 };
    });
    for (const id of ['build-root', 'build-prefix', 'restore-root', 'chromium',
      'webkit-acceptance', 'webkit-exploration', 'health-bars', 'performance', 'assets-prefix-preview']) {
      assert.equal(result.results.find(stage => stage.id === id).status, 'blocked', `${failed}: ${id}`);
      assert.ok(!visited.includes(id));
    }
    for (const id of ['build-integration', 'fixtures', 'placement-dev', 'telemetry-production',
      'telemetry-development', 'assets-root-dev', 'assets-prefix-dev']) assert.ok(visited.includes(id));
    assert.equal(result.exitCode, 1);
  }
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

test('full verification captures the local build despite an inherited remote FIT_URL', async () => {
  const { execFileSync } = await import('node:child_process');
  const inherited = { FIT_URL: 'https://previous-deployment.example/game/' };
  const env = stageEnvironment(stages.find(s => s.id === 'performance'), '/reports', inherited);
  // Use the collector's real parser; the flag also supports Node 22.12's TS loader.
  const parser = new URL('../../scripts/measure-fit-options.ts', import.meta.url).href;
  const parsed = JSON.parse(execFileSync(process.execPath, [
    '--experimental-strip-types', '--input-type=module', '-e',
    `import { parseMeasureArgs } from ${JSON.stringify(parser)};
     console.log(JSON.stringify(JSON.parse(process.argv[1]).map(env =>
       parseMeasureArgs(['/reports/performance.json'], env))));`,
    JSON.stringify([env, inherited]),
  ], { encoding: 'utf8' }));
  assert.deepEqual(parsed[0], {
    output: '/reports/performance.json', url: 'http://127.0.0.1:4174', remote: false, scene: 'proof',
  });
  assert.deepEqual(parsed[1], {
    output: '/reports/performance.json', url: inherited.FIT_URL, remote: true, scene: 'proof',
  });
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
