# Spec Delta

## Purpose

Provide reproducible loading, frame and interaction evidence for the authored battle without confusing automated browser measurements with physical-device acceptance.

## ADDED Requirements

### Requirement: Scene-specific loading evidence
The measurement tool SHALL support explicit proof and battle captures, recording served build identity, scene, browser, viewport/DPR, network/cache conditions, resource transfer and controls-usable time. It MUST reject mixed builds and report console/page errors.

#### Scenario: Cold and warm battle captures
- **WHEN** the operator captures the battle on a local or approved deployed origin
- **THEN** three cold/warm pairs per desktop, portrait and landscape profile are recorded with provenance and raw results
- **AND** proof remains the default compatible capture mode

#### Scenario: Invalid capture
- **WHEN** samples contain differing build identities or browser errors
- **THEN** the run reports failure and retains diagnostic evidence without asserting acceptance

### Requirement: Bounded workload measurements
Battle diagnostics SHALL expose bounded visible frame samples and input-to-visible timing for selection and pan. Workload and idle samples MUST be distinguishable; hidden time and disposed scenes MUST NOT contaminate subsequent samples or alter combat decisions.

#### Scenario: Battle interaction workload
- **WHEN** the tester selects a cell, pans, zooms and confirms a legal move through real controls
- **THEN** timestamped interaction and frame evidence identifies the actions, sample counts and visible response

#### Scenario: Suspension and restart
- **WHEN** a capture is interrupted by hiding or restarting the scene
- **THEN** hidden intervals are excluded and stale listeners cannot add samples to the fresh run

### Requirement: Honest acceptance report
The QA report SHALL compare battle measurements with the documented proof baseline and budgets, and record physical win/loss/restart and interaction checks for iPhone Safari, iPhone Chrome, Android Chrome and desktop in both orientations. Missing hardware, audio, console or deployed evidence MUST remain explicitly unverified.

#### Scenario: Incomplete device gate
- **WHEN** emulated checks pass but a required physical browser has no complete evidence
- **THEN** the corresponding gate remains open and no issue completion is claimed

#### Scenario: Performance regression
- **WHEN** any measured budget fails
- **THEN** the raw failure is published and the regression is fixed within approved scope or explicitly left blocked

### Requirement: Approved delivery boundaries
Evidence collection SHALL use the separately approved existing release path without weakening production Access or depending on unmerged deployment work. The report MUST list all deferred issue scope.

#### Scenario: Release unavailable
- **WHEN** the approved origin cannot provide the intended authenticated build
- **THEN** local evidence is retained with the deployed gate unverified and no alternate deployment mechanism is introduced
