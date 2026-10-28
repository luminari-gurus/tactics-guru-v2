# Spec Delta

## Purpose

Provide reproducible passive wandering and aggressive pursuit in the dungeon while preserving terrain, marker identities and artwork independence.

## ADDED Requirements

### Requirement: Static inspection markers
The `/map` inspection view SHALL display stationary, numbered player and enemy markers without encounters or a movement timer.

#### Scenario: Time passes on the inspection map
- **WHEN** the map remains open without regeneration
- **THEN** all marker positions remain unchanged and the numbered legend remains visible

### Requirement: Passive legal wandering
Each passive enemy SHALL move at most one cardinal cell per simulation step, selecting reproducibly among currently unoccupied walkable neighbors in north/east/south/west order. With no legal neighbor it SHALL stay in place.

#### Scenario: Free and enclosed passive enemies
- **WHEN** identical starting worlds and movement random states are stepped identically
- **THEN** passive destinations and resulting random states match, blocked/occupied cells are never entered, and an enclosed enemy stays in place

### Requirement: Range-based aggressive detection
Aggressive enemies SHALL detect the player at Manhattan distance less than or equal to their configured range. Terrain SHALL NOT occlude range-based detection. Outside that range they SHALL stay still, immediately losing pursuit without remembered targets.

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
Simulation SHALL be a pure retained-state transition with its own seeded random state and step count. Terrain generation, initial markers-v1 placement, player position, and combat RNG SHALL remain unchanged; dungeon positions and movement state SHALL be persisted after accepted player steps. Rendering and artwork callbacks SHALL neither step nor reset simulation.

#### Scenario: Reproducibility through art updates
- **WHEN** the same initial map/configuration receives the same number of steps with different intervening art selections and image success/failure callbacks
- **THEN** resulting positions, movement random state and step count match, with terrain and unrelated session state unchanged

### Requirement: Static map lifecycle
Rendering, artwork, visibility changes and cached-page restoration SHALL leave the retained marker positions unchanged. Disposal SHALL remove listeners and make late artwork callbacks harmless.

#### Scenario: Hidden or restored map
- **WHEN** the map is hidden and restored or a delayed image finishes
- **THEN** marker positions remain unchanged and pending edits are retained

### Requirement: Atomic regeneration and retained edits
Successful Generate, New seed, type or biome changes SHALL atomically recreate placement. Invalid seed input or placement failure SHALL preserve the current map.

#### Scenario: Failed regeneration
- **WHEN** a regeneration fails
- **THEN** the previous world and pending edits are retained with an error
