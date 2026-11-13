# Proposal

## Why

The Hall of Records menu currently opens a placeholder, so finished journeys leave
no device-local history. Issue [#176](https://github.com/luminari-gurus/tactics-guru-v2/issues/176)
provides the storage and terminal-run boundaries needed by
[#270](https://github.com/luminari-gurus/tactics-guru-v2/issues/270)'s richer statistics.

## What Changes

- Store bounded immutable summaries of saved authored runs and dungeons at actual
  victory, defeat, or confirmed replacement of an unfinished journey.
- Derive supported progress counters from validated snapshots; continued descent,
  backtracking, menu departure, and reload do not end a dungeon.
- Use one versioned device-local history store with idempotent recording,
  conservative corruption recovery, and visible storage-failure feedback.
- Replace the existing menu placeholder with accessible recent history, keeping
  history separate from active saves and all testing routes isolated.
- Deliver three focused increments: record model/storage/menu; authored-run
  integration; dungeon and replacement integration. Keep #176 open until all pass.

## Capabilities

### New Capabilities

- `run-records`: Device-local immutable run history, recording boundaries,
  bounded retention, recovery, and accessible menu presentation.

### Modified Capabilities

None. Existing battle action, replay, and presentation requirements remain intact.

## Impact

New small pure record model, persistence adapter, and menu renderer; existing
RunItemSession, DungeonSession, application entry/replacement handlers, and focused
unit/browser tests. No new package, backend, account sync, economy, or changes to
combat, RNG, active-save formats, or the seven-journey PR allowlist are planned.
Full event statistics, active playtime, and best-run aggregation remain #270.
See [plan.md](../../../docs/ongoing-projects/plan.md) for the source findings,
acceptance mapping, files, estimate, and publication identity.
