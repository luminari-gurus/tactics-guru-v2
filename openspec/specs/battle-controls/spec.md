# battle-controls Specification

## Purpose

Give players readable battle feedback and consistent, accessible controls across keyboard, mouse and touch without unintended gameplay input.

## Requirements

### Requirement: Initial player turn action
Each new player-controlled turn SHALL select Move once when existing movement rules permit it. Selection SHALL show normal movement range and destination controls without selecting a destination, preparing an intent, changing focus or executing a command. Enemy, presentation, ended and error phases SHALL retain their input locks.

#### Scenario: First and later turns
- **WHEN** the first usable player decision begins at startup, after enemies, for another actor or in a later round
- **THEN** available Move is selected with normal movement range and no pending intent

#### Scenario: Explicit choice and cancellation
- **WHEN** a player selects another action or fully cancels during the same turn
- **THEN** ordinary refreshes, inspection, log, layout and visibility changes preserve that choice or cleared selection

#### Scenario: Accepted action and next turn
- **WHEN** movement or an attack finishes in the same turn
- **THEN** the existing cleared-action and remaining-budget behavior remains, and only the next player turn receives the default

#### Scenario: Unavailable or destinationless movement
- **WHEN** a turn starts with spent movement or domain rejection
- **THEN** Move remains disabled and unselected, while an origin-only range never creates a destination or intent

#### Scenario: Reconstructed scene
- **WHEN** restart, Continue or a run encounter constructs a scene
- **THEN** the initial default follows current movement availability without inheriting old selection or mutating saved state

#### Scenario: Deliberate movement
- **WHEN** mouse, touch or keyboard chooses a destination under the default action
- **THEN** the existing preview, confirmation and cancellation flow applies and only deliberate confirmation accepts movement

#### Scenario: Clear a movement destination
- **WHEN** a player returns the native destination selector to Choose target after preparing a move
- **THEN** destination, pending intent and preview are cleared together, Review is disabled, Move remains selected and battle state, replay and save bytes stay unchanged

#### Scenario: Retry a cancelled movement destination
- **WHEN** a player dismisses movement confirmation with Cancel or Escape
- **THEN** the destination selector returns to Choose target and selection, intent and hover preview clear while Move remains selected, allowing native re-selection of the same destination to prepare one fresh intent without accepting a command until confirmation

### Requirement: Responsive battle feedback
The HUD SHALL show hero portraits, HP, active side/unit, round, spent move/action budgets, Guarded status, selected target, bounded event log and victory/defeat feedback. Interactive targets SHALL be at least 44 CSS pixels in both dimensions, respect safe areas and remain reachable in portrait and landscape.

#### Scenario: Short landscape HUD
- **WHEN** the viewport becomes short landscape
- **THEN** controls remain reachable without horizontal overflow, a usable board area remains visible, and log overflow scrolls within its bounded region

### Requirement: Preview then confirm
Movement, basic attack and signature actions SHALL display a legal preview before explicit confirmation. Cancel SHALL discard the intent without changing battle state, budgets or RNG. Invalid targets SHALL show a reason without dispatching commands.

#### Scenario: Cancel a move or attack
- **WHEN** a selected action is previewed and cancelled
- **THEN** no command is recorded and state and RNG remain identical

#### Scenario: Confirm a stale intent
- **WHEN** an intent becomes invalid before confirmation
- **THEN** it is rejected visibly and atomically by authoritative rules

### Requirement: Modal capture and keyboard parity
Dialogs SHALL capture focus and prevent board click-through. Keyboard players SHALL be able to navigate board cells, select an action/target, confirm, cancel, end turn and restart using visible focus and native controls. Mouse and touch SHALL use the same intent path.

#### Scenario: Dialog dismissal
- **WHEN** the player dismisses a confirmation or outcome dialog
- **THEN** focus returns to a usable control and the dismissal gesture cannot select the board or dispatch a command

#### Scenario: Keyboard target selection
- **WHEN** a keyboard player moves the board cursor and activates a cell
- **THEN** the same target preview is produced as a pointer selecting that cell, with Escape cancelling pending intent

### Requirement: Safe gestures and lifecycle
Dragging, pinching, pointer cancellation and obsolete gestures from a previous battle SHALL NOT confirm actions. Gameplay controls SHALL remain disabled through enemy execution and animation while restart remains available.

#### Scenario: Gesture and restart cleanup
- **WHEN** a gesture is cancelled or the battle restarts repeatedly
- **THEN** no stale preview or duplicate binding remains, and one subsequent confirmation accepts at most one command
