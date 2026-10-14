# Tasks

Planning is complete when these tasks are concrete and validated; none is marked complete until the design work is performed after plan approval. This change delivers #108's design, not the runtime HUD. See [design.md](design.md) and [plan.md](../../../docs/ongoing-projects/plan.md).

## 1. Establish the design examples and hierarchy

- [ ] 1.1 Refresh the pinned HUD/animation baseline and record plan approval in `docs/ongoing-projects/plan.md`; document the source revision, existing actor/inspection/target behavior, Wait exception and top-panel board-fitting constraint in the issue design document, verified against the named code references.
- [ ] 1.2 Define the display-only Fighter, Ranger and Mage examples and full control-state catalogue; verify each displayed field/name against the current catalog/session and each state against issue acceptance criteria 2-5, with no invented combat rule or actor switching.
- [ ] 1.3 Sketch at most two placement options and select one coherent direction for refinement; document hierarchy, typography, palette and disclosure choices, verifying the real board bounds and all primary/secondary controls have an explicit place.

## 2. Produce and verify the responsive mockups

- [ ] 2.1 Build the standalone documentation prototype and export desktop 1280x720, portrait 412x915 and landscape 915x412 views with existing art; verify readable HP/status/actions, named signatures and acting/inspected/target distinction, and record responsive rules alongside the previews.
- [ ] 2.2 Add the idle/selected/preview/invalid/review/cancel/spent/enemy/presenting/outcome states; demonstrate their focus, available controls and explanatory feedback in the prototype, verifying Move/attack/signature confirmation, immediate Wait and the authoritative presentation lock remain accurately represented.
- [ ] 2.3 Verify 44x44 CSS px targets, safe areas, 320x568 and 568x320 layouts, enlarged text, scroll reachability, chosen contrast targets, labels, keyboard/focus return and non-color/non-hover feedback; retain measurements and any exceptions in the design document.
- [ ] 2.4 Demonstrate board visibility and overlay input capture across the three compositions using annotated bounds and a prototype board-event counter; verify actor/target and required controls stay visible/reachable and gestures beneath a dialog do not increment the counter, clearly separating this proof from unperformed live-game checks.

## 3. Review and hand off the selected design

- [ ] 3.1 Record the selected design and review disposition with one evidence link for every issue acceptance criterion; verify all three layouts and all representative states are accessible from the review entrypoint, without treating an unreviewed proposal as accepted.
- [ ] 3.2 Write the bounded runtime handoff, including files/selectors, any viewport rectangle/input changes, preservation of autosave/history/audio behavior and reuse of existing regression suites; create or reuse a linked implementation issue only if needed, and verify its relationship and scope against #108.
- [ ] 3.3 Validate the complete design package with strict OpenSpec validation, link/whitespace checks and a documented browser walkthrough; update the plan with actual evidence and remaining limitations, then commit/push design artifacts without live HUD changes.

## Workflow follow-up

- Runtime implementation requires its own approved scope and evidence; completing these design tasks does not certify #57/#58/#64/#66/#74 or close a runtime follow-up.
- Archive this OpenSpec change only after the design delivery is reviewed and merged according to the repository workflow.
