# Spec Delta

## Purpose

Provide playable, deterministic exploration on continuing dungeon floors, preserving discovery, encounter ownership and party progress across battle returns, travel and reload.

## ADDED Requirements

### Requirement: Authoritative cardinal traversal
The dungeon SHALL accept one cardinal step to a legal adjacent walkable cell only during ready exploration, using current dungeon identity, floor and revision. Rejected, repeated or stale inputs SHALL leave state and all RNG unchanged.

#### Scenario: Equivalent controls
- **WHEN** a player uses an arrow/WASD key, an adjacent cell pointer/touch activation or a direction button
- **THEN** the same step validation applies, with no diagonal, remote-cell teleport or automatic key-repeat movement

#### Scenario: Locked movement
- **WHEN** a move is blocked, stale, out of bounds, during a modal, battle, reward or defeat
- **THEN** no step or encounter is committed and feedback explains the applicable rejection

### Requirement: Retained floor discovery
Each floor SHALL retain player position, revealed and visited cells, and stable discovered/visited/completed encounter and stair POIs independently of artwork. Reveal SHALL include cells within Manhattan distance two of each accepted position, without wall occlusion.

#### Scenario: Explore and inspect
- **WHEN** a step reveals a POI
- **THEN** its label, location and current locked/available/cleared state become inspectable and remain known after leaving its vicinity

#### Scenario: Art and lifecycle independence
- **WHEN** art switches, image loads complete, a view rerenders or the page resumes
- **THEN** position, discovery, completion and RNG remain unchanged

### Requirement: Spatial encounter entry
Three stable encounter POIs SHALL map to the existing ordered encounters. Entering the next available uncleared POI SHALL launch that encounter once with current party HP and owned items. Later POIs SHALL remain traversable but locked until preceding completion and reward claims.

#### Scenario: Victory and pending reward
- **WHEN** an entered encounter ends in victory
- **THEN** exploration returns to its entry cell with surviving HP/items, that POI completed once, and the existing pending reward or guardian-unlocked state

#### Scenario: Defeat and duplicate callbacks
- **WHEN** a party wipes or an old battle callback or repeated POI input arrives
- **THEN** defeat blocks further exploration and old inputs cannot relaunch battles or duplicate rewards/completion

### Requirement: Spatial floor travel
Stair use SHALL require the player at the matching stair, ready exploration, and existing descent/ascend eligibility. Revisit SHALL restore floor identity, position, discovery and completed POIs without resetting encounters.

#### Scenario: Guarded descent and return
- **WHEN** a player reaches downstairs after clearing the guardian and travels, then returns upstairs
- **THEN** party/items carry forward and the departed floor retains its cleared encounters and discovery

#### Scenario: Remote or unsaved travel
- **WHEN** travel is requested away from the stair or its durable write/readback fails
- **THEN** travel is refused and the current in-memory floor is retained with recovery feedback

### Requirement: Unified exploration persistence
The dungeon SHALL validate and encode exploration, pending rewards and any active battle in one bounded versioned snapshot. A spatial entry or travel candidate SHALL become playable only after successful save/readback, except explicitly chosen unsaved exploration and battles; unsaved stair travel remains blocked.

#### Scenario: Reload active encounter
- **WHEN** a saved spatial encounter is reloaded
- **THEN** its exact active battle, entry cell, party/items, discovery and RNG resume together, without a second encounter start

#### Scenario: Write failure and uncertain result
- **WHEN** quota, security, unavailable storage or uncertain readback prevents an entry write
- **THEN** no battle is launched, previous in-memory exploration remains, saved bytes remain inspectable/exportable and explicit recovery chooses durable or current progress

### Requirement: Compatible recovery of existing dungeon saves
Valid prior dungeon v1 saves SHALL continue through deterministic conversion that preserves party, ownership, completion, pending rewards and active battle state. Invalid, incompatible and oversized data SHALL remain recoverable without silent deletion or rerolling.

#### Scenario: Convert active and cleared floors
- **WHEN** a valid v1 save is selected for Continue
- **THEN** deterministic POIs and discovery are synthesized, active/pending encounter association is restored, and original durable bytes remain available before any v2 replacement

#### Scenario: Malformed exploration
- **WHEN** a save has illegal position, duplicate or foreign POI identities, invalid discovery bounds or battle/completion mismatches
- **THEN** it is rejected before gameplay and its original bytes can be exported

### Requirement: Accessible exploration presentation
Exploration SHALL provide a focusable map, keyboard movement, adjacent-cell pointer/touch activation, labeled direction controls of at least 44 CSS pixels, status feedback and an accessible discovered-POI list on desktop, narrow portrait and short landscape layouts.

#### Scenario: Real browser exploration
- **WHEN** a player navigates, enters battle, returns, changes art, rotates and reloads with keyboard and mobile touch controls
- **THEN** focus remains usable, controls do not overflow or leak through dialogs, and state matches the accepted actions
