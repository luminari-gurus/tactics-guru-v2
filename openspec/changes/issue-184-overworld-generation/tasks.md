# Tasks

## 1. Compare profiles

- [x] 1.1 Compare Digger, Rogue, sector graph and Arena against Rooms on fixed seeds; record equivalence, topology, capacity, runtime and fallback evidence and select distinct profiles.
- [x] 1.2 Evaluate local bounded algorithms versus rot.js, including RNG isolation, determinism, license and bundle cost; document the chosen approach and size/density and budget basis.

## 2. Generate and inspect

- [x] 2.1 Implement selected versioned profiles with bounded attempts and deterministic validated fallback; verify seed corpora, extremes, interleaving, independence, placements and existing profiles in unit tests.
- [x] 2.2 Expose selected profiles in map inspection, retain orthogonal biome/art choices, and verify keyboard and desktop/portrait/landscape touch presentation in Playwright; update overworld documentation.

## 3. Durable floors

- [x] 3.1 Map all descriptor, cache, regeneration, exploration, placement, stairs and UI consumers; implement profile- and dimension-aware floor generation, indexing, placement, movement, rendering and durable resolution; validate the depth-size policy, existing rooms-v1 fixtures and unknown/mismatched or oversized versions.
- [x] 3.2 Verify legal placements, deterministic profile selection, battle RNG isolation, traversal, floor revisit and save/reload at initial and larger sizes with focused units and real dungeon browser journeys; document compatibility and rollback limits.

## 4. Integration qualification

- [x] 4.1 Measure production size, generation and rendering at initial and maximum floor dimensions against documented budgets on identified source and device profiles; retain failures and limitations.
- [x] 4.2 Apply verification-policy full regression where shared save/admission changes require it, including both type scopes, build, Chromium, WebKit and distinct modes; record source/build identity, skips and failures and run git diff --check.

Qualification is recorded in [PR #279](https://github.com/luminari-gurus/tactics-guru-v2/pull/279) with exact tested sources and existing CI artifact links. It combines fresh affected checks with source-specific reuse under the verification policy; historical failed and interrupted aggregates retain their original status.
