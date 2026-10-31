# Proposal

## Why

Dungeon pursuers currently target the player's already-updated position, so their movement behaves like blocking rather than following the player's trail. Issue [#254](https://github.com/luminari-gurus/tactics-guru-v2/issues/254) requests distinct behaviors with deterministic and save-compatible outcomes.

## What Changes

- Retain passive wandering and distinguish chase of the pre-step player position from block of the resulting position, with explicit profile assignments.
- Preserve actual occupancy, encounter entry, deterministic cadence, movement RNG and compatible continuation of current saves.
- Cover divergent pursuit, legal collision edge cases and real dungeon interaction; document the rules.

## Capabilities

### New Capabilities

- `dungeon-enemy-movement`: Player-driven enemy profiles, collision and persistence.

### Modified Capabilities

None in the main spec inventory. Historical issue-155 delta specs are context for the existing behavior.

## Impact

Likely `src/map/movement.ts`, `src/domain/dungeon.ts`, focused map/dungeon units, dungeon Playwright cases and movement documentation. No new dependency or unrelated generation, battle AI, or storage subsystem is planned.
