# Spec Delta

## Purpose

Provide continuing deterministic dungeon floors with safe backtracking and durable, exactly-once encounter progress.

## ADDED Requirements

### Requirement: Continuing dungeon mode
The system SHALL provide a base-path-aware dungeon entry with explicit floor and encounter state and no fixed-depth victory. Existing standalone battle, short-run and map modes SHALL remain available with independent saves.

#### Scenario: Continue beyond the first floor
- **WHEN** the party defeats a floor guardian and descends
- **THEN** a new deterministic floor becomes available without ending the run in victory

#### Scenario: Retain proof of concept
- **WHEN** the existing short run reaches its third victory
- **THEN** its terminal victory and existing save behavior remain intact

### Requirement: Stable floor identity
Each floor SHALL retain versioned generation descriptors, legal stair positions, player position and encounter/POI completion. Generation, encounter, reward and battle randomness SHALL use separate purposes and stable identities.

#### Scenario: Regenerate evicted geometry
- **WHEN** a visited floor leaves the geometry cache and is revisited
- **THEN** its identical map is reconstructed and its saved position, cleared POIs and stair state are restored without RNG draws in the active battle

### Requirement: Exactly-once completion and travel
Guardian victory SHALL unlock descent once. Ascent SHALL restore the previous floor and its position. Travel SHALL reject active battles, pending rewards, stale commands and illegal stairs without mutation. Completed encounters SHALL never restart or grant rewards on revisit.

#### Scenario: Repeated callbacks
- **WHEN** a victory, reward claim or travel command is delivered twice
- **THEN** only the first matching boundary can commit and the duplicate changes neither rewards nor position

#### Scenario: Backtrack
- **WHEN** a party ascends from floor two after previously clearing floor one
- **THEN** floor one retains cleared encounters, unlocked descent and its saved player position

### Requirement: Carried party and resources
Dungeon transitions SHALL carry current party HP, defeat state, inventory and equipment. New battles SHALL reset battle-local resources and effects only. Rewards and equipment identities SHALL include unique dungeon encounter boundaries and retain ownership/capacity checks.

#### Scenario: Later encounter reconstruction
- **WHEN** a partially injured party with an equipped owned charm starts a later-floor battle
- **THEN** living heroes enter at carried HP, defeated heroes remain absent and equipment applies exactly once

### Requirement: Versioned durable recovery
The system SHALL save dungeon descriptors, completion, pending rewards and active battle in one validated snapshot. Invalid or incompatible saves SHALL remain exportable. Resource failures SHALL preserve prior durable state, report unsaved progress and prevent travel from silently dropping visited-floor state.

#### Scenario: Resume at supported boundaries
- **WHEN** a battle, reward or travel snapshot is reloaded
- **THEN** state and the next accepted command and RNG result match uninterrupted execution

#### Scenario: Capacity failure
- **WHEN** a new-floor snapshot exceeds the encoded resource budget or storage write fails
- **THEN** travel does not publish the new floor, existing save bytes and visited-floor facts remain available, and recovery offers retry/export without declaring victory

### Requirement: Accessible dungeon controls
The dungeon SHALL display floor depth, encounter progress, guardian completion and legal stair actions. Keyboard and touch controls SHALL respect modal/input locks and provide clear save/recovery feedback across desktop, portrait and landscape layouts.

#### Scenario: Locked or unavailable stairs
- **WHEN** the guardian is not defeated, a reward is pending or battle presentation is active
- **THEN** descent cannot commit and the interface explains its unavailable state

### Requirement: Confirmed owned charm disposal
During dungeon preparation or pending rewards, the system SHALL allow explicitly confirmed disposal of an owned charm, including equipped charms. Disposal SHALL remove that instance and its assignment once, preserving HP, RNG, pending offers and completion. Cancelled, stale, unowned, active-battle and defeat requests MUST change nothing.

#### Scenario: Free full equipment capacity
- **WHEN** the player confirms disposal of an owned charm at six equipment instances
- **THEN** the instance and any assignment are removed, the pending reward remains unchanged, and a new deliberate reward claim can fill the freed slot

#### Scenario: Cancel disposal
- **WHEN** the player cancels the disposal confirmation
- **THEN** ownership, assignment, revision and saved bytes remain unchanged

#### Scenario: Restore after disposal
- **WHEN** a saved dungeon is resumed after confirmed disposal
- **THEN** the removed instance and assignment remain absent and the pending reward retains its identity and options

#### Scenario: Reject unavailable disposal
- **WHEN** disposal names an unowned instance, uses a stale boundary or occurs during battle or defeat
- **THEN** no inventory, party, RNG or reward mutation occurs
