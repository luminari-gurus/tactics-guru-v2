# Design

## Context
See proposal.md for issue/caller/base/branch identity. Merged PR #100 adds three pure layouts in `src/map/generate.ts`; `view.ts` currently renders binary cells and owns seed/type validation. No imported art exists on main. #98 remains separate and must consume this terrain contract.

Legacy reference inspected at `e9433f6b608ae6b2d95418615cce9cf17dadcf74`: `content/terrain/grass.tres` defines Grass; `tree_dense.tres` defines Dense Pines with walkable=false and blocks_los=true. The complete tree contains overworld grass/forest/mountain images under `art/overworld/8bit/generated/individual_32` and `_48`, plus grass/forest tiles. Filenames establish available reference files, not usable style coverage or licensing. Desert combat references do not establish desert overworld artwork. We import no files or legacy combat/LOS rules. The issue-approved roster is grassland/forest/desert; no snow.

## Goals / Non-Goals
Provide a small pure treatment module and one additional native select against the approved shared pipeline. No layout algorithm changes, terrain movement costs, weather, encounters, campaign, persistence, URL state, art dropdown, asset generation/import, battle edits or dependencies. Physical-device certification and production operations are excluded.

## Decisions
1. Keep `GeneratedMap` as layout output. Add `applyBiome(layout, biome)` and readonly treated-map type in `src/map/biomes.ts` containing layout plus `biome`, `biomeVersion`, and row-major `terrain`. Six stable treatment IDs: `grassland-open/blocked`, `forest-open/blocked`, `desert-open/blocked`. Validate biome ID; expose catalog with labels/versions. A direct cell mapping is bounded at 400 cells and needs no RNG. Randomized decorations are unnecessary and would enlarge versioning/testing scope. Never mutate input. Leave existing layout fallback intact.
2. Simple rendering consumes the terrain layer. Grassland retains floor #b9cba3 / wall #233339; forest uses clearing #8dbb81 / dense-pine #173c2e with a restrained canopy motif on blocked cells; desert uses sand #e5c581 / rock #6b4c38 with a diagonal rock motif on blocked cells. Light open/dark blocked convention and matching swatches preserve readability beyond hue alone. Treat all nine combinations identically; no unsupported combinations. Shared catalog/treatment meanings and CSS fallback remain usable by #98; no speculative renderer plugin framework.
3. `view.ts` commits seed/type/biome together only after validation, rolls both selects back on invalid seed and lets New seed use committed choices. Retain generated treated data for rendering instead of coupling styles to generation. Add biome metadata to grid and status, preserving existing type/version/fallback attributes. Add native Biome select with the current 44px control/focus conventions. Simple is the sole art style until #98; future art selection must rerender this retained data.
4. Document roster, six terrain meanings, versions/palettes, all-combination support, legacy reference limitations, default/reset behavior and integration contract in `docs/overworld-map.md`, linked from README. No new asset provenance claims.

## Acceptance and verification
- AC1: catalog/terrain documentation and Simple palette/legend inspection.
- AC2: browser tests for edited valid seed, both selectors, Generate and New seed retention; invalid cases roll both back. Current art is Simple and retained.
- AC3: repeated pure treatments, frozen inputs, clock/entropy denial, battle-state/next-RNG equality and returning to prior biome; rendering reads retained data only.
- AC4: all nine combinations over seeds 0–255, 12345, 424242, 2147483648 and 4294967295; independent existing flood-fill, exact topology equality, forced fallback treatment and unknown-biome rejection. Preserve Rooms fingerprint.
- AC5: inspect screenshots for all nine combinations on desktop/Pixel portrait/landscape; check distinct palette/motifs, matching legend and default grassland. Missing imported artwork uses documented Simple treatment; actual imported-art failure verification belongs to #98 because none exists here.
- AC6: focused unit/browser checks, complete `npm run test:unit`, `npm run validate:content`, `npm test`, `npm run typecheck`, `npm run build`, prefixed build/preview map entry/refresh checks, strict OpenSpec and `git diff --check`. Record commands, actual results and screenshot review in `docs/qa/issue-99-map-biomes.md`; emulation does not certify hardware.

## Backlog disposition and readiness evidence
Complete paginated scan: 23 open issues, two open PRs. #99 promoted and read back after approved roster/topology contract, pinned legacy inspection, empty native dependency lists, no active #99 branch/PR and merged #93/#100 baseline. It advances #96 and supplies terrain semantics to #98; #88 is independent with no evidenced actionable downstream dependency. #64/#66 require unavailable physical hardware; #66 prior branch is explicitly withdrawn historical planning. #92 is covered by #95; #73 is assigned to another caller and covered by #95. #98 lacks its bounded pinned style inventory. #75/#77/#84 need owner product/release choices. #74 waits for #73/#57; #76/#78/#79/#80/#81 have unmet explicit prerequisites. #85 needs target/readiness/operation approval. #57–#60/#83/#96 remain epics, not implementation candidates. Existing #82/#97 branches are merged. No other readiness labels changed.

## Risks / Trade-offs
Small cells may obscure motifs → inspect actual mobile screenshots and retain light/dark semantics. Sibling #98 can conflict in view/CSS → publish explicit six-treatment contract and recheck main before implementation. Biomes contain no random variation → deterministic minimal first release; later variation requires version changes. PR #95 asset-base fix is unmerged → keep prefix map checks scoped and report existing battle prefix failures without taking over #92.

## Migration Plan
Additive map-only feature with grassland default, no saved state migration. Rollback reverts this issue's changes. No deployment authorized. Approval is pending; all implementation tasks remain unchecked.
