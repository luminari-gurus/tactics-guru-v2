# Proposal

## Why

WebKit intermittently leaves the dungeon on its Loading shell after reload,
preventing saved continuation and blocking #153 acceptance. #263 records a
60-second failure despite the existing PR #256 readiness mitigation.

## What Changes

- Recover the exact failed-run evidence and distinguish entry/module loading,
  dungeon mounting, engine readiness and saved continuation.
- Add bounded failure diagnostics and a causal regression witness at the owning
  startup boundary, then repair the evidenced cause with the smallest change.
- Preserve saved progress, ordinary error recovery, route/base-path behavior,
  clock/input semantics, serial browser execution and existing coverage.
- Qualify the final integration with focused reload/continuation checks and the
  complete full-verification gate required by #263.

## Capabilities

### New Capabilities

- `application-startup`: route initialization and saved continuation after reload,
  including observable failure boundaries and preservation of saved data.

### Modified Capabilities

None. Combat, audio, controls and deterministic session requirements are unchanged.

## Impact

Evidence located the owning failure in the bundled Linux WebKit networking
runtime before application entry. Implemented owners are the existing
Playwright package/lock, browser setup scripts, five device-bearing configs and
bounded test diagnostics. Two independent verification omissions are repaired
in focused follow-up PRs. Application entry, game/save rules and production
dependencies are unchanged. PR #256 is integrated into main and included in
qualification; #257/#258 remain separate unless their causes are established.
No save-format change, deployment or menu redesign is part of this work.
