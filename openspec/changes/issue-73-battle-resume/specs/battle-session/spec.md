# Spec Delta

## MODIFIED Requirements

### Requirement: Reproducible accepted-command record
A fresh battle SHALL retain its initial seeded snapshot, version identities and accepted commands in memory, sufficient to reproduce final state and events. A resumed battle SHALL identify its restored boundary and retain subsequent accepted commands/events without claiming pre-save history or exposing a mid-battle snapshot as a complete replay. Rejected and cancelled intents SHALL NOT enter either record or advance RNG.

#### Scenario: Replay a completed session
- **WHEN** the accepted player and enemy commands of a fresh session are replayed from the initial boundary
- **THEN** the resulting state and command-generated events match the live session

#### Scenario: Inspect a resumed session
- **WHEN** diagnostics are read after Continue and further accepted commands
- **THEN** they distinguish snapshot-based continuation from complete replay, preserve the restored boundary and subsequent record, and report full replay as unavailable

### Requirement: Fresh restart lifecycle
Successful restart SHALL create a fresh battle using the next seed, clear selection/previews/logs/replay records, and cancel old presentation callbacks and bindings. Persistent battle replacement MUST first confirm old-save invalidation; failed invalidation SHALL retain the current session and seed with visible recovery/retry controls rather than reporting restart success.

#### Scenario: Restart during presentation
- **WHEN** the player restarts during an animation or an outcome dialog and old-save invalidation succeeds
- **THEN** the new battle has fresh state and no old callback, dialog or input listener can affect it

#### Scenario: Restart cannot invalidate storage
- **WHEN** removal, reinspection or a changed saved value prevents confirming invalidation
- **THEN** no replacement session is committed, the current battle remains available, and its seed is not advanced

#### Scenario: Restart after Continue
- **WHEN** a resumed battle successfully restarts
- **THEN** the new seed is the resumed seed plus one modulo 2 to the power 32, and the fresh session again has a complete seeded replay record
