# Spec Delta

## Purpose

Define the reproducible three-encounter run boundaries used by encounter authors, rewards, and later session and persistence integration.

## ADDED Requirements

### Requirement: Bounded run state
The run SHALL have a versioned JSON-compatible identity, seed, three ordered encounter identities, phase, encounter index and fixed party HP. Unknown identities, unsafe numbers, extra fields and inconsistent phase data SHALL be rejected before transitions.

#### Scenario: Invalid input
- **WHEN** a run contains duplicate heroes, out-of-range HP, a fourth encounter or an invalid phase/index combination
- **THEN** it is rejected without mutation or entropy consumption

### Requirement: Party carryover
Surviving heroes SHALL retain remaining HP between encounters without automatic healing. Heroes at zero HP SHALL remain defeated and excluded from subsequent participation. Initiative, action flags and battle-local statuses SHALL NOT be run-owned fields.

#### Scenario: Partial party victory
- **WHEN** a victorious party has one defeated hero and damaged survivors
- **THEN** the next encounter receives only the survivors with their remaining HP and fresh battle-local state

### Requirement: Ordered atomic progression
Victories in encounters 1 and 2 SHALL produce one pending reward boundary; one accepted claim SHALL advance to the next encounter. Third victory SHALL terminate successfully without a further reward. Party wipe SHALL terminate in defeat. Stale or duplicate outcomes and claims SHALL leave state and RNG unchanged.

#### Scenario: Duplicate claim
- **WHEN** a previously accepted reward claim is submitted again or an old battle callback arrives after progression
- **THEN** it grants no reward and advances no encounter

#### Scenario: Final outcomes
- **WHEN** the third encounter is won or the party is wiped in any encounter
- **THEN** the run becomes victory or defeat respectively and rejects further progression commands

### Requirement: Independent deterministic randomness
Encounter and reward seeds SHALL be derived independently from the run seed, version, purpose and encounter index. Identical inputs and choices SHALL reproduce boundaries. Previews and rejected commands SHALL consume no randomness.

#### Scenario: Preview independence
- **WHEN** reward previews repeat or presentation timing changes
- **THEN** encounter seeds and the next reward boundary remain identical

### Requirement: Fresh run intent
Both terminal outcomes SHALL expose a Start new run intent for later outcome-screen integration. It SHALL require a caller-provided new seed and identity and reset to encounter 1, full initial-party HP and empty ownership, with no separate restart modal required.

#### Scenario: Start from defeat
- **WHEN** Start new run is accepted with fresh identity and a different valid seed
- **THEN** the fresh run contains no prior defeat, reward, equipment or callback identity

### Requirement: Reward and save extension boundaries
The contract SHALL expose stable pending reward identity and deterministic reward seed for catalog consumers and versioned run/active-battle extension points for saves. Item effects, ownership mutations and storage implementation SHALL remain separate. A restored pending boundary SHALL retain its identity and seed.

#### Scenario: Pending boundary round trip
- **WHEN** a pending reward run is serialized to JSON and read back
- **THEN** party HP, phase, encounter index, reward identity and seed match without a second grant or RNG draw
