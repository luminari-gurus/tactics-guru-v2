import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { discoverSelection } from '../../scripts/verification-selection.mjs';
import { stages, validateReport } from '../../scripts/verify-pr.mjs';

test('PR discovery contains exactly the seven core journeys on their intended devices', () => {
  const report = discoverSelection(['-c', 'playwright.pr.config.ts']);
  const cases = report.tests.map(row => [row.project, row.file, row.title]);
  const dungeon = 'read-only entry, keyboard new dungeon, real action and active resume';
  assert.deepEqual(cases.sort(), [
    ['pr-desktop', 'main-menu.spec.ts', 'main menu: New Game starts immediately when no dungeon save exists'],
    ['pr-desktop', 'boot.spec.ts', 'missing engine chunk reports a recoverable startup error on battle'],
    ['pr-desktop', 'battle-loop.spec.ts', 'complete legal authored battle seed 2 reaches playerWin through controls and replays'],
    ['pr-desktop', 'dungeon.spec.ts', dungeon],
    ['pr-desktop', 'run-progression.spec.ts', 'run battle undo and a legal terminal journey reset on reload'],
    ['pr-touch', 'battle-loop.spec.ts', 'real touch previews a board move, modal backdrop captures it, and suspend resumes exactly once'],
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

test('every shared browser workflow preserves pending checks without concurrent execution', () => {
  const validate = workflow => {
    const concurrency = workflow.replaceAll('\r\n', '\n').split('\nconcurrency:\n')[1]?.split(/\n\S/)[0];
    assert.match(concurrency, /^  group: tactics-browser-/m);
    assert.match(concurrency, /^  queue: max$/m);
    assert.match(concurrency, /^  cancel-in-progress: false$/m);
  };
  for (const file of ['pr-verification.yml', 'browser-setup.yml', 'issue-200-baseline.yml', 'issue-219-process-cleanup.yml']) {
    const source = readFileSync(new URL('../../.github/workflows/' + file, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
    for (const workflow of [source, source.replaceAll('\n', '\r\n')]) {
      validate(workflow);
      assert.throws(() => validate(workflow.replace('queue: max', 'queue: single')));
      assert.throws(() => validate(workflow.replace(/  queue: max\r?\n/, '')));
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

test('ability fixtures retain all three distinct picker states on every Chromium profile', () => {
  for (const config of ['playwright.fixtures.config.ts', 'playwright.abilities.config.ts']) {
    const selection = discoverSelection(['-c', config, 'tests/ability-picker.spec.ts', '-g', 'progression XP ']);
    assert.equal(selection.tests.length, 9);
    assert.deepEqual(selection.projects.map(project => project.name).sort(), ['desktop', 'mobile-landscape', 'mobile-portrait']);
    for (const project of selection.projects) {
      assert.deepEqual(selection.tests.filter(row => row.project === project.name).map(row => row.title).sort(),
        [0, 60, 180].map(xp => `progression XP ${xp} gates learned fixture actions and resets on reload`).sort());
      assert.equal(project.use.defaultBrowserType, 'chromium');
      assert.equal(project.use.hasTouch, project.name !== 'desktop');
    }
  }
});

test('successful process exits cannot hide empty, skipped, failed or flaky coverage', () => {
  const stats = { expected: 7, unexpected: 0, flaky: 0, skipped: 0 };
  validateReport('journeys', { stats });
  for (const key of ['unexpected', 'flaky', 'skipped']) {
    assert.throws(() => validateReport('journeys', { stats: { ...stats, [key]: 1 } }));
  }
  assert.throws(() => validateReport('journeys', { stats: { ...stats, expected: 6 } }));
  for (const id of ['units', 'build-integration']) {
    const report = { numTotalTests: 2, numPassedTests: 2, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0 };
    validateReport(id, report);
    for (const key of ['numFailedTests', 'numPendingTests', 'numTodoTests']) {
      assert.throws(() => validateReport(id, { ...report, [key]: 1 }));
    }
    assert.throws(() => validateReport(id, { ...report, numTotalTests: 0, numPassedTests: 0 }));
  }
});
