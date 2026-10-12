# Proposal

## Why

The standalone `/map` only produces rooms and corridors. [Issue #97](https://github.com/luminari-gurus/tactics-guru-v2/issues/97) now has an approved roster and shared contract with #96/#98/#99, enabling visibly distinct seeded layouts without coupling to battle state.

## What Changes

- Add independently implemented Random walker and Cellular caves alongside the unchanged Rooms default; stable IDs select versioned pure generators.
- Retain 20×20 binary topology, blocked perimeter, 60–320 cardinally connected walkable cells, deterministic bounded attempts and fallback.
- Add a labeled Map type dropdown, visible type/version metadata and transactional valid-seed controls that retain selections.
- Document the approved sibling contract and measured generation/diversity/fallback/bundle evidence. Biome and art dropdowns remain with #99/#98.

## Capabilities

### New Capabilities

- `overworld-map-types`: Selectable deterministic layout generation and map-type controls in the independent map prototype. The earlier #87 change has an unarchived `overworld-map` delta but no corresponding main capability; retain its baseline behavior without duplicating its routing scope.

### Modified Capabilities

None.

## Impact

Caller: `dubstylee`. Branch: `work/issue-97-map-algorithms`; base: `origin/main` at `a8e115a` (PR #93 merged). Expected files: `src/map/generate.ts`, `src/map/view.ts`, `src/map/style.css`, existing map unit/browser tests, README and `docs/qa/issue-97-map-algorithms.md`. Small pure generator helpers only if they clarify algorithm boundaries; no new runtime dependency, RNG changes, battle edits or speculative plugin framework.

Prerequisites: merged #87 baseline and user-approved roster/shared contract recorded in #96–#99. Sibling implementation is not a prerequisite. Non-goals: legacy parity, campaign graphs, POIs, biome/art implementation, persistence/URL state, new artwork, production deployment. Approval of the contract is recorded; approval of this concrete implementation plan is still pending.
