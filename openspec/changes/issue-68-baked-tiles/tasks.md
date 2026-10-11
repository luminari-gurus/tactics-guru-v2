# Tasks

Caller approved plan commit 523e50e on 2026-10-11; implementation authorized. Issue #68, caller dubstylee, branch work/issue-68-baked-tiles, baseline e955e9d9f182a76f057ea69057c7a1ac6c0bd682. See proposal.md for selection evidence and design.md for the acceptance mapping.

## 1. Approval and baseline evidence

- [x] 1.1 Record explicit caller approval in design.md; verify issue/branch/base identity and unchanged approved scope before any runtime edit.
- [x] 1.2 Capture exact baseline battle/proof with the #65 v3 collector (18 cold/warm samples per scene), same host/browser/profile/seed conditions; retain raw build identities, startup/idle/pan/zoom/move intervals, errors and usable times under docs/qa/issue-68/ and begin the comparison report.
- [x] 1.3 Retain baseline fitted/max-zoom and elevated/overlay/canopy screenshots plus matched CPU/renderer traces using task-local profiling tooling; document actual dimensions/count/nominal texture memory and available or unavailable GPU evidence in the report.

## 2. Shared tile prototype and correctness

- [ ] 2.1 Implement actual terrain/elevation shared canvas variants in BoardRenderer.ts (adjacent helper only if needed), preserving density 6 and independent dynamic layers; verify actual variant keys/dimensions, one shared texture per pair, renderer texture limits, and generation timing with focused cache/browser checks.
- [ ] 2.2 Adapt surface diagnostics to actual baked image geometry and extend tests/battle-board.spec.ts for matching terrain corners, texture reuse and at least six restarts with constant cache bytes/count; retain fit/max-zoom and portrait/landscape visual comparisons proving terrain orientation, seams and depth order.
- [ ] 2.3 Run existing battle-board, battle-loop, input and lifecycle checks as applicable; verify elevated top/side picking, transformed selection, overlays, legal movement, canopy fading and safe restart with no errors. Document results and any visual/resource limitations alongside prototype details.

## 3. Comparison and disposition

- [ ] 3.1 Capture a build-identified prototype sequentially with identical v3 battle/proof workloads and matching instrumentation/profile/seed conditions; retain raw timing and CPU/renderer traces, generation cost, variant memory and cold/warm usable time. Verify clean consistent build identities and explicitly record unavailable GPU metrics.
- [ ] 3.2 Compare distributions and observed variability, renderer work and startup/memory costs without relaxing budgets or inferring an FPS gain from a 60 fps baseline; document adopt/reject decision against design.md criteria. Repeat matched measurements only if variance prevents a defensible decision.
- [ ] 3.3 Keep the justified prototype or restore baseline runtime on rejection; retain reproducible experiment evidence/tooling and report the final code choice. Verify every issue criterion/spec scenario has linked evidence and that no rejected runtime change remains in the final diff.

## 4. Final integration and delivery

- [ ] 4.1 Run npm run test:unit, full configured npm test with installed Chromium, npm run typecheck, npm run build and git diff --check against final runtime; record actual results and hardware limitations in docs/qa/issue-68-baked-tiles.md, and rerun relevant comparisons only if runtime changed from the measured candidate.
- [ ] 4.2 Audit every acceptance criterion and completed checkbox; commit only issue-specific changes without attribution lines, push and create/reuse/attach the PR. Verify issue, branch and PR links; use Closes #68 only with all criteria verified, otherwise draft with Refs #68 and remaining gaps.

## Workflow follow-up

- Do not merge the PR or manually close the issue.
- Archive OpenSpec only after merge.
