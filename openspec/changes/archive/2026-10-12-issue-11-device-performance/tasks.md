# Tasks

## 1. Approval and scene capture

- [x] 1.1 Record explicit caller approval of this published plan in proposal.md before implementation; verify the conversation approval identifies this change.
- [x] 1.2 Add RED-first scene-option/readiness and mixed-build/error tests to existing measurement tests, then implement proof-default/battle collector support; verify focused unit tests and both scene captures, and document actual invocation in the issue-11 QA note.

## 2. Battle performance evidence

- [x] 2.1 Add RED-first bounded frame/workload/interaction and hidden/restart tests to existing measurement tests; wire battle update/render/input timing without domain imports or mutations; verify focused unit and real-browser timing assertions, and document sample definitions.
- [x] 2.2 Capture real selection, pan, zoom and legal move workloads through visible controls with idle/workload distinctions and input-to-visible results; verify raw results include actions/counts/build/conditions and no stale samples after restart, and document F1/F2/I1 comparisons.
- [x] 2.3 Record local cold/warm battle and proof captures without competing browser workloads; verify exact clean source/build identity, resource classification and raw failures, and publish baseline comparison plus L1–L4 results without claiming loopback proves deployed acceptance.

## 3. Browser and physical QA

- [x] 3.1 Extend existing battle-loop, input, layout and lifecycle checks where coverage is missing, using RED-first behavior regressions and real move/attack/signature/AI/win/loss controls; verify portrait/landscape/DPR, gesture suppression and suspension/restart coverage, and link actual results in the report.
- [x] 3.2 Publish the device/OS/browser/build/network matrix and per-scenario checklist for all four required browsers in both orientations; verify every issue acceptance item has an evidence row and all deferred scope is explicit. Record absent battle audio and separate proof audio evidence honestly.
- [x] 3.3 Capture the intended build on the approved existing authenticated beta release path; verify served commit, cold/warm/load/transfer/interaction/frame and console records, retaining failures or unavailable gates without Access/deployment changes.
- [x] 3.4 Under the caller-approved scope revision of 2026-10-10, document exact Chromium emulation and focused WebKit coverage, retain partial physical reports without certifying hardware, and transfer incomplete physical certification (#64), frame regressions (#65), intermittent Safari restart (#66) and audio (#62) to linked follow-ups. Original full physical acceptance is deferred, not passed.

## 4. Integration and delivery

- [x] 4.1 Run focused tests, `npm run test:unit`, `npm run validate:content`, `npm test` with a supported browser executable, `npm run typecheck`, `npm run build`, `git diff --check` and `openspec validate issue-11-device-performance --strict`; record actual commands/results and confirm pure-domain boundary tests still pass.
- [x] 4.2 Compare all five acceptance criteria, budgets and tasks with the delivered report; fix in-scope regressions with focused RED/GREEN proof or record blockers. Verify no emulation-only physical acceptance, historical device substitution or unapproved feature expansion.

## Workflow follow-up

- Commit/push only issue-specific changes and update the existing PR against main. Revised #11 completion covers automated validation and reproducible evidence with linked failures/gaps; no physical or passing-frame claim is justified.
- The caller explicitly authorized revising and closing #11 on 2026-10-10. Close only after the revised report and follow-up links are published. Do not merge or archive OpenSpec before merge; #1/#57 and acceptance follow-ups remain open.
