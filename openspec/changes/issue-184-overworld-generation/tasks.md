# Tasks

## 1. Compare profiles

- [ ] 1.1 Compare Digger, Rogue, sector graph and Arena against Rooms on fixed seeds; record equivalence, topology, capacity, runtime and fallback evidence and select distinct profiles.
- [ ] 1.2 Evaluate local bounded algorithms versus rot.js, including RNG isolation, determinism, license and bundle cost; document the chosen approach and size/density and budget basis.

## 2. Generate and inspect

- [ ] 2.1 Implement selected versioned profiles with bounded attempts and deterministic validated fallback; verify seed corpora, extremes, interleaving, independence, placements and existing profiles in unit tests.
- [ ] 2.2 Expose selected profiles in map inspection, retain orthogonal biome/art choices, and verify keyboard and desktop/portrait/landscape touch presentation in Playwright; update overworld documentation.

## 3. Durable floors

- [ ] 3.1 Map all descriptor, cache, regeneration, exploration, placement, stairs and UI consumers; implement profile-aware durable floor resolution and validate existing rooms-v1 fixtures and unknown/mismatched versions.
- [ ] 3.2 Verify legal placements, deterministic profile selection, battle RNG isolation, traversal, floor revisit and save/reload with focused units and real dungeon browser journeys; document compatibility and rollback limits.

## 4. Integration qualification

- [ ] 4.1 Measure production size, generation and rendering against documented budgets on identified source and device profiles; retain failures and limitations.
- [ ] 4.2 Apply verification-policy full regression where shared save/admission changes require it, including both type scopes, build, Chromium, WebKit and distinct modes; record source/build identity, skips and failures and run git diff --check.
