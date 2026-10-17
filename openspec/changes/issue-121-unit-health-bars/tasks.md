# Tasks

## 1. Approval and health geometry

- [ ] 1.1 Record explicit approval of this plan in proposal.md, refresh main/#119 status and preserve its geometry/feedback if merged; verify branch/base and approved scope before source edits.
- [ ] 1.2 Implement the pure curved-track/fill geometry and legacy palette helper with clamped proportions; add focused unit coverage for zero/full/out-of-range ratios and exact/adjacent 25%/50% boundaries, and verify those tests pass.

## 2. Renderer attachment and presentation

- [ ] 2.1 Allocate bounded noninteractive per-unit Graphics, derive displayed HP/catalog max HP, preserve numeric HUD and hide defeated bars; extend battle-report diagnostics and focused desktop screenshot/assertion coverage for full/damaged/defeated units, and record visual constants in the QA document.
- [ ] 2.2 Attach bars to sprite placement, movement/elevation/depth and camera scaling/fitted bounds with readable mobile sizing; add mid-movement refresh/resize, pan/zoom, crowded-unit/marker/feedback screenshots and verify attachment plus actual picking/drag/pinch/keyboard/modal behavior in Chromium and WebKit portrait/landscape.
- [ ] 2.3 Preserve pre/after presentation boundaries and finish/cancel guards, and rely on scene-owned cleanup; add real-control damage/defeat, suspension, repeated restart/count, save/Continue and run transition/healing checks, verify no stale bars/callbacks, and retain results/screenshots in QA evidence.

## 3. Integrated acceptance and delivery

- [ ] 3.1 Run all configured unit/content tests, both typechecks, production build, full browser suite with encounter/run-item posttests, focused desktop/mobile Chromium/WebKit health-bar configuration, strict OpenSpec and whitespace checks; map each of the six issue criteria to exact revision/results/screenshots and disclose any failure or missing evidence.
- [ ] 3.2 Review final diff against the approved plan, commit only this issue's source/tests/evidence/artifacts, push and create or reuse/attach its PR; verify remote head and PR contents, use Closes #121 only with all acceptance verified and otherwise open a draft with Refs #121.

## Workflow follow-up

- Keep the PR open for review; do not merge or archive the OpenSpec change before merge.
