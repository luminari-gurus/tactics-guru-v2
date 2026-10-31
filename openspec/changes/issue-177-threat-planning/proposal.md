# Proposal

## Why

Players can preview a single command but cannot review a reachable move and subsequent ability together, inspect enemy danger, or undo a safe committed move. Issue [#177](https://github.com/luminari-gurus/tactics-guru-v2/issues/177) builds on merged #142.

## What Changes

- Add a pure, revalidated move-plus-ability plan and accessible confirmation/cancellation.
- Offer an explicitly labeled enemy threat inspection based on shared movement and targeting legality.
- Allow a bounded, replayable undo of a safe player move before an action, with conservative invalidation across lifecycle boundaries.

## Capabilities

### New Capabilities

- `battle-tactical-planning`: Compound planning, enemy threat inspection and safe movement undo.

### Modified Capabilities

None. Existing battle controls and deterministic session requirements remain in force.

## Impact

Domain movement, targeting and command/replay handling; BattleSession and persistence; battle HUD, overlays and input; unit and browser tests, and battle documentation. No new hazards, enemy reactions, arbitrary rewind, or hidden-information mechanics are introduced.
