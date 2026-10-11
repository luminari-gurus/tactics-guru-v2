# Spec Delta

## Purpose

Provide a bounded, versioned representation of an accepted battle boundary that a later persistence adapter can validate and reconstruct without changing deterministic gameplay.

## ADDED Requirements

### Requirement: One representation is selected from reproducible evidence
The save contract SHALL select one representation after comparing snapshot and accepted-command replay on identical pinned fixtures. Evidence SHALL include payload size, encode/decode/reconstruction costs, host/runtime conditions and the supported maximum command count. Host timings MUST NOT be presented as mobile-device guarantees.

#### Scenario: Normal and maximum-bound comparison
- **WHEN** both candidates are measured against normal authored battles and the supported 10,000-command fixture
- **THEN** the retained report identifies the conditions, raw results, selected representation and rationale, and only the selected runtime codec remains

### Requirement: Envelope identity and compatibility are explicit
The envelope SHALL define its identity, independent save-format version, rules/content/RNG versions, exact payload shape, canonical digest coverage and finite limits. The digest SHALL detect accidental corruption without claiming authenticity. Future or incompatible versions MUST be rejected explicitly.

#### Scenario: Compatible envelope
- **WHEN** an envelope has the supported format and matching rules/content/RNG identities
- **THEN** it proceeds to bounded integrity and domain validation using the documented canonical representation

#### Scenario: Incompatible or corrupt envelope
- **WHEN** a version is future/incompatible or covered content no longer matches its digest
- **THEN** decoding returns an explicit failure without guessing a migration or exposing a restored state

### Requirement: Untrusted input is bounded and fully validated
The decoder SHALL enforce a documented finite serialized-text limit before parsing and collection/domain bounds before expensive reconstruction. It SHALL reject malformed data, unsafe numbers, unknown IDs and invariant violations. Replay payloads MUST pass semantic command execution, not only structural checks.

#### Scenario: Oversized or malformed input
- **WHEN** input exceeds the text limit or fails supported JSON/envelope/payload constraints
- **THEN** decoding returns a bounded failure and no restored state

#### Scenario: Structurally valid illegal replay
- **WHEN** a replay contains correctly shaped commands that are illegal at their recorded boundary
- **THEN** decoding rejects the replay instead of trusting command shapes or its digest

### Requirement: Accepted boundaries preserve deterministic continuation
Round-tripping an accepted player or enemy command boundary SHALL preserve state, next legal command result, next RNG output/cursor and enemy decisions. Pending previews, presentation phase and browser/audio/render objects MUST NOT be serialized. Ended battles SHALL retain their outcome without creating a new legal action.

#### Scenario: Command committed during presentation
- **WHEN** a boundary is captured after a command is accepted while presentation is still in progress
- **THEN** reconstruction yields the committed state and continuation without replaying transient animation/audio or consuming additional RNG

#### Scenario: Ongoing and ended boundaries
- **WHEN** empty, mid-battle, maximum-bound, victory and defeat fixtures are round-tripped
- **THEN** each retains its valid outcome, state and continuation semantics, including rejection of further actions when the battle has ended or exhausted its command limit

### Requirement: Decode failures preserve caller data
Encoding and decoding SHALL be pure and non-mutating. Failures MUST leave original serialized text, caller state and catalog available to the caller without deletion, replacement or persistent side effects.

#### Scenario: Corruption with frozen inputs
- **WHEN** decoding a corrupted or incompatible envelope with frozen input fixtures
- **THEN** it fails explicitly and all original inputs remain unchanged

### Requirement: Contract validation does not imply live persistence
This capability SHALL remain independent of browser storage and live UI/session hydration. Its delivery report SHALL identify backup/write recovery, storage failures, restart invalidation, recovery controls and browser/device lifecycle acceptance as remaining parent work.

#### Scenario: Pure codec verification succeeds
- **WHEN** all pure-contract fixtures and configured regression checks pass
- **THEN** the report claims the contract result only and keeps live save/resume and physical-device acceptance under #58
