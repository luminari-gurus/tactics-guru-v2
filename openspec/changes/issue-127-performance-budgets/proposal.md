# Proposal

## Why

[Issue #127](https://github.com/luminari-gurus/tactics-guru-v2/issues/127) records cold code transfers above 400,000 bytes on both battle and run routes and one run idle median above 16.7 ms. These failures hold up #57, #64 and #81; a focused, measured remedy has more immediate downstream value than starting another feature.

## What Changes

- Extend the existing performance acceptance contract explicitly to the authored run route, retaining the same limits and source-bound cold/warm protocol.
- Reproduce the retained release and compare current main before changing code. Reuse the retained collector's isolated save handling and real run-start controls; report per-request transfer and every sample.
- Evaluate selective scene loading, retain its measured comparison, then use the stock pinned Phaser Arcade distribution to omit unused Matter physics. The scene split saved too little and is removed from the final source. Preserve all entry points, both renderers, engine/audio setup and gameplay.
- Investigate the run idle outlier with paired uninstrumented captures and separate profiling. Change runtime work only when a measured cause supports it; preserve unresolved failures.
- Verify both routes against loading, transfer and frame budgets plus functional regressions. Keep local proof, deployed verification and production authorization distinct.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `battle-performance-evidence`: explicitly cover run-route startup/cache handling, complete matrices, per-request evidence and the current emulation acceptance policy.
- `battle-frame-performance`: apply the unchanged budgets and behavior-preservation requirements to both single battles and authored run battles, with honest #127 delivery gates.

## Impact

Planning base: `main` at `0b317e35bb5c4ce713c242311f0673fc27923637`. Planned branch: `work/issue-127-performance-budgets`; caller: `moshehbenavraham`.

Likely implementation seams: `src/phaser/start.ts`, a small shared engine-creation module, `src/app/startBattleApp.ts`, `src/app/startRunApp.ts`, the existing measurement scripts/options, measurement unit tests and route/lifecycle browser tests. `BattleScene.ts`, `BoardRenderer.ts`, diagnostics and Vite configuration change only where a demonstrated cost or measurement defect warrants it. New QA receipts live under `docs/qa/issue-127-performance-budgets/`.

No combat/content/save changes, dependency upgrade, custom engine build, renderer rewrite, analytics integration or deployment change is selected. PR #119 and issue #128 remain separately owned. The caller has authorized implementation of [plan.md](../../../docs/ongoing-projects/plan.md); its execution handoff and QA report record current progress.
