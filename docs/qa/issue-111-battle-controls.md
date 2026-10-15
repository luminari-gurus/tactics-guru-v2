# Issue #111 — responsive battle controls verification

Updated 2026-10-15 (Asia/Jerusalem). Implementation is in progress; this record does not yet establish all seven issue criteria. See the [continuation plan](../ongoing-projects/plan.md) and [OpenSpec tasks](../../openspec/changes/issue-111-responsive-battle-controls/tasks.md).

## Geometry chunk

Source commit: `3a645ca0a412ab3e2de73fbb1ce4a821094ad1d3`, based on planning head `9fea4faf` and main `4e601480`. The tests ran against these unchanged source/test objects before the source commit. Shared fit/clamp now takes a canvas-coordinate `{x,y,width,height}` region, with the fit margin applied once. Battle, proof, content-smoke and encounter callers explicitly retain their existing below-panel area in this chunk. The responsive shell follows in the dependent PR.

Fresh local checks:

- `npm run test:unit`: **651/651**, 38 files. Four added cases cover offset fit containment, translation, padding and relative clamp limits.
- `npm run build`: **167/167** content checks, both TypeScript configurations and production build passed. Existing large-bundle warning remains.
- `playwright test tests/board.spec.ts tests/content-loading.spec.ts tests/battle-board.spec.ts --grep 'shows the complete|content smoke: success|selection labels|authored camera|raised' --reporter=json`: **12/12**, no failures, retries or skips, across all three configured profiles. Covers proof fit/restart, content-smoke resize, live battle navigation preservation and orientation/zoom bounds.
- `playwright test -c playwright.encounters.config.ts --reporter=json`: **18/18**, no failures, retries or skips. Covers every authored encounter's geometry, resize, transformed picking and teardown. The portrait fitted ruined-approach screenshot was inspected: complete board and raised unit art remain visible.
- Strict OpenSpec and `git diff --check` passed. A generated authored-encounter snapshot had only line-ending differences; normalized content was checked against HEAD before restoring it.

Browser: installed Edge 155, selected using `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`; repository Playwright, one worker. Reports are retained under ignored `tmp/geometry-unit.log`, `tmp/geometry-build.log`, `tmp/geometry-browser.json`, `tmp/geometry-encounters.json` and `tmp/geometry-encounter-artifacts/` in the active worktree. Commands used the temporary npm wrapper documented in the plan; dependencies and lockfile were unchanged.

## Remaining acceptance

The rail/dock, real drawable-height floors, enlarged text/safe-area stress, independent actor/inspection/target feedback, focus/gesture integration and complete configured browser/posttest verification remain open. Prototype evidence is a design reference only. Full battle state/lifecycle acceptance will be recorded here as each corresponding OpenSpec task is verified.

No physical Android/iOS, screen-reader, deployment or release-certification claim is made. #111 requires browser responsive acceptance; other device/release issues remain separate.
