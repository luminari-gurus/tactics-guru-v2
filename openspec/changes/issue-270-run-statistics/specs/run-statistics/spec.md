# Spec Delta

## Purpose

Provide trustworthy device-local run statistics and personal bests from accepted
play, surviving normal save/resume without counting hidden or paused time.

## ADDED Requirements

### Requirement: Accepted play supplies exact counters
The system SHALL count enemies defeated, battles won, player movement commands
and dungeon floors fully cleared from accepted authoritative results. One legal
hero movement command or dungeon exploration step counts as one move. Enemy
movement, previews, rejected commands, replay hydration and repeated observations
SHALL NOT increment counters. Undo SHALL remove its movement count.

#### Scenario: Movement undo and rejected input
- **WHEN** a hero accepts a multi-cell move, undoes it and accepts another move
- **THEN** the net count increases by one, and rejected or cancelled attempts add nothing

#### Scenario: Outcome and unique floor completion
- **WHEN** repeated callbacks observe a victory or the third clear on a dungeon floor
- **THEN** the battle and floor are counted once, and stairs or revisiting that floor add nothing

#### Scenario: Defeat events in a multi-hit attack
- **WHEN** a resolved attack emits several damage events and one enemy defeat
- **THEN** only that enemy defeat adds one kill; hero defeats and damage events add none

### Requirement: Duration measures active gameplay
Duration SHALL accumulate only while an admitted journey is visible, focused and
in active battle or dungeon exploration. Hidden, unfocused, closed, loading,
terminal, preparation, reward, menu and paused-dialog intervals SHALL NOT count.
Active battle animations and enemy turns SHALL count. Undo SHALL NOT remove time.
Clock changes SHALL NOT create negative or overlapping intervals.

#### Scenario: Hidden and closed intervals
- **WHEN** active play is followed by hiding the page, closing it and later explicitly continuing
- **THEN** completed saved active intervals remain and none of the intervening time is added

#### Scenario: Paused dialog and repeated lifecycle callbacks
- **WHEN** a modal pauses play and repeated blur, hide and pagehide callbacks occur
- **THEN** its preceding active interval is counted once and time resumes only after eligible play returns

### Requirement: Active statistics survive accepted save boundaries
Versioned statistics SHALL be saved with the active journey and its corresponding
battle boundary. Normal reload, Continue and resumed command execution SHALL
preserve prior totals without reapplying historical events. Failed writes and
stale-tab conflicts SHALL retain existing recovery behavior and SHALL NOT block
legal gameplay or overwrite another journey's progress.

#### Scenario: Resume and perform another legal action
- **WHEN** a saved active battle resumes and accepts a new move or enemy defeat
- **THEN** its prior totals remain and only the new accepted event changes them

#### Scenario: Write conflict
- **WHEN** another tab changes the save before a statistics checkpoint
- **THEN** the stale write is refused, its unsaved status remains visible and recovery preserves the reviewed bytes

### Requirement: Ending summaries and personal bests are immutable
Accepted victory, defeat or confirmed replacement SHALL freeze each ended
journey's statistics exactly once through the existing recording boundary.
Personal bests SHALL update only with that accepted record. Cancellation, stale
review, failed replacement, menu return and continued dungeon descent SHALL NOT
create an ending or a personal best.

#### Scenario: Paired replacement and recovery
- **WHEN** confirmed New Game ends distinct reviewed-save and admitted-live identities
- **THEN** both frozen summaries are committed once or recovered from the pending intent with their original statistics

#### Scenario: Repeated terminal Continue
- **WHEN** the same terminal journey is continued after its summary was recorded
- **THEN** its result, statistics and personal-best attribution remain unchanged

### Requirement: Recent history and best runs remain bounded and useful
The Hall of Records SHALL show the newest 100 summaries with all five statistics,
outcome and recorded time. It SHALL show per-mode maxima and the winning journey
for each applicable statistic, using longest active duration. Ties SHALL select
the newest recorded summary then stable mode/ID order. A winning summary SHALL
remain accessible after leaving recent history. Authored-run floors are N/A.

#### Scenario: Recent-history eviction
- **WHEN** a new summary evicts an older personal-best holder from the newest 100
- **THEN** the previous best and its bounded attributed summary remain available

#### Scenario: Keyboard and touch access
- **WHEN** records are opened on desktop or a narrow portrait/landscape touch profile
- **THEN** recent statistics, per-mode bests and winning summaries are readable and reachable, with existing focus return and recovery controls

### Requirement: Compatibility preserves facts and recoverable data
Prior active saves and records SHALL remain readable without a write on opening.
Known historical battle/floor counts SHALL be retained; unrecoverable kills,
moves and time SHALL be labelled unavailable or tracked since upgrade, never
fabricated as whole-run zeroes. Partial fields SHALL NOT compete as complete
personal bests. Corrupt or unsupported versions SHALL preserve original bytes.

#### Scenario: Legacy active journey
- **WHEN** a pre-statistics journey is explicitly continued and played further
- **THEN** known progress remains exact, new partial counters are labelled since upgrade and no complete-history claim is made for them

#### Scenario: Counter-only journey gains a clock
- **WHEN** a journey saved by the counter-only increment is continued by the timed increment
- **THEN** its whole-run kills and moves remain whole-run facts, reserved old zero time is marked since upgrade, and only that partial time is excluded from complete maxima

#### Scenario: Legacy history and invalid future data
- **WHEN** history contains old records or an unsupported/corrupt slot
- **THEN** compatible facts can be viewed without rewriting storage and existing reviewed export, backup recovery and reset remain available

### Requirement: Tracking obeys entry isolation and remains local
Only authored runs and dungeons admitted through the base-route main menu SHALL
track run statistics or access history. Dedicated testing and diagnostic routes
SHALL NOT construct tracking or read/write history. Statistics SHALL remain
device-local and SHALL NOT change combat, RNG, replay, movement or reward rules.

#### Scenario: Dedicated entry with existing player data
- **WHEN** each direct game/testing route or diagnostic entry is opened and played
- **THEN** tracking remains disabled and existing active-save/history bytes are untouched

#### Scenario: Future granular statistics
- **WHEN** the design is extended later for class/type damage totals
- **THEN** the documented extension point is a versioned pure reduction of accepted combat events, without UI-derived rule counters
