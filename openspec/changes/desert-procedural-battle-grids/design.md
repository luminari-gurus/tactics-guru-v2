# Design

## Context

See proposal.md for motivation and specs/ for behavior contracts. The current battle engine already consumes immutable `MapRecord` cells/spawns through a catalog, so procedural rendering needs no second board system. `src/map/generate.ts` generates a separate 20×20 walkable/blocked map; `src/map/biomes.ts` deliberately preserves its topology. Neither models battle elevations, spawns or combat engagement.

`grid.ts` permits unrestricted descent, charges destination cost plus ascent, and blocks living occupancy. `ai.ts` searches within one turn and otherwise pursues only decreasing Manhattan distance. `runBattle.ts` and `runSaveEnvelope.ts` currently resolve fixed encounter map IDs, project equipment/survivors and validate catalog hashes. `readBattleState` requires the resolved map already in the trusted catalog. Saves contain state, not map geometry, and exact content/rules versions gate compatibility.

The main enemy-turns spec explicitly requires distance-reducing pursuit and needs the included MODIFIED delta. Completed unsynced authored-run/encounter changes document fixed-map assumptions; keep those historical files intact and make generated source admission explicit in the new capability. Existing battlefield rendering/resource and frame-performance requirements still apply.

## Goals / Non-Goals

**Goals:** One source-resolution boundary feeding construction, save hydration, replay and rendering; shared movement/targeting semantics; bounded deterministic searches; independently testable terrain and continuation guarantees.

**Non-Goals:** A general terrain editor, universal procedural-biome framework, new boss combat systems, persistent AI plans, exhaustive proof of all occupancy states, player win guarantees, or cross-version save migration. No changes to the standalone overworld generator.

## Decisions

### 1. Resolve encounter sources to the existing map contract

Extend encounters with a discriminated source: authored `{kind, mapId}` or generated `{kind, biome, generatorVersion, profileVersion}` plus existing roster/template data. Keep stable encounter IDs and ordered three-slot progression. Full hero and enemy spawn IDs are deterministic and remain ordered; filter defeated heroes only after validating and identifying the complete map.

A single resolver takes trusted encounter definition, run seed/index and supported content. It returns a validated immutable full `MapRecord`, descriptor and diagnostics or a structured failure. Build a fresh battle-local catalog with that map; never mutate cached base catalogs. Equipment projection happens once, then survivor projection, and all consumers use the resulting catalog.

Proposed product default for this change: first two run slots use desert generation and existing encounter enemy compositions; the final slot keeps `ruined_approach` as an authored boss-slot example. This establishes source selection without claiming a new boss enemy exists. Retain the separate default authored single battle. Reuse the existing run entry and storage namespace rather than adding another game mode.

Alternative: replace mapId with arbitrary serialized geometry everywhere. Rejected because it bypasses the existing trusted-content boundary and expands save validation unnecessarily.

### 2. Generate open desert terrain with a protected core

Create a pure battle-specific 12×12 generator. Begin with level sand, reserve opposing flat deployment bands, three hero slots and enemy slots, and two distinct gateways connected by two internally vertex-disjoint protected routes. Place sparse rock clusters and optional broad elevation-one patches away from deployment and protected routes. Validate the completed candidate; avoid a second repair algorithm in v1.

Version `desert-v1` constraints: at least 116 of 144 cells are walkable elevation-zero sand, at most 14 cells are blocked rocks, and all other elevations are zero or one. Every connected raised walkable patch has at least four cells. Each spawn has at least two legal terrain exits. Check the two gateway routes with a bounded vertex-disjoint-path test; both endpoints are explicit profile data. Deployment occupancy is checked separately.

Use walkable cost-one sand and nonwalkable LOS-blocking rock terrain IDs with desert surface assets. Add these to run content without inserting desert rules records into the independent single-battle base catalog. Validate material semantics and load approved repeatable surfaces using the existing asset contract. Do not paint forest or water as desert obstacles. Existing rendered stone sides can supply raised geometry; keep distinct elevation variants bounded.

Derive a layout seed from the encounter seed with a fixed purpose tag. Each of four candidates gets a deterministic attempt seed and local RNG. Generation consumes no initiative, combat or reward draws. If all fail, use a versioned, flat, open desert fallback with valid gateways and separated spawns; validate it through the same admission path. Fallback validation failure is an error, never another retry loop.

Alternative: reuse rooms/caves and repaint them. Rejected because their density/perimeter and cosmetic biome contract do not express the requested open desert terrain.

### 3. Validate terrain playability separately from winning combat

Apply bounded structural content validation before graph construction. Expose a small pure movement-edge predicate shared by domain movement, validation and AI: cardinal neighbor, walkable destination, uphill within Jump, destination cost plus uphill within Move. Preserve unrestricted downhill gameplay; the validator rejects terrain that cannot be traversed back by another legal route.

For the supported encounter roster, use conservative minimum Move and Jump capabilities and verify every walkable cell is in one strongly connected directed component. This catches inaccessible ledges, irreversible pits and single steps too expensive for any turn. A multi-turn route resets movement each turn; never accumulate a single movement budget across the whole route.

Validate the seven nonempty hero subsets against all configured enemies, independent of HP magnitude and equipment power. Check unique walkable spawns and legal immediate deployment exits with living occupancy. For each actor, search terrain-reachable unoccupied attack positions against an opponent using owned damaging abilities, actual range and LOS. For this structural engagement search, keep the chosen target fixed and treat other units as movable; for every immediately executable command, use full living occupancy. This distinction avoids falsely rejecting ordinary congestion while retaining legal spawn starts.

Return reason codes and relevant coordinates/unit IDs for geometry, movement component, deployment, engagement and profile failures. Authored grids pass the common structural/movement/deployment/engagement checks but are exempt from desert density and two-route constraints. This allows authored tactical chokepoints while rejecting terrain-caused isolation. If the existing final grid fails, minimally repair that authored layout and record its new identity; never bypass validation because it is a boss slot.

The guarantee is terrain-based access to combat with supported units. It is not an exhaustive occupancy-state solver or a proof that the player can win with current HP. A legal defeat is not a failed validator. Runtime occupancy and ability legality remain authoritative, and no timeout or new outcome is introduced.

Alternative: certify maps only by autoplay wins. Rejected because a policy can fail on valid terrain, a weak party can lose, and passing simulations do not cover every seed.

### 4. Pursue legal attack positions with stateless pathfinding

Preserve immediate attack search, expected-damage scoring and existing attack tie-breaks. Only replace the no-attack pursuit branch. Enumerate legal ordinary-attack goal cells for each living player/owned attack using range and LOS, excluding occupied cells. Search the current occupancy-aware movement graph to these goals using weighted deterministic Dijkstra; individual edges must fit the actor's turn budget.

Rank pursuit goals by total route cost, target ID, ability ID and goal y/x. For the selected reachable goal, rank legal one-turn destinations by remaining route cost, then move cost and destination y/x, requiring strictly lower route cost than the origin. This permits an initial move away in Manhattan terms while ensuring progress for stationary targets/occupancy. Units may wait if dynamic blockers remove all legal routes. No movement through allies or enemies is added.

Search size is bounded by map cells, supported abilities and living targets. Recompute from accepted snapshots each turn; do not serialize a target commitment, route queue or tie-breaking RNG. After an accepted pursuit move, hasMoved prevents another move and unchanged target/attack state yields the same remaining Wait. Preserve the existing at-most-move/attack/Wait execution and after-command continuation tests. Bump the appropriate rules identity because resumed autonomous enemy behavior changes.

Alternative: constrain all generated maps to Manhattan-monotonic approaches. Rejected because authored obstacles and later biomes still need detours and such a constraint limits useful terrain variety.

### 5. Save recipes and verify exact reconstruction

Define a bounded battlefield descriptor containing encounter/source kind, layout seed where generated, biome and generator/profile versions, stable map ID and hash of canonical full-map cells/spawns. Source versions include fallback decisions and attempt order; diagnostics expose attempt/fallback but are not a second source of reconstruction authority. Authored descriptors use their fixed map ID and hash. Validate source selection against trusted run configuration and derive the expected layout seed from the saved run seed/index rather than trusting a user-supplied seed.

Add a descriptor beside activeBattle in run snapshot format 2, null when no active battle exists. Preparation needs no geometry: its trusted configuration, run seed and encounter index determine the future descriptor exactly. Validate run/items first, resolve the expected full map and compare descriptor/hash, project equipment/survivors, then validate activeBattle. Include encounter source configuration in run compatibility identity. The same resolver creates initial run battles and the canonical replay entry; generated replay/continuation wrappers carry the descriptor so initial.mapId alone is never treated as sufficient identity.

Keep the current snapshot representation, 32,768-code-unit run envelope cap, bounded input decoding, digest and recovery protections. Bound descriptor strings and exact keys before reconstruction. Restore draws no combat RNG and never replays committed audio/animation. Verify worst-case supported payload size; fail the implementation acceptance gate rather than silently increasing limits or dropping fields.

No old generator retention or migration registry is added. Unsupported versions and mismatched hashes explicitly fail with saved bytes preserved. This means an update can invalidate old runs; recipe-only storage is small but depends on the declared implementation remaining available. An embedded-map save alternative would avoid that dependency but still requires rules compatibility and substantially expands input validation, so defer it until durable cross-release runs are a product requirement.

### 6. Verify guarantees and battlefield quality independently

Runtime validation applies to every candidate, including fallback. Automated acceptance covers seeds 0–9,999 plus uint32 edges, all seven survivor subsets, and adversarial invalid maps. Record selected attempts, fallback rate, unique map hashes, terrain counts, route lengths and generation/validation timings. Initial quality gates on the normal seed corpus: under 1 percent fallback and at least 95 percent unique full-map hashes. Force candidate rejection separately to cover fallback without inflating the normal-corpus rate.

Use the real enemy policy against deterministic stationary targets to prove obstacle detours and firing approaches; update the test-only player policy with independent route-aware pursuit where needed so its current Manhattan logic does not masquerade as a generator failure. Use multiple player policies for representative complete battles, recording both wins and losses. These simulations supplement structural guarantees.

Browser acceptance uses the production board and Playwright desktop plus portrait/landscape emulation: generated picking/movement after pan/zoom, reload at accepted player/enemy presentation boundaries, fallback, controlled invalid-content errors and the authored final slot. Record emulation accurately. Measure generator cost and cold/warm entry, tile variant counts and restart stability against existing performance requirements; avoid increasing grid size.

Production instrumentation measures one foreground resolver call at generated encounter entry or resume with the application monotonic clock. The existing telemetry adapter emits bounded duration, attempt count, generated/fallback/failed outcome and generator/profile versions. It excludes repeated internal save-validation resolutions, authored sources, assets and rendering; the pure domain receives no clock or telemetry dependency. Collection preferences, privacy allowlists and failure isolation remain authoritative. No seed, run ID, map hash, geometry or raw rejection details are reported.

## Risks / Trade-offs

- Conservative connectivity excludes isolated tactical islands → Keep v1 reversible; introduce capability-specific terrain only through a later contract.
- Dynamic unit congestion can still cause waits → Broad generated approaches, current-occupancy planning and adversarial chokepoint tests; do not claim all-state termination.
- Low obstacle density could feel repetitive → Quality corpus, contact-sheet review and measured route variation before enabling generated slots.
- Seed reconstruction can drift after edits → Explicit versions, canonical full-map hashes and golden generation fixtures.
- AI changes affect old saved decisions → Explicit rules compatibility and preserved incompatible bytes; compare uninterrupted and restored command suffixes.
- Existing boss example is not a new boss fight → Label it as authored-source integration; defer boss content and difficulty balancing.

## Migration Plan

1. Implement and verify pure source resolution, profile, validator and detour planner before changing the configured run.
2. Add descriptor-aware run save/replay construction and controlled format/version rejection. Retain recovery/export behavior and isolated single-battle storage.
3. Add desert terrain assets and production loading; enable the first two generated slots only after corpus, continuation and browser gates pass. Keep the final authored slot and existing single-battle entry.
4. Document format 2, source identities, playability limits and observed quality/performance. Update current human docs without rewriting completed historical OpenSpec artifacts.
5. Rollback by restoring authored source configuration; preserve new-format saves and report incompatible identities rather than converting or deleting runs. Keep raw saves available for recovery/export across rollback.
