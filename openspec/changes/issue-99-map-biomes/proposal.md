# Proposal

## Why
The merged standalone map offers three layouts but only one environment. Issue [#99](https://github.com/luminari-gurus/tactics-guru-v2/issues/99) adds the approved biome layer, advancing #96 and providing terrain semantics for #98 artwork integration.

## What Changes
- Add pure topology-preserving grassland, forest and desert treatments with stable IDs and v1 versions.
- Add a labeled Biome dropdown, transactional seed/selection handling and visible reproducibility metadata.
- Render distinguishable Simple palettes and blocked-cell motifs with a matching legend.
- Verify all nine layout/biome combinations and document the terrain contract.

## Capabilities
### New Capabilities
- `overworld-biomes`: Reproducible biome treatment and accessible environment selection independent of layout and art.
### Modified Capabilities
None. Existing main specs contain no overworld capability; retained in-flight map specs remain unchanged.

## Impact
Affected: new `src/map/biomes.ts`, `src/map/view.ts`, `src/map/style.css`, `tests/unit/overworldMap.test.ts`, `tests/overworld-map.spec.ts`, `docs/overworld-map.md` and README discoverability. No dependencies, battle changes or asset imports.

Caller: `dubstylee`. Base: `main` at `be7094aa105fb2b21c90610f411e16c4ef15ae25`. Branch: `work/issue-99-map-biomes`. Implementation approval: pending.
