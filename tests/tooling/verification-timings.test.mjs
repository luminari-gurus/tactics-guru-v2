import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { summarizePlaywright, summarizeVitest, summarizeContent, compareReports, slowest } from '../../scripts/verification-report.mjs';
import { runCommand, selectStages, stages, runTimingStages, stageCommand, enginesFor } from '../../scripts/verification-timings.mjs';
import { stages as fullStages } from '../../scripts/verify-full.mjs';

test('Playwright totals preserve retries, flaky results and unexpected failures',()=>{
  const r=summarizePlaywright({config:{workers:1},stats:{expected:0,unexpected:1,flaky:1,skipped:1,duration:100},
    suites:[{file:'a.spec.ts',specs:[{title:'case',tests:[{projectName:'mobile',status:'flaky',expectedStatus:'passed',results:[
      {status:'failed',duration:20,retry:0},{status:'passed',duration:10,retry:1}]}]}],suites:[]}]});
  assert.equal(r.counts.retryAttempts,1);assert.equal(r.counts.unexpected,1);
  assert.equal(r.tests[0].durationMs,30);assert.equal(r.tests[0].outcome,'flaky');
  assert.equal(slowest(r.tests).files[0].durationMs,30);
});
test('Vitest preserves pending tests and failed report status',()=>{
  const r=summarizeVitest({numTotalTests:2,numPassedTests:0,numFailedTests:1,numPendingTests:1,success:false,
    testResults:[{name:'a.test.ts',assertionResults:[{fullName:'fails',status:'failed',duration:12},{title:'skips',status:'pending'}]}]});
  assert.equal(r.success,false);assert.equal(r.counts.pending,1);assert.equal(r.tests[1].durationMs,0);
  assert.throws(()=>summarizeVitest({}),/Invalid/);assert.throws(()=>summarizePlaywright({}),/Invalid/);
});
test('comparison refuses a passing speedup for a failed or omitted stage',()=>{
  const base={schemaVersion:1,complete:true,environment:{node:'v24'},source:{inputHash:'a'},browsers:{},conditions:'warm',
    stages:[{id:'unit',status:'passed',wallMs:100,summary:{counts:{total:1},tests:[{file:'a',title:'one'}]}}]};
  const next={...base,environment:{node:'v26'},stages:[{id:'unit',status:'failed',wallMs:10}]};
  const result=compareReports(base,next);assert.equal(result.stages[0].percent,null);
  assert.ok(result.warnings.some(w=>w.includes('Environment')));assert.ok(result.warnings.some(w=>w.includes('selection')));
  assert.equal(compareReports(base,{...base,stages:[]}).stages[0].afterStatus,'missing');
});
test('stage selection includes build prerequisites exactly once and rejects typos',()=>{
  assert.deepEqual(selectStages(['chromium','build-root']).map(s=>s.id),['units','typecheck-app','typecheck-domain','build-root','chromium']);
  assert.throws(()=>selectStages(['typo']),/Unknown stage/);
});
test('subprocess exit code, raw log and timeout remain visible',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'tg-timing-'));
  try {
    const fail=await runCommand(process.execPath,['-e','console.error("fixture failure");process.exit(7)'],{logPath:join(dir,'fail.log')});
    assert.equal(fail.exitCode,7);assert.match(readFileSync(join(dir,'fail.log'),'utf8'),/fixture failure/);
    const timeout=await runCommand(process.execPath,['-e','setInterval(()=>{},1000)'],{logPath:join(dir,'timeout.log'),timeoutMs:100});
    assert.equal(timeout.timedOut,true);assert.notEqual(timeout.exitCode,0);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('missing executable produces a failed receipt',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'tg-timing-'));
  try {const r=await runCommand(join(dir,'missing'),[],{logPath:join(dir,'missing.log')});assert.ok(r.error);assert.notEqual(r.exitCode,0);}
  finally {rmSync(dir,{recursive:true,force:true});}
});


test('timed coverage follows every full-verification stage and splits only the two type scopes', () => {
  assert.deepEqual([...new Set(stages.map(s => s.sourceStage))], fullStages.map(s => s.id));
  assert.equal(stages.length, fullStages.length + 1);
  for (const original of fullStages.filter(s => s.id !== 'typecheck')) {
    const measured = stages.find(s => s.id === original.id);
    assert.deepEqual(measured.args, original.args);
    assert.deepEqual(measured.env, original.env);
  }
  assert.equal(stages.filter(s => s.id === 'fixtures').length, 1);
  assert.equal(stages.some(s => s.id === 'content'), false);
  assert.deepEqual(selectStages(['assets-prefix-preview']).map(s => s.id),
    ['units','typecheck-app','typecheck-domain','build-prefix','assets-prefix-preview']);
});

test('async timing scheduler preserves independent coverage and restoration after failures', async () => {
  for (const failed of ['units', 'typecheck-app', 'typecheck-domain', 'build-prefix']) {
    const visited = [], checkpoints = [];
    const results = await runTimingStages(stages, async stage => {
      await Promise.resolve();
      visited.push(stage.id);
      return { status: stage.id === failed ? 'failed' : 'passed', exitCode: stage.id === failed ? 7 : 0 };
    }, rows => checkpoints.push(rows.length));
    assert.equal(results.length, stages.length);
    assert.equal(checkpoints.at(-1), stages.length);
    for (const id of ['build-integration','fixtures','placement-dev','telemetry-production', 'telemetry-development','assets-prefix-dev']) assert.ok(visited.includes(id));
    assert.equal(results.find(s => s.id === 'assets-prefix-preview').status, 'blocked');
    if (failed === 'build-prefix') assert.ok(visited.includes('restore-root'));
    else {
      assert.equal(results.find(s => s.id === 'build-root').status, 'blocked');
      assert.ok(!visited.includes('chromium'));
    }
    assert.equal(results.find(s => s.id === failed).exitCode, 7);
  }
});

test('timed commands preserve selectors and explicit mode isolation from full verification', () => {
  const inherited = { FIT_URL: 'https://old.invalid/', VITE_POSTHOG_ENABLED: 'true',
    PLAYWRIGHT_BASE_PATH: '/old/', PLAYWRIGHT_SERVER_MODE: 'dev', PLAYWRIGHT_TELEMETRY_DEV: 'true',
    PLAYWRIGHT_CHROMIUM_EXECUTABLE: '/chosen/browser', PLAYWRIGHT_JSON_OUTPUT_DIR: '/old' };
  const command = id => stageCommand(stages.find(s => s.id === id), '/receipts', inherited, '/npm-cli.js');
  assert.equal(command('performance').env.FIT_URL, undefined);
  assert.deepEqual(command('performance').args.slice(-2), ['--', '/receipts/performance.json']);
  assert.equal(command('telemetry-production').env.PLAYWRIGHT_TELEMETRY_DEV, undefined);
  assert.equal(command('telemetry-development').env.PLAYWRIGHT_TELEMETRY_DEV, 'true');
  assert.equal(command('assets-prefix-preview').env.PLAYWRIGHT_BASE_PATH, '/prototype/');
  assert.equal(command('assets-prefix-preview').env.PLAYWRIGHT_SERVER_MODE, undefined);
  assert.equal(command('placement-dev').env.PLAYWRIGHT_SERVER_MODE, 'dev');
  assert.equal(command('chromium').env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, '/chosen/browser');
  assert.equal(command('chromium').env.PLAYWRIGHT_JSON_OUTPUT_DIR, undefined);
  assert.ok(command('units').args.includes('--outputFile.json=/receipts/units.json'));
  assert.ok(command('build-integration').args.includes('test:build'));
});

test('preflight accounts for mixed-engine health checks and full Chromium versus headless collection', () => {
  const engines = id => enginesFor(stages.find(s => s.id === id));
  assert.deepEqual(engines('health-bars'), ['chromium-headless', 'webkit']);
  assert.deepEqual(engines('performance'), ['chromium-headless']);
  assert.deepEqual(engines('webkit-exploration'), ['webkit']);
  assert.deepEqual(engines('fixtures'), ['chromium']);
  assert.deepEqual(engines('units'), []);
});

test('historical schema-one reports remain readable but warn about the changed coverage plan', () => {
  const old = { schemaVersion: 1, complete: false, environment: {}, source: {}, browsers: {}, stages: [] };
  const current = { ...old, schemaVersion: 2, scope: 'partial', coveragePlan: [], stages: [] };
  assert.ok(compareReports(old, current).warnings.some(w => /Coverage plan/.test(w)));
  assert.throws(() => compareReports(old, { ...current, schemaVersion: 3 }), /Unsupported/);
});


test('content timing derives the current content command without duplicating execution or inventing wall time', () => {
  const summary = { tests: [
    { file: 'tests/unit/content.test.ts', outcome: 'passed', durationMs: 10 },
    { file: 'tests/unit/dungeonEncounters.test.ts', outcome: 'failed', durationMs: 30 },
    { file: 'tests/unit/unrelated.test.ts', outcome: 'passed', durationMs: 999 },
  ] };
  const content = summarizeContent(summary, 'vitest run tests/unit/content.test.ts tests/unit/dungeonEncounters.test.ts');
  assert.deepEqual(content.counts, { total: 2, passed: 1, failed: 1, pending: 0 });
  assert.equal(content.summedTestDurationMs, 40);
  assert.equal(content.wallMs, null);
});
