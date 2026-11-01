# Spec Delta

## Purpose

Define deterministic enemy movement in response to accepted dungeon exploration steps.

## ADDED Requirements

### Requirement: Distinct pursuit profiles
Enemies SHALL have passive, chase or block profiles. Chase detection and routing SHALL use the player position immediately before the accepted step; block SHALL use the resulting position. Chase SHALL step into that vacated cell when it is reachable and unoccupied, including when the pursuer is already adjacent to it or to the player's resulting cell. Block SHALL seek a free cell adjacent to the resulting position. Passive wandering SHALL retain its existing deterministic rules. An invalid or out-of-range previous player cell SHALL NOT be used as a chase target, and no pursuer SHALL occupy the player's current cell.

#### Scenario: Different targets
- **WHEN** a legal step creates different routes toward the old and new positions
- **THEN** chase and block use their respective target for detection and route selection

#### Scenario: Trailing chase keeps pace
- **WHEN** a chasing enemy is directly behind a player who walks straight away
- **THEN** the chaser steps into the vacated cell on every accepted step and remains in detection range

### Requirement: Legal movement and encounter entry
Enemy movement SHALL resolve in stable enemy order against actual current occupancy and legal terrain, avoiding available stairs. A player entering an uncleared enemy SHALL start its encounter before enemies advance.

#### Scenario: Contested positions
- **WHEN** enemies pursue around old and new player cells or compete for a destination
- **THEN** no enemy enters an occupied player or enemy cell, overlaps another enemy, crosses invalid terrain or takes an unavailable destination

#### Scenario: Adjacent or unreachable target
- **WHEN** a blocking enemy is adjacent to the player's current cell, a chasing enemy cannot legally occupy the vacated cell, or either pursuer has no legal route
- **THEN** it stays in place

#### Scenario: Invalid previous player cell
- **WHEN** chase receives an out-of-range, non-cell, or current-player previous position
- **THEN** it does not occupy that value or the player's current cell

### Requirement: Deterministic step and continuation
An accepted step SHALL advance active enemies at most once using the independent persisted movement RNG. Rejected steps, rendering and reload SHALL NOT advance them. Current compatible saves SHALL retain positions, progress and RNG on continuation.

#### Scenario: Resume
- **WHEN** a dungeon is saved and resumed before the next accepted step
- **THEN** identical commands produce the same enemy positions and RNG as uninterrupted play
