import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { definitions, createPlan, discover, exactCoverage, inventory, verifyBuild, runRows, aggregate, preparationIds, validateBrowserResult, validatePerformanceResult, validateScheduling } from '../../scripts/verification-batches.mjs';
import { digest } from '../../scripts/verification-report.mjs';
import { stages } from '../../scripts/verification-timings.mjs';

const batches = JSON.parse(readFileSync(new URL('../../docs/qa/issue-200/chromium-timeout-investigation.json', import.meta.url))).batchPlan.batches;
const testcase = (id, project = 'desktop') => ({ id, project });
function discovery(stage) {
  if (stage.sourceStage !== 'chromium') return [testcase(stage.sourceStage)];
  const selected = stage.id === 'chromium' ? batches : batches.filter(batch => stage.id === 'chromium-' + batch.id);
  return selected.flatMap(batch => batch.files.map(file => testcase(file, batch.project)));
}
function fixture() {
  const source = { commit: 'abc', inputHash: 'inputs', dirty: false };
  const plan = { schemaVersion: 1, mode: 'capture', scope: 'full', planHash: 'plan', source, environment: {}, browsers: {}, requested: ['first', 'second'],
    jobs: ['first', 'second'].map(id => ({ id, stages: [{ id, browser: true, expected: [testcase(id)] }] })) };
  const result = id => ({ id, status: 'passed', summary: { tests: [testcase(id)], configuredWorkers: 1, projects: [{ retries: 0 }],
    counts: { total: 1, unexpected: 0, flaky: 0, retryAttempts: 0 }, globalErrors: [] },
    caseCheckpoint: { runnerEnded: true, planned: 1, completedCases: 1 } });
  const receipt = id => ({ schemaVersion: 1, batchId: id, planHash: 'plan', source, environment: {}, browsers: {}, runId: 'run', attempt: 1, buildHash: 'build',
    startedAt: '2026-10-22T00:00:00Z', finishedAt: '2026-10-22T00:00:01Z', wallMs: 1000,
    complete: true, inputsUnchanged: true, passed: true, stages: [result(id)] });
  const preparation = { ...receipt('prepare'), stages: preparationIds.map(id => ({ id, status: 'passed' })) };
  return { plan, build: { hash: 'build' }, preparation, receipts: [receipt('first'), receipt('second')] };
}
const summarize = value => aggregate(value.plan, value.build, value.preparation, value.receipts);

test('whole-file batches partition canonical Chromium and preserve every remaining stage', () => {
  const plan = createPlan('capture', discovery);
  const jobStages = plan.jobs.flatMap(job => job.stages);
  assert.equal(plan.jobs.filter(job => job.id.startsWith('chromium-')).length, 9);
  assert.deepEqual([...new Set([...stages.filter(stage => preparationIds.includes(stage.id)), ...jobStages].map(stage => stage.sourceStage))].sort(),
    [...new Set(stages.map(stage => stage.sourceStage))].sort());
  assert.equal(plan.scope, 'full');
  const prefix = plan.jobs.find(job => job.id === 'prefix-assets');
  assert.deepEqual(prefix.stages.map(stage => stage.id), ['build-prefix', 'assets-prefix-preview', 'assets-prefix-dev', 'restore-root']);
  for (const job of plan.jobs.filter(job => !job.id.startsWith('chromium-'))) for (const row of job.stages) {
    assert.deepEqual(row.args, stages.find(stage => stage.id === row.id).args);
    assert.deepEqual(row.env, stages.find(stage => stage.id === row.id).env);
  }
});

test('selection drift, missing and duplicate IDs fail closed', () => {
  assert.throws(() => exactCoverage([testcase('one')], []), /Missing/);
  assert.throws(() => exactCoverage([testcase('one')], [testcase('extra')]), /extra/);
  assert.throws(() => exactCoverage([testcase('one')], [testcase('one'), testcase('one')]), /Duplicate/);
  exactCoverage([testcase('same', 'desktop'), testcase('same', 'portrait')], [testcase('same', 'portrait'), testcase('same', 'desktop')]);
  assert.throws(() => createPlan('capture', stage => stage.id === 'chromium' ? [...discovery(stage), testcase('new-case')] : discovery(stage)), /Missing/);
});

test('targeted runs and pilot cannot claim full coverage; unknown batch filters fail', () => {
  assert.equal(createPlan('capture', discovery, 'telemetry-development').scope, 'partial');
  assert.equal(createPlan('pilot', () => [testcase('pilot')]).scope, 'partial');
  assert.throws(() => createPlan('capture', discovery, 'typo'), /Unknown/);
  assert.throws(() => createPlan('capture', discovery, 'performance,performance'), /duplicate/);
});

test('real Playwright pilot discovery matches full titles in all intended projects', () => {
  const jobs = definitions('pilot');
  const chromium = discover(jobs[0].stages[0]), webkit = discover(jobs[1].stages[0]);
  assert.equal(chromium.length, 3); assert.equal(webkit.length, 1);
  assert.deepEqual(chromium.map(row => row.project).sort(), ['desktop', 'mobile-landscape', 'mobile-portrait']);
  assert.equal(webkit[0].project, 'setup-webkit');
  assert.ok([...chromium, ...webkit].every(row => row.title === 'boots a Phaser scene and fits the viewport after resize'));
});

test('performance acceptance requires complete source-bound samples and successful evaluation', () => {
  const source = { commit: 'source' };
  const row = { performance: { samples: 18, failures: [], measuredBuild: source },
    evaluation: { exitCode: 0 }, evaluationReport: { passed: true, captureFailures: [] } };
  validatePerformanceResult(row, source);
  for (const mutate of [entry => { entry.performance.samples = 17; }, entry => { entry.performance.measuredBuild.commit = 'other'; },
    entry => { delete entry.evaluationReport; }, entry => { entry.evaluation.exitCode = 1; }, entry => { entry.evaluationReport.passed = false; }]) {
    const changed = structuredClone(row); mutate(changed); assert.throws(() => validatePerformanceResult(changed, source));
  }
});

test('artifact validation rejects altered files, missing files, wrong source and wrong plan', () => {
  const directory = mkdtempSync(join(tmpdir(), 'tg-batch-artifact-'));
  try {
    writeFileSync(join(directory, 'index.html'), 'qualified');
    const source = { commit: 'abc', inputHash: 'inputs' };
    const plan = { source }; plan.planHash = digest(JSON.stringify(plan));
    const files = inventory(directory), build = { source, files, planHash: plan.planHash, hash: digest(JSON.stringify(files)) };
    verifyBuild(plan, build, directory, source);
    assert.throws(() => verifyBuild(plan, build, directory, { ...source, commit: 'other' }), /Source/);
    assert.throws(() => verifyBuild(plan, { ...build, planHash: 'other' }, directory, source), /mismatch/);
    assert.throws(() => verifyBuild({ ...plan, injected: true }, build, directory, source), /plan hash/);
    writeFileSync(join(directory, 'index.html'), 'corrupt');
    assert.throws(() => verifyBuild(plan, build, directory, source), /hash mismatch/);
    rmSync(join(directory, 'index.html'));
    assert.throws(() => verifyBuild(plan, build, directory, source), /hash mismatch/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('failed prerequisites block only consumers; prefix failure still restores root', async () => {
  const rows = definitions().find(job => job.id === 'prefix-assets').stages;
  const prerequisites = preparationIds.map(id => ({ id, status: 'passed' }));
  const executed = [];
  const results = await runRows(rows, prerequisites, async row => { executed.push(row.id); return { status: row.id === 'build-prefix' ? 'failed' : 'passed' }; });
  assert.equal(results.find(row => row.id === 'assets-prefix-preview').status, 'blocked');
  assert.deepEqual(executed, ['build-prefix', 'assets-prefix-dev', 'restore-root']);
  const independent = await runRows([{ id: 'preview', needs: ['build-root'] }, { id: 'dev' }], [{ id: 'build-root', status: 'failed' }], async () => ({ status: 'passed' }));
  assert.equal(independent[0].status, 'blocked'); assert.equal(independent[1].status, 'passed');
});

test('interrupt stops later work and checkpoints already recorded failures', async () => {
  const abort = new AbortController(), checkpoints = [];
  const rows = await runRows([{ id: 'first' }, { id: 'next' }], [], async () => { abort.abort(); return { status: 'failed' }; },
    results => checkpoints.push(results.length), abort.signal);
  assert.equal(rows.length, 1); assert.deepEqual(checkpoints, [1]); assert.equal(rows[0].status, 'failed');
});

test('aggregate accepts exact complete receipts and records attempts/compute', () => {
  const result = summarize(fixture());
  assert.equal(result.passed, true); assert.equal(result.baselineEligible, true);
  assert.equal(result.history.length, 3); assert.equal(result.totalJobMs, 3000);
  assert.equal(result.historicalFailures.length, 3);
});

for (const field of ['planHash', 'buildHash', 'runId', 'environment', 'browsers']) test(`aggregate rejects mismatched ${field}`, () => {
  const value = fixture(); value.receipts[0][field] = 'wrong';
  assert.equal(summarize(value).passed, false);
});

test('missing, malformed, unexpected and duplicate-attempt receipts cannot pass', () => {
  const value = fixture(); value.receipts.pop(); assert.equal(summarize(value).passed, false);
  value.receipts[0].stages = []; assert.equal(summarize(value).passed, false);
  value.receipts.push({ ...value.receipts[0], batchId: 'unknown' }); assert.equal(summarize(value).passed, false);
  value.receipts.push(value.receipts[0]); assert.throws(() => summarize(value), /Duplicate attempts/);
});

test('targeted rerun replaces only the selected current outcome and retains earlier failure', () => {
  const value = fixture(); const prior = structuredClone(value.receipts[0]);
  prior.passed = false; prior.stages[0].status = 'failed'; value.receipts[0].attempt = 2;
  value.receipts.push(prior);
  const result = summarize(value);
  assert.equal(result.passed, true); assert.equal(result.history.find(row => row.batchId === 'first' && row.attempt === 1).passed, false);
  assert.equal(result.latest.find(row => row.batchId === 'second').attempt, 1);
  value.receipts[0].passed = false; assert.equal(summarize(value).passed, false);
});

test('a failed setup/upload on a newer Actions attempt cannot reuse an older passing receipt', () => {
  const value = fixture(), summary = summarize(value);
  const scheduler = { jobs: ['prepare', 'first', 'second'].map(id => ({ name: id === 'prepare' ? id : `batch (${id})`, attempt: 1, status: 'completed', conclusion: 'success' })) };
  assert.deepEqual(validateScheduling(value.plan, summary, scheduler), []);
  scheduler.jobs.push({ name: 'batch (first)', attempt: 2, status: 'completed', conclusion: 'failure' });
  assert.equal(validateScheduling(value.plan, summary, scheduler).length, 1);
  scheduler.jobs.at(-1).conclusion = 'success';
  assert.equal(validateScheduling(value.plan, summary, scheduler).length, 1);
  summary.latest.find(receipt => receipt.batchId === 'first').attempt = 2;
  assert.deepEqual(validateScheduling(value.plan, summary, scheduler), []);
  scheduler.jobs.at(-1).status = 'in_progress';
  assert.equal(validateScheduling(value.plan, summary, scheduler).length, 1);
});

test('partial, dirty or budget-failing evidence never qualifies a full baseline', () => {
  const value = fixture(); value.plan.scope = 'partial'; assert.equal(summarize(value).baselineEligible, false);
  value.plan.scope = 'full'; value.plan.source.dirty = true; assert.equal(summarize(value).baselineEligible, false);
  value.plan.source.dirty = false; value.receipts[0].stages[0].status = 'failed';
  value.receipts[0].stages[0].evaluation = { exitCode: 1 }; assert.equal(summarize(value).passed, false);
  assert.equal(summarize(value).complete, true);
});

test('browser acceptance rejects missing final reports, narrowed coverage, skips masquerading as missing tests, retries and changed workers', () => {
  const value = fixture(), stage = value.plan.jobs[0].stages[0], row = value.receipts[0].stages[0];
  validateBrowserResult(stage, row);
  for (const mutate of [entry => { entry.caseCheckpoint.runnerEnded = false; }, entry => { entry.summary.tests = []; },
    entry => { entry.summary.counts.unexpected = 1; }, entry => { entry.summary.counts.flaky = 1; },
    entry => { entry.summary.counts.retryAttempts = 1; }, entry => { entry.summary.configuredWorkers = 2; }]) {
    const changed = structuredClone(row); mutate(changed);
    assert.throws(() => validateBrowserResult(stage, changed));
  }
});

test('workflow stays manual, exclusive, serial, failure-preserving and pinned to the dispatched SHA', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/issue-200-baseline.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:/); assert.doesNotMatch(workflow, /pull_request:|ubuntu-latest|ubuntu-24/);
  assert.match(workflow, /group: tactics-browser-exclusive/); assert.match(workflow, /max-parallel: 1/);
  assert.match(workflow, /fail-fast: false/); assert.match(workflow, /ref: \$\{\{ github.sha \}\}/);
  assert.match(workflow, /65m npm run verify:batches/); assert.doesNotMatch(workflow, /100m/);
  assert.match(workflow, /github.run_attempt/); assert.match(workflow, /name: Serial verification aggregate/);
});
