# Spec Delta

## Purpose

Allow users to inspect independently generated overworld terrain through verified artwork while preserving reproducibility and readable fallback presentation.

## ADDED Requirements

### Requirement: Accessible independent art selection
The map SHALL provide a labeled keyboard and mobile accessible Art style dropdown with default Simple and Legacy 8-bit options. Style changes SHALL preserve generated layout, terrain, seed, algorithm and biome versions and generation RNG state.

#### Scenario: Switching presentation
- **WHEN** a user changes art on any of the nine map type and biome combinations
- **THEN** the presentation and visible style metadata change while the generated data remains identical

### Requirement: Seed and selection retention
Generate and New seed SHALL retain the selected art style. An art change SHALL preserve an edited valid seed without applying it to the current map. Invalid seed input SHALL retain the last valid map and selections with clear feedback.

#### Scenario: Pending valid edit
- **WHEN** the user edits a valid seed and switches art before Generate
- **THEN** the displayed seed remains edited and the retained map keeps its previous generated seed

#### Scenario: Invalid seed
- **WHEN** the seed is invalid and the user attempts an art selection change
- **THEN** the map and committed selections remain unchanged and validation feedback stays visible

### Requirement: Bounded verified legacy coverage
Legacy 8-bit SHALL use the three inventoried unchanged PNGs for grassland grass/rock and forest clearing/pines. All terrain SHALL remain legible at desktop and mobile sizes with distinguishable walkability and a matching legend. Source and runtime provenance SHALL remain recorded.

#### Scenario: Imported terrain
- **WHEN** Legacy 8-bit is selected for grassland or forest
- **THEN** grass presents walkable cells and mountain or pines presents blocked cells, with the same meanings in the legend

### Requirement: Readable asset fallback
Missing coverage and load or decode failures SHALL use the matching Simple treatment with visible fallback feedback. Failed and delayed loads SHALL never change terrain semantics or overwrite a newer style selection.

#### Scenario: Missing biome coverage
- **WHEN** Legacy 8-bit is selected for desert
- **THEN** sand and rock use Simple, the legend matches and missing coverage is explained

#### Scenario: Failed or stale request
- **WHEN** an image fails or completes after the user chooses another style
- **THEN** failure remains nonfatal and only the current selection determines the displayed treatment and legend

### Requirement: Base path and battle isolation
Artwork SHALL resolve under the configured base path on direct navigation and refresh. Battle visits SHALL load no map artwork. Actual transferred asset and added bundle sizes SHALL be recorded, and map rendering SHALL not access battle state, RNG, audio or saves.

#### Scenario: Prefix navigation
- **WHEN** the user directly opens or refreshes the map under a configured prefix and selects legacy art
- **THEN** images load under that prefix without console errors or broken cells

#### Scenario: Battle route
- **WHEN** the user opens the battle route
- **THEN** no map artwork requests occur and existing battle startup and save behavior remain intact
