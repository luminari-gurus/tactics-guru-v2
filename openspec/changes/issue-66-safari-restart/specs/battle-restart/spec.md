# Spec Delta

## Purpose

Define observable battle restart correctness and the evidence needed to assess intermittent Safari failures without confusing automated success with physical-device acceptance.

## ADDED Requirements

### Requirement: Legal outcome restart reaches one fresh playable battle
Restart from a legally reached victory or defeat SHALL create exactly one fresh seeded battle, restore usable controls, and retain exactly one game canvas. Old dialog, command, presentation, audio and input activity MUST NOT affect the new battle.

#### Scenario: Repeated legal outcome restarts
- **WHEN** a player repeatedly completes a legal victory or defeat and activates the outcome dialog's restart control
- **THEN** each accepted restart advances the established seed sequence once, reaches fresh player readiness, removes the old dialog, and leaves one canvas with no stale action or error

#### Scenario: Restart around lifecycle interruption
- **WHEN** the player restarts after returning from a background/foreground interruption or during a pending presentation
- **THEN** the fresh battle is unaffected by obsolete callbacks, listeners, commands or queued sound from the previous run

### Requirement: Reproduced failures retain diagnostic context
Investigation evidence SHALL preserve the original error/stack where available, exact served build, device/browser, orientation and lifecycle/gesture conditions before retrying. Unknown fields MUST be explicit. Evidence capture MUST remain bounded and MUST NOT require remote telemetry or permanent storage.

#### Scenario: Generic error hides a restart exception
- **WHEN** a restart fails and the player-facing message omits the underlying exception
- **THEN** the investigation retains the cause through browser capture or bounded inspectable diagnostics together with build/run context, without replacing it with a later successful retry

### Requirement: Repairs require demonstrated causal evidence
A claimed lifecycle repair SHALL have a failing-before/passing-after regression reproducing its cause through the relevant restart path. It MUST preserve legal command execution, deterministic state/RNG/replay and existing seed behavior.

#### Scenario: Confirmed teardown defect
- **WHEN** investigation demonstrates that a callback uses obsolete scene resources during restart
- **THEN** the regression fails before the focused correction and passes afterward, and fresh-run behavior and replay remain valid

#### Scenario: Similar change exists on another branch
- **WHEN** a separate PR contains a restart guard for a different renderer regression
- **THEN** that change is comparison evidence and is not declared the cause or fix for the Safari report without demonstrating equivalence

### Requirement: Physical acceptance and unresolved disposition are explicit
Safari acceptance SHALL include repeated legal victory and defeat restarts on physical iPhone Safari in both orientations, recording attempt counts, readiness, single-canvas behavior, stale effects and browser errors. Emulation MUST remain supporting evidence. Unreproduced or unavailable checks SHALL remain explicit and open unless the owner accepts a narrower disposition.

#### Scenario: Physical verification completes
- **WHEN** repeated legal restarts are verified on the physical candidate build
- **THEN** evidence identifies tester/date, device/OS/browser, URL/served commit, orientation, conditions, attempts and results, including failures

#### Scenario: Emulation passes but hardware evidence is missing
- **WHEN** automated tests pass and the original intermittent physical failure is not reproduced or hardware access is unavailable
- **THEN** the report preserves the original failure and successful retry, states the limitation and does not claim the physical acceptance criterion is complete
