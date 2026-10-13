# Proposal

## Why

Issue [#75](https://github.com/luminari-gurus/tactics-guru-v2/issues/75) supplies the shared contract needed by encounter authoring #76 and reward catalog #77, then commands #78 and integration #79/#80. The caller has settled HP, defeat, reward cadence, seed and outcome-screen decisions; these now need a bounded, testable domain contract.

## What Changes

- Define a pure three-encounter RunState, strict reader, deterministic seed derivation and atomic transition reference implementation with focused fixtures.
- Carry surviving HP, exclude defeated heroes, grant no automatic healing, and offer one reward choice after encounters 1 and 2.
- End on party wipe or third victory. Specify Start new run on both outcome screens; caller supplies a new seed and reset party/inventory. Actual screens remain #80 work.
- Document reward and save extension interfaces without implementing inventory, storage or playable progression.

## Capabilities

### New Capabilities
- `authored-run`: bounded run identity, party carryover, deterministic encounter/reward boundaries and exactly-once transitions.

### Modified Capabilities
None. Existing single-battle behavior remains unchanged.

## Impact

Planned files: `src/domain/run.ts`, `tests/unit/run.test.ts`, `docs/run-contract.md`, and this change's task evidence. No dependencies, assets, battle rules, UI, save format or deployment changes.

Caller: `dubstylee`. Branch: `work/issue-75-run-contract`. Base: `main` at `79f7d983ff3a12ca38e93efdc72f3f317dfb789c`. Issue is assigned and readiness label verified. #57 acceptance remains a downstream feature-delivery gate; this contract may proceed independently. Caller-reported iPhone verification is not a replacement for recorded #57 acceptance evidence.

Implementation approval: pending review of this plan; product decisions alone do not authorize implementation.
