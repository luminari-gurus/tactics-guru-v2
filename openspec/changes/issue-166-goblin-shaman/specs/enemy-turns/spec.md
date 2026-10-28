## MODIFIED Requirements

### Requirement: Reachable attack and movement
The system SHALL prefer the highest-scored legal useful ability available from the origin or a reachable cell. Ordinary attacks retain summed-d20 damage scores; healing scores 20 times applied healing; Hex scores failed-save faces times max(1, target effective accuracy plus power). Without a useful action it SHALL approach a legal useful target or Wait. Spent budgets SHALL prevent the corresponding action.

#### Scenario: Reachable attack
- **WHEN** a legal attack exists after a legal move
- **THEN** the chosen move and attack respect occupancy, height, range, ownership and line of sight.

#### Scenario: Blocked and unreachable targets
- **WHEN** an occupied chokepoint or impassable terrain prevents attacking or improving position
- **THEN** the enemy waits without retrying indefinitely or selecting a defeated target.

#### Scenario: Spent budgets
- **WHEN** the enemy has already moved or acted
- **THEN** the plan contains no second move or action respectively and can still end the turn.

#### Scenario: Support candidates and ordering
- **WHEN** a Shaman can heal, Hex or attack
- **THEN** shared legal previews supply scores without RNG, excluding zero healing and already-Weakened/immune Hex targets; ties resolve by score descending, movement cost, target ID, ability ID, then y/x

#### Scenario: Control effects and ordinary enemies
- **WHEN** an enemy is Taunted, Pinned or Snared
- **THEN** Taunt restricts offensive targets while allowing allied healing, movement blocks permit legal in-place actions or Wait, and grunt/archer choices remain equivalent to their previous behavior

### Requirement: Bounded execution and replay
Enemy execution SHALL dispatch each command through shared rules, record accepted commands and events, and stop at battle completion or the first rejection. A successful ongoing enemy turn SHALL end with Wait. Execution SHALL use no timers, browser globals or hidden randomness and SHALL attempt at most one move, one ability and one turn end. A committed ability SHALL prevent further movement even if the movement budget was unused.

#### Scenario: Seeded reproducibility
- **WHEN** equivalent seeded battles run the same player commands and enemy choices
- **THEN** their accepted commands, events and final snapshots match and recorded commands replay identically.

#### Scenario: Rejection during execution
- **WHEN** a command rejects, including exhausted command or RNG budgets
- **THEN** the rejected command changes nothing, no later command executes, and any earlier accepted commands remain explicitly reported.

#### Scenario: Final attack
- **WHEN** an enemy attack ends the battle
- **THEN** execution stops with the battle-ended event and does not dispatch an illegal turn end.
