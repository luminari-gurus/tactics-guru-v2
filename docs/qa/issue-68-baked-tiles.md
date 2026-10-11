# Issue #68 baked tile experiment

**Decision: retain the merged #67 renderer.** Baking reduces mobile-emulated renderer submissions, but the measured frame/loading results do not justify the extra texture memory and raster-generation/maintenance cost. The runtime prototype is preserved in commit `dbe9eba2654b1bc3271e9fba8070d0016921ce7e`; final application and browser-test files are restored to baseline. No runtime feature flag or alternative renderer remains.

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/68. Caller `dubstylee` approved [plan 523e50e](https://github.com/luminari-gurus/tactics-guru-v2/tree/523e50e/openspec/changes/issue-68-baked-tiles) on 2026-10-11; approval recorded in `3f647bd`. Branch `work/issue-68-baked-tiles`. No dependency, asset, domain, combat/RNG, deployment or physical-certification change.

## Builds and method

- Baseline: exact merged main `e955e9d9f182a76f057ea69057c7a1ac6c0bd682`, clean production build.
- Prototype: `dbe9eba2654b1bc3271e9fba8070d0016921ce7e`, clean production build. One canvas texture per actual terrain-asset/elevation pair combines the column polygons with the original rotated/squashed terrain source. Highlights, rings, occupants and canopies stay separate. Density 6 preserves the existing maximum 1.5 fitted scale ×4 zoom. Pure projection, picking and depth rules are unchanged.
- Both use the corrected #65 **v3** POST_RENDER collector, including startup movement intervals ending before controls usability. Each scene/build has 18 samples: three repetitions × cold/warm × Desktop Chrome / Pixel 7 portrait / Pixel 7 landscape (915×412). Total: 72 scene samples. Initial seed is 1 in both builds; cold navigation and warm reload each create a fresh seed-1 scene. Profiling restarts exercise seeds 2–7.
- Captures ran sequentially with no competing browser workloads: unthrottled loopback HTTP, fresh context cold load and same-context warm reload, identical installed headless Chromium, host, viewport and legal selection/pan/zoom/move controls. Raw files retain browser/OS/CPU, timestamps, exact served build, code/asset identities and resource timing. No deployment capture or physical device is claimed.
- [Profiling harness](issue-68/profile.mjs) instruments actual WebGL draw calls, vertex counts, level-zero texture allocations and offscreen canvas operations. It captures matched CPU profiles and Chrome trace categories including GPU. This instrumentation is **separate from uninstrumented v3 frame/loading captures**. Mobile here means Chromium device emulation on the same Apple M5 Pro GPU. Isolated GPU elapsed time/driver memory is unavailable; no GPU speedup is inferred from submission counts.
- [Comparison script](issue-68/compare.py) regenerates [comparison.json](issue-68/comparison.json). Per-sample percentiles use nearest rank. Arithmetic noise below 1e-6 ms is treated as in #65; 16.8 ms never passes a 16.7 ms threshold.

Raw timing: [baseline battle](issue-68/baseline-battle.json), [prototype battle](issue-68/prototype-battle.json), [baseline proof](issue-68/baseline-proof.json), [prototype proof](issue-68/prototype-proof.json). All four captures have 18 samples, no capture failures, and no console/page errors.

## Timing and loading comparison

Worst value across the 18 battle samples unless stated otherwise:

| Metric | Baseline | Prototype | Existing limit / reading |
| --- | --- | --- | --- |
| Idle median | 16.7 ms | 16.8 ms | ≤16.7; all baseline rows pass, prototype portrait repetition 1 warm fails |
| Idle p95 | 18.7 ms | 18.7 ms | ≤20; both pass |
| Pan p95 | 18.9 ms | 18.7 ms | ≤33.4; both pass |
| Zoom p95 | 21.3 ms | 19.5 ms | ≤33.4; both pass |
| Player move p95 | 18.8 ms | 18.6 ms | ≤33.4; both pass |
| Startup-only move p95 | 19.6 ms | 19.3 ms | ≤33.4; both pass, pre-controls intervals retained |
| Cold usable maximum | 582.5 ms | 596.2 ms | ≤2500; both pass |
| Warm usable maximum | 472.8 ms | 459.6 ms | ≤750; both pass |
| Cold code maximum | 393,932 bytes | 394,220 bytes | ≤400,000; both pass |
| Cold assets maximum | 848,829 bytes | 848,829 bytes | ≤1,500,000; unchanged |

Cold/warm **median** usable times are 469.6/457.0 ms baseline and 469.0/457.8 ms prototype. The prototype's isolated 16.8 ms idle miss is retained, not attributed causally to baking from this single comparison. The rest of the near-vsync differences are small and do not establish an FPS increase. No recapture was used to erase the miss.

Proof control: idle median maximum 16.7 ms for both; p95 maximum 18.6→18.4 ms; cold/warm usable maxima 225.7/124.8→233.0/122.9 ms. The modest variation in the unchanged proof scene also cautions against causal claims from small extrema differences.

## Renderer work and texture cost

Actual instrumented idle frame medians; pan, zoom, selection and legal move windows retain the same submission counts:

| Profile | Baseline draw calls | Prototype draw calls | Change |
| --- | --- | --- | --- |
| Desktop | 39 | 39 | no submission reduction |
| Pixel portrait | 457 | 313 | 144 fewer, 31.5% reduction |
| Pixel landscape | 457 | 313 | 144 fewer, 31.5% reduction |

Reported display objects fall from 615 to 327 (288 fewer, removing one column object and one nested terrain container per cell). Desktop idle submitted vertex count falls 6,768→5,904, reflecting one fewer quad per tile. Draw calls/vertices are renderer proxies, not GPU elapsed time, energy savings or hardware certification. CPU samples and traces are retained at [baseline CPU](issue-68/baseline-cpu.json), [prototype CPU](issue-68/prototype-cpu.json), [baseline trace](issue-68/baseline-trace.json.gz), [prototype trace](issue-68/prototype-trace.json.gz); both include idle and interaction windows. Minified sample names limit function-level interpretation, so the directly observed submissions are the primary renderer evidence.

The baseline caches three column textures (480×312, 480×456, 480×600), totaling **2,626,560 nominal RGBA bytes**. The prototype caches eight actual material/elevation variants:

| Variants | Dimensions | Count | Nominal bytes |
| --- | --- | --- | --- |
| grass/forest/grass_path/water, elevation 0 | 480×312 | 4 | 2,396,160 |
| stone/grass_path/grass, elevation 1 | 480×456 | 3 | 2,626,560 |
| stone, elevation 2 | 480×600 | 1 | 1,152,000 |
| Total | | 8 | **6,174,720** |

The prototype replaces baseline columns rather than keeping them. Source terrain/unit textures and independently cached overlays remain present. Total initial observed level-zero texture inventory grows **6,057,032→9,605,192 bytes**, a **3,548,160-byte increase (3.38 MiB, 58.6%)**. Driver allocation, mipmaps and retained CPU canvas copies can add cost beyond this nominal `width*height*4` estimate. Every generated texture is far below the observed 16,384-pixel renderer limit.

Measured prototype generation wall time is **7.5/6.8/7.1 ms** for desktop/portrait/landscape, and **0 ms on every settled restart**. For matched instrumentation, the total interval between each static canvas texture's initial upload and final populated upload is 2.3/2.3/2.2 ms for the three baseline columns and 7.3/6.6/6.9 ms for eight prototype variants. This upload-span proxy excludes allocation before the first upload; the prototype's own constructor timer includes that overhead. Canvas operation timing and raw upload records remain in the profile captures.

Six legal scene restarts per profile retain all eight static variants and identical keys/bytes. Dynamic overlay combinations are a separate bounded cache: after the interaction/max-zoom fixture, total inventory stays at **7,273,544 baseline / 10,821,704 prototype bytes** for all six restarts. No per-cell texture duplication or restart growth is observed.

Raw resources, window timestamps, renderer-frame counts and restart snapshots: [baseline desktop](issue-68/baseline-desktop-profile.json), [prototype desktop](issue-68/prototype-desktop-profile.json), [baseline portrait](issue-68/baseline-portrait-profile.json), [prototype portrait](issue-68/prototype-portrait-profile.json), [baseline landscape](issue-68/baseline-landscape-profile.json), [prototype landscape](issue-68/prototype-landscape-profile.json).

## Correctness and visual review

Matched screenshots are retained for every profile at fit, selected/reachable/path overlays, after legal movement, and maximum zoom. Example pairs: [baseline maximum zoom](issue-68/baseline-desktop-max-zoom.png) / [prototype maximum zoom](issue-68/prototype-desktop-max-zoom.png), [baseline portrait fit](issue-68/baseline-portrait-fit.png) / [prototype portrait fit](issue-68/prototype-portrait-fit.png), [baseline landscape overlays](issue-68/baseline-landscape-overlays.png) / [prototype landscape overlays](issue-68/prototype-landscape-overlays.png), [baseline movement](issue-68/baseline-desktop-moved.png) / [prototype movement](issue-68/prototype-desktop-moved.png).

Visual inspection confirms the same terrain orientation, elevated top/side coverage, depth interleaving and independent dynamic overlays/units/canopies. Baking adds a raster resampling step; maximum-zoom materials have small filtering differences, so pixel equality is not claimed. No material terrain alignment or depth regression was found. Actual baked image/world-transform corner error remains <0.001 CSS pixel at fit and maximum zoom in every profile (raw snapshots retained).

Prototype focused board run: 27 existing checks passed; the initial new cache check failed three times because it indexed authored tiles using render-depth order. The corrected check matches by cell and passes across all three profiles, verifying shared variant identity/dimensions/bytes, actual corner errors and six settled restarts. No acceptance assertion was relaxed. Focused legal victory/defeat/restart, input and lifecycle checks: **48 passed** across all configured profiles; [raw log](issue-68/prototype-integration.txt). The corrected cache checks: [3 passed](issue-68/prototype-cache-tests.txt). Final configured validation follows below.

## Disposition

The 31.5% mobile-emulated submission reduction is real and could merit revisiting if a supported physical device demonstrates a rendering bottleneck. This experiment does not establish that benefit: frame cadence and median loading are essentially unchanged, desktop submissions are unchanged, memory increases substantially, generation is slower, and the prototype fails one strict local idle row. The baseline already meets the measured local gates. Extra canvas composition and transform diagnostics also add maintenance. **Do not adopt this prototype.** Keep #67 and all budgets; do not claim a physical-device speedup or certify #64/#66.

Rejecting the prototype is explicitly allowed by #68 and the approved plan. The exact prototype source/test implementation remains reviewable and reproducible at its committed SHA; the final branch restores `src/phaser/BoardRenderer.ts` and `tests/battle-board.spec.ts` byte-for-byte to the baseline. Evidence and small task-local profiling/comparison tools are the delivered change.

## Reproduction

Use separate clean checkouts at baseline `e955e9d` and prototype `dbe9eba`; run `npm ci` and `npm run build` in each. With installed Chrome:

```sh
export PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
npm run measure:fit -- /tmp/LABEL-battle.json --scene battle
npm run measure:fit -- /tmp/LABEL-proof.json
```

Run each capture sequentially, with no other browser workload. From a checkout containing the evidence tools, profile each already-built clean checkout:

```sh
node docs/qa/issue-68/profile.mjs LABEL /absolute/build-checkout /tmp/profiles
python3 docs/qa/issue-68/compare.py docs/qa/issue-68 /tmp/comparison.json
```

`LABEL` is baseline or prototype. The profile harness starts/stops its own preview on 4174; do not run it alongside the v3 collector. The raw traces are gzip-compressed JSON. The comparison script uses only Python standard library.

## Acceptance mapping and final validation

| Criterion | Evidence |
| --- | --- |
| Matched timing/renderer/usable time | Four 18-sample v3 captures, matching profiles/seed/cache conditions, CPU/renderer traces and comparison.json; GPU timing unavailability explicit |
| Dimensions/unique variants/memory/generation/cache | Eight variant inventory, resource snapshots, constructor timing/upload-span proxy, six no-growth restarts in all profiles |
| Appearance/elevation/depth/picking/overlays/movement/canopy/max zoom | Matched screenshot pairs, actual transform errors and focused existing browser checks |
| Cost-benefit decision including valid rejection | Explicit retain-baseline disposition above; exact prototype commit and baseline-restored final files |

Final validation results pending.
