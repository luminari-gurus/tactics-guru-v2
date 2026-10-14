# Spec Delta

## Purpose

Provide a small validated catalog and deterministic reward offers with explicit ownership contracts for the authored three-encounter run.

## ADDED Requirements

### Requirement: Bounded generic item definitions
The catalog SHALL contain discriminated consumable/equipment definitions with unique stable IDs, catalog labels, known hero references and bounded whitelisted effects. Unknown shapes, fields, effects, unsafe numbers and invalid references MUST fail runtime and build validation.

#### Scenario: Initial entries
- **WHEN** the authored catalog is validated
- **THEN** Healing Draught restores 6 HP, Warding Charm grants 1 armor class and Aiming Charm grants 1 accuracy, with both charms using the charm slot.

#### Scenario: Invalid or extensible entries
- **WHEN** a definition has an invalid effect or reference
- **THEN** validation fails with a located error without accepting partial content.
- **WHEN** an additional fixture item uses an existing allowed effect and valid label
- **THEN** validation and reward generation accept it without an item-ID-specific branch.

### Requirement: Explicit eligibility and effect timing
The contract SHALL allow healing only for a living injured hero between encounters, capped at base maximum HP, and charm changes only between encounters for living heroes. Equipment bonuses SHALL apply once to fresh battle stats without changing immutable definitions; zero-HP heroes MUST remain defeated.

#### Scenario: Healing and equipment handoff
- **WHEN** a downstream command targets a defeated or full-health hero for healing, or requests item use during battle
- **THEN** the documented contract requires rejection without consumption or mutation.
- **WHEN** a living hero starts successive battles with a charm
- **THEN** the documented projection adds its bonus once per fresh battle.

### Requirement: Separate bounded ownership
The contract SHALL distinguish immutable definitions, owned consumable stacks and unique equipment instances. Consumable quantities SHALL be bounded at 9 per definition, equipment at 6 instances per run, with one charm per hero. Replacement and unequip SHALL retain ownership and return the prior instance to unequipped inventory.

#### Scenario: Ownership invariants
- **WHEN** ownership contains duplicate instance IDs, unknown definitions, excessive quantities, incompatible slots or one instance assigned twice
- **THEN** the documented validation contract requires rejection before state mutation.

### Requirement: Deterministic persisted offers
Each of the first two victories SHALL offer two distinct catalog items and one claim; final victory SHALL offer none. Offers SHALL use the accepted run reward identity and independent seed, canonical item ordering and versioned catalog identity. Preview MUST neither mutate a stored offer nor consume battle entropy.

#### Scenario: Replay and ordering
- **WHEN** equal reward boundaries and catalog values generate an offer repeatedly, including reordered catalog keys
- **THEN** option order, quantities and identity are identical and inputs remain unchanged.

#### Scenario: Stored offer validation
- **WHEN** a stored offer has a stale boundary, mismatched catalog identity, altered options or invalid fields
- **THEN** the pure offer reader rejects it before downstream claim processing.

### Requirement: Atomic claim interface
The contract SHALL require a matching run identity, revision, reward boundary and offered option for a claim. Grant and reward acknowledgment MUST be one atomic downstream transition; duplicates, stale claims and ownership overflow MUST leave party, inventory, equipment, actions and RNG unchanged. Command execution belongs to the subsequent owned-item package.

#### Scenario: Claim handoff
- **WHEN** the downstream command package implements claim
- **THEN** it can consume the specified offer and ownership shapes, preflight the grant, and acknowledge the reward only with the same successful transition.
