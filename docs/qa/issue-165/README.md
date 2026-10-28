# Mage Frost Snare acceptance (#165)

Date: 2026-10-28, Asia/Jerusalem. Implementation and policy qualification are
complete. Final review-ready publication is being audited in
[PR #250](https://github.com/luminari-gurus/tactics-guru-v2/pull/250).
See [the handoff plan](../../ongoing-projects/plan.md) and
[OpenSpec tasks](../../../openspec/changes/issue-165-mage-frost-snare/tasks.md).

## Delivered behavior

Arc Bolt is intentionally consolidated into unchanged level-1 Magic Missile.
Frost Snare unlocks for Mage at level 3 (180 XP), costs one action, targets one
living hostile at Manhattan range 2–4 with LOS, and causes no damage, roll or RNG
draw. Both current goblin kinds are susceptible.

Pin and Snare share one bounded source/ability movement block. Reapplication,
including cross-ability casts, rejects atomically without stacking or refresh.
Movement is blocked while legal attacks and Wait remain available. Expiry is the
target's next accepted endTurn or source/target defeat. The existing picker,
preview, inspection, log and floating feedback distinguish Snared by Mage from
Pinned by Ranger; an effect-only cast emits no attack cue with audio enabled/ready.

Battle state/rules/run/dungeon versions are **4/5/6/7**. RNG and the standalone
outer wrapper remain 1. Earlier saves remain byte-preserved/exportable without
migration. Exact-base fixtures are retained in
[tests/fixtures/saves/issue-165](../../../tests/fixtures/saves/issue-165/README.md).

## Complete qualification

The [authoritative ledger](full-run/manifest.json) records one complete original
`npm run verify:full` attempt: **19/19 stages passed, aggregate exit 0**.

- **1,012 unit tests in 55 files**, both TypeScript scopes and both real
  root/prefix build integrations passed. Content validation is included in units.
- **1,289 browser executions passed** across 1,298 configured execution slots;
  **nine expected mode skips** are mapped to passed owning-mode executions.
  There are no failures, flaky results, retries or global browser errors.
- Chromium: **736 passed + 3 dev-only skips**; fixtures: **87/87**; dev placement:
  **3/3**, covering those exact skipped IDs.
- WebKit acceptance: **54/54**; WebKit exploration: **93/93**; health bars: **25/25**.
- Configured production and development telemetry each passed **36/36**.
- Root dev and prefixed dev assets each passed **72 + 3 built-only skips**;
  prefixed preview passed **75/75**. Each skipped nonce-hint case is covered by
  its corresponding built preview, including root preview in Chromium.
- Performance: **18/18** samples passed the actual evaluator with no integrity
  failures, budget violations or load warnings. Root/prefix builds and final
  root restoration passed.

Actual IDs equal discovery in every configured browser stage, with one worker,
zero retries and unchanged effective device settings. Counts describe execution
slots across modes; they do not claim 1,298 distinct test definitions.
The exact-base [selection comparison](selection/manifest.json) preserves every
old ID and metadata entry across 15 stage/legacy/setup selections. Only Mage
cases were added: Chromium 736→739, combined fixtures 81→87, WebKit exploration
90→93 and the legacy ability config 36→42.

The [expanded unit list](full-run/unit-discovery-component.json) retains all
1,012 names/files/locations. Vitest 5's default static list has 523 declarations;
`list --json --no-staticParse --includeTaskLocation` expands the registered cases
without running test bodies. This corrected collection is distinct from the
successful unit execution.

## Source, build and environment identity

Qualified runtime/test source: `4f8c194deb575310866eeb132247197f1062cc5b`.
Before/after verification inputs are identical and the tested tree is clean:
`362b2d28b0ebe0999ac113a2d7ab605083b077e7bfb3c5a8608ca8e468feb420`.

- Qualified and restored root bundle:
  `4fdb85ebf502d5140988bb4be75e1e37671f0b769fc41d7295573d77bd8bf942`.
- Prefixed bundle:
  `ea4f89002e5f3370fbe62dd12ee997fe055fcb9f627994bb1db1a231859da208`.
- Earlier pilot bundle from `85191af`:
  `6a0f9eb48d2afb17943462986a39cc5ef5697fca72f43fd7f0094e89062af68c`.

The ledger retains file inventories, source snapshots, all stage commands/configs,
raw reports/logs, performance data/evaluation, skip-owner mappings and hashes.
`vite.config.ts` embeds the Git commit in `__BUILD_INFO__`; the earlier pilot and
aggregate bundles are therefore distinct and explicitly labeled. Later PR
changes are documentation/evidence only. New documentation commit metadata does
not change the qualified gameplay/test inputs.

Qualification used local WSL Ubuntu, Node **24.15.0**, Playwright **1.63.0**,
Chromium **153.0.8010.12** and WebKit **26.6**. Browser/device testing is Playwright
emulation; no physical device is claimed. The opt-in, guarded
[WSL bind adapter](../issue-164/wsl-vite-bind.cjs) changes only Vite's rejected
4173 loopback bind to wildcard; clients still use 127.0.0.1. No assertion, retry,
worker or engine substitution was introduced. Existing Vite large-chunk and
future native-config-loader warnings remain in the logs.

Raw full-run directory:
`/tmp/tactics-issue-165-20261028/tmp/verification/full-2026-10-28T12-45-31.728Z-2048134/`.
The process has exited successfully. Component indexes retain their original
capture checkpoint wording; `full-run/manifest.json` is authoritative for final
completion and resolved mode skips. Byte-hashed text is compressed to preserve
hashes across checkout line-ending conversion.

## Requirement audit

1. **Arc Bolt adaptation:** [Mage rules](../../signature-abilities.md#mage-progression-165)
   document the consolidation, unlocks, range, damage/count/spread and friendly
   targeting. Content/progression tests prove level-1/2/3 behavior and no Arc Bolt
   unlock; [ability tests](../../../tests/unit/abilities.test.ts) prove the
   approved missile contract.
2. **Shared Snare lifecycle:** domain tests cover both actual goblins, range
   1/2/4/5, LOS, side/class/target/budget failures, pure previews, origin-only
   reachability, in-place attack/Wait, exact target-turn expiry, all source/target
   defeat paths and Pin↔Snare duplicate rejection. Every rejection retains state,
   budgets, replay and RNG. No unsupported immunity content was invented.
3. **Reachable controls and feedback:** the real Mage catalog is exercised at
   XP 0/60/180, with keyboard/pointer/native touch, cancellation, resize,
   inspection and reload. The 87-case fixture stage includes all six new Mage
   Chromium executions. Six passing real-media WebKit picker executions are
   reused under [scoped unchanged-input proof](iteration/webkit-picker-reuse.json.gz):
   Mage case/import bytes and 14 relevant runtime/asset/fixture/helper/lock/config
   paths are unchanged. Only unrelated later synthetic-picker assertions,
   traversal and a unit assertion changed. Diagnostic build metadata is accounted
   for; no gameplay/audio assertion is waived.
4. **Approved Magic Missile:** seeded individual d4 order, automatic hits versus
   ordinary d20 attacks, overkill, all-target preflight/spread, valid near-exhausted
   RNG atomic rejection, level scaling and Mark nonconsumption are proven in the
   existing ability/progression owners. Snare emits no attack/save/missile/damage
   event or RNG draw.
5. **Continuation and real use:** standalone/run/dungeon readers, storage and
   session tests prove active status roundtrip, malformed/forged/locked/dead
   references, exact previous-format recovery, expiry after reload, defeat cleanup
   and fresh encounters. The [six-profile receipt](full-run/mage-journeys.json)
   proves all six production-HUD journeys. Each legally earns Mage level 3/XP 205,
   casts Snare and multiple missiles, reloads active Snare, permits the blocked
   archer to shoot in place and Wait, observes expiry and reaches terminal defeat
   with exact state/event/RNG continuation replay. Screenshots were reviewed.

Every profile has six battles and 412 accepted commands (40/45/48/58/164/57).
All six JSON traces have SHA-256
`caf799524409d582cd3f7a5cec1bf2c37cea83f094f9d98a9e4a43105a366445`.
A reloaded battle records its saved-snapshot continuation; these receipts do not
claim that the original pre-reload command history is persisted. Canonical
initial-boundary replay is separately covered by the domain witness/tests.

## Retained iteration failures and repairs

[Iteration receipts](iteration/manifest.json) remain separate from the clean
original full-regression attempt above. Windows runs without an input manifest
are iteration evidence, not final acceptance.

- Exact-base save capture passed before reader changes; the temporary capture
  test was removed and original fixture bytes retained.
- The first full unit iteration had 1,008 passes and three failures: expected
  catalog identity and Mage choice count changes, plus a 5-second Windows audio
  inventory timeout. The three owning files subsequently passed 58 tests without
  an inventory code/timeout change. The timeout is not attributed to a proven
  base regression. Final Linux units passed all 1,012 cases.
- Seed 190 failed to keep Mage alive to level 3. The final legal seed-17 witness
  reaches XP 205/level 3 without fabricated progression.
- Initial Chromium picker selection had five passes and one cold-navigation
  timeout. That exact case passed a targeted follow-up in 9.8 seconds without
  relaxed assertions/timeouts. Final frozen-source fixtures passed all 87 cases.
- Windows WebKit had three gate passes and three MP3-unavailable precondition
  failures. Supported real-media proof used Linux WebKit, following the
  [established platform evidence](../issue-163/README.md). No audio assertion was
  weakened or codec mocked.
- Windows Chromium initially failed launch at its virtualized cache path; the
  physical cache-path override launched the same pinned browser. Windows used
  Node 24.19.0. Linux qualification used the versions above.
- The first Linux production journey reached level 3 but its BFS test helper
  crossed enabled upstairs at cell 113 while targeting cell 114, causing an
  unintended ascent. The necessary helper repair avoids enabled transit stairs
  unless explicitly requested. It changes test routing, not game movement or
  assertions. The exact repaired desktop journey passed in 4.9 minutes; the final
  full matrix proves all six profiles and the helper's existing consumers.
- The initial Chromium disposable artifact directory was replaced by its
  targeted follow-up; its failure JSON remains retained. Later runs use unique
  artifact directories. Original component failures/skips were never relabeled
  as passes and no blanket retry or full-suite rerun was used.

No merge, deployment, release tag, additional asset or unrelated issue ownership
change is part of this delivery. The remaining step is final PR readiness audit
and publication; review/merge remains with the caller.
