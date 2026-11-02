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

Potential owners are `src/main.ts`, `src/app/startDungeonApp.ts`,
`src/phaser/start.ts` and existing browser boot/dungeon helpers. The exact repair
will follow the causal evidence. PR #256 is an active integration consumer;
#257/#258 are related symptoms, not presumed duplicates. No new dependency,
save-format change, deployment or menu redesign is proposed.
