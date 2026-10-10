## Purpose

Provide predictable enemy turns using the same battle legality and replay rules that govern player commands.

## ADDED Requirements

### Requirement: Stable legal decisions
The system SHALL choose only for the living active enemy in an ongoing validated battle. Candidate ordering SHALL be total and independent of catalog or unit array insertion order. Decisions SHALL respect movement, targeting, action and defeat checks and SHALL not consume RNG.

#### Scenario: Equivalent input ordering
- **WHEN** the same valid battle and catalog are presented with reordered units or catalog entries
- **THEN** the chosen commands are identical and input snapshots and RNG remain unchanged.

#### Scenario: Invalid actor or state
- **WHEN** the requested actor is defeated, inactive, a player, or the battle is invalid or finished
- **THEN** the decision rejects without changing state, RNG or turn ownership.

### Requirement: Reachable attack and movement
The system SHALL prefer the highest expected-damage legal ordinary attack available from the origin or a reachable cell. Without an attack it SHALL choose a legal move that strictly reduces distance to a living player, or Wait when no such move exists. Spent budgets SHALL prevent the corresponding action.

#### Scenario: Reachable attack
- **WHEN** a legal attack exists after a legal move
- **THEN** the chosen move and attack respect occupancy, height, range, ownership and line of sight.

#### Scenario: Blocked and unreachable targets
- **WHEN** an occupied chokepoint or impassable terrain prevents attacking or improving position
- **THEN** the enemy waits without retrying indefinitely or selecting a defeated target.

#### Scenario: Spent budgets
- **WHEN** the enemy has already moved or acted
- **THEN** the plan contains no second move or action respectively and can still end the turn.

### Requirement: Bounded execution and replay
Enemy execution SHALL dispatch each command through shared rules, record accepted commands and events, and stop at battle completion or the first rejection. A successful ongoing enemy turn SHALL end with Wait. Execution SHALL use no timers, browser globals or hidden randomness and SHALL attempt at most one move, one attack and one turn end.

#### Scenario: Seeded reproducibility
- **WHEN** equivalent seeded battles run the same player commands and enemy choices
- **THEN** their accepted commands, events and final snapshots match and recorded commands replay identically.

#### Scenario: Rejection during execution
- **WHEN** a command rejects, including exhausted command or RNG budgets
- **THEN** the rejected command changes nothing, no later command executes, and any earlier accepted commands remain explicitly reported.

#### Scenario: Final attack
- **WHEN** an enemy attack ends the battle
- **THEN** execution stops with the battle-ended event and does not dispatch an illegal turn end.
