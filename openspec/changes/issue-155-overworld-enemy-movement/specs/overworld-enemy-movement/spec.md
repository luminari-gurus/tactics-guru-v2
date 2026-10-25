# Spec Delta

## Purpose

Provide reproducible passive wandering and aggressive pursuit on the independent overworld inspection map while preserving terrain, marker identities and artwork independence.

## ADDED Requirements

### Requirement: Inspectable behavior assignments
The map SHALL retain one stationary player and three enemies with explicit configurable passive/aggressive profiles. Defaults SHALL assign enemy-1 passive, enemy-2 aggressive with range 6 and enemy-3 aggressive with range 10. The visible legend and accessible description SHALL identify assignments and detection ranges without requiring color alone.

#### Scenario: Both profiles are discoverable
- **WHEN** a map is successfully generated on desktop or mobile
- **THEN** its three enemy IDs, profiles and aggressive ranges are inspectable, all four markers remain distinct and walkable, and no marker becomes an interactive combat control

### Requirement: Passive legal wandering
Each passive enemy SHALL move at most one cardinal cell per simulation step, selecting reproducibly among currently unoccupied walkable neighbors in north/east/south/west order. With no legal neighbor it SHALL stay in place.

#### Scenario: Free and enclosed passive enemies
- **WHEN** identical starting worlds and movement random states are stepped identically
- **THEN** passive destinations and resulting random states match, blocked/occupied cells are never entered, and an enclosed enemy stays in place

### Requirement: Range-based aggressive detection
Aggressive enemies SHALL detect the player at Manhattan distance less than or equal to their configured range. Terrain SHALL NOT occlude this prototype's range-based visibility. Outside that range they SHALL stay still, immediately losing pursuit without remembered targets.

#### Scenario: Detection boundary and loss
- **WHEN** the player is exactly at the configured range, beyond it, or later moved beyond it in a pure-model fixture
- **THEN** detection is respectively active, inactive, or lost on the next step, independently of artwork and intervening terrain

### Requirement: Bounded legal pursuit and collision resolution
Detected enemies SHALL follow a shortest legal cardinal path toward an unoccupied cell adjacent to the player, moving at most one cell per step. Processing SHALL use enemy-1, enemy-2, enemy-3 order and current occupancy after each move. Ties SHALL use north/east/south/west order. Adjacent enemies and enemies without a route SHALL stay still.

#### Scenario: Detours and unreachable targets
- **WHEN** a detected player's approach is blocked by terrain or occupied cells
- **THEN** the enemy takes a shortest available detour or stays still if none exists, never entering the player cell or a blocked cell

#### Scenario: Competing destinations and swaps
- **WHEN** two enemies could use the same destination or swap occupied cells
- **THEN** the earlier enemy claims a free destination first and later movement uses the updated occupancy, preventing overlap and direct swaps

### Requirement: Independent reproducible simulation
Simulation SHALL be a pure retained-state transition with its own seeded random state and step count. Terrain generation, initial markers-v1 placement, player position, combat RNG, dungeon exploration and game-save data SHALL remain unchanged. Rendering and artwork callbacks SHALL neither step nor reset simulation.

#### Scenario: Reproducibility through art updates
- **WHEN** the same initial map/configuration receives the same number of steps with different intervening art selections and image success/failure callbacks
- **THEN** resulting positions, movement random state and step count match, with terrain and unrelated session state unchanged

### Requirement: Visible cadence and disposal
The map SHALL advance at most once per 1000 milliseconds while visible, without catch-up bursts. Hidden/page-hidden views SHALL stop scheduling and DOM updates. Return to visibility or BFCache restoration SHALL resume with a fresh full delay. Final disposal SHALL release timers/listeners and make late artwork callbacks harmless.

#### Scenario: Hidden time and restored pages
- **WHEN** the page hides across many intervals and is then restored
- **THEN** no hidden-time steps occur and only one step occurs after the next full visible delay, without duplicate loops

#### Scenario: Disposed view
- **WHEN** the map is finally disposed and pending timer/image work completes
- **THEN** no further movement or DOM updates occur from that view and a later map mount owns only one loop

### Requirement: Atomic regeneration and retained edits
Successful Generate, New seed, type or biome changes SHALL atomically recreate placement and reset movement state. Repeated committed inputs SHALL reproduce the initial state. Invalid seed input or placement failure SHALL preserve the current simulation; ordinary scheduled steps SHALL continue from it. Rendering SHALL preserve pending input, focus, selected artwork and validation/failure feedback.

#### Scenario: Reset and failed regeneration
- **WHEN** a moving world is successfully regenerated, or a regeneration fails
- **THEN** success resets positions/RNG/count coherently while failure retains the previous world/RNG/count at the operation boundary, without resetting or advancing it through rendering

#### Scenario: Editing during movement
- **WHEN** the user edits the seed, focuses a native control or changes artwork while scheduled movement proceeds
- **THEN** movement does not replace their pending input, steal focus, dismiss controls, clear validation/errors or respawn enemies
