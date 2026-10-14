# Proposal

## Why

[Issue #78](https://github.com/luminari-gurus/tactics-guru-v2/issues/78) needs executable ownership and reward commands now that #75/PR #107 and #77/PR #114 are merged. The current reward acknowledgment advances the run without granting inventory; the item package must make grant and advancement atomic before #79 controls and #80 integration consume it.

Caller: `dubstylee`. Branch: `work/issue-78-owned-item-commands`. Base: `origin/main` at `73fed0be21358276c9ae70164a952c259ab4086a`. Caller explicitly approved the published plan at `4d59b01` on 2026-10-14 with “Approved”.

Readiness refresh on 2026-10-14 covered all 16 open issues (paginated API includes three PR records), dependency relationships, relevant comments, three open PRs and remote branches. #75 is closed with merged PR #107 (`7a9b22b`); #77 is closed with merged PR #114 (`73fed0b`). #78 had no assignee, dependency relation or active branch/PR; its body prerequisites are both complete. Added and read back the exact `ready for work` label, refreshed candidates, assigned and verified `dubstylee`, and confirmed remote branch publication. #78 directly supplies #79 and #80, then their work supplies #81. #64/#66 retain physical-device acceptance; #74/#80/#81 retain #57 gates, #79 awaits #78, #111 awaits accepted #108 design (open PR #112), #84 retains owner target/path decisions, and #85 retains acceptance/activation gates. Parent epics stay unchanged; no other readiness promotion was supported.

## What Changes

- Validate owned stacks, equipment instances and assignments against the accepted bounded item contract.
- Add pure atomic claim/use/equip/unequip operations with explicit trusted encounter-preparation context and stale-operation checks.
- Project equipment onto fresh battle catalog stats, preserving immutable base definitions and single-battle behavior.
- Prove ownership, rejection atomicity, deterministic replay and generic effect composition; document the #79/#80 interface.

## Capabilities

### New Capabilities

- `run-item-commands`: Executable ownership validation, atomic item/reward operations and fresh equipment projection.

### Modified Capabilities

None. The unarchived #77 `run-item-catalog` contract remains the content baseline; this adds execution rather than rewriting its specification package.

## Impact

Expected files: `src/domain/items.ts` (new), `src/domain/rewards.ts`, `src/domain/run.ts` and `src/content/itemTypes.ts` only where the command interface needs them; `tests/unit/itemCommands.test.ts` (new), existing reward/run fixtures as needed, and `docs/run-items.md`. Reuse validation, run transitions and offer readers. No dependency, UI, storage/save-format, Phaser, combat balance, deployment or device certification changes. #57 remains the release gate; #79/#80 own runnable integration.
