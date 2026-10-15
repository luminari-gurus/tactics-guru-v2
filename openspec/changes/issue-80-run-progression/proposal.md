# Proposal

## Why

[Issue #80](https://github.com/luminari-gurus/tactics-guru-v2/issues/80) connects the merged run, encounters, ownership and reward controls into a playable three-battle run. The owner accepted baseline #57 on 2026-10-15 using the recorded Playwright evidence, so its prerequisite no longer blocks this integration.

Caller: `dubstylee`. Branch: `work/issue-80-run-progression`. Base: `origin/main` at `46284e10d18271b2e410e3c2532e27231cd3a8d6`. Implementation approval: pending.

## What Changes

- Add a discoverable `/run` entry with Start/Continue, encounter preparation, the existing battle controls, one reward choice after each of the first two victories, final victory/defeat and Start new run. Preserve `/`, proof and map flows.
- Construct each authored battle from the accepted run seed, surviving party HP and once-projected equipment, resetting all battle-local state.
- Extend the existing run controller to own battle snapshots and atomic outcome/reward/new-run boundaries, rejecting duplicate and stale scene callbacks.
- Reuse the bounded run envelope, guarded storage and item UI. Persist accepted player/enemy commands and run boundaries; restore without historical presentation or audio.
- Verify legal three-encounter victory, defeat, restart and resume through real controls, plus deterministic replay and next-command/RNG equivalence.

## Capabilities

### New Capabilities

- `authored-run`: Live authored encounter progression, ownership/reward integration and bounded run continuation across battle/preparation/reward/outcome boundaries.

### Modified Capabilities

None. Existing single-battle session, controls and audio contracts remain regression requirements; run-specific behavior is additive.

## Impact

Expected areas: `src/domain/runBattle.ts` (new construction/replay helpers), existing run/items/save modules only where boundary integration needs them; `src/app/RunItemSession.ts`, new run bootstrap, `BattleSession.ts`, `src/main.ts`, `src/phaser/start.ts`, `BattleScene.ts`, `src/ui/runItems.ts` and scoped run UI/styles. Focused unit/browser tests, existing single-battle regressions and run handoff documentation accompany the change.

Dependencies: merged #73/#75/#76/#78/#79; #57 owner acceptance. No dependency on unmerged #112/#113; preserve their work boundaries. No combat/balance changes, HUD redesign, new items/art, dependency upgrade, save migration, overworld integration, backend, deployment or parent-epic certification. #81 retains broader playtest/tuning work. Current owner acceptance permits Playwright evidence; record engine emulation and known failures accurately.
