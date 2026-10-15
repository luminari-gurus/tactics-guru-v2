# Issue #111 — responsive battle controls implementation plan

Status: **implementation in progress**, authorized by the owner on 2026-10-15. OpenSpec: 9/10 tasks verified.

- Issue: [#111 — Implement the reviewed responsive battle-control rail and portrait dock](https://github.com/luminari-gurus/tactics-guru-v2/issues/111).
- Assignee: `moshehbenavraham`. [Acceptance and kickoff comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/111#issuecomment-6196912979).
- Branch: [work/issue-111-responsive-battle-controls](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-111-responsive-battle-controls).
- Base: `main` at `4e601480400a241a2c08cb88a41442e55a5385b7`, refreshed on 2026-10-15.
- OpenSpec: [proposal](../../openspec/changes/issue-111-responsive-battle-controls/proposal.md), [design](../../openspec/changes/issue-111-responsive-battle-controls/design.md), [battle-controls delta](../../openspec/changes/issue-111-responsive-battle-controls/specs/battle-controls/spec.md), [tasks](../../openspec/changes/issue-111-responsive-battle-controls/tasks.md).
- Previous plan and design delivery history: [preserved #108 plan at the base commit](https://github.com/luminari-gurus/tactics-guru-v2/blob/4e601480400a241a2c08cb88a41442e55a5385b7/docs/ongoing-projects/plan.md).

## Selection and authorization

The [full backlog disposition](issue-111-responsive-battle-controls/backlog-review.md) covers all 13 open repository issues, comments/native relationships, one open PR and 58 branches before publication. #80 has direct downstream value but belongs to `dubstylee`; hardware tasks exceed our device capability; release items retain owner-decision gates. Private project-only drafts could not be enumerated without `read:project`.

The owner explicitly answered **“Accept the design and plan #111”** on 2026-10-15. This accepts the [merged rail/dock design](issue-108-battle-controls-design/design.md), clears #111's design prerequisite and authorizes this claim/plan/publication. The subsequent goal request explicitly authorizes execution, autonomous repairs, tests and publication in focused PR chunks. #112 and #113 are merged, #108 is completed, and #111 had no assignee or active branch/PR before the claim. Its `enhancement` label is preserved and `ready for work` added.

Physical capability: **Android**, read from the caller checkout's `CAN_TEST_MOBILE` only. Required physical platforms: **none for #111**. Browser emulation and synthetic safe areas are valid for this issue's responsive checks, not physical-device certification. #57/#58/#64/#66/#74 keep their own acceptance; the narrow #57 owner disposition for #80 is not a blanket waiver.

## Outcome and non-goals

Implement the accepted desktop/short-landscape right rail and portrait bottom dock in the real battle, with distinct actor, inspection and target information; reachable named actions and secondary tools; and a board that fits and navigates within the actual remaining area.

Preserve preview/review/confirm/cancel, immediate Wait, authoritative animation completion, native modal ownership, held-key protection, accepted-command autosave, current-save history return, recovery/restart and audio lifecycle. Preserve the newer reward/item controls and diagnostic routes. No combat/balance/new-ability, inventory, run-progression, art/framework generation, dependency, save-format, deployment or physical-certification changes.

## Source-grounded approach

1. **Shared board rectangle.** [iso.ts](../../src/geometry/iso.ts) and [picking.ts](../../src/geometry/picking.ts) currently fit/clamp below `panelBottom`; [BoardRenderer](../../src/phaser/BoardRenderer.ts) retains the full viewport plus that scalar. Replace the top-only geometry contract with one `{x,y,width,height}` drawable region measured from the battle shell, excluding safe areas, captions and controls. Convert DOM coordinates consistently with the canvas, apply margins once, and use the region center for fit/clamp. Preserve panel-only navigation, real-viewport relative zoom and fresh-battle reset. Adapt all callers: [ProofBoardRenderer](../../src/phaser/ProofBoardRenderer.ts), [FitScene](../../src/phaser/FitScene.ts) as needed, [ContentSmokeScene](../../src/phaser/ContentSmokeScene.ts) and [encounter fixture](../../tests/fixtures/encounters/main.ts). Diagnostic scenes retain their below-panel behavior using an explicit rectangle.
2. **Responsive shell and HUD.** Restructure [hud.ts](../../src/ui/hud.ts), [style.css](../../src/style.css), [index.html](../../index.html) and [startBattleApp.ts](../../src/app/startBattleApp.ts) around actor, actions/preview and secondary tools. Use the accepted 352px desktop rail, 280px short-landscape rail (244px at narrow widths), and portrait dock capped at 56% safe height/510px. Keep actor content bounded and independently scrollable; omit small-screen decorative headings as specified. Scope battle layout so proof/content-smoke UI remains functional. Keep startup/loading/error and save-recovery controls reachable before a live session exists.
3. **Live state and inspection.** The existing HUD derives most state from the session but inspection currently overwrites preview text. Derive HP/max HP, effective stats/status and named signatures from the current catalog/session; expose separate inspection through the scene's existing native dialog owner. Actor identity, target and pending preview stay independent. Preserve existing selectors/data-action hooks where practical and deliberately update affected accessible-name assertions.
4. **Focus, gestures and lifecycle.** [BattleScene](../../src/phaser/BattleScene.ts) remains the authoritative presentation coordinator. Share nonmodal Escape/Cancel behavior and focus enabled Move or Wait after refresh. Retain [BattleDialogs](../../src/ui/dialogs.ts) callback-before-focus ordering, usable Restart fallback, replacement-modal focus and repeated Enter/Space suppression. Retain [BoardInput](../../src/phaser/BoardInput.ts) coordinate/pointer ownership, extending it only to address demonstrated boundary needs. Reset gestures on modal/layout invalidation and prevent captured pointer release or UI gestures from becoming board commands. Keep [persistence controls](../../src/ui/persistence.ts), accepted-command saves and audio ownership intact.
5. **Proof alongside each change.** Extend existing geometry/input and battle browser tests as the corresponding changes land, recording measurements and real-control evidence in `docs/qa/issue-111-battle-controls.md` during implementation. Run the complete configured checks after integration. Retain exact revisions and limitations, and refresh #80/main before implementation and publication to resolve actual shared-file drift.

## Acceptance map

- **AC1 — responsive layouts and board space:** tasks 1.2, 2.1 and 4.2. Compare actual runtime views with the accepted design at 1280x720, 412x915 and 915x412, plus 320x568 and 568x320. Test 200% text and synthetic safe insets. Measure the drawable/input region independently of captions: at least 30% viewport height normally and 55% in short landscape. Require reachable scrolling, no horizontal overflow and no nonmodal UI/board overlap.
- **AC2 — live actor/inspection/target:** task 2.2. Exercise Fighter/Ranger/Mage and their named signatures; assert current/max HP, budgets and effective Guarded status from live values. Inspect allies/enemies with a preview pending and prove actor, pending command, state and RNG remain unchanged.
- **AC3 — complete states and command semantics:** tasks 2.3 and 3.1. Cover idle, selection, valid/invalid preview, review/confirm/cancel, spent movement/action, enemy, presenting, ended and error. Verify visible unavailable explanations, no dispatch for invalid/stale intent, cancellation atomicity, immediate Wait and no UI timer unlocking gameplay.
- **AC4 — geometry and navigation:** tasks 1.1, 1.2 and 3.2. Verify offset rectangles, margins, min/max zoom, preserved camera on status/panel changes, relative zoom on actual viewport changes, fresh-battle fit, transformed picking, raised units and #106 effect/label visibility. Keep the one-rectangle contract across fit, constraints and renderer; no overlay registry.
- **AC5 — accessibility/input:** tasks 2.1, 3.1, 3.2 and 4.2. Check at least 44x44 CSS px targets, native labels, visible focus, keyboard order and board navigation, modal trap/return, non-hover/non-color reasons, text contrast 4.5:1 and meaningful boundary contrast 3:1 using actual rendered pairs. Exercise tap/drag/pinch/wheel, UI scrolling, resize, restart, visibility and stale/dismissal gestures with no pass-through. Retain reduced-motion/static status usability.
- **AC6 — ownership/lifecycle:** task 3.3 with task 3.1. Retain one BattleDialogs owner, accepted-command autosave, current-save history startup, recovery and audio. Cover keyboard Continue, modal replacement and held Enter/Space with exact primary/backup byte and seed assertions; a fresh key after release remains usable. Verify log, sound/retry, recovery and restart remain accessible. #113 is already on main and must not regress. Preserve the #79 run-item flow and modal/recovery tests.
- **AC7 — configured verification:** tasks 4.1 and 4.2. Run the commands below, retain exact counts/results/revisions and complete this map with evidence. Automated or emulated results must not be described as physical-device certification. Do not close #111 from prototype-only or narrow helper checks.

## Verification commands for implementation

Use the repository's installed dependencies and scripts. If npm is absent from PATH, use the available Node/npm runtime through a local invocation; do not add dependencies or alter the lockfile merely to run tools.

```text
npm run test:unit
npm run validate:content
npm run typecheck
npm run build
npm test
openspec validate issue-111-responsive-battle-controls --strict
git diff --check
```

`typecheck` runs both `tsc --noEmit` and `tsc --noEmit -p tsconfig.domain.json`. `npm test` must include its configured `posttest`: `playwright test -c playwright.encounters.config.ts` and `playwright test -c playwright.run-items.config.ts`. Direct Playwright invocations do not run those posttests automatically. Build before the preview-based browser suite.

Focused checks while implementing use `tests/unit/iso.test.ts`, `tests/unit/picking.test.ts`, `tests/unit/input.test.ts`, `tests/battle-loop.spec.ts` and `tests/battle-board.spec.ts`. Retain `battle-animations`, `battle-persistence`, `battle-audio`, proof/content/loading/layout and run-item suites. Capture actual screenshots, bounds, page/console errors and keyboard/touch interactions at the five required viewports; the existing Chromium projects alone do not cover every design size. Preserve prefixed-path loading/history checks where the shell changes affect them.

Current OpenSpec entrypoint: `node C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js`, version 1.14.1, with `OPENSPEC_TELEMETRY=0`. Recheck availability when resuming; this machine-specific path is a convenience, not a game dependency.

## Scope review and risks

Ablation retains one HUD, one modal owner, one measured rectangle and existing test suites. A new controller/framework, overlay registry, speculative storage migration, new asset pipeline or broad renderer rewrite is unnecessary. The finite shared geometry call graph must still be migrated coherently; omitting diagnostic/encounter consumers would break existing routes. Changes to BoardInput/Dialogs are conditional on the required accepted behavior, not permission for unrelated refactoring.

The principal risks are mismatched DOM/canvas coordinates during resize, panel updates resetting navigation, enlarged text consuming board space, captured gestures crossing into UI, and inspection/focus changes corrupting intent or saved progress. Geometry and real-control regressions address those boundaries. #80 may change the same shell/scene; it is separately owned and is neither a prerequisite nor part of this implementation scope.

The base `battle-controls` spec has not yet absorbed the already merged #113 change. This plan preserves those runtime requirements and tests; do not archive or modify that other change as part of this planning publication.

## Implementation handoff

Active checkout: `C:/Users/apexw/.codex/worktrees/issue-111-responsive-controls/Tactics-Guru`, local branch `branch/issue-111-responsive-hud`, based on planning head `9fea4faf`. The original planning checkout belongs to another chat and remains untouched. Current main is still `4e601480`; #80 remains assigned to `dubstylee`; no matching implementation PR existed at kickoff.

Publication sequence: (1) shared geometry and all callers, published to the requested `work/issue-111-responsive-battle-controls` branch with a PR to main; (2) live rail/dock, state and input integration in a dependent branch/PR; (3) any distinct acceptance repairs as evidence requires. No tag or merge is warranted for review-ready feature chunks.

Ablation: retain the finite caller migration and existing tests. No extra geometry compatibility API, overlay registry, framework or duplicated modal/state ownership is needed. Outcome, non-goals, files and proof remain as mapped above. Task 1.1 is complete at source commit `3a645ca0a412ab3e2de73fbb1ce4a821094ad1d3`: 651 unit, 167 content, both typechecks/build, 12 focused browser and 18 encounter cases passed. [QA record](../qa/issue-111-battle-controls.md) retains commands and limits. [PR #118](https://github.com/luminari-gurus/tactics-guru-v2/pull/118) is open against main at `ba47b0a`, with clean local/remote parity. The dependent `branch/issue-111-responsive-hud` starts there. Task 3.2 is now verified by the captured-boundary unit/browser cases plus the existing modal/restart/visibility cases; tasks 2.1 and 2.2 are also verified; tasks 1.2, 2.3, 3.1 and 3.3 await final integrated proof. The measured shell, independent actor/controls scrolling, catalog-derived HUD, inspection/log modals, shared cancellation focus and drawable pointer boundary are implemented locally. Initial five-size/200%-text/safe-inset measurements meet board floors (0.02px rounding tolerance) without page overflow. Visual inspection caught and fixed a detached-DOM lookup that inserted `null` above the controls; screenshots and focused tests must be refreshed. Focused acceptance now passes 24/24 (three configured profiles): live actors/inspection/cancel, effective Guarded/basic-attack state, five sizes at normal/200% text with safe insets, board boundary cancellation, clipping/feedback, camera stability and restart/asset reuse. Unit checks pass 652/652. Source is committed at `057166e2bae9d4e2249d379964bfc447179a5b72`. A final 12-case focused pass verifies fresh fitted screenshots at each layout, target inspection and the updated asset-base portrait selector. The first full run was intentionally stopped after the early audio group to correct that remaining old selector before wasting later runs; no full-suite pass is claimed. Final full `npm test` (420 cases plus configured posttests) is running against clean source checkpoint `7d333f1281b88120918d1663f8aebeae2f34feb7`. Log/report: `tmp/hud-final-full.log` and `tmp/hud-final-full.json`; main-suite artifacts: `tmp/hud-final-full-artifacts`. Do not start another 4173 server while it runs. The root build manifest is `tmp/hud-root-build-manifest.json`. A dev server on 4174 is retained for inspection. Next: finish all suites, repair substantiated failures, complete the QA acceptance map and publish the dependent PR.

Tooling: bundled Node is on PATH; npm is absent. A temporary npm 11.6.2 CLI under ignored `tmp/npm` and `tmp/bin/npm.cmd` supports lockfile-preserving installation and the configured lifecycle scripts. Add `$PWD/tmp/bin` to PATH for each shell call. OpenSpec uses the entrypoint above. Use installed Edge through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

## Retained planning validation

This publication contains task-specific documentation and OpenSpec planning only. The checklist has ten unchecked implementation tasks. Planning verification covers strict OpenSpec validation, local document links, all seven acceptance mappings, whitespace and scoped diff review, assignment/comment readback, native issue/branch linkage and exact local/remote commit parity. Runtime suites and device checks are reserved for the approved implementation; no new runtime pass is claimed here.

Precommit validation passed: strict OpenSpec, 57 local document links, all seven acceptance mappings, ten unstarted tasks, whitespace and an eight-file planning-only scope check. Assignment, readiness label, kickoff comment and native Development branch linkage were read back successfully. The kickoff comment will retain the final commit and publication verification after push.

Worktree: `C:/Users/apexw/.codex/worktrees/issue-111-controls-plan/Tactics-Guru`. The original checkout is preserved. Planning publication is complete. Continue implementation in the active isolated checkout documented above; refresh main and remote target before every publication.


## Integrated verification checkpoint

All 420 configured browser cases passed once, with no failures, retries or skips, on source checkpoint `7d333f1` (root build stamped clean). The configured npm posttests also passed: 18 authored-encounter and 21 run-item cases. No runtime/test source changed during the run. Tasks 1.2, 2.3, 3.1, 3.3 and 4.1 are now verified. Main remains `4e601480`, parent PR #118 remains `ba47b0a`. The temporary 4174 server is stopped.

Next: build at `/tactics-guru/` and run the asset-base and cached-return cases; finalize the acceptance map, validate links/spec/diff, push the dependent branch and open its review-ready PR. Task 4.2 is the sole remaining checkbox.
