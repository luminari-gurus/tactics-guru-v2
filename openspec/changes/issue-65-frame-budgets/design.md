# Design

## Context

See proposal.md for motivation and branch/readiness identity. Inspection of main `d60659d` found:

- `BattleScene` samples frames at game POST_RENDER, while `FitScene.update` samples before render. Both use `FitMeasurements`; comparing their historical numbers cannot isolate rendering costs.
- `measure-fit.ts` waits for 120 idle samples, then wheel zoom, eight-step pan, target selection and legal movement. The fixed 250 ms windows can overlap; initial enemy movement is also retained. Idle raw intervals are currently summarized rather than exported, while workload intervals are exported.
- `BoardRenderer` retains graphics/images/containers, redraws highlights on `present`, sorts depth during movement, recomputes canopy overlap during tween updates, and publishes a full DOM JSON diagnostic report on presentation and view changes. These are profiling candidates, not demonstrated causes. `BattleScene.refresh` also computes reachability and serializes replay/event history on refresh, not every idle frame.
- `start.ts` selects Phaser.AUTO and viewport resize; no measured evidence yet establishes a renderer/configuration defect. Existing measurement, board/picking, lifecycle and legal win/loss browser tests provide regression seams. Main includes PR #61; audio PR #63 remains separate.

## Goals / Non-Goals

**Goals:** isolate application costs from timing/scheduling differences, repair measured causes with existing seams, and prove the unchanged acceptance contract.

**Non-Goals:** no general profiler framework, parallel diagnostic implementation, arbitrary renderer replacement, disabling visual content/diagnostics to obtain a pass, forced battle state, host tuning masquerading as a product fix, or unrelated cleanup.

## Decisions

1. **Preserve the original baseline, then make comparisons comparable.** After approval, capture the unchanged base proof and battle sequentially on the same host/browser. Extend the existing sampler/collector to retain bounded idle intervals, identify observation point and separate windows. Use POST_RENDER for comparable rendered intervals in both scenes while keeping input-to-render timing intact. Record old and corrected methods; method-only changes cannot count as a runtime speedup. Do not delete historical #11 evidence or replace its definitions silently. An independent browser animation-frame/trace clock can diagnose scheduling, but cannot replace the rendered-frame acceptance measure.
2. **Isolate actual workloads.** Keep real controls and the three-profile, three-repetition cold/warm protocol. Wait for a window to close and presentation to settle between zoom, pan, selection and confirmed movement; distinguish initial enemy movement from player workload. Extend existing options/helpers only if necessary, without a new runtime dependency. Retain errors, timestamps, counts, raw intervals, navigation-to-controls-usable time, resource bytes and served build; do not substitute earlier scene-ready time for usable time.
3. **Profile before selecting a remedy.** Retain browser performance traces for idle, each workload and comparable proof windows, including JS/layout/render activity and host conditions. Investigate graphics traversal/draw cost, DOM diagnostics, camera transforms, sorting/occlusion and command-boundary refresh costs only where traces show them. Make a focused causal hypothesis and isolated before/after comparison. Existing helpers or changes limited to these presentation/measurement seams are authorized after plan approval; an architectural rewrite, library upgrade or combat change requires a revised plan.
4. **Use a cause-specific regression.** A confirmed functional/recomputation defect gets a meaningful failing check before repair, extending existing unit/browser tests. Pure frame-cost improvements use retained paired traces and unchanged budgets as the regression proof, plus actual-control behavior checks; avoid brittle timing assertions in ordinary CI and tests that restate implementation. Fixed-seed replay/state/event equality, transformed picking, overlays/depth/canopy visuals, modal capture and restart/suspension remain required.
5. **Minimal scope through ablation.** Reuse `FitMeasurements`, the collector and renderer objects. Keep only instrumentation needed to explain a measured failure or prove an acceptance criterion. No new service, framework or configuration menu. Remove task-created temporary instrumentation after durable evidence is captured unless the existing diagnostic contract needs it.

## Acceptance mapping and files

| Issue criterion | Implementation path | Verification |
| --- | --- | --- |
| AC1 matched reproduction/raw provenance | `measurements.ts`, `browser.ts`, `FitScene.ts`, `BattleScene.ts`, `measure-fit{,-options}.ts` | Paired base/candidate proof/battle captures with comparable observation, idle/workload intervals, counts, exact builds and errors |
| AC2 measured causes/focused fixes/determinism | `BoardRenderer.ts` and `BattleScene.ts`; `start.ts`/`ProofBoardRenderer.ts` only with causal evidence | Retained profiles, isolated comparisons, cause-specific regressions and fixed-seed legal replay equality |
| AC3 F1/F2 and L1–L4 | Existing sampler/collector plus cause-supported presentation fixes | Approved deployed desktop/portrait/landscape, three cold/warm pairs each; every sample/window checked against all applicable limits |
| AC4 selection/pan and proxy limits | Existing input-to-POST_RENDER response path, actual control/picking tests | Next-render response records and visible board-change assertions; physical limits explicit under #64 |
| AC5 checks and existing release | Existing tests; `docs/qa/issue-65-frame-budgets.md`, raw files under `docs/qa/issue-65/` | Focused checks, full unit/content/browser suites, both strict typechecks, build, diff and strict OpenSpec validation; existing approved preview with served build verified |

Required completion commands: `npm run test:unit`, `npm run validate:content`, `npm run typecheck`, `npm run build`, configured `npm test` (supported installed Chrome executable where required), `git diff --check`, and `openspec validate issue-65-frame-budgets --strict`. Run captures sequentially without competing browser workloads. Current collector calls: `npm run measure:fit -- <output>` for proof and `npm run measure:fit -- <output> --scene battle`, adding `--url <approved-origin>` for deployment. Record exact commands and actual counts; no claim of a suite run from partial rechecks.

## Risks / Trade-offs

- Shared-host/headless scheduling or renderer selection can explain apparent cost → retain trace/host/build/method evidence and repeat only for a causal hypothesis; no cherry-picking or relaxed budgets.
- Budget margin is small, especially warm loading/code transfer → keep additions bounded and check every sample; preserve failures.
- Graphics optimization can change depth, canopy fading or transformed picking → keep visible geometry/occlusion and battle-loop regressions, plus visual comparison.
- Audio PR #63 touches shared presentation seams → do not import unmerged audio; recheck conflicts/current main before final validation and report the actual integration base.
- Existing release access may be unavailable → retain local evidence and draft PR; do not introduce a deployment fallback or change Access. Physical certification remains separate.

## Migration Plan

No saved data or domain migration. Record explicit approval here before implementation. Commit clean source before building/capturing; evidence commits do not change the served runtime but must identify both collector and runtime hashes. Publish only through the established separately approved beta release path once access/build provenance is verified. No production cutover or merge is authorized. If regression appears, revert the task-specific change via ordinary reviewed commits and the existing release procedure; never force-push or alter production infrastructure.

## Open Questions

The dominant runtime costs and exact smallest remedy are empirical outcomes of the planned profiles. No cause is asserted yet. The intended approved preview URL and availability must be verified during delivery; unavailable release access leaves deployed acceptance incomplete. Neither unknown changes the acceptance contract or authorizes broader implementation.
