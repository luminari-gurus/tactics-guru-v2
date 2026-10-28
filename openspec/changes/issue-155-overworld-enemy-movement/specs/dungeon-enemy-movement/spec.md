## ADDED Requirements

### Requirement: Player-driven dungeon movement
The dungeon SHALL advance living enemies once for each accepted player step, using independently persisted deterministic movement state. Waiting, invalid commands, rendering and reload SHALL NOT advance enemies.

#### Scenario: Player waits
- **WHEN** time passes without an accepted player step
- **THEN** enemy positions and movement state remain unchanged

#### Scenario: Player moves
- **WHEN** the player steps onto an unoccupied walkable cell
- **THEN** enemy movement and player position are saved in the same revision

### Requirement: Unordered dungeon encounters
Entering any uncleared enemy marker SHALL start that enemy's encounter. All three encounters SHALL be cleared before descending.

#### Scenario: Guardian encountered first
- **WHEN** the player enters the guardian marker before the other encounters
- **THEN** the guardian battle starts and remaining encounters stay available

### Requirement: Dungeon save continuation
The dungeon SHALL persist movement and unordered completion while accepting valid format-4 saves without rerolling progress.

#### Scenario: Reload after movement
- **WHEN** a saved dungeon is reopened
- **THEN** saved enemy positions and movement RNG resume without advancing
