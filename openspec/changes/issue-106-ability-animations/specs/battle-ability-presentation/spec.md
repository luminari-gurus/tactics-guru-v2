# Spec Delta

## Purpose

Help players recognize signature abilities and follow their actors, targets and resolved outcomes without changing battle decisions or deterministic state.

## ADDED Requirements

### Requirement: Distinct signature effects
Confirmed Guarded Strike, High Shot and Magic Missile actions SHALL have distinct, bounded animations connecting the acting unit to the resolved target through normal battle controls. Guarded Strike SHALL include a defensive cue on the fighter when guard activates.

#### Scenario: Fighter signature
- **WHEN** Guarded Strike is accepted
- **THEN** a directed melee effect identifies its target and a separate guard cue identifies the fighter, including when the attack misses

#### Scenario: Ranger signature
- **WHEN** High Shot is accepted
- **THEN** a recognizable ranged shot travels from the ranger toward the resolved target

#### Scenario: Mage signature
- **WHEN** Magic Missile is accepted
- **THEN** a distinct magical projectile travels from the mage to its resolved target and presents the resolved impact

### Requirement: Faithful outcome feedback
Ability effects SHALL display hit, miss, critical hit, damage, guard activation and defeat only where supported by resolved events. Target feedback SHALL identify the affected target, and guard feedback SHALL identify the acting fighter. Magic Missile SHALL retain automatic-hit behavior without fabricated attack rolls or misses.

#### Scenario: Attack misses
- **WHEN** a signature attack resolves as a miss
- **THEN** the target receives readable miss feedback without a damage or defeat effect, and any separately resolved guard activation is still shown

#### Scenario: Damage defeats a target
- **WHEN** a signature produces damage followed by a defeat event
- **THEN** the impact identifies that target and exact damage, defeat feedback appears without overlapping labels hiding the result, and the final view matches the committed snapshot

#### Scenario: Magic Missile damage
- **WHEN** the magic projectile reaches the target
- **THEN** its impact reflects the resolved damage events without rolling or inferring another result

### Requirement: Effects preserve accepted state
Ability presentation SHALL leave HP, action economy, RNG, accepted command count and persistence boundaries unchanged from the resolved result. Preview cancellation and rejected commands SHALL create no ability effects. Gameplay input SHALL remain gated through the effect and return to the correct decision or outcome phase afterward.

#### Scenario: Repeated confirmation during an effect
- **WHEN** the player repeatedly activates controls during a signature animation
- **THEN** exactly the accepted command is recorded, no additional effect or save boundary is created, and normal controls recover after completion

#### Scenario: Preview is cancelled
- **WHEN** a signature preview is cancelled before confirmation
- **THEN** no projectile, strike or guard effect runs and battle state and RNG remain unchanged

### Requirement: Safe effect termination
Completion, cancellation, suspension and scene teardown SHALL remove temporary effects and terminate presentation without stale callbacks, duplicate commands or stuck controls. Returning from browser history or continuing a saved battle SHALL rebuild the committed state without replaying historical effects.

#### Scenario: Suspend during a signature
- **WHEN** the document becomes hidden during an ability effect and later becomes visible
- **THEN** temporary effects are cleared, the accepted command remains applied once, and the appropriate next phase resumes without replaying the effect

#### Scenario: Restart or shutdown during a signature
- **WHEN** the scene shuts down or the player confirms a restart during an ability effect
- **THEN** its pending work cannot touch destroyed objects or the replacement session, and subsequent controls remain usable

#### Scenario: Repeated cancellation
- **WHEN** completion and cancellation paths overlap or cancellation is requested repeatedly
- **THEN** cleanup and presentation completion have no additional gameplay or visual side effects

#### Scenario: Browser history and saved continuation
- **WHEN** the browser returns to a cached battle page or the player continues an accepted save
- **THEN** current-save startup behavior is preserved, old effects are absent, and no old callback changes current saves

### Requirement: Spatially readable effects
Signature effects and labels SHALL remain attached to their actors and targets under board pan, zoom, elevation and viewport changes. The three abilities and their outcomes SHALL be distinguishable in desktop, mobile portrait and mobile landscape views through shape, motion and readable feedback rather than color alone.

#### Scenario: Transformed board
- **WHEN** an ability is presented on a panned or zoomed board, including a view change during the effect
- **THEN** its endpoints and feedback follow the corresponding units without screen-space drift

#### Scenario: Responsive and repeated presentation
- **WHEN** the abilities are used repeatedly in portrait and landscape
- **THEN** their actor, target and result remain readable and no temporary effects accumulate after completion
