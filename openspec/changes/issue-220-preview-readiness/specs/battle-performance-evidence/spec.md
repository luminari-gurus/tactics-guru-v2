## ADDED Requirements

### Requirement: Owned local preview readiness
Local collection SHALL require a positive bind acknowledgement from its own live preview before accepting HTTP readiness within a ten-second total deadline. Readiness MUST be independent of formatted output. Startup failure MUST retain bounded stdout/stderr, process state and the last HTTP observation. Strict port 4174, remote mode, source/build checks, profiles and budgets MUST remain unchanged.

#### Scenario: Output changes or slow startup
- **WHEN** an owned preview serves HTTP successfully within the deadline with silent, colored, split or URL-free stdout
- **THEN** collection proceeds without parsing that output

#### Scenario: Foreign listener or unusable preview
- **WHEN** spawn, binding, liveness or bounded HTTP readiness fails, including occupied ports, missing output, non-OK or hanging responses
- **THEN** collection fails nonzero with retained diagnostics and does not measure or signal a foreign listener

### Requirement: Completed local preview cleanup
The collector SHALL await bounded cleanup of its exact owned preview after startup, browser-launch or capture failure, normal completion and catchable SIGINT/SIGTERM. Graceful close MUST precede bounded forced termination when required. Cleanup failure MUST preserve the initiating error. Remote collection MUST neither start nor stop a local process.

#### Scenario: Success or failure releases resources
- **WHEN** local collection completes or fails
- **THEN** the owned process exits and its port is released before the lifetime returns, or an explicit cleanup failure is reported
- **AND** unrelated siblings survive and the released port can be reused

#### Scenario: Interruption or unresponsive child
- **WHEN** a catchable interruption arrives or the worker ignores graceful close
- **THEN** the collector cleans up within bounded escalation and removes its temporary handlers without claiming cleanup after SIGKILL or host crash
