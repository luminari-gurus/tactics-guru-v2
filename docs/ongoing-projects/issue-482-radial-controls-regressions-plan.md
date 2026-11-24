# Issue #482 — Repair radial battle-control regressions

- Issue [#482](https://github.com/luminari-gurus/tactics-guru-v2/issues/482)
- Assignee [@moshehbenavraham](https://github.com/moshehbenavraham)
- Implementation [PR #484](https://github.com/luminari-gurus/tactics-guru-v2/pull/484) from `branch/issue-482-radial-controls-regressions`
- Planning base `cadcf4d5c720b5556928195fe8af10bdf5ecca13` on `main`, reviewed 2026-11-24 (Asia/Jerusalem)
- Previous handoff [#435 dungeon save feedback](issue-435-dungeon-save-feedback-plan.md)
- OpenSpec [issue-482-radial-controls-regressions](../../openspec/changes/issue-482-radial-controls-regressions/proposal.md)

## Implementation status

Implementation authorized on 2026-11-24. The existing dedicated branch matched
its remote at `d0a61fd4` before implementation. The unchanged application at
`cadcf4d5` built successfully in an isolated WSL checkout. The original three
cases finished with 3/9 Chromium and 2/6 WebKit passes, one worker and zero
retries. They reproduced all six CI failures plus invalid reselection and
offscreen cancellation on both Chromium mobile profiles. Baseline JSON,
traces and diagnostic screenshots are in
`tmp/issue-482` in that checkout
(`/home/aiwithapex/projects/tactics-482-browser.n1MoM7`).

- The WebKit diagnostic recorded a real hit on the clamped radial's disabled
  Special slice at the enemy's projected position. The reselection fixture
  now gives the radial room and checks that the next native tap will hit the
  canvas. It asserts the unavailable reason and accessible enemy label.
- Cancel plan began below the visible HUD scroller with page and HUD scroll
  both at zero. Its bottom reached 740.36px in the 568px WebKit portrait and
  519.875px in the 342px WebKit landscape. Move the existing button to the
  start of the same scroller and keep it visible with sticky positioning,
  including while the player is scrolled down. The HUD removes it on disposal.
- The desktop board bottom was 474.94px after the old padding change, still
  below the original Plan button's 453.42px bottom. The fixture now computes
  the caption growth from those measured edges and checks the resulting board
  still fits the controls before requiring repositioning.

The first fixed build passed all 15 original profile/case combinations on the
first attempt. Standard PR verification then passed on clean source
`d265e573d56ca1b5ca77d29ccca0a3703713498e` with Node 24.15.0. It covered
1,590 fast unit/content tests, both type scopes, two build integrations and
seven core browser journeys. The exact-build radial matrix and targeted
authored-run and dungeon cancellation witnesses use the same production bundle.

## Selection

Reviewed 43 open issues and five open PRs, with and without the `ready for work` label, and checked branch refs, recent merges, and the selected issue's GitHub development and dependency records. The repository and organization reported zero GitHub Projects. #482 was unassigned and had no linked branch, implementation PR, sub-issue, or formal blocker. The cross-references from [#208](https://github.com/luminari-gurus/tactics-guru-v2/issues/208) and [PR #481](https://github.com/luminari-gurus/tactics-guru-v2/pull/481) track CI measurement. The #366 label-fit branch is already in main.

#482 combines observable problems in shared battle controls with six repeated failures in the P1 browser verification effort. The [matched serial](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/45306223119) and [parallel](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/45306284527) runs reported the same outcomes. Their head `9fc9d44` and the planning base have identical inspected application, radial test/helper, browser profile, and package inputs. [#483](https://github.com/luminari-gurus/tactics-guru-v2/issues/483) separately tracks the two save-format test failures in those runs. [#417](https://github.com/luminari-gurus/tactics-guru-v2/issues/417) has a less certain current reproduction after its terrain-occlusion repair. The Shaman limit in [#476](https://github.com/luminari-gurus/tactics-guru-v2/issues/476) spans combat, saves, and replay compatibility.

## Outcome and implementation

Use the existing [battle radial spec](../../tests/battle-radial.spec.ts) as the acceptance witness. Start by retaining the six original failures, with the failed-job reports and screenshots from the linked runs. Recheck the three scenarios on a production build of the implementation base and capture the actual hit target and computed bounds on failure. Record each case's build, engine, viewport, and outcome.

1. **Invalid reselection and rail switch.** In desktop Chromium and both emulated WebKit orientations, prepare a legal move and choose the out-of-range enemy via the actual board input. Use the [board test helper](../../tests/helpers/battlePolicy.ts) and inspect the projected enemy point against the live board, radial controls, and overlap picking. The fixture currently assumes that 200px of distance from the first tile makes the second tap unobstructed. If that premise fails, select a legal starting tile that leaves the enemy hit point exposed. If an exposed tile still fails, trace the existing [scene selection](../../src/phaser/BattleScene.ts), [BattleSelection](../../src/ui/battleSelection.ts), and [radial/HUD feedback](../../src/ui/hud.ts) and repair the owner that drops the intended selection. Require the feedback to identify the newly selected enemy, explain the unavailable attack, clear the previous move, and leave Rail's Confirm disabled. Keep the adjacent case showing that a valid unchanged selection survives the switch. Neither path should change accepted battle state or replay commands.
2. **Cancel plan reachability.** In destination and target picking, trace the existing `#battle-plan-cancel` through the HUD's plan-waiting condition, the shared [battle layout](../../src/ui/battleLayout.ts), and the [responsive CSS](../../src/style.css). Measure the button, scroll container, and fixed shell against the actual viewport before any Playwright action can scroll it into view. Keep one native button and its existing cancel handler while the radial is closed and the plan is waiting. Verify a fully on-screen, unobscured control at least 44×44px at 320×568 and WebKit landscape, touch and keyboard activation on their applicable profiles, and a return to normal selection with no pending command, state/RNG change, or replay entry.
3. **Layout-only reflow.** At a fixed viewport, first verify that the fixture actually moves a drawable board edge across the old Plan button position and leaves enough board space for the radial. Replace the arbitrary 60px caption padding only if it no longer generates that crossing. Use a measured geometry change and assert the crossing before checking the result. If the menu still fails to move into the new bounds, repair the existing scene `ResizeObserver` and/or [radial repositioning](../../src/ui/battleRadial.ts) where the trace shows stale geometry. Assert that the tap-open menu stays open, its Plan button fits, and the pending move stays intact. Retain the adjacent held-gesture and true viewport-resize cases.

## Ablation and scope

Keep the one selection model and cancel path. An extra HUD control, a separate WebKit code path, or new gesture state has no demonstrated need. Use a fixture repair only when the original player interaction already meets the contract. Keep the target, command, tap-target, and geometry assertions so changing the setup cannot hide a player-facing regression. Combat rules, saving, the wider HUD redesign, and CI scheduling are outside this issue. The shared scene and HUD are used by [standalone battles](../../src/app/startBattleApp.ts), [authored runs](../../src/app/startRunApp.ts), and [dungeon battles](../../src/app/startDungeonApp.ts), so runtime changes must be checked through those consumers.

## Proof before opening the fix PR

Use one worker and zero retries against the same final production build for the three original scenarios. Discover the selected IDs with `--list` first and check them against the [Chromium regression](../../playwright.regression.config.ts) and [WebKit device acceptance](../../playwright.device-acceptance.config.ts) configs. Both orientations are emulated.

~~~sh
npm run build
npm run test:regression -- tests/battle-radial.spec.ts --workers=1 --retries=0 --grep "radial invalid reselection|radial plan cancellation|radial stays open on a layout reflow"
npx playwright test -c playwright.device-acceptance.config.ts tests/battle-radial.spec.ts --workers=1 --retries=0 --grep "radial invalid reselection|radial plan cancellation|radial stays open on a layout reflow"
~~~

- The focused proof must include the six originally failing combinations and all other applicable Chromium and WebKit profiles for those cases. Record exact case IDs, failures, and final source/build identity.
- Use the same configs for the adjacent valid Rail switch, compact landscape, and radial viewport resize cases. If board fitting changes, include the temporary-HUD reflow and viewport recentering cases in [battle-board.spec.ts](../../tests/battle-board.spec.ts). If selection or gesture behavior changes, run the affected [selection](../../tests/unit/battleSelection.test.ts) and [gesture](../../tests/unit/radialGesture.test.ts) units.
- Run `npm run verify:pr` on the fix head for both TypeScript scopes, the production build, and the core standalone battle, authored run, and dungeon journeys. If shared runtime behavior changes, confirm the affected radial interaction through a bounded legal run and dungeon battle using their existing browser witnesses. Use the [verification policy](../verification-policy.md) to add only coverage warranted by the final diff. Give #208 the focused result and leave its matched-batch and timing acceptance on #208.

## Verification evidence

- Standard PR receipt `verification-receipts/pr/1795505635286-310789/summary.json`
  records the clean source and six passing stages (155.7 seconds).
- Chromium regression passed 29 cases and WebKit device acceptance passed 18.
  That includes all 15 combinations for the three original scenarios. Three
  executions of the Chromium mobile CDP-only native touch case were skipped
  by its existing guard on desktop Chromium and both WebKit profiles. The
  case passed in both emulated Chromium mobile orientations. Zero retries.
- The focused final runs used the bundle from standard PR verification,
  including `battleLayout-NtChU9QZ.css`. Its SHA-256 is
  `baf5a7e4a64d5f09e33de7d6f2cf375273b81550d278554f4f7e1072d7184442`.
  The `base-*.json` and `exact-*.json` reports under `tmp/issue-482` retain
  the case IDs, selected profiles and individual outcomes. Screenshots of
  cancellation in both WebKit orientations were inspected.
- Added a temporary cancellation step to the existing legal authored-run and
  dungeon entry/resume journeys in the scratch checkout. All three witnesses
  passed on the verified bundle (authored run and dungeon in desktop Chromium,
  dungeon in portrait WebKit). They checked the real visible control, native
  activation and an unchanged battle session, then continued the original
  journeys. The run checked disposal and the dungeon checked a single control
  after resume. `consumer-witness.json` records three passing first attempts
  with zero report errors. The wrapper returned status 1 after the passing
  report. The scratch checkout was clean after cleanup and the witness inputs,
  output and screenshots are retained in `tmp/issue-482`.
- OpenSpec strict validation and Git diff whitespace checks passed. The
  evidence-only commit leaves the verified app, tests and build inputs
  identical to `d265e573`.

The three reported causes are resolved above. The matched-batch timing
measurement and the separate legacy dungeon assertions remain tracked in
[#208](https://github.com/luminari-gurus/tactics-guru-v2/issues/208) and
[#483](https://github.com/luminari-gurus/tactics-guru-v2/issues/483).

## Independent PR review

- On the original PR head, Tab advanced to fully covered HUD controls at
  568×234 after scrolling with a plan waiting. The new compact Radial test
  failed at the focused control's pointer hit check. Cancel plan now occupies a
  separate slot beside the scroller and uses the same cancel handler and
  scene cleanup. The test covers 568×234 and 480×234, including native
  activation and unchanged state, replay and pending intent.
- A separate inherited issue left a 31px scroll viewport at 480×234 on
  `cadcf4d5` even before planning. The strengthened Rail test failed on the
  base with only 25.81px of the focused Move button exposed in its narrowest
  case. The stacked HUD now reserves 48px and allows the actor area to shrink.
- The Chromium repair smoke passed the narrow Rail, compact Radial focus and
  original Radial cancellation cases. Prior Playwright receipts and review
  reproductions are retained separately.
- The shared ability-picker fixture had identical failures on `cadcf4d5`
  and the reviewed runtime at `720d4b66`. The fixture now checks the desktop
  44px control contract, retains its 66px touch button sizing check, and
  measures the exposed hit area and readable label after scrolling. All three
  Chromium profiles passed the repaired test. The fixture correction changes
  no application or build inputs from the reviewed runtime.
