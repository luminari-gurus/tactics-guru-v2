# Proposal

## Why

Issue #154 needs visible, reproducible occupants on the existing `/map` prototype.
The dependent movement issue #155 needs authoritative marker identities and positions outside the rendered cells.

## What Changes

- Add a pure, bounded placement factory returning one player and three enemies or an explicit failure.
- Commit map and markers together when generation controls apply; preserve them during artwork redraws and invalid input.
- Present compact, contrasting shapes, matching legends and accessible coordinates.
- Verify terrain compatibility, reset/failure behavior and desktop/mobile rendering.

## Capabilities

### New Capabilities

- `overworld-markers`: deterministic occupant state, complete-world commits and independent marker presentation.

### Modified Capabilities

None. Existing terrain, battle and persistence contracts remain unchanged.

## Impact

`src/map/state.ts`, `src/map/view.ts`, `src/map/style.css`, the non-DOM TypeScript configuration,
existing map unit/browser suites and map documentation. No dependencies, new images, movement,
combat, persistence or terrain algorithm changes.
