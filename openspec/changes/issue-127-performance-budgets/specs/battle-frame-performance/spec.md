# Spec Delta

## MODIFIED Requirements

### Requirement: Idle frame budget
Visible, usable single-battle and authored-run battles SHALL meet idle frame interval p50 <=16.7 ms and p95 <=20 ms on each required deployed automated profile, using nearest-rank percentiles and retained raw evidence. Only floating arithmetic noise below 1e-6 ms may be ignored.

#### Scenario: Deployed idle samples
- **WHEN** a clean approved deployed build is captured on each route in desktop, portrait and landscape profiles using three cold/warm pairs per profile
- **THEN** each usable idle sample meets both F1 limits and records intervals, count, served build and errors
- **AND** a failed or incomplete sample remains an unmet acceptance gate

#### Scenario: Run idle outlier
- **WHEN** a run sample has an idle median of 16.799999952316284 ms
- **THEN** it fails the 16.7 ms limit and remains in the report without rounding, filtering or retry replacement

### Requirement: Preserved battle behavior and loading budgets
Performance changes MUST preserve state, RNG, accepted-command replay, picking, modal capture, audio, persistence and lifecycle/restart behavior on both battle and run routes. Deployed usable loading MUST remain <=2500 ms cold and <=750 ms warm; cold code transfer MUST remain <=400000 bytes and scene assets <=1500000 bytes, using the retained transfer accounting including response overhead.

#### Scenario: Optimized battle run
- **WHEN** the same seed and legal commands run before and after a focused performance change
- **THEN** state, events and RNG results agree and actual-control regression checks pass
- **AND** each deployed sample retains loading and resource evidence meeting all four limits

#### Scenario: Optimized authored run
- **WHEN** the player starts or resumes an authored run, completes three encounters and rewards, or restarts after victory/defeat
- **THEN** required controls, saves, recovery, audio and encounter transitions remain available and deterministic
- **AND** the run cold/warm capture matrix meets the same loading, transfer, idle and interaction budgets

#### Scenario: Code transfer accounting
- **WHEN** a cold sample is evaluated
- **THEN** navigation plus JavaScript, CSS and HTML resource transfer sizes are counted as code, including response overhead
- **AND** scene-resource totals and deferred requests are reported separately; moving required code into another chunk does not remove it from accounting

### Requirement: Honest delivery acceptance
Evidence SHALL use only the existing approved release path. Missing release access, failed budgets or unavailable checks MUST remain explicit; automated evidence MUST NOT certify physical devices, complete other issues or authorize deployment configuration changes. Emulation is sufficient unless physical testing is explicitly requested for the task.

#### Scenario: Acceptance remains incomplete
- **WHEN** a deployed gate fails or the approved release cannot serve the intended build
- **THEN** retained evidence states the gap and completed focused chunks are published ready for review, as explicitly requested by the caller, referencing issue #127 without closing it
- **AND** #57, #64 and #81 retain their own acceptance decisions; unavailable physical hardware alone is not a gate under the standing device policy

#### Scenario: Local optimization verification
- **WHEN** a locally served candidate meets all functional and measurement checks
- **THEN** its results remain local proof until the exact candidate is verified on an approved deployed origin
- **AND** publication of source or a plan does not authorize deployment, production activation or closure of parent issues
