# Proposal

## Why

Continuing dungeons repeat three fixed encounters at every depth. Issue #159 needs reproducible biome encounters and bounded difficulty growth without changing existing saved opponents or the standalone and short-run modes.

## What Changes

- Admit existing Forest and Desert maps/rosters through validated kind, biome, map-pool, composition and guardian definitions.
- Select normal, elite/vault and boss slots with separate versioned streams; alternate biomes after a seeded first floor.
- Project enemy HP, power, accuracy and AC from immutable baselines with the depth and vault policy in the implementation plan.
- Save complete selection facts in format 3; validate formats 1/2 before normalization to fixed, unscaled legacy play.
- Expose saved biome/kind/depth in exploration and battle, preserving existing completion, rewards, recovery and input authority.

## Capabilities

### New Capabilities

- `dungeon-encounters`: Stable biome encounter selection, bounded scaling, compatible persistence and reachable presentation for continuing dungeons.

### Modified Capabilities

None. Existing dungeon progression/exploration deltas remain intact; this capability adds encounter policy to them.

## Impact

Dungeon content/domain, save envelope, session replay receipts, DOM/map labels and existing dungeon tests. No dependencies, new assets, standalone/short-run policy changes, production actions or release tags. Implementation is authorized by the caller's continuation request; delivery ends with review-ready PRs.
