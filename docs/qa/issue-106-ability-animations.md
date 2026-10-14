# Issue #106 — signature animation acceptance

Updated 2026-10-14, Asia/Jerusalem. Implementation and browser acceptance complete for [PR #110](https://github.com/luminari-gurus/tactics-guru-v2/pull/110). See [handoff](../ongoing-projects/plan.md) and [OpenSpec tasks](../../openspec/changes/issue-106-ability-animations/tasks.md).

## Implementation and visual decisions

`BoardRenderer.animate` consumes an event-only descriptor, draws under the existing board root and acknowledges the already accepted command. Guarded Strike sweeps a gold/white blade toward the target and shows a shield plus Guarded at the fighter, including misses. High Shot has a shaft, arrowhead and fletching; Magic Missile has an orb/core/trail. Only successful resolved outcomes receive impact rings/rays. Result/damage is one target label; defeat is a separate row; guard sits below the actor. Basic/enemy feedback uses the same corrected target mapping.

One 560 ms tween has 252 ms travel/strike and 308 ms impact/feedback. This modest increase from the initial 280–420 ms estimate gives the minimum-size labels time to register. Initial screenshots showed that board-scaled 18 px text was too small at fit scale; labels now retain at least 14 CSS px and effects retain a minimum visual size. Positions, separation and sizes update under pan/zoom/fit. No bitmap generation or added assets are needed.

One idempotent finish path stops the tween, removes all temporary text/graphics, clears the pinned before snapshot and renders the accepted after snapshot only while the board is alive. The before snapshot remains visible during modal/layout refresh, preserving defeated targets until impact. No BattleScene, domain, content, save format, audio or dependency changes.

## Reproduction and source

- Implementation base: `60e1562` on `branch/issue-106-ability-animations`, based on main `6292b1c`. The first implementation commit containing this report identifies the source of the initial captures. Later verification is recorded below.
- Bundled Node **24.19.0**; npm 11.19.1 via ignored `tmp/bin/npm.cmd`; OpenSpec 1.14.1 with `OPENSPEC_TELEMETRY=0`.
- Installed Edge **155.0.4283.45**, Playwright 1.63.0, one worker, configured timeouts, no retries. Desktop 1280×720; emulated Pixel 7 portrait 412×839 and landscape 915×412 (DPR 2.625). Rotation cases swap width/height.
- Serve the production build with the repository Playwright config. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`; prepend the local npm wrapper directory to PATH. No package or lockfile change is necessary.
- Focused boundaries are reached by the existing `BattleSession` and `playerDecision`, encoded with the real save codec and loaded through Continue. Tests then use action, target, review and confirm controls. These are seeded legal-boundary checks, not full-battle browser runs; existing seed-1/seed-2 browser battles supply the latter separately.

## Initial results

- `npm run test:unit`: **509 passed**, 31 files. The extended abilities suite freezes real dispatch results for miss/hit/critical/defeat/guard/missile feedback and checks unchanged inputs and next RNG draws.
- `npm run validate:content`: **77 passed**, two files.
- `npm run build`: both TypeScript configurations and production bundling passed. Existing large-chunk warning remains.
- `npm test -- tests/battle-animations.spec.ts`: **39 passed** across all three projects. All signatures have travel/impact, exact accepted state/events, saved-byte stability, confirmation locking, cancelled preview, completion cleanup, repeated visibility cancellation, modal open/cancel, rotation, restart in travel/impact, and reload/Continue checks.
- Added elevated-target and real BFCache checks: **12 passed** across the three projects. All three signatures returned through an actually cached document (`pageshow.persisted` asserted), preserved both save slots byte-for-byte before Continue, and resumed without historical effects or page errors.
- Full configured browser suite: **399 passed**, zero failures, skips or retries, in 20.3 minutes. [Per-case results](issue-106-ability-animations/full-browser.json) retain all titles, projects, statuses and durations. This includes all existing BFCache cases, completed seed-1/seed-2 battles, repeated effect cleanup, exact replay/events/RNG agreement and sound-on/off regression behavior.

## Main integration

Main advanced to `220d40f` (PR #109) during the full run. Integrated without conflicts as `00687ed1446ab308330735c213ea325ca7528323`, preserving branch history. Its three new encounter modules are outside the live production import graph. Fresh combined checks passed: **561 unit tests** (32 files), **129 content checks** (three files), both TypeScript configurations and production build. A [byte comparison](issue-106-ability-animations/main-build-comparison.json) rebuilt the combined tree with the original served metadata and matched every one of the 10 emitted HTML/JS/CSS files. Public assets were unchanged. This preserves the full-suite evidence without asserting it was rerun after the merge.

The original served build metadata was `60e15629c2d333d9c41f2ae314447673504bda0e`, dirty true, with the implementation later committed as `d01e0bb`. Its main renderer bundle SHA-256 is `32748eb558f56da9933b7fb2263f7d3b55de580bbd452ae55db7dd28594b03b0`. Normal combined builds use the actual Git metadata; the fixed-metadata configuration was only an ignored verification tool.

The expanded signature checks passed **9/9** against the normal combined root build: all signatures in every profile reject self-target previews without effects/saves, cancel valid previews, confirm once and retain correct feedback/cleanup. [Results](issue-106-ability-animations/integrated-root.json).

The production `/prototype/` build passed **93/93 animation/persistence cases** (3.2 minutes), including route assertions, all signatures, restart/cancellation and both new/existing real BFCache regressions. [Results](issue-106-ability-animations/prefix-browser.json). Main's configured `npm run posttest` authored-encounter hook passed **18/18** (25.3 seconds); this uses its existing Vite development fixture, separately from the production prefix checks. [Results](issue-106-ability-animations/encounters.json). All final browser runs had zero failures, skips or retries. Expected corrupt-asset console errors belong to the deliberate failure tests. Large-chunk and color-environment warnings are unchanged.

Commands after integration:

```text
npm run test:unit
npm run build
node node_modules/@playwright/test/cli.js test tests/battle-animations.spec.ts --grep "real controls" --reporter=line,json
npm run build -- --base=/prototype/
PLAYWRIGHT_BASE_PATH=/prototype/ node node_modules/@playwright/test/cli.js test tests/battle-animations.spec.ts tests/battle-persistence.spec.ts --reporter=line,json
npm run posttest -- --reporter=line,json
npm run build
openspec validate issue-106-ability-animations --strict
git diff --check
```

The direct Playwright calls use the same configured projects/server; the new npm posttest hook was run separately once. Environment syntax above is conceptual; PowerShell uses `$env:PLAYWRIGHT_BASE_PATH='/prototype/'`, removed for root checks. Root output is restored at the end. The main merge's snapshot file incurred only test-generated line-ending churn; it was restored after verifying an empty semantic diff.

Development corrections: the first new unit expectation omitted a real critical defeat; corrected to match dispatch. One keyboard test assumed Escape resets the board cursor; it now starts from the actual selection. An initial BFCache test option was placed inside a describe block; Playwright requires this worker option at file scope. These were test-development errors, not suppressed runtime failures; no retries or increased timeouts were used.

## Visual evidence

[Initial captures](issue-106-ability-animations/initial/) contain original screenshots and `animation.json` snapshots with fixture seed, accepted command/events, viewport, projected endpoints, transform and travel/impact progress. Filenames distinguish each signature and phase. Separate miss, critical/defeat, missile defeat and elevated/rotated impact images supplement the normal sequence. Screenshots were inspected individually and as contact sheets; slash/shield, arrow and orb remain distinct, target feedback is legible over the board/canopies, guard belongs to the fighter and defeat rows do not overlap damage. The existing large, scrollable HUD and fit-board size are unchanged; #108 owns controls redesign.

Examples:

- [Guarded Strike portrait impact](issue-106-ability-animations/initial/battle-animations-guarded--59079-exactly-one-accepted-result-mobile-portrait/guarded_strike-impact.png)
- [High Shot landscape impact](issue-106-ability-animations/initial/battle-animations-high-sho-a479b-exactly-one-accepted-result-mobile-landscape/high_shot-impact.png)
- [Magic Missile portrait travel](issue-106-ability-animations/initial/battle-animations-magic-mi-8fc46-exactly-one-accepted-result-mobile-portrait/magic_missile-travel.png)
- [Critical and defeat desktop feedback](issue-106-ability-animations/initial/battle-animations-high-sho-df618-ack-matches-resolved-events-desktop/high_shot-critical.png)

## Acceptance boundary

Every #106 criterion has fresh evidence:

1. **Recognizable effects through normal controls:** three real-control cases per project, inspected travel/impact images, and complete seed-2 battles using all signatures.
2. **Faithful outcomes:** frozen dispatch fixtures plus browser hit/miss/critical/guard-on-miss/defeat cases. Magic Missile has damage and impact without an invented attack roll.
3. **Presentation only/exactly once:** unchanged domain/content/save/audio diff; accepted state/events and save bytes match during/after effects; full battles match replay including RNG; rejected/cancelled previews do not commit.
4. **Gating/repeated use:** disabled controls and repeated confirmation during paused effects; full battles assert baseline object counts and absent effects at every settled decision; final player/enemy/ended phases remain usable.
5. **Cleanup/lifecycle:** repeated visibility cancellation, restart-dialog cancellation, restart during travel/impact for every signature, reload/Continue and actual cached-document returns; existing movement/enemy/recovery regressions pass. Visibility events are synthetic; BFCache return is real and explicitly asserted.
6. **Alignment/readability:** before/during pan/zoom, elevated targets, rotated viewports, all three profiles, inspected labels and distinct non-color-only shapes. No transient object accumulation.
7. **Verification:** 561 unit, 129 content, both typechecks, root/prefix builds, 399 full browser cases, 9 integrated root assertions, 93 prefix cases and 18 encounter cases; strict OpenSpec and whitespace/link checks.

Physical Android/iOS, audible playback and production deployment are not certified here. The tests use desktop Edge and mobile emulation. No PR merge, manual deployment or release tag is performed; only current main was integrated into the feature branch. Existing hosting automation may build pushes. Review and merge remain the next workflow step; #108's controls redesign remains separate.
