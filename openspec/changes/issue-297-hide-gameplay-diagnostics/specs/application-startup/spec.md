## Purpose

Keep ordinary startup and gameplay free of diagnostic controls while retaining visible loading, recovery and deliberately selected QA scenes.

## ADDED Requirements

### Requirement: Neutral startup before application execution
The initial document SHALL expose a neutral loading status while hiding proof tools, proof-specific restart wording and diagnostic landmarks before scripts or styles execute.

#### Scenario: Delayed startup on player routes
- **WHEN** the menu, a saved game mode or a dedicated battle/run/dungeon route loads while its application module is delayed
- **THEN** loading remains visible and proof tools and diagnostic landmarks are absent from the visible and accessible UI

### Requirement: Gameplay owners preserve diagnostic isolation
Ordinary battle, run, dungeon and Q*bert screens SHALL keep proof tools hidden through initialization, layout reparenting, accepted actions, reload and repeated encounters while preserving gameplay controls and player-facing landmarks.

#### Scenario: Dungeon battle re-entry
- **WHEN** a player starts a dungeon, legally completes an encounter and enters another
- **THEN** both battles have player-facing panel names and working action, restart, recovery and sound controls without proof tools

#### Scenario: Shared gameplay consumers
- **WHEN** standalone, run or Q*bert gameplay starts or resumes
- **THEN** its ordinary controls remain usable and proof controls remain hidden on desktop and touch layouts

### Requirement: Explicit diagnostics and recoverable failures remain reachable
Explicit proof/content-smoke scenes SHALL retain their established tools and status behavior. Application and engine import failures SHALL show visible recovery guidance. Existing scene precedence and Q*bert route semantics SHALL be preserved.

#### Scenario: Deliberate proof scene
- **WHEN** the first scene selector requests proof
- **THEN** fixture, opacity, diagnostic movement/audio and measurement controls work with diagnostic naming

#### Scenario: Content smoke and failure
- **WHEN** content smoke runs or a route/engine import fails
- **THEN** the relevant visible status reports readiness or recoverable failure without leaking proof controls into ordinary gameplay
