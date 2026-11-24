## Why

A playtime sample taken while a dungeon battle save waits for its Web Lock can
leave "Saving dungeon…" on screen after the save has settled. Players need the
actual result and any level-up feedback from the accepted action.

## What Changes

- Let a queued dungeon autosave incorporate elapsed playtime while preserving its result and feedback.
- Verify the ordering with a controlled clock and lock.

## Capabilities

### New Capabilities

- `dungeon-save-feedback` covers dungeon autosave completion when playtime is sampled concurrently.

### Modified Capabilities

None.

## Impact

The fix uses the existing dungeon write lock. Review follow-up also covers backup
continuation, replacement, defeat history and the final playtime checkpoint. See the [implementation handoff](../../../docs/ongoing-projects/issue-435-dungeon-save-feedback-plan.md).
