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

#### Scenario: A newer accepted action supersedes the pending save
- **WHEN** another accepted battle action saves before the pending save can write
- **THEN** the newer save settles with the pending save's feedback, and Continue or reset discard it

#### Scenario: A later battle boundary is rejected
- **WHEN** a battle command samples playtime and its boundary is then rejected
- **THEN** the pending save still writes the previously accepted progress with the sampled playtime, the rejection remains visible, and battle input stops until recovery

#### Scenario: The session is disposed before the lock is granted
- **WHEN** teardown precedes the grant, with or without a playtime sample
- **THEN** the pending save still writes the accepted progress if the callback runs
