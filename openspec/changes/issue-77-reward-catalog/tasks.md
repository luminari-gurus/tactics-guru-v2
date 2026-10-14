# Tasks

## 1. Reviewed catalog and ownership contract

- [ ] 1.1 Record caller approval of this specific plan, including item values and timing, in proposal.md; verify against the conversation before implementation.
- [ ] 1.2 Implement discriminated definitions, authored entries and pure validation in itemTypes.ts/items.ts/validateItems.ts; add items.test.ts covering authored values, bounds, invalid shapes/references/duplicates/accessors and an additional generic fixture entry; verify focused tests and both typechecks.
- [ ] 1.3 Document eligibility, before-battle context, owned stacks/instances/assignments, limits and replacement/projection examples in docs/run-items.md; verify each #77 content/ownership criterion maps to definitions or explicit #78/#80 handoff.
- [ ] 1.4 Add item validation fixtures to the existing validate:content command; verify invalid authored input is rejected by the same runtime validator and content tests pass.

## 2. Deterministic reward offers

- [ ] 2.1 Implement pure offer generation/reading in rewards.ts using accepted reward boundaries and separate catalog/policy identity; add rewards.test.ts with independent golden outputs, reordered catalogs, fourth-item extensibility, input nonmutation, wrong-phase and malformed/stale/tampered offers; verify focused tests.
- [ ] 2.2 Extend docs/run-items.md with offer serialization, algorithm/version, claim intent, duplicate/overflow atomicity and newly claimed item use before next battle; verify examples against fixtures and record #78 commands, #79 persistence and #80 battle initialization/replay responsibilities without implementing those packages.

## 3. Integration and delivery

- [ ] 3.1 Run focused tests, configured full unit/content/browser suites, both typechecks, production build, strict OpenSpec validation and git diff --check; retain actual results and distinguish automated regression support from downstream UI/full-run/physical acceptance.
- [ ] 3.2 Compare implementation and documentation against all five #77 acceptance criteria and approved scope; verify task-specific diff, commit/push and create or reuse the PR, attaching it to this task. Use Closes only if every criterion is verified; otherwise use a draft with Refs and explicit gaps.

## Workflow follow-up

- Keep this change unarchived until merge; do not merge or deploy as part of this task.
