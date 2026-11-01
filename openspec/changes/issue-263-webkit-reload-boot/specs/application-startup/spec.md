# Spec Delta

## Purpose

Provide reliable route initialization and saved continuation after page reload,
with recoverable failures and preserved device-local player progress.

## ADDED Requirements

### Requirement: Reload reaches usable dungeon startup
The application SHALL finish route initialization and enable valid saved-dungeon continuation after reload on desktop, portrait and landscape WebKit. Readiness SHALL reflect completed initialization, and the fix SHALL address the identified cause rather than conceal failures through automatic retries or longer test waits.

#### Scenario: Repeated stair journey reload
- **WHEN** a dungeon is saved during stair traversal and the page reloads
- **THEN** dungeon startup becomes usable, Continue restores the saved state, and descent/ascent still occurs exactly once per accepted entry

#### Scenario: All supported input profiles
- **WHEN** the stair journey uses arrows, WASD, compass or cell input on each WebKit profile
- **THEN** reload reaches the same usable continuation boundary without a persistent Loading shell

### Requirement: Startup repair preserves recovery and progress
Startup and its diagnostics SHALL preserve existing save bytes and recovery actions, deterministic state/RNG, route/base-path behavior and telemetry opt-out. Failure evidence SHALL be bounded and exclude secrets and player save payloads.

#### Scenario: Interrupted initialization
- **WHEN** an application module or initialization step fails
- **THEN** the existing applicable recovery behavior remains available and saved progress is retained rather than reset or overwritten

#### Scenario: Diagnosing the failed boundary
- **WHEN** a reload fails during verification
- **THEN** retained evidence distinguishes the last completed startup boundary and relevant sanitized request/error information without enabling dungeon telemetry collection

### Requirement: Causal and complete acceptance evidence
The repair SHALL have an evidenced cause and a regression witness. Acceptance SHALL include a complete final-source full-verification run whose WebKit exploration passes across all three profiles without post-reload boot timeouts, retaining earlier failures and incomplete attempts separately.

#### Scenario: Qualification after repair
- **WHEN** the final integration candidate is qualified
- **THEN** source/build-bound evidence proves the causal regression and complete required coverage, and focused passes are not represented as a clean full run
