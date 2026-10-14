# Tasks

## 1. Restore usable focus

- [x] 1.1 Extend existing battle-loop checks for Escape/Cancel and presentation focus, and persistence checks for replacement modals; retain a failing cancellation result on baseline before the repair.
- [x] 1.2 Reorder the existing dialog close callback/focus path and preserve replacement-dialog focus; prove the targeted checks pass on all three configured browser profiles and document the regression in a focused QA note.

## 2. Verify and publish

- [ ] 2.1 Run unit/content checks, both typechecks, production build, affected browser suites and strict OpenSpec/whitespace checks; record actual results, then commit/push a focused independent PR and verify remote parity.

## Workflow follow-up

- Keep this change unarchived until reviewed and merged. Runtime redesign #111 stays gated on #108 design acceptance.
