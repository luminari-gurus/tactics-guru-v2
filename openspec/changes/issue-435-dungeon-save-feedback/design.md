## Context

The session's immutable playtime update can invalidate the queued autosave's
snapshot guard while the write waits for its lock.

## Decision

Keep the latest queued autosave request in `DungeonSession`. Every playtime
sample may advance its snapshot when the request still refers to the sampled
state, including the sample an accepted battle command takes before its boundary
is checked. The original write then saves the sampled time and settles the
original status and promise. With no matching request, a checkpoint queues the
existing quiet save.

A newer save that supersedes a pending request inherits its feedback and its
visible pending status, so a level-up message reaches the settled status. Continue
and reset start a new lineage and clear the request.

Clear the request when granted or refused, before notifying observers. Maintain
reference-based rejection for other state changes and use the existing storage
lock and compare-and-swap. The latest request finishes after session disposal if
the callback still runs, so accepted progress does not depend on whether a clock
sample happened. The save format and browser lifecycle wiring are shared with
current saves.

Changing the HUD would conceal the stale status while the original save reports
failure to its caller. Broadening snapshot equality would let stale decisions
through. Keeping the same queued request addresses both issues with one write.

Unload durability depends on the browser running the callback and is tracked in
[#434](https://github.com/luminari-gurus/tactics-guru-v2/issues/434).
