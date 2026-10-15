# Tasks

Implementation authorized by the owner on 2026-10-15. Tasks are checked only after their implementation and required proof are complete.

## 1. Drawable board geometry

- [x] 1.1 Replace the shared top-only fit/clamp contract with one explicit drawable rectangle and adapt BoardRenderer, proof/content-smoke callers and the encounter fixture together. Verify offset rail/dock bounds, padding, fit/zoom limits and diagnostic compatibility with the existing iso/picking unit tests and focused proof/content/encounter browser checks; document the coordinate contract in the touched geometry API.
- [ ] 1.2 Wire the measured board region and settled resize handling into BattleScene. Preserve pan/zoom on panel changes, relative zoom on viewport changes and fresh-battle fit; verify actual drawable floors, raised art/feedback visibility and transformed picking in battle-board tests, and record representative bounds in the issue QA document.

## 2. Live responsive HUD

- [x] 2.1 Implement the accepted rail/dock shell, bounded actor/actions scrolling, safe areas, captions and secondary controls while preserving startup/error/recovery and diagnostic routes. Verify all five sizes, 200% text, 44px controls, contrast and no horizontal overflow in battle-loop/layout checks; record screenshots and measurements in docs/qa/issue-111-battle-controls.md.
- [x] 2.2 Derive actor/target/inspection fields and named actions from live session/catalog data; route distinct inspection through the existing dialog owner without overwriting preview. Verify all three heroes, effective Guarded status, actor/intent/RNG invariance and visible disabled reasons through battle-loop tests; document the retained selector mapping and state catalogue in the QA record.
- [ ] 2.3 Preserve selection, valid/invalid preview, review/confirm/cancel, spent/enemy/presenting/ended/error states and immediate Wait. Verify atomic cancellation/rejection, one accepted command per confirmation and authoritative animation unlock through existing battle-loop and battle-animations tests with observable runtime assertions.

## 3. Input, focus and lifecycle

- [ ] 3.1 Share nonmodal Escape/Cancel handling and focus Move or Wait after refresh; retain #113 modal callback order, replacement-modal focus and held-key protection. Verify keyboard board/target parity, modal trap/return, keyboard Continue, fresh Enter/Space after release and exact primary/backup save-byte preservation in battle-loop/persistence checks; document any selector changes.
- [x] 3.2 Prevent UI/modal and stale captured gestures from passing to the board during scrolling, resize, restart or visibility changes. Change BoardInput only where required, add boundary cases to existing input/battle-board tests, and verify tap/drag/pinch/wheel isolation, one canvas and no duplicate command/listener behavior.
- [ ] 3.3 Preserve accepted-command autosave, current-save history return, recovery/restart access and audio ownership. Verify existing battle-persistence/battle-audio regressions and run-item modal/recovery checks; record actual results and retained limitations without changing storage formats or run-progression behavior.

## 4. Integrated acceptance and handoff

- [ ] 4.1 Run configured unit/content/browser checks including both encounter and run-item posttests, both TypeScript configurations, production build, strict OpenSpec and whitespace checks. Refresh current main, resolve shared-file drift with #80 only as needed, and record exact tested revisions, commands, counts, failures and limitations in the QA document.
- [ ] 4.2 Complete real-control visual and interaction acceptance at 1280x720, 412x915, 915x412, 320x568 and 568x320, including enlarged text and safe areas. Map all seven issue criteria to evidence, verify plan/spec/task consistency, and prepare the implementation PR with only justified changes; use closure wording only when every criterion is proven.

## Workflow follow-up

- Publish completed chunks for review as they are ready; stack dependent PRs. Leave them unmerged.
- Keep #57/#58/#64/#66/#74, #80 and production release work separate. Physical capability is Android; no physical-device certification is claimed or required for #111.
- Do not merge or archive this change during planning. Reconcile the already merged #113 spec delta during the later normal archive workflow without losing its scenarios.
