# Proposal

## Why

[Issue #65](https://github.com/luminari-gurus/tactics-guru-v2/issues/65) records failing battle idle and interaction frame budgets, blocking first-battle acceptance under #57/#1. The merged #11 evidence is reproducible but does not establish a cause; matched observation and profiling must precede a focused fix.

## What Changes

- Capture proof and battle under matched build/browser/host/cache conditions with comparable frame observation, retained raw intervals and isolated real-control workloads.
- Profile idle rendering, camera changes and movement; implement only fixes supported by measured causes while preserving combat state, RNG, replay and controls.
- Verify unchanged F1/F2 and loading/transfer budgets on an approved deployed build through the existing release path; publish successes, failures and engine-response limitations.

## Capabilities

### New Capabilities

- `battle-frame-performance`: battle idle and real-control workloads meet the agreed frame budgets, with comparable evidence and deterministic behavior preserved. No canonical specs exist yet; the merged, unarchived `battle-performance-evidence` change remains the diagnostic/provenance contract. This capability adds the runtime performance acceptance contract without duplicating it.

### Modified Capabilities

None.

## Impact

Primary paths: `src/phaser/{BattleScene,FitScene,BoardRenderer}.ts`, `src/diagnostics/{measurements,browser}.ts`, `scripts/measure-fit{,-options}.ts`, existing measurement/battle/picking/lifecycle tests, and `docs/qa/issue-65-frame-budgets.md` with raw captures under `docs/qa/issue-65/`. `src/phaser/start.ts` or `ProofBoardRenderer.ts` may change only if profiling proves a shared rendering/configuration cause. No new runtime dependency.

Caller: `dubstylee`. Base: `main` at `d60659d03b940c20e380eeda3f226ba2b649ef6f`. Published branch: `work/issue-65-frame-budgets`. OpenSpec change: `issue-65-frame-budgets`. Implementation approval: caller explicitly approved plan `5d64d74` on 2026-10-11.

Readiness: all eight open issues were reviewed on 2026-10-11; no promotions were justified. #57–#60 are scoped epics with child/dependency/decision gates; #64 requires delivered audio and physical evidence; #62 is assigned to another caller with active PR #63. #65 and #66 are unassigned ready P1 children with no declared GitHub blockers. #65 wins the oldest-number tie and supplies measured performance acceptance to #57/#1 and later release gates. It is now assigned to dubstylee. PR #61 is merged into the base; PR #63/audio #62 and PR #12/deployment remain unmerged and are not prerequisites or code to import.

Exclude renderer rewrites, toolchain upgrades, combat/balance changes, audio implementation, physical certification (#64), Safari restart remediation (#66), saves/run/items, production Access changes and new deployment mechanisms. Do not merge or close parent issues by proxy. Unmet acceptance yields a draft PR with Refs #65.
