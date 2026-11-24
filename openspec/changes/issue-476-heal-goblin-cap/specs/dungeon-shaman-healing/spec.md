## Purpose

Limit Shaman healing in newly entered dungeon battles and preserve the rules recorded by active saves and replays.

## ADDED Requirements

### Requirement: Dungeon Shaman healing budget

In newly entered dungeon battles each Goblin Shaman SHALL have two successful Heal Goblin casts. Inspection SHALL display its remaining casts. Each accepted heal SHALL restore up to 4 HP using the existing target rules, spend one action and one cast, and leave RNG intact.

#### Scenario: Independent budgets and inspection
- **WHEN** a Shaman successfully casts Heal Goblin twice in a new dungeon battle
- **THEN** its count changes from two to one to zero and inspection shows the count
- **AND** a second Shaman retains its own count

#### Scenario: Invalid or exhausted cast
- **WHEN** a heal is invalid or its Shaman already spent both casts
- **THEN** it leaves state, events, action budgets and RNG intact
- **AND** the enemy planner excludes exhausted healing and chooses a legal Hex in the seeded Elite boundary

### Requirement: Recorded healing rule

Continue and replay SHALL preserve the accepted battle’s rule and any remaining casts. A pre-change active battle and replay SHALL retain unlimited legal casts under the original Shaman rules.

#### Scenario: Continue and replay
- **WHEN** an active dungeon battle resumes after one successful cast or a capped battle replays
- **THEN** Continue preserves the one remaining cast and replay reproduces accepted commands, events, final state and RNG

#### Scenario: Legacy save followed by new entry
- **WHEN** an active pre-change Elite battle or its replay contains three legal heals by one Shaman
- **THEN** its third heal remains legal
- **AND** the next newly entered dungeon battle gives each Shaman a fresh budget
