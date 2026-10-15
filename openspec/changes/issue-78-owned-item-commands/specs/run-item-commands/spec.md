# Spec Delta

## Purpose

Execute deterministic owned-item and reward operations for the authored run while preserving ownership, rejected-state atomicity and fresh battle effects.

## ADDED Requirements

### Requirement: Validate bounded ownership
The system SHALL validate owned consumable stacks, equipment instances and assignments before execution, returning owned data. It MUST enforce known matching definitions, quantities 1–9, at most six equipment instances, unique stable instance identities, and one compatible charm slot per hero and assignment per instance.

#### Scenario: Reject invalid inventory
- **WHEN** ownership contains malformed fields, duplicate stacks or instances, unknown items/heroes, overflow, a consumable assigned as equipment or a multiply assigned instance
- **THEN** validation fails without modifying input data.

### Requirement: Atomic reward claim
A claim SHALL require matching run, revision, reward boundary, offer identity and offered option, and valid grant capacity. Success MUST grant exactly one item and advance the reward boundary together. Rejected, duplicate or stale claims MUST leave run, ownership, actions and RNG unchanged. Equipment identity SHALL derive from reward identity and option ordinal without entropy.

#### Scenario: Claim once
- **WHEN** a valid option is claimed and the same intent is submitted again
- **THEN** the first result grants once and advances once, and the duplicate rejects without a second grant or draw.

#### Scenario: Capacity or offer failure
- **WHEN** a claim exceeds ownership bounds or uses a tampered, incompatible, stale or unoffered choice
- **THEN** neither grant nor advancement occurs.

### Requirement: Context and duplicate preflight
Use, equip and unequip SHALL require matching live run boundary and item revision, no active battle, and either a reward phase or subsequent encounter preparation. Initial entry, battle execution and terminal outcomes MUST reject. Rejected operations MUST preserve party, ownership, equipment, action economy and RNG.

#### Scenario: Stale or forbidden operation
- **WHEN** an operation is repeated after success or submitted in an active battle, initial entry, terminal outcome or mismatched context
- **THEN** it rejects without any partial mutation or entropy draw.

### Requirement: Healing obeys ownership and eligibility
Consumable use SHALL require an owned positive stack and a living injured eligible hero. It MUST restore the definition's bounded HP amount capped at base maximum, consume one quantity, and remove an exhausted stack. Defeated or full-health heroes MUST reject without consumption.

#### Scenario: Capped healing and exhausted stack
- **WHEN** a living injured hero uses its final owned draught
- **THEN** HP increases by up to 6 without exceeding base maximum and the stack is removed.

### Requirement: Equipment changes retain ownership
Equip SHALL require an owned eligible compatible instance and a living hero. Replacement MUST leave the prior instance owned and unequipped. Unequip MUST remove only the matching assignment. An instance already assigned to another hero MUST reject; defeated heroes retain their records but cannot change equipment.

#### Scenario: Replace and unequip
- **WHEN** a living hero replaces charm A with owned charm B and then unequips B
- **THEN** both instances remain owned, only B is assigned after replacement, and neither is assigned after unequip.

### Requirement: Fresh generic stat projection
Equipment effects SHALL be derived once from immutable base stats for each fresh battle. Projection MUST preserve base catalogs and ownership, omit bonuses for defeated heroes, and use allowed effect shapes rather than item-specific branches. Repeated projection, equip cycles and JSON restoration MUST not accumulate effects.

#### Scenario: Projection composition and replay
- **WHEN** warding and aiming charms are projected across successive battle creation, replacement, unequip and JSON restoration
- **THEN** armor class and accuracy reflect only the current assignment, existing combat consumes the projected values, and identical seeds and inputs produce identical results.

#### Scenario: Additional catalog entry
- **WHEN** a validated fixture item uses an existing healing or stat-bonus effect
- **THEN** claim, ownership, use or projection works without a branch on that item's ID.
