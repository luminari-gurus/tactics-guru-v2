# Spec Delta

## Purpose

Provide a complete, deterministic authored battle that connects player decisions, enemy turns, event presentation and reproducible replay records.

## ADDED Requirements

### Requirement: Complete battle actions
The battle SHALL offer the fixed Fighter/Ranger/Mage party legal movement, basic attacks, their catalog signatures and Wait/end-turn, with automatic legal enemy turns and terminal victory/defeat.

#### Scenario: Play a complete battle
- **WHEN** a player makes legal choices from a fresh authored battle
- **THEN** both sides take turns until a domain-decided victory or defeat, and terminal battles accept no further gameplay commands

#### Scenario: Hero signatures
- **WHEN** each hero uses its catalog signature on a legal target
- **THEN** the existing rules determine costs, hit/damage and status expiry without UI-specific rule changes

### Requirement: Reproducible accepted-command record
The battle SHALL retain its initial seeded snapshot, version identities and accepted commands in memory, sufficient to reproduce the final state and resolved event sequence. Rejected and cancelled intents SHALL NOT enter that record or advance RNG.

#### Scenario: Replay a completed session
- **WHEN** the accepted player and enemy commands are replayed from the initial boundary
- **THEN** the resulting state and command-generated events match the live session

### Requirement: Resolution precedes presentation
The battle SHALL present resolved movement and combat events while gameplay input is locked. Presentation speed, suspension and cancellation SHALL NOT change resolved rules, consume extra commands or choose turns.

#### Scenario: Input during enemy presentation
- **WHEN** a player repeatedly taps or confirms while enemy events animate
- **THEN** no player command is accepted, and presentation finishes before another player decision is enabled

#### Scenario: Rejected enemy command
- **WHEN** enemy execution rejects after an accepted prefix
- **THEN** the accepted state and record are retained and a visible error stops automatic retries

### Requirement: Fresh restart lifecycle
Restart SHALL create a fresh seeded battle, clear selection/previews/logs/replay records, and cancel old presentation callbacks and bindings.

#### Scenario: Restart during presentation
- **WHEN** the player restarts during an animation or an outcome dialog
- **THEN** the new battle has fresh state and no old callback, dialog or input listener can affect it
