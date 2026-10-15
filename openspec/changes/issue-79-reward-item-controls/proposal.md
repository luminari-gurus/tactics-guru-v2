# Proposal

## Why

[#79](https://github.com/luminari-gurus/tactics-guru-v2/issues/79) needs playable reward/item controls and resumable ownership now that #75, #73 and #78 are merged. These supply #80's integration and #81's certification without requiring those later issues to define a competing save format.

## What Changes

- Add catalog-driven between-encounter reward, consumable and equipment controls, with authoritative revision checks and visible rejection.
- Define one bounded run snapshot codec and guarded primary/backup storage contract containing RunItems plus an optional active battle.
- Add a small session/controller boundary connecting these controls to pure item commands and save/restore; expose reusable production components in browser fixtures before #80 connects complete battle progression.
- Verify pending/claimed rewards, ownership, projection, RNG and next encounter across reload and failure through real inputs.

## Capabilities

### New Capabilities

- `run-item-controls`: Accessible catalog-driven reward and party-item interactions at permitted encounter boundaries.
- `run-persistence`: Validated bounded run snapshots with ownership, pending offers, active battle and safe local recovery.

### Modified Capabilities

None. Existing battle controls/session behavior remains a regression constraint.

## Impact

Expected additions: src/app/RunItemSession.ts, src/ui/runItems.ts, src/domain/runSaveEnvelope.ts, src/persistence/runStorage.ts and focused tests/fixtures. Update src/domain/run.ts's placeholder save contract, scoped CSS, Playwright fixture configuration and handoff documentation as needed. No dependency changes.

Caller: dubstylee. Branch: work/issue-79-reward-item-controls. Base: origin/main at 4dac500cb204c9b707d8d2f7fab526941c07be7f (merged #115). Approval: explicitly approved by the caller in this conversation on 2026-10-14 ("Approved"). The clean branch was published before planning. Readiness: #73/#75/#78 are merged; #79 has no GitHub blockers, assignees or active branch/PR at selection. #80 still requires #57; #111 awaits #108 acceptance; #84 requires an owner target decision. #64/#66 require physical-device evidence unavailable in this automated session. Parent epics are not implementation blockers for this child.
