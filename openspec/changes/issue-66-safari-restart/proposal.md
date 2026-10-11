# Proposal

## Why

[Issue #66](https://github.com/luminari-gurus/tactics-guru-v2/issues/66) records an intermittent physical iPhone Safari restart error followed by a successful retry. Existing automated restart passes do not establish its cause or resolution, and generic error messages can lose the evidence needed to diagnose it.

## What Changes

- Reproduce legal outcome-dialog restarts and retain the original report, exact error context and successful retry.
- Use existing error/trace capture and diagnostics; add bounded, inspectable failure context only if the current capture cannot preserve a physical failure.
- Correct only a confirmed lifecycle defect, backed by a failing-before/passing-after regression through actual controls.
- Record repeated physical Safari restart results or an explicit unreproduced/missing-evidence disposition without claiming hardware acceptance from emulation.

## Capabilities

### New Capabilities

- `battle-restart`: observable restart lifecycle correctness, failure evidence and physical Safari acceptance. The repository has no main capability specs yet; this complements the unarchived battle-loop work without rewriting it.

### Modified Capabilities

None.

## Impact

Branch: `work/issue-66-safari-restart`, based on main `a74bb5e1e68b24bdf0bf49ff3e6726bde6fb146a`. Assignee: `moshehbenavraham`. Full [implementation plan](../../../docs/ongoing-projects/issue-66-safari-restart/plan.md).

Investigation follows `src/main.ts`, `src/ui/dialogs.ts`, `src/phaser/start.ts`, `src/phaser/BattleScene.ts`, `src/phaser/BoardRenderer.ts` and their loader/audio/session collaborators. Expected proof uses existing `tests/battle-loop.spec.ts` and helpers, conditional diagnostic coverage/WebKit configuration, and `docs/qa/issue-66-safari-restart.md`. No new dependency, deployment change, combat-rule change or speculative renderer repair. PR #67 remains separate and unmerged; its teardown guard is relevant comparison evidence only.

This change contains planning artifacts only until implementation is requested.
