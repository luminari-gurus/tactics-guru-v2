# Spec Delta

## Purpose

Preserve recoverable battle snapshots in browser-local storage and expose validated recovery choices without allowing storage failure to interrupt in-memory play.

## ADDED Requirements

### Requirement: Only validated compatible snapshots are exposed
The storage boundary SHALL use the accepted bounded battle-save contract for every state it writes or exposes. Missing, valid, invalid and unreadable slots MUST be distinguishable. Invalid or incompatible data SHALL NOT expose a partial restored state.

#### Scenario: Compatible accepted boundary
- **WHEN** a valid player, enemy, ongoing or ended boundary is saved and loaded
- **THEN** state and deterministic continuation remain equivalent to the accepted input, without modifying the input or catalog

#### Scenario: Rejected envelope
- **WHEN** either slot contains malformed, oversized, corrupt, invariant-invalid or incompatible data
- **THEN** that slot returns its validation failure and exact original text without a restored state

### Requirement: Recovery selection is read-only and explicit
Loading SHALL prefer a valid primary and otherwise offer a valid backup with source and diagnostics. It MUST inspect both slots independently, distinguish read failure from absence, and perform no repair, replacement or removal.

#### Scenario: Both slots validate
- **WHEN** primary and backup contain different valid snapshots
- **THEN** primary is selected and backup remains unchanged

#### Scenario: Primary cannot be used
- **WHEN** primary is missing, invalid or unreadable and backup validates
- **THEN** backup is offered with the primary condition explicitly reported and no persistent mutation

#### Scenario: No validated candidate
- **WHEN** neither slot validates
- **THEN** loading returns no restored state, preserves available raw text, and reports absence, validation failures or storage failures as applicable

### Requirement: Ordinary writes preserve recovery data
Ordinary saves MUST validate the proposed snapshot and freshly inspect both slots before mutation. They SHALL refuse writes if either slot is unreadable or contains undecodable data. Original strings SHALL remain available for explicit recovery/export/reset without automatic truncation, normalization or deletion.

#### Scenario: Invalid primary and good backup
- **WHEN** a new save is requested with corrupt or incompatible primary text and a valid backup
- **THEN** it returns recovery-required status without overwriting either slot or copying the invalid primary into backup

#### Scenario: Invalid backup or unknown slot
- **WHEN** primary validates but backup is invalid, or either slot cannot be read
- **THEN** the save refuses mutation and exposes the reason while retaining caller state

### Requirement: Interrupted writes retain a validated recovery point
Saving SHALL preserve a validated recovery point before publishing a new primary. Failed backup preservation MUST prevent primary replacement. A failed primary write or interruption between operations MUST leave a validated existing or newly seeded snapshot recoverable under the documented single-writer, per-operation storage model.

#### Scenario: Existing valid primary
- **WHEN** a new save replaces a valid primary
- **THEN** the prior primary is preserved as backup first; a backup failure leaves primary untouched and a subsequent primary failure leaves the prior state recoverable

#### Scenario: Backup is the only saved state
- **WHEN** primary is missing and backup validates
- **THEN** a new primary is written without replacing backup, and failure leaves that backup available

#### Scenario: First save is interrupted
- **WHEN** both slots are missing and saving is interrupted after the recovery copy succeeds but before primary publication
- **THEN** a fresh load offers the newly seeded backup and does not require a partially written primary

### Requirement: Storage failures are nonfatal typed results
Storage acquisition and every read, write and explicit removal SHALL be guarded. Quota, security, unavailable-storage and other failures MUST identify the failed operation and slot where applicable without mutating the caller's battle state, catalog or RNG or throwing into gameplay.

#### Scenario: Storage operation throws
- **WHEN** acquisition or any individual storage operation throws
- **THEN** the caller receives a typed failure suitable for later status presentation and its in-memory battle can continue unchanged

### Requirement: Persistence owns only its explicit namespace
The adapter SHALL access only its two documented Phaser battle slots. It MUST NOT enumerate, clear, read, overwrite or remove legacy Godot keys. Removal SHALL require an explicit slot request and an unchanged inspected value; normal load/save operations MUST NOT remove data.

#### Scenario: Unrelated keys exist
- **WHEN** load, save or explicit removal operates with unrelated legacy and application entries present
- **THEN** all access is confined to the owned slots and unrelated entries remain untouched

#### Scenario: Explicit removal is stale or fails
- **WHEN** the requested slot differs from the inspected value, or its re-read/removal fails
- **THEN** removal reports changed or failure without claiming reset success and retains any already inspected raw text for recovery

#### Scenario: Explicit removal targets unchanged data
- **WHEN** a caller explicitly removes a slot whose successfully re-read value matches its inspection
- **THEN** only that slot is removed, or a confirmed missing slot succeeds idempotently

### Requirement: Adapter guarantees and later integration remain distinct
Documentation SHALL describe origin-scoped best-effort storage, recovery precedence, failure/interruption behavior and concurrency/durability limitations. Adapter delivery MUST leave live hydration, autosave, recovery controls and restart invalidation to #73, and lifecycle/physical-device certification to #74.

#### Scenario: Adapter validation completes
- **WHEN** the adapter fixtures and configured regressions pass
- **THEN** the report identifies their exact scope without claiming live resume, atomic multi-slot reset, cross-tab serialization, physical-device acceptance or parent-epic completion
