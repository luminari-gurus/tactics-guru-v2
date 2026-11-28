import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { discoverSelection } from '../../scripts/verification-selection.mjs';
import { stages, validateReport } from '../../scripts/verify-pr.mjs';

test('PR discovery contains exactly the five core journeys on their intended devices', () => {
  const report = discoverSelection(['-c', 'playwright.pr.config.ts']);
  const cases = report.tests.map(row => [row.project, row.file, row.title]);
  const dungeon = 'read-only entry, keyboard new dungeon, real action and active resume';
  assert.deepEqual(cases.sort(), [
    ['pr-desktop', 'main-menu.spec.ts', 'main menu: failed gameplay imports retain visible recovery without proof tools'],
    ['pr-desktop', 'dungeon.spec.ts', dungeon],
    ['pr-desktop', 'dungeon.spec.ts', 'fresh dungeon keeps the map and party in view and opens the selected character sheet'],
    ['pr-touch', 'main-menu.spec.ts', 'main menu: records unavailable storage is honest and leaves gameplay navigation usable'],
    ['pr-webkit', 'dungeon.spec.ts', dungeon],
  ].sort());
  assert.equal(report.workers, 1);
  const projects = Object.fromEntries(report.projects.map(project => [project.name, project]));
  assert.equal(projects['pr-touch'].use.hasTouch, true);
  assert.equal(projects['pr-webkit'].use.defaultBrowserType, 'webkit');
  assert.equal(projects['pr-desktop'].use.defaultBrowserType, 'chromium');

});

test('PR validation includes all units, both types and build integrations before bundling', () => {
  assert.deepEqual(stages.map(([id]) => id), ['tooling', 'units', 'typecheck', 'build-integration', 'bundle', 'journeys']);
  assert.ok(stages.find(([id]) => id === 'units')[1].includes('test:unit'));
  assert.ok(stages.find(([id]) => id === 'typecheck')[1].includes('typecheck'));
  assert.ok(stages.find(([id]) => id === 'build-integration')[1].includes('test:build'));
  assert.deepEqual(stages.find(([id]) => id === 'journeys')[1], ['test', '--', '--reporter=line,json']);
});

test('ordinary Playwright discovery and the PR alias have identical bounded selections and devices', () => {
  const ordinary = discoverSelection();
  const explicit = discoverSelection(['-c', 'playwright.pr.config.ts']);
  assert.deepEqual(ordinary, explicit);
});

test('supersession cancels only active stale verification for the same PR', async () => {
  const workflow = readFileSync(new URL('../../.github/workflows/pr-verification.yml', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  const scripts = [...workflow.matchAll(/^          script: \|\n((?:\n| {12}[^\n]*\n)+)/gm)];
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  const cancel = new AsyncFunction('github', 'context', 'core', scripts[0][1]);
  const guard = new AsyncFunction('github', 'context', 'core', scripts[1][1]);
  const repo = { owner: 'owner', repo: 'game' };
  const pr = { id: 12, number: 7, head: { sha: 'current', ref: 'change', repo: { id: 42 } } };
  const context = { repo, payload: { pull_request: pr }, runId: 20 };
  const oldRetry = { id: 10, head_sha: 'old', head_repository: { id: 42 }, pull_requests: [{ id: 12 }], run_attempt: 2 };
  const queuedRun = { ...oldRetry, id: 11, run_attempt: 1 };
  const cancelled = [];
  const output = [];
  const failures = [];
  const core = { setOutput: (...args) => output.push(args), setFailed: message => failures.push(message) };
  let liveHead = 'current';
  const get = async args => {
    assert.deepEqual(args, { ...repo, pull_number: 7 });
    return { data: { state: 'open', head: { sha: liveHead } } };
  };
  const listWorkflowRuns = () => {};
  const github = {
    rest: {
      pulls: { get },
      actions: { listWorkflowRuns, cancelWorkflowRun: async ({ run_id }) => cancelled.push(run_id) },
    },
    paginate: async (method, { status, ...filters }) => {
      assert.equal(method, listWorkflowRuns);
      assert.deepEqual(filters, { ...repo, workflow_id: 'pr-verification.yml',
        event: 'pull_request', branch: 'change', per_page: 100 });
      if (status === 'queued') return [queuedRun];
      if (status === 'pending') return [queuedRun];
      if (status !== 'in_progress') return [];
      return [oldRetry, { ...oldRetry, id: 22, head_sha: 'current' },
        { ...oldRetry, id: 23, pull_requests: [{ id: 13 }] },
        { ...oldRetry, id: 24, head_repository: { id: 43 } }];
    },
  };

  await cancel(github, context, core);
  assert.deepEqual(cancelled, [11, 10]);
  assert.deepEqual(output, [['current', true]]);
  await guard(github, context, core);
  assert.deepEqual(failures, []);

  const originalPaginate = github.paginate;
  github.paginate = async (...args) => {
    liveHead = 'newer';
    return originalPaginate(...args);
  };
  await cancel(github, context, core);
  assert.deepEqual(cancelled, [11, 10]);
  assert.deepEqual(output, [['current', true]]);
  await guard(github, context, core);
  assert.deepEqual(failures, ['This PR commit has been superseded.']);
});

test('shared runner locks preserve pending checks without concurrent execution', () => {
  const workflowLock = /^concurrency:\n((?:  [^\n]*\n)+)/m;
  const jobLock = /^  verify:\n(?:    [^\n]*\n)*?    concurrency:\n((?:      [^\n]*\n)+)/m;
  for (const [file, lock] of [
    ['pr-verification.yml', jobLock],
    ['browser-setup.yml', workflowLock],
    ['issue-200-baseline.yml', workflowLock],
    ['issue-219-process-cleanup.yml', workflowLock],
  ]) {
    const source = readFileSync(new URL('../../.github/workflows/' + file, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
    const validate = workflow => {
      const concurrency = workflow.replaceAll('\r\n', '\n').match(lock)?.[1];
      assert.ok(concurrency, `Missing runner lock in ${file}`);
      assert.match(concurrency, /^ +group: tactics-browser-/m);
      assert.match(concurrency, /^ +queue: max$/m);
      assert.match(concurrency, /^ +cancel-in-progress: false$/m);
      if (file === 'pr-verification.yml') {
        assert.match(concurrency, /^ +group: tactics-browser-tactics-browser-01$/m);
      }
    };
    for (const workflow of [source, source.replaceAll('\n', '\r\n')]) {
      validate(workflow);
      assert.throws(() => validate(workflow.replace('queue: max', 'queue: single')));
      assert.throws(() => validate(workflow.replace(/^ +queue: max\r?\n/m, '')));
      assert.throws(() => validate(workflow.replace('cancel-in-progress: false', 'cancel-in-progress: true')));
    }
  }
});

test('explicit regression matrices retain both UI progression witnesses on every former device', () => {
  for (const config of ['playwright.regression.config.ts', 'playwright.exploration.config.ts']) {
    const selection = discoverSelection(['-c', config, 'tests/dungeon.spec.ts', '-g', 'menu dungeon restores Mage XP']);
    assert.equal(selection.tests.length, 6);
    assert.equal(selection.projects.length, 3);
    for (const project of selection.projects) {
      assert.deepEqual(selection.tests.filter(row => row.project === project.name).map(row => row.title).sort(), [
        'menu dungeon restores Mage XP 0, caster level and exact active boundary',
        'menu dungeon restores Mage XP 180, caster level and exact active boundary',
      ]);
    }
  }
});

test('successful process exits cannot hide empty, skipped, failed or flaky coverage', () => {
  const stats = { expected: 5, unexpected: 0, flaky: 0, skipped: 0 };
  validateReport('journeys', { stats });
  for (const key of ['unexpected', 'flaky', 'skipped']) {
    assert.throws(() => validateReport('journeys', { stats: { ...stats, [key]: 1 } }));
  }
  assert.throws(() => validateReport('journeys', { stats: { ...stats, expected: 4 } }));
  for (const id of ['units', 'build-integration']) {
    const report = { numTotalTests: 2, numPassedTests: 2, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0 };
    validateReport(id, report);
    for (const key of ['numFailedTests', 'numPendingTests', 'numTodoTests']) {
      assert.throws(() => validateReport(id, { ...report, [key]: 1 }));
    }
    assert.throws(() => validateReport(id, { ...report, numTotalTests: 0, numPassedTests: 0 }));
  }
});
