# Design

## Context

See proposal.md for issue, caller, base and branch identity. `src/main.ts` already imports the map route dynamically. `view.ts` retains a `BiomeMap`; its current render routine also resets seed input and validation, so it must distinguish generation commits from presentation updates. The native controls and responsive grid already exist. Inventory PR #103 supplies three original 48px PNGs and six-treatment coverage.

## Goals / Non-Goals

**Goals:** Complete #98 using existing terrain data, Simple CSS and map routing; protect edited seed input and async selection consistency.

**Non-Goals:** No generator changes, battle changes, new assets, atlas import, persistence, URL state, biome expansion or general renderer framework.

## Decisions

1. Copy the three `docs/art/issue-98/sources/` files unchanged into `public/map-art/legacy-8bit/`. A small `src/map/art.ts` owns style IDs, the six-treatment mapping and lazy image load/decode status. Keep Simple as the existing CSS baseline. Full atlas import would load unused artwork; a configurable renderer registry has no second consumer.
2. Add the native Art style select in `view.ts`. Keep generated map data retained; art updates call presentation rendering only, never `generateMap`, `applyBiome`, entropy or storage. Separate seed validation and input resets from presentation rendering. A valid edited seed stays in the input; art switches display the existing generated seed. An invalid seed rejects the attempted art change and restores the committed style, matching sibling-control behavior.
3. Resolve image URLs through `import.meta.env.BASE_URL`; start requests only after Legacy 8-bit is selected and only for assets the current biome uses. Cache bounded load states. Use successful decoded images as CSS backgrounds over the existing Simple base; loading, failure and missing coverage use Simple. A request completion rerenders only from current retained map/style state, never captured old selections, and never clears seed errors.
4. Apply the identical resolved treatment to grid cells and legend swatches. Use pixelated scaling and a visible blocked outline/marker if mobile inspection shows the artwork alone is ambiguous. Preserve source palette and bytes. Keep `legacy-8bit` selected during fallback and show the reason; desert falls back entirely, asset failure can fall back by treatment. Preserve generation fallback metadata separately from art fallback.
5. Extend existing browser tests for 18 type/biome/style combinations, data identity, control retention, invalid/pending seed edits, keyboard/mobile accessibility, partial load/decode failures and delayed load selection races. Reuse existing prefix config and map/battle isolation tests. Add focused unit checks only for behavior not demonstrable through existing browser paths.

## Files and acceptance proof

- AC1/4: three public PNGs, map art mapping, inventory/export records and `docs/overworld-map.md`; compare runtime/source SHA-256 and assert every terrain maps to imported art or explicit Simple fallback.
- AC2: `view.ts` retains generated data; browser snapshots of cells/terrain and all reproducibility attributes before/after switches, plus code inspection for absence of generation/RNG calls on the art path.
- AC3: `style.css` and legend presentation; inspect desktop and emulated mobile portrait/landscape screenshots for all 18 combinations, blocked distinction, control sizes and overflow.
- AC5: map-only loader, prefix direct entry/refresh tests and battle request assertions; record PNG transfer bytes including failure cases and compressed/uncompressed map JS/CSS sizes against the same base build.
- AC6: focused browser failure/race checks, battle/save regression, content validation, unit suite, full configured browser suite, strict typecheck, production build and diff check; record actual results in `docs/qa/issue-98-map-art.md`.

## Risks / Trade-offs

- Small cells obscure peaks/pines → inspect rendered mobile screenshots and retain a blocked presentation marker if necessary.
- Late image completion overwrites pending input/error → presentation rendering reads current state and never mutates input or validation.
- Browser image errors vary → check network abort and invalid-image decode cases, with successful sibling treatment and matching legend.
- Legacy license/creator entry is absent → keep the inventory's explicit procedural-project-art gap and make no CC0 assertion; no additional artwork families imported.
- Mobile emulation cannot certify physical devices → distinguish browser evidence from physical checks in QA.

## Migration Plan

No persisted schema changes. The default remains Simple; reverting the task-specific files removes the optional style. Publish through a normal PR without deployment or merge. Do not archive the change before merge.
