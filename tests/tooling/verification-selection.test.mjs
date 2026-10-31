import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureSelections, compareSelections, discoverSelection } from '../../scripts/verification-selection.mjs';
import { createPlan, exactCoverage } from '../../scripts/verification-batches.mjs';

let before, after;
test('real discoveries preserve every retained ID and special mode, with exactly 23 mapped reductions', () => {
  before = captureSelections({ allProfiles: true });
  after = captureSelections();
  const comparison = compareSelections(before, after);
  assert.equal(comparison.beforeCount - comparison.afterCount, 23);
  assert.equal(comparison.mappings.filter(row => row.classification === '@canonical').length, 18);
  assert.equal(comparison.mappings.filter(row => row.effectiveUse?.hasTouch).length, 5);
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
  assert.equal(compared.beforeCount - compared.afterCount, 23);
});

test('real nine-batch discovery partitions the entire reduced default selection', () => {
  const plan = createPlan('capture');
  const expected = plan.canonical.find(stage => stage.id === 'chromium').tests;
  assert.equal(expected.length, after.selections.chromium.tests.length);
  const jobs = plan.jobs.filter(job => job.id.startsWith('chromium-'));
  assert.equal(jobs.length, 9);
  exactCoverage(expected, jobs.flatMap(job => job.stages.flatMap(stage => stage.expected)));
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
