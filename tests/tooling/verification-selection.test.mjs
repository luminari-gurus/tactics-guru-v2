import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureSelections, compareSelections, discoverSelection, desktopOnlyStages, prefixTouchStages } from '../../scripts/verification-selection.mjs';
import { createPlan, exactCoverage } from '../../scripts/verification-batches.mjs';

let before, after;
test('real discoveries preserve every retained ID with the approved desktop and prefix mappings', () => {
  before = captureSelections({ allProfiles: true });
  after = captureSelections();
  const comparison = compareSelections(before, after);
  assert.equal(comparison.beforeCount, comparison.afterCount);
  assert.deepEqual([...new Set(after.selections.chromium.tests.map(row => row.file))].sort(), [
    'battle-persistence.spec.ts', 'dungeon-exploration.spec.ts', 'dungeon-lifecycle.spec.ts',
    'dungeon-loot.spec.ts', 'dungeon.spec.ts', 'guarded-effects.spec.ts', 'main-menu.spec.ts',
    'public-asset-base.spec.ts',
  ]);
  assert.ok(after.selections['webkit-acceptance'].tests.every(row => row.file === 'main-menu.spec.ts'));
  const desktopOnly = comparison.mappings.filter(row => row.classification === 'desktop-only');
  assert.equal(desktopOnly.filter(row => row.stage === 'assets-root-dev').length, 6);
  assert.equal(desktopOnly.length, 6);
  const prefixTouchMappings = comparison.mappings.filter(row => row.classification === 'prefix-touch');
  assert.equal(prefixTouchMappings.filter(row => row.removed.project === 'mobile-landscape').length, 6);
  assert.equal(prefixTouchMappings.filter(row => row.removed.project === 'mobile-portrait').length, 2);
  assert.equal(prefixTouchMappings.length, 8);
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
    assert.equal(portrait.length, 2);
    assert.ok(portrait.every(row => row.tags.includes('@touch-audio')));
  }
});

test('each engine splits full-floor touch journeys and checks both pickup modes in every orientation', () => {
  for (const [stage, desktop] of [['chromium', 'desktop'], ['webkit-exploration', 'desktop-webkit']]) {
    const { tests, projects } = after.selections[stage];
    const profilesFor = title => tests.filter(row => row.title === title).map(row => row.project).sort();
    const allProfiles = projects.map(project => project.name).sort();
    assert.deepEqual(profilesFor('saved menu dungeon keeps proof tools hidden across legal encounters'), [desktop]);
    const portrait = allProfiles.find(name => name.includes('portrait'));
    const landscape = allProfiles.find(name => name.includes('landscape'));
    assert.deepEqual(profilesFor('testing dungeon legally clears a floor, descends and backtracks without accessing saves'), [desktop, landscape].sort());
    assert.deepEqual(profilesFor('saved menu dungeon auto-collects loot across a complete first floor'), [desktop, portrait].sort());
    assert.deepEqual(profilesFor('closing on the guardian first holds contact and resumes its battle'),
      [stage === 'chromium' ? desktop : portrait]);
    assert.deepEqual(profilesFor('Guardian-first reward, map and encounter state survive claim and reload at depth 5'),
      [stage === 'chromium' ? desktop : portrait]);
    assert.deepEqual(profilesFor('reload before the pending step restores the ground pile without surprise movement or collection'), [desktop]);
    assert.deepEqual(profilesFor('ground loot: legal victory saves one item at contact and a manual pickup survives refusal and reload'), allProfiles);
    assert.deepEqual(profilesFor('ground loot: entering an occupied pile starts combat and closes inventory'), [stage === 'chromium' ? landscape : desktop]);
    assert.deepEqual(profilesFor('restart during accepted presentation discards old callbacks and history'), [stage === 'chromium' ? desktop : portrait]);
    assert.deepEqual(profilesFor('visibility interruption finishes an accepted terminal presentation exactly once'), [stage === 'chromium' ? desktop : portrait]);
    assert.deepEqual(profilesFor('dungeon previous-format recovery preserves and exports both original slots'), [stage === 'chromium' ? desktop : portrait]);
    assert.deepEqual(profilesFor('auto loot Settings are accessible and persist; off waits at origin and re-enabling does not sweep old loot'), [stage === 'chromium' ? desktop : portrait]);
    assert.deepEqual(profilesFor('fresh manual movement cancels a pending automatic step, including its stale callback'), [stage === 'chromium' ? desktop : portrait]);
    assert.deepEqual(profilesFor('fresh preparation cancels a pending automatic step'), [stage === 'chromium' ? desktop : portrait]);
    assert.deepEqual(profilesFor('auto loot defaults on: one delayed ordinary step, pickup, enemy tick and durable resume'), allProfiles);
  }
});

test('keyboard focus and shortcuts run on desktop while the touch target checks cover every profile', () => {
  for (const [stage, desktop] of [['chromium', 'desktop'], ['webkit-exploration', 'desktop-webkit']]) {
    const { tests, projects } = after.selections[stage];
    const keyboard = tests.filter(row => row.tags.includes('@desktop-keyboard'));
    assert.deepEqual(keyboard.map(row => [row.project, row.title]).sort(), [
      [desktop, 'compass keeps keyboard focus when movement disables the activated direction'],
      [desktop, 'map shortcuts work on entry and outside the map without taking over other controls'],
    ]);
    const touchTargets = tests.filter(row => row.title === 'map-edge direction controls, focus, touch targets and unavailable states');
    assert.deepEqual(touchTargets.map(row => row.project).sort(), projects.map(project => project.name).sort());
  }
});

test('deferred loading keeps each desktop case on one mobile orientation per engine', () => {
  for (const stage of ['chromium', 'webkit-exploration']) {
    const { tests } = after.selections[stage];
    for (const [orientation, count] of [['portrait', 4], ['landscape', 3]]) {
      const tagged = tests.filter(row => row.tags.includes('@mobile-' + orientation));
      const desktop = tagged.filter(row => row.project.includes('desktop')).map(row => row.title).sort();
      const mobile = tagged.filter(row => row.project.includes(orientation)).map(row => row.title).sort();
      assert.equal(desktop.length, count);
      assert.deepEqual(mobile, desktop);
      assert.equal(tagged.length, count * 2);
    }
  }
});

test('selection contract rejects missing, extra, duplicate, wrong-profile and device configuration drift', () => {
  assert.ok(after);
  const reject = mutate => { const changed = structuredClone(after); mutate(changed); assert.throws(() => compareSelections(before, changed)); };
  reject(value => value.selections.chromium.tests.pop());
  reject(value => value.selections.chromium.tests.push({ ...value.selections.chromium.tests[0], id: 'unexpected' }));
  reject(value => value.selections.chromium.tests.push(value.selections.chromium.tests[0]));
  reject(value => value.selections['webkit-acceptance'].tests.pop());
  reject(value => value.selections['webkit-exploration'].tests.pop());
  reject(value => value.selections['assets-root-dev'].tests.pop());
  reject(value => { value.selections.chromium.projects[1].grepInvert = { source: '@unexpected', flags: '' }; });
  reject(value => { value.selections.chromium.projects[2].use.deviceScaleFactor = 1; });
  reject(value => { value.selections.chromium.tests[0].timeout++; });
});

test('new unclassified cases keep all existing profiles without rewriting historical captures', () => {
  const original = structuredClone(before), candidate = structuredClone(after);
  for (const project of original.selections.chromium.projects) {
    const example = original.selections.chromium.tests.find(row => row.project === project.name);
    const added = { ...example, id: 'new-' + project.name, file: 'dungeon.spec.ts',
      title: 'new unclassified case', titlePath: ['dungeon.spec.ts', 'new unclassified case'], tags: [] };
    original.selections.chromium.tests.push(added);
    candidate.selections.chromium.tests.push(added);
  }
  const compared = compareSelections(original, candidate);
  assert.equal(compared.beforeCount, compared.afterCount);
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
  for (const stage of ['chromium', 'webkit-exploration']) {
    assert.equal(after.selections[stage].tests.filter(row => titles.some(title => row.title.startsWith(title))).length, 0);
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
