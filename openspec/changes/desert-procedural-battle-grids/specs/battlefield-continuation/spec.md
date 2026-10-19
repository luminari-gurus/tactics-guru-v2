# Spec Delta

## Purpose

Keep generated and authored encounters identical across creation, accepted-command records and local continuation without changing terrain or replaying committed effects.

## ADDED Requirements

### Requirement: Canonical battlefield identity
Generated encounter records SHALL identify the encounter, layout seed, biome, generator/profile versions and canonical full-map hash. Authored records SHALL identify the encounter, authored map and canonical full-map hash. Resolution SHALL verify source identity before survivor filtering and battle-state validation.

#### Scenario: Identity mismatch
- **WHEN** a descriptor has a changed seed, map hash, source kind or encounter reference relative to its trusted run boundary
- **THEN** creation or restoration fails without adopting a different battlefield

### Requirement: Exact save reconstruction
Run saves SHALL contain sufficient bounded descriptor data to reconstruct and validate the active battlefield before hydrating battle state. Continue SHALL preserve terrain, living roster, carried HP, equipment, accepted state, active actor and next command/RNG result without generating new layout choices.

#### Scenario: Continue during enemy detour
- **WHEN** a run reloads after an accepted detour move or attack during presentation
- **THEN** Continue restores identical terrain and accepted state and produces the uninterrupted continuation's remaining enemy commands, events and RNG
- **AND** historical animation, audio and rewards are not repeated

#### Scenario: Return to preparation
- **WHEN** a run reloads in preparation before entering a generated encounter
- **THEN** entering that encounter resolves the same descriptor and battlefield as uninterrupted execution

### Requirement: Replay uses the same battlefield
Fresh generated and authored encounter records SHALL include sufficient battlefield identity to reconstruct their canonical run entry before replaying accepted commands. Replays SHALL reject altered starts and produce identical final state and events. Resumed sessions SHALL retain the existing distinction between full replay and continuation records.

#### Scenario: Reproduce a generated battle
- **WHEN** accepted commands are replayed using the recorded compatible descriptor and validated run entry
- **THEN** battlefield, resulting state, command-generated events and next RNG match live execution

### Requirement: Explicit compatibility and recovery
Unsupported descriptor versions, incompatible run-save identities and reconstructed hash mismatches SHALL fail explicitly. Existing incompatible or corrupt bytes SHALL remain recoverable/exportable under the current recovery controls. Restore SHALL NOT upgrade a seed to the current generator, replace a map, or reset the run automatically.

#### Scenario: Prior run save
- **WHEN** a pre-change run save or unsupported generator version is offered to Continue
- **THEN** the application reports incompatibility and preserves original saved bytes until an existing explicit recovery/removal action is accepted

#### Scenario: Authored map changes
- **WHEN** a saved authored boss encounter references content with a different canonical map hash
- **THEN** Continue rejects it explicitly rather than placing saved units onto changed terrain

### Requirement: Isolated independent battle persistence
Generated run saves SHALL remain isolated from the independent authored single-battle storage. Compatibility checks SHALL identify actual rules/content changes explicitly and preserve failed saves. Encounter resolution SHALL NOT mutate the shared base catalog or alter another active battlefield.

#### Scenario: Independent entries
- **WHEN** a player starts or resumes a generated run and returns to the authored single battle
- **THEN** run data has not overwritten the independent battle save and its existing recovery/continuation behavior remains available

### Requirement: Production board admission
Only validated resolved battlefields SHALL reach the production renderer. Generated desert and authored boss sources SHALL support asset loading, picking, highlights and accepted movement across portrait and landscape views. Invalid content or asset failures SHALL use controlled errors before a playable session is exposed.

#### Scenario: Generated grid in browser
- **WHEN** a desert encounter is resized, panned, zoomed, selected and moved through production controls and then resumed
- **THEN** displayed cells, overlays, units and selected coordinates agree with the same resolved battlefield without page errors
