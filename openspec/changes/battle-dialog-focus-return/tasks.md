# Tasks

## 1. Restore usable focus

- [x] 1.1 Extend existing battle-loop checks for Escape/Cancel and presentation focus, and persistence checks for replacement modals; retain a failing cancellation result on baseline before the repair.
- [x] 1.2 Reorder the existing dialog close callback/focus path and preserve replacement-dialog focus; prove the targeted checks pass on all three configured browser profiles and document the regression in a focused QA note.

## 2. Verify and publish

- [x] 2.1 Run unit/content checks, both typechecks, production build, affected browser suites and strict OpenSpec/whitespace checks; record actual results, then commit/push a focused independent PR and verify remote parity.

## 3. Address PR #113 review

- [x] 3.1 Reproduce held Enter resetting both saved slots and BODY focus after keyboard Continue in the existing persistence browser suite.
- [x] 3.2 Consume repeated Enter/Space button activation, reject unusable invokers, preserve replacement-modal focus, and pass the regressions across all three profiles.
- [x] 3.3 Run local unit/content, typecheck, build, affected browser and encounter checks; make the existing animation lock check target the board explicitly after asserting usable fallback focus, update QA/spec evidence, publish and resolve verified review threads with remote parity.

## Workflow follow-up

- Keep this change unarchived until reviewed and merged. Runtime redesign #111 stays gated on #108 design acceptance.
