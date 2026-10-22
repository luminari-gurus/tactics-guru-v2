# Spec Delta

## MODIFIED Requirements

### Requirement: Reachable attack and movement
The system SHALL prefer the highest expected-damage legal ordinary attack available from the origin or a reachable cell. Without an attack it SHALL choose a legal move that reduces terrain-aware route cost to a legal attack position against a living player, even when Manhattan distance increases, or Wait when no such move exists. Spent budgets SHALL prevent the corresponding action.

#### Scenario: Reachable attack
- **WHEN** a legal attack exists after a legal move
- **THEN** the chosen move and attack respect occupancy, height, range, ownership and line of sight.

#### Scenario: Blocked and unreachable targets
- **WHEN** an occupied chokepoint or impassable terrain prevents attacking or improving position along a legal route
- **THEN** the enemy waits without retrying indefinitely or selecting a defeated target.

#### Scenario: Spent budgets
- **WHEN** the enemy has already moved or acted
- **THEN** the plan contains no second move or action respectively and can still end the turn.

#### Scenario: Detour around an obstacle
- **WHEN** the only legal route to an attack position initially increases Manhattan distance to the player
- **THEN** the enemy advances along that route and reaches an attack opportunity across successive turns against a stationary target without stalling solely because of Manhattan distance

#### Scenario: Ranged engagement
- **WHEN** the nearest player cell is obstructed but a reachable firing position satisfies an owned ordinary attack's range and LOS
- **THEN** pursuit targets a legal firing position without entering an occupied target cell or ignoring terrain restrictions

## ADDED Requirements

### Requirement: Stateless bounded detour planning
Detour planning SHALL use bounded searches over the current battlefield and living occupancy, deterministic tie-breaking and no RNG or hidden route commitment. After any accepted enemy command, replanning from the accepted snapshot SHALL reproduce the uninterrupted plan's remaining commands.

#### Scenario: Restore an accepted move
- **WHEN** planning resumes from the accepted detour-move snapshot during presentation
- **THEN** its remaining commands match uninterrupted execution without a saved route queue or another movement action

#### Scenario: Changed occupancy
- **WHEN** living units move or are defeated before an enemy's next turn
- **THEN** the enemy recomputes legal routes from current occupancy without using obsolete paths

#### Scenario: Stable route ties
- **WHEN** equivalent states present equally ranked routes with reordered unit or catalog records
- **THEN** identical commands are selected without mutating inputs or advancing any RNG
