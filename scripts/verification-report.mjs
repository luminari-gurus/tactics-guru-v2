import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const digest = value => createHash('sha256').update(value).digest('hex');

export function sourceIdentity(cwd) {
  const git = args => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  // Only verification inputs; never read .env or arbitrary untracked files.
  const paths = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'src', 'public', 'tests', 'scripts',
    '*config*', 'package.json', 'package-lock.json', 'index.html']).split('\0').filter(Boolean))].sort();
  const hashes = Object.fromEntries(paths.map(path => {
    try { return [path, digest(readFileSync(`${cwd}/${path}`))]; }
    catch (error) { if (error.code === 'ENOENT') return [path, null]; throw error; }
  }));
  return { commit: git(['rev-parse', 'HEAD']), dirty: !!git(['status', '--porcelain']),
    inputHash: digest(JSON.stringify(hashes)), hashes };
}

export function summarizePlaywright(report) {
  const tests = [];
  const walk = suites => {
    for (const suite of suites ?? []) {
      for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
        tests.push({ id: spec.id, file: spec.file ?? suite.file, title: spec.title,
          project: test.projectName, outcome: test.status, expectedStatus: test.expectedStatus,
          durationMs: (test.results ?? []).reduce((n, r) => n + (r.duration ?? 0), 0),
          attempts: (test.results ?? []).map(r => ({ status: r.status, durationMs: r.duration,
            retry: r.retry, workerIndex: r.workerIndex, startTime: r.startTime })) });
      }
      walk(suite.suites);
    }
  };
  walk(report.suites);
  if (!report.stats || !Array.isArray(report.suites)) throw Error('Invalid Playwright JSON report');
  const attempts=tests.flatMap(t=>t.attempts).filter(a=>Number.isFinite(Date.parse(a.startTime)));
  const runStart=Date.parse(report.stats.startTime);
  const first=attempts.length?Math.min(...attempts.map(a=>Date.parse(a.startTime))):null;
  const last=attempts.length?Math.max(...attempts.map(a=>Date.parse(a.startTime)+(a.durationMs??0))):null;
  return { kind: 'playwright', counts: { total: tests.length,
    expected: report.stats.expected, unexpected: report.stats.unexpected,
    flaky: report.stats.flaky, skipped: report.stats.skipped,
    retryAttempts: tests.reduce((n,t) => n + t.attempts.filter(a => a.retry > 0).length, 0) },
    runnerDurationMs: report.stats.duration, configuredWorkers: report.config?.workers,
    firstTestDelayMs: first!=null&&Number.isFinite(runStart)?first-runStart:null,
    testExecutionSpanMs: first!=null?last-first:null,
    actualWorkers: report.config?.metadata?.actualWorkers ?? null,
    projects: report.config?.projects?.map(p => ({ name: p.name, retries: p.retries, testDir: p.testDir })),
    globalErrors: report.errors ?? [], tests };
}

export function summarizeVitest(report) {
  if (!Array.isArray(report.testResults) || typeof report.numTotalTests !== 'number') throw Error('Invalid Vitest JSON report');
  const tests = report.testResults.flatMap(file => (file.assertionResults ?? []).map(t => ({
    file: file.name, title: t.fullName ?? t.title, outcome: t.status,
    durationMs: t.duration ?? 0,
  })));
  return { kind: 'vitest', counts: { total: report.numTotalTests, passed: report.numPassedTests,
    failed: report.numFailedTests, pending: report.numPendingTests, todo: report.numTodoTests ?? 0 },
    success: report.success, configuredWorkers: null, retryAttempts: null,
    notes: 'Vitest JSON does not expose resolved worker count or retry attempts; null means unavailable, not zero.',
    tests };
}

export function slowest(tests, limit = 10) {
  const files = new Map();
  for (const t of tests) files.set(t.file, (files.get(t.file) ?? 0) + t.durationMs);
  return { tests: [...tests].sort((a,b) => b.durationMs - a.durationMs).slice(0,limit),
    files: [...files].map(([file,durationMs]) => ({file,durationMs})).sort((a,b) => b.durationMs-a.durationMs).slice(0,limit) };
}

export function compareReports(before, after) {
  if (before.schemaVersion !== 1 || after.schemaVersion !== 1) throw Error('Unsupported report schema');
  const warnings = [];
  for (const key of ['node','platform','arch','cpus','cpuModel','memoryBytes']) {
    if (before.environment[key] !== after.environment[key]) warnings.push(`Environment differs: ${key}`);
  }
  if (JSON.stringify(before.browsers) !== JSON.stringify(after.browsers)) warnings.push('Browser versions or executable settings differ');
  if (before.conditions !== after.conditions) warnings.push('Cache/host conditions differ');
  if (before.source.inputHash !== after.source.inputHash) warnings.push('Source inputs differ; verify intended change and coverage');
  if (before.complete !== true || after.complete !== true) warnings.push('At least one report is incomplete');
  if (before.inputsUnchanged === false || after.inputsUnchanged === false) warnings.push('Inputs changed during a capture; timings are not a stable-source baseline');
  const ids = new Set([...before.stages, ...after.stages].map(s=>s.id));
  const stages = [...ids].map(id => {
    const a = before.stages.find(s=>s.id===id), b = after.stages.find(s=>s.id===id);
    const comparable = a?.status === 'passed' && b?.status === 'passed';
    if (!comparable) warnings.push(`${id}: missing, failed or blocked stage; not a passing speedup`);
    if (JSON.stringify(a?.summary?.counts) !== JSON.stringify(b?.summary?.counts)) warnings.push(`${id}: test counts/results differ`);
    const selection = s => s?.summary?.tests?.map(t=>`${t.project ?? ''}:${t.file}:${t.title}`).sort();
    if (JSON.stringify(selection(a)) !== JSON.stringify(selection(b))) warnings.push(`${id}: test selection differs`);
    if (a?.summary?.configuredWorkers !== b?.summary?.configuredWorkers) warnings.push(`${id}: worker count differs`);
    if (a?.summary?.observedWorkers !== b?.summary?.observedWorkers) warnings.push(`${id}: observed Vitest worker count differs`);
    return { id, beforeStatus: a?.status ?? 'missing', afterStatus: b?.status ?? 'missing',
      beforeMs: a?.wallMs ?? null, afterMs: b?.wallMs ?? null,
      deltaMs: comparable ? b.wallMs-a.wallMs : null,
      percent: comparable && a.wallMs > 0 ? (b.wallMs/a.wallMs-1)*100 : null };
  });
  return { warnings, stages };
}

export function readReport(path) {
  if (!statSync(path).isFile()) throw Error(`Not a report file: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}
