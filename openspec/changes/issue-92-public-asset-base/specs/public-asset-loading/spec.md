# Public asset loading

## Purpose

Allow battle and diagnostic scenes to load their public resources at the configured application base without changing canonical content or saved battles.

## ADDED Requirements

### Requirement: Base-relative public resources

The application SHALL load scene images, DOM portraits and audio beneath its configured base in development and production preview. Direct navigation and refresh SHALL reach the existing ready state at both `/` and `/prototype/`.

#### Scenario: Scene entry and refresh

- **WHEN** battle, proof or content-smoke is opened directly or refreshed under either supported base
- **THEN** images load beneath that base and the existing scene becomes ready
- **AND** battle Continue remains reachable after refresh

#### Scenario: Portraits and sound

- **WHEN** the player opens battle or proof and activates sound using a real gesture
- **THEN** portraits decode and the prefixed audio files supply playback through the existing audio consumers

### Requirement: Stable content and failure contracts

Address resolution SHALL preserve canonical catalog paths, provenance, content/rules/RNG/save identities and battle outcomes. Existing controlled image failures and bounded nonfatal audio failures SHALL remain effective beneath the configured base.

#### Scenario: Same battle at different bases

- **WHEN** the same seed and accepted commands run at root and under a prefix
- **THEN** their canonical content and battle state are identical

#### Scenario: Unavailable resources

- **WHEN** a required image is missing, corrupt or stalled beneath the prefix
- **THEN** loading reports its controlled failure without presenting a usable scene
- **AND** missing, corrupt or stalled optional battle audio leaves battle controls usable with sound unavailable
