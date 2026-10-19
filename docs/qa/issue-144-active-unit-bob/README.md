# Active actor bob — issue 144

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/144
Branch: `work/issue-144-active-unit-bob`
Base: `2f3a30f0db9bc128f7ae299ec03c80a393363fd4` (`main`)
Caller/assignee: `dubstylee`
Plan: localized chat plan, explicitly approved by Brian with “approved” on 2026-10-19.

## Behavior and boundaries

The living current turn actor bobs upward by 0–2 board pixels over a smooth 1800 ms cosine cycle while player controls are ready. The authoritative initiative/active-index state chooses the actor. Selecting a destination, targeting another unit, inspecting another unit or clearing a target does not transfer actor identity. Inspection/confirmation dialogs pause the cue; closing them starts a fresh cycle from the tile anchor.

Each frame sets an absolute sprite position from its projected terrain/elevation anchor. Tile rings, selection highlights, health bars, depths, picking and combat-effect anchors stay fixed. Board fitting reserves the 2px upward extent. Canopy fading conservatively includes that extent so foliage cannot flicker with each cycle. The animation pauses during all command presentations, page hiding, dialogs, battle end and reduced motion. Actor changes reset the previous sprite to its normal anchor. Scene shutdown removes its update and media-query listeners; restart and run encounters create fresh ownership.

Reduced-motion preferences are checked at startup and on change; static gold actor cues remain visible. No commands, turn costs, budgets, RNG, gameplay snapshots or save bytes are modified by the cue. No new assets, dependencies or animation framework were added.

`bobOffset` reports the intentional board-local displacement. `baseAnchorError` retains the measured screen-space distance from the original tile anchor; `anchorError` measures alignment against the anchor plus the declared offset. Frame diagnostics use the actual sprite world transform. Existing movement and health-bar tests now explicitly account for the offset rather than expecting a bobbing sprite to be stationary.

## Acceptance evidence

- The three `active bob:` cases in `tests/battle-animations.spec.ts` sample actual reported sprite coordinates over a complete cycle, bound the offset, verify health-bar anchoring and compare authoritative state and exact save slots before/after interaction.
- Real target selection, keyboard actions/cancel, inspection, camera zoom, touch activation, native reduced-motion changes, presentation impact, actor changes, hiding/return and repeated restarts are covered. Existing ability-animation tests retain signature travel/impact, defeat, elevation, transformed geometry and cleanup checks.
- `tests/battle-board.spec.ts` retains elevated movement, transformed picking and conservative canopy checks. `tests/unit-health-bars.spec.ts` retains health/readability and movement checks with fixed bars.
- The legal three-encounter run in `tests/run-progression.spec.ts` checks a fresh current-actor cue at every encounter, unchanged run snapshots during capture, and absence of board diagnostics after each encounter ends, alongside its existing authoritative replay assertions.
- Screenshots in this directory cover desktop, Pixel 7 portrait and Pixel 7 landscape with normal and reduced motion. They were visually inspected for anchoring, depth and readability. The three retained run screenshots show encounters 1, 2 and 3 on desktop, portrait and landscape respectively. Static screenshots show appearance; clock-driven coordinate assertions verify motion.

## Validation

- `npm run test:unit`: 41 files / 705 tests passed.
- `npm run build`: passed content validation (167 tests), strict application/domain type checks and production bundling. A separate final `npm run typecheck` also passed after the anchoring assertions were updated.
- `npx playwright test tests/battle-animations.spec.ts -g 'active bob' --reporter=line`: 9/9 passed across the three configured layouts.
- `npm test -- --reporter=line,json`: 551 passed, 1 failed, no skips or retries (30.9 minutes). All nine new bob checks and all three complete runs passed. See `main-suite-summary.json` for original counts and the retained error.
- `npx playwright test tests/battle-animations.spec.ts --project=desktop -g 'magic_missile: real controls' --repeat-each=3 --trace=on --reporter=line,json`: 3/3 passed with **no application or test changes** between the full-suite failure and reruns. See `keyboard-rerun-summary.json`.
- `npm run posttest`: 18/18 authored-encounter checks and 21/21 run-item checks passed. This was run explicitly because the main-suite exit code prevented npm from invoking its posttest hook.
- `git diff --check`: passed.

`validation-summary.json` records command results and source hashes for the two changed production files. Screenshots and diagnostics came from the modified production build based on the recorded base commit; they are not served production-deployment evidence.

The full-suite failure was the existing desktop Magic Missile self-target keyboard assertion: it received “Select a target” instead of “Unavailable” after Enter. The same test passed in both emulated mobile layouts and all three isolated desktop reruns. Its cause remains unconfirmed; this record does not classify the original run as fully passing or claim the failure was fixed. Traces were enabled for the successful isolated investigation runs; there was no trace for the original failure.

Environment: Node 22.21.1; Playwright 1.63.0 / Chromium 139.0.7258.5 using the existing executable at `~/Library/Caches/ms-playwright/chromium-1181/chrome-mac/Chromium.app/Contents/MacOS/Chromium`. Tests use local production preview except the configured dev-server encounter/run-item posttests. Mobile projects use browser/device emulation. `CAN_TEST_MOBILE` was missing/invalid and treated as `none`; no physical hardware or fresh WebKit testing is claimed. The standing caller instruction accepts Playwright device emulation.

During development, the first build found an invalid test-only TypeScript access to the helper's narrower session type; the assertion now reads the exposed pending-command attribute. The initial focused browser run passed 7/9 and failed two live reduced-motion assertions because they did not wait for Chromium's native media-query event delivery while the animation clock was frozen. After synchronizing the assertion with native event delivery, all 9/9 passed. These were test corrections; no reduced-motion implementation change was needed for that timing issue.

The first dependency install used the host default Node 23 and warned that Vitest does not support that odd-numbered version. All validation commands use supported Node 22.21.1. Existing Vite configuration-loader and bundle-size warnings remain.

## Main merge conflict resolution — 2026-10-19

Merged main `49af402` into the PR branch. The single conflict in `BattleScene.refresh` is resolved by keeping the authoritative idle-bob update together with main's targeting overlays and hover preview. The renderer/input/test changes from main merged automatically.

Validation of the combined tree: 708 unit tests passed; production build passed with 167 content checks and both TypeScript configurations. All 15 focused Playwright checks passed across desktop, mobile portrait and mobile landscape (`active bob|target overlays|hovered origins`), using installed Google Chrome. `git diff --check` passed. Existing Vite loader/chunk warnings remain. The full browser suite was not rerun for this merge; its original retained failure above is unchanged.
