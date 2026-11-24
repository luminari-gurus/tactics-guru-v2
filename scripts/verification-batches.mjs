import { spawnSync } from 'node:child_process';
import { appendFileSync, closeSync, cpSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { stages, executeTimingStage, browserMetadata, runCommand } from './verification-timings.mjs';
import { stageEnvironment } from './verify-full.mjs';
import { digest, sourceIdentity, summarizePlaywright } from './verification-report.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const invariant = (condition, message) => { if (!condition) throw Error(message); };
export const preparationIds = ['tooling', 'units', 'typecheck-app', 'typecheck-domain', 'build-integration', 'build-root'];
const prefixIds = ['build-prefix', 'assets-prefix-preview', 'assets-prefix-dev', 'restore-root'];
const pilotRunners = { 'pilot-chromium': 'unraid-tactics-01', 'pilot-webkit': 'unraid-tactics-02' };

const pairRunners = { 'chromium-desktop-2': 'unraid-tactics-01', 'webkit-acceptance': 'unraid-tactics-02' };
const isPair = mode => mode === 'parallel-pair' || mode === 'serial-pair';
const isParallel = mode => mode === 'parallel-pilot' || mode === 'parallel-pair';

const key = test => JSON.stringify([test.project, test.id]);

export function exactCoverage(expected, actual) {
  const wanted = expected.map(key), found = actual.map(key);
  invariant(new Set(wanted).size === wanted.length && new Set(found).size === found.length, 'Duplicate test IDs');
  invariant(JSON.stringify(wanted.sort()) === JSON.stringify(found.sort()), 'Missing or extra test IDs');
}

export function definitions(mode = 'capture') {
  if (isPair(mode)) {
    const capture = definitions('capture');
    return Object.keys(pairRunners).map(id => {
      const job = capture.find(candidate => candidate.id === id);
      invariant(job, `Missing matched batch ${id}`);
      return job;
    });
  }
  invariant(['pilot', 'parallel-pilot', 'capture'].includes(mode), 'Expected pilot, parallel-pilot or capture mode');
  const chromium = stages.find(stage => stage.id === 'chromium');
  const webkit = stages.find(stage => stage.id === 'webkit-acceptance');
  if (mode !== 'capture') return [
    { id: 'pilot-chromium', stages: [{ ...chromium, id: 'pilot-chromium', args: [...chromium.args,
      'tests/boot.spec.ts', '-g', 'boots a Phaser scene and fits the viewport after resize$'] }] },
    { id: 'pilot-webkit', stages: [{ ...webkit, id: 'pilot-webkit', args: [...webkit.args,
      '--project=acceptance-webkit-portrait', 'tests/battle-loop.spec.ts', '-g', 'complete legal authored battle seed'] }] },
  ];
  const batches = read(join(root, 'scripts/verification-batches.json'));
  const chromiumJobs = batches.map(batch => ({ id: 'chromium-' + batch.id,
    stages: [{ ...chromium, id: 'chromium-' + batch.id,
      args: [...chromium.args, '--project=' + batch.project, ...batch.files.map(file => file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')] }] }));
  const others = stages.filter(stage => !preparationIds.includes(stage.id) && stage.id !== 'chromium' && !prefixIds.includes(stage.id))
    .map(stage => ({ id: stage.id, stages: [stage] }));
  return [...chromiumJobs.filter(job => job.id.includes('landscape')), ...others,
    ...chromiumJobs.filter(job => !job.id.includes('landscape')), { id: 'prefix-assets', stages: prefixIds.map(id => stages.find(stage => stage.id === id)) }];
}

export function discover(stage, cwd = root) {
  const env = stageEnvironment(stage, join(cwd, 'verification-receipts/serial/discovery'));
  delete env.PLAYWRIGHT_JSON_OUTPUT_FILE;
  const selectors = stage.args.slice(stage.args.indexOf('test') + 1);
  const result = spawnSync(process.execPath, [join(root, 'node_modules/playwright/cli.js'), 'test', ...selectors, '--list', '--reporter=json'],
    { cwd, env, encoding: 'utf8', timeout: 60000, maxBuffer: 20 * 1024 * 1024 });
  invariant(result.status === 0, `Discovery failed for ${stage.id}: ${result.stderr || result.error || result.stdout}`);
  const report = JSON.parse(result.stdout);
  invariant(!report.errors?.length && report.config.workers === 1, 'Discovery errors or changed worker policy');
  invariant(report.config.projects.every(project => project.retries === 0 && project.repeatEach === 1), 'Changed retry/repeat policy');
  const tests = summarizePlaywright(report).tests.map(test => ({ id: test.id, project: test.project, file: test.file, title: test.title }));
  invariant(tests.length > 0 && tests.every(test => test.id && test.project), 'Empty discovery or missing case identity');
  exactCoverage(tests, tests);
  return tests;
}

export function createPlan(mode, discoverCases = discover, filter = '') {
  const jobs = definitions(mode).map(job => ({ ...job, stages: job.stages.map(stage => ({ ...stage,
    expected: stage.browser ? discoverCases(stage) : null })) }));
  const canonical = stages.filter(stage => stage.browser).map(stage => ({ id: stage.id, tests: discoverCases(stage) }));
  if (mode === 'capture') for (const stage of canonical) {
    const selected = jobs.flatMap(job => job.stages.filter(row => row.sourceStage === stage.id).flatMap(row => row.expected ?? []));
    exactCoverage(stage.tests, selected);
  }
  invariant((!isPair(mode) && mode !== 'parallel-pilot') || !filter, 'Parallel pilot requires both browser batches');
  const requested = filter ? filter.split(',') : jobs.map(job => job.id);
  invariant(requested.length === new Set(requested).size && requested.every(id => jobs.some(job => job.id === id)), 'Unknown or duplicate batch selection');
  return { schemaVersion: 1, mode, scope: mode === 'capture' && requested.length === jobs.length ? 'full' : 'partial',
    requested, canonical, jobs, preparationIds, stageIds: stages.map(stage => stage.id) };
}

export function inventory(directory) {
  return readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name)).flatMap(entry => {
    invariant(!entry.isSymbolicLink(), 'Build artifact contains a symbolic link');
    const path = join(directory, entry.name);
    return entry.isDirectory() ? inventory(path).map(file => ({ ...file, path: entry.name + '/' + file.path }))
      : [{ path: entry.name, sha256: digest(readFileSync(path)) }];
  });
}

export function verifyBuild(plan, build, directory, source) {
  invariant(plan.planHash === digest(JSON.stringify({ ...plan, planHash: undefined })), 'Invalid plan hash');
  invariant(source.commit === plan.source.commit && source.inputHash === plan.source.inputHash, 'Source differs from preparation');
  invariant(build.planHash === plan.planHash && build.source.commit === source.commit && build.source.inputHash === source.inputHash, 'Build source/plan mismatch');
  invariant(build.hash === digest(JSON.stringify(build.files)) && build.hash === digest(JSON.stringify(inventory(directory))), 'Build artifact hash mismatch');
}

function environment() {
  const version = name => read(join(root, 'node_modules', name, 'package.json')).version;
  return { node: process.version, platform: process.platform, arch: process.arch, release: os.release(),
    cpuModel: os.cpus()[0]?.model, cpus: os.cpus().length, memoryBytes: os.totalmem(),
    runner: process.env.RUNNER_NAME ?? os.hostname(), versions: Object.fromEntries(['@playwright/test', 'vite', 'vitest', 'typescript'].map(name => [name, version(name)])) };
}

function parallelRunner(plan, report) {
  if (isPair(plan.mode)) return pairRunners[report.batchId];
  return plan.mode === 'parallel-pilot' ? pilotRunners[report.batchId] : undefined;
}

function verifyRuntime(plan, report) {
  const runner = parallelRunner(plan, report);
  if (!runner) {
    invariant(JSON.stringify(report.environment) === JSON.stringify(plan.environment), 'Runner/runtime differs from preparation');
    return;
  }

  // A different VM can have a different kernel, RAM allocation and cache path.
  invariant(report.environment.runner === runner, `Expected the batch to run on ${runner}`);
  for (const field of ['node', 'platform', 'arch', 'versions']) {
    invariant(JSON.stringify(report.environment[field]) === JSON.stringify(plan.environment[field]), `Parallel pilot ${field} differs from preparation`);
  }
}

function verifyBrowsers(plan, report) {
  if (!parallelRunner(plan, report)) {
    invariant(JSON.stringify(report.browsers) === JSON.stringify(plan.browsers), 'Browser environment differs from preparation');
    return;
  }

  invariant(JSON.stringify(Object.keys(report.browsers)) === JSON.stringify(Object.keys(plan.browsers)), 'Parallel pilot browser inventory differs');
  for (const [engine, actual] of Object.entries(report.browsers)) {
    const expected = plan.browsers[engine];
    invariant(actual.version && actual.version === expected.version && actual.channel === expected.channel &&
      !actual.executableOverride && !expected.executableOverride, `Parallel pilot requires matching packaged ${engine} builds`);
  }
}

export async function samplePilotClock(readDate, now = Date.now) {
  const sentAt = now();
  const serverAt = Date.parse(await readDate());
  const receivedAt = now();
  invariant(Number.isFinite(serverAt) && receivedAt >= sentAt, 'Cannot measure pilot clock offset from the Actions API');
  // The server generated its second-resolution Date somewhere inside the request round trip.
  return { sentAt, receivedAt, serverAt,
    minOffsetMs: serverAt - 1000 - receivedAt, maxOffsetMs: serverAt + 1000 - sentAt };
}

function pilotIntervals(report) {
  const { before, after } = report?.clock ?? {};
  if (![before, after].every(sample => sample && Number.isFinite(sample.minOffsetMs) &&
      Number.isFinite(sample.maxOffsetMs) && sample.minOffsetMs <= sample.maxOffsetMs)) return [];
  const minOffset = Math.min(before.minOffsetMs, after.minOffsetMs);
  const maxOffset = Math.max(before.maxOffsetMs, after.maxOffsetMs);
  return report.stages.flatMap(stage => (stage.summary?.tests ?? []).flatMap(test => test.attempts ?? []))
    .flatMap(attempt => {
      const start = Date.parse(attempt.startTime), end = start + attempt.durationMs;
      return attempt.status === 'passed' && Number.isFinite(end) && end > start &&
        start >= before.receivedAt && end <= after.sentAt ? [{ start, end, minOffset, maxOffset }] : [];
    });
}

export function pilotOverlap(receipts, ids = Object.keys(pilotRunners)) {
  const chromium = receipts.find(report => report.batchId === ids[0]);
  const webkit = receipts.find(report => report.batchId === ids[1]);
  if (chromium?.attempt !== webkit?.attempt) return 0;
  const webkitCases = pilotIntervals(webkit);
  return Math.max(0, ...pilotIntervals(chromium).flatMap(left => webkitCases.map(right => Math.min(
    left.end - left.start, right.end - right.start,
    left.end + left.minOffset - (right.start + right.maxOffset),
    right.end + right.minOffset - (left.start + left.maxOffset),
  ))));
}

function receipt(plan, id) {
  return { schemaVersion: 1, batchId: id, planHash: plan.planHash, source: plan.source,
    runId: process.env.GITHUB_RUN_ID ?? 'local', attempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 1),
    startedAt: process.env.SERIAL_JOB_STARTED_AT ?? new Date().toISOString(), executionStartedAt: new Date().toISOString(),
    environment: environment(), loadAverage: os.loadavg(), conditions: process.env.SERIAL_CONDITIONS ?? 'Unverified background load; persistent caches; per-job preflight warms browsers',
    stages: [], complete: false, passed: false };
}

export async function runRows(rows, prerequisites, execute, checkpoint = () => {}, signal) {
  const results = [], known = new Map(prerequisites.map(row => [row.id, row]));
  for (const stage of rows) {
    if (signal?.aborted) break;
    const blockedBy = (stage.needs ?? []).filter(id => known.get(id)?.status !== 'passed');
    let row;
    try { row = blockedBy.length ? { id: stage.id, status: 'blocked', blockedBy } : { id: stage.id, ...await execute(stage) }; }
    catch (error) { row = { id: stage.id, status: 'failed', error: String(error) }; }
    known.set(stage.id, row); results.push(row); checkpoint(results);
  }
  return results;
}

export function validateBrowserResult(stage, row) {
  exactCoverage(stage.expected, row.summary?.tests ?? []);
  invariant(row.summary.configuredWorkers === 1 && row.summary.projects?.every(project => project.retries === 0), 'Worker/retry policy changed');
  invariant(row.summary.counts.total === stage.expected.length && row.summary.counts.unexpected === 0 && row.summary.counts.flaky === 0 && row.summary.counts.retryAttempts === 0 &&
    !row.summary.globalErrors?.length, 'Browser failures/retries or invalid counts');
  invariant(row.caseCheckpoint?.runnerEnded && row.caseCheckpoint.planned === stage.expected.length && row.caseCheckpoint.completedCases === stage.expected.length &&
    !row.checkpointError, 'Missing final checkpoints');
}

export function validatePerformanceResult(row, source) {
  invariant(row.performance?.samples === 18 && row.performance.failures?.length === 0 && row.performance.measuredBuild?.commit === source.commit,
    'Missing/incomplete performance capture or wrong build');
  invariant(row.evaluation?.exitCode === 0 && !row.evaluation.error && !row.evaluation.timedOut && !row.evaluation.interrupted &&
    row.evaluationReport?.passed === true && row.evaluationReport.captureFailures?.length === 0, 'Performance evaluation missing or failed');
}

export function quarantineCleanup(row, abort, toolCache = process.env.RUNNER_TOOL_CACHE) {
  const failures = [row.cleanup, row.evaluation?.cleanup].filter(cleanup => cleanup?.complete === false);
  if (!failures.length) return;
  abort.abort();
  row.status = 'failed';
  row.error = 'Cleanup failed; inspect the runner before clearing RUNNER_TOOL_CACHE/issue208-unsafe-host';
  if (toolCache) {
    try { writeFileSync(join(toolCache, 'issue208-unsafe-host'), JSON.stringify(failures)); }
    catch (error) { row.quarantineError = String(error); }
  }
}

async function execute(stage, out, browsers, signal) {
  const row = await executeTimingStage(stage, out, { browsers, signal, blob: true });
  if (row.cleanup?.complete === false) return row;
  if (stage.browser && row.status === 'passed') {
    try {
      validateBrowserResult(stage, row);
      invariant(existsSync(join(out, stage.id + '-blob.zip')), 'Missing blob report');
    } catch (error) { row.status = 'failed'; row.coverageError = String(error); }
  }
  if (stage.id === 'performance' && row.performance) {
    row.evaluation = await runCommand(process.execPath, ['--experimental-strip-types', join(root, 'scripts/evaluate-fit.ts'),
      join(out, 'performance.json'), join(out, 'performance-evaluation.json')],
    { cwd: root, logPath: join(out, 'performance-evaluation.log'), timeoutMs: 60000, signal });
    if (row.evaluation.exitCode !== 0 || row.evaluation.error || row.evaluation.timedOut || row.evaluation.interrupted) row.status = 'failed';
    try {
      row.evaluationReport = read(join(out, 'performance-evaluation.json'));
      validatePerformanceResult(row, sourceIdentity(root));
    } catch (error) { row.status = 'failed'; row.evaluationError = String(error); }
  }
  return row;
}

function checkHostDisposition() {
  if (process.env.RUNNER_TOOL_CACHE) invariant(!existsSync(join(process.env.RUNNER_TOOL_CACHE, 'issue208-unsafe-host')), 'Runner cleanup requires inspection');
}

export async function awaitPilotRunners(runId, attempt, getArtifacts, {
  now = Date.now, wait = delay, timeoutMs = 240000, ids = Object.keys(pilotRunners),
} = {}) {
  const names = ids.map(id => `issue208-ready-${runId}-${attempt}-${id}`);
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    const timestamps = await Promise.all(names.map(async name => {
      const list = await getArtifacts(name);
      return Date.parse(list.find(artifact => artifact.name === name && !artifact.expired)?.created_at);
    }));
    if (timestamps.every(Number.isFinite)) {
      const release = Math.max(...timestamps) + 10000;
      invariant(Math.max(now(), release) < deadline, 'Parallel pilot readiness arrived too late');
      await wait(Math.max(0, release - now()));
      return new Date(release).toISOString();
    }
    await wait(Math.min(3000, Math.max(0, deadline - now())));
  }
  throw Error('Both parallel pilot runners must publish readiness in the same workflow attempt');
}

async function runReceipt(plan, id, rows, prerequisites, out, buildHash, sampleClock) {
  mkdirSync(out, { recursive: true });
  invariant(!existsSync(join(out, 'receipt.json')), 'Refusing to overwrite receipts');
  const report = { ...receipt(plan, id), buildHash };
  const checkpoint = () => save(join(out, 'receipt.json'), report);
  checkpoint();
  const abort = new AbortController(), stop = () => abort.abort();
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    checkHostDisposition();
    verifyRuntime(plan, report);
    const parallel = isParallel(plan.mode) && Boolean(parallelRunner(plan, report));
    if (parallel) {
      const ready = read(join(out, 'ready.json'));
      invariant(ready.runId === report.runId && ready.attempt === report.attempt && ready.batchId === id &&
        ready.planHash === report.planHash && ready.buildHash === buildHash &&
        JSON.stringify(ready.environment) === JSON.stringify(report.environment), 'Readiness receipt differs from the current batch');
      report.browsers = ready.browsers;
      report.readyAt = ready.readyAt;
      invariant(ready.clock?.before, 'Parallel pilot readiness is missing its clock sample');
      report.clock = { before: ready.clock.before };
    } else {
      report.browsers = await browserMetadata(stages);
    }
    verifyBrowsers(plan, report);
    report.setupMs = Date.parse(report.executionStartedAt) - Date.parse(report.startedAt);
    await runRows(rows, prerequisites, async stage => {
      if (stage.browser && !parallel) exactCoverage(stage.expected, discover(stage));
      const result = await execute(stage, out, report.browsers, abort.signal);
      quarantineCleanup(result, abort);
      return result;
    }, results => { report.stages = results; checkpoint(); }, abort.signal);
    if (parallel && !abort.signal.aborted) report.clock.after = await sampleClock();
    report.inputsUnchanged = sourceIdentity(root).inputHash === plan.source.inputHash;
    report.complete = !abort.signal.aborted && report.stages.length === rows.length && report.stages.every(row => row.status !== 'blocked');
    report.passed = report.complete && report.inputsUnchanged && report.stages.every(row => row.status === 'passed');
  } catch (error) { report.error = String(error); }
  finally {
    process.off('SIGINT', stop); process.off('SIGTERM', stop);
    report.finishedAt = new Date().toISOString();
    report.wallMs = Date.parse(report.finishedAt) - Date.parse(report.startedAt);
    checkpoint();
  }
  return report;
}

export function aggregate(plan, build, preparation, receipts) {
  const errors = [], history = [], latest = [];
  let complete = true;
  const expectedJobs = ['prepare', ...plan.requested];
  for (const id of expectedJobs) {
    const attempts = (id === 'prepare' ? [preparation] : receipts.filter(report => report.batchId === id)).filter(Boolean)
      .sort((left, right) => left.attempt - right.attempt);
    invariant(new Set(attempts.map(report => report.attempt)).size === attempts.length, `Duplicate attempts for ${id}`);
    history.push(...attempts.map(report => ({ batchId: id, attempt: report.attempt, passed: report.passed, stages: report.stages, error: report.error,
      source: report.source, planHash: report.planHash, buildHash: report.buildHash, runId: report.runId })));
    const report = attempts.at(-1);
    if (!report) { errors.push(`${id}: missing receipt`); complete = false; continue; }
    latest.push(report);
    if (report.schemaVersion !== 1 || !Number.isSafeInteger(report.attempt) || report.attempt < 1) { errors.push(`${id}: invalid receipt schema/attempt`); complete = false; }
    if (report.planHash !== plan.planHash || report.source?.inputHash !== plan.source.inputHash || report.source?.commit !== plan.source.commit || report.runId !== preparation.runId ||
        (id !== 'prepare' && report.buildHash !== (build?.hash ?? null))) { errors.push(`${id}: provenance mismatch`); complete = false; }
    try { verifyRuntime(plan, report); verifyBrowsers(plan, report); }
    catch (error) { errors.push(`${id}: ${error.message}`); complete = false; }
    if (!report.complete || !report.inputsUnchanged) { errors.push(`${id}: incomplete/changed inputs`); complete = false; }
    if (!report.passed || report.stages.some(stage => stage.status !== 'passed')) errors.push(`${id}: failed`);
    const expectedStages = id === 'prepare' ? preparationIds : plan.jobs.find(job => job.id === id).stages.map(stage => stage.id);
    if (JSON.stringify(report.stages.map(stage => stage.id)) !== JSON.stringify(expectedStages)) { errors.push(`${id}: stage coverage mismatch`); complete = false; }
    if (id !== 'prepare') for (const stage of plan.jobs.find(job => job.id === id).stages.filter(stage => stage.browser)) {
      const actual = report.stages.find(row => row.id === stage.id);
      try { exactCoverage(stage.expected, actual?.summary?.tests ?? []); }
      catch (error) { errors.push(`${stage.id}: ${error.message}`); complete = false; }
      try { validateBrowserResult(stage, actual ?? {}); }
      catch (error) { errors.push(`${stage.id}: ${error.message}`); }
    }
    for (const row of report.stages.filter(stage => stage.id === 'performance')) {
      try { validatePerformanceResult(row, plan.source); }
      catch (error) { errors.push(`performance: ${error.message}`); }
    }
  }
  const unexpected = receipts.filter(report => !plan.requested.includes(report.batchId));
  if (unexpected.length) { errors.push('Unexpected batch receipts'); complete = false; }
  const overlapMs = isParallel(plan.mode) ? pilotOverlap(latest, plan.requested) : null;
  if (overlapMs === 0) errors.push('Parallel pilot could not establish overlapping passing browser cases within the clock offset bounds');
  const starts = latest.map(report => Date.parse(report.startedAt)), ends = latest.map(report => Date.parse(report.finishedAt));
  return { schemaVersion: 1, source: plan.source, planHash: plan.planHash, scope: plan.scope,
    complete, passed: errors.length === 0,
    baselineEligible: errors.length === 0 && plan.scope === 'full' && !plan.source.dirty,
    errors, history, latest, ...(overlapMs === null ? {} : { overlapMs }), wallMs: latest.length ? Math.max(...ends) - Math.min(...starts) : null,
    totalJobMs: latest.reduce((total, report) => total + report.wallMs, 0),
    totalAttemptMs: [preparation, ...receipts].filter(Boolean).reduce((total, report) => total + report.wallMs, 0),
    historicalFailures: ['Hosted baseline 39700595665 failed/incomplete', 'Self-hosted 39767156870 attempts 1 and 2 failed/incomplete',
      'PR 225 Windows capture: two budget-failing samples; separate host/source, not this baseline'],
    comparison: 'No comparable complete historical baseline; no speedup claim. Serial execution does not establish the <=15-minute target.' };
}

function findReceipts(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? findReceipts(path) : entry.name === 'receipt.json' ? [read(path)] : [];
  });
}

export function validateScheduling(plan, summary, scheduler) {
  const errors = [];
  for (const id of ['prepare', ...plan.requested]) {
    const name = id === 'prepare' ? 'prepare' : `batch (${id})`;
    const latest = scheduler.jobs.filter(job => job.name === name).sort((left, right) => left.attempt - right.attempt).at(-1);
    const report = summary.latest?.find(receipt => receipt.batchId === id);
    const start = Date.parse(latest?.startedAt), end = Date.parse(latest?.completedAt);
    const receiptStart = Date.parse(report?.startedAt), receiptEnd = Date.parse(report?.finishedAt);
    if (!latest || latest.status !== 'completed' || latest.conclusion !== 'success' ||
        ![start, end, receiptStart, receiptEnd].every(Number.isFinite) || receiptStart < start - 1000 || receiptEnd > end + 1000 || receiptEnd < start || receiptEnd < receiptStart) {
      errors.push(`${id}: latest Actions job failed, incomplete or lacks its matching receipt`);
    }
  }
  return errors;
}

export function schedulingCompute(jobs) {
  const executions = new Map();
  for (const job of jobs) if (job.computeMs != null && job.computeMs >= 0) {
    executions.set(JSON.stringify([job.name, job.startedAt, job.completedAt]), job.computeMs);
  }
  return [...executions.values()].reduce((total, duration) => total + duration, 0);
}

export function timingReport(plan, summary) {
  const actual = (summary.latest ?? []).flatMap(receipt => receipt.stages);
  const jobs = plan.jobs.filter(job => plan.requested.includes(job.id));
  const selected = plan.mode !== 'capture' ? [...stages.filter(stage => preparationIds.includes(stage.id)), ...jobs.flatMap(job => job.stages)]
    : stages.filter(stage => preparationIds.includes(stage.id) || jobs.some(job => job.stages.some(row => row.sourceStage === stage.id)));
  const rows = selected.map(stage => {
    const parts = stage.id === 'chromium'
      ? jobs.flatMap(job => job.stages.filter(row => row.sourceStage === 'chromium').map(row => row.id)) : [stage.id];
    const found = parts.map(id => actual.find(row => row.id === id)).filter(Boolean);
    if (found.length === 1 && parts.length === 1 && found[0].id === stage.id) return found[0];
    const row = { id: stage.id, status: found.length !== parts.length ? 'missing' : found.every(part => part.status === 'passed') ? 'passed' : 'failed',
      wallMs: found.reduce((sum, part) => sum + (part.wallMs ?? 0), 0), batches: found };
    if (stage.browser && found.length) {
      const summaries = found.map(part => part.summary).filter(Boolean);
      const names = ['total', 'expected', 'unexpected', 'flaky', 'skipped', 'retryAttempts'];
      row.summary = { kind: 'playwright', configuredWorkers: 1,
        counts: Object.fromEntries(names.map(name => [name, summaries.reduce((sum, item) => sum + (item.counts[name] ?? 0), 0)])),
        tests: summaries.flatMap(item => item.tests), globalErrors: summaries.flatMap(item => item.globalErrors ?? []) };
    }
    return row;
  });
  return { schemaVersion: 2, scope: plan.scope, source: plan.source, environment: plan.environment, browsers: plan.browsers,
    conditions: [...new Set((summary.latest ?? []).map(receipt => receipt.conditions))].join('; '),
    coveragePlan: selected.map(stage => ({ id: stage.id, args: stage.args, env: stage.env ?? {},
      serialBatches: jobs.flatMap(job => job.stages.filter(row => row.sourceStage === stage.id).map(row => ({ id: row.id, args: row.args }))) })),
    complete: summary.complete === true, passed: summary.passed === true && rows.every(row => row.status === 'passed'),
    inputsUnchanged: (summary.latest ?? []).every(receipt => receipt.inputsUnchanged), stages: rows,
    wallMs: summary.wallMs, totalJobMs: summary.totalJobMs, totalAttemptMs: summary.totalAttemptMs,
    notes: 'Stage wall time sums serial invocations, excluding per-job setup/preflight. Compare equivalent serial plans; failed historical runs stay failed.' };
}

async function scheduling() {
  if (!process.env.GITHUB_TOKEN) return null;
  const headers = { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' };
  const api = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const get = async url => { const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) }); invariant(response.ok, `Actions API ${response.status}`); return response.json(); };
  const run = await get(api), jobs = [];
  for (let page = 1; ; page++) {
    const result = await get(`${api}/jobs?filter=all&per_page=100&page=${page}`);
    jobs.push(...result.jobs.map(job => ({ id: job.id, name: job.name, attempt: job.run_attempt,
      status: job.status, conclusion: job.conclusion,
      createdAt: job.created_at, startedAt: job.started_at, completedAt: job.completed_at,
      queueMs: job.started_at && Date.parse(job.started_at) >= Date.parse(job.created_at) ? Date.parse(job.started_at) - Date.parse(job.created_at) : null,
      computeMs: job.completed_at && job.conclusion !== 'skipped' && Date.parse(job.completed_at) >= Date.parse(job.started_at)
        ? Date.parse(job.completed_at) - Date.parse(job.started_at) : null })));
    if (result.jobs.length < 100) break;
  }
  return { createdAt: run.created_at, elapsedMs: Date.now() - Date.parse(run.created_at),
    completedJobComputeMs: schedulingCompute(jobs), jobs,
    note: 'Actions copies successful job snapshots into rerun attempts; execution timestamps identify receipt freshness and deduplicate compute. Creation-to-start includes scheduling/dependencies; unavailable copied-snapshot queue times stay null. Running aggregate job is excluded.' };
}

function pilotClockSampler() {
  const { GITHUB_API_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_TOKEN } = process.env;
  invariant(GITHUB_API_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID && GITHUB_TOKEN, 'Clock sampling requires Actions run identity and read access');
  // The token is only needed for the clock requests, not by the browser subprocesses.
  delete process.env.GITHUB_TOKEN;
  const url = `${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
  return () => samplePilotClock(async () => {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    await response.body?.cancel();
    invariant(response.ok && Number(response.headers.get('age') ?? 0) === 0, 'Cannot sample pilot clock from an unsuccessful or cached Actions API response');
    return response.headers.get('date');
  });
}

export async function main([command, bundleArgument, batchId, outputArgument]) {
  if (command === 'await-pilot') {
    const { GITHUB_API_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT, GITHUB_TOKEN } = process.env;
    invariant(GITHUB_API_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID && GITHUB_RUN_ATTEMPT && GITHUB_TOKEN, 'Parallel pilot requires Actions run identity and artifact read access');
    const release = await awaitPilotRunners(GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT, async name => {
      const url = new URL(`${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/artifacts`);
      url.searchParams.set('name', name);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(10000),
      });
      invariant(response.ok, `Actions artifact listing failed: HTTP ${response.status}`);
      return (await response.json()).artifacts;
    }, { ids: Object.keys(isPair(process.env.SERIAL_MODE) ? pairRunners : pilotRunners) });
    console.log(`Both pilot runners ready. Scheduled browser launch: ${release}`);
    return 0;
  }
  const bundle = resolve(bundleArgument ?? 'verification-receipts/serial/bundle');
  if (command === 'discover' || command === 'prepare') {
    invariant(!existsSync(join(bundle, 'plan.json')) && !existsSync(join(bundle, 'dist')), 'Refusing to overwrite a prior plan/build');
    mkdirSync(bundle, { recursive: true });
    if (command === 'prepare') save(join(bundle, 'preparation-start.json'), { source: sourceIdentity(root), startedAt: new Date().toISOString(), runId: process.env.GITHUB_RUN_ID ?? 'local' });
    const plan = { ...createPlan(process.env.SERIAL_MODE ?? 'capture', discover, process.env.SERIAL_BATCHES ?? ''),
      source: sourceIdentity(root), environment: environment(), browsers: await browserMetadata(command === 'prepare' ? stages : []) };
    plan.planHash = digest(JSON.stringify(plan));
    save(join(bundle, 'plan.json'), plan);
    if (command === 'discover') return 0;
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${JSON.stringify({ include: plan.requested.map(id => ({ id,
      ...(parallelRunner(plan, { batchId: id }) ? { runner: parallelRunner(plan, { batchId: id }).replace('unraid-tactics-', 'tactics-browser-') } : {}) })) })}\n`);
    const report = await runReceipt(plan, 'prepare', stages.filter(stage => preparationIds.includes(stage.id)), [], join(bundle, 'preparation'));
    if (!report.passed) return 1;
    cpSync(join(root, 'dist'), join(bundle, 'dist'), { recursive: true });
    const files = inventory(join(bundle, 'dist'));
    invariant(files.some(file => file.path === 'index.html'), 'Missing built index.html');
    save(join(bundle, 'build.json'), { source: plan.source, planHash: plan.planHash, files, hash: digest(JSON.stringify(files)) });
    return 0;
  }
  let plan;
  try {
    plan = read(join(bundle, 'plan.json'));
    invariant(plan.planHash === digest(JSON.stringify({ ...plan, planHash: undefined })), 'Invalid plan hash');
  } catch (error) {
    if (command !== 'aggregate') throw error;
    const out = resolve(outputArgument); mkdirSync(out, { recursive: true });
    save(join(out, 'summary.json'), { passed: false, complete: false, baselineEligible: false, errors: ['Missing or invalid preparation plan: ' + String(error)] });
    const summary = '# Serial verification failed\n\nMissing or invalid preparation plan. Inspect the preparation artifact and logs.\n';
    writeFileSync(join(out, 'summary.md'), summary);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    return 1;
  }
  if (command === 'run' || command === 'ready') {
    const job = plan.jobs.find(job => job.id === batchId);
    invariant(job && plan.requested.includes(batchId), 'Batch not in requested plan');
    const build = existsSync(join(bundle, 'build.json')) ? read(join(bundle, 'build.json')) : null;
    const source = sourceIdentity(root);
    invariant(plan.planHash === digest(JSON.stringify({ ...plan, planHash: undefined })), 'Invalid plan hash');
    invariant(source.commit === plan.source.commit && source.inputHash === plan.source.inputHash, 'Source differs from preparation');
    if (isPair(plan.mode)) invariant(build, 'Matched batches require a verified production build');
    if (build) verifyBuild(plan, build, join(bundle, 'dist'), source);
    const sampleClock = isParallel(plan.mode) ? pilotClockSampler() : undefined;
    if (command === 'ready') {
      const ready = receipt(plan, batchId);
      invariant(parallelRunner(plan, ready) && build && process.env.GITHUB_RUN_ID, 'Readiness requires a prepared parallel pilot batch in Actions');
      checkHostDisposition();
      verifyRuntime(plan, ready);
      ready.browsers = await browserMetadata(stages);
      verifyBrowsers(plan, ready);
      for (const stage of job.stages) exactCoverage(stage.expected, discover(stage));
      ready.clock = { before: await sampleClock() };
      ready.readyAt = new Date().toISOString();
      const out = resolve(outputArgument);
      mkdirSync(out, { recursive: true });
      save(join(out, 'ready.json'), { ...ready, buildHash: build.hash });
      return 0;
    }
    invariant(!existsSync(join(root, 'dist')), 'Checkout must be clean before restoring the build');
    if (build) cpSync(join(bundle, 'dist'), join(root, 'dist'), { recursive: true });
    const report = await runReceipt(plan, batchId, job.stages, read(join(bundle, 'preparation/receipt.json')).stages,
      resolve(outputArgument), build?.hash ?? null, sampleClock);
    return report.passed ? 0 : 1;
  }
  if (command === 'aggregate') {
    const out = resolve(outputArgument); mkdirSync(out, { recursive: true });
    let result;
    try {
      result = aggregate(plan, existsSync(join(bundle, 'build.json')) ? read(join(bundle, 'build.json')) : null,
        read(join(bundle, 'preparation/receipt.json')), findReceipts(resolve(batchId)));
    } catch (error) { result = { passed: false, complete: false, baselineEligible: false, errors: [String(error)] }; }
    try {
      result.scheduling = await scheduling();
      if (result.scheduling) {
        const errors = validateScheduling(plan, result, result.scheduling);
        if (errors.length) { result.errors.push(...errors); result.passed = false; result.complete = false; result.baselineEligible = false; }
      }
    } catch (error) {
      result.schedulingError = String(error);
      result.errors.push('Could not verify latest Actions attempts');
      result.passed = false; result.complete = false; result.baselineEligible = false;
    }
    save(join(out, 'summary.json'), result);
    save(join(out, 'timing-report.json'), timingReport(plan, result));
    const table = (result.latest ?? []).flatMap(receipt => receipt.stages.map(stage =>
      `| ${receipt.batchId} / ${stage.id} | ${stage.status} | ${((stage.wallMs ?? 0) / 1000).toFixed(2)} | ${JSON.stringify(stage.summary?.counts ?? stage.performance ?? {})} |`));
    const pairIdentity = isPair(plan.mode) ? (result.latest ?? []).filter(report => report.batchId !== 'prepare').map(report => {
      const ids = report.stages.flatMap(row => (row.summary?.tests ?? []).map(key)).sort();
      return `${report.batchId}: ${ids.length} reported case IDs, SHA-256 \`${digest(JSON.stringify(ids))}\`, build \`${report.buildHash}\`.`;
    }).join('\n\n') : '';
    const summary = `# Serial verification\n\nScope: ${plan.scope}; complete: ${result.complete}; passed: ${result.passed}; baseline eligible: ${result.baselineEligible}\n\n` +
      `Job wall span: ${result.wallMs ?? 'unknown'} ms; total job time: ${result.totalJobMs ?? 'unknown'} ms; completed Actions compute: ${result.scheduling?.completedJobComputeMs ?? 'unknown'} ms.\n\n` +
      (result.overlapMs == null ? '' : `Minimum verified overlap between passing browser cases: ${result.overlapMs} ms.\n\n`) +
      (pairIdentity ? pairIdentity + '\n\n' : '') +
      `| Batch / stage | Result | Stage seconds | Counts |\n| --- | --- | ---: | --- |\n${table.join('\n')}\n\n${(result.errors ?? []).map(error => '- ' + error).join('\n')}\n\n${result.comparison ?? ''}\n`;
    writeFileSync(join(out, 'summary.md'), summary);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    return result.passed ? 0 : 1;
  }
  throw Error('Usage: verify:batches discover|prepare <bundle> | ready|run <bundle> <batch> <out> | await-pilot | aggregate <bundle> <receipts> <out>');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const lockDirectory = join(root, 'verification-receipts/timings');
  mkdirSync(lockDirectory, { recursive: true });
  const lock = join(lockDirectory, '.capture.lock');
  const descriptor = openSync(lock, 'wx');
  writeFileSync(descriptor, JSON.stringify({ pid: process.pid, command: process.argv.slice(2) }));
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, error => { console.error(error); process.exitCode = 1; })
    .finally(() => { closeSync(descriptor); unlinkSync(lock); });
}
