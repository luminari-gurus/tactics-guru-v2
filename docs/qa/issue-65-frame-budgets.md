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

## Clean candidate and deployed results

Runtime `0d36301946ea393470a69c76c3c3096a2429b5ca`, clean. [Candidate proof](issue-65/candidate-proof.json), [candidate battle](issue-65/candidate-battle.json), [deployed proof](issue-65/deployed-proof.json), [deployed battle](issue-65/deployed-battle.json) each contain 18 samples. The collector and served runtime identities agree. Existing automatic Cloudflare Pages branch preview: https://work-issue-65-frame-budgets.tactics-guru-v2.pages.dev; served hashes match the clean build inventory. No release/Access changes or unmerged code were imported. Both deployed scenes use the same commit/browser/host/network/cache protocol and post-render method. Clean source-bound CPU/render profiles are also retained, independently of budget captures.

| Battle metric | Clean local maximum | Approved deployed maximum | Limit / disposition |
| --- | --- | --- | --- |
| Idle p50 | 16.8 ms | 16.7 ms | ≤16.7; one local failure retained, deployed passes |
| Idle p95 | 18.7 ms | 18.8 ms | ≤20; passes |
| Pan window p95 | 18.9 ms | 18.8 ms | ≤33.4; every window passes |
| Zoom window p95 | 19.6 ms | 19.9 ms | ≤33.4; every window passes |
| Move window p95 | 19.3 ms | 18.7 ms | ≤33.4; all 36 windows (initial enemy/player) pass |
| Cold usable | 595.6 ms | 846.1 ms | ≤2500; passes |
| Warm usable | 462.1 ms | 605.3 ms | ≤750; passes |
| Cold code | 391162 bytes | 392995 bytes | ≤400000; passes |
| Cold assets | 834688 bytes | 834688 bytes | ≤1500000; passes |

All 18 deployed battle samples pass all applicable gates with zero console/page errors. Every selection/pan response reaches the first rendered callback; actual visible change and deterministic replay are checked in the browser suite. This remains an engine proxy, excluding OS dispatch and physical scanout. The local mobile-landscape third warm sample has p50 16.8 ms; no local universal F1 pass is claimed or recapture used to erase it. Deployed acceptance is the issue's specified gate and passes on this single capture. [Per-sample assessment](issue-65/gate-evaluation.json) retains the failed local row. Floating calculation noise below 1e-6 ms (1 ns) is ignored explicitly; budgets are not rounded/relaxed. This only classifies values such as 16.700000017881393 as 16.7, never the 16.8 failure.

Proof remains stable: deployed worst p50/p95 16.7/18.4 ms, cold/warm usable 846.3/288.5 ms, cold code/assets 392995/1412374 bytes. Local proof p50/p95 16.7/18.5 ms. These captures support an application rendering-cost improvement with unchanged host settings; they do not establish a hardware guarantee.

## Verification scope and reproducibility

All budget captures ran sequentially without concurrent browser workloads on the host recorded in each JSON (Apple M5 Pro, Darwin arm64, Node 26.11.0, installed headless Chrome 155.0.8059.40). Desktop and Pixel 7 portrait/landscape are automated profiles, not physical-device certification. Each scene/build capture uses three fresh contexts with cold loads and same-context warm reloads. Deployed CDN edge cache is uncontrolled; all builds, conditions, resource timings and errors remain in raw evidence.

Commands (each output path initially under `/tmp`, then copied unchanged into `issue-65/`):

```sh
export PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
npm run build
npm run measure:fit -- /tmp/issue-65-candidate-proof.json
npm run measure:fit -- /tmp/issue-65-candidate-battle.json --scene battle
npm run measure:fit -- /tmp/issue-65-deployed-proof.json --url https://work-issue-65-frame-budgets.tactics-guru-v2.pages.dev
npm run measure:fit -- /tmp/issue-65-deployed-battle.json --scene battle --url https://work-issue-65-frame-budgets.tactics-guru-v2.pages.dev
```

The base and corrected-method captures used the same commands with their output labels, built at `e6aec78` and `0fe4f5a` respectively. No captures were rerun to hide a failing budget. The exact-runtime clean trace matches `0d36301` and its build inventory, while the earlier experimental cached trace remains explicitly dirty. No domain/content/session source differs from main; legal browser flows compare actual accepted state/events/RNG to the unchanged deterministic domain replay oracle for the same seed and commands.

| Issue acceptance | Evidence |
| --- | --- |
| AC1 matched proof/battle reproduction | Paired base, corrected-method and candidate local captures plus paired same-build deployed captures, raw intervals/counts/provenance/errors |
| AC2 measured causes and focused fixes | Retained CPU/render traces, shared immutable-shape texture change, before/after visual captures, unchanged domain replay oracle and actual-control checks |
| AC3 unchanged deployed F1/F2 and L1–L4 | Every deployed row/window in gate-evaluation.json passes; earlier failures and one local F1 failure retained |
| AC4 real selection/pan and proxy limits | Recorded first-render responses and browser visible transformed-picking/control assertions; OS dispatch/display scanout and physical acceptance remain under #64 |
| AC5 checks and existing release path | Existing Pages branch preview serves exact clean runtime; full configured verification results recorded below when complete |

Every specification scenario maps to these rows: deployed idle to AC3; actual workloads to AC3/AC4; changed measurement method to AC1; deterministic optimized run and loading to AC2/AC3; incomplete delivery policy is preserved for future failures, with all historical/current gaps retained. No physical #64 acceptance, Safari #66 fix, audio #62 delivery or parent #57/#1 closure is claimed. OpenSpec remains unarchived.

## Presentation restart regression and correction

The first complete browser run on `0d36301` recorded 165 passes and six failures (7.2 min): both restart-during-presentation cases failed in all three profiles. [Complete failure log](issue-65/browser-initial-failure.txt), [exact stack](issue-65/restart-stack.txt). This intermediate runtime has passing measured performance but fails gameplay restart acceptance and is not deliverable. Phaser destroys display-list children before the scene's shutdown callback cancels the animation. The old cancellation completion redraw now invokes `Image.setTexture` after those images have lost their scene binding, causing `Cannot read properties of undefined (reading sys)`.

The correction checks whether the root still belongs to a scene before the final redraw, while still destroying owned labels and resolving cancellation exactly once. Normal/hidden completion still redraws; disposed scene callbacks cannot mutate the new run. No cancellation API, extra lifecycle adapter or domain change was added. Existing failures are the meaningful RED regression; the strengthened restart test additionally asserts zero page errors. [Focused GREEN](issue-65/restart-green.txt): both cases pass in all three profiles, six tests in 10.5 s. Final full-suite and exact-build budget captures follow; all earlier failures remain retained. This addresses a regression exposed by this rendering change and does not claim the physical Safari #66 cause or fix.
