# Spec Delta

## Purpose

Provide a readable portrait entry menu that connects existing game modes and saved progress through deliberate, recoverable user choices.

## ADDED Requirements

### Requirement: Base-aware menu entry and mode navigation
The application SHALL show the menu at the base root and expose standalone battle at `/battle`, with `/run`, `/dungeon`, and `/map` reachable beneath the same configured base. Explicit root `scene=battle`, `scene=proof`, and `scene=content-smoke` entries SHALL retain their scene behavior. Unknown scene values SHALL NOT bypass the menu.

#### Scenario: Direct and prefixed entry
- **WHEN** the player visits or refreshes root or a supported mode beneath `/` or `/prototype/`
- **THEN** the expected menu or mode renders with working local assets and no duplicated base prefix

#### Scenario: Existing diagnostics
- **WHEN** an explicit supported scene query is used at root
- **THEN** the existing scene and its controls remain available without a menu interception

### Requirement: Ordered independent menu layers
The menu SHALL render Continue, New Game, Hall of Records, and Settings in that order from a menu definition. Decorative background, the supplied title image, and interactive controls SHALL remain separate. The title SHALL preserve its aspect ratio and accessible text equivalent; assets SHALL be served locally with readable failure fallbacks.

#### Scenario: Decoration fails or entries change
- **WHEN** an image fails to load or an entry definition changes
- **THEN** a readable Tactics Guru title and usable controls remain, without editing background lettering or buttons

### Requirement: Responsive and accessible portrait composition
The menu SHALL use a centered portrait composition on desktop and mobile with visible focus, native keyboard operation, minimum 44 CSS pixel targets, safe-area padding, and scrolling on short screens. Decorative motion SHALL honor reduced motion and SHALL NOT delay interaction.

#### Scenario: Narrow, short, and enlarged text
- **WHEN** the menu is viewed at narrow portrait, short landscape, wide desktop, or enlarged text
- **THEN** all four actions and recovery feedback are reachable without horizontal overflow or cropped title lettering

#### Scenario: Dialog dismissal
- **WHEN** a player closes a menu dialog by its close control or Escape
- **THEN** focus returns to the originating menu control and no gameplay action is dispatched

### Requirement: Read-only save discovery
Menu entry SHALL inspect battle, run, and dungeon saves through their existing validators without creating sessions, writing saves, repairing data, or consuming gameplay RNG. Continue SHALL be disabled when no valid primary or backup exists. Missing, invalid, incompatible, backup-only, and unavailable storage SHALL have distinct readable feedback and recovery access.

#### Scenario: No saved progress
- **WHEN** all inspected slots are missing
- **THEN** Continue is disabled, New Game remains usable, and no saves are created by rendering the menu

#### Scenario: Invalid primary or unavailable storage
- **WHEN** a primary is invalid, a valid backup exists, or storage cannot be read
- **THEN** the menu reports the actual condition, retains every save byte, and offers the owning mode's recovery flow without silent reset

### Requirement: Explicit continue destination and revalidation
Continue SHALL target the sole resumable mode or show a labeled mode chooser when several modes have valid saves. The owning destination SHALL re-inspect and use its existing Continue contract before hydration. Changed, missing, or unreadable destination data SHALL return to that mode's recovery/startup controls without starting a fresh game implicitly.

#### Scenario: Multiple saved modes
- **WHEN** valid battle, run, or dungeon saves coexist and Continue is activated
- **THEN** the player chooses a named mode without timestamp guesses or changes to unselected saves

#### Scenario: Save changes during navigation
- **WHEN** the selected save changes or becomes invalid before destination Continue executes
- **THEN** current destination validation controls the result, with visible recovery and no consumption of the old menu inspection

### Requirement: Reviewed dungeon new-game handoff
New Game SHALL show its confirmation over the main menu. The dungeon SHALL re-inspect the reviewed saves before replacement and request fresh confirmation if they changed or the review is unavailable. Replacing saved dungeon progress SHALL retain compare-before-remove checks. Cancelling or failing replacement SHALL preserve recoverable data and expose the existing recovery path. Battle and run saves SHALL remain separate.

#### Scenario: Existing dungeon and repeated activation
- **WHEN** New Game is activated repeatedly with existing dungeon data
- **THEN** one confirmation governs at most one replacement, and cancellation leaves all save families unchanged

### Requirement: Bounded records and settings destinations
Hall of Records SHALL open an honest device-local history empty state identifying that records are not yet collected. Settings SHALL provide existing privacy controls and guidance that sound is controlled in-game. Neither destination SHALL invent records, enable music, reset saves, or introduce new gameplay preferences.

#### Scenario: Records and privacy
- **WHEN** the player opens Records or Settings
- **THEN** the dialog states its current scope, supports keyboard/touch dismissal, and uses existing privacy opt-out behavior without expanding collection

### Requirement: Entry isolation and existing mode behavior
The menu SHALL avoid engine/audio initialization and collection under a fabricated battle route. Existing gameplay modes SHALL retain their command, persistence, recovery, audio-unlock, and telemetry behavior at their canonical URLs. Return-to-menu navigation SHALL preserve accepted durable progress and disclose any unsaved state using the owning mode's conventions.

#### Scenario: Menu idle and return
- **WHEN** the menu is loaded, idles, or is revisited after play
- **THEN** it creates no canvas, plays no audio, changes no gameplay state, and refreshes save availability
