# Design

## Context

See proposal.md for issue, caller, branch, base and readiness evidence. Caller explicitly approved published plan commit `523e50ee508d76e73210ddbb8856f1ad66773087` with “Approved” on 2026-10-11. Scope is unchanged.

`BoardRenderer` currently caches columns by elevation and overlays by 16 flag combinations at density `MAX_BOARD_SCALE * MAX_ZOOM` (6 pixels per board unit). Each terrain surface still uses a rotated image inside a vertically scaled container. Tile depth comes from grid ordering; overlays use depth +2, rings +2.25, occupants/canopies +2.5. Picking uses pure geometry. The published diagnostics derive surface-corner error from the actual terrain image transform; that check must stay meaningful after baking.

The #65 v3 collector samples POST_RENDER, retains interval timestamps and includes startup movement before controls usability. It performs three repetitions of cold/warm loads for Desktop Chrome, Pixel 7 portrait and Pixel 7 landscape (915×412), totaling 18 samples per scene/build. Retain its exact profile configuration and default seed behavior. Earlier v2 startup evidence is not a valid substitute.

## Goals / Non-Goals

Goals: compare a small static tile prototype to current merged main, preserve dynamic presentation, and decide from evidence. Resource instrumentation must be bounded and measured consistently.

Non-goals: persistent feature switches, a general renderer abstraction, per-cell textures, whole-board baking, new catalog rules or physical-device certification. Scope exclusions and affected files are in proposal.md.

## Decisions

1. Bake one variant for each actual `(surfaceAssetId, elevation)` pair, using a versioned texture key in the game texture manager. Use a canvas texture: draw the existing column polygons, then draw the loaded terrain image with the same rotation and squash transforms. Draw at density 6 with the existing column bounds, placing one image at the current tile origin/bounds and tile depth. Variants are generated lazily from the validated board and reused across restarts; no new assets are loaded. Canvas composition is simpler than a retained offscreen scene/render-texture pipeline and avoids a second runtime object tree. Check installed Phaser APIs during implementation.

2. Keep highlights, rings, occupants and tree art in their existing independent objects and layers. Do not alter projection, tile depth, command flow, geometry picking or canopy logic. Verify that combining depth and depth+1 has no interleaving regression. If it does, reject this prototype rather than widening scope into depth-rule changes.

3. Replace the removed source-image transform diagnostic with checks of the baked image's actual bounds/origin transform and the projected terrain vertices. Pair those checks with raster comparisons so a mathematical expected-value echo cannot hide a wrong bake. Preserve surface-corner accuracy expectations in existing tests. Report generated dimensions, variant count, density, nominal RGBA bytes (`sum(width*height*4)`), generation elapsed time and cache reuse. Distinguish nominal pixels from unmeasured driver allocations/mip overhead; compare total resources against baseline, including retained source textures.

4. Use two build-identified sequential captures with the same unchanged v3 measurement harness: exact base `e955e9d` and prototype commit. Run battle and proof captures (18 samples each per build) as a control, with no competing browser suites. Record installed browser/host, resource identity, viewports, seeds and network/cache conditions. Reuse/adapt the #65 profiler in task-local evidence for matched idle and pan/zoom/move CPU traces, renderer submissions/batching and GPU timing where available; explicitly mark unavailable metrics. Use identical instrumentation in both builds and avoid timing expensive debug collection in the main frame samples.

5. Retain matched screenshots at fitted and maximum zoom, elevated seams, terrain types, selection/reachable/path overlays and canopy/movement cases. Extend battle-board browser checks for shared texture identity, resource dimensions and at least six settled restarts, and use existing picking, movement, loop and lifecycle coverage. No state-forced win/loss or hidden command injection.

6. Adoption is conditional: no correctness or configured-budget regression, reproducible useful improvement beyond observed run variability in frame or renderer work, acceptable generation/startup/memory cost, and a small maintainable implementation. Already meeting 60 fps is not evidence of an FPS increase. Repeat comparisons only if noise prevents a decision. If benefit is absent/ambiguous or quality/cost regresses, restore baseline runtime and deliver raw prototype captures, experiment harness/description and a rejection rationale. No arbitrary new performance threshold is invented.

## Acceptance mapping

| Issue acceptance | Implementation / verification |
| --- | --- |
| Matched timing and renderer evidence | Decision 4; raw baseline/prototype battle and proof captures, CPU/renderer trace evidence, idle/pan/zoom/move and cold/warm comparison |
| Dimensions/count/memory/generation and restart stability | Decisions 1, 3, 5; variant inventory, nominal byte totals and generation timing, six settled restarts |
| Terrain/depth/picking/overlays/movement/canopy/max zoom | Decisions 2, 3, 5; existing regressions and matched screenshots at fit/max zoom and both orientations |
| Benefit justifies costs or documented rejection | Decision 6; explicit report with uncertainty and chosen final runtime |

Run focused tests, `npm run test:unit`, full configured `npm test` with installed Chromium, `npm run typecheck`, `npm run build`, and `git diff --check`. Record actual results and physical/GPU limitations. These checks occur after approval.

## Risks / Trade-offs

- Alpha seams or orientation error → retain transparent bounds and original transform; inspect matched enlarged screenshots.
- Cache/upload cost → count only actual variants, include source and generated resources, record cold generation and warm reuse.
- Texture-size or quality limits → preserve density 6 and verify actual dimensions against the active renderer limit; reject unsupported prototypes.
- Near-budget/noisy frames → retain raw intervals and renderer evidence, compare distributions and matching conditions; no unsupported FPS claim.
- Diagnostic-only regressions → replace removed-image checks with actual baked transform plus visual validation, retain domain/interaction expectations.

## Migration Plan

No storage or deployment migration. Prototype only after caller approval, commit source/build identities for evidence, then retain or revert runtime based on the recorded decision. Deliver a normal PR only if every criterion is verified; otherwise a draft with Refs #68 and explicit limitations. Do not merge or archive before merge.

## Experiment disposition

Completed the approved experiment with clean baseline e955e9d and prototype dbe9eba. The prototype reduces mobile-emulated draw submissions 457→313 but raises initial nominal texture bytes 6,057,032→9,605,192, adds generation cost and provides no convincing frame/loading gain. One prototype idle median of 16.8 ms misses the unchanged 16.7 ms limit. Retain baseline runtime; see docs/qa/issue-68-baked-tiles.md and raw comparison evidence. This rejection outcome was explicitly within the approved scope. No runtime or browser-test delta remains against the baseline.
