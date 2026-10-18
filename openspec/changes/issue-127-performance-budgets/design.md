# Design

## Context

See [proposal.md](proposal.md) for motivation and [plan.md](../../../docs/ongoing-projects/plan.md) for acceptance mapping and publication identity. Planning inspected main `0b317e35bb5c4ce713c242311f0673fc27923637`; the retained deployed failures belong to `13418626fab4cc40609cd2255d54800c15e34805`, not to a fresh run of current main.

`src/main.ts` already separates `/run`, `/map` and single-battle entry imports. However, `src/phaser/start.ts` statically imports `FitScene`, `ContentSmokeScene` and `BattleScene`, and also exports shared `createGame`. Both battle and run consume that module. The retained first desktop cold sample loads `start-B60UKqbD.js` at 399,147 transfer bytes for battle and 399,390 for run, with 1,520,176 decoded bytes. Those are request observations, not a module-level attribution or a proven removable byte count.

`BattleScene` observes frames at `POST_RENDER`; `FitMeasurements` retains up to 600 intervals, uses nearest-rank percentiles, excludes hidden time and separates workload windows. Its HUD refreshes are event-driven in the inspected path. A single 16.799999952316284 ms median does not establish a per-frame HUD problem, engine defect or host scheduling cause.

The retained collector adds warm-context save clearing and real run-start clicks that the maintained collector lacks. Its `/run` recognition assumes an origin-root path, and its pointer workload uses the panel's bottom edge. These assumptions must be checked against prefixed URLs and the current drawable region, especially if PR #119 merges. Existing performance specs also retain historical physical-only language; the two scoped deltas follow the current AGENTS device policy without claiming physical execution.

## Goals / Non-Goals

**Goals:** preserve current behavior, make both routes satisfy the existing transfer/frame/loading limits, and retain enough source-bound evidence to distinguish application changes from measurement or environment effects.

**Non-Goals:** dependency upgrades, engine replacement/custom distribution, broad code cleanup, changing combat or save formats, adding analytics, merging PR #119, selecting a release path, deploying, or closing parent acceptance trackers by proxy.

## Decisions

### 1. Reuse and harden the existing measurement path

Carry the reviewed collector behavior into `scripts/measure-fit.ts` and its existing option helpers, rather than create a second general performance framework. Restore the exact retained collector in ignored scratch for baseline comparison first. Preserve its raw files and source hashes. An evaluation helper beside the script may replace the hardcoded `/tmp` evaluator only if it reproduces the historical totals and failures exactly.

Explicitly identify single battle versus run within the existing battle capture mode, including prefixed deployment paths. Keep proof the default. Reset only four v2 save slots in newly owned measurement contexts for warm fresh-start captures. Save-resume remains a different measurement. Do not use Playwright request routing during transfer runs because it changes caching. Use the measured drawable board region for legal gestures when needed, with the same actions and workload separation as the baseline; pair any method correction on baseline and candidate.

Acceptance requires 18 samples per route, one clean served identity, valid numeric metrics, sufficient idle samples, nonempty real pan/zoom/move windows and retained console/page errors. Missing metrics or workloads cannot silently pass. Evaluate original raw intervals and include every failed sample and attempt.

### 2. Evaluate scene isolation before selecting the distribution

The baseline module graph confirmed avoidable proof/content-smoke dependencies. A bounded experiment separated engine creation and loaded only the requested scene, preserving all routes, error handling, audio and lifecycle behavior. Its source commit and functional proof are retained in QA.

Aggregate cold transfer, including extra requests, showed that the experiment saved too little to meet L3. It was removed from the final source. Required code is not deferred beyond the measurement window, and recovery/diagnostics remain present. Neither a warning threshold nor a smaller named chunk is treated as proof of a smaller route total.

The supported stock-distribution choice below is the revised remedy. It adds no dependency, custom engine build or renderer rewrite, and retains the original startup implementation.

### Measured revision: select the stock distribution without unused Matter physics

The scene-isolation experiment passed 84 focused browser cases, but actual cold probes at clean `6c18fa7` transferred 407,063 battle / 414,354 run bytes, only 223 / 1,143 below the complete clean baseline. Extra chunks and request overhead consumed most of the saving. It cannot meet L3. Keep the experiment's source, raw probes and module inventory as evidence, but revert its source changes: the goal does not require asynchronous scene loading.

The pinned Phaser 4.2.1 package ships `dist/phaser-arcade-physics.js`; its `src/phaser-arcade-physics.js` entry explicitly excludes Matter.js while retaining every other engine namespace used by this application. The package's distribution configuration enables both Canvas/WebGL renderers and sound. Source inspection finds no Phaser physics consumer in this project, whose simulation is already pure grid/domain code.

Use an exact Vite alias from `phaser` to that existing package distribution. Resolve it from the installed package metadata, without changing package versions, editing vendor sources, building a custom engine, or changing runtime initialization. Extend the boot checks for engine-load errors and Canvas fallback, then run all required functional suites and complete matched matrices. This smaller change addresses the dominant measured module and retains the existing startup/lifecycle implementation.

### 3. Investigate idle timing separately

Capture current baseline and candidate sequentially on the same host/browser, with no competing browser workload or profiling overhead in acceptance runs. Compare the original failing profile/repetition/cache, raw interval distributions, renderer, visibility and workload boundaries. Use a separate CPU/render trace to identify repeated application work, listener accumulation or scheduler effects; tracing must not be presented as a comparable acceptance sample.

If a runtime cost is demonstrated, change only that hot path and prove lifecycle/restart cleanup plus equal state/events/RNG for identical legal input. If the failure does not recur, report that result without inventing a fix or discarding the historical failure. If it persists without a supported remedy, keep #127's idle gate open. Never change frame observation point, limits, percentiles or sample selection to manufacture a pass.

### 4. Use functional and performance proof together

Run focused boot/content-loading/asset-base and battle/run lifecycle tests after import changes. Verify default battle, proof, content-smoke and map entry points; audio unlock/mute/retry, confirmation/cancel, recovery, accepted-command save/resume, deterministic replay and three-encounter rewards/restart remain required. Run configured unit/content/browser suites, encounter/item posttests, both TypeScript configurations, production build and the WebKit device-acceptance matrix on the final candidate.

Then run complete sequential 36-sample battle/run matrices on clean comparable artifacts. Retain L1/L2/L3/L4/F1/F2 decisions per sample, request-level bytes, raw intervals, conditions, build/collector hashes and failures. A local compressed-size estimate supports investigation; only actual browser transfer on the tested origin establishes that origin's L3 result.

### 5. Follow through on the remaining deployed loading gate

The cold-code remedy passes every local gate and deployed L3/L4/F1/F2, but the deployed candidate retains one cold L1 and fifteen warm L2 failures. Section 6 of the task list keeps this work open. A separate warm diagnostic records substantial time between HTML response completion and scene initialization, plus repeated 304 validations. Existing emitted Vite code already preloads each asynchronous entry when its caller executes, so adding the same entry to its dependency list would be a no-op.

Investigate earlier route-specific HTML hints, using the actual emitted JS/CSS dependency graph and the existing blocking-image registry. Keep the map route lightweight and avoid loading battle imagery for proof/content-smoke modes unnecessarily. Hints must not execute app initialization before its normal DOM/style boundary, weaken CSP/nonce policy, replace loader validation, or create duplicate transfer. Count inline hint code and every requested byte. Preserve startup movement and the original controls-usable marker.

This client-loading experiment retains its original scope. The caller separately approved the bounded cache-policy follow-up below on 2026-10-18. Production activation remains outside scope. Retain changes only with measured benefit and intact functional, prefix, byte and timing contracts; preserve unsuccessful attempts instead of changing limits.

The first fetch-image hints are rejected because Chromium cannot reuse them for Phaser's blob XHR; JS/CSS-only hints advance requests but leave warm failures. The next bounded experiment selects Phaser's supported `HTMLImageElement` transport inside the existing content loader and uses matching `as=image` hints. This keeps the loader's texture creation, dimension/error checks, application-owned deadline and shutdown cleanup. Prove actual single-request reuse and all failure paths; do not add a second loader or an application cache. Proof/content-smoke/map must not receive battle-image hints.

That experiment is retained in measured runtime `06ad243`: every required image is requested once, all 36 local samples pass, and deployed battle passes all 18 samples. Deployed run retains one warm failure at 777.4 ms; the unchanged limit is 750 ms. Test-only follow-ups correct the old duplicate-request expectation and use native taps on touch profiles. The initial WebKit proof readiness timeout remains retained and unreproduced after baseline/candidate and sequence checks; no unsupported application fix is claimed. Keep task 6.3 and #127 open while the remaining gate is unmet.

### 6. Cache exact versioned build assets on the approved preview

Extend the existing build-only Vite plugin to emit Cloudflare Pages `_headers` rules for actual generated `assets/*-<hash>.js` and `.css` paths. Use `Cache-Control: public, max-age=31536000, immutable`; changing file content changes its URL. Resolve the configured base path so root and `/tactics/` outputs have exact matching rules. Exclude HTML, fixed-name images/audio, APIs and saves. No application cache, service worker, new dependency, dashboard setting or production activation is needed.

Verify the complete emitted rule set against both root and prefixed builds, then inspect actual preview response headers and warm cache reuse without request interception. Bind receipts to a clean commit and preserve the earlier 777.4 ms failure. Run the unchanged full battle/run performance matrices; do not assume cached files alone prove the loading gate. Reuse the prior broad functional evidence only after verifying application/public/package tree parity, with focused actual-route checks on the new build. Publish this as a focused dependent PR.

## Risks / Trade-offs

- Scene separation may save too little or increase request overhead -> compare route totals before committing to further changes; no speculative custom build.
- Async imports can disturb error/restart/lifecycle handling -> extend existing actual-control tests at those boundaries, including missing chunks and scene switches.
- Host scheduling can move a near-60 Hz median -> keep paired conditions, raw intervals and repeated complete matrices; do not infer causation from a different host's result.
- PR #119 or #128 may change the shared runtime/bundle -> refresh main and ownership before implementation and before final measurement; record the exact final artifact.
- A collector correction can change totals or gesture placement -> retain original results and rerun both baseline and candidate using the same corrected method.
- An approved deployed candidate may be unavailable -> publish local proof and the specific unmet deployment-verification gate; do not choose or mutate production infrastructure.

## Migration Plan

No storage/content migration is needed. Implement source and collector changes in reviewable commits after approval, with QA receipts bound to each tested artifact. Roll back a source optimization through a normal revert if it regresses behavior; preserve diagnostic evidence. Production activation is not part of this plan. An approved existing preview/release must serve the exact reviewed candidate before deployed budget acceptance can be claimed.
