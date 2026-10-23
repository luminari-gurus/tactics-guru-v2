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
  const capture = (args, env) => {
    if (!allProfiles) return discoverSelection(args, env);
    // A temporary discovery-only config removes project filters. CLI grep flags
    // do not override project-level grepInvert in Playwright. No app/test flag
    // or persistent configuration bypass is introduced.
    const directory = mkdtempSync(join(tmpdir(), 'tactics-selection-control-'));
    try {
      const selected = args.indexOf('-c');
      const config = resolve(root, selected >= 0 ? args[selected + 1] : 'playwright.config.ts');
      const remaining = selected >= 0 ? args.filter((_, i) => i !== selected && i !== selected + 1) : args;
      const control = join(directory, 'control.config.ts');
      writeFileSync(control, `import base from ${JSON.stringify(config)};\nexport default { ...base, testDir: ${JSON.stringify(resolve(root, 'tests'))}, projects: base.projects.map(({ grepInvert, ...project }) => project) };\n`);
      return discoverSelection([...remaining, '-c', control], env);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  };
  const selections = Object.fromEntries(stages.filter(stage => stage.browser).map(stage => [stage.id,
    capture(stage.args.slice(stage.args.indexOf('test') + 1), stage.env)]));
  for (const config of ['playwright.encounters.config.ts', 'playwright.run-items.config.ts', 'playwright.abilities.config.ts', 'playwright.setup-smoke.config.ts']) {
    selections[config] = capture(['-c', config]);
  }
  return { source: sourceIdentity(root), selections };
}

export const canonicalCases = new Map([
  ['assets.spec.ts', [
    'failed canonical asset load gives a controlled visible error',
    'a proof image that downloads but cannot be decoded gives a controlled visible error',
    'a proof asset answered by the HTML shell (missing file on the deploy) gives a controlled visible error',
  ]],
  ['boot.spec.ts', ['', '?scene=proof', '?scene=content-smoke', 'run'].map(route =>
    `missing engine chunk reports a recoverable startup error on ${route || 'battle'}`)],
  ['engine-fit.spec.ts', [
    'shows loading before boot and a controlled error if the engine module cannot load',
    'shell initially displays loading while the engine is delayed',
  ]],
]);
export const layoutCases = [ [390,844], [844,390], [360,640], [915,412], [1280,720] ]
  .map(([width, height]) => `controls stay at least 44 px and reachable at ${width}x${height}`);
const classification = test => canonicalCases.get(test.file)?.includes(test.title) ? '@canonical'
  : test.file === 'layout.spec.ts' && layoutCases.includes(test.title) ? '@fixed-viewport' : null;
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
    assert.deepEqual(candidate.projects.map(p => p.name), original.projects.map(p => p.name), 'Changed projects');
    for (const project of original.projects) {
      const next = candidate.projects.find(p => p.name === project.name);
      assert.deepEqual({ ...next, grepInvert: null }, { ...project, grepInvert: null }, 'Changed effective project configuration');
      const expected = project.name === 'mobile-portrait' ? { source: '@canonical', flags: '' }
        : project.name === 'mobile-landscape' ? { source: '@canonical|@fixed-viewport', flags: '' } : project.grepInvert;
      assert.deepEqual(next.grepInvert, expected, 'Unexpected selection filter');
    }
    const old = unique(original.tests), remaining = unique(candidate.tests);
    for (const test of original.tests) {
      const tag = classification(test);
      const reduced = stage === 'chromium' && (tag === '@canonical' && test.project.startsWith('mobile-')
        || tag === '@fixed-viewport' && test.project === 'mobile-landscape');
      const retained = remaining.get(identity(test));
      if (!reduced) {
        assert.ok(retained, `Unmapped omission: ${stage} ${test.project} ${test.title}`);
        const expectedTags = tag ? [...new Set([...test.tags, tag])] : test.tags;
        assert.deepEqual(retained, { ...test, tags: expectedTags }, 'Changed retained ID, assertions metadata or classification');
        continue;
      }
      assert.ok(!retained, 'Approved reduction still selected');
      const targetProject = tag === '@canonical' ? 'desktop' : 'mobile-portrait';
      const target = candidate.tests.find(row => row.project === targetProject && row.file === test.file
        && JSON.stringify(row.titlePath) === JSON.stringify(test.titlePath));
      assert.ok(target, 'Missing retained coverage counterpart');
      let effectiveUse;
      if (tag === '@fixed-viewport') {
        const use = name => original.projects.find(p => p.name === name).use;
        const viewport = test.title.match(/(\d+)x(\d+)$/);
        const effective = name => ({ ...use(name), viewport: { width: Number(viewport[1]), height: Number(viewport[2]) } });
        assert.deepEqual(effective(test.project), effective(targetProject), 'Non-equivalent fixed viewport devices');
        effectiveUse = effective(targetProject);
      }
      mappings.push({ stage, removed: test, retained: target, classification: tag,
        reason: tag === '@canonical' ? 'Resource failure/delay assertions have no touch, density, orientation or backend-specific behavior; exhaustive desktop coverage retained'
          : 'Identical Pixel configuration and explicit viewport set before navigation', ...(effectiveUse ? { effectiveUse } : {}) });
    }
    for (const key of remaining.keys()) assert.ok(old.has(key), 'Unexpected extra selected ID');
  }
  assert.equal(mappings.length, 23, 'Unexpected reduction count');
  return { beforeCount: before.selections.chromium.tests.length, afterCount: after.selections.chromium.tests.length, mappings };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const [command, first, second, output] = process.argv.slice(2);
  if (command === 'capture' && first) writeFileSync(first, json(captureSelections()));
  else if (command === 'compare' && first && second && output) writeFileSync(output, json(compareSelections(JSON.parse(readFileSync(first)), JSON.parse(readFileSync(second)))));
  else throw Error('Usage: verification-selection.mjs capture <output.json> | compare <before.json> <after.json> <output.json>');
}
