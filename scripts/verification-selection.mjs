import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stages, stageEnvironment } from './verify-full.mjs';
import { sourceIdentity } from './verification-report.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const reporter = fileURLToPath(import.meta.url);
const json = value => JSON.stringify(value, (_, entry) => entry instanceof RegExp ? { source: entry.source, flags: entry.flags } : entry, 2) + '\n';
export const desktopOnlyStages = new Set([
  'telemetry-production', 'telemetry-development', 'assets-root-dev',
]);
export const prefixTouchStages = new Set(['assets-prefix-preview', 'assets-prefix-dev']);
function withoutProjectFilters(args) {
  const remaining = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project') { i++; continue; }
    if (args[i].startsWith('--project=')) continue;
    remaining.push(args[i]);
  }
  return remaining;
}

// List-only reporter retains effective device settings that Playwright's JSON
// reporter omits. No server or browser is started by discovery.
export default class SelectionReporter {
  onBegin(config, suite) {
    process.stdout.write(json({ workers: config.workers,
      projects: config.projects.map(project => ({ name: project.name, use: project.use,
        retries: project.retries, repeatEach: project.repeatEach,
        grep: project.grep, grepInvert: project.grepInvert })),
      tests: suite.allTests().map(test => ({ id: test.id, project: test.parent.project().name,
        file: relative(config.rootDir, test.location.file), title: test.title,
        titlePath: test.titlePath().slice(2), tags: test.tags, timeout: test.timeout,
        expectedStatus: test.expectedStatus })) }));
  }
}

export function discoverSelection(args = [], env = {}, cwd = root) {
  const result = spawnSync(process.execPath, [resolve(root, 'node_modules/playwright/cli.js'), 'test', ...args,
    '--list', '--reporter=' + reporter], { cwd, env: stageEnvironment({ env }, resolve(root, 'tmp/selection-discovery')),
    encoding: 'utf8', timeout: 60000, maxBuffer: 20 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.error?.message || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.ok(report.tests.length, 'Empty selection');
  assert.equal(report.workers, 1);
  for (const project of report.projects) { assert.equal(project.retries, 0); assert.equal(project.repeatEach, 1); }
  return report;
}

export function captureSelections({ allProfiles = false } = {}) {
  const capture = (args, env, { defaultMatrix = false } = {}) => {
    if (!allProfiles) return discoverSelection(args, env);
    // A temporary discovery-only config removes project-level grep/grepInvert.
    // CLI --project filters are also stripped so desktop-only stages keep a full
    // Chromium control. Prefix-touch stages compare against the default
    // three-profile matrix scoped to public-asset-base.spec.ts, because the
    // prefix config has already dropped mobile-landscape. CLI grep flags do
    // not override project-level grepInvert in Playwright. No app/test flag or
    // persistent configuration bypass is introduced.
    const directory = mkdtempSync(join(tmpdir(), 'tactics-selection-control-'));
    try {
      const selected = args.indexOf('-c');
      const config = resolve(root, defaultMatrix || selected < 0 ? 'playwright.regression.config.ts'
        : args[selected + 1]);
      const remaining = selected >= 0 ? args.filter((_, i) => i !== selected && i !== selected + 1) : args;
      const files = defaultMatrix ? ['tests/public-asset-base.spec.ts'] : withoutProjectFilters(remaining);
      const control = join(directory, 'control.config.ts');
      writeFileSync(control, `import base from ${JSON.stringify(config)};
export default { ...base, testDir: ${JSON.stringify(resolve(root, 'tests'))},
  projects: base.projects.map(({ grepInvert, grep, ...project }) => project) };
`);
      return discoverSelection([...files, '-c', control], env);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  };
  const selections = Object.fromEntries(stages.filter(stage => stage.browser).map(stage => [stage.id,
    capture(stage.args.slice(stage.args.indexOf('test') + 1), stage.env,
      { defaultMatrix: prefixTouchStages.has(stage.id) })]));
  const setup = 'playwright.setup-smoke.config.ts';
  selections[setup] = capture(['-c', setup]);
  return { source: sourceIdentity(root), selections };
}

const identity = test => JSON.stringify([test.project, test.id]);
function unique(tests) {
  const map = new Map(tests.map(test => [identity(test), test]));
  assert.equal(map.size, tests.length, 'Duplicate selected IDs');
  return map;
}

export function compareSelections(before, after) {
  assert.deepEqual(Object.keys(after.selections).sort(), Object.keys(before.selections).sort(), 'Changed suite inventory');
  const mappings = [];
  for (const [stage, original] of Object.entries(before.selections)) {
    const candidate = after.selections[stage];
    assert.equal(candidate.workers, original.workers, 'Changed worker policy');
    const desktopOnly = desktopOnlyStages.has(stage);
    const prefixTouch = prefixTouchStages.has(stage);
    if (desktopOnly) {
      assert.ok(candidate.tests.every(test => test.project === 'desktop'), 'Desktop-only stage selected a non-desktop project');
      assert.deepEqual([...new Set(original.projects.map(project => project.name))].sort(),
        ['desktop', 'mobile-landscape', 'mobile-portrait'], 'Desktop-only control lost a Chromium profile');
    } else if (prefixTouch) {
      assert.deepEqual([...new Set(original.projects.map(project => project.name))].sort(),
        ['desktop', 'mobile-landscape', 'mobile-portrait'], 'Prefix-touch control lost a Chromium profile');
      assert.deepEqual([...new Set(candidate.projects.map(project => project.name))].sort(),
        ['desktop', 'mobile-portrait'], 'Changed prefix-touch projects');
      assert.ok(candidate.tests.every(test => test.project === 'desktop' || test.project === 'mobile-portrait'),
        'Prefix-touch stage selected an unexpected project');
    } else {
      assert.deepEqual(candidate.projects.map(p => p.name), original.projects.map(p => p.name), 'Changed projects');
    }
    for (const project of original.projects) {
      const next = candidate.projects.find(p => p.name === project.name);
      if (!next) {
        assert.ok(desktopOnly && project.name !== 'desktop'
          || prefixTouch && project.name === 'mobile-landscape', 'Changed projects');
        continue;
      }
      assert.deepEqual({ ...next, grepInvert: null, grep: null }, { ...project, grepInvert: null, grep: null }, 'Changed effective project configuration');
      assert.deepEqual(next.grepInvert, project.grepInvert, 'Unexpected selection filter');
      const expectedGrep = prefixTouch && project.name === 'mobile-portrait' ? { source: '@touch-audio', flags: '' } : project.grep;
      assert.deepEqual(next.grep, expectedGrep, 'Unexpected project grep');
    }
    const old = unique(original.tests), remaining = unique(candidate.tests);
    for (const test of original.tests) {
      const touchAudio = (test.tags ?? []).includes('@touch-audio');
      const desktopReduced = desktopOnly && test.project !== 'desktop';
      const prefixReduced = prefixTouch && (test.project === 'mobile-landscape'
        || test.project === 'mobile-portrait' && !touchAudio);
      const reduced = desktopReduced || prefixReduced;
      const retained = remaining.get(identity(test));
      if (!reduced) {
        assert.ok(retained, `Unmapped omission: ${stage} ${test.project} ${test.title}`);
        assert.deepEqual(retained, test, 'Changed retained ID or test metadata');
        continue;
      }
      assert.ok(!retained, 'Approved reduction still selected');
      const targetProject = prefixReduced && touchAudio ? 'mobile-portrait' : 'desktop';
      const target = candidate.tests.find(row => row.project === targetProject && row.file === test.file
        && JSON.stringify(row.titlePath) === JSON.stringify(test.titlePath));
      assert.ok(target, 'Missing retained coverage counterpart');
      mappings.push({ stage, removed: test, retained: target,
        classification: desktopReduced ? 'desktop-only' : 'prefix-touch',
        reason: desktopReduced
          ? 'The root-dev asset checks and telemetry checks keep a desktop witness'
          : 'Prefixed asset checks keep desktop coverage and touch audio also runs on Pixel portrait' });
    }
    for (const key of remaining.keys()) assert.ok(old.has(key), 'Unexpected extra selected ID');
  }
  return { beforeCount: before.selections.chromium.tests.length, afterCount: after.selections.chromium.tests.length, mappings };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const [command, first, second, output] = process.argv.slice(2);
  if (command === 'capture' && first) writeFileSync(first, json(captureSelections()));
  else if (command === 'compare' && first && second && output) writeFileSync(output, json(compareSelections(JSON.parse(readFileSync(first)), JSON.parse(readFileSync(second)))));
  else throw Error('Usage: verification-selection.mjs capture <output.json> | compare <before.json> <after.json> <output.json>');
}
