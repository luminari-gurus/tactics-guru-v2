# Spec Delta

## Purpose

Let mobile players reclaim battle board space while retaining accessible controls and authoritative battle state across standalone battles and run encounters.

## ADDED Requirements

### Requirement: Mobile HUD visibility
Mobile portrait and short landscape layouts SHALL offer collapse and expand controls. A new app session SHALL start expanded; the current session SHALL retain the choice through restart and encounter transitions. Desktop SHALL show its existing expanded layout.

#### Scenario: Collapse and restore
- **WHEN** a mobile player toggles the HUD repeatedly
- **THEN** expanded contents hide and restore, a compact expand control remains visible, and actor, inspection, target, action availability and review state remain current without commands or turn reset

#### Scenario: Responsive and encounter transitions
- **WHEN** the player rotates, resizes, restarts or enters another run encounter
- **THEN** the mobile preference remains consistent, desktop remains expanded and run boundary screens remain unobstructed

### Requirement: Reclaimed board geometry
Collapsing SHALL release HUD space to the drawable board region. Board fit, pan bounds, pointer picking and combat feedback SHALL follow the current region while preserving camera position and zoom where bounds permit.

#### Scenario: Toggle after navigation
- **WHEN** the player pans or zooms then toggles or rotates the layout
- **THEN** the board uses the new space, navigation is retained subject to valid bounds, picking matches rendered cells and stale gestures cannot dispatch commands

### Requirement: Accessible captured controls
The toggle SHALL be at least 44 by 44 CSS pixels, respect safe areas, expose an accessible name and expanded state, support keyboard activation and visible focus, and capture pointer input. Hidden contents SHALL be excluded from keyboard focus.

#### Scenario: Touch and keyboard toggle
- **WHEN** a player taps the toggle or activates it with a keyboard
- **THEN** focus remains usable, the new visibility state is announced and no input reaches the board

### Requirement: Safe action and dialog lifecycle
Collapse SHALL preserve prepared actions and presentation locks. Confirmation, cancel, outcome, error and recovery flows SHALL remain reachable and retain modal focus capture, including focus return to a visible control.

#### Scenario: Prepared action and modal return
- **WHEN** a prepared action survives a toggle or a dialog closes with the HUD collapsed
- **THEN** no action is committed or discarded by the toggle, confirmation and cancel remain reachable after expansion and focus returns visibly without board input

#### Scenario: Enemy and presentation phases
- **WHEN** the HUD is toggled during enemy execution or animation
- **THEN** layout changes without unlocking gameplay, duplicating commands or obscuring feedback and recovery
