# Spec Delta

## ADDED Requirements

### Requirement: Group recent combat history
Battle log SHALL retain up to 40 visible events from the current encounter and group them in recorded order by round, acting unit and action. Results SHALL identify affected units where applicable. Filters SHALL preserve the context of surviving results. History SHALL start at encounter entry or Continue and SHALL require no browser storage.

#### Scenario: Ordered actions and results
- **WHEN** combat advances a turn, resolves a hostile or allied ability, or records multiple actions from the same unit
- **THEN** the log keeps each result with its accepted action in order, distinguishes the actor from affected units, and starts the next turn with its own round and actor

#### Scenario: Filter or truncate a group
- **WHEN** filtering or the 40-event limit hides an action's first event
- **THEN** the surviving results retain their round, actor and action and appear in their original order

#### Scenario: Continue an active encounter
- **WHEN** a player resumes a saved battle after reload
- **THEN** the log begins with one marker for the restored turn and omits earlier history

### Requirement: Download combat history
Battle log SHALL offer a keyboard- and touch-accessible download of the full retained log as readable, versioned JSON with build and rules identity and ordered combat results. The file SHALL identify resumed and truncated history. Combat history SHALL remain local and omit save contents, seeds, RNG state and browser identifiers.

#### Scenario: Download while a filter is active
- **WHEN** a player explicitly chooses Export combat log, including with unavailable storage
- **THEN** the browser downloads the complete retained excerpt with its context and result values regardless of active filter, and the dialog stays open without changing battle state

#### Scenario: Dismiss after exporting
- **WHEN** the player uses Hide or Escape after a download
- **THEN** the existing focus return and input lock behavior is preserved

#### Scenario: Export after Dungeon victory
- **WHEN** the last action wins a Dungeon encounter
- **THEN** Dungeon returns automatically and offers the final log until the next encounter, dungeon replacement, or reload

#### Scenario: Export before leaving Dungeon defeat
- **WHEN** the last action defeats the party in Dungeon
- **THEN** the defeat screen offers the final log and waits for Continue before returning to the main menu
- **AND** Continue honors pending saves and their recovery path while export stays in memory
