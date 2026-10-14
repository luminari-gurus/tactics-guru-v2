# Spec Delta

## Purpose

Provide validated fixed tactical encounters for the authored three-encounter run while preserving the existing single-battle content and interaction behavior.

## ADDED Requirements

### Requirement: Ordered authored roster
The run content SHALL expose exactly three distinct encounter IDs referencing fixed maps with meaningful layout or placement differences, using existing heroes, goblins, terrain and assets. Existing unit stats, abilities and the default single-battle catalog SHALL remain unchanged.

#### Scenario: Resolve the run definition
- **WHEN** the three encounter IDs are resolved in order
- **THEN** each resolves to a valid distinct authored map with the canonical hero roster and existing goblin definitions

#### Scenario: Existing battle compatibility
- **WHEN** the default single battle starts or an existing compatible save is read
- **THEN** its map and content identity remain unchanged by the additional run maps

### Requirement: Reject malformed encounter content
Encounter validation SHALL reject malformed or duplicate IDs, missing map/unit/terrain/asset references, invalid bounded geometry and elevation, incomplete cells, blocked or overlapping spawns, and missing or duplicate canonical hero spawns before battle construction. Required asset loading failures SHALL produce controlled errors.

#### Scenario: Invalid reference or spawn
- **WHEN** a candidate encounter has an unknown map, missing hero, out-of-bounds cell or occupied spawn
- **THEN** validation returns a structured failure and no battle or renderer is constructed from it

#### Scenario: Required artwork cannot load
- **WHEN** a required reused asset is missing or cannot decode in the browser fixture
- **THEN** loading reports a controlled error without declaring the encounter ready

### Requirement: Survivor spawn eligibility and tactical reachability
Each encounter SHALL provide legal unique spawn positions for every nonempty subset of surviving Fighter, Ranger and Mage. Zero-HP heroes SHALL be excluded from the spawn projection. Deterministic fixtures SHALL establish legal initial states and reachable movement and attack opportunities using existing movement, elevation and targeting rules.

#### Scenario: One surviving hero
- **WHEN** the carried party contains one living hero and two defeated heroes
- **THEN** its spawn projection contains only that living hero at its authored position with legal enemy spawns and a valid tactical starting state

#### Scenario: Tactical route
- **WHEN** a seeded encounter starts with a legal surviving party
- **THEN** existing movement rules provide a traversable route to an enemy engagement and at least one legal attack opportunity without changing stats or terrain rules

### Requirement: Representative board evidence
All three maps SHALL retain browser evidence using the production board renderer and input path in portrait and landscape, including asset alignment, visible elevated tiles, reachable highlights, actual pointer picking after pan/zoom and resize, and controlled content failures. Evidence SHALL identify build, seed and viewport; physical certification and integrated run completion SHALL remain separate claims.

#### Scenario: Transformed encounter selection
- **WHEN** each encounter is rendered, resized, panned and zoomed in both orientations and a visible tile is selected through pointer input
- **THEN** the selected coordinate matches the displayed tile, units and overlays align, and no page error occurs
