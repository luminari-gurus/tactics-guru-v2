## Purpose

Preserve deterministic run continuation, item ownership and pending rewards through bounded snapshots and guarded local storage.

## ADDED Requirements

### Requirement: Bounded validated run snapshot
The run snapshot SHALL include run identity/phase/index/seed/party, owned inventory, equipment assignments, pending offer and item revision, plus an optional committed active battle. Exact shapes, finite bounds, versions, content identities and integrity SHALL be validated before hydration, including consistency between run, items and battle.

#### Scenario: Invalid or incompatible payload
- **WHEN** a snapshot is oversized, malformed, corrupt, incompatible or has mismatched battle/ownership/boundary data
- **THEN** hydration fails safely and original primary/backup bytes remain available for recovery

### Requirement: Deterministic continuation
Saving and restoring SHALL preserve pending reward identity, ownership, projected stats, next encounter and next RNG/command behavior. Restoration SHALL rebuild equipment projection from base definitions once and SHALL NOT replay prior animations, audio or rewards.

#### Scenario: Reload before and after claim
- **WHEN** a pending reward is saved and restored, then claimed and restored again
- **THEN** the same offer is available before claim and exactly one owned reward and the correct next encounter are present afterward

#### Scenario: Active battle restoration
- **WHEN** a committed active battle is restored with owned equipment
- **THEN** battle state and next RNG match uninterrupted continuation without adding equipment bonuses again

### Requirement: Guarded local recovery
Run storage SHALL use bounded primary/backup slots with guarded access, validated backup preservation and visible nonfatal storage failure. Invalid or unreadable data SHALL require explicit recovery before replacement. Legacy Godot keys and existing single-battle saves SHALL remain intact.

#### Scenario: Write or storage failure
- **WHEN** access fails, quota is exhausted or a write is interrupted
- **THEN** play remains possible with an unsaved indication and retained recovery data, without claiming successful persistence
