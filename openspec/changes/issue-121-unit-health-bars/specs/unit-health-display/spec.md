# Spec Delta

## Purpose

Let players assess every living battle unit's health directly on the board through readable, proportional indicators that follow presentation and navigation.

## ADDED Requirements

### Requirement: Visible proportional health
Every living hero and enemy SHALL display a shallow curved health bar beneath its sprite, including at full health. A contrasting dark track and proportional fill SHALL communicate health independently of color. The ratio SHALL use displayed authoritative HP and catalog maximum HP, clamped to zero through one; fill SHALL be red at or below 25%, yellow above 25% through 50%, and green above 50%. Numeric HUD HP SHALL remain available.

#### Scenario: Health boundaries
- **WHEN** a unit displays 100%, 51%, 50%, 26%, 25% or positive health below 25%
- **THEN** its fill follows the stated proportions and thresholds against the full dark track

#### Scenario: Clamped ratios
- **WHEN** an indicator is given a ratio outside zero through one
- **THEN** its fill remains within the track and zero health shows no living-unit bar

### Requirement: Attached readable navigation
Health bars SHALL follow their units through movement, elevation, camera pan, zoom, orientation and resize with correct draw order. They SHALL remain readable on desktop and iPhone/Android-sized portrait and landscape viewports while preserving sprite, active/selection marker and combat-feedback readability.

#### Scenario: Elevated movement and camera navigation
- **WHEN** a unit traverses differing elevations while the board is navigated or resized
- **THEN** its bar follows the same projected position without detaching or obscuring the unit and feedback

### Requirement: Presentation and lifecycle consistency
Health bars SHALL use the displayed combat boundary, update together with its completion or cancellation, and hide consistently with defeated units. Restart, save/resume and run encounter changes SHALL reconstruct current health without stale bars or orphaned graphics. Graphics allocation SHALL remain bounded by rendered units.

#### Scenario: Damage and defeat
- **WHEN** damage resolves and its combat presentation completes or is cancelled by suspension
- **THEN** the bar adopts the resulting HP with the displayed unit and disappears if that unit is defeated

#### Scenario: Restored or replaced battle
- **WHEN** a battle restarts, resumes or enters another encounter, including after supported between-battle healing
- **THEN** each living unit shows its current health and no previous battle's bar or callback remains

### Requirement: Informational input behavior
Health bars SHALL NOT intercept pointer, touch or keyboard input, change commands or RNG, or alter existing board selection, drag and pinch behavior.

#### Scenario: Input through bar area
- **WHEN** a player taps, drags or pinches over a health bar or navigates with the keyboard
- **THEN** existing board and modal input rules apply without duplicate selection or commands
