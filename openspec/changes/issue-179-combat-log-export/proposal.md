# Proposal

## Why

Players need to follow which turns and actions produced combat results and share a readable excerpt for troubleshooting. The existing filtered log supplies the visible event stream for [#179](https://github.com/luminari-gurus/tactics-guru-v2/issues/179).

## What Changes

- Group the retained Battle log by round, acting unit and action while keeping the current filters and modal behavior.
- Download the complete retained log as versioned JSON with build and combat rules identity through an explicit choice.
- Document the 40-event encounter limit and the behavior on Continue and reload.

## Capabilities

### Modified Capabilities

- `battle-controls` gains grouped combat history and a local export.

## Impact

The shared battle presentation, Battle log dialog, combat guide and focused Dungeon coverage change. The [working plan](../../../docs/ongoing-projects/plan.md) records the implementation and verification evidence.
