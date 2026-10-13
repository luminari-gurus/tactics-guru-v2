# Spec Delta

## Purpose

Let players continue an accepted battle boundary and manage recoverable local saves without changing deterministic gameplay or silently reviving a replaced battle.

## ADDED Requirements

### Requirement: Validated continuation without historical presentation
Continue SHALL accept only a fully validated compatible snapshot and preserve its committed state, next legal command, RNG and remaining enemy decisions. It MUST rebuild transient presentation without replaying past events or restoring previews, callbacks or animation queues.

#### Scenario: Reload during an accepted command
- **WHEN** a player or enemy command is saved while its presentation is unfinished and the player reloads and chooses Continue
- **THEN** the committed result is restored once, historical sound and animation do not play, and the next accepted command matches uninterrupted execution

#### Scenario: Enemy attack before Wait
- **WHEN** an enemy has attacked without moving at the saved boundary, including seed 2 at command 29
- **THEN** continuation preserves its pending Wait rather than introducing another move or attack

#### Scenario: Terminal or exhausted save
- **WHEN** a victory, defeat or command-limit boundary is continued
- **THEN** the original outcome or limit is preserved and no extra command is accepted to make the battle appear playable

### Requirement: Save every committed command before presentation
Each accepted player and enemy command SHALL trigger one save attempt at its committed boundary before presentation begins. Previews, cancellation, rejected commands and presentation acknowledgements MUST NOT save or consume RNG. A failure SHALL leave the accepted in-memory battle playable and show persistence status.

#### Scenario: Accepted boundary and duplicate acknowledgement
- **WHEN** a command succeeds and presentation completion is repeated or interrupted
- **THEN** that boundary has one save attempt and no duplicate command, RNG draw or save caused by acknowledgement

#### Scenario: Save fails
- **WHEN** storage is unavailable, denied, full or requires recovery during an accepted command
- **THEN** gameplay retains the accepted state and continues, a visible nonfatal status identifies unsaved progress, and recovery bytes are not automatically removed

### Requirement: Startup and recovery require explicit choices
Startup SHALL inspect both slots without changing them. A validated primary SHALL offer Continue; a selected backup SHALL identify recovery and possible lost progress. No candidate SHALL be treated as valid when validation or reads fail. When both slots are confirmed absent, a fresh battle can start normally.

#### Scenario: Valid backup with broken primary
- **WHEN** primary is invalid or unreadable and backup validates
- **THEN** the player can explicitly continue the backup with the primary problem visible; the original primary remains available and autosave stays blocked until its problem is resolved

#### Scenario: Invalid data or unavailable startup storage
- **WHEN** no validated candidate exists and either slot is invalid or cannot be inspected
- **THEN** the app presents recovery or retry without constructing a session from that data, deleting it, or silently starting a replacement battle

### Requirement: Recovery and reset preserve informed control
Players SHALL have accessible Continue, New battle, recovery, raw export and explicitly confirmed reset controls using mouse, touch and keyboard. Dialogs MUST capture focus/input, restore usable focus, and prevent board click-through. Invalid raw data MUST remain exportable until an explicitly authorized removal succeeds.

#### Scenario: Export then remove damaged data
- **WHEN** the player exports an inspected invalid slot and explicitly confirms its removal
- **THEN** the download preserves the exact inspected string, only the unchanged owned slot is removed, and changed or unreadable data causes a visible refusal requiring fresh review

#### Scenario: Responsive recovery controls
- **WHEN** a recovery dialog is used by keyboard or touch in portrait or short landscape
- **THEN** controls remain reachable with visible focus and at least 44 CSS pixel targets, and neither activation nor dismissal sends an unintended board command

### Requirement: Successful replacement cannot revive the old save
New battle and outcome restart SHALL transition only after both old owned slots are confirmed absent under the documented single-writer model. Any failed, partial or changed-value invalidation MUST prevent transition, retain the current in-memory session and recovery text, and offer retry or cancellation. A successful replacement SHALL use the next seed and never recover the old battle.

#### Scenario: Removal fails after one slot was cleared
- **WHEN** one removal succeeds but the other removal or final absence check fails
- **THEN** no new scene or seed is committed, the current session remains available, and the UI reports incomplete reset without silently retrying removal

#### Scenario: Replacement save fails after confirmed invalidation
- **WHEN** both old slots were confirmed absent and the new battle's initial save fails
- **THEN** the fresh battle remains playable with unsaved status and a subsequent load offers only a new-battle boundary or no save, never the replaced battle

#### Scenario: Repeated restart and interrupted presentation
- **WHEN** restart is requested repeatedly, during presentation or from an outcome dialog
- **THEN** at most one replacement succeeds, the seed advances once, one canvas remains and obsolete callbacks/listeners/audio cannot affect the replacement

### Requirement: Persistence boundaries remain explicit
Live persistence SHALL reuse the accepted save format and only the two owned Phaser battle keys. It MUST leave legacy and unrelated keys untouched and describe origin-scoped best-effort retention. This feature MUST NOT claim concurrent-writer transactions, permanent durability, physical-device certification or release acceptance from automated tests.

#### Scenario: Browser verification completes
- **WHEN** deterministic fixtures and real-control browser reload/recovery checks pass
- **THEN** the report records exact tested coverage and leaves physical lifecycle certification to #74 and release readiness to #57
