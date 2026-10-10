# Design

## Context

See proposal.md for issue, branch and scope. Main contains #10 / PR #55 and real-control win/loss/replay checks in `tests/battle-loop.spec.ts`. `FitMeasurements` is bounded at 600 samples; only FitScene calls `frame`. BattleScene begins measurements but supplies no frame update. `scripts/measure-fit.ts` forces the proof route and waits for proof controls. `window.fitDiagnostics` exposes resource timings/build identity for both routes. Battle mode hides proof diagnostics controls and does not instantiate the proof audio adapter.

## Goals / Non-Goals

Goals: make the existing diagnostics measure the battle, preserve provenance, and give physical testers a precise record. Keep timing instrumentation in browser/Phaser presentation code, outside the pure domain.

Non-goals: no new telemetry service, generic benchmark framework, runtime combat automation, sound feature, gameplay rebalance or speculative performance rewrite. Scope exclusions in the proposal apply.

## Decisions

1. Extend the existing collector with `--scene proof|battle`, default proof. Use scene-specific readiness controls and shared capture/provenance logic. A separate collector would duplicate cache/build/error handling. Keep existing build identity checks, inventory/hash local dist and retain raw failures. Three fresh-context cold loads plus same-context warm reloads per profile; no routing that disables cache.
2. Wire visible scene frame sampling and bounded interaction windows into the existing diagnostics. Measure selection/pan from input handling to the first rendered changed presentation; keep a bounded independent workload window so idle sampling cannot fill its capacity. Capture zoom and legal move frame windows too. Exclude hidden intervals, clean up on shutdown, record workload actions and percentile/sample definitions. Instrumentation must never resolve commands or affect RNG. Use actual controls and existing legal test helpers, not forced outcomes. A new metrics subsystem is unnecessary.
3. Use budgets agreed in `docs/qa/issue-20-fit-gate.md`: L1 cold usable ≤2500 ms, L2 warm ≤750 ms, L3 compressed code ≤400000 bytes, L4 cold scene assets ≤1500000 bytes, F1 idle p50 ≤16.7/p95 ≤20 ms, F2 pan/zoom/move p95 ≤33.4 ms, I1 selection/pan visible by next frame. Publish each sample, ranges and medians; do not rerun away failures. Resource sums must distinguish code/assets/cache hits and unknown cross-origin timing. Baseline host/browser differences preclude causal speedup claims. Explicitly report if proof-derived limits fail the battle; do not silently loosen them.
4. Expand existing battle, layout, input, audio/lifecycle tests only where acceptance coverage is missing. Battle has no audio playback: capture that as a missing audio gate, separately exercise the existing proof audio adapter on the same served build, and do not add audio without a revised approved plan. Proof evidence cannot certify battle audio.
5. Create `docs/qa/issue-11-battle.md` and `docs/qa/issue-11/` evidence. Device matrix: iPhone Safari/Chrome, Android Chrome, desktop × portrait/landscape. Record device/OS/browser, URL/served commit, date, cache/network, complete legal win/loss/restart, tap/drag/pinch/selection, safe areas, toolbar resize, gestures, audio availability/unlock, suspension/resume, errors and measurements. Empty rows mean unverified. User-supplied physical reports require clear source and exact coverage, not inferred passes from historic proof reports.

## Acceptance mapping

| Issue criterion | Implementation and verification |
| --- | --- |
| Full physical win/loss/restart in four browsers, two orientations | Device matrix and complete actual-control records; existing automated legal battle test is supporting evidence only |
| Gesture, layout, audio, lifecycle and console | Extend real battle regression checks; matrix itemizes OS/browser behavior and absent audio |
| Reproducible loading/transfer/interaction/frames | Scene-aware collector, bounded diagnostics, raw captures, baseline/budget table; failing/missing rows remain blocked |
| Real move/attack/signature/AI/outcomes and viewport/DPR; approved deployment | Reuse battle-loop/picking/layout tests; exact authenticated served build; existing release path only |
| Deferred scope explicit | Report lists saves/resume follow-up, short route, inventory/equipment, procedural generation, advanced combat, editor, analytics and backend |

## Risks / Trade-offs

- Physical devices unavailable → implement capture/checklist first and retain draft PR with `Refs #11` until supplied evidence completes every gate.
- Authenticated release unavailable or stale → verify served commit; report gap without altering Access, installing PR #12 or uploading via a new path.
- Instrumentation changes timing → bounded data only, no per-frame DOM serialization; state/replay regression checks preserve behavior.
- Existing battle audio absent or asset budget exceeded → record failure; material feature/art/rule work requires revised plan approval.

## Migration Plan

No persistent data migration. Run focused RED/GREEN checks, full configured checks and local captures. Capture the intended build only through the approved existing beta release path; do not mutate production configuration. Removing scene instrumentation and collector additions rolls back this change without domain changes. Do not close #11 or the epic with missing device/performance/audio evidence.

## Open Questions

Which exact device models/versions and authenticated served build are available at capture time? Record those when supplied; absence affects evidence completion, not implementation scope.
