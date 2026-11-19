## Purpose

Keep dungeon save feedback accurate when an active playtime checkpoint overlaps an accepted battle action.

## ADDED Requirements

### Requirement: Complete a dungeon autosave with its feedback

A playtime sample taken while an autosave waits for exclusive access SHALL be
included in the write for that snapshot. A save that was showing a pending
message SHALL show the actual result and its action feedback when it settles.

#### Scenario: Playtime sampled while the save is waiting
- **WHEN** blur or a timer tick samples playtime before the pending save can write
- **THEN** the successful save includes the accepted progress and sampled playtime, and displays the saved confirmation with the original feedback

#### Scenario: Pending save is refused
- **WHEN** storage or exclusive access refuses that write
- **THEN** the dungeon reports unsaved progress with the original feedback and keeps the recovery path available

#### Scenario: A different snapshot replaces the pending progress
- **WHEN** Continue, reset, or a newer accepted action replaces the snapshot before the callback runs
- **THEN** the stale callback cannot publish the old progress or its feedback
