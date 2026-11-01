# Tasks

## 1. Movement profiles

- [x] 1.1 Implement passive/chase/block profiles and pass the pre-step target separately from actual occupancy in `src/map/movement.ts` and `src/domain/dungeon.ts`; verify detection and routing divergence with focused map units.
- [x] 1.2 Extend existing map units for adjacent, unreachable, blocked, multi-enemy, contested old/new cells, no overlap, stable ordering, passive RNG and rejected steps; run the affected unit files.
- [x] 1.3 Update `docs/overworld-map.md` and `docs/dungeon.md` with assignments, targeting and actual collision/encounter behavior; check documentation against implementation.

## 2. Dungeon integration and compatibility

- [x] 2.1 Verify current envelope, legacy exploration and profile compatibility; add dungeon/session tests for deterministic save/resume, direct encounter entry, stairs, rejected steps and actual occupancy; run affected unit files. If compatibility requires a format or rules identity change, revise the plan and obtain approval first.
- [x] 2.2 Exercise both pursuit profiles in reproducible real dungeon Playwright journeys with a step that distinguishes their movement; include desktop keyboard and mobile portrait/landscape touch and relevant WebKit exploration profiles. Discover selected IDs and retain reports, failures and skips.

## 3. Integration verification

- [x] 3.1 Map affected consumers and apply `docs/verification-policy.md`: run relevant map/dungeon/session/storage units, both type scopes and production build, affected exploration/lifecycle browser journeys and required engine/device cases; use full regression if shared runtime/persistence reach is unbounded. Record final source/build identity and evidence reuse.
- [x] 3.2 Compare every issue criterion and approved plan against results; run `git diff --check` and record any limitations before PR creation.
