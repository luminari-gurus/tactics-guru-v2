# Spec Delta

## ADDED Requirements

### Requirement: Explicit owned ability selection
The battle SHALL expose every currently available owned ability through an accessible catalog-driven choice, retain direct Move, Basic attack and Wait controls, and carry the chosen ability identity through preview and confirmation. Choosing an ability SHALL NOT dispatch a command.

#### Scenario: More than one class ability
- **WHEN** an actor owns multiple implemented non-basic abilities
- **THEN** every ability is discoverable and independently selectable, and selecting a later entry prepares that exact ability rather than the first catalog entry

#### Scenario: Availability and metadata
- **WHEN** the actor or phase changes or its action is spent
- **THEN** choices and readable disabled reasons reflect current authority, with selected ability range, targeting mode and effect guidance; uses, cooldown and level requirements appear only where implemented authoritative data defines them

#### Scenario: Unowned and unsupported abilities
- **WHEN** an ability belongs to another actor or requires an unimplemented profile
- **THEN** it cannot produce a valid prepared command, and the UI does not advertise unsupported self, ally or area mechanics

### Requirement: Ability targeting follows authoritative legality
The selected ability SHALL use shared authoritative preview legality for board and native target controls. Implemented friendly targeting SHALL require explicit confirmation naming the friendly target and consequence. Merely choosing a target SHALL NOT execute an action.

#### Scenario: Ordinary attack target
- **WHEN** the selected attack requires a hostile living unit
- **THEN** invalid allegiance, defeated targets, range and line-of-sight failures cannot create an executable intent and display a reason

#### Scenario: Friendly Magic Missile
- **WHEN** Magic Missile is deliberately aimed at a legal friendly unit
- **THEN** native and board controls expose consistent legality, preview identifies force damage and friendly fire, and confirmation explicitly identifies the friendly target before damage is accepted

#### Scenario: Missile target shape
- **WHEN** a supported Magic Missile profile has multiple missiles
- **THEN** preparing all missiles at one chosen target supplies the complete authoritative target allocation without changing missile damage, range, count or spread rules

### Requirement: Ability intent survives presentation-only refreshes
Ability choice, target and valid pending intent SHALL survive inspection and layout refreshes without changing state, RNG, replay or save bytes. Cancellation, accepted commands, actor changes and restart SHALL discard stale pending ability intent; resumed scenes SHALL reconstruct availability without auto-execution.

#### Scenario: Inspection and rotation of viewport
- **WHEN** the player inspects another unit or resizes between portrait and landscape with a prepared ability
- **THEN** closing inspection or completing layout retains the chosen ability and target without accepting a command or resetting the actor

#### Scenario: Cancellation and repeat use
- **WHEN** an ability is cancelled or an action finishes and the player later selects the same ability again
- **THEN** cancellation preserves authoritative data and one deliberate confirmation accepts at most one fresh command subject to current budgets

#### Scenario: Locked phases and reconstructed scenes
- **WHEN** enemy/presentation/error/terminal phases, actor replacement, Continue or restart occur
- **THEN** locks remain effective, stale ability intent cannot execute and controls reflect the current actor

### Requirement: Accessible compact ability controls
Ability selection SHALL support native keyboard operation, mouse and touch with visible focus, readable names, at least 44 CSS pixel interactive dimensions, and reachable controls on desktop, narrow portrait and short landscape layouts.

#### Scenario: Narrow screen selection
- **WHEN** the player opens the ability choice, selects an entry and confirms or cancels using keyboard or touch
- **THEN** controls remain reachable without horizontal overflow or board click-through and use the same preview and intent path as desktop

### Requirement: Validated additional ability definitions
Additional ability definitions SHALL use well-formed IDs, existing implemented profiles with exact fields and bounded values, and nonempty distinct existing owners. Canonical ability definitions SHALL remain required with their original kinds and ordered owners. Guarded attacks SHALL retain the Fighter-only effect lifecycle.

#### Scenario: Admit a second ability
- **WHEN** a catalog adds a distinct valid ability using an implemented profile and eligible existing owners
- **THEN** content loading accepts it and owned ability controls expose its exact identity

#### Scenario: Reject malformed or incompatible definitions
- **WHEN** additional content has malformed IDs, unknown profiles, extra fields, invalid numeric bounds, duplicate or missing owners, or non-Fighter guarded owners
- **THEN** content validation rejects it before a battle loads

#### Scenario: Retain canonical constraints
- **WHEN** a catalog removes a canonical ability or changes its required kind or ordered owners
- **THEN** content validation rejects it despite permitting additional definitions
