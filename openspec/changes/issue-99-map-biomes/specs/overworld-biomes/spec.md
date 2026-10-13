# Spec Delta

## Purpose
Let users apply reproducible environmental terrain treatments to the standalone map while preserving layout semantics and battle isolation.

## ADDED Requirements

### Requirement: Versioned biome terrain
The system SHALL offer grassland (default), forest and desert with versions grassland-v1, forest-v1 and desert-v1. Each SHALL provide a separate 400-cell terrain layer preserving layout cells, dimensions, blocked perimeter, walkability, cardinal connectivity and fallback status for all three initial map types.

#### Scenario: Nine combinations
- **WHEN** each biome treats Rooms, Random walker and Cellular caves across representative seeds and fallback layouts
- **THEN** terrain maps one-to-one to layout walkability and layout data remains unchanged

### Requirement: Reproducible isolated treatment
Seed, type/version and biome/version SHALL reproduce identical map data. Biome treatment SHALL be pure and consume no ambient, layout or battle RNG. Art rendering SHALL preserve topology and terrain data.

#### Scenario: Repeat treatment
- **WHEN** the same layout is treated repeatedly or a different biome is applied and then restored
- **THEN** original treatment is identical, inputs remain unchanged and battle state and next RNG output are unchanged

### Requirement: Transactional biome controls
A labeled keyboard, mouse and touch accessible Biome dropdown SHALL apply the displayed valid unsigned 32-bit seed and current type. Generate SHALL retain all selections; New seed SHALL retain committed selections. Invalid seed input SHALL retain the last map and restore both committed dropdown values with clear feedback.

#### Scenario: Valid and invalid selection
- **WHEN** users change biome or type with edited valid seed, then attempt either change with invalid seed
- **THEN** valid changes use the displayed seed and invalid changes preserve map, terrain and committed selections

#### Scenario: Regenerate and new seed
- **WHEN** users Generate or choose New seed
- **THEN** Generate reproduces current choices and New seed retains them while changing seed

### Requirement: Readable Simple presentation
Simple SHALL remain available and render visibly distinct grassland, forest and desert with readable blocked/walkable semantics and matching legend. Missing imported artwork SHALL use Simple terrain treatment without altering semantics. Current grassland appearance SHALL remain the default.

#### Scenario: Environment comparison
- **WHEN** each biome appears at desktop and mobile portrait/landscape sizes
- **THEN** palettes and blocked motifs distinguish environments, the legend matches and controls/grid remain usable without overflow

### Requirement: Visible identity and route isolation
Generated data and visible metadata SHALL identify seed, type, algorithm version, biome ID/version and layout fallback. Map use SHALL not initialize battle, audio or storage; direct entry and refresh SHALL work at root and configured base paths.

#### Scenario: Entry and interaction
- **WHEN** users enter, refresh and switch all nine combinations
- **THEN** metadata identifies the current map, map-only operations preserve storage/battle isolation and battle route regression checks pass
