# battle-frame-performance Specification

## Purpose

Provide responsive authored-battle rendering within the agreed frame and loading budgets, supported by comparable measurements without changing deterministic combat behavior.

## Requirements

### Requirement: Idle frame budget
The visible, usable battle SHALL meet idle frame interval p50 ≤16.7 ms and p95 ≤20 ms on each required deployed automated profile, using nearest-rank percentiles and retained raw evidence.

#### Scenario: Deployed idle samples
- **WHEN** a clean approved deployed build is captured in desktop, portrait and landscape profiles using three cold/warm pairs per profile
- **THEN** each usable idle sample meets both F1 limits and records intervals, count, served build and errors
- **AND** a failed or incomplete sample remains an unmet acceptance gate

### Requirement: Interaction frame budget
Legal pan, zoom and movement workloads SHALL each meet frame interval p95 ≤33.4 ms. Selection and pan MUST produce visible changes by the next rendered frame, with engine timing distinguished from physical input and display latency.

#### Scenario: Actual-control workload
- **WHEN** the tester pans, zooms, selects and confirms a legal move through actual controls
- **THEN** separated workloads retain raw intervals and counts, every F2 window meets the limit and selection/pan response reaches the next rendered frame
- **AND** no combat state or outcome is injected to manufacture the workload

### Requirement: Comparable performance evidence
Proof and battle comparisons SHALL use the same served build, browser, host, network/cache protocol and frame observation point. Reports MUST distinguish measurement corrections, host scheduling and application costs, retaining historical failures without claiming a causal speedup from unmatched captures.

#### Scenario: Measurement method changes
- **WHEN** observation or workload isolation changes
- **THEN** paired baseline and candidate captures identify the method and build separately and preserve the old results
- **AND** host or sampling effects alone do not establish an application fix

### Requirement: Preserved battle behavior and loading budgets
Performance changes MUST preserve state, RNG, accepted-command replay, picking, modal capture and lifecycle/restart behavior. Deployed usable loading MUST remain ≤2500 ms cold; cold compressed code MUST remain ≤400000 bytes and scene assets ≤1500000 bytes.

#### Scenario: Optimized battle run
- **WHEN** the same seed and legal commands run before and after a focused performance change
- **THEN** state, events and RNG results agree and actual-control regression checks pass
- **AND** each deployed sample retains loading and resource evidence meeting all four limits

### Requirement: Honest delivery acceptance
Evidence SHALL use only the existing approved release path. Missing release access, failed budgets or unavailable checks MUST remain explicit; automated evidence MUST NOT certify physical devices, complete other issues or authorize deployment configuration changes.

#### Scenario: Acceptance remains incomplete
- **WHEN** a deployed gate fails or the approved release cannot serve the intended build
- **THEN** retained evidence states the gap and delivery remains a draft referencing issue #65 without closing it
- **AND** physical acceptance remains under #64 and Safari restart remediation under #66


### Requirement: Loading warnings and history

Loads above 1000 ms MUST produce warnings with raw timings. Warm loading MUST NOT have a fixed pass/fail time limit. Comparable repeated loads MUST be reviewed for sustained slowdown; isolated spikes SHALL remain historical information. Original captures and evaluations MUST remain unchanged.

#### Scenario: Isolated slow warm load
- **WHEN** one warm load exceeds 1000 ms and subsequent comparable loads return below that threshold
- **THEN** the report records the warning and raw timings as history without a warm-loading budget failure

#### Scenario: Repeated slow loading
- **WHEN** a majority of three loads on the same route, device profile, cache and network conditions exceed 1000 ms
- **THEN** the report flags the repeated slowdown for review and retains every sample without imposing a new warm-loading hard gate
