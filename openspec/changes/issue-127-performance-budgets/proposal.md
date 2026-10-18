# Proposal

## Why

[Issue #127](https://github.com/luminari-gurus/tactics-guru-v2/issues/127) records cold code transfers above 400,000 bytes on both battle and run routes and one run idle median above 16.7 ms. These failures hold up #57, #64 and #81; a focused, measured remedy has more immediate downstream value than starting another feature.

## What Changes

- Extend the existing performance acceptance contract explicitly to the authored run route, retaining the same limits and source-bound cold/warm protocol.
- Reproduce the retained release and compare current main before changing code. Reuse the retained collector's isolated save handling and real run-start controls; report per-request transfer and every sample.
- Evaluate selective scene loading, retain its measured comparison, then use the stock pinned Phaser Arcade distribution to omit unused Matter physics. The scene split saved too little and is removed from the final source. Preserve all entry points, both renderers, engine/audio setup and gameplay.
- Investigate the run idle outlier with paired uninstrumented captures and separate profiling. Change runtime work only when a measured cause supports it; preserve unresolved failures.
- Advance selected-route JS/CSS/image requests using emitted-bundle hints and Phaser's supported image-element transport. Preserve the existing content loader's validation, timeout and shutdown ownership while sharing image requests with portraits.
- Generate one-year immutable cache rules for exact emitted content-hashed JS/CSS paths, including prefixed builds, as approved by the caller on 2026-10-18. Verify the existing branch preview's headers, cache reuse and complete unchanged performance matrices.
- Verify both routes against loading, transfer and frame budgets plus functional regressions. Keep local proof, deployed verification and production authorization distinct.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `battle-performance-evidence`: explicitly cover run-route startup/cache handling, complete matrices, per-request evidence and the current emulation acceptance policy.
- `battle-frame-performance`: apply the unchanged budgets and behavior-preservation requirements to both single battles and authored run battles, with honest #127 delivery gates.

## Impact

Initial planning base was `0b317e35bb5c4ce713c242311f0673fc27923637`; implementation includes main `a009a3e` through collector base `f1184d5`, stock-distribution candidate `f28f331` and startup candidate `06ad243`. PR #129 is the collector prerequisite, #130 the cold-code remedy, #132 its evidence, and #133 the startup remedy. Test-only follow-ups `99ee537` and `9382f13` preserve the measured application inputs. Caller: `moshehbenavraham`.

Implementation changes Vite's distribution selection and build hints, the existing measurement scripts/options and their tests, plus boot and comparison-origin checks. The startup follow-up changes only `src/phaser/contentLoading.ts` under application source, selecting image-element loading through the existing Phaser loader. The experimental scene-start changes remain reverted. Source-bound QA receipts live under `docs/qa/issue-127-performance-budgets/`.

No combat rules, authored content, save schemas, dependencies, custom engine build, renderer or analytics are changed. The caller approved the bounded generated-cache-header source change and existing-preview testing; HTML and fixed-name asset policy, dashboard settings and production activation remain unchanged. The deployed warm gate stays open until measured. PR #119 merged independently and its reviewed runtime is incorporated; issue #128 remains separately owned. The caller authorized implementation of [plan.md](../../../docs/ongoing-projects/plan.md); its execution handoff and QA report record current progress.
