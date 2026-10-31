# Spec Delta

## Purpose

Define deterministic enemy movement in response to accepted dungeon exploration steps.

## ADDED Requirements

### Requirement: Distinct pursuit profiles
Enemies SHALL have passive, chase or block profiles. Chase detection and routing SHALL use the player position immediately before the accepted step; block SHALL use the resulting position. Passive wandering SHALL retain its existing deterministic rules.

#### Scenario: Different targets
- **WHEN** a legal step creates different routes toward the old and new positions
- **THEN** chase and block use their respective target for detection and route selection

### Requirement: Legal movement and encounter entry
Enemy movement SHALL resolve in stable enemy order against actual current occupancy and legal terrain, avoiding available stairs. A player entering an uncleared enemy SHALL start its encounter before enemies advance.

#### Scenario: Contested positions
- **WHEN** enemies pursue around old and new player cells or compete for a destination
- **THEN** no enemy enters an occupied player or enemy cell, overlaps another enemy, crosses invalid terrain or takes an unavailable destination

#### Scenario: Adjacent or unreachable target
- **WHEN** a pursuing enemy is adjacent to its target or has no legal route to a target-adjacent cell
- **THEN** it stays in place

### Requirement: Deterministic step and continuation
An accepted step SHALL advance active enemies at most once using the independent persisted movement RNG. Rejected steps, rendering and reload SHALL NOT advance them. Current compatible saves SHALL retain positions, progress and RNG on continuation.

#### Scenario: Resume
- **WHEN** a dungeon is saved and resumed before the next accepted step
- **THEN** identical commands produce the same enemy positions and RNG as uninterrupted play
