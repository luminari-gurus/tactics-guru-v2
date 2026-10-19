# Spec Delta

## Purpose

Provide reproducible biome-shaped battlefields whose terrain permits legal movement and combat, while supporting fixed authored encounters through the same admission boundary.

## ADDED Requirements

### Requirement: Explicit encounter battlefield source
Each encounter SHALL select exactly one generated or authored battlefield source. Generated sources SHALL declare biome and profile versions; authored sources SHALL reference a fixed map. Boss encounters SHALL support authored grids without procedural replacement or new boss-specific combat rules.

#### Scenario: Mixed run
- **WHEN** the configured three-encounter run starts its two generated desert encounters and its authored final encounter
- **THEN** each encounter uses its declared source and retains existing roster, carried HP, equipment and progression semantics
- **AND** the independent authored single-battle entry remains available

#### Scenario: Invalid source
- **WHEN** a source is ambiguous, missing, references an unknown map or requests an unsupported biome or profile
- **THEN** encounter admission fails before constructing a battle

### Requirement: Reproducible immutable generation
Generated battlefields SHALL be determined by encounter identity, layout seed and declared generator/profile versions. Repeated resolution SHALL produce identical cells, elevations and full spawn roster without consuming combat or reward RNG. Accepted terrain SHALL remain fixed throughout battle and continuation.

#### Scenario: Repeat and resume
- **WHEN** the same encounter descriptor is resolved repeatedly or after reload
- **THEN** its complete battlefield is identical and combat/reward RNG states are unchanged

### Requirement: Desert terrain profile
Initial generated grids SHALL be 12×12 with at least 80 percent of all cells as walkable elevation-zero sand, at most 10 percent blocked rock cells, and elevations limited to zero and one. Raised walkable terrain SHALL form connected patches of at least four cells. Deployment and protected approaches SHALL remain flat and open.

#### Scenario: Desert identity across seeds
- **WHEN** any candidate or fallback desert grid is admitted
- **THEN** its terrain satisfies the versioned desert bounds and has distinct readable sand and rock treatment
- **AND** no forest or water terrain is substituted to represent desert rocks or sand

### Requirement: Reversible terrain movement
Before admission, every walkable cell SHALL belong to one mutually reachable component under the minimum supported Move and Jump capabilities. Route edges SHALL obey cardinal adjacency, destination movement cost and uphill cost within one turn. Validation SHALL reject irreversible drops and walkable cells that cannot be entered within a turn budget.

#### Scenario: Connected image with unusable movement
- **WHEN** a candidate contains an isolated plateau, irreversible drop or terrain step whose cost exceeds the supported movement budget
- **THEN** it fails playability validation even if a walkable-only flood fill passes

### Requirement: Legal deployment and engagement
Admission SHALL check distinct legal spawns, deployment exits and reachable attack positions using actual range and LOS rules for every nonempty supported survivor subset. Every living unit SHALL have a terrain route to an attack position against an opponent with a supported damaging ability. Other units SHALL remain blockers for immediate command legality.

#### Scenario: Single wounded survivor
- **WHEN** only Fighter, Ranger or Mage survives with positive carried HP
- **THEN** admission verifies movement and engagement for that survivor without healing, reducing enemies or requiring a winning strategy

#### Scenario: Range and sight failure
- **WHEN** terrain permits movement but an actor has no reachable position satisfying any supported damaging ability's range and LOS against an opponent
- **THEN** the battlefield fails admission

### Requirement: Open generated approaches
Generated desert grids SHALL provide two internally vertex-disjoint terrain routes between designated player and enemy deployment gateways. Spawn cells SHALL each have at least two legal adjacent exits at admission before occupancy. Temporary unit congestion SHALL NOT be interpreted as permission to move through occupied cells.

#### Scenario: Bottleneck and spawn pocket
- **WHEN** a generated grid has a single mandatory passage between deployment gateways or a spawn with only one terrain exit
- **THEN** it fails the desert profile's approach checks

### Requirement: Bounded generation and safe fallback
Generation SHALL attempt at most four deterministic candidates and then select a fixed desert fallback satisfying the same generation and playability requirements. Failure of the fallback or authored validation SHALL return a controlled failure. Diagnostic identity SHALL expose the selected attempt or fallback and validation failures.

#### Scenario: Exhausted candidates
- **WHEN** all four candidates fail validation
- **THEN** resolution returns the validated desert fallback reproducibly without unbounded retries

#### Scenario: Invalid authored boss grid
- **WHEN** an authored boss grid violates common movement, deployment or engagement requirements
- **THEN** admission returns a structured error without replacing its authored terrain with generated content

### Requirement: Playability without outcome guarantees
Battlefield admission SHALL establish terrain movement and engagement opportunities without imposing round limits, guaranteeing player victory or requiring simulation of every possible battle state. Existing elimination outcomes and technical command limits SHALL remain unchanged.

#### Scenario: Wounded party defeat
- **WHEN** a playable generated encounter defeats a wounded party through legal combat
- **THEN** normal defeat and run progression rules apply and the loss alone does not invalidate the grid
