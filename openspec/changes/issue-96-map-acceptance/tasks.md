# Tasks

Issue: [#96](https://github.com/luminari-gurus/tactics-guru-v2/issues/96). Branch: `branch/issue-96-map-acceptance`. Acceptance execution was authorized on 2026-10-14; boxes are checked only after evidence is recorded.

## 1. Bind inherited evidence

- [x] 1.1 Refresh main and #96/#97/#98/#99, record the tested revision and source/config/lockfile identity, and compare the child evidence with merged files; verify the acceptance report distinguishes inherited results from new execution and covers all six criteria.
- [x] 1.2 Map each criterion to the existing map contract, child QA, unit/browser assertions and known limits; verify each claimed result has a source or test reference and do not create duplicate requirements or tests.

## 2. Verify combined behavior

- [x] 2.1 Run the existing map unit matrix and root map browser suite on the pinned build, inspect all 18 combinations in desktop and emulated portrait/landscape, and record source/build identity, commands, outcomes and visual findings in the epic report; verify keyboard controls, seed transactions, default/metadata, unchanged topology/terrain/RNG, fallback and battle isolation against AC1–AC6.
- [x] 2.2 Build the configured prefix and reuse relative-route biome/art checks plus direct-entry/refresh inspection; verify the requested prefix and `data-commit` actually match, assets/fallback remain correct, and no results from absolute root routes are mislabeled as prefix checks.
- [x] 2.3 For any demonstrated coverage gap or reproducible contract violation, add only the missing assertion/minimal correction in the existing files and verify the regression fails before a fix and passes after it; otherwise record that no application/test change is necessary. Escalate behavior redesign into a revised plan.

## 3. Final acceptance and review

- [x] 3.1 Run applicable unit/content/type/build and configured browser regression checks, reusing exact-source historical broad results only when their binding is established; verify actual pass/fail/skip/retry counts and any unperformed checks are explicit. Run the full configured suite if source/tests change or inherited broad evidence cannot be bound.
- [x] 3.2 Finalize `docs/qa/issue-96-map-acceptance.md`, update the ongoing plan/tasks, and verify document links, strict OpenSpec validation and `git diff --check`; recommend closure only if all six criteria are supported, otherwise list the exact remaining blockers.

## Workflow follow-up

- After approval and completion, publish the result in a PR linked to #96; use `Closes #96` only when all criteria are verified. Do not merge, close issues manually, deploy or archive unrelated changes as part of this plan.
