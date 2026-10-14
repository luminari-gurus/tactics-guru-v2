# Spec Delta

## MODIFIED Requirements

### Requirement: Modal capture and keyboard parity
Dialogs SHALL capture focus and prevent board click-through. Keyboard players SHALL be able to navigate board cells, select an action/target, confirm, cancel, end turn and restart using visible focus and native controls. Mouse and touch SHALL use the same intent path.

#### Scenario: Dialog dismissal
- **WHEN** the player dismisses a confirmation or outcome dialog
- **THEN** focus returns to a usable control and the dismissal gesture cannot select the board or dispatch a command

#### Scenario: Keyboard target selection
- **WHEN** a keyboard player moves the board cursor and activates a cell
- **THEN** the same target preview is produced as a pointer selecting that cell, with Escape cancelling pending intent

#### Scenario: Dialog action disables its invoker
- **WHEN** cancelling or confirming a dialog makes its original invoking control unavailable
- **THEN** focus returns to the usable Restart control after the resulting state change, rather than leaving focus on the page body

#### Scenario: Dialog action opens a replacement dialog
- **WHEN** a dialog action immediately opens another modal
- **THEN** focus stays inside that replacement modal instead of returning to the underlying battle controls

#### Scenario: Held confirmation key
- **WHEN** Enter or Space remains held while a button activation changes focus
- **THEN** repeated keydowns do not activate the newly focused button or reset either saved slot; a fresh activation after key release remains usable

#### Scenario: Startup dialog has no usable invoker
- **WHEN** keyboard Continue closes a startup dialog whose original invoker is BODY, the document element, or cannot acquire focus
- **THEN** focus moves to the enabled Restart control after the callback, while a replacement modal retains its own focus
