# Spec Delta

## Purpose

Protect device-local player journeys by separating persistent menu play from fresh testing sessions throughout navigation, gameplay and browser lifecycle changes.

## ADDED Requirements

### Requirement: Persistent journeys use the configured base route
The application SHALL launch persistent battle, run and dungeon journeys through the menu at the configured base route. Their mode selection SHALL survive reload independently of one-shot new, continue or recovery intents. Explicit diagnostic scenes SHALL remain transient.

#### Scenario: Menu journey reloads
- **WHEN** a player starts or continues a menu journey and reloads after its entry intent has been consumed
- **THEN** the same mode retains its persistent startup and validated Continue/recovery behavior at both root and prefixed bases

#### Scenario: Testing parameters do not enable persistence
- **WHEN** a direct testing route includes new, continue, recovery or persistent-mode query parameters
- **THEN** it remains a transient testing entry without save inspection or hydration

### Requirement: Testing sessions never access saved progress
Direct testing routes SHALL NOT read, inspect, hydrate, create, overwrite, remove or clear saved games or save-recovery handoffs. They SHALL NOT offer saved-game Continue or recovery controls. Existing non-game preferences SHALL retain their separate behavior.

#### Scenario: Save conditions cannot affect testing
- **WHEN** a testing session starts with valid, corrupt, backup-only, missing or inaccessible game storage
- **THEN** it starts fresh without accessing saved progress and gameplay remains available

#### Scenario: Saved journey survives testing
- **WHEN** a player visits testing routes, plays, restarts, reloads, changes visibility and returns to the menu
- **THEN** all primary and backup saved-game bytes, unrelated data and available menu Continue choices remain unchanged

### Requirement: Transient gameplay remains complete
Testing sessions SHALL retain the normal legal combat, inventory, reward, exploration and floor-travel behavior using current in-memory state. Restart and reload SHALL discard transient progress. An intentionally transient session SHALL NOT require a successful save to travel or present storage-failure recovery.

#### Scenario: Transient dungeon travels floors
- **WHEN** testing play legally unlocks and enters a stair, then returns to the previous floor
- **THEN** floor travel succeeds with coherent in-session state and no saved-game access

#### Scenario: Fresh reload and restart
- **WHEN** battle, run or dungeon testing play is restarted or reloaded after accepted actions
- **THEN** a fresh mode session appears with no restored testing progress, stale callbacks or saved-player state

### Requirement: Menu save safety remains intact
Persistent menu journeys SHALL retain existing save formats, slot isolation, read-only inspection, explicit Continue, backup/corruption recovery, stale-review rejection and exportable recovery data. New dungeon creation SHALL retain empty-slot immediate start, reviewed replacement confirmation and destination revalidation.

#### Scenario: New Game crosses a changed save boundary
- **WHEN** a dungeon save appears or changes between menu review and persistent destination initialization
- **THEN** it is preserved and fresh confirmation or existing recovery is required before replacement

#### Scenario: Failure and incompatible saves
- **WHEN** a menu journey encounters invalid, incompatible or unavailable storage or a failed write
- **THEN** original recovery safeguards and truthful unsaved feedback remain available without silently resetting data

### Requirement: Persistence verification uses persistent entry paths
Saved-game browser regressions SHALL exercise menu-launched persistent journeys. Testing-route persistence expectations SHALL be removed and replaced by fresh-session and no-save-access verification. Coverage SHALL retain the existing negative recovery, replay and lifecycle assertions applicable to persistent journeys.

#### Scenario: Coverage is reconciled
- **WHEN** browser fixtures and entry paths are updated
- **THEN** each retained persistence obligation maps to a persistent menu case, and testing routes have independent isolation checks across supported engines, profiles and base paths
