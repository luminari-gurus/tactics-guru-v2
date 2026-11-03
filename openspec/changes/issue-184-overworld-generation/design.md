# Design

## Context

The caller approved the initial plan on 2026-11-03 and subsequently requested that deeper dungeon floors progressively increase in size. The revised size policy below requires approval before implementation.

`src/map/generate.ts` implements 20×20 rooms, walker and cellular with local seeded draws and validation. `src/domain/dungeon.ts` hard-codes rooms-v1 in its descriptor, cache, admission and regeneration paths; exploration and UI also resolve maps. Existing saved hashes are authoritative compatibility boundaries.

## Goals / Non-Goals

**Goals:** Compare all four missing families; ship genuinely distinct profiles with bounded, reproducible results and integrate them through inspection and durable floor consumers. Keep all five issue acceptance criteria and current budgets.

**Non-Goals:** Fog, lighting, content packs, editor, changes to battle RNG, or a renderer replacement.

## Decisions

- Begin with a fixed-seed comparison of Digger, Rogue, sector graph and Arena against Rooms, measuring connectivity, floor area, room/corridor structure, choke points, placement capacity, fallback frequency and runtime. Document equivalent families; implement the distinct selected ones, not aliases. Compare at matching sizes, including the initial and maximum dungeon sizes; retain the existing 20×20 inspection default.
- New floors use square dimensions of 20 at depth 1, increasing by four cells per side per depth to 36×36 at depth 5 and deeper. This bounded initial policy limits rendering, traversal and saved-state cost in an endless dungeon; validate it on desktop and emulated mobile before acceptance. Save explicit dimensions in new versioned descriptors and include them in generation identity and cache keys. Legacy rooms-v1 descriptors without dimensions retain their exact 20×20 behavior and hashes. Size is determined when a floor is created and never recomputed for existing floors.
- Replace fixed 20/400 indexing and fixed-size validation in generation, exploration, marker/movement placement, dungeon UI and save admission with dimensions from the floor; reject invalid, oversized or mismatched descriptors. Maintain cardinal connectivity and profile-specific minimum placement capacity. The original 320-cell maximum belongs to the 20×20 prototype, not a universal density rule; permit a fully open interior for Arena while retaining its blocked perimeter.
- Prefer local bounded algorithms using existing immutable seeded RNG; evaluate rot.js against that approach. Its singleton RNG and time-limited generators cannot be used as durable identity without proven isolation and deterministic bounds. If selected, isolate through an adapter, pin and document version/license and cost. Do not change the domain boundary.
- Persist a versioned generator descriptor for newly created floors and dispatch all cache, validation, map resolution, stairs, POI and traversal paths by that identity. Preserve rooms-v1 byte-for-byte for existing floors and reject unknown or mismatched identities rather than silently regenerate. Choose new-floor profiles deterministically from an independent derived seed; never alter existing floors or battle streams. Cache keys include generator, seed and dimensions.
- Keep biome and art separate. Test generator output and placement with seed corpora, adversarial cases, fallback and interleaved streams. Compare existing save fixtures before and after; exercise new floors, revisit and resume through real UI.

## Risks / Trade-offs

- [Profile equivalence or runtime is uncertain] → retain comparison evidence and do not ship duplicate or budget-breaking algorithms.
- [Larger grids may impair touch readability or exceed budgets] → keep controls usable, use scrolling or another accessible viewport as needed, and measure the largest supported floor rather than shrink tiles silently.
- [Broad save/lifecycle impact] → inventory consumers before changes, preserve old descriptors and fixtures, and use full-regression policy for shared save/admission changes.
- [Concurrent #259 route/save changes] → inspect merged current base before implementation and reconcile without changing its route boundary.

## Migration Plan

Old rooms-v1 descriptors keep their original resolver and hash. New descriptors identify the new generator version. Unknown versions fail through existing recovery; rollback cannot necessarily read newly created profile saves, so document this limitation and do not silently rewrite them.
