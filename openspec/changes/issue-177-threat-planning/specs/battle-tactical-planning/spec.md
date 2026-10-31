# Tactical planning

## Purpose

Help players inspect legal tactical choices and safely revise a movement decision while preserving deterministic battle history.

## ADDED Requirements

### Requirement: Compound tactical plan
The player SHALL be able to review a reachable move and a legal ability from its destination together before confirming either, and confirmation SHALL revalidate both against the same current state before accepting the move.

#### Scenario: Invalid or stale plan
- **WHEN** the origin is unreachable or either component becomes illegal before confirmation
- **THEN** the plan is rejected without accepting commands, spending resources or drawing RNG

#### Scenario: Cancellation
- **WHEN** the player cancels a plan
- **THEN** state, saves, history and RNG remain unchanged

#### Scenario: Accepted plan
- **WHEN** a valid plan is confirmed
- **THEN** its move and ability resolve in order under normal presentation locks and authoritative rules

### Requirement: Enemy danger inspection
The player SHALL be able to inspect a clearly distinguished enemy danger overlay derived from legal movement and attacks on each enemy’s next turn using current positions and statuses, without drawing RNG or exposing hidden future outcomes.

#### Scenario: Blocked attack
- **WHEN** terrain, occupancy, status, range or line of sight prevents an enemy attack
- **THEN** the inspection does not represent that attack as legal

### Requirement: Safe movement undo
The player SHALL be able to undo the most recent eligible player move before committing an action, restoring its position and move budget without changing RNG or duplicating events, while preserving replay and saved-state consistency. The player may undo at most once per turn; a resumed turn cannot use undo because its snapshot does not prove whether it was already used.

#### Scenario: Unsafe boundary
- **WHEN** an action, turn transition, reload, restart, hazard consequence, reveal or enemy reaction intervenes
- **THEN** undo is unavailable and cannot reverse the consequence

#### Scenario: Undo and continue
- **WHEN** an eligible move is undone and the player continues or reloads
- **THEN** the accepted history and saved battle reproduce the resulting state without duplicate movement effects

### Requirement: Accessible tactical controls
Tactical review, cancellation, danger inspection and eligible undo SHALL remain available through keyboard and touch with understandable feedback, while respecting modal, animation and turn locks.

#### Scenario: Locked phase
- **WHEN** an enemy turn or presentation is active
- **THEN** tactical controls cannot commit or undo player commands
