# Proposal

## Why

The standalone map currently renders only Simple terrain. Issue [#98](https://github.com/luminari-gurus/tactics-guru-v2/issues/98) can now offer the verified legacy artwork because inventory PR #103 is merged.

## What Changes

- Add a labeled Art style control with default `simple` and `legacy-8bit`.
- Import exactly three preserved PNGs and map them to the approved terrain meanings.
- Rerender existing map data without generation or RNG draws; retain selections and seed validation.
- Show readable Simple fallback and matching legends for desert and failed assets.
- Verify responsive presentation, asset-base behavior, route isolation and transferred sizes.

## Capabilities

### New Capabilities

- `overworld-art-presentation`: Independent style selection, bounded artwork loading and terrain-preserving fallback on the map route.

### Modified Capabilities

None. Existing main specs cover battle behavior; this change does not alter those contracts.

## Impact

Issue #98; caller `dubstylee`; base `main` at `63c232183c1bee3f3cf68d2f919febc286f47abd`; branch `work/issue-98-map-art`. Affects `src/map/view.ts`, `src/map/style.css`, a small map-only art module, three files in `public/map-art/legacy-8bit/`, existing map tests, `docs/overworld-map.md`, inventory/export records and task-specific QA evidence. No dependencies, new artwork, battle rendering changes, renderer framework, persistence or URL settings. Caller approved this concrete plan in chat on 2026-10-13; implementation is authorized.
