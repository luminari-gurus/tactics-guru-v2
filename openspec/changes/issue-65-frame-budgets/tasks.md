# Tasks

Caller approved plan commit `5d64d74` on 2026-10-11. Work only on `work/issue-65-frame-budgets` for #65; preserve the existing #11 branch and unrelated work. See design.md for acceptance mapping and limits.

## 1. Approval and unchanged baseline

- [x] 1.1 Record explicit caller approval of this published plan in design.md; verify issue, branch and current-main integration state before any implementation.
- [x] 1.2 Capture unchanged base proof/battle sequentially under matched host/browser/build/cache conditions; retain command logs, served hashes, errors and raw available evidence under `docs/qa/issue-65/` and document all method differences in the task QA report.

## 2. Comparable measurements

- [x] 2.1 Extend existing measurements to retain bounded idle raw intervals and comparable POST_RENDER observation in proof/battle without changing domain behavior; verify percentile/count, hidden/reset/listener isolation with focused existing unit and browser checks and document the versioned observation method.
- [x] 2.2 Separate real zoom, pan, selection and legal move windows in the existing collector, distinguishing initial enemy movement; verify actual controls, finite waits, retained failures/provenance and non-overlap with focused collector/browser checks and paired base-method captures.

## 3. Measured causes and focused fixes

- [x] 3.1 Profile idle, isolated pan/zoom/move and matched proof windows; retain browser traces, relevant host conditions and causal analysis in QA. Verify each proposed remedy points to measured application cost rather than sampling/host artifacts.
- [x] 3.2 Add a meaningful failing regression for each confirmed functional cause, then implement the smallest supported presentation fix; use paired performance traces for pure cost changes. Verify replay/state/events/RNG equality, visible geometry/depth/canopy behavior, transformed picking, modal input and lifecycle/restart with relevant existing checks; record actual before/after results and unchanged limits in QA.

## 4. Integrated and deployed acceptance

- [x] 4.1 Run full configured unit/content/browser tests, both strict typechecks, production build, diff and strict OpenSpec checks; record exact commands/results and any failure. Confirm the final diff contains only #65 work and no temporary profiler machinery without a durable consumer.
- [x] 4.2 Through the existing approved release path, verify the clean served candidate build and collect paired proof/battle deployed evidence for all three profiles and three cold/warm pairs each. Verify every idle sample against F1, each pan/zoom/move window against F2, cold/warm usable times and code/assets against L1–L4, selection/pan first-render responses and zero unexpected errors; retain every failed/incomplete capture and physical/engine-proxy limitations.
- [x] 4.3 Compare every issue criterion and spec scenario with final evidence in QA; leave unverified criteria unfinished. Commit/push only task files and reuse/create the PR with exact approval/validation evidence. Use Closes #65 only if all criteria pass; otherwise draft with Refs #65 and concrete remaining gates. Verify PR attachment and links.

## Workflow follow-up

- Do not merge, manually close the issue, or archive this change before merge.
- Physical certification stays under #64, restart remediation under #66, audio under #62, and first-battle acceptance under #57/#1.
