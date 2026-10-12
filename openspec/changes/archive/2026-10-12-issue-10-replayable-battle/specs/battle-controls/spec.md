# Spec Delta

## Purpose

Give players readable battle feedback and consistent, accessible controls across keyboard, mouse and touch without unintended gameplay input.

## ADDED Requirements

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
