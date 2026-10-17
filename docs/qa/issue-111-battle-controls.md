# Issue #111 — responsive battle controls verification

Updated 2026-10-17 (Asia/Jerusalem). PR #118 is merged. PR #119 integration and its review repairs are documented below; the [PR](https://github.com/luminari-gurus/tactics-guru-v2/pull/119) records the final merge state. See the [handoff](../ongoing-projects/plan.md) and [OpenSpec tasks](../../openspec/changes/issue-111-responsive-battle-controls/tasks.md).

## Merge integration — 2026-10-17

The PR head `2b419eff2f4183c3e9357d45b75caaeceb12bc70` was merged locally with main `0b317e35bb5c4ce713c242311f0673fc27923637` in `743bd0a1599df1b3c3e22a746f0b23086d2d1ad5`. Both GitHub review threads were resolved and the prior head approved. Conflicts were in startup wiring, styles and the handoff. The original implementation ancestry and newer run progression, health bars and WebKit focus repairs are preserved.

The initial integration failed the existing `/run` accepted-presentation reload case: the run entry point did not create the new actor container or drawable shell. `mountBattleLayout()` now supplies the same existing shell to both entry points. Run boundaries hide it and active encounters restore it. The regression passed across all three Chromium profiles after repair.

Fresh broad proof on `743bd0a`:

- Unit suite: **675/675** across 40 files.
- Build: **167/167** content checks, both TypeScript configurations and production Vite build passed.
- Complete configured browser suite: **480/480**, 160 each on desktop, portrait and landscape; 27.7 minutes, no retries or skips.
- Configured posttests: **18/18** encounters and **21/21** run-item cases.
- Strict OpenSpec and whitespace checks passed.

Visual review of the second-encounter screenshots then found a stale heading: Woodland Crossing still showed `Encounter 1 of 3 · forest ruins`. The added health/run regression reproduced that mismatch in WebKit. Follow-up `1fe9e09` derives both heading and progress from the authoritative current run snapshot, including after reward transitions.

The first focused WebKit pass also found two overly specific test expectations. Pointer activation leaves focus on the connected, visible, keyboard-accessible `#battle-scroll`; dialog dismissal correctly restores it. The test now accepts that valid pointer return point, then explicitly opens Review by keyboard and still requires the Restart fallback when cancellation disables Review. That assertion repair changed no modal production behavior.

A subsequent WebKit matrix on `1fe9e09` observed one intermittent failure: recovery focus was connected and correct, but the control was outside the visible scroll region. Three isolated repeats passed. Commit `2ba14d9` explicitly scrolls a successfully restored invoker into the nearest visible area; existing recovery tests also rotate while the modal is open. This preserves native focus ownership and adds no timer or command behavior.

Final verification on `2ba14d9edbad03df5520804e47161f848f405400` passed: **42/42** Chromium control/modal/recovery cases, **30/30** WebKit executions (three repeats of ten cases), and **25/25** health-bar/encounter-transition cases across desktop, Android portrait/landscape and iPhone portrait/landscape. The rebuilt application passed **167/167** content checks and both typechecks. Both posttest suites passed again: **18/18** encounters and **21/21** run items. No retries or skips occurred in these final runs. The corrected second-encounter captures show Woodland Crossing in both labels. The full 480-case result above predates the encounter-label and focus-visibility follow-ups; it is not presented as a second full-suite run. Subsequent documentation commits preserve the tested source/test objects.

Commands: `npm run test:unit`, `npm run build`, `playwright test`, `npm run posttest`, `playwright test tests/battle-loop.spec.ts --grep "player HUD"`, `playwright test -c playwright.device-acceptance.config.ts --grep "accepted player presentation reload|review: recovery dismissal|player HUD|keyboard-only"`, `playwright test -c playwright.health-bars.config.ts`, and `openspec validate issue-111-responsive-battle-controls --strict`.

Environment: Windows, repository Playwright, installed Edge for Chromium projects, installed WebKit for iPhone 13 portrait/landscape emulation, one worker, local dev/preview on `http://127.0.0.1:4173/`. Browser plugin unavailable. Visual inspection covered desktop/narrow standalone controls and second-encounter run captures; interaction checks include native modal focus, touch/pinch, commands, save/reload and encounter transitions. The standing repository policy accepts Playwright emulation for this work; no physical hardware or screen-reader test is claimed.

Logs and screenshots are retained outside the repository at `C:/Users/apexw/.codex/tmp/pr119-merge/`: `red.txt`, `green.txt`, `unit.txt`, `build-final.txt`, `full.txt`, `posttests.txt`, `webkit.txt`, `focus-probe.mjs`, `heading-red.txt`, `build-heading.txt`, `final-focus.txt`, `final-webkit.txt`, `final-health.txt`, `build-focus.txt`, `verified-controls.txt`, `verified-webkit.txt`, `verified-health.txt`, `verified-posttests.txt` and their artifact folders. `verify-final.ps1` retains the exact final command sequence, including the affected-control selection and three WebKit repeats. Earlier failure logs remain evidence, not unresolved product findings. Existing bundle-size warnings and separately tracked performance/release acceptance remain outside this merge.
## PR #119 review repairs — 2026-10-16

Repair source/test commit: `617830999bd4fc7539b47188b1b41b1bcf1f7b4e`, on `453cf2d`, containing main `21f5023`. Both published P2 findings were valid and reproduced before editing runtime code.

- **Target identity:** legal seed 1 at command count 64 has dead Ranger #2 and living Archer #5 at (3,8). The old panel/inspection/confirmation selected the corpse although the prepared command attacked #5. The HUD now prefers the living occupant, and confirmation reads command target IDs through the shared label formatter. The browser regression checks the dropdown, panel, inspection, unchanged pending state/save bytes, confirmation even after stale panel text is injected, and exact committed command/events/state.
- **Feedback overlap:** legal seed 1 at command count 73, panned upward before Guarded Strike at 320×568, made `Hit · −5` intersect `Guarded`. The existing per-unit clamping now collects colliding stacks into a separated column, preserving damage/defeat order and reserving hidden labels. Browser cases assert pairwise non-overlap and containment for all actor/target labels, for miss and defeat, at the reproduced edge, other pan directions, zoom and rotation to 568×320.
- The initial desktop probe reproduced both defects. A duplicate hit case also exposed a test assumption: the reviewed hit is lethal and emits three labels, including Defeated. The final cases explicitly cover miss (two labels) and defeat (three), avoiding duplicate fixture coverage.

Fresh completed verification:

- `npm run test:unit`: **652/652**, 38 files.
- `npm run build`: **167/167** content checks, both TypeScript configurations, production build passed.
- `playwright test tests/battle-animations.spec.ts --grep "shared corpse|panned-edge"`: **9/9**.
- `playwright test --reporter=line,json`: **429/429**, 143 per configured profile.
- `playwright test -c playwright.encounters.config.ts --reporter=line,json`: **18/18**.
- `playwright test -c playwright.run-items.config.ts --reporter=line,json`: **21/21**.
- The last three commands execute the complete `npm test`/posttest lifecycle separately so each retains its own JSON report and artifact directory. Each case passed on its first attempt; no retries or skips.
- `openspec validate issue-111-responsive-battle-controls --strict` and `git diff --check` passed.

Environment: Windows, Node 24.19.0, installed Edge 155.0.4283.45 through repository Playwright, one worker, `http://127.0.0.1:4173/`. Browser plugin not available; the existing Playwright workflow was used. Checks covered page identity, nonblank ready UI, no framework overlay, console/page-error health, rendered screenshots and the actual selection/inspection/review/confirm flow. Desktop confirmation shows living Archer #5; the small portrait impact screenshot shows Defeated, Hit and Guarded separately. Synthetic clock control freezes presentation for inspection; legal commands and saved snapshots come from the existing policy/session.

Evidence is retained outside the repository at `C:/Users/apexw/.codex/visualizations/2026/10/15/01a1416d-6c5e-7b61-9411-f14b6983e626/pr119/`: `baseline-tests.log`, `fixed-tests.log`, `unit.log`, `final-build.log`, `clean-build.log`, `full.json`, `encounters.json`, `run-items.json`, corresponding logs and artifact directories. Focused screenshots include `living-target-confirmation.png` and `guarded-defeat-prepan.png` under `fixed-artifacts/`.

The build's snapshot generator again changed only line endings; filtered blob identity was verified before restoring the snapshot and emitting a clean build stamped `6178309`. Final documentation commits preserve all runtime/test objects. The existing bundle-size warning remains. No fresh prefix-path run, physical-device/screen-reader acceptance or deployment certification is claimed. Earlier evidence below remains dated implementation evidence.

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

Fresh focused evidence: **652/652** unit tests; **24/24** browser acceptance cases across desktop, emulated portrait and landscape; then **12/12** final focused cases after adding target-inspection assertions, adapting the asset-base portrait selector and resetting each screenshot layout to fit. Both focused runs had zero failures, retries or skips. Production build, 167 content checks, both typechecks and strict OpenSpec passed. Reports: `tmp/hud-unit.log`, `tmp/hud-acceptance-v2.json`, `tmp/hud-final-focus.json`, and their corresponding artifact directories. The complete configured run is recorded below.

The first integration probe had 44 passes and four failures: a formerly visible tile was now behind the intentional canvas clip, and the single changing actor image caused repeated portrait requests. The test now selects a visible central raised tile; the HUD reuses one loaded image per unit type and shows only the current actor. A subsequent focused run exposed a DOM click event being passed as an inspection unit ID; the callback now explicitly invokes inspection without that event. These repairs are covered by the passing cases above. An initial full run was stopped early to repair an obsolete `#battle-party img` asset test selector; its partial progress is not claimed as a full pass.

### Responsive and visual evidence

Fresh fitted runtime captures, with a real restart before each layout: [1280×720](issue-111-battle-controls/responsive-1280x720.png), [412×915](issue-111-battle-controls/responsive-412x915.png), [915×412](issue-111-battle-controls/responsive-915x412.png), [320×568](issue-111-battle-controls/responsive-320x568.png), [568×320](issue-111-battle-controls/responsive-568x320.png). The same sizes with 200% text plus synthetic top/right/bottom/left insets of 24/24/34/24px are saved with the `-stress` suffix, including [small portrait](issue-111-battle-controls/responsive-320x568-stress.png) and [small landscape](issue-111-battle-controls/responsive-568x320-stress.png). Actor information and controls stay reachable by their own scrolling; clipped enlarged text in an unscrolled capture is not hidden content.

[Measurements](issue-111-battle-controls/responsive-measurements.json) record actual DOM regions, 44px control dimensions/reachability and computed contrast. Normal drawable heights are 576.09, 292.78, 307.09, 202.22 and 215.09px respectively. Stress retains 30% normally and 55% in short landscape, allowing only 0.02px CSS rounding. Captions are excluded. No page horizontal overflow or region/control overlap was observed. Measured text/button contrast is **10.69:1**, hint/button **7.50:1**, and control edge/button **4.34:1**. These are the actual rendered pairs, not a blanket accessibility conformance claim.

Zoomed-edge feedback retains legible, separate result/defeat labels inside the drawable region: [320px portrait](issue-111-battle-controls/feedback-320.png), [568px landscape](issue-111-battle-controls/feedback-568.png). These presentation cases load a boundary reached by the legal simulation, then use actual controls; they are not evidence of completing a battle through the UI.

### Selectors and state feedback

Stable action hooks remain `[data-action=move|basic|signature]`, `#battle-move`, `#battle-next`, `#battle-target`, `#battle-selection`, `#battle-preview`, `#battle-review` and `#battle-cancel`. Named signatures are displayed directly; tests use the stable action hook instead of the old `Signature:` prefix. `#battle-active` announces phase/round, `#battle-actor-name` announces identity, and HP, stats, actual Guarded state and budgets are separate actor fields. `#battle-portraits img` replaces `#battle-party img` for asset checks.

`#battle-party` now opens inspection; `#battle-inspect-target` opens the selected unit. Unit navigation stays inside the same dialog and closing returns to the original invoker. Live state, RNG, actor and pending preview remain unchanged when inspecting allies or enemies. `#battle-target-info` is independent of both actor and preview. Basic attack spends the action without Guarded; Guarded Strike displays the actual +2 AC / −2 accuracy status in actor and inspection.

`#battle-log-open` opens the bounded event log inside the same modal; `#battle-log` remains the list. Sound/retry, save/recovery and restart selectors remain unchanged. Nonmodal Escape/Cancel share intent clearing and focus enabled Move or Wait. Idle, selection and invalid preview expose descriptive text; spent buttons say Spent; enemy, presentation, ended and error phases explain the gameplay lock. Wait still uses the immediate authoritative command path. No display timer releases input.

## Integrated verification

The clean root build was stamped `7d333f1281b88120918d1663f8aebeae2f34feb7`. `npm test -- --reporter=json --output=tmp/hud-final-full-artifacts` passed **420/420** main cases, followed automatically by the configured **18/18** authored-encounter and **21/21** run-item posttests. All 420 main cases have exactly one passing attempt, no retries, failures or skips. The three projects each ran 140 cases: desktop, emulated portrait and emulated landscape. Reports/logs: `tmp/hud-final-full.json`, `tmp/hud-final-full.log`, and the main artifact directory. Expected decode errors deliberately induced by failure tests are not uncontrolled runtime errors.

No runtime or test source changed during that run. The root build's 68-file SHA-256 manifest is retained at `tmp/hud-root-build-manifest.json`. The normal build ran content validation and both typechecks; its snapshot generator changed only line endings, verified and restored before a final Vite emit stamped the tree clean. Later documentation commits preserve the same source/test objects. Dev-only posttests used those same objects with documentation changes present; they are fixture evidence, not a deployed release.

Real-control hero captures from this run: [Fighter](issue-111-battle-controls/actor-fighter.png), [Ranger](issue-111-battle-controls/actor-ranger.png), [Mage](issue-111-battle-controls/actor-mage.png). Both complete legal battle outcomes, replay equivalence, modal cancellation, input locking, exact primary/backup bytes under held keys, current-save history return, storage failures, audio ownership, diagnostic routes and reward/item flows passed.

## Acceptance map

1. **Responsive layout:** all five accepted sizes, 200% text and safe insets pass the measured drawable floors, 44px target, scroll reachability, contrast and no-overflow checks. Fitted screenshots and measurements are linked above.
2. **Live actor/inspection/target:** all three catalog signatures, HP/max HP, budgets and effective Guarded values pass. Both party/unit navigation and the selected-target entrypoint preserve actor, pending intent, state and RNG.
3. **Command states:** battle-loop and animation tests cover idle, selection, valid/invalid previews, review/confirm/cancel, spent resources, enemy, presenting, ended and error behavior. Legal full battles prove the reachable decision flow and deterministic results. Wait is immediate; frozen presentation tests retain authoritative locking.
4. **Geometry/navigation:** offset-region unit checks and real board tests cover fit, clamp limits, raised tops/sides, DPR, preserved camera on HUD changes, relative zoom on viewport changes, fresh-battle reset and bounded action feedback.
5. **Accessibility/input:** native labels, visible focus, tab order/trap/return, Move/Wait cancellation focus, text scaling, actual contrast pairs and pointer/touch/pinch/wheel boundaries pass. Resize, modal, restart and visibility changes discard stale captured gestures. Reduced-motion adds no decorative transition; static status remains available. No screen-reader conformance claim is made.
6. **Lifecycle:** the complete persistence/audio suites retain exact save bytes, keyboard Continue, replacement-modal focus, held Enter/Space protection, current-save history startup, recovery, restart and audio teardown. All 21 run-item cases pass with the shared modal owner.
7. **Verification/publication:** 652 unit, 167 content, both typechecks/build, 420 browser, 18 encounter and 21 run-item cases pass. Strict OpenSpec and whitespace checks pass. All 48 prefixed-path cases pass as recorded below; publication verification is in the continuation plan.

## Prefix verification and publication

A production build with `--base=/tactics-guru/` at `98f630cefc0a6324905c110dfee22cd362061588` passed **48/48** cases, one passing attempt each, no failures/retries/skips. Command: `playwright test tests/public-asset-base.spec.ts tests/battle-animations.spec.ts --grep "direct entry|at the base|content fixture|extracted map|cached return" --reporter=json`, with `PLAYWRIGHT_BASE_PATH=/tactics-guru/`. Reports: `tmp/hud-prefix.json` and `tmp/hud-prefix-artifacts/`. This covers direct/refresh asset and audio resolution, controlled failures and real cached return through Continue. Its source/test objects equal the root-run revision; later commits only update documentation/evidence. Final PR publication and remote parity are recorded in the continuation plan.

No physical Android/iOS, screen-reader, deployment or release-certification claim is made. #111 requires browser responsive acceptance; other device/release issues remain separate.
