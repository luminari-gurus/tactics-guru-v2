# Issue 99 biome acceptance

[Issue #99](https://github.com/luminari-gurus/tactics-guru-v2/issues/99) · [Approved design](../../openspec/changes/issue-99-map-biomes/design.md) · [Terrain contract](../overworld-map.md).

Explicit approval was received in the task conversation before implementation. Branch `work/issue-99-map-biomes` is based on merged main `be7094aa105fb2b21c90610f411e16c4ef15ae25`. Local validation occurred on 2026-10-12–13 (America/New_York), from planning HEAD `b6873553622fd23779cd2bb0442f8c6657df9611` with the implementation working tree dirty. These results bind to the runtime/test source hashes below, not an assertion that the final PR commit was already built. Documentation/task completion changes do not change those bytes.

## Results

| Command | Result |
| --- | --- |
| `npm ci` | Installed pinned dependencies, zero audit vulnerabilities; existing optional fsevents install-script notice |
| `npm run test:unit -- tests/unit/overworldMap.test.ts` | 27 passed |
| `npm run test:unit` | 399 passed, 29 files |
| `npm run validate:content` | 77 passed, 2 files |
| `npm run typecheck` | Both configured TypeScript checks passed |
| `npm run build` | Root production build passed, including both typechecks |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test -- tests/overworld-map.spec.ts` | 24 passed; initial focused check before the final rendering loop was changed to read terrain directly |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test` | 249 passed in 13.0 minutes on final runtime bytes |
| `npx vite build --base=/prototype/ --outDir=/tmp/tactics-issue-99-prefix` | Prefix production build passed on final runtime bytes |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npx playwright test --config=tmp/issue-99-prefix.config.ts --grep=biome` | 6 passed in 8.0 seconds, all nine combinations plus selection/validation behavior in three profiles |
| `openspec validate issue-99-map-biomes --strict` | Passed |
| `git diff --check` | Passed |

Browser: installed Chrome **155.0.8059.40**. One worker, configured desktop Chrome and emulated Pixel 7 portrait/landscape projects. Root preview: `http://127.0.0.1:4173`; prefix: `http://127.0.0.1:4175/prototype/`. Root and prefix builds retain the existing large Phaser chunk warning; prefix outDir warns that an external directory is not automatically emptied. No dependencies or battle implementation changed.

## Acceptance mapping

| Criterion | Evidence |
| --- | --- |
| AC1: defined roster, treatments, semantics/defaults/compatibility | Contract documents Grassland/Forest/Desert, six terrain IDs, versions, exact palettes/motifs, default Grassland/Simple and all nine combinations; legends assert matching backgrounds |
| AC2: selection/Generate/New seed | Real-control browser tests verify valid edited seed on both selects, Generate reproduction, New seed retained choices, entropy denial/repeated value, invalid rollback and refresh defaults |
| AC3: deterministic isolated data/rendering | Pure 400-cell mapping consumes no RNG; repeat/return-to-biome/frozen-input tests, denied entropy/clock/draws, unchanged battle and next RNG; renderer reads retained terrain only |
| AC4: nine valid connected combinations | All nine combinations across seeds 0–255, 12345, 424242, 2147483648 and 4294967295; exact cells preserved with independent topology inspection and forced layout fallback tests; Rooms fingerprint retained |
| AC5: distinguishable Simple and readable fallback | All 27 root screenshots visually reviewed; distinct light-open/dark-blocked palettes and canopy/rock motifs, matching legends, controls/grid readable with no overflow. Simple covers all terrain IDs; no imported art exists here; #98 owns actual imported coverage/failure integration |
| AC6: checks and recorded results | Unit/content/browser/typecheck/build/strict/whitespace results above; direct map navigation and refresh checked at root and prefix; root isolation test switches all nine combinations without initializing battle/audio/storage and confirms normal battle startup |

No unsupported type/biome combinations exist. No new generation fallback is needed: biome treatment always preserves the existing valid layout and fallback identity.

## Screenshot review

Each sheet contains Rooms, Random walker and Cellular rows, and Grassland, Forest and Desert columns, seed 12345. The sheets are assembled from the nine original full-page screenshots in each profile. Review found readable light/dark topology, matching terrain legend, distinct motifs and wrapped mobile controls/status without horizontal overflow. Landscape pages scroll normally to the full map/legend. Original full-resolution images remain in ignored `test-results/overworld-map-biome-combin-*/` output; rerunning the committed tests recreates them.

- [Desktop sheet](issue-99-map-biomes/desktop.jpg)
- [Mobile portrait sheet](issue-99-map-biomes/mobile-portrait.jpg)
- [Mobile landscape sheet](issue-99-map-biomes/mobile-landscape.jpg)

## Prefix harness reproduction

Create an ignored `tmp/issue-99-prefix.config.ts` from repository root:

```ts
import { defineConfig } from '@playwright/test';
import original from '../playwright.config';
export default defineConfig({
  ...original,
  testDir: '../tests',
  testMatch: '**/overworld-map.spec.ts',
  outputDir: './issue-99-prefix-results',
  use: { ...original.use, baseURL: 'http://127.0.0.1:4175/prototype/' },
  webServer: {
    cwd: process.cwd(),
    command: 'npx vite preview --host=127.0.0.1 --base=/prototype/ --outDir=/tmp/tactics-issue-99-prefix --port=4175 --strictPort',
    url: 'http://127.0.0.1:4175/prototype/map',
    reuseExistingServer: false,
  },
});
```

The preview command is:

```sh
npx vite preview --host=127.0.0.1 --base=/prototype/ --outDir=/tmp/tactics-issue-99-prefix --port=4175 --strictPort
```

Readiness URL: `http://127.0.0.1:4175/prototype/map`. The biome tests use relative `map` navigation so the same committed tests exercise the prefix. Two initial harness attempts timed out before tests started; the first lacked explicit cwd, and the retry exposed localhost IPv6 binding versus IPv4 readiness. Explicit repository cwd and host resolved readiness; final six checks passed. These harness failures were not application regressions.

## Source binding

| File | SHA-256 |
| --- | --- |
| `src/map/biomes.ts` | `95d3134c4e4b0d1146840a29c4199e5f37dffc350290af15c975396dcc45eceb` |
| `src/map/view.ts` | `eafa1b855cfd82d75fd86af3ffc81b23d9e8bf431f7e3ba7c1381dc01fc5527b` |
| `src/map/style.css` | `b995c84b25536277f954c04146867efa422e6fdf1171eded0e5ae234c7fe658b` |
| `tests/unit/overworldMap.test.ts` | `fcec7cef84eef51d2f21ff1d488774fb75722c0588d3887406833729271b163a` |
| `tests/overworld-map.spec.ts` | `8b7ecd6a12702d59b01742b3215f1b1a791a81e894f4eb641d953671a17ebaae` |

## Limits

Emulated mobile screenshots/checks are not physical-device certification or hosted-prefix proof. No deployment, merge or release occurred. Imported artwork and its Art style control belong to #98; current Simple presentation fully covers the approved #99 scope. Existing battle/proof prefix issue #92 is covered by unmerged PR #95 and was not taken over or certified by these map-only prefix checks. No unresolved #99 visual/product decision remains.
