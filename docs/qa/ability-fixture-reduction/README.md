# Ability-picker fixture permutation reduction

Follow-up to #300 and the under-ten-minute feedback goal. Base:
`19529c5a47f48489e2c9e169af774ac9d37759a5`.

The fixture's XP 0, 60 and 180 cases retain each distinct real picker state:
Magic Missile only; the synthetic level-two action; then Frost Snare. Each
still checks full-health DOM data, exact choices, party level inspection, an
accepted Magic Missile and actual reload/reset on desktop Chromium and both
Pixel orientations. Native picker keyboard/touch, cancellation and narrow-layout
tests elsewhere in this file remain unchanged.

Only the XP 600 permutation is removed (three executions). Its numeric level-five
HP and three-missile outcome are covered by the nine fast boundary cases in
`tests/unit/abilityFixtureProgression.test.ts`. Its three-choice picker state
and browser reload wiring remain witnessed at XP 180 on the same profiles.
Unit reconstruction is not evidence of browser reload; the retained browser
cases continue to perform it.

`tests/tooling/verify-pr.test.mjs` guards all nine retained selections through
both the fixture config and its standalone ability alias, including the intended
Chromium/touch profiles. The existing seven-core-journey guards remain in place.
The ordinary seven-case default and broad Chromium/WebKit matrices do not change.

Local validation passed 27 relevant units, both TypeScript scopes and seven
PR-tooling contracts. Initial iteration of the new discovery guard selected no
tests because Playwright grep includes the full title path; the filter was
corrected before qualification. Exact complete discovery shows that the only
removed IDs in both affected configs are the three XP 600 executions; retained
IDs, metadata, worker/retry policy and devices are unchanged.

## Qualified comparison

Pending: the temporary CI harness runs the original 12 cases and the retained
nine sequentially on qualified VM01 with one worker and zero retries. It swaps
only the spec to exact base bytes for the baseline, keeps all other inputs fixed,
restores the candidate in `finally`, and retains both complete discoveries,
source/spec/lock hashes, browser JSON, failure traces, process cleanup and timings.
Neither a speedup nor readiness is claimed before those results are inspected.
The harness/workflow changes will be removed after retaining compact receipts.

Cold dependency/browser setup measurement remains a separate open increment.
