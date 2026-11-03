# Overworld generation

## Purpose

Provide repeatable, traversable overworld layouts for inspection and durable dungeon floors without disturbing gameplay randomness.

## ADDED Requirements

### Requirement: Versioned deterministic profiles
The system SHALL provide selected distinct layout profiles with stable version identities and bounded deterministic generation and fallback.

#### Scenario: Repeat and interleave generation
- **WHEN** the same seed and profile version are generated repeatedly or between other generation calls
- **THEN** the layout and fallback identity match and unrelated random streams remain unchanged

### Requirement: Traversable placements
Generated layouts SHALL preserve the blocked perimeter, connected traversal, and sufficient legal player, enemy, stair and encounter placements.

#### Scenario: Pathological seed or generation failure
- **WHEN** generation cannot produce a valid map within its bounds
- **THEN** a deterministic validated fallback supplies legal connected placements

### Requirement: Floor size increases with depth
New dungeon floors SHALL start at 20×20 and increase by four cells per side per depth until reaching 36×36 at depth 5.

#### Scenario: Creating deeper floors
- **WHEN** a new floor is created at depths 1, 2, 5 or beyond 5
- **THEN** its dimensions are respectively 20×20, 24×24, 36×36 and 36×36

### Requirement: Durable floor identity
Dungeon floors SHALL resolve their saved profile version, dimensions and geometry identity across reload and floor revisits.

#### Scenario: Existing rooms floor is resumed
- **WHEN** a save created with rooms-v1 is loaded after new profiles are introduced
- **THEN** its original geometry, hash, exploration and placements are preserved

### Requirement: Independent presentation
Biome and art choices SHALL remain independent of layout profile and maintain readable desktop and mobile presentation.

#### Scenario: Switch presentation or profile
- **WHEN** a user changes biome, art or layout in the map inspector
- **THEN** only the requested dimension changes and the selected map remains readable and navigable
