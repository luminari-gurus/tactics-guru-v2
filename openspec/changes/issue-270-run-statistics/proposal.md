# Proposal

## Why

The merged #176 Hall of Records records endings and basic progress, but cannot
show kills, moves, active duration or personal bests. With its storage and
replacement boundaries delivered, [#270](https://github.com/luminari-gurus/tactics-guru-v2/issues/270)
can add trustworthy statistics without rebuilding history or changing game rules.

## What Changes

- Accumulate bounded versioned statistics from accepted domain events and dungeon
  steps, including movement undo, with the accumulator saved alongside active play.
- Measure active foreground gameplay with an injected monotonic clock; exclude
  hidden/unfocused pages, closed sessions, loading, menus and paused dialogs.
- Carry the frozen five-stat summary through existing terminal and reviewed
  replacement receipts, including the paired-journey correction from #363.
- Show the newest 100 journeys and per-mode personal bests; retain bounded winning
  summaries after they leave recent history. Rank duration by longest active play.
- Read prior saves/history compatibly, label unavailable or partial statistics,
  and preserve corrupt or future-version bytes for existing explicit recovery.
- Keep every dedicated testing route free of statistics tracking and history I/O.

## Capabilities

### New Capabilities

- `run-statistics`: accepted-event counters, active time, durable summaries and
  accessible recent/personal-best presentation for menu-origin authored runs and
  dungeons. Existing #176 planning artifacts remain the foundation; no archived
  main `run-records` capability exists to modify.

### Modified Capabilities

None. Existing `battle-session` resolution, replay and presentation requirements
are preserved; statistics observe accepted results without changing combat state.

## Impact

Planning branch: `branch/issue-270-run-statistics`; base main
`f0bdac46dbd018ba11300c800e3dfb0d986fd6a5`. Implementation will touch the two journey
owners, BattleSession accepted-event notification, active-save/history readers,
the records modal, lifecycle wiring and their existing tests. Add one pure stats
module and one small clock helper shared by the two actual journey consumers.
No package, backend, telemetry, combat/replay schema or production operation is
required. Deliver in three focused PRs; keep #270 open until every criterion passes.
The human-facing [plan](../../../docs/ongoing-projects/plan.md) is the review entry.
