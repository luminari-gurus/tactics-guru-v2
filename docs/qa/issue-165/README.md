# Mage Frost Snare acceptance (#165)

Date: 2026-10-28, Asia/Jerusalem. Implementation is in progress; final acceptance
and review-ready publication remain pending. See [the handoff plan](../../ongoing-projects/plan.md)
and [OpenSpec tasks](../../../openspec/changes/issue-165-mage-frost-snare/tasks.md).

## Implemented scope

Arc Bolt is consolidated into unchanged Magic Missile. Frost Snare is the real
Mage level-3 range-2–4 action. Pin and Snare share bounded source/ability state,
atomic duplicate rejection, target-end-turn expiry, defeat cleanup and honest
effect-only feedback. State/rules/run/dungeon versions are 4/5/6/7. Original
e2f0cdd saves are immutable fixtures in `tests/fixtures/saves/issue-165/`.

## Iteration evidence and retained failures

These results precede final source/build qualification and are not a clean full run:

- Exact-base capture: temporary unit passed, then removed before changing readers.
- Both TypeScript scopes passed. Focused union of 16 unit files: **352 passed**.
  Additional missile assertions verify each seeded draw and a valid near-exhausted
  RNG reaching the whole-cast preflight; both focused cases passed.
- Initial complete unit attempt: **1008 passed, 3 failed**. New content changes
  required the catalog identity and Mage choice count to change. The audio asset
  inventory timed out at 5 seconds on Windows; all three owning files subsequently
  passed (**58 tests**), with no inventory production/test timeout change. The
  timeout is retained and is not attributed to a proven base regression.
- Standalone production build passed: **221 content tests**, both type scopes,
  Vite 8.3.5 bundle. Existing large-chunk/future-config-loader warnings remain.
- Legal pure-domain witness: seed 190 does not reach Mage level 3 and failed the
  attempted acceptance assertion. Seed **17** legally reaches Mage XP 205/level 3,
  uses Snare and multiple missiles across six battles and ends in defeat. Its
  final unit proves exact command/event/state/RNG replay and cleanup.
- Initial new Chromium picker selection: **5 passed, 1 failed** (desktop first
  dev-page navigation exceeded 30 seconds). The exact failed case passed a
  targeted follow-up in 9.8 seconds with no timeout/assertion relaxation. This
  includes real content gates at XP 0/60/180, pointer/keyboard/touch, resize,
  cancellation, inspection, reload and no attack cues with sound enabled/ready.
- Explicit Windows WebKit new picker selection: **3 gate cases passed, 3 audio
  preconditions failed** because MP3 status was unavailable. Preserve these failures;
  real-media WebKit qualification continues in local WSL Linux, following the
  established [platform evidence](../issue-163/README.md).
- Windows initial Chromium launch failed with `spawn UNKNOWN` at the virtualized
  cache path. The physical cache-path override launched Chromium **153.0.8010.12**;
  WebKit **26.6** also launched. Node **24.19.0**, Playwright **1.63.0**.

Completed iteration JSON, logs, source bindings, failure contexts, screenshots
and the desktop journey trace are retained under [iteration/](iteration/manifest.json).
All 30 stored artifact hashes and original-byte hashes were checked after copying.
Windows attempts without a complete input manifest are explicitly labeled iteration
evidence rather than reused as final acceptance. The Linux repair source manifest
is reconstructed from the actual committed Git blobs and the full-input manifest;
the only verification-input change from that repair to the full-run source is the
strengthened Mage unit assertion. Application/build inputs are identical.
Byte-hashed text artifacts are compressed so checkout line-ending conversion
cannot change their stored or original-byte hashes.

The ignored original Windows reports remain in `tmp/issue165-*.json`.
The explicit WebKit run also retains its original artifacts under `tmp/issue165-mage-picker-webkit/`.
The initial Chromium run used disposable `test-results/`; its JSON errors remain
but the following targeted invocation replaced that disposable artifact directory.
Final durable receipts/screenshots will use unique directories and be retained here.

## Remaining qualification

Exact-base list-only [selection comparison](selection/manifest.json) passed across
all **15** configured stage/legacy/setup selections. Every retained ID, title,
timeout, expected status, tag and effective device/project setting is identical.
Default Chromium adds 3 Mage journeys (**736 → 739**), combined fixtures add
6 Mage cases (**81 → 87**), WebKit exploration adds 3 Mage journeys (**90 → 93**),
and the legacy ability config adds the same 6 Mage cases (**36 → 42**).
All other selections are unchanged, including 54 WebKit acceptance, 25 health bars,
both 36-case telemetry modes and each 75-case asset mode. No server/browser ran
during this comparison. Exact source bindings, selected IDs/settings and the
capture/comparison scripts are retained with hashes; it does not claim execution.

Clean Linux source `85191afe80ab8b76fc0059a32b522cc154bc82ba` installed via
`npm ci` (zero audit vulnerabilities), built successfully, and passed all **6/6**
new real-media WebKit Mage picker selections with no skips/retries. Relevant input
hash: `d36f7b85300e91680a6b96ddf2a3c94c8620af06fc60f51b9f4bf74fdf41a214`;
build inventory hash: `6a0f9eb48d2afb17943462986a39cc5ef5697fca72f43fd7f0094e89062af68c`.
The first desktop production witness failed during floor-2 navigation after
earning level 3: `walkDungeon` planned through an enabled upstairs tile, causing
an unintended ascent (expected destination 114, transition at cell 113). Its
failure JSON/log/context are retained in Linux `tmp/issue165/mage-desktop-journey*`.
The bounded helper repair avoids enabled transit stairs except when explicitly
requested, preserving normal keyboard/touch movement and stair-entry assertions.
The existing synthetic Mage progression browser cases also now expect the real
Snare option at level 3+. Both repairs will be exercised in their owning selections.

The targeted desktop production journey on `c8e83144eb79d2f56de3929095962b819d1a5980`
then **passed in 4.9 minutes**: six legal battles, earned level 3, Snare, active
reload, no movement by a blocked enemy, expiry, multi-missile casts, terminal
defeat and exact continuation replay. No game rules or battle outcome were
relaxed. Its unique repair JSON/log/artifacts remain in Linux
`tmp/issue165/mage-desktop-journey-repair*`. The pure witness additionally asserts
that Snare expiry occurs at its target's accepted endTurn.
The retained trace has **412 accepted commands** across battles of
40/45/48/58/164/57 commands; the Mage finishes at XP 205/level 3. Desktop Snare
inspection and terminal screenshots were visually reviewed, alongside portrait
WebKit inspection and the narrow preview.

The live full-regression source `4f8c194` has now also completed the production
Mage trace on **Chromium desktop, native-touch portrait and native-touch landscape**.
All three complete JSON traces are byte-identical to the passing pilot:
`caf799524409d582cd3f7a5cec1bf2c37cea83f094f9d98a9e4a43105a366445`.
Production Snare inspection screenshots on both touch orientations were visually
reviewed. These completed case artifacts are in the full run's
`chromium-artifacts/dungeon-Mage-*/` directories. The aggregate is still live;
the remaining Chromium cases, WebKit production journeys and later modes are
not yet claimed complete.

The complete [Chromium component](full-run/chromium-component.json) has now
finished: **736 passed, 3 declared dev-mode skips, zero failures/flaky cases/retries**
across all 739 discovered IDs. All three skipped cases are the controlled
placement failure/retry case; their required owner is the later `placement-dev`
stage, still pending at this checkpoint. Exact ID equality, one-worker policy,
zero global errors and all three passing Mage journeys were checked directly
against the final JSON report. Raw report/log, before-source identity and all
three Mage traces/screenshots are retained with hashes under `full-run/`.
The aggregate has moved to the 87-case dev fixture stage.

Run real-media Mage picker cases and the complete production-HUD Mage journey on
Chromium/WebKit desktop/portrait/landscape, including active-Snare reload, blocked
enemy movement, expiry and terminal exact continuation replay. Account for all
19 full-regression stages under verification-policy.md, with source/build hashes,
unchanged-input reuse, focused repairs and all failures/skips retained. Review
representative screenshots. No physical device, merge, deployment or release is claimed.
