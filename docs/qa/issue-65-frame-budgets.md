# Issue #65 performance evidence

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/65. Branch `work/issue-65-frame-budgets`, base `d60659d`. Caller approved plan `5d64d74` on 2026-10-11; approval recorded at `e6aec78`. All budgets remain unchanged; evidence is in progress.

## Unchanged baseline

Production source/build `e6aec78` is clean and application-identical to main `d60659d`. Sequential `npm run measure:fit -- /tmp/issue-65-base-proof.json` and `... /tmp/issue-65-base-battle.json --scene battle`, with installed Chrome via PLAYWRIGHT_CHROMIUM_EXECUTABLE, produced 18 samples each, no errors. Raw [proof](issue-65/base-proof.json) and [battle](issue-65/base-battle.json) retain exact host/build/resource information. Proof uses scene-update intervals; battle POST_RENDER. Battle idle median is ≥26.2 ms, worst p95 34.2 ms; worst workload p95 pan 50.4, zoom 34.6, move 127.8 ms. These failures are preserved, not a causal diagnosis.

## Measurement changes

Version 2 retains bounded raw idle intervals, samples both scenes after render and separates collector workload windows with a 50 ms settling margin. All initial enemy windows remain recorded; workloadStartIndex distinguishes the collector's player actions. Hidden/restart sampling rules, controls-usable timing and input-to-next-render timing are preserved. Historical methods/results remain unchanged. Raw export regression initially failed as expected; [RED log](issue-65/measurements-red.txt).

## Acceptance

F1 idle p50 ≤16.7 ms/p95 ≤20 ms; F2 pan/zoom/move p95 ≤33.4 ms; L1 cold usable ≤2500 ms; L2 warm usable ≤750 ms; L3 cold compressed code ≤400000 bytes; L4 cold assets ≤1500000 bytes. Engine next-render responses do not certify physical input/scanout. #64/#66/#62 and #57/#1 remain separate. No passing deployed or physical acceptance is yet claimed.

Comparable-method verification: 13 focused unit checks and six configured actual-control/restart browser checks pass. Baseline CPU profiles and gzip Chrome traces are retained alongside this report. Trace aggregates show proof 240 animation frames/552 GPU tasks/1085.2 ms aggregate GPU-task duration versus battle 225 frames/2244 tasks/6638.0 ms; these windows differ in duration/workload and are profiling clues, not a speedup comparison. Sampling shows JS is mostly idle; rendering submission/GPU-thread work is the main candidate. Reproduce the retained harness by copying `issue-65/profile-harness.mjs` to ignored `tmp/issue-65-profile.mjs`, starting the production preview on 4174 and running `node tmp/issue-65-profile.mjs <label>`. Profiles intentionally perturb execution and are separate from budget captures.
