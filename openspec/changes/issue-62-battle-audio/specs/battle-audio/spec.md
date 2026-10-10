# Battle Audio Spec Delta

## Purpose

Give the playable battle concise audible feedback for committed actions while preserving player sound preferences, deterministic gameplay and safe browser lifecycle behavior.

## ADDED Requirements

### Requirement: Committed battle feedback

The battle SHALL derive bounded feedback cues from accepted event batches only. Movement, attack miss/hit/critical, magic-missile cast, unit defeat and victory/defeat SHALL have distinct cues. Audio SHALL NOT change legal commands, battle state, RNG consumption or the timing gate for command completion.

#### Scenario: Legal actions and all signatures

- **WHEN** an enabled, unlocked, visible battle commits movement, a basic attack, Guarded Strike, High Shot or Magic Missile
- **THEN** it offers the documented cues for those accepted events, with attack-result cues for basic/Guarded Strike/High Shot and one cast cue per Magic Missile action
- **AND** the command produces the same battle state and RNG result as it does with sound disabled

#### Scenario: Defeats and outcomes

- **WHEN** an accepted batch contains a unit defeat or ends the battle
- **THEN** it includes the respective unit-defeat or victory/defeat feedback within the bounded cue sequence

#### Scenario: Preview and rejected input

- **WHEN** the player previews, cancels or submits an invalid action
- **THEN** no committed-action cue plays

### Requirement: At-most-once presentation feedback

The battle SHALL consider each committed presentation batch for audio at most once per scene lifetime. Repeated rendering, callbacks or unlock events SHALL NOT play that batch again. A new battle SHALL have an independent batch identity lifetime.

#### Scenario: Duplicate and stale callbacks

- **WHEN** the same accepted batch is presented twice or its callback arrives after a newer batch or scene shutdown
- **THEN** no duplicate or stale cue plays

#### Scenario: Muted batch then enable

- **WHEN** an accepted batch is suppressed while muted or locked and the player later enables sound
- **THEN** the earlier batch remains consumed and only future eligible batches can produce sound

### Requirement: Accessible gesture-controlled sound

Sound SHALL start disabled on page load. A visible keyboard-, touch- and mouse-operable control SHALL expose sound preference and availability, and request unlock directly in the enabling gesture. Muting SHALL stop active cues immediately. In-page battle restarts SHALL preserve the preference; reload SHALL reset it to disabled.

#### Scenario: Explicit opt-in

- **WHEN** the player activates Enable sound using a real pointer or keyboard gesture
- **THEN** the browser unlock request starts in that gesture and the control reports enabled, blocked or unavailable without playing historical cues

#### Scenario: Mute and restart

- **WHEN** the player mutes during playback and restarts the battle
- **THEN** active playback stops, the new battle remains muted and no previous-battle cues play
- **AND** restarting while enabled retains the preference but still respects browser lock and visibility state

#### Scenario: Control layout and focus

- **WHEN** the player uses the sound control in portrait or landscape, including during an enemy presentation
- **THEN** its state is accessible, its target is usable and activation cannot reach the canvas or confirm an underlying action

### Requirement: Lifecycle suppression and cleanup

Audio SHALL stop or suppress playback when hidden, interrupted, muted or locked. Returning to visibility or unlocking SHALL discard stale cues and allow only future eligible events. Teardown SHALL release scene-owned sounds, listeners and timers, and invalidate pending asynchronous work without leaving gameplay input locked.

#### Scenario: Background during a cue sequence

- **WHEN** the page becomes hidden during playback and later returns
- **THEN** current and pending cues are discarded and no automatic backlog plays on resume
- **AND** the committed battle command is not repeated or delayed by audio

#### Scenario: Late unlock after restart

- **WHEN** an earlier unlock request settles after a timeout or scene restart
- **THEN** it cannot start playback or alter the replacement scene's controls

#### Scenario: Repeated restarts

- **WHEN** the player restarts at least five times across active, loading and interrupted audio states
- **THEN** each new scene has one set of active controls/listeners and no retained sound, timer or callback from earlier scenes

### Requirement: Nonfatal bounded audio failure

Audio loading and unlock attempts SHALL be bounded and SHALL NOT gate battle readiness. Missing, stalled, unsupported, undecodable or refused audio SHALL expose a nonfatal sound status while keeping battle controls usable. Promise rejection and late completion SHALL NOT enter the application's fatal error flow.

#### Scenario: Asset failure

- **WHEN** an optional cue file is missing, stalls or cannot decode
- **THEN** the failure resolves within the declared load deadline, reports sound unavailable and leaves the battle playable

#### Scenario: Unlock refusal or timeout

- **WHEN** the browser rejects unlock or never settles the request
- **THEN** the request ends in a bounded blocked state, permits another explicit gesture and never dispatches a gameplay command or stale cue

### Requirement: Bounded resources and honest acceptance evidence

The initial cue files SHALL total no more than 32 KiB. Audio SHALL introduce no runtime dependency or domain coupling. Validation SHALL retain comparable loading/transfer measurements and failures against unchanged agreed budgets, distinguish automated playback from audible device evidence, and keep unresolved physical-device and existing frame-budget gaps visible in #11.

#### Scenario: Budget comparison

- **WHEN** the audio change is measured against its main baseline on the same browser, host, cache and workload conditions
- **THEN** raw evidence identifies the served/build revisions, cue bytes and code/loading deltas, preserves failed samples, and does not loosen a budget to report success

#### Scenario: Incomplete hardware matrix

- **WHEN** automated tests pass but a supported physical browser/orientation has not been checked
- **THEN** that row remains unverified in the audio QA handoff and is not represented as first-battle acceptance
