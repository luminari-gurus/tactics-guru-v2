# Design

## Context

See proposal.md for issue, caller, branch and base. `battleCatalog` validates one 12x12 Forest Ruins map on import. `validateContent` already checks catalog identities, bounded geometry, all cells, references, walkability and spawn overlap. `contentLoadPlan` handles asset planning and the loader reports failures. `contentVersion` hashes all maps. `createBattle` uses all map spawns at full HP and replay assumes that fresh start. #75 deliberately assigns production carryover construction/replay to #80 and actual encounter IDs/legal survivor spawns to #76.

## Goals / Non-Goals

**Goals:** Author an integration-ready ordered roster, reuse validation/rendering, demonstrate tactical reachability and survivor eligibility, preserve existing saves and default battle.

**Non-Goals:** Do not implement #80 battle transitions or carried-HP/replay startup, #77-#79 items/rewards, a production encounter chooser, new media or physical/full-run certification.

## Decisions

1. Add `src/content/encounters.ts` with exactly three encounter-to-map records and the trusted #75 `RunDefinition`: `encounter:forest_ruins`, `encounter:woodland_crossing`, `encounter:ruined_approach`. Map IDs have matching suffixes. First encounter reuses Forest Ruins unchanged. Two fixed 12x12 maps use deterministic authored cell definitions, never generation RNG. Woodland Crossing has a water strip crossed by two walkable approaches with forest cover; Ruined Approach has a stone terrace reached by elevation-1 steps and flanking grass paths. All elevations stay within 0-2, with routes traversable by existing jump-1 heroes. Retain canonical hero IDs 1/2/3 and goblin spawn IDs from 4 upward; use two grunts and one archer on each map. Geometry/placement supplies variety without stat changes. Exact cell coordinates are implementation details subject to route/picking proof.
2. Export a validated run catalog combining the unchanged single-battle definitions with the two maps. Keep `battleCatalog`, `FIRST_BATTLE_MAP_ID` and normal startup untouched. Adding maps to the existing catalog would invalidate its content hash; the separate run catalog is a concrete compatibility boundary. No format migration or copy of stats/assets is needed.
3. Reuse `validateContent` for map/catalog validation, then a narrow encounter reader validates exactly three distinct ordered IDs, known maps, one spawn per canonical hero and at least one enemy. Return structured errors for unknown input; export trusted definitions only after validation. Required assets reuse existing metadata/loader and existing file checks. The build runs the content-validation script, extended with encounter fixtures, before type checking and bundling. Do not create a general content/plugin framework.
4. Exercise all seven nonempty survivor subsets for each map. A pure spawn projection accepts the living party from `describeRunBattle`, validates unique known living IDs/HP bounds, and returns an owned map spawn projection retaining stable IDs and all enemies. It supplies #80 integration data, not a new gameplay constructor. Unit fixtures can construct projected catalogs, use existing `createBattle`, apply bounded carried HP to test-only state copies and validate them with `readBattleState`; do not claim these fixtures integrate carryover or modify production replay. Reject empty/malformed parties. Use existing movement/targeting routines to prove paths with elevation/move cost and eventual engagement, including injured and one-HP survivors. No forced-outcome fixture is full-run evidence.
5. Use a small Vite-served browser entry under `tests/fixtures/encounters/` to instantiate Phaser with existing `BoardRenderer`, `BoardInput`, asset loader and deterministic `createBattle` data. It resolves only validated encounter IDs, exposes minimal diagnostic state, and is not included as a production build entry. This avoids a production query switch, save namespace, duplicated battle controls or playable-run implementation. Tests select cells through actual mouse/touch events, pan/zoom, resize, verify projection/overlays and retain screenshots. Existing full battle browser suite verifies normal controls. Fixture evidence is renderer/input proof, not full-run completion. Keep fixture shutdown/resize/input cleanup explicit. A dedicated dev-server Playwright config runs this fixture through npm posttest, while the existing preview config excludes only this source-entry spec. The standard test command remains unchanged so focused arguments still reach it; strict TypeScript includes the additional config.
6. Document encounter roster/layout, spawn tables, stable identities, asset reuse/provenance references, #80 interfaces and all acceptance results in `docs/authored-encounters.md`. Compare baseline and resulting dist/transfer sizes: no added image/audio bytes; record actual code/content increase and existing budget limits. Do not claim budget acceptance from estimates. Use root and `/prototype/` builds to protect asset paths.

## Acceptance mapping and proof

| #76 acceptance | Implementation and proof |
| --- | --- |
| #75 IDs/spawns; three different encounters; unchanged rules | Ordered roster, two map modules, unchanged Forest Ruins/stats/abilities; golden deterministic content and compatibility fixtures |
| Bounds/references/spawns/assets at build/runtime | Existing catalog validation plus narrow encounter reader, adversarial fixtures, asset-file/content checks and browser missing/decode failures |
| Reachable cells/targets and carried-party starting states | All maps × seven survivor subsets; bounded injured HP; legal state validation, movement-rule routes and legal target opportunities |
| Approved art; source/conversion and budget impact | Reuse existing assets unchanged; documented provenance references; baseline/result dist and transfer accounting |
| Determinism and portrait/landscape board/picking; checks | Golden IDs/cells/spawns/seeds, production renderer/input fixture screenshots and transformed pointer selection; focused and full configured suites |

## Risks / Trade-offs

- Existing maps participate in save identity → separate run catalog and compatibility regression, no migration.
- A geometric route may fail due to elevation/cost/occupancy → use authoritative movement/targeting helpers for each survivor subset, not adjacency alone.
- Fixtures could overstate readiness → distinguish test state construction from production carryover/replay and defer complete run evidence to #80/#81.
- New maps could increase transfer or obscure picking → reuse assets, account for actual size changes and inspect screenshots after pan/zoom/resize.
- #57 acceptance remains open → this content package can merge independently; no release or hardware certification claim.

## Migration Plan

Additive run-only content; no current save or runtime cutover. Revert this package to remove the roster and fixtures without changing the current battle. #80 explicitly consumes the run catalog and spawn projection when its own approved integration is implemented.
