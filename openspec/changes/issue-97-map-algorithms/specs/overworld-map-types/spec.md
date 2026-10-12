# Spec Delta

## Purpose

Allow users to compare distinct reproducible layout algorithms in the standalone map prototype while preserving battle isolation and existing Rooms behavior.

## ADDED Requirements

### Requirement: Stable selectable map types
The system SHALL offer Rooms (`rooms`, default), Random walker (`random-walker`) and Cellular caves (`cellular`) with versions `rooms-v1`, `random-walker-v1` and `cellular-v1`. Existing Rooms seeds SHALL preserve their cell output. Generated data and visible metadata SHALL identify seed, selected type, algorithm version and fallback status.

#### Scenario: Default and explicit selection
- **WHEN** the map loads or a supported map type is selected
- **THEN** the default is Rooms and each selection identifies its own type/version without changing existing Rooms output

### Requirement: Valid connected topology for every type
Every type SHALL produce 400 row-major binary cells at 20×20, a blocked perimeter, 60–320 walkable cells and a single walkable component under cardinal adjacency.

#### Scenario: Representative seed matrix
- **WHEN** each type generates seeds 0–255, 12345, 424242, 2147483648 and 4294967295
- **THEN** every output satisfies cell validity, bounds, density and four-direction connectivity

### Requirement: Reproducible distinct layouts
Same seed/type/version SHALL produce identical data across repeated calls without clock or ambient entropy dependence. Each type SHALL produce at least 90% distinct layouts over seeds 0–255. The two added types SHALL have visibly different layout character from each other and Rooms.

#### Scenario: Repeated and varied seeds
- **WHEN** each type is generated repeatedly and across the representative seed matrix
- **THEN** repeat calls match, diversity meets the threshold, and representative comparisons show distinct paths, caves and rooms

### Requirement: Bounded fallback per selected type
Each new type SHALL use at most four deterministic attempts with fixed work limits and return a validated deterministic fallback on exhaustion. Fallback SHALL preserve the requested type/version identity and be reported visibly.

#### Scenario: Candidate exhaustion
- **WHEN** candidate generation is forced to produce unusable outputs
- **THEN** work remains bounded and a reproducible valid fallback is returned with the requested type/version and fallback status

### Requirement: Accessible transactional type and seed controls
A labeled Map type dropdown SHALL support keyboard, mouse and touch. Type changes and Generate SHALL apply the displayed valid unsigned 32-bit seed and current selections. New seed SHALL choose a different seed and retain selections. Invalid seed input SHALL preserve the last valid map and committed selections with clear feedback.

#### Scenario: Switching and retaining choices
- **WHEN** a user switches types with a valid seed, regenerates or chooses New seed
- **THEN** switching uses the displayed seed, Generate reproduces that selection, and New seed retains the selected type

#### Scenario: Invalid seed during type change
- **WHEN** a user selects a type with invalid seed input
- **THEN** the map and committed selection remain unchanged, the dropdown returns to its committed value, and readable validation feedback appears

#### Scenario: Responsive controls
- **WHEN** the page is used by keyboard or desktop/mobile portrait/mobile landscape controls
- **THEN** all three options, focus indication, legend and complete grid remain usable without horizontal overflow

### Requirement: Independent layout and sibling contract
Map operations SHALL preserve battle RNG/state/save isolation. Layout SHALL remain independent of biome terrain treatment and rendering. The shared contract SHALL document grassland/forest/desert with grassland default, topology-preserving biome treatment, and Simple default art with readable missing-art fallback. This change SHALL ship with the current Simple presentation.

#### Scenario: Map-only use
- **WHEN** users generate and switch every type
- **THEN** no battle session, audio or storage is initialized and battle startup/regressions remain unchanged

#### Scenario: Future sibling integration
- **WHEN** biome and art work integrate against the documented contract
- **THEN** all initial biomes support every type, versioned biome data reproduces from seed/type/biome identity, and art changes preserve data and generation RNG
