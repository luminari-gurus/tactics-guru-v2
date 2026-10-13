# Issue 98 map artwork verification

Issue [#98](https://github.com/luminari-gurus/tactics-guru-v2/issues/98) adds Simple and Legacy 8-bit presentation to the existing map type and biome controls. The caller approved [the concrete plan](../../openspec/changes/issue-98-map-art/design.md) on 2026-10-13. Base: main `63c232183c1bee3f3cf68d2f919febc286f47abd`; branch: `work/issue-98-map-art`. Checks below ran against the implementation working tree based on planning commit `4315ca9`.

## Acceptance evidence

| Criterion | Evidence |
|---|---|
| AC1 legacy style and inventory | Native Simple/Legacy 8-bit options; exactly three unchanged runtime PNGs. [Pinned inventory](../art/issue-98/README.md) distinguishes raster 8-bit from code-drawn Current/ASCII and excluded isometric battle families. Runtime/source SHA-256 checks passed. |
| AC2 independent switching | Browser comparisons preserve every cell class, terrain ID, seed, algorithm/type/biome/version and layout fallback across all 18 combinations. Source art path calls no generator/biome/RNG operation. Pending valid seed edits remain displayed; invalid art changes roll back; Generate/New seed retain art. |
| AC3 coherent desktop/mobile art | 54 screenshots cover 18 combinations on desktop and Pixel 7 portrait/landscape. Reviewed all three contact sheets and original representative screenshots. Grass clearing reads as open, pines and mountain motifs as blocked; dark blocked outlines remain visible; legend styles match cells; no horizontal overflow; Art style control meets 44px minimum. |
| AC4 coverage and failure | Desert explicitly renders Simple sand/rock with feedback. Network-aborted and invalid-PNG cases retain successful grass artwork and use Simple blocked terrain with a matching legend. A delayed load after switching to Simple preserves the latest style, invalid input and validation. |
| AC5 base path and bounded loading | Built root and `/issue98/` direct entry/refresh passed. No image requests for initial Simple, desert-only Legacy or battle visits. Grassland initially needs two PNGs; forest adds one. Local browser Resource Timing records three bodies totaling 1,118 bytes and 2,018 transfer bytes. |
| AC6 records and regression | Source/export manifest updated; legacy provenance and license/creator gap retained. Unit/content/type/build and focused root/prefix checks pass. Full configured browser suite passed all 336 checks with no skips or retries. |

## Visual evidence

- [Desktop all combinations](issue-98/desktop-all-combinations.jpg)
- [Mobile portrait all combinations](issue-98/mobile-portrait-all-combinations.jpg)
- [Mobile landscape all combinations](issue-98/mobile-landscape-all-combinations.jpg)
- Original Rooms screenshots for [desktop grassland](issue-98/desktop-grassland.png), [mobile portrait forest](issue-98/mobile-portrait-forest.png), [mobile portrait desert fallback](issue-98/mobile-portrait-desert.png), and [mobile landscape forest](issue-98/mobile-landscape-forest.png). Other representative originals are retained alongside them.

## Asset and bundle sizes

The legacy source PNGs are preserved byte for byte: grass 277 bytes, pines 435 bytes, mountain 406 bytes. Local uncached Resource Timing transfer sizes are 577, 735 and 706 bytes respectively (browser-reported 300 bytes of overhead per image). These are local preview measurements, not production CDN measurements. [Failure transfer records](issue-98/failure-transfers.json) show the aborted mountain request at 0 body/transfer bytes plus successful grass at 277/577; corrupt PNG response at 13/313 plus grass at 277/577. Both cases confirm partial Simple fallback. Intercepted failures are local test conditions, not production traffic.

Comparable Python `gzip.compress` measurements of root map chunks:

| Chunk | Base bytes / gzip | Implementation bytes / gzip | Added bytes / gzip |
|---|---:|---:|---:|
| Map JS | 7,051 / 2,884 | 8,836 / 3,488 | 1,785 / 604 |
| Map CSS | 2,375 / 965 | 2,617 / 1,032 | 242 / 67 |
| Total | 9,426 / 3,849 | 11,453 / 4,520 | 2,027 / 671 |

These gzip sizes use the same local compressor for comparison, not a claim of server encoding. No new dependency or atlas enters the runtime. [Bundle records](issue-98/bundle-sizes.json) and [prefix run/transfer records](issue-98/prefix-test-summary.json) and [full root run/transfer records](issue-98/root-test-summary.json) retain actual values.

## Validation commands

| Command | Result |
|---|---|
| `npm run test:unit` | 446 tests, 30 files passed |
| `npm run validate:content` | 77 tests, 2 files passed |
| `npm run typecheck` | Both application and strict domain checks passed |
| `npm run build` | Passed; existing large battle chunk warning |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test -- tests/overworld-map.spec.ts` | 42 checks passed, all three configured projects |
| Full configured `npm test` with the same Chrome executable | 336 passed in 15.9 minutes; 0 skipped, 0 flaky |
| `npm run build -- --base=/issue98/ --outDir=/tmp/issue98-prefix-dist` | Passed |
| Artwork browser checks against built prefix | 18 checks passed, all three projects, no skips/flakes |
| `openspec validate issue-98-map-art --strict` | Passed |
| `git diff --check` | Passed |

The prefix run uses the existing Playwright projects through an external temporary config with baseURL `http://127.0.0.1:4174/issue98/`, testDir pointing to repository tests, and preview command `npm run preview -- --base=/issue98/ --outDir=/tmp/issue98-prefix-dist --port 4174 --strictPort`. Test selection: `tests/overworld-map.spec.ts --grep 'art '`. It changes no repository test infrastructure and allows root regression checks to run independently on port 4173.

## Limits

Mobile results are Chrome Pixel 7 emulation, not physical-device Safari/Android certification or production hosting proof. No new artwork, deployment, merge or battle art replacement occurred. The legacy procedural set still lacks an explicit named creator/license entry; the inventory records that gap without asserting CC0. Desert intentionally falls back to Simple under the approved shared contract.
