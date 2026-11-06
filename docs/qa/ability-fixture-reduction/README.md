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

| Removed XP 600 assertion | Retained proof |
| --- | --- |
| Max HP 27, full HP, health ratio 1 | XP 600 unit checks full HP/max HP; XP 0/60/180 still read actual full-health DOM data and ratio on every profile |
| Three choices, Frost Snare and synthetic action present | Exact XP 600 unit choice IDs; XP 180 retains the same three-choice DOM state on every profile |
| Party inspection shows level five | Unit checks level five; each retained browser level opens the real party inspection and checks its displayed level |
| Accepted cast emits three missiles | XP 600 unit prepares/confirms exactly three missiles; retained browser levels exercise real controls and presentation completion for one/two missiles |
| Reload restores initial state and inspection | All three retained XP cases perform actual reload, exact state comparison and renewed inspection on every profile; XP 600 unit covers numeric reconstruction |

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
See [selection mapping](selection.json), [all-mode discovery](all-selections.json)
and [local validation](local-validation.json). All-mode discovery also compares
the unchanged broad Chromium, WebKit, health, telemetry, asset, encounter,
run-item and setup selections exactly. Core discovery remains seven.

## Qualified comparison

[Qualified CI 42142702532](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42142702532)
passed on head `53fc67b`, tested merge `7b6ec831`, clean tree
`de185385db297462782363bbb741e33e7e114f21`. Downloaded raw reports confirm:

| Observation | Count | Browser process wall time |
| --- | ---: | ---: |
| Original loop | 12/12 passed | 124.734s |
| Retained loop | 9/9 passed | 93.500s |

Both ran sequentially on `unraid-tactics-01`, Node 24.22.1, with identical
dependencies and device settings, one worker, zero retries, and no failures,
skips or flaky outcomes. The baseline replaced only the spec with exact base
bytes; all other inputs were the candidate tree. The candidate spec was restored
and its hash verified. Complete discoveries prove that only the three XP 600
executions were removed, with unchanged retained IDs and metadata in both configs.

This is a **25.0% observed reduction for the measured subset**. The fixed-order,
single-host comparison used persistent caches and did not independently control
background work. It is not a whole-regression speedup or cold-cache result.

The same job passed all **1,185 units**, both TypeScript scopes, two real build
integrations and seven core journeys. Ordinary verification took **192.734s**;
the complete job including both extra browser runs, setup and upload took
**7m15s**, plus **2s queued**. The final ordinary-only check is reported on the
PR separately. The temporary harness and workflow changes are now removed.

[Compact receipts](qualified-comparison.json) retain source/spec/lock/report
hashes, all results, cleanup outcome, timings and scheduling/setup overhead.
Raw artifact `13468627761` is retained through November 19 Eastern
(2026-11-20 01:23 UTC). The earlier local filter failure remains documented;
passing qualification does not rewrite that iteration result.

Cold dependency/browser setup measurement remains a separate open increment.
