# Issue #106 — signature animation acceptance

Updated 2026-10-14, Asia/Jerusalem. Implementation complete; integrated acceptance is in progress. See [handoff](../ongoing-projects/plan.md) and [OpenSpec tasks](../../openspec/changes/issue-106-ability-animations/tasks.md).

## Implementation and visual decisions

`BoardRenderer.animate` consumes an event-only descriptor, draws under the existing board root and acknowledges the already accepted command. Guarded Strike sweeps a gold/white blade toward the target and shows a shield plus Guarded at the fighter, including misses. High Shot has a shaft, arrowhead and fletching; Magic Missile has an orb/core/trail. Only successful resolved outcomes receive impact rings/rays. Result/damage is one target label; defeat is a separate row; guard sits below the actor. Basic/enemy feedback uses the same corrected target mapping.

One 560 ms tween has 252 ms travel/strike and 308 ms impact/feedback. This modest increase from the initial 280–420 ms estimate gives the minimum-size labels time to register. Initial screenshots showed that board-scaled 18 px text was too small at fit scale; labels now retain at least 14 CSS px and effects retain a minimum visual size. Positions, separation and sizes update under pan/zoom/fit. No bitmap generation or added assets are needed.

One idempotent finish path stops the tween, removes all temporary text/graphics, clears the pinned before snapshot and renders the accepted after snapshot only while the board is alive. The before snapshot remains visible during modal/layout refresh, preserving defeated targets until impact. No BattleScene, domain, content, save format, audio or dependency changes.

## Reproduction and source

- Implementation base: `60e1562` on `branch/issue-106-ability-animations`, based on main `6292b1c`. The first implementation commit containing this report identifies the source of the initial captures. Later verification is recorded below.
- Node 22+ bundled runtime; npm 11.19.1 via ignored `tmp/bin/npm.cmd`; OpenSpec 1.14.1 with `OPENSPEC_TELEMETRY=0`.
- Installed Edge **155.0.4283.45**, Playwright 1.63.0, one worker, configured timeouts, no retries. Desktop 1280×720; emulated Pixel 7 portrait 412×839 and landscape 915×412 (DPR 2.625). Rotation cases swap width/height.
- Serve the production build with the repository Playwright config. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`; prepend the local npm wrapper directory to PATH. No package or lockfile change is necessary.
- Focused boundaries are reached by the existing `BattleSession` and `playerDecision`, encoded with the real save codec and loaded through Continue. Tests then use action, target, review and confirm controls. These are seeded legal-boundary checks, not full-battle browser runs; existing seed-1/seed-2 browser battles supply the latter separately.

## Initial results

- `npm run test:unit`: **509 passed**, 31 files. The extended abilities suite freezes real dispatch results for miss/hit/critical/defeat/guard/missile feedback and checks unchanged inputs and next RNG draws.
- `npm run validate:content`: **77 passed**, two files.
- `npm run build`: both TypeScript configurations and production bundling passed. Existing large-chunk warning remains.
- `npm test -- tests/battle-animations.spec.ts`: **39 passed** across all three projects. All signatures have travel/impact, exact accepted state/events, saved-byte stability, confirmation locking, cancelled preview, completion cleanup, repeated visibility cancellation, modal open/cancel, rotation, restart in travel/impact, and reload/Continue checks.
- Added elevated-target and real BFCache checks: **12 passed** across the three projects. All three signatures returned through an actually cached document (`pageshow.persisted` asserted), preserved both save slots byte-for-byte before Continue, and resumed without historical effects or page errors.
- Full configured browser suite, existing BFCache regressions and `/prototype/` verification are pending; the PR stays draft until those checks and final evidence reconciliation complete.

Development corrections: the first new unit expectation omitted a real critical defeat; corrected to match dispatch. One keyboard test assumed Escape resets the board cursor; it now starts from the actual selection. An initial BFCache test option was placed inside a describe block; Playwright requires this worker option at file scope. These were test-development errors, not suppressed runtime failures; no retries or increased timeouts were used.

## Visual evidence

[Initial captures](issue-106-ability-animations/initial/) contain original screenshots and `animation.json` snapshots with fixture seed, accepted command/events, viewport, projected endpoints, transform and travel/impact progress. Filenames distinguish each signature and phase. Separate miss, critical/defeat, missile defeat and elevated/rotated impact images supplement the normal sequence. Screenshots were inspected individually and as contact sheets; slash/shield, arrow and orb remain distinct, target feedback is legible over the board/canopies, guard belongs to the fighter and defeat rows do not overlap damage. The existing large, scrollable HUD and fit-board size are unchanged; #108 owns controls redesign.

Examples:

- [Guarded Strike portrait impact](issue-106-ability-animations/initial/battle-animations-guarded--59079-exactly-one-accepted-result-mobile-portrait/guarded_strike-impact.png)
- [High Shot landscape impact](issue-106-ability-animations/initial/battle-animations-high-sho-a479b-exactly-one-accepted-result-mobile-landscape/high_shot-impact.png)
- [Magic Missile portrait travel](issue-106-ability-animations/initial/battle-animations-magic-mi-8fc46-exactly-one-accepted-result-mobile-portrait/magic_missile-travel.png)
- [Critical and defeat desktop feedback](issue-106-ability-animations/initial/battle-animations-high-sho-df618-ack-matches-resolved-events-desktop/high_shot-critical.png)

## Acceptance boundary

Initial focused evidence covers all seven issue criteria, with broad regression verification still required before using a closing issue reference. Physical Android/iOS, audio audibility and production deployment are not certified here. The tests use desktop Edge and mobile emulation. No manual deployment, merge or release tag is performed; existing hosting automation may build pushes.
