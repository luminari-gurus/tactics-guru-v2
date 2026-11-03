# Issue 184 preliminary generator comparison

Approval: the caller approved the issue-184 OpenSpec plan on 2026-11-03. This is preliminary investigation, not completed implementation or acceptance evidence.

Legacy reference: `tactics-guru` revision `e9433f6b608ae6b2d95418615cce9cf17dadcf74`, `OverworldMapGenerator.gd` and `OverworldMap.gd`. Godot 4.6 stable headless on macOS arm64, empty route-node dictionary, floor index 0, seeds 1, 12345 and 424242. A minimal stub for the map's unused deserialization dependency was used. Current Rooms sampled from `33332814ff2254bcde66eff11d707ebd6028f51b` using Vitest/Node 26.12.1. Timing is one cold observation per sample, not a benchmark; the engines and map sizes differ. No equivalence or performance-budget conclusion follows from it.

| Family | Size | Open cells (three seeds) | Open cells with at most two cardinal neighbors | Time in microseconds (three observations) |
| --- | --- | --- | --- | --- |
| Rooms | 20×20 | 91, 129, 100 | 31, 19, 18 | 345, 143, 103 |
| Digger | 38×26 | 79, 78, 76 | 41, 26, 57 | 1027, 880, 876 |
| Rogue | 38×26 | 105, 155, 179 | 85, 128, 102 | 1082, 1470, 1581 |
| Sector graph | 38×26 | 242, 233, 218 | 105, 73, 60 | 2068, 1963, 1833 |
| Arena | 38×26 | 864, 864, 864 | 4, 4, 4 | 4973, 4991, 4949 |

The legacy code makes Digger's sorted chain of small rooms, Rogue's sector rooms and column links, and sector graph's optional sectors and graph edges structurally distinct. Arena opens the entire interior. At 20×20 that is 324 cells, beyond the current 320-cell validator maximum; adapting that contract needs explicit evaluation. These samples do not establish fallback rates, topology equivalence at matching dimensions, placement capacity, production performance or the final choice of profiles. The raw temporary samples are not retained as durable evidence; rerun with a reproducible checked-in harness before claiming task 1.1 complete.

## Current consumer trace

`src/domain/dungeon.ts` uses `rooms-v1` in `FloorDescriptor`, `floorGeometry`, `FloorCache`, save admission, movement and enemy movement; `src/domain/exploration.ts` assumes Rooms when creating and reading exploration and placing encounter POIs. `src/ui/dungeon.ts` resolves the cache using seed alone. These paths must agree on saved generator identity before any new profile can safely appear on a durable floor. Existing descriptor/hash and exploration fixtures are compatibility obligations.
