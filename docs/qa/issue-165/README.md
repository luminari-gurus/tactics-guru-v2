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

Raw iteration JSON reports currently remain in ignored `tmp/issue165-*.json`.
The explicit WebKit run retains its artifacts under `tmp/issue165-mage-picker-webkit/`.
The initial Chromium run used disposable `test-results/`; its JSON errors remain
but the following targeted invocation replaced that disposable artifact directory.
Final durable receipts/screenshots will use unique directories and be retained here.

## Remaining qualification

Run real-media Mage picker cases and the complete production-HUD Mage journey on
Chromium/WebKit desktop/portrait/landscape, including active-Snare reload, blocked
enemy movement, expiry and terminal exact continuation replay. Account for all
19 full-regression stages under verification-policy.md, with source/build hashes,
unchanged-input reuse, focused repairs and all failures/skips retained. Review
representative screenshots. No physical device, merge, deployment or release is claimed.
