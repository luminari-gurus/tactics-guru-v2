# Spec Delta

## ADDED Requirements

### Requirement: Explicit unsaved run ownership
Explicit unsaved play SHALL preserve all stored run bytes even after storage access recovers. Automatic boundary saves and manual retries MUST remain disabled until the player explicitly continues reviewed saved progress or confirms a fresh replacement.

#### Scenario: Read access returns during unsaved play
- **WHEN** a player starts unsaved while run reads are denied, reads recover, and accepted commands or retries occur
- **THEN** both original slots remain byte-identical and the UI identifies unsaved progress
- **AND** reviewing and explicitly continuing or replacing the saved run enables the chosen run's normal persistence

### Requirement: Startup recovery navigation
Continue SHALL remain usable after nondestructive startup dialog exits, and rejected continuation SHALL expose visible recovery while preserving saved bytes.

#### Scenario: Cancel or export before Continue
- **WHEN** a player cancels Start new run using Cancel or Escape, or exports a saved slot through recovery, then chooses Continue
- **THEN** the saved boundary appears with reachable encounter controls and no save mutation from the dialog exit

### Requirement: Fresh start after saved progress removal
Starting after explicitly removing both slots of a loaded run SHALL create a fresh identity, next seed, full party and empty ownership with no active battle. A genuinely empty first launch SHALL retain seed 13.

#### Scenario: Remove an active run and start again
- **WHEN** a player reloads an active run, removes both slots in recovery, closes recovery and starts a new run
- **THEN** the old active snapshot is not republished and Start encounter opens a playable fresh battle
