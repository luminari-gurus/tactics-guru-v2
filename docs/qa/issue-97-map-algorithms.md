# Issue 97: map types

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/97. Caller: dubstylee. Branch: `work/issue-97-map-algorithms`, base `a8e115aa07aea4831419ae19b4b1db88c368fbe0`. User approved the shared contract and concrete OpenSpec plan on 2026-10-12.

## Generation contract and evidence

| Type ID | Label | Version | Walkable cells across 260 seeds | Distinct / 256 | Natural fallbacks / 260 |
| --- | --- | --- | --- | --- | --- |
| rooms | Rooms (default) | rooms-v1 | 65–171 | 256 | 0 |
| random-walker | Random walker | random-walker-v1 | 160 | 256 | 0 |
| cellular | Cellular caves | cellular-v1 | 108–270 | 256 | 0 |

Matrix: seeds 0–255 plus 12345, 424242, 2147483648 and 4294967295. Every result has 400 binary cells, blocked outer perimeter, 60–320 walkable cells and full four-direction connectivity. Existing Rooms matrix SHA256 over newline-separated cell signatures remains `d7dbea289cd9cdec54837ad1b0367a41a894b1503c5b9f862a4d54da5da6c8b0`, captured before edits from the base implementation. Unit tests independently flood-fill all types, repeat calls, reject invalid inputs, force bounded fallback and assert no battle RNG/state or clock/ambient entropy effects.

Random walker starts in the 18×18 interior, makes at most 2048 steps per attempt and stops at 160 distinct cells. It keeps its direction with probability 1/4 and otherwise draws a cardinal direction; it carves a one-cell side branch with probability 1/5. All carving is connected. Cellular starts with 48% open probability, runs four synchronous eight-neighbor smoothing passes (at least four open neighbors), then repairs cardinal components in row-major order with horizontal-first Manhattan corridors from the first open cell. At most 324 repair iterations each flood at most 400 cells and carve at most 34 steps. Both new types attempt at most four candidates then use the validated shared 80-cell rectangle fallback, retaining requested type/version and reporting fallback.

Each new attempt seeds fresh local RNG using `(seed ^ salt ^ Math.imul(attempt, 0x9e3779b9)) >>> 0`, with salts `0x57414c4b` for walker and `0x43415645` for cellular. Draw order/mixing are part of the algorithm version. Rooms retains its prior local RNG sequence. Forced constant RNG produces fallback for each type (0 for rooms/walker, 99 for cellular); tests bound RNG call counts and inspect fallback cells/metadata.

## Provenance and dependencies

Conceptual reference: [legacy generator](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/OverworldMapGenerator.gd) and [tests](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_m12_overworld_map_generator.gd) at pinned revision `e9433f6b608ae6b2d95418615cce9cf17dadcf74`. The six legacy types and deferral rationale are recorded in issue #97. This independently written TypeScript implementation copies no legacy or rot.js source, adds no dependency, and reuses the [issue 87 comparison](issue-87-overworld-map.md). Legacy tests were reviewed, not executed; 38×26 dimensions, POIs, floor progression, graph metadata and terrain mixing are not ported.

## Controls and sibling contract

Map type changes and Generate apply the displayed valid uint32 seed. New seed retains the committed type and chooses a different seed, including entropy failure/same-draw recovery. Invalid input preserves cells and committed type, restores dropdown selection and shows feedback. Native labeled controls support keyboard and minimum 44-pixel touch targets. Metadata exposes type/version/seed/fallback. Defaults reset on reload; no URL or persistence feature.

Approved #96/#98/#99 boundary: layout owns binary cells; biome owns a separate terrain layer that preserves layout and walkability. Initial biome IDs/versions are grassland/grassland-v1 (default), forest/forest-v1 and desert/desert-v1. Every biome supports every type; seed/type/version/biome/version reproduces map data, with fresh isolated biome RNG. Art defaults to `simple` and only renders existing topology/terrain, consuming no generation RNG. #98 inventories exactly one actual legacy style and assigns its stable ID from evidence, then documents coverage and uses readable Simple treatment on missing coverage or failed assets, with feedback and a matching legend. Biome/art dropdowns and implementation remain owned by #99/#98. This issue retains the current Simple presentation; it does not imply that all three biomes are already implemented.

## Validation

- Focused map unit suite: 19 passed.
- `npm run test:unit`: 391 tests passed; `npm run validate:content`: 77 content checks passed.
- `npm run build` (includes `npm run typecheck`, both TypeScript configurations): passed.
- `openspec validate issue-97-map-algorithms --strict` and `git diff --check`: passed.
- Prefixed `/prototype/map`: direct navigation, refresh and all three type/seed controls passed in Vite development and built preview; no page errors. Root-route checks run in the configured browser suite. No hosted prefix or physical device certification is claimed.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`: all 243 checks passed (81 each desktop, emulated Pixel 7 portrait and landscape), no failed/flaky/skipped cases, 12.9 minutes. An initial focused run exposed label text matching from a nested select and an OS-specific native popup arrow sequence; markup now uses an explicit associated label and keyboard coverage uses native type-ahead plus Tab.

## Bundle impact

Same build tool/dependencies as the unmodified base; byte/gzip sizes measured with Node gzipSync:

| Emitted chunk | Base raw / gzip bytes | Final raw / gzip bytes | Delta raw / gzip |
| --- | --- | --- | --- |
| Map view JS | 3457 / 1744 | 5770 / 2561 | +2313 / +817 |
| Map CSS | 1936 / 826 | 2025 / 846 | +89 / +20 |
| Shared RNG JS | 1651 / 789 | 1651 / 789 | 0 / 0 |

No new dependency, asset or battle-route module is added. The existing Phaser chunk-size and NO_COLOR/FORCE_COLOR warnings remain.

## Acceptance mapping

| Issue criterion | Evidence |
| --- | --- |
| Stable type IDs/versioned pure generators; Rooms retained | Typed catalog, metadata tests, unchanged baseline matrix fingerprint |
| 400 valid cells/nontrivial connected layouts/bounded retry/fallback | Independent per-type flood-fill and density/border matrix; forced bounded exhaustion |
| Repeatability/diversity/battle RNG isolation | Repeat calls, 256 distinct layouts/type, clock/entropy perturbation and battle RNG sentinel |
| Dropdown/valid seed/Generate/New seed retained selection | Existing browser suite extended for all types and invalid seed transaction |
| Unit/browser/typecheck/build results | Validation recorded above; full suite passed |

Biome/art implementation and physical device testing are outside this issue. The integration contract is documented; it does not claim #98/#99 completion.


## Visual review

Desktop seed 12345 screenshots inspected: [Rooms](issue-97-map-algorithms/desktop-rooms.png), [Random walker](issue-97-map-algorithms/desktop-random-walker.png), [Cellular caves](issue-97-map-algorithms/desktop-cellular.png). Rooms shows rectangular room/corridor structure, walker irregular winding paths and pockets, and cellular broader smoothed regions. All retain an enclosed perimeter, readable contrasting cells, matching legend and aligned controls. Inspected [mobile portrait](issue-97-map-algorithms/mobile-portrait-cellular.png) and [mobile landscape](issue-97-map-algorithms/mobile-landscape-cellular.png) screenshots: controls wrap cleanly in portrait, metadata remains readable, the complete grid and matching legend are reachable by vertical scroll, and no horizontal overflow appears. All three types were exercised in each profile.


Prefix check reproduction: build with `vite build --base=/prototype/ --outDir=/tmp/issue97-prefix-dist`; run development with `vite --base=/prototype/ --host 127.0.0.1 --port 4174 --strictPort` and built preview with `vite preview --base=/prototype/ --outDir=/tmp/issue97-prefix-dist --host 127.0.0.1 --port 4174 --strictPort`. Open `/prototype/map`, generate seed 424242 with each type, assert 400 cells/type metadata, then refresh and confirm Rooms default with no page errors. The temporary browser harness exercised these steps against both servers. Root build remained in `dist` for the full suite.

All issue #97 criteria and nine OpenSpec tasks are verified. Validation used the final runtime/test working tree; subsequent edits only finalize documentation and screenshots. No production operation or merge was performed.
