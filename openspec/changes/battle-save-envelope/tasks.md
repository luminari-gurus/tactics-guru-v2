# Tasks

Issue [#69](https://github.com/luminari-gurus/tactics-guru-v2/issues/69), a child of [#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58), assigned to `moshehbenavraham`; branch `work/issue-69-save-envelope`. See the [plan](../../../docs/ongoing-projects/battle-save-envelope/plan.md) for scope and AC1–AC7. All implementation tasks remain unstarted.

## 1. Representation evidence and contract

- [ ] 1.1 After the concrete plan is approved for implementation, pin the source/catalog and create deterministic normal, player/enemy, presentation-boundary, ended and 10,000-command fixtures; verify they are valid under existing domain dispatch/replay and document fixture provenance (AC1/AC4).
- [ ] 1.2 Compare snapshot and replay with one reproducible harness; retain code-unit/UTF-8 sizes, encode/parse/validate/reconstruct timings, repetitions and host/runtime conditions. Select one representation and verify that the format document records the measured rationale without mobile performance claims (AC1).
- [ ] 1.3 Specify envelope identity, independent format version, rules/content/RNG compatibility, exact payload shape, canonical digest coverage and finite limits; review supported boundary examples and reject-example fixtures against that documented contract (AC2).

## 2. Pure codec and continuation proof

- [ ] 2.1 Implement the selected pure codec with pre-parse text bounds and staged envelope/payload/version/integrity validation using existing primitives; verify meaningful malformed, oversized, unsafe-number, unknown-ID, invariant-invalid, corrupt and incompatible-version fixtures fail before state exposure (AC2/AC3).
- [ ] 2.2 Round-trip all accepted-boundary fixtures and compare state, next legal command result, RNG output/cursor and enemy decisions; verify pending previews/presentation objects are excluded and ended/command-limit semantics remain correct. Retain focused test results in the QA report (AC4).
- [ ] 2.3 Verify frozen input state/catalog and exact original text remain unchanged on success/failure, semantic replay rejects illegal shaped commands, and domain boundary checks pass. Remove the unselected runtime prototype and document failure result semantics (AC3/AC5).

## 3. Adapter handoff and integrated validation

- [ ] 3.1 Document the future storage/session handoff and remaining #58 backup/write-recovery, storage-error, namespacing, recovery-UI, restart and device acceptance; verify the codec has no live UI/session/storage integration and the parent remains open (AC6).
- [ ] 3.2 Run focused save/turn/session/RNG/AI/boundary checks, configured unit/content checks, both typechecks, production build, configured browser regressions, strict OpenSpec and whitespace validation. Retain exact results and clearly separate host fixtures from browser-persistence/hardware claims (AC7).
- [ ] 3.3 Audit AC1–AC7 against final code, format document, raw measurements and QA results; verify one representation remains, all limitations are explicit and no full save/resume or parent-epic completion is claimed (AC1–AC7).

## Workflow follow-up

- Keep issue #69, its parent #58, branch and plan links current. Publication approval covers planning; a subsequent implementation request is needed to begin the tracked tasks.
- After implementation is explicitly requested and validated, open the appropriate child-scoped PR. Do not close #58, merge or archive as part of planning.
