# Spec Delta

## MODIFIED Requirements

### Requirement: Safe gestures and lifecycle
Dragging, pinching, pointer cancellation and obsolete gestures from a previous battle SHALL NOT confirm actions. Gameplay controls SHALL remain disabled through enemy execution and animation while a restart request remains available. Restart SHALL use the shared persistence replacement flow and MUST NOT bypass an invalidation failure; duplicate requests SHALL NOT create multiple replacements.

#### Scenario: Gesture and restart cleanup
- **WHEN** a gesture is cancelled or the battle restarts repeatedly
- **THEN** no stale preview or duplicate binding remains, and one subsequent confirmation accepts at most one command

#### Scenario: Outcome and toolbar restart agree
- **WHEN** the player requests restart from the toolbar, confirmation dialog or outcome dialog
- **THEN** the same guarded replacement behavior applies, including visible failure and focus restoration when old saves cannot be invalidated
