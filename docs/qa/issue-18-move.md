# Issue 18 diagnostic move validation

Implemented from `origin/main` at `9272060` on `codex/issue-18`.

The authored five-tile path runs for 2,000 ms, from (0, 0) through (1, 0), (1, 1), (2, 1) to (2, 2), crossing elevations 0, 1 and 2 and the raised tree's depth. Choosing the destination previews its tile outline. Start, destination and fixture controls lock during movement; restart remains available. Scene shutdown explicitly stops the tween and removes both scene-owned move-control listeners.

Validation:

- RED: `npm run test:unit -- tests/unit/move.test.ts` failed before implementation because the scripted-move module did not exist.
- `npm run test:unit`: 17 tests passed, including authored tile validation, interpolation and clamped endpoints.
- `npm run build`: strict `tsc --noEmit` and production Vite build passed. The existing Phaser bundle-size warning remains.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test -- tests/move.spec.ts`: 3 focused browser tests passed before expanded per-frame assertions.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`: 39 tests passed across desktop, mobile portrait and mobile landscape. Move tests sample actual rendered-frame updates to verify projected anchors, fractional elevation, shared depth ordering, and canopy alpha on both sides of the tree. They repeat interruption/restart and completion through the real controls, check stale completion does not change Idle, and verify controls restore. Final completion screenshots are generated under ignored `test-results/`.
- `git diff --check`: passed.

The test runner required permission to bind its localhost preview server. Installed Chrome was selected because the pinned Playwright browser executable was absent. Chromium mobile emulation does not certify physical iPhone Safari/Chrome or Android hardware. No physical devices were tested.
