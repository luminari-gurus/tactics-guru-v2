# Spec Delta

## Purpose

Provide reproducible overworld occupants with authoritative identities and positions independent of terrain presentation.

## ADDED Requirements

### Requirement: Complete reproducible occupant state

Every successful overworld SHALL expose one player and three enemies, ordered by stable IDs `player`, `enemy-1`, `enemy-2`, `enemy-3`, with integer zero-based coordinates on distinct walkable cells in the connected playable area. Placement SHALL be bounded and versioned independently from terrain.

#### Scenario: Repeat a world

- **WHEN** the same seed and layout are populated again
- **THEN** marker IDs, kinds and positions are identical under `markers-v1`, including seed zero and maximum uint32
- **AND** all four placements belong to the connected walkable area

#### Scenario: Independence from other systems

- **WHEN** a valid layout is populated or its biome changes
- **THEN** input terrain and existing battle RNG state remain unchanged, no clock or browser entropy is used, and biome-only changes preserve positions

#### Scenario: Invalid layout

- **WHEN** dimensions or layout violate the existing terrain contract, including empty, undersized or disconnected layouts
- **THEN** placement returns explicit failure without a partial state

### Requirement: Generation commits the complete world

The route SHALL retain authoritative map and marker state together. Initial entry and reload SHALL start with seed 1, Rooms, Grassland and Simple. Generate, New seed, map-type and biome changes SHALL reset occupants using the committed generation result, preserving existing seed-control semantics.

#### Scenario: Apply controls

- **WHEN** Generate, map-type or biome selection applies a valid displayed seed
- **THEN** the whole world is replaced by its reproducible result and returning to previous inputs restores their original positions
- **AND** New seed uses the existing entropy and increment fallback policy with committed choices

#### Scenario: Invalid seed

- **WHEN** an invalid seed is submitted or a selection is changed while that seed is displayed
- **THEN** terrain, markers and committed choices remain unchanged and validation feedback remains visible

#### Scenario: Failed placement and recovery

- **WHEN** placement fails during regeneration
- **THEN** the previous complete world and committed choices remain, a specific live message explains the failure, and artwork completion cannot erase it
- **AND** successful regeneration clears the failure

#### Scenario: Initial placement failure

- **WHEN** placement fails on initial entry
- **THEN** an unavailable empty grid and explicit failure feedback appear with usable retry controls

### Requirement: Presentation preserves occupants

Artwork changes and asynchronous success, network failure or decode failure SHALL only redraw retained state. They SHALL preserve unapplied seed edits and validation or placement feedback, without spawning or moving occupants.

#### Scenario: Late artwork

- **WHEN** old image requests finish after a newer seed, type, biome or art selection
- **THEN** the latest complete world and current selections are rendered with the same marker positions

### Requirement: Readable and accessible markers

Player and enemies SHALL use distinct shapes and colors with matching legends and accessible counts and coordinates. Markers SHALL remain noninteractive, fit their cells and preserve terrain identity, grid geometry and control usability across supported desktop/mobile viewports, map types, biomes and art styles.

#### Scenario: Inspect a populated map

- **WHEN** a world is shown in any supported map/biome/art combination
- **THEN** a cyan player circle and three coral enemy diamonds remain visible above terrain
- **AND** the grid has an accessible count summary and associated text listing every ID at one-based row/column
- **AND** legends wrap without horizontal overflow, controls retain keyboard/touch operation and markers add no tab stops
