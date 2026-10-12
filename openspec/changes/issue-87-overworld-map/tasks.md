# Tasks

## 1. Approval and generator comparison

- [ ] 1.1 Verify explicit approval of this published proposal/design/spec and record the approval date/reference in proposal.md before application or test edits; recheck branch identity and issue ownership.
- [ ] 1.2 In isolated scratch experiments, inspect the exact rot-js 2.2.1 tarball/import paths/license and compare focused package use, selective reuse/adaptation and local room/corridor generation. Verify 20×20 seed-matrix counts/connectivity/repeatability under clock perturbation, fixed work bounds, representative visual samples, fallback frequency and variation. Measure Vite/TypeScript compatibility and actual raw/gzip chunk/dist impact; write the selected recommendation and reproducible evidence in docs/qa/issue-87-overworld-map.md. Ship one approach and retain no unused candidate dependencies.

## 2. Pure generation contract

- [ ] 2.1 Implement the selected generator in src/map/generate.ts with uint32 seed/version, 400 row-major cells, 60–320 walkable cells, blocked border, cardinal connectivity, bounded attempts and validated deterministic fallback. Verify focused unit tests across the agreed seed set, including controlled exhaustion/fallback, invalid seeds, extreme seeds, equality and at least 90% distinct sequential-seed layouts. Document limits/version and fallback in the QA guide.
- [ ] 2.2 Include the generator in DOM-free strict typing and verify npm run typecheck. Prove isolation through local map-owned RNG state, unchanged battle fixture state/RNG and import/storage boundaries; add meaningful focused checks without a general test-hook framework.

## 3. Route and responsive inspection

- [ ] 3.1 Extract current battle/proof startup to src/app/startBattleApp.ts and add base-aware `/map` dispatch in src/main.ts, with separately imported src/map/view.ts and scoped style.css. Verify direct navigation and refresh in dev/production preview/root and temporary non-root base builds, plus existing proof/content-smoke/battle startup; record exact commands and route results.
- [ ] 3.2 Add the 20×20 readable grid, legend, uint32 seed input, Generate/New seed controls, visible focus, live status, input errors and fallback display. Verify keyboard/mouse/touch regeneration, same-seed equality, different-seed behavior, invalid-input preservation, 400 visible cells and usable portrait/short-landscape layout through focused browser tests and visual inspection. Document seed reuse and `/map` in README.
- [ ] 3.3 Verify route-specific network/module loading and untouched battle/legacy sentinel storage after repeated map operations; ensure no Phaser game, battle session/audio or storage accesses on `/map`. Record browser proof and bundle request identities in the QA guide.

## 4. Integration and delivery

- [ ] 4.1 Run full configured unit/content/browser suites, both strict typechecks, production build, strict OpenSpec validation and git diff --check. Map every issue acceptance criterion to actual evidence and retain failures/unavailable checks in the QA guide; review final diff against approved scope.
- [ ] 4.2 Commit only issue changes without attribution trailers and push; inspect the existing Pages branch preview for direct `/map` navigation and refresh where available, retaining URL/served build evidence. If hosted verification is unavailable, record it and leave that criterion unverified.
- [ ] 4.3 Check for an existing branch PR, then create/reuse and attach a PR against main with issue/approved-plan links and actual checks. Use Closes #87 only when all acceptance criteria are verified; otherwise use a draft with Refs #87 and the remaining work. Verify published branch and PR identities.

## Workflow follow-up

- Merge and archive require later workflow steps; do not merge, close the issue manually or archive before merge.
