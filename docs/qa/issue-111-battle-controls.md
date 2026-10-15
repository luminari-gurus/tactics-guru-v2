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

## Responsive HUD chunk

Source commit: `057166e2bae9d4e2249d379964bfc447179a5b72`, dependent on [PR #118](https://github.com/luminari-gurus/tactics-guru-v2/pull/118) at `ba47b0a`. One existing HUD and native dialog owner remain. The shell supplies one measured drawable rectangle to fitting, navigation, CSS canvas clipping and the captured-pointer boundary. Feedback labels move together within that region so damage/defeat text remains distinct at small sizes. Actor and control scrolling are independent.

Fresh focused evidence: **652/652** unit tests; **24/24** browser acceptance cases across desktop, emulated portrait and landscape; then **12/12** final focused cases after adding target-inspection assertions, adapting the asset-base portrait selector and resetting each screenshot layout to fit. Both focused runs had zero failures, retries or skips. Production build, 167 content checks, both typechecks and strict OpenSpec passed. Reports: `tmp/hud-unit.log`, `tmp/hud-acceptance-v2.json`, `tmp/hud-final-focus.json`, and their corresponding artifact directories. The full configured regression run remains pending below.

The first integration probe had 44 passes and four failures: a formerly visible tile was now behind the intentional canvas clip, and the single changing actor image caused repeated portrait requests. The test now selects a visible central raised tile; the HUD reuses one loaded image per unit type and shows only the current actor. A subsequent focused run exposed a DOM click event being passed as an inspection unit ID; the callback now explicitly invokes inspection without that event. These repairs are covered by the passing cases above. An initial full run was stopped early to repair an obsolete `#battle-party img` asset test selector; its partial progress is not claimed as a full pass.

### Responsive and visual evidence

Fresh fitted runtime captures, with a real restart before each layout: [1280×720](issue-111-battle-controls/responsive-1280x720.png), [412×915](issue-111-battle-controls/responsive-412x915.png), [915×412](issue-111-battle-controls/responsive-915x412.png), [320×568](issue-111-battle-controls/responsive-320x568.png), [568×320](issue-111-battle-controls/responsive-568x320.png). The same sizes with 200% text plus synthetic top/right/bottom/left insets of 24/24/34/24px are saved with the `-stress` suffix, including [small portrait](issue-111-battle-controls/responsive-320x568-stress.png) and [small landscape](issue-111-battle-controls/responsive-568x320-stress.png). Actor information and controls stay reachable by their own scrolling; clipped enlarged text in an unscrolled capture is not hidden content.

[Measurements](issue-111-battle-controls/responsive-measurements.json) record actual DOM regions, 44px control dimensions/reachability and computed contrast. Normal drawable heights are 576.09, 292.78, 307.09, 202.22 and 215.09px respectively. Stress retains 30% normally and 55% in short landscape, allowing only 0.02px CSS rounding. Captions are excluded. No page horizontal overflow or region/control overlap was observed. Measured text/button contrast is **10.69:1**, hint/button **7.50:1**, and control edge/button **4.34:1**. These are the actual rendered pairs, not a blanket accessibility conformance claim.

Zoomed-edge feedback retains legible, separate result/defeat labels inside the drawable region: [320px portrait](issue-111-battle-controls/feedback-320.png), [568px landscape](issue-111-battle-controls/feedback-568.png). These presentation cases load a boundary reached by the legal simulation, then use actual controls; they are not evidence of completing a battle through the UI.

### Selectors and state feedback

Stable action hooks remain `[data-action=move|basic|signature]`, `#battle-move`, `#battle-next`, `#battle-target`, `#battle-selection`, `#battle-preview`, `#battle-review` and `#battle-cancel`. Named signatures are displayed directly; tests use the stable action hook instead of the old `Signature:` prefix. `#battle-active` announces phase/round, `#battle-actor-name` announces identity, and HP, stats, actual Guarded state and budgets are separate actor fields. `#battle-portraits img` replaces `#battle-party img` for asset checks.

`#battle-party` now opens inspection; `#battle-inspect-target` opens the selected unit. Unit navigation stays inside the same dialog and closing returns to the original invoker. Live state, RNG, actor and pending preview remain unchanged when inspecting allies or enemies. `#battle-target-info` is independent of both actor and preview. Basic attack spends the action without Guarded; Guarded Strike displays the actual +2 AC / −2 accuracy status in actor and inspection.

`#battle-log-open` opens the bounded event log inside the same modal; `#battle-log` remains the list. Sound/retry, save/recovery and restart selectors remain unchanged. Nonmodal Escape/Cancel share intent clearing and focus enabled Move or Wait. Idle, selection and invalid preview expose descriptive text; spent buttons say Spent; enemy, presentation, ended and error phases explain the gameplay lock. Wait still uses the immediate authoritative command path. No display timer releases input.

## Remaining acceptance

Complete configured browser/posttest verification, the integrated lifecycle/state acceptance map and final publication remain open. Prototype evidence is a design reference only. Full battle state/lifecycle acceptance will be recorded here as each corresponding OpenSpec task is verified.

No physical Android/iOS, screen-reader, deployment or release-certification claim is made. #111 requires browser responsive acceptance; other device/release issues remain separate.
