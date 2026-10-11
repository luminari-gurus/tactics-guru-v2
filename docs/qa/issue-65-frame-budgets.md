# Issue #65 performance evidence

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/65. Branch `work/issue-65-frame-budgets`, base `d60659d`. Caller approved plan `5d64d74` on 2026-10-11; approval recorded at `e6aec78`. All budgets remain unchanged; evidence is in progress.

## Unchanged baseline

Production source/build `e6aec78` is clean and application-identical to main `d60659d`. Sequential `npm run measure:fit -- /tmp/issue-65-base-proof.json` and `... /tmp/issue-65-base-battle.json --scene battle`, with installed Chrome via PLAYWRIGHT_CHROMIUM_EXECUTABLE, produced 18 samples each, no errors. Raw [proof](issue-65/base-proof.json) and [battle](issue-65/base-battle.json) retain exact host/build/resource information. Proof uses scene-update intervals; battle POST_RENDER. Battle idle median is ≥26.2 ms, worst p95 34.2 ms; worst workload p95 pan 50.4, zoom 34.6, move 127.8 ms. These failures are preserved, not a causal diagnosis.

## Measurement changes

Version 2 retains bounded raw idle intervals, samples both scenes after render and separates collector workload windows with a 50 ms settling margin. All initial enemy windows remain recorded; workloadStartIndex distinguishes the collector's player actions. Hidden/restart sampling rules, controls-usable timing and input-to-next-render timing are preserved. Historical methods/results remain unchanged. Raw export regression initially failed as expected; [RED log](issue-65/measurements-red.txt).

## Acceptance

F1 idle p50 ≤16.7 ms/p95 ≤20 ms; F2 pan/zoom/move p95 ≤33.4 ms; L1 cold usable ≤2500 ms; L2 warm usable ≤750 ms; L3 cold compressed code ≤400000 bytes; L4 cold assets ≤1500000 bytes. Engine next-render responses do not certify physical input/scanout. #64/#66/#62 and #57/#1 remain separate. No passing deployed or physical acceptance is yet claimed.

Comparable-method verification: 13 focused unit checks and six configured actual-control/restart browser checks pass. Baseline CPU profiles and gzip Chrome traces are retained alongside this report. Trace aggregates show proof 240 animation frames/552 GPU tasks/1085.2 ms aggregate GPU-task duration versus battle 225 frames/2244 tasks/6638.0 ms; these windows differ in duration/workload and are profiling clues, not a speedup comparison. Sampling shows JS is mostly idle; rendering submission/GPU-thread work is the main candidate. Reproduce the retained harness by copying `issue-65/profile-harness.mjs` to ignored `tmp/issue-65-profile.mjs`, starting the production preview on 4174 and running `node tmp/issue-65-profile.mjs <label>`. Profiles intentionally perturb execution and are separate from budget captures.

## Focused rendering remedy

Corrected-method clean runtime `0fe4f5a`: 18 samples per scene, raw [proof](issue-65/method-proof.json) and [battle](issue-65/method-battle.json). Every collector player window is non-overlapping. Battle still fails: idle medians ≥28.6 ms, p95 up to 34 ms; pan p95 up to 36.2, zoom 34.8, movement 118.8 ms. Measurement correction is not the remedy.

Phaser's installed Graphics renderer replays vector commands and switches submission paths between each graphics object and surface image. The 144 tile columns and 144 overlays are repeated immutable shapes between accepted presentation changes. The focused change caches shared column textures by elevation and overlay textures by the 16 flag combinations, with per-tile images retaining placement/depth. Raster density is maximum fitted scale × maximum zoom (6), matching canvas density 1 at maximum display scale. Textures belong to the game's manager and are reused across scene restarts, without network assets or dependencies. Foliage, rings, movement, picking and combat are unchanged.

Separate instrumented harness before/after: battle idle 30.2/33.3 ms → 16.6/18.5 ms p50/p95; proof 16.7/18.4 → 16.7/18.5. Aggregate GPU-task time/rendered frame drops about 29.5 → 5.0 ms (overlapping trace aggregates are clues, not literal GPU utilization). Cached battle records 396 animation frames/879 GPU tasks/1983.8 ms aggregate GPU-task duration versus original 225/2244/6638.0. CPU/raw traces and [before](issue-65/base-board.png)/[after](issue-65/cached-board.png) visual comparison are retained. Candidate profiling is a dirty experimental build, explicitly identified in diagnostics; clean budget captures follow. Nine configured canonical-unit/restart, elevated-picking and real-control diagnostics checks passed in 29.9 s. This is a pure rendering-cost change, supported by paired traces rather than an invented functional defect or timing assertion in CI.
