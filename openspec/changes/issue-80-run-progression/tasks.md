# Tasks

Issue #80; caller dubstylee; branch work/issue-80-run-progression; base 46284e10d18271b2e410e3c2532e27231cd3a8d6. Implementation explicitly approved by the caller in the task conversation on 2026-10-15.

## 1. Carried-party battle construction and replay

- [x] 1.1 Add pure canonical run battle construction using validated authored encounter mapping, derived seed, surviving HP and once-projected equipment; verify all survivor subsets, fresh battle-local fields, immutable base catalog and invalid entry rejection in focused unit tests.
- [x] 1.2 Add fresh run-boundary BattleSession creation and strict run-specific accepted-command replay without relaxing replayBattle; verify event/state equality, tampered HP/roster/equipment/initiative rejection, restored continuation next-command/RNG equality and existing single-battle replay tests. Document APIs and invariants in docs/run-contract.md.

## 2. Authoritative run lifecycle and persistence

- [x] 2.1 Extend RunItemSession to own encounter start, current BattleSession accepted state and validated atomic outcome/offer commits; verify first/second reward, third victory, party wipe, current-session authority, duplicate/stale callback rejection and unchanged failed transitions with controller tests. Update #79 handoff documentation.
- [x] 2.2 Add fresh identity/seed/full-party/empty-ownership reset and hydrate/startup behavior using the existing run codec/storage; verify every accepted player/enemy and run/item boundary saves, ended active snapshots reconcile once, and restored next command/RNG matches uninterrupted execution.
- [x] 2.3 Integrate reviewed Continue/export/retry/removal and safe replacement without silently overwriting bad data; test corrupt/incompatible/oversized/quota/unavailable and changed bytes, backup recovery, partial multi-slot reset retaining live state/seed and exportable original bytes, and the supported maximum payload bound. Document recovery and best-effort limits.

## 3. Live route, battle host and run controls

- [x] 3.1 Add discoverable /run bootstrap and return-to-single-battle navigation, explicit Start/Continue/preparation/Start encounter, existing reward/item controls and final victory/defeat Start new run; verify production-route smoke, independent save namespaces, narrow/portrait/landscape layout, native touch/keyboard/focus and modal input capture. Document routes and user flow.
- [x] 3.2 Introduce the narrow BattleScene/start host seam reusing existing board/HUD/presentation/audio and default single-battle persistence; verify correct authored map/party/catalog per encounter, final presentation before screen switch, sound preference across in-page transitions, no historical cues on Continue and single-battle regressions.
- [x] 3.3 Dispose scenes/controllers/UI bindings and guard generations during encounter change, restart, pagehide and BFCache return; verify obsolete callbacks cannot change replacement saves, one canvas/modal/input owner remains, and repeated transitions/resize preserve command locks and gesture capture.

## 4. Integrated legal run evidence

- [x] 4.1 Add deterministic legal-policy browser checks executing all three authored battles, two reward claims and preparation through actual production controls from a fresh run; verify final victory, complete replay/boundary records, HP/defeated-party/equipment correctness and no forced progression or state injection. Record exact seed and policy in docs/qa/issue-80.md.
- [x] 4.2 Exercise legal defeat, fresh-run restart and reload/Continue during player/enemy presentation, pending/claimed reward, preparation and final outcome through actual controls; verify no duplicate reward/encounter/command/cue and next-command/RNG equivalence across desktop and emulated mobile portrait/landscape. Retain focused WebKit evidence/limitations consistent with owner acceptance.

## 5. Final integration and delivery

- [x] 5.1 Run relevant focused tests, full npm run test:unit, npm run validate:content, both npm run typecheck configurations, npm run build and full npm test including encounter/run-item posttests; verify strict OpenSpec and git diff --check, record exact revisions/commands/results, build/transfer delta, failures and limitations, and map every #80 criterion to evidence in docs/qa/issue-80.md.
- [x] 5.2 Compare final changes with approved scope, commit only #80 work, push and create/attach a PR against main with issue/plan/approval and actual validation; use Closes #80 only when every criterion is verified, otherwise open a draft with Refs #80 and remaining work.

## 6. PR review corrections

- [x] 6.1 Route in-flow Continue through the host's existing boundary/battle lifecycle; reproduce legal-defeat backup restoration before fixing and verify the resumed board and exact snapshot in browser tests.
- [x] 6.2 Offer explicit unsaved play when run-key reads are unavailable with no usable save; verify getItem SecurityError separately from storage acquisition failure and preserve inaccessible bytes without writes/removals.
- [x] 6.3 Use retained-aware host recovery from every mounted live-run boundary; reproduce partial reset, close/reopen recovery and verify the exact deleted backup download, then run affected regression suites and publish the fixes.

- [ ] 6.4 Restore recovery return focus after boundary rerender for both Escape and Close; verify connected visible focus on startup/preparation and unchanged battle-mode behavior in Chromium and WebKit, and publish the correction.

## Workflow follow-up

- Do not merge, deploy, close parent epics or archive this change before merge.
- #81 owns broader playtest/tuning; #64/#66 remain independent follow-ups after the accepted #57 baseline.
