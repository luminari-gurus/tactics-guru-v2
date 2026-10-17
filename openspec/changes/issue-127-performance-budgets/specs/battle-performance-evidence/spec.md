# Spec Delta

## MODIFIED Requirements

### Requirement: Scene-specific loading evidence
The measurement tool SHALL support explicit proof, single-battle and authored-run captures, recording served build identity, route/scene, browser, viewport/DPR, host, network/cache conditions, per-request resource transfer and controls-usable time. It MUST reject mixed or dirty acceptance builds and report console/page errors and incomplete matrices.

#### Scenario: Cold and warm battle captures
- **WHEN** the operator captures the battle on a local or approved deployed origin
- **THEN** three cold/warm pairs per desktop, portrait and landscape profile are recorded with provenance and raw results
- **AND** proof remains the default compatible capture mode

#### Scenario: Authored run captures
- **WHEN** the same matrix is captured on the authored-run route
- **THEN** real Start new run and Start encounter controls reach the playable battle, with their automated interaction cost included in navigation-to-usable time
- **AND** legitimate hero-first starts do not fail a single-battle enemy-startup assertion

#### Scenario: Warm fresh-start isolation
- **WHEN** a warm fresh-start capture would otherwise stop at a saved-game prompt
- **THEN** only the collector-owned context's four v2 battle/run save slots are cleared before its same-context reload, preserving HTTP cache and legacy keys
- **AND** saved-resume timing is identified separately; the capture does not alter the user's browser storage or disable HTTP caching through request interception

#### Scenario: Invalid capture
- **WHEN** samples contain differing build identities, dirty acceptance builds, browser errors or fewer than the required 18 samples per route
- **THEN** the run reports failure and retains diagnostic evidence without asserting acceptance

### Requirement: Honest acceptance report
The QA report SHALL compare proof, battle and run evidence against unchanged applicable budgets, identify browser engines/profiles and distinguish retained evidence, fresh local measurements and deployed verification. Emulation SHALL satisfy device acceptance unless the caller explicitly requests physical testing. Missing checks and actual failures MUST remain explicit; no report may claim physical execution from emulation or passing failed budgets.

#### Scenario: Incomplete device gate
- **WHEN** emulated checks pass but a physical browser has no complete evidence
- **THEN** the report identifies the emulation and absence of physical execution
- **AND** only an explicit task-specific physical-testing request makes that absence an unmet acceptance gate

#### Scenario: Performance regression
- **WHEN** any measured budget fails
- **THEN** the raw failure is published and its remediation remains open in the linked performance follow-up without relaxing the budget

#### Scenario: Historical failure and a later passing run
- **WHEN** a later matrix passes after an earlier failure
- **THEN** both matrices and their conditions remain available, and an unreproduced outlier is not described as causally fixed without supporting evidence

#### Scenario: Retained evidence inspection
- **WHEN** an existing capture is inspected or reevaluated without collecting a new browser run
- **THEN** the report labels the result as retained-evidence analysis and does not describe it as fresh reproduction
