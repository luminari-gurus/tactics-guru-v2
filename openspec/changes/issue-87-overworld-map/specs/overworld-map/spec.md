# Spec Delta

## Purpose

Let users inspect a small reproducible procedural map independently of tactical battles and run progression.

## ADDED Requirements

### Requirement: Independent direct map route
The system SHALL open the map prototype at `/map`, including direct navigation and refresh under the configured application base path. Existing battle, proof and content-smoke entry routes SHALL preserve their behavior. Map-only generation and view code SHALL load only on the map route.

#### Scenario: Direct navigation and refresh
- **WHEN** a user opens or refreshes `/map` on development, production preview or the existing static hosting path
- **THEN** the map and controls load successfully with correct asset URLs, including a non-root configured base

#### Scenario: Existing battle routes
- **WHEN** a user opens the battle entry path or existing proof/content-smoke query routes
- **THEN** their existing scene and controls remain usable without initializing the map

### Requirement: Valid connected fixed-size map
The system SHALL generate exactly 20 columns and 20 rows with 400 valid walkable or blocked cells. Every walkable cell SHALL connect to every other through cardinal adjacency. A usable result SHALL contain at least 60 walkable cells and at least 80 blocked cells, including a blocked outer border.

#### Scenario: Representative seeds
- **WHEN** valid representative seeds including zero and the largest supported seed are generated
- **THEN** each output satisfies dimensions, tile validity, walkable and blocked minimums, border bounds and cardinal connectivity

### Requirement: Repeatable controllable seeds
The system SHALL display and accept unsigned 32-bit integer seeds and reproduce the same map for the same seed and generator version. New-seed generation SHALL choose a different seed. Invalid seed input SHALL show a readable error and retain the last valid map. Representative seeds SHALL demonstrate meaningful layout variation.

#### Scenario: Reuse a seed
- **WHEN** a user enters a previously displayed seed and generates again
- **THEN** the cell layout matches the previous result for that generator version

#### Scenario: New seed and invalid input
- **WHEN** a user activates New seed or submits an invalid seed
- **THEN** New seed updates the displayed seed and map, while invalid input visibly rejects without replacing the last valid map

### Requirement: Bounded generation and deterministic recovery
Generation SHALL finish within a fixed work bound without depending on elapsed time for layout decisions. Unusable candidates SHALL undergo bounded retries followed by a validated deterministic fallback. Recovery SHALL be visible and SHALL preserve a usable map instead of hanging or producing blank output.

#### Scenario: Exhausted generation attempts
- **WHEN** every allowed candidate is unusable
- **THEN** generation returns a connected valid fallback with visible fallback status and repeatable output

### Requirement: Responsive map inspection
The map SHALL distinguish walkable and blocked cells through contrasting treatment and a text legend. Seed controls SHALL support keyboard, mouse and touch with visible focus and reachable controls. All 400 cells SHALL remain legible in desktop, mobile portrait and landscape without horizontal overflow.

#### Scenario: Short landscape and portrait
- **WHEN** the viewport changes between desktop, portrait and short landscape
- **THEN** a complete map remains inspectable and controls remain reachable with safe-area spacing and no horizontal overflow

### Requirement: Battle isolation
Map generation and regeneration SHALL leave battle commands, RNG state and save data unchanged. The map route SHALL NOT create a battle session, play battle audio or read/write battle or legacy storage keys.

#### Scenario: Repeated map use
- **WHEN** a user repeatedly changes map seeds and returns to the battle entry path
- **THEN** map operations have not altered battle or legacy storage, and battle startup follows its existing seeded behavior
