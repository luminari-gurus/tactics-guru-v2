# Issue #154 marker acceptance

Date: 2026-10-20 (Asia/Jerusalem). [PR #156](https://github.com/luminari-gurus/tactics-guru-v2/pull/156).

## Source and environment

Base: `1fee092d184fd99998f8e5e2766d45c216c6d5d8`.
Model checkpoint: `6a43bf3edb8f51ddcd6a9da4d1fdeaefbcd290b8`.
Final runtime and browser-test source: `30cf201295b5deded0572fb8a541e917a668ada5`.
Later commits contain documentation/evidence only.

The root preview was built from `6a43bf3` plus the UI changes subsequently committed
as `30cf201`; the prefixed build used `30cf201` directly. Runtime sources were unchanged
between those runs. WSL Node 24, Playwright 1.63.0, Chromium 153.0.8010.12:

- Desktop: 1280×720, DPR 1, keyboard/mouse.
- Pixel 7 emulation: 412×839, DPR 2.625, touch/mobile semantics.
- Landscape emulation: 915×412, DPR 2.625.
- Narrow spot checks: 320×568 in all three projects, including native touch activation.

This is local browser/device-emulation evidence. No physical-device, screen-reader,
production deployment or movement acceptance is claimed.

## Commands and results

Commands below run from the branch worktree. On this Windows-created worktree, WSL
builds need these command-local settings so Vite can read Git metadata:

```bash
export GIT_DIR=/mnt/c/Users/apexw/OneDrive/Desktop/Projects/Tactics-Guru/.git/worktrees/Tactics-Guru12
export GIT_WORK_TREE="$PWD"
export GIT_CONFIG_COUNT=2
export GIT_CONFIG_KEY_0=core.autocrlf GIT_CONFIG_VALUE_0=true
export GIT_CONFIG_KEY_1=core.filemode GIT_CONFIG_VALUE_1=false
```

These values are specific to this checkout; use the actual Git directory in another
worktree. Native Windows Git performs commits and pushes.

```text
npm run test:unit -- tests/unit/overworldMap.test.ts --maxWorkers=1
npm run typecheck
npm run build
npx playwright test tests/overworld-map.spec.ts --output=tmp/issue-154-final-results
PLAYWRIGHT_SERVER_MODE=dev npx playwright test tests/overworld-map.spec.ts --project=desktop --grep "controlled placement" --output=tmp/issue-154-failure-results
npm run build -- --base=/prototype/
PLAYWRIGHT_BASE_PATH=/prototype/ npx playwright test tests/overworld-map.spec.ts --grep "art styles|markers follow|markers survive|art uses" --output=tmp/issue-154-base-results
openspec validate issue-154-overworld-markers --strict
git diff --check
```

- **46 unit tests passed**: 260 seeds × 3 types × 3 biomes, exact stable IDs/kinds,
  four distinct walkable coordinates, independent flood-fill reachability, repeated equality,
  frozen inputs, nine marker snapshots at zero/one/max uint32, four selection draws,
  clock/entropy and battle RNG isolation, malformed/disconnected/dimension failure,
  and real marker placement after restoring the forced generator-fallback mock.
- **Build passed**: 190 content tests, both TypeScript configurations and Vite.
  The prefixed production build also passed. Existing bundle-size/future native-config
  warnings remain; no new dependency or generated art was introduced.
- **57 preview browser cases passed**, with **3 intentional dev-only skips**.
  [Full run](issue-154-overworld-markers/preview.txt).
- **1 controlled dev failure case passed**, covering the skipped source-interception path.
  [Failure/recovery run](issue-154-overworld-markers/failure.txt).
- **18 prefixed browser cases passed** across all three projects.
  [Configured-base run](issue-154-overworld-markers/base-path.txt).
- Strict OpenSpec, relative-document links and whitespace checks passed.

The initial full preview run had 56 passes and one test-helper race: artwork completion
could replace the cells between the helper's locator lookup and evaluation. Reading all
marker projections in one evaluation from the stable grid fixed the harness. The final
57-case run above passed without retries. An earlier WSL build attempt could not resolve
the Windows `.git` path; the explicit environment above fixed the invocation.

## Acceptance coverage

The browser helper compares every projected ID, kind, coordinate and cell index against
the real pure model, checks walkability, and asserts accessible counts/descriptions.
It does not treat four DOM elements alone as placement proof.

Real controls cover direct entry/reload, same-input Generate, returning to an old seed,
New seed including failed/repeated entropy, valid pending seed application by type/biome,
biome-only invariance, invalid selection rollback, and unapplied seed preservation under art changes.
Held requests are released after a newer seed/type/biome and art selection, with separate
success, network-failure and corrupt-decode cases. Initial/regeneration placement failure
preserves controls and the complete prior world through late artwork; successful retry clears it.
The fault fixture intercepts the development module and adds no production fault switch.

Existing tests continue to cover route-load recovery, matching terrain legends, bounded
art transfers, configured asset paths, no map assets on the battle route, no battle/audio
initialization on `/map`, and no game-save storage access. The shared privacy opt-out read remains allowed.

Pre-marker terrain fingerprints are unchanged for the 260-seed matrix:

- Rooms: `d7dbea289cd9cdec54837ad1b0367a41a894b1503c5b9f862a4d54da5da6c8b0`
- Walker: `dc2715ef5fc6b56526bd19300eea7157bada57f32ebdf580eff0ac70d3d3d893`
- Cellular: `31583dad387235929096a42f680f782551474198495569c9e6c54710f23dc88e`

## Visual review

Captured and inspected all 54 type × biome × art × viewport figures via nine contact
sheets, plus representative full pages and 320px captures. Circles and diamonds retain
their edges against grass, pines and sand; neighbors remain separate and inside their cells.
Terrain identity remains visible. Legends wrap without clipping or horizontal overflow.
The existing vertically scrolling inspection layout remains; controls keep 44px targets
and visible focus, with no overlay covering the map.

Selected retained evidence:

- [Desktop Rooms/Grassland](issue-154-overworld-markers/desktop-rooms-grassland.png)
- [Portrait Walker/Forest, Legacy 8-bit](issue-154-overworld-markers/portrait-walker-forest.png)
- [Landscape Cellular/Desert, documented Simple fallback](issue-154-overworld-markers/landscape-cellular-desert.png)
- [320px Forest, Legacy 8-bit and keyboard focus](issue-154-overworld-markers/narrow-320-forest.png)
- [Rooms across all biomes/art styles](issue-154-overworld-markers/rooms-art-matrix.png)

The contact sheet is a labeled visual-review composition of captured figures. Full-page
PNGs are original browser screenshots. The committed browser suite regenerates the full
matrix and figure captures; no generated sprite assets are needed.

## Review handoff

All seven acceptance bullets in #154 are covered. The exported readonly model and
`markers-v1` policy are documented in the [map guide](../overworld-map.md#marker-model).
Issue #155 can transform retained state rather than reading DOM coordinates. Movement,
combat and persistence remain outside this PR. The OpenSpec change stays active for review.
