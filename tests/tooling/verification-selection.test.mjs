import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { captureSelections, compareSelections } from '../../scripts/verification-selection.mjs';
import { createPlan, exactCoverage } from '../../scripts/verification-batches.mjs';

const before = JSON.parse(gunzipSync(readFileSync(new URL('../../docs/qa/issue-203/selection-before.json.gz', import.meta.url))));
let after;
test('real discoveries preserve every retained ID and special mode, with exactly 23 mapped reductions', () => {
  after = captureSelections();
  const comparison = compareSelections(before, after);
  assert.equal(comparison.beforeCount, 693);
  assert.equal(comparison.afterCount, 670);
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

test('only classification metadata changes the four spec files; assertions and titles are exact-base identical', () => {
  for (const file of ['assets', 'boot', 'engine-fit', 'layout']) {
    const path = `tests/${file}.spec.ts`;
    const original = execFileSync('git', ['show', `958bbd90546e1305aab10e370d5555a1d7c9a43a:${path}`], { encoding: 'utf8' });
    const candidate = readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
      .replace(/, \{ tag: '@(?:canonical|fixed-viewport)' \}, async /g, ', async ');
    assert.equal(candidate, original, path);
  }
});

test('real nine-batch discovery partitions the entire reduced default selection', () => {
  const plan = createPlan('capture');
  const expected = plan.canonical.find(stage => stage.id === 'chromium').tests;
  assert.equal(expected.length, 670);
  const jobs = plan.jobs.filter(job => job.id.startsWith('chromium-'));
  assert.equal(jobs.length, 9);
  exactCoverage(expected, jobs.flatMap(job => job.stages.flatMap(stage => stage.expected)));
});
