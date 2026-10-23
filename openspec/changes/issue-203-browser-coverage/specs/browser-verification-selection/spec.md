# Spec Delta

## Purpose

Select browser verification profiles according to the behavior under test while preserving auditable coverage of device-sensitive interactions and regression journeys.

## ADDED Requirements

### Requirement: Conservative canonical selection
Verification SHALL run explicitly reviewed device-independent cases on a canonical profile. Unclassified cases MUST retain their existing profiles and assertions.

#### Scenario: Canonical failure path
- **WHEN** a reviewed device-independent failure case is selected
- **THEN** desktop executes its complete assertions and the coverage map identifies each removed mobile execution and its retained desktop counterpart

#### Scenario: Unclassified interaction
- **WHEN** a case has no explicit selection classification
- **THEN** its existing profile selection remains unchanged

### Requirement: Equivalent viewport execution accounting
Verification SHALL remove an explicit-viewport execution only when a retained execution has equivalent engine, input capabilities, density and effective viewport for its assertions.

#### Scenario: Duplicate mobile viewport
- **WHEN** two mobile projects run the same case after setting the same viewport before navigation with otherwise identical configuration
- **THEN** one execution can be removed with its complete assertions mapped to the retained equivalent
- **AND** desktop and genuinely different input or engine coverage remain selected

### Requirement: Device-sensitive coverage preservation
Verification MUST retain touch/pointer, responsive orientation, keyboard/focus, audio permission, browser-specific persistence and representative complete journeys on their required profiles. Viewport resizing alone SHALL NOT substitute for engine or input capability coverage.

#### Scenario: Profile-sensitive coverage
- **WHEN** the canonical selection policy is applied
- **THEN** explicit WebKit acceptance and required device-sensitive journeys remain discoverable on their existing profiles

### Requirement: Exact selection and aggregation
Every reduced execution SHALL map to retained coverage. Discovery and full-verification batches MUST account for the new selected ID set exactly and reject unexplained omissions, extras or duplicates.

#### Scenario: Selection drift
- **WHEN** a selected ID disappears without an approved coverage mapping or a batch adds or duplicates an ID
- **THEN** the selection contract fails instead of reporting complete coverage

### Requirement: Comparable measurement and honest results
Before/after measurements SHALL record test counts, source/build identity, host/browser settings, setup and execution durations, failures, retries, skips and unexecuted coverage. Existing performance limits and failure reporting MUST remain intact.

#### Scenario: Reduced matrix qualification
- **WHEN** before and after selections are compared
- **THEN** affected original profiles, including landscape, have matched measurements and every incomplete or failed sample remains visible
- **AND** a focused passing run does not become a clean historical full-regression claim
