# Run Records Spec Delta

## Purpose

Preserve bounded, immutable device-local summaries of finished journeys, with
clear recording boundaries, recoverable storage and accessible menu presentation.

## ADDED Requirements

### Requirement: Immutable identifiable summaries
Each record SHALL identify its run mode, stable journey ID, outcome and recording time. It SHALL contain only supported validated counters and SHALL remain unchanged after recording. The initial outcomes SHALL be victory, defeat and abandonment.

#### Scenario: Supported progress
- **WHEN** a finished authored run or dungeon is recorded
- **THEN** battles won are exact, dungeon cleared-floor/deepest-floor values are exact, and authored floor fields are explicitly not applicable
- **AND** currencies, playtime and counters not yet tracked are not invented

#### Scenario: Duplicate candidate
- **WHEN** the same journey is presented again, including with conflicting summary values
- **THEN** the original record is retained without adding or rewriting a result

### Requirement: Actual journey endings
Recording SHALL follow accepted victory, defeat or explicit replacement of an unfinished journey. An endless dungeon SHALL end only on defeat or abandonment. Closing a tab, navigating to the menu, reloading or clearing a floor SHALL NOT abandon or complete a journey.

#### Scenario: Continued descent and backtracking
- **WHEN** a dungeon clears its guardian, descends, revisits a floor or returns to the menu
- **THEN** no terminal record is created and the journey identity remains unchanged

#### Scenario: Reviewed replacement
- **WHEN** the player confirms replacing a validated unfinished saved journey and replacement is accepted
- **THEN** that old journey receives one abandonment record
- **AND** cancellation, stale review or failed replacement creates no abandonment

#### Scenario: Distinct admitted live journey and reviewed save
- **WHEN** accepted replacement discards an admitted live journey and a different validated saved journey
- **THEN** both ended identities receive their own immutable result without counting either twice
- **AND** their bounded pending intent reconciles together after interruption, preserves frozen prior results, and remains readable alongside legacy single-journey receipts

### Requirement: Idempotent recovery
Repeated callbacks, accepted terminal continuation and storage retries SHALL create at most one history entry per journey. Interrupted replacement SHALL preserve enough bounded recovery information to distinguish a pending operation from an accepted ending. Uncertainty SHALL be reported without inventing a result.

#### Scenario: Terminal reload
- **WHEN** a terminal journey is continued after its history write succeeded or was interrupted
- **THEN** the existing entry is reused or the missing entry is recorded once
- **AND** the active state, RNG, rewards and historical battle events are unchanged

#### Scenario: Failed replacement recovery
- **WHEN** replacement partially fails or a pending operation cannot be reconciled
- **THEN** the UI reports the unresolved history state and retains recovery information without displaying an invented abandonment

### Requirement: Bounded device-local storage
History SHALL be versioned and kept separate from active saves. It SHALL retain the newest 100 summaries with deterministic tie ordering and only bounded current-journey receipts. Storage failures SHALL not interrupt gameplay. The UI SHALL describe browser-local best-effort persistence accurately.

#### Scenario: Retention and duplicate prevention
- **WHEN** retention evicts old summaries and a still-current terminal save is reloaded
- **THEN** retained entries stay within 100 and the old result is not resurrected as a newly finished journey

#### Scenario: Storage unavailable
- **WHEN** storage access, exclusive write access, quota or readback fails
- **THEN** gameplay can continue, the records UI reports the failure, and success is not claimed

### Requirement: Conservative history recovery
Missing history SHALL show an empty state. Corrupt or unknown-version bytes SHALL be preserved. Recovery SHALL offer readable status and explicit reviewed export/reset of records only, without modifying active-save keys.

#### Scenario: Corruption and future version
- **WHEN** stored history is malformed, oversized or from an unsupported version
- **THEN** its bytes are not silently overwritten and recovery identifies the condition
- **AND** canceled recovery leaves all storage unchanged

### Requirement: Accessible existing-menu presentation
The existing Hall of Records destination SHALL display newest-first summaries, clear outcomes and supported counters, with keyboard/touch access and narrow portrait/landscape readability. Closing it SHALL restore focus to its invoker.

#### Scenario: Browse records
- **WHEN** a player opens Hall of Records by keyboard or touch
- **THEN** the history or honest empty/degraded/unavailable state is readable and usable without horizontal clipping
- **AND** closing the view restores focus without affecting a saved journey

### Requirement: Testing-route isolation
Only persistent menu-origin authored runs and dungeons SHALL produce records. Dedicated testing routes and diagnostic scene entries SHALL perform no history reads, writes or removals. Standalone battles SHALL NOT create run records.

#### Scenario: Test entry with existing history
- **WHEN** any dedicated test route or diagnostic scene is visited, played or restarted
- **THEN** no history storage operation occurs and existing history and saved menu journeys are unchanged

#### Scenario: Real ending through controls
- **WHEN** a menu-origin journey reaches its legal terminal outcome through actual gameplay controls
- **THEN** its result appears once in Hall of Records and remains single after reload and Continue
