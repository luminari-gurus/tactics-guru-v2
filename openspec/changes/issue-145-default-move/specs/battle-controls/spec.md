## ADDED Requirements

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
