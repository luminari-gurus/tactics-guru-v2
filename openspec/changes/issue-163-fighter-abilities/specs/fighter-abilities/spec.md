# Spec Delta

## Purpose

Give progressing Fighters bounded self-healing and tactical enemy targeting control across playable, replayed and restored encounters.

## ADDED Requirements

### Requirement: Canonical unlock boundaries
Second Wind SHALL unlock for Fighters at level 2 and Taunt at level 3 through earned progression. Standalone battles SHALL remain level 1. Repeated construction SHALL NOT accumulate stat projections or grant locked commands.

#### Scenario: Level boundaries
- **WHEN** Fighters reach levels 1, 2, 3 and 5
- **THEN** their canonical learned actions match those thresholds in run and dungeon battles, while standalone battles exclude both abilities

### Requirement: Atomic Second Wind
A living active Fighter SHALL heal itself by the lesser of missing HP and 4 + projected power, spending one action and its single battle use together without RNG. Full health, exhausted use, spent action, foreign/dead target and unavailable ability SHALL reject without mutation.

#### Scenario: Healing and rejection
- **WHEN** Second Wind is previewed, cancelled, confirmed twice or attempted on invalid targets
- **THEN** only the first legal confirmation changes HP, action, use, events and history; preview and rejection preserve all state and RNG

### Requirement: Taunt lifecycle
Taunt SHALL spend an action to affect a living hostile within Manhattan range 1 and clear LOS without damage or rolls. It SHALL replace the source and expire after that target's next accepted turn end, or immediately upon source/target defeat. Current hostiles SHALL have no immunity; unsupported immunity data SHALL reject.

#### Scenario: Exact expiry
- **WHEN** Taunt spans round wrap, is replaced, its source dies or its target ends an idle turn
- **THEN** only the current living source restricts attacks and the status expires at the specified boundary

### Requirement: Legal forced targeting
A taunted enemy's offensive commands SHALL target only its living taunter. AI SHALL attack from a legal reachable position, approach a reachable firing position or Wait. It SHALL respect range minima, LOS, terrain, occupancy and budgets with stable decisions and no retry loop.

#### Scenario: Restricted or unreachable source
- **WHEN** another hero is easier to attack or the taunter cannot be reached
- **THEN** previews, resolution and AI obey the same restriction and the enemy completes its turn legally

### Requirement: Accessible ability feedback
The existing picker and board/self targeting SHALL expose legal healing and Taunt with actual heal amount, remaining use, unlock levels, source and expiry. Inspection and accepted-event logs SHALL reflect restored state. Keyboard/touch, cancel, resize and presentation locks SHALL remain effective.

#### Scenario: Play through progression
- **WHEN** a legal production dungeon journey earns level 3 and uses both actions
- **THEN** their previews, confirmation, inspection and logs match combat state on desktop and touch layouts without describing healing as friendly fire or an attack roll

### Requirement: Durable deterministic encounter state
Save/resume and replay SHALL retain spent use and Taunt with identical accepted state/events/RNG. Fresh encounters SHALL reset both and carry healed HP. Saves SHALL admit only bounded Fighter healing above entry HP and reject malformed resources/references. Incompatible old saves SHALL preserve original bytes for recovery/export.

#### Scenario: Persistence and preservation
- **WHEN** a healed run/dungeon is saved, resumed, completed or replayed
- **THEN** healing remains valid, defeated heroes are not revived, battle effects do not leak into party/floor state, and Guarded Strike and Magic Missile retain their approved behavior
