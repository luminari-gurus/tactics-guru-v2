# Proposal

## Why

Players cannot glance at the dungeon HUD to see remaining encounters or why stairs
are locked. Issue #376 adds that feedback using the existing progression rules.

## What Changes

- Show cleared/total encounters and labeled stair availability beside the floor header.
- Share a pure stair-availability projection between travel, map eligibility and HUD.
- Preserve discovery, automatic travel, re-entry hints and reward prominence.
- Extend existing legal reward, travel, resume and responsive browser journeys.

## Capabilities

### New Capabilities

- `dungeon-floor-progress`: Current-floor encounter progress and contextual stair feedback.

### Modified Capabilities

None. Existing main specs cover battle systems, not dungeon progression feedback.

## Impact

`src/domain/dungeon.ts`, dungeon HUD/map/CSS and existing dungeon unit/browser tests.
No new dependencies, persisted state, art, progression rules or save migration.
The continuation reference remains `docs/ongoing-projects/plan.md`.
