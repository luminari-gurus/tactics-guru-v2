# Issue #108 — battle controls design implementation plan

Updated 2026-10-14 (Asia/Jerusalem). **Planning only; design execution has not started.**

- Issue: [#108 — Design desktop and mobile battle control sections](https://github.com/luminari-gurus/tactics-guru-v2/issues/108).
- Assignee: `moshehbenavraham`; [kickoff comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/108#issuecomment-6170822095).
- Published branch: [work/issue-108-battle-controls-design](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-108-battle-controls-design), natively linked in #108's Development section.
- Base: current fetched `origin/main` at `d2a1a61abb636b5ab38ddce6c26207f6bcb6d4f5`.
- Worktree: `C:/Users/apexw/.codex/worktrees/issue-108-controls-plan/Tactics-Guru`.
- OpenSpec: [proposal](../../openspec/changes/issue-108-battle-controls-design/proposal.md), [design approach](../../openspec/changes/issue-108-battle-controls-design/design.md), [10 unchecked tasks](../../openspec/changes/issue-108-battle-controls-design/tasks.md). `skip_specs: true` is intentional for this design/documentation deliverable; existing [battle-controls requirements](../../openspec/specs/battle-controls/spec.md) remain the baseline.
- Previous work: [completed PR #110 merge and next-session handoff](https://github.com/luminari-gurus/tactics-guru-v2/blob/d2a1a61abb636b5ab38ddce6c26207f6bcb6d4f5/docs/ongoing-projects/plan.md) preserves the prior plan and verification record.

## Selection and prerequisites

The [complete backlog disposition](issue-108-battle-controls-design/backlog-review.md) covers all 16 open repository issues, their comments and native relationships, one open PR and 52 remote branches. No readiness promotion was needed. #108 was ready and unclaimed; the reward catalog #77 belongs to `dubstylee`, while other implementation/certification/release items retain prerequisite, device or owner-decision gates. Private project-only drafts could not be enumerated because the credential lacks `read:project`.

#106's Guarded Strike, High Shot and Magic Missile animations are on main through merged PR #110 (`82c0eb4`), satisfying the design's coordination need. No active branch or PR for #108 existed before this claim. Physical capability from the caller's `.env` is **Android**. Required physical platforms for #108: **none**; responsive mockups and browser checks are design evidence, not iOS/Android certification. #57/#58/#64/#66/#74 stay outside this task's acceptance.

## Outcome and boundaries

Deliver a chosen, reviewable battle-control design for desktop, mobile portrait and mobile landscape, with readable unit information, complete interaction states, accessibility/board-space evidence and a scoped runtime implementation handoff. This plan's implementation means producing that design package. It does not authorize shipping the redesigned HUD.

Preserve combat rules, catalog-defined abilities, inspection semantics, action/target/review flow, immediate Wait / End turn, accepted-command autosave, native modal ownership and animation/lifecycle gating. Exclude new abilities, party management, stat/balance changes, additional art generation, a new UI framework, dependency upgrades, save-format changes, deployment and device certification.

## Observed implementation constraints

- [HUD](../../src/ui/hud.ts): party inspection, active-unit HP/status/budgets, named signatures, target selection, previews and primary/secondary controls already exist. Inspection currently writes preview text; it does not change the active actor.
- [Scene](../../src/phaser/BattleScene.ts) and [session](../../src/app/BattleSession.ts): Move/Basic attack/signature actions preview and then confirm. Wait commits directly. Gameplay selection is phase-gated; presentation acknowledges already accepted state and cannot introduce an extra command or RNG draw.
- [Dialogs](../../src/ui/dialogs.ts) and [save controls](../../src/ui/persistence.ts): one native dialog owner handles confirmation, outcomes and recovery with input capture and focus return. Preserve access to restart/recovery and sound without making them compete with primary actions.
- [Styles](../../src/style.css) and [page shell](../../index.html): the HUD occupies a safe-area top panel, scrolls internally and already targets 44px controls. [BoardRenderer](../../src/phaser/BoardRenderer.ts) and [camera constraints](../../src/geometry/picking.ts) reserve only the region below the panel bottom. Side/bottom placement therefore needs a concrete geometry handoff.
- [Merged animation evidence](../qa/issue-106-ability-animations.md): signature effects use a 560 ms presentation with cleanup on cancellation/restart/history return. The design should explain the locked state without replacing authoritative phase completion with a UI timer.

## Execution sequence and acceptance mapping

1. **AC1 — three responsive mockups.** Build a small, isolated documentation prototype and export desktop 1280x720, portrait 412x915 and landscape 915x412 views. Annotate information hierarchy, safe areas, breakpoints and scroll/disclosure behavior. Inspect 320x568, 568x320 and enlarged text as stress cases. Compare a compact top cluster with a rail/dock only as needed; choose placement from measured board usability.
2. **AC2 — representative heroes and named actions.** Show Fighter with Guarded Strike, Ranger with High Shot and Mage with Magic Missile, including Move, Basic attack and Wait / End turn. Use existing portraits/catalog labels and source-checked display fields; label illustrative fixtures rather than representing them as a real playthrough.
3. **AC3 — acting versus inspected/targeted unit.** Keep the acting unit and its action bar persistent; label inspected ally/enemy and selected target separately. Demonstrate that inspection changes information only and cannot imply turn reassignment.
4. **AC4 — complete state catalogue.** Cover idle/action selection, target selection, valid preview, invalid target with reason, review/confirm/cancel, movement spent, action spent, enemy turn, presentation/input lock, and victory/defeat. Document allowed controls, status text and transitions; maintain existing confirmation and Wait semantics.
5. **AC5 — readable decisions and unavailable feedback.** Prioritize identity/portrait, HP/max HP, relevant stats/status and movement/action availability. Put secondary details behind inspection. Include visible explanations for spent/disabled actions and insufficient/invalid targets that do not require hover or focusing a disabled button.
6. **AC6 — accessibility.** Document and measure at least 44x44 CSS px targets, visible focus, logical keyboard order, modal focus capture/return, accessible names and polite status updates. Use text/symbols beyond color and hover; set design contrast targets of 4.5:1 ordinary text and 3:1 large text/meaningful control boundaries, retaining actual measured pairs and exceptions. Provide reduced-motion treatment for nonessential UI effects.
7. **AC7 — board visibility and input capture.** Annotate unobscured board bounds, actor/target/effect visibility and expanded control states. Retain at least the existing board-height floors of 30% normally and 55% in short landscape, while seeking more useful space. Demonstrate prototype click/tap/modal capture with a board-event counter. State clearly that actual-game command/gesture isolation still requires the later runtime checks.
8. **AC8 — selected design and implementation handoff.** Record the chosen layout, review disposition, trade-offs, all acceptance evidence and exact implementation seams. Create or reuse a linked runtime issue only if the reviewed design needs one. Include any reserved-rectangle/camera work, selectors and relevant existing tests; do not silently expand #108 into runtime implementation.

Steps 1-7 are iterative within one design package; they are not separate frameworks. The OpenSpec task list groups source/state preparation, mockup production with local verification, then review/handoff with integrated checks.

## Files and deliverables

Current planning commit:

- `docs/ongoing-projects/plan.md` — this canonical implementation plan.
- `docs/ongoing-projects/issue-108-battle-controls-design/backlog-review.md` — complete selection evidence and coverage limits.
- `openspec/changes/issue-108-battle-controls-design/{.openspec.yaml,proposal.md,design.md,tasks.md}` — bounded design workflow; no new runtime spec.

During the approved design work, add only `design.md`, `mockups.html` and necessary local preview/evidence files in the issue documentation directory, then update this plan and the task checkboxes. Reuse existing public art. Application source and tests are references during #108; they become potential edits only in the separately scoped runtime handoff.

## Proof and completion gates

For this planning commit: strict OpenSpec validation, complete acceptance-to-task mapping, local document-link checks, `git diff --check`, an inspected documentation-only diff, issue assignment/comment readback, native linked-branch readback, and exact local/remote commit parity. Game tests do not validate a prose-only plan and will not be reported as freshly run.

For design execution: visually inspect all three rendered layouts and representative states; measure sizing/contrast/board bounds; exercise keyboard, touch, modal capture, disclosures and resizing in the prototype; record actual evidence and review disposition. No static screenshot proves click-through prevention or physical-device behavior.

For the later runtime handoff: reuse `tests/battle-loop.spec.ts` for HUD/preview/keyboard/touch/modal behavior, `tests/battle-board.spec.ts` for camera fitting and gesture stability, and `tests/battle-animations.spec.ts`, `tests/battle-persistence.spec.ts` and `tests/battle-audio.spec.ts` for state-lock/lifecycle/recovery regressions. Extend those checks where the chosen layout needs proof. The implementation ticket should require configured unit/content/browser checks (including the encounter posttest), both typechecks, production build and whitespace validation, with physical claims kept separate.

## Risks and simplification

The main integration risk is the current top-only board-reservation API. The design must reveal whether it can reuse that API or needs a small rectangle-based adaptation later. Other risks are losing actor identity during inspection, hiding disabled explanations, and fitting an ideal screenshot while expanded controls obstruct the board.

Ablation keeps one prototype, existing art, existing command semantics and existing regression paths. It removes a speculative UI framework, new assets, duplicated behavior specs and live HUD changes from this design issue. Every retained deliverable supports a specific acceptance criterion.

## Current handoff

The plan is ready for review. Strict OpenSpec validation passed with specs intentionally skipped; all 19 local document links resolve, all eight acceptance criteria are mapped, and all ten design tasks remain unchecked. Assignment, kickoff comment and native branch linkage are verified. The kickoff comment records the final pushed planning revision and publication checks. No game tests were run for this documentation-only plan; no mockups, design acceptance, runtime edits or physical testing are claimed. Before later execution, record explicit approval of this concrete plan and refresh the issue/branch baseline.
