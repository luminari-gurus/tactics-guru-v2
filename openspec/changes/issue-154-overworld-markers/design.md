# Design

## Context

See [proposal](proposal.md) for motivation and [implementation plan](../../../docs/ongoing-projects/plan.md)
for the source-grounded control contracts and full acceptance matrix. `/map` is a DOM grid;
its artwork loader already redraws current state after decoding.

## Goals / Non-Goals

Keep authoritative immutable-by-contract state outside the DOM so #155 can later transform it.
Do not add movement scaffolding, persistence, terrain repairs, new assets or another renderer.

## Decisions

- Add `createOverworld(BiomeMap)` in `src/map/state.ts`, returning a discriminated success/state
  or failure/reason result. Reuse the fixed-size terrain validator. Validate dimensions and terrain
  correspondence before rendering; do not build a generic spawn validator.
- `markers-v1` uses a fresh RNG seeded with `(map.seed ^ 0x4d41524b) >>> 0` and four partial
  Fisher–Yates steps on row-major walkable indices. Fixed IDs map to those four indices.
  The layout supplies type/version differences; biome/art are excluded. Sampling has modulo bias,
  acceptable for noncompetitive prototype placements; rejection sampling adds no required behavior.
- One regeneration path builds terrain, biome and markers before replacing retained state.
  Failure preserves the complete previous world and persistent error feedback. No silent terrain retries.
- Render only reads state. Existing cells retain their terrain classes and gain marker data attributes;
  CSS pseudo-elements supply circle/diamond overlays with light/dark edges. A wrapping legend and
  text outside `role=img` provide role counts and human coordinates.
- Extend existing unit and Playwright suites. Capture all three terrain baseline hashes before edits.
  Development-only module interception proves failure paths without production test switches.

## Risks / Trade-offs

- Tiny mobile cells → inspect real screenshots at 320px and configured mobile viewports.
- Old art completions → hold requests through new world commits and check success/network/decode outcomes.
- Failure feedback overwritten by redraw → keep failure alongside retained world and test recovery.
- Compatibility drift → pin terrain hashes, marker snapshots and pure-model-to-DOM parity.

## Migration Plan

No saved-data migration or dependency changes. Deliver one focused feature PR after local validation;
revert that PR to remove the feature. Deployment and movement remain separate.
