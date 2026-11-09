import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureSelections, compareSelections, discoverSelection, desktopOnlyStages, prefixTouchStages } from '../../scripts/verification-selection.mjs';
import { createPlan, exactCoverage } from '../../scripts/verification-batches.mjs';

let before, after;
test('real discoveries preserve every retained ID and special mode, with exactly 24 chromium and the approved desktop-only mappings', () => {
  before = captureSelections({ allProfiles: true });
  after = captureSelections();
  const comparison = compareSelections(before, after);
  assert.equal(comparison.beforeCount - comparison.afterCount, 24);
  assert.equal(comparison.mappings.filter(row => row.classification === '@canonical').length, 18);
  assert.equal(comparison.mappings.filter(row => row.effectiveUse?.hasTouch).length, 6);
  const radial = comparison.mappings.filter(row => row.removed.file === 'battle-radial.spec.ts');
  assert.equal(radial.length, 1);
  assert.equal(radial[0].classification, '@fixed-viewport');
  assert.equal(radial[0].removed.project, 'mobile-landscape');
  assert.equal(radial[0].retained.project, 'mobile-portrait');
  assert.deepEqual(radial[0].effectiveUse.viewport, { width: 1280, height: 720 });
  const desktopOnly = comparison.mappings.filter(row => row.classification === 'desktop-only');
  assert.equal(desktopOnly.filter(row => row.stage.startsWith('telemetry')).length, 56);
  assert.equal(desktopOnly.filter(row => row.stage === 'assets-root-dev').length, 52);
  assert.equal(desktopOnly.length, 108);
  const prefixTouchMappings = comparison.mappings.filter(row => row.classification === 'prefix-touch');
  assert.equal(prefixTouchMappings.filter(row => row.removed.project === 'mobile-landscape').length, 52);
  assert.equal(prefixTouchMappings.filter(row => row.removed.project === 'mobile-portrait').length, 46);
  assert.equal(prefixTouchMappings.length, 98);
  assert.ok(prefixTouchMappings.filter(row => row.removed.project === 'mobile-landscape'
    && (row.removed.tags ?? []).includes('@touch-audio')).every(row => row.retained.project === 'mobile-portrait'));
  assert.ok(prefixTouchMappings.filter(row => !(row.removed.tags ?? []).includes('@touch-audio'))
    .every(row => row.retained.project === 'desktop'));
  for (const stage of desktopOnlyStages) {
    assert.ok(after.selections[stage].tests.every(row => row.project === 'desktop'));
    assert.ok(after.selections[stage].tests.length > 0);
  }
  for (const stage of prefixTouchStages) {
    const tests = after.selections[stage].tests;
    assert.deepEqual([...new Set(before.selections[stage].projects.map(row => row.name))].sort(),
      ['desktop', 'mobile-landscape', 'mobile-portrait']);
    assert.deepEqual([...new Set(tests.map(row => row.project))].sort(), ['desktop', 'mobile-portrait']);
    const portrait = tests.filter(row => row.project === 'mobile-portrait');
    assert.equal(portrait.length, 3);
    assert.ok(portrait.every(row => row.tags.includes('@touch-audio')));
  }
});

test('selection contract rejects missing, extra, duplicate, wrong-profile and device configuration drift', () => {
  assert.ok(after);
  const reject = mutate => { const changed = structuredClone(after); mutate(changed); assert.throws(() => compareSelections(before, changed)); };
  reject(value => value.selections.chromium.tests.pop());
  reject(value => value.selections.chromium.tests.push({ ...value.selections.chromium.tests[0], id: 'unexpected' }));
  reject(value => value.selections.chromium.tests.push(value.selections.chromium.tests[0]));
  reject(value => value.selections['webkit-acceptance'].tests.pop());
  reject(value => value.selections.fixtures.tests.pop());
  reject(value => value.selections['telemetry-development'].tests.pop());
  reject(value => { value.selections.chromium.projects[1].grepInvert = null; });
  reject(value => { value.selections.chromium.projects[2].use.deviceScaleFactor = 1; });
  reject(value => { value.selections.chromium.tests[0].timeout++; });
});

test('new unclassified cases keep all existing profiles without rewriting historical captures', () => {
  const original = structuredClone(before), candidate = structuredClone(after);
  for (const project of original.selections.chromium.projects) {
    const example = original.selections.chromium.tests.find(row => row.project === project.name);
    const added = { ...example, id: 'new-' + project.name, file: 'assets.spec.ts',
      title: 'new unclassified case', titlePath: ['assets.spec.ts', 'new unclassified case'], tags: [] };
    original.selections.chromium.tests.push(added);
    candidate.selections.chromium.tests.push(added);
  }
  const compared = compareSelections(original, candidate);
  assert.equal(compared.beforeCount - compared.afterCount, 24);
});

test('real nine-batch discovery partitions the entire reduced default selection', () => {
  const plan = createPlan('capture');
  const expected = plan.canonical.find(stage => stage.id === 'chromium').tests;
  assert.equal(expected.length, after.selections.chromium.tests.length);
  const jobs = plan.jobs.filter(job => job.id.startsWith('chromium-'));
  assert.equal(jobs.length, 9);
  exactCoverage(expected, jobs.flatMap(job => job.stages.flatMap(stage => stage.expected)));
});


test('health-bars keeps iPhone WebKit; Chromium health coverage stays in the default suite', () => {
  assert.ok(after);
  assert.deepEqual(after.selections['health-bars'].projects.map(project => project.name),
    ['health-iphone-portrait', 'health-iphone-landscape']);
  const titles = [...new Set(after.selections['health-bars'].tests.map(row => row.title))].sort();
  assert.ok(titles.length > 0);
  for (const project of ['desktop', 'mobile-landscape', 'mobile-portrait']) {
    const chromiumTitles = after.selections.chromium.tests
      .filter(row => row.file === 'unit-health-bars.spec.ts' && row.project === project)
      .map(row => row.title).sort();
    assert.deepEqual(chromiumTitles, titles);
  }
  const assets = after.selections.chromium.tests.filter(row => row.file === 'public-asset-base.spec.ts');
  assert.deepEqual([...new Set(assets.map(row => row.project))].sort(),
    ['desktop', 'mobile-landscape', 'mobile-portrait']);
});

test('long progression journeys are excluded from routine selection and remain available on all extended profiles', () => {
  const titles = ['Mage legal progression', 'Ranger legal progression', 'Fighter legal progression'];
  const routine = captureSelections();
  for (const stage of ['chromium', 'webkit-exploration']) {
    assert.equal(routine.selections[stage].tests.filter(row => titles.some(title => row.title.startsWith(title))).length, 0);
  }
  for (const config of ['playwright.extended.config.ts', 'playwright.extended-webkit.config.ts']) {
    const selection = discoverSelection(['-c', config]);
    assert.equal(selection.tests.length, 9);
    for (const project of selection.projects) {
      const cases = selection.tests.filter(row => row.project === project.name);
      assert.equal(cases.length, 3);
      for (const title of titles) assert.equal(cases.filter(row => row.title.startsWith(title)).length, 1);
    }
  }
});
