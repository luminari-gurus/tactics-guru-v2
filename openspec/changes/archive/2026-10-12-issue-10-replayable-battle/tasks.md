# Tasks

## 1. Session and replay boundary

- [x] 1.1 Record caller approval in this change and add RED-first focused session tests for player ownership, move/basic/signature/Wait previews, cancel/invalid/stale intent immutability and replay identity; verify failures before implementation.
- [x] 1.2 Implement BattleSession using existing catalog previews and dispatch, with accepted-only in-memory command/event records and deterministic fresh restart; verify focused session tests and replayBattle equality for authored seeds.
- [x] 1.3 Add automatic per-command enemy execution, presentation phase transitions, accepted-prefix rejection handling and disposal/run tokens; verify RED/GREEN tests for enemy-first initiative, terminal attack, duplicate confirm and obsolete completion callbacks. Document orchestration/replay policy in the task QA note and constants comments without changing rules.

## 2. Responsive decisions and HUD

- [x] 2.1 Add hero portraits, HP/Guarded/budget/turn feedback, action and target controls and bounded log in hud.ts, shell and styles; verify RED/GREEN browser assertions for correct state, portrait assets, both 44px dimensions, safe-area styling, scroll/overflow and portrait/short-landscape screenshots.
- [x] 2.2 Connect Move/Basic Attack/Signature selection to shared legal previews and explicit Confirm/Cancel, including authored Magic Missile target shape and explicit Wait; verify focused UI tests exercise each hero signature, cancellation preserves snapshot/RNG and invalid targets show reasons. Document controls in the QA note.
- [x] 2.3 Implement native confirmation/outcome dialogs with focus restore, input guards and gesture reset; verify focused browser tests for click-through, Enter/Escape, focus containment/return, terminal action lock and restart from outcomes.

## 3. Scene presentation and input lifecycle

- [x] 3.1 Integrate session with BattleScene and cancellable movement/combat event presentation in BoardRenderer; verify RED/GREEN input-lock tests, visible path/damage/miss/status/defeat presentation and hidden/resume reconciliation without additional dispatch.
- [x] 3.2 Add focusable board keyboard cursor and accessible target parity alongside existing pointer input; verify keyboard move/attack/Wait, real touch preview/confirmation and drag/pinch/cancel suppression. Document keyboard bindings.
- [x] 3.3 Dispose scene/UI/input/dialog/presentation bindings on restart, retaining proof/content-smoke routing and renderer diagnostics; verify repeated restart during player preview, enemy animation and dialogs yields one canvas, no stale callbacks and one accepted command per confirmation.

## 4. Full battle integration and delivery

- [x] 4.1 Adapt authored-board/layout regressions to automatic enemies and preview flow without dropping camera/projection/DPR/canopy/cleanup coverage; add complete authored win and loss tests whose legal player policies use real controls, verify accepted records replay to equal state/events, and record actual seeds/actions and screenshots in docs/qa/issue-10-battle.md.
- [x] 4.2 Run focused unit/browser checks, then npm run test:unit, npm run validate:content, npm run typecheck, npm run build, configured npm test with the installed Chromium executable when required, git diff --check and openspec validate issue-10-replayable-battle --strict; record actual results and physical-device/performance limits with criterion-by-criterion evidence and #11 hand-off.
- [x] 4.3 Commit only approved issue changes, push and create/reuse a PR against main with approval and validation evidence; verify the PR and attach it to this task. Use Closes #10 only if all its criteria are verified, otherwise draft with Refs #10 and remaining gaps.

## Workflow follow-up

- Keep #6 physical-device acceptance and #11 deployed/device/performance checks explicit; do not claim emulation certifies them.
- Do not merge, manually close the issue or archive the OpenSpec change before merge.
