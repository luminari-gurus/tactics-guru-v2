# Proposal

## Why

The legacy dungeon migration browser case expects envelope 13 for the fresh dungeon created after replacement. The save writer selects its wall-sight timed-stats format, which made the case fail in both WebKit orientations during the matched CI comparison.

## What Changes

- Use the encoder's existing wall-sight timed-stats format identifier in the browser assertion.
- Preserve the literal counter-only fixture and all startup, counter, record, and playtime assertions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The change corrects test coverage for existing save behavior.

## Impact

The save envelope exports its existing constant, and the migration case imports it. See [the implementation and verification plan](../../../docs/ongoing-projects/issue-483-dungeon-counter-migration-plan.md) for [#483](https://github.com/luminari-gurus/tactics-guru-v2/issues/483).
