# Design

## Context

See [proposal](proposal.md) for motivation, issue, caller, base and branch. `src/main.ts` imports battle/proof CSS and diagnostics, binds their controls, then dynamically imports `src/phaser/start.ts`; the latter imports all three scenes. There is no path router. `index.html` contains battle/proof shell elements. `vite.config.ts` embeds build identity with default SPA serving and no configured base override. Playwright uses production preview and three Chromium profiles; strict domain typing excludes browser/Node globals.

The maintained restart plan and technical design already record #87 as independent from the authored short run. Pinned original repository revision `e9433f6b608ae6b2d95418615cce9cf17dadcf74` supplies context: its generator is 38×26 with six styles, local seeded RNG, five validation attempts and a static fallback. Its digger creates rooms and connects centers; its tests cover repeatability, variation, borders and reachability. RunState invokes generation but also owns economy/progression/POIs. The original roadmap/design contain historical and broader goals; the original overworld-run spec includes navigation, POIs, battles and rewards. Only relevant generation scenarios inform this prototype; that contract is not imported.

Read-only rot.js inspection found published `rot-js` 2.2.1, BSD-3-Clause, `module: lib/index.js`, declarations and no exports map. Upstream Digger uses the shared RNG singleton and an elapsed-time cutoff; the RNG module seeds that singleton on import. This identifies reproducibility and isolation questions, not measured adoption evidence. Inspect the actual published tarball before relying on these source observations.

## Goals / Non-Goals

**Goals:** One pure map generator and a small separately loaded browser view meeting the [requirements](specs/overworld-map/spec.md). Maintain a clear data/rendering boundary, bounded generation and explicit reproducibility identity.

**Non-Goals:** No shared router framework, map session architecture, plugin registry, generator selector, worker, sprite pipeline or new Phaser scene. No extension of battle-save content identity or the authored-run contract.

## Decisions

### Route before battle startup

Make `src/main.ts` a small base-aware dispatcher. Normalize the configured `import.meta.env.BASE_URL` prefix and trailing slash, then recognize only the map path. Keep all other current entry behavior in `src/app/startBattleApp.ts` with its existing CSS/diagnostics imports and control binding. Dynamically import the map view only on `/map`; map startup removes the irrelevant battle/proof shell before rendering its own controls. This avoids creating a Phaser game or touching battle diagnostics on the map route. A general router and a second HTML build entry add machinery without required consumers.

Use Vite's existing SPA fallback for direct routes; explicitly verify development, production preview, root hosting and a temporary non-root base build. Do not add a hosting mechanism. Verify the existing Pages branch preview when available after implementation; record any unavailable hosted check. Do not claim localhost proves live host routing.

### Single generator selected through a bounded comparison

After approval, compare three approaches in isolated scratch experiments using the same uint32 seed set and 20×20 output checks:

1. Exact pinned rot.js 2.2.1 focused ESM module imports; verify supported paths in the published package and production Vite/TypeScript builds. Include a non-clock generator such as Rogue if Digger cannot satisfy the repeatability bound. Inspect/tune 20×20 rooms, output normalization and internal RNG behavior; do not monkey-patch global clocks or RNGs in application code.
2. Selective reuse/adaptation: inspect the minimal source dependency closure and needed changes for local RNG and work bounds. Record license obligations and maintenance cost; an independently implemented algorithm is distinct from copying upstream source. Never strip required license notices. If copying conflicts with repository instructions, do not select that option.
3. A local connected room/corridor generator: a fixed number of bounded room placement attempts, successive center connections, four-way flood-fill validation and a small deterministic connected fallback. Reuse the existing pure `seedRng`/`nextUint32` functions with a fresh map-owned state rather than introducing another RNG implementation. No BattleSession, combat commands or saves enter this path.

The provisional preference is the local approach because this slice needs only connected cells. It is not a final measured recommendation. Measure raw/gzip emitted map/shared chunks and total dist delta against the base, verify map-only requests on each route, compare repeatability under perturbed clock conditions, inspect representative layouts, and record seed coverage, floor ranges, distinct layouts and fallback frequency. Use 256 sequential seeds plus `0`, `1`, `12345`, `424242`, `2147483648` and `4294967295`; require at least 90% distinct layouts over the sequential set. Choose the smallest maintainable option satisfying all requirements, then ship only it. Exact rot.js adoption is within this plan if supported by evidence; a broader library/toolchain or changed behavior requires revised approval. No benchmark or candidate application code is written before approval.

### Pure bounded data and validation

The generator receives a uint32 seed and returns seed, generator version, width, height, row-major walkable/blocked cells and fallback status. Layout decisions depend only on seed/version and fixed work limits. Proposed usable bounds are 60–320 walkable cells, a blocked outer border and one cardinal connected component; these prevent trivial output and reserve obstacles. Run flood-fill with at most 400 visited cells and validate every candidate and fallback. Bounded attempts cannot call themselves recursively. Keep the fallback small and connected and document its exceptional fixed layout; the seed-set variation requirement prevents fallback from becoming the normal map.

Include only the pure generator file in the existing DOM-free typecheck, leaving view code outside it. No map storage, battle state mutation, per-cell gameplay objects or imported legacy source.

### Small native view

Use a CSS 20-column grid of noninteractive cells with color and wall/floor treatment, a text legend, a labeled numeric seed input, Generate and New seed buttons, and a live status summary. Cells do not need 400 tab stops. Controls use native focus/keyboard behavior and at least 44 CSS pixel targets. A descriptive map label reports dimensions and walkable count. Scope CSS to the map page, preserve safe areas, size the grid to available width, and allow vertical scrolling in short landscape rather than compressing tiles until unreadable.

Start with seed 1. Generate reuses entered seed; New seed samples browser entropy in the view and guarantees a different displayed seed, with a deterministic next-seed fallback if entropy is unavailable. Pure generation reads neither clock nor external entropy. Seed errors retain the current valid map; generation recovery displays fallback status. Seeds need not persist across refresh; re-entering the displayed seed reproduces a layout for the recorded generator version. No share/export/history UI is needed.

## Risks / Trade-offs

- Shared rot.js RNG and clock termination → inspect exact package, perturb runtime clocks during comparison and choose a bounded approach without global patches.
- Route extraction may change battle initialization or CSS → preserve ordering and execute the full configured browser suite plus proof/content smoke regressions.
- SPA fallback and base paths differ by host → test direct navigation/refresh for dev, built preview, temporary base prefix and actual existing preview where available; document missing evidence.
- Simple rooms can overlap or yield weak layouts → validate counts/connectivity, inspect sample grids and record measured uniqueness/fallback frequency; tune fixed constants only within the approved contract.
- Extra purity and UI files can grow into a framework → keep one generator and one view; remove throwaway comparisons and unused candidate dependencies from the delivered application.

## Migration Plan

No saved data migration. After approval implement on the published task branch, validate, then commit/push and open a PR against main. Existing host behavior receives the route through its normal review pipeline; no production infrastructure mutation or manual cutover is included. Reverting the task restores prior routing with no map storage to clean up.

## Acceptance and verification mapping

| Issue criterion | Implementation | Proof |
| --- | --- | --- |
| 1: direct path, refresh, base and battle | Base-aware dispatch and existing SPA shell | Browser direct/refresh checks in dev/preview, temporary prefixed build, existing hosted preview if available; battle/proof/content smoke regression |
| 2: 400 legible cells | Pure row-major data, grid, legend | Unit dimensions/values plus desktop/portrait/landscape browser counts and visual inspection |
| 3: connected nontrivial bounded layouts | Counts/border/flood-fill, work cap, fallback | Seed matrix plus controlled candidate-failure fixture exercises exhaustion and valid fallback |
| 4: reproducible seed and variation | Seed input, versioned generator, New seed | Unit equality across seeds/clock perturbation, unique layout count, browser seed re-entry/new-seed/invalid-input checks |
| 5: rot.js comparison and battle isolation | Isolated exact-package experiments and one selected generator | Written decision/raw results and actual chunk sizes; route network/import checks, untouched sentinel storage, existing battle RNG/session tests |
| 6: checks and actual results | Focused tests and maintained QA | `npm run test:unit`, `npm run validate:content`, `npm run typecheck`, `npm run build`, full `npm test`, strict OpenSpec and `git diff --check` |

Record commands, source/build identity and actual failures/limits in `docs/qa/issue-87-overworld-map.md`; link it from README alongside the map instructions. Emulated mobile checks establish responsive behavior, not physical-device certification. No implementation or test result is claimed at planning time.
