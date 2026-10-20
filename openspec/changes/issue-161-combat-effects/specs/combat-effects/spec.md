# Combat Effects Spec Delta

## Purpose

Give battle effects one bounded legality, modifier and lifetime contract shared by combat, movement, previews, enemy decisions, inspection and continuation.

## ADDED Requirements

### Requirement: Closed effect contract and incremental activation
The system SHALL document closed cases for heal, mark, taunt, movement block, accuracy/AC modifiers, finite stacks and resources, linking each to its owning content issue. Executable mechanics SHALL enter production with a real consumer. Unsupported effect kinds SHALL reject rather than be ignored. A contract-only case SHALL NOT be reported as shipped gameplay.

#### Scenario: First production consumer
- **WHEN** this change is implemented
- **THEN** Guarded Strike uses shared effect evaluation and lifecycle, while downstream skill/enemy additions remain outside the available action catalog

#### Scenario: Unimplemented effect
- **WHEN** a catalog or snapshot supplies an effect case that has no enabled production consumer
- **THEN** validation rejects it without spending resources or silently accepting inert state

### Requirement: Pure shared evaluation and atomic rejection
Every supported effect SHALL use the same authoritative eligibility and derived modifiers for preview, resolution, AI and inspection. Preflight SHALL complete before consuming actions, uses, effects or RNG. Rejection and cancellation SHALL leave state, events, accepted-command history and RNG unchanged.

#### Scenario: Preview and cancel Guarded Strike
- **WHEN** a valid or invalid Guarded Strike is repeatedly previewed and cancelled
- **THEN** preview values match resolution inputs and neither guard state nor budgets, history or RNG change

#### Scenario: Failed preflight
- **WHEN** a command has an invalid target, exhausted budget, invalid effect or exhausted required RNG capacity
- **THEN** the entire command rejects without applying a partial effect

### Requirement: Guarded lifecycle and modifier parity
Guarded Strike SHALL apply its existing −2 attack/+2 AC tradeoff once, including on an accepted miss, and expire before the Fighter's next turn. Reapplication SHALL NOT stack. All derived displays and AI attack evaluations SHALL use those same values. Defeat and fresh encounter construction SHALL remove battle-local active effects.

#### Scenario: Miss and expiry
- **WHEN** Guarded Strike misses and initiative later returns to its living Fighter
- **THEN** Guarded is active after the miss, applies once to intervening evaluations, and expires before the next player decision with existing event semantics

#### Scenario: Defeat and encounter transition
- **WHEN** a guarded Fighter is defeated or a new encounter starts
- **THEN** no active guard survives on the defeated unit or transfers into the new battle

### Requirement: Bounded status and resource persistence
Supported effects and resources SHALL have validated identities, source/target references, integer bounds and explicit expiry/refresh rules. Standalone, run and dungeon active-battle saves SHALL preserve supported effect state exactly across resume. Invalid or incompatible saves SHALL retain original bytes and use existing recovery. Unsupported resource fields SHALL reject until their real consumer is introduced.

#### Scenario: Resume guarded battle
- **WHEN** a guarded active battle is saved and resumed in standalone, run or dungeon mode
- **THEN** its modifiers, RNG and future expiry match uninterrupted execution without applying the modifier twice

#### Scenario: Malformed or unsupported state
- **WHEN** status data contains duplicate or unknown identities, illegal source references, invalid lifetime/stack bounds or unsupported resources
- **THEN** readers reject it and storage recovery preserves the original save

### Requirement: Consumer-bound damage save and immunity semantics
The effect contract SHALL define modifier ordering, integer rounding, minimum damage, save-roll policy and immunity timing for the identified Shaman, Hobgoblin, Orc, Skeleton and hazard consumers. Implementations SHALL activate only with those consumers and their tests. Ordinary untyped attacks and Magic Missile's approved automatic force-hit formula SHALL remain unchanged in this increment.

#### Scenario: Later consumer handoff
- **WHEN** a dependent content issue activates saving throws, typed damage or immunity
- **THEN** it supplies explicit content values and tests preview/resolution agreement, natural-roll boundaries, miss/critical/multi-hit behavior and deterministic continuation before that case is accepted as implemented

### Requirement: Acceptance evidence distinguishes contract and gameplay
Delivery SHALL map every #161 acceptance criterion to its contract, implementation and verification status. Evidence SHALL include Guarded miss/hit/critical, expiry, defeat, serialization, replay and browser feedback. Downstream cases lacking real consumer verification SHALL remain explicitly outstanding and SHALL prevent full issue closure.

#### Scenario: Incremental delivery
- **WHEN** Guarded integration passes but downstream effects have no production consumers
- **THEN** the delivery references #161, lists outstanding consumer gates, and does not claim all effect mechanics or full issue acceptance
