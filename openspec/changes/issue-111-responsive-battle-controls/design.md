# Design

## Context

See [proposal.md](proposal.md) for motivation and [the implementation plan](../../../docs/ongoing-projects/plan.md) for the acceptance map. The accepted [#108 design](../../../docs/ongoing-projects/issue-108-battle-controls-design/design.md) is on `main` at `4e601480400a241a2c08cb88a41442e55a5385b7`, together with the #113 runtime focus repair and #79 reward/item controls. Owner acceptance on 2026-10-15 clears the design gate, not approval to execute this plan.

`BattleHud` currently combines actor/party text, actions, target selection and preview in `#fit-panel`; inspection overwrites preview text. `BattleScene` owns the real action state and one `BattleDialogs` instance shared with persistence. It observes panel height and passes `panelBottom` to `BoardRenderer.fit`. Geometry functions and proof/content-smoke scenes also consume that top-only convention. `BoardInput` converts CSS coordinates through the canvas rectangle and owns pointer capture; layout must retain that coordinate agreement.

## Goals / Non-Goals

**Goals:** implement the accepted composition while preserving the domain/session/Phaser/DOM boundaries, current selectors where practical, state and RNG invariants, camera navigation and all current consumers of shared geometry.

**Non-Goals:** no second state machine, generalized overlay registry, new framework or generated assets. No combat, balance, save-format, inventory, run-progression, deployment or physical-certification changes. #80 remains another contributor's active integration work; refresh its status before implementation and coordinate shared-file changes without adopting its unfinished branch.

## Decisions

### 1. Keep the existing HUD and scene ownership

Restructure `BattleHud` into actor summary, primary actions/target/preview and secondary tools. Use live session/catalog values and `previewText`; do not copy the prototype's illustrative HP or probabilities. Inspection gets distinct content through the existing modal owner, supplied by a narrow callback from `BattleScene`, so it cannot overwrite pending intent. If richer inspection content needs a small `BattleDialogs` extension, retain the same element, lifecycle and focus policy rather than adding a second dialog manager.

Move board help/captions and secondary controls as the accepted composition requires, preserving startup status, error display and persistence controls even before a session is created. Scope battle layout with an explicit battle mode on the shell in `startBattleApp`; proof and content-smoke routes retain their diagnostic presentation. Preserve restart bindings and stable action selectors. Keep party inspection distinct from #79 party-item management.

Alternative: a new UI framework or duplicated prototype controller would duplicate authoritative state and teardown. The existing native DOM adapter already has the required commands and callbacks.

### 2. Make one measured rectangle the geometry input

Create a small explicit drawable-board DOM region in the battle shell. CSS gives it the space beside the rail or above the dock, after safe insets, captions and separation. Observe its actual bounds; convert from client CSS coordinates to the same canvas coordinates used by `BoardInput`. Pass one `{x,y,width,height}` value through `BattleScene`, `BoardRenderer`, `fitBoard` and `constrainView`. Apply fit padding once and use the rectangle center for clamping. Keep the current fit/relative-zoom limits.

Retain the renderer's guard against mixing a new DOM layout with stale Phaser viewport dimensions. On true viewport/orientation changes, refit and preserve the zoom ratio. On panel-only changes, preserve the camera subject to required constraints. Restart uses the new settled rectangle at fit zoom. Reset captured gestures when layout changes invalidate their coordinates; pointer movement or release over UI must not become a command or continue navigation under the controls. Test the boundary before broadening `BoardInput`.

Migrate all callers of shared geometry in the same implementation: `ProofBoardRenderer`, `ContentSmokeScene`, their `FitScene` call site as needed, and `tests/fixtures/encounters/main.ts`. Diagnostic callers compute an explicit below-panel rectangle to retain their existing visual contract. Do not maintain two conflicting geometry algorithms or an overlay registry. Canvas clipping or a bounded render surface must keep raised art and feedback out of UI/captions without changing board-to-screen selection semantics; verify fit and zoomed edge states in the real renderer.

Alternative: changing CSS alone leaves the renderer fitting below the rail's bottom edge. Keeping a permanent overloaded legacy `panelBottom` geometry API obscures which callers obey the new contract; the small finite caller set can be adapted directly.

### 3. Follow the accepted sizes and input semantics

Use a 352px desktop rail at width >=760px; short landscape (height <=500px) uses 280px, shrinking to 244px at width <=640px. Portrait/narrow tall layouts use a bottom dock capped at 56% of the safe viewport and 510px. Actor content can scroll within its 45% dock cap; primary/tools content scrolls separately. At <=450px wide and <=700px high, omit the decorative board heading. Retain at least 30% actual drawable height normally and 55% in short landscape; captions do not contribute. Use the accepted existing art, colors, typography, spacing, minimum 44px targets and measured contrast targets.

Use a shared scene cancellation path for nonmodal Escape and Cancel, restoring Move or Wait after state refresh. Preserve the distinct modal fallback to usable Restart after callbacks, replacement-modal focus and the global repeat-key guard from #113. Board keyboard controls remain on the labelled canvas. Inspection/modal entry resets pointer state and captures gameplay through the existing owner.

Alternative: focus restoration in individual click handlers would diverge from keyboard cancellation and reintroduce the reviewed focus bug. A shared cancellation path covers both triggers.

### 4. Extend existing proofs at the real boundaries

Geometry tests cover offset rail/dock rectangles, containment, clamp/zoom bounds and legacy diagnostic callers. Browser checks exercise live actions and states, inspection invariance, target/preview behavior, text scaling, safe-area stress, panel resize versus orientation, UI/modal capture and restart. Retain exact saved-slot assertions for held keys, current-save history return, presentation lock and audio lifecycle. Visual review compares the actual game with the accepted prototype at all five sizes; prototype screenshots alone cannot certify runtime behavior.

Run configured checks, including both dev-only posttest suites for encounters and run items. Existing helpers and reports are extended; no parallel test framework or synthetic full-game completion claim is needed. Android is available locally, but #111 has no physical-device acceptance criterion. Emulated checks remain explicitly labelled as such.

## Risks / Trade-offs

- Shared geometry affects diagnostic scenes and fixtures -> migrate the complete call graph and retain proof/content/encounter tests.
- Small portraits, captions, enlarged text or safe areas can consume the board -> measure actual drawable bounds independently of decorative content, including all five accepted sizes.
- New inspection content can disrupt preview or focus -> use scene-owned callbacks and verify pending command, actor, RNG and focus before/after inspection.
- Canvas pointer capture may outlive layout/modal changes -> reset on invalidated geometry and verify tap, drag, pinch, wheel, dismissal and stale pointer release.
- #80 may touch the same shell/scene -> refresh current main before implementation/publication and reconcile new accepted behavior without adding run integration to #111.
- #113 has a merged but unarchived spec delta -> preserve its implemented scenarios in verification; do not archive or overwrite that change from this planning task.

## Migration Plan

No data migration or deployment is part of this task. Implement geometry and caller adaptations coherently, integrate the HUD/focus behavior, then complete the acceptance checks before opening an implementation PR. A code rollback can restore the previous presentation without changing stored bytes. This planning branch contains no runtime edits and remains reviewable before implementation begins.
