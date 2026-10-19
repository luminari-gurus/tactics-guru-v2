# Proposal

## Why

Ordinary battles currently depend on fixed authored maps. Seeded battlefields can provide replayable variety without authoring every grid, provided terrain supports legal movement and engagement and enemies can navigate detours.

## What Changes

- Generate immutable 12×12 desert grids at encounter entry, using a versioned profile with predominantly flat sand, sparse rocks and broad approaches.
- Validate content, reversible movement, deployment and attack opportunities before admitting a generated or authored encounter. Playability means terrain permits combat; it does not promise a player win or finite battle duration.
- Bound generation attempts and use a validated desert fallback when candidates fail.
- Extend encounter definitions to select generated battlefields or fixed authored maps, including boss slots. Reuse current enemies; new boss units and mechanics are outside this change.
- Replace Manhattan-only enemy pursuit with deterministic paths to legal attack positions, including detours, while retaining existing attack preferences and command budgets.
- Reconstruct identical terrain, spawns and continuation decisions for saves and replays using versioned encounter descriptors, isolated generation RNG and map hashes.
- Proposed rollout: use desert generation for the first two encounters of the existing three-encounter run and retain a fixed authored final encounter as the boss-grid integration example. Keep the independent authored single battle.
- **BREAKING**: generated run descriptors require a new run-save format and encounter identity. Preserve incompatible saves for recovery/export; do not silently regenerate them under new rules. No legacy run migration is included.
- Exclude terrain changes during combat, other biome generators, automatic difficulty adjustment for wounded parties, round limits and guaranteed victory. Existing technical command limits remain technical limits, not battle outcomes.

## Capabilities

### New Capabilities

- `battlefields`: Encounter source selection, deterministic desert generation, biome constraints, playability validation, bounded fallback and authored boss-grid admission.
- `battlefield-continuation`: Exact generated/authored battlefield identity across run entry, save/resume and replay, with explicit compatibility and recovery behavior.

### Modified Capabilities

- `enemy-turns`: Pursue legal attack positions by terrain-aware route distance, allowing moves that increase Manhattan distance while retaining deterministic, legal and resumable decisions.

## Impact

- Encounter/content types and validation, terrain definitions/assets, run entry and projected catalogs, movement helpers, enemy planning, run saves and replay records, run host and production board loading.
- Tests for generation and adversarial layouts, carried-party subsets, AI continuation, persistence/replay and browser portrait/landscape behavior; measured generation and rendering costs.
- Existing main `enemy-turns` pursuit requirements change explicitly. Completed but unsynced `authored-encounters` and `authored-run` change artifacts describe fixed maps; the new source contract supersedes that assumption for configured generated slots without rewriting those historical artifacts.
- Reuse the current renderer, domain RNG and combat rules; no new runtime library or standalone overworld topology changes are planned.
