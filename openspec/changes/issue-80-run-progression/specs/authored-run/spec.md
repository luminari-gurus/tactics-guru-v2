# Spec Delta

## Purpose

Provide a playable three-encounter authored run with deterministic carried-party combat, atomic reward progression and safe local continuation, alongside the existing single-battle flow.

## ADDED Requirements

### Requirement: Discoverable authored run
The application SHALL expose a discoverable run entry with Start and Continue controls, encounter identity and progress, party preparation and terminal outcomes. Existing single-battle play, replay and restart SHALL remain available independently.

#### Scenario: Start and return
- **WHEN** a player follows the run entry and starts a new run
- **THEN** encounter one starts with the full initial party and empty ownership
- **AND** returning to single-battle play preserves its independent save and controls

### Requirement: Deterministic carried-party battles
Each encounter SHALL start from the approved encounter seed, authored map, surviving entry HP and equipment effects applied once. Defeated heroes SHALL remain absent, and initiative, action budgets and statuses SHALL reset. Accepted records SHALL reproduce carried-party battles and their next command/RNG result.

#### Scenario: Survivor and equipment carryover
- **WHEN** a victorious party claims a reward, prepares equipment and starts the next battle
- **THEN** survivors retain approved HP, defeated heroes remain absent, equipment bonuses apply once and battle-local state starts fresh

#### Scenario: Reproduce a carried encounter
- **WHEN** accepted commands are replayed from their validated run entry
- **THEN** resulting state, events and next RNG match uninterrupted execution
- **AND** altered initial HP, seed, roster, equipment or initiative is rejected

### Requirement: Atomic progression and ownership
Only an accepted terminal battle for the current run boundary SHALL advance the run. The first two victories SHALL offer exactly one claim each; the third SHALL end in victory without another reward. Party wipe SHALL end in defeat. Repeated or stale callbacks and reward activations SHALL leave progression and ownership unchanged.

#### Scenario: Duplicate or obsolete completion
- **WHEN** an outcome callback is delivered twice or after another encounter or new run starts
- **THEN** it cannot advance an encounter, change party HP or grant another reward

#### Scenario: Claim and prepare
- **WHEN** a valid reward is confirmed
- **THEN** ownership and progression commit together and the next encounter preparation appears
- **AND** invalid or stale claims leave all state and RNG unchanged

### Requirement: Bounded run continuation
The application SHALL save accepted player/enemy command boundaries and accepted run/item transitions in the existing bounded run format. Continue SHALL restore battle, preparation, pending reward and final outcome without replaying past animation/audio or granting duplicate rewards. Invalid data SHALL remain available for recovery/export or explicit removal.

#### Scenario: Reload during presentation
- **WHEN** the player reloads while an accepted player or enemy command is presenting and chooses Continue
- **THEN** the accepted boundary and next legal command/RNG are preserved without repeating that command or historical cues

#### Scenario: Reload around reward and outcome
- **WHEN** the player reloads before claim, after claim, during preparation or at final outcome
- **THEN** Continue restores the same phase, HP, ownership, equipment and pending choice exactly once

#### Scenario: Storage failure and cached return
- **WHEN** storage is corrupt, incompatible, unavailable or changed since review, or an old history entry returns
- **THEN** failures remain visible, damaged bytes are preserved, stale removals are refused and obsolete sessions cannot overwrite replacement saves

### Requirement: Fresh run lifecycle and responsive controls
Final victory and defeat SHALL offer Start new run with a fresh identity/seed, full party and empty ownership. Run transitions SHALL dispose obsolete battle presentation, inputs, dialogs and audio. Run controls SHALL support keyboard, mouse and touch, 44px targets, safe areas and portrait/landscape without board input passing through overlays.

#### Scenario: Fresh run after outcome
- **WHEN** Start new run is activated after victory or defeat, including repeated activation
- **THEN** exactly one fresh run starts and obsolete callbacks, commands and rewards cannot affect it

#### Scenario: Responsive boundary screens
- **WHEN** a player uses preparation, reward or outcome controls in portrait, short landscape or a narrow viewport
- **THEN** controls remain reachable with visible focus, dialogs capture input and no underlying battle action fires
