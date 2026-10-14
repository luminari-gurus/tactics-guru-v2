# Tasks

Implementation authorized on 2026-10-14; see [plan.md](../../../docs/ongoing-projects/plan.md). Checkboxes track verified work. The user's incremental publication instruction supersedes the earlier request to wait for the entire scope before opening a PR.

## 1. Event mapping and signature effects

- [x] 1.1 Map accepted signature events to actor/target/outcome presentation data without changing domain events; verify focused frozen-input fixtures for hit, miss, critical, defeat, guard-on-miss and automatic-hit Magic Missile, including unchanged state/RNG.
- [x] 1.2 Implement board-local slash/guard, arrow and magic projectile/impact effects in the existing animation handle; verify all three through normal controls with controlled intermediate frames, correct target labels and final snapshots. Document chosen visual phases/timing in `docs/qa/issue-106-ability-animations.md` with initial screenshots.

## 2. Completion and lifecycle

- [x] 2.1 Unify completion/cancellation cleanup for temporary objects and tween callbacks; verify normal completion, repeated cancellation, visibility loss/return, restart-dialog cancellation and confirmed restart during each signature without stuck input, duplicate commands, changed RNG or leftover effects.
- [x] 2.2 Retain session-token/live guards and current-save startup on shutdown/history return; verify ability-specific reload/departure cases plus the existing real BFCache regressions preserve accepted state and exact save bytes before Continue, with no stale callback, historical effect or page error. Record the tested lifecycle cases in the QA document.

## 3. Responsive visual acceptance

- [x] 3.1 Verify pan/zoom, elevation and resize during effects across desktop and emulated mobile portrait/landscape; inspect travel/impact screenshots for all signatures, readable hit/miss/damage/guard/defeat feedback and cleanup after repeated use. Record source commit, browser/project/viewport, case, image paths and observed limitations in the QA document.
- [x] 3.2 Verify keyboard/touch/mouse action selection, confirmation locking, rejected/cancelled previews and repeated use with the existing battle helpers; compare full legal battle replay/events and next RNG against domain results, and retain movement/basic/enemy regression behavior.

## 4. Integrated verification and handoff

- [x] 4.1 Run focused animation/lifecycle tests, full unit and content checks, both TypeScript configurations, production build and full configured browser suite; record actual counts/failures/retries and any unperformed checks. Run the relevant built `/prototype/` animation/persistence checks, restore the root build and run strict OpenSpec plus whitespace validation.
- [x] 4.2 Map every #106 acceptance criterion to fresh evidence in the QA document, update this plan/handoff and task completion honestly, and verify that the final diff adds no combat/content/save-format/audio changes or unrelated work. Publish the implementation and review PR only after the approved scope is complete; report remaining acceptance gaps explicitly.

## Workflow follow-up

- [PR #110](https://github.com/luminari-gurus/tactics-guru-v2/pull/110) merged on 2026-10-14 as `82c0eb457cad1fd51eb944e925ef6b96cb92b2bb` after the user authorized integration. All acceptance criteria have recorded evidence; no implementation tasks remain. See the [QA closeout](../../../docs/qa/issue-106-ability-animations.md#review-and-merge-closeout--2026-10-14).
- This completed OpenSpec record remains in place. #108 is the separate next-session recommendation; no work on it, manual deployment or production cutover began during this closeout.
