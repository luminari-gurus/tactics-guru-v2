# Proposal

## Why

PR #105's P1 review identifies a one-tab save-loss path: browser history can revive a cached battle after another document replaced its save. The old live session then autosaves over both newer slots. The user authorized validating and repairing all review findings.

## What Changes

- Stop the departing battle through the existing scene shutdown lifecycle on `pagehide`.
- Reload a battle restored by BFCache through the existing read-only startup/recovery choices before it can accept commands or save.
- Add real BFCache-enabled browser coverage for newer-slot preservation and current-save continuation; retain the original map acceptance evidence as historical.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `battle-session`: a departed document cannot continue its session; a cached return re-enters startup before gameplay resumes.

## Impact

Battle bootstrap lifecycle in `src/phaser/start.ts`, existing browser persistence coverage, storage documentation, OpenSpec and the PR handoff. No save-format, key, map, dependency, concurrent-tab ownership or deployment changes. Physical lifecycle certification remains separate.
