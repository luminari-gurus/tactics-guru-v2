# Proposal

## Why

The overworld has three generation families, but lacks the distinct legacy layout families requested in [#184](https://github.com/luminari-gurus/tactics-guru-v2/issues/184). Dungeon floors currently persist only `rooms-v1` identity; adding layouts must preserve existing floor geometry and isolated randomness.

## What Changes

- Compare Digger, Rogue, sector graph and Arena against Rooms; document equivalents and select distinct profiles on evidence.
- Add selected deterministic, bounded profiles to inspection and durable dungeon floors, retaining biome/art independence, valid placement and compatibility. New dungeon floors grow from 20×20 with depth under a bounded size policy.
- Verify generation, save/resume, accessibility, and rendering budgets against the issue's acceptance criteria.

## Capabilities

### New Capabilities
- `overworld-generation`: Versioned deterministic layouts and their durable dungeon use.

### Modified Capabilities

None.

## Impact

Expected changes include `src/map/generate.ts`, `src/map/view.ts`, `src/domain/dungeon.ts`, `src/domain/exploration.ts`, related dungeon UI/save consumers, their unit and Playwright tests, and `docs/overworld-map.md`. Dependency adoption is conditional on comparison and approval; existing saves and generation streams must remain compatible. Branch: `work/issue-184-overworld-generation`, base `33332814ff2254bcde66eff11d707ebd6028f51b`, caller `dubstylee`.
