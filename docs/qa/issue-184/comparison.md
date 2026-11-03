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

The legacy code makes Digger's sorted chain of small rooms, Rogue's sector rooms and column links, and sector graph's optional sectors and graph edges structurally distinct. Arena opens the entire interior. At 20×20 that is 324 cells, beyond the current 320-cell validator maximum; adapting that contract needs explicit evaluation. These original different-size samples do not establish topology equivalence or performance budgets; the matching-size samples and bounded corpus below support the profile choice. Matching-size raw cell samples are retained in [samples.json.gz](samples.json.gz), SHA-256 `240b45f760404e8c29e3aea28328b9b9695d3897f7b4aa5fba420d39c83395ab`; the original 38×26 samples remain temporary. A reproducible harness and fallback corpus remain outstanding.

## Current consumer trace

`src/domain/dungeon.ts` uses `rooms-v1` in `FloorDescriptor`, `floorGeometry`, `FloorCache`, save admission, movement and enemy movement; `src/domain/exploration.ts` assumes Rooms when creating and reading exploration and placing encounter POIs. `src/ui/dungeon.ts` resolves the cache using seed alone. These paths must agree on saved generator identity before any new profile can safely appear on a durable floor. Existing descriptor/hash and exploration fixtures are compatibility obligations.

## Matching-size exploratory samples

After the initial sample, the legacy source's width and height constants were changed in the scratch copy to 20×20 and then 36×36; all other source remained at the pinned revision. Empty route nodes, seeds 1, 12345, 424242, and Godot 4.6 were used as above. The following lists open cells and articulation points (removing one disconnects the open graph), in seed order. All listed outputs were connected. Empty-node runs have at least 60 open cells, which leaves capacity for the game's three encounter markers and two stairs; they do not prove the complete dungeon placement contract.

| Family | 20×20 open / articulation | 36×36 open / articulation |
| --- | --- | --- |
| Legacy Digger | 81/5, 60/2, 78/20 | 116/13, 102/15, 60/18 |
| Legacy Rogue | 68/15, 77/3, 74/3 | 128/22, 141/8, 168/8 |
| Legacy sector graph | 133/4, 114/11, 84/28 | 265/9, 321/9, 258/44 |
| Legacy Arena | 324/0 for all | 1156/0 for all |
| Proposed sector graph | 171/21, 158/13, 172/0 | 406/60, 410/58, 562/0 |
| Proposed Arena | 324/0 for all | 1156/0 for all |

The local sector implementation has nine connected sectors and optional extra links; it is an adaptation, not byte-identical legacy output. Digger and Rogue both connect small rooms with ordered corridors, as does existing Rooms, whereas the sector graph provides an explicit spatial graph and Arena provides open geometry. Select the latter two rather than shipping additional room-chain variants. Three samples do not characterize fallback frequency or balance. The proposed sector profile had no fallback in these samples; legacy retry/fallback counts were not captured. Further real-journey and performance checks remain necessary.

The [issue 87 comparison](../issue-87-overworld-map.md) measured rot.js 2.2.1's focused Digger/Rogue adapter at 16,534 raw/4,735 gzip bytes and the local generator closure at 3,635 raw/1,527 gzip. Digger's wall-clock cutoff changed all 260 sampled outputs under clock perturbation, and the shared RNG needs isolation; Rogue failed connectivity on two samples. Choose independently written local bounded algorithms and no dependency: this avoids its clock and shared-RNG constraints and introduces no third-party license or package weight. The issue 87 numbers are historical 20×20 candidate builds, not performance claims for this change.

A separate 0–127 seed corpus, using the same scratch legacy engine and size changes, produced no `static_route` fallback for any family at either size. Open-cell ranges at 20×20 were Digger 60–98, Rogue 60–109, sector graph 60–139 and Arena 324; at 36×36 they were 60–141, 76–185, 129–414 and 1156 respectively. The machine-readable [corpus summary](legacy-corpus.json) records the inputs and observed counts. Legacy fallback is identified by its `static_route` generation style. Current-profile unit coverage exercises 130 seeds at each of the five supported sizes. These tests verify geometry, determinism and placement but do not establish visual or complete-run acceptance.

The approved size policy starts at 20×20 and grows to a bounded 36×36 at depth five. Acceptance must retain the existing 2,500 ms cold-ready, 33.4 ms step P95, 400,000-byte compressed code and 1,500,000-byte asset limits in `tests/dungeon-exploration.spec.ts`, as well as its frame budgets. Measure the maximum size on qualified idle browser capacity; these exploratory generator timings do not satisfy those gates.
