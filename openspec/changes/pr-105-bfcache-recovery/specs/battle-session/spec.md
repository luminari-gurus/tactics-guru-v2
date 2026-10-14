# Spec Delta

## ADDED Requirements

### Requirement: History restoration cannot revive a departed battle
Leaving a battle document SHALL stop its command processing, pending presentations and autosave callbacks. Returning from the browser back/forward cache SHALL re-enter startup and inspect current saved data before enabling battle input or enemy turns. Existing saved slots MUST remain unchanged until the player makes an explicit recovery choice or a continued session accepts a new command.

#### Scenario: A newer battle replaces the cached one
- **WHEN** one tab visits battle A, visits the map, starts replacement battle B and returns through history to cached battle A
- **THEN** both B save slots remain byte-identical, no A command is accepted, and startup offers the current saved battle; Continue restores B

#### Scenario: Cached return without replacement
- **WHEN** a player leaves a battle at an accepted command boundary and returns through the browser cache
- **THEN** startup offers that saved boundary without writing either slot; Continue resumes its state without replaying already presented commands

#### Scenario: Cached recovery choices are obsolete
- **WHEN** a saved-battle recovery dialog is cached and the saved battle changes during later navigation in that tab
- **THEN** returning discards the old dialog and inspects the current slots before offering Continue, removal or replacement

#### Scenario: Visibility change without navigation
- **WHEN** the battle is temporarily hidden and shown without leaving its document
- **THEN** the existing session resumes under the current visibility/presentation rules without forcing startup or discarding its in-memory state
