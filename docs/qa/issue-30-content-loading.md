# Issue 30: content loading and tile surfaces

Open `/?scene=content-smoke` using the dev or production preview server. This separate diagnostic validates the authored catalog before queuing all 15 catalog assets into Phaser under their exact asset IDs. Generated terrain IDs resolve through `terrains[id].surfaceAssetId` to catalog runtime paths in `/battle/terrain/`. Sprites and portraits are loaded and dimension-checked, but this fixture renders only terrain.

The fixture uses two adjacent tiles for each of grass, grass path, stone, forest floor and water. It reuses `projectTile`, `tileFaces`, `boardBounds`, `fitBoard`, `TILE_WIDTH` and `TILE_HEIGHT`. A square rotates 45 degrees and is compressed vertically to the existing 2:1 diamond. Image-up maps toward the diamond's top-right edge; source artwork contains no baked geometry. Corners and shared edges are checked against actual Phaser world transforms with a 0.001 CSS pixel rounding tolerance. No alternate terrain defaults or board renderer are introduced.

Content validation errors, HTTP failures, image decode failures, wrong dimensions and loads exceeding ten seconds prevent readiness and display a controlled error with reload instructions. The loader owns its listeners and deadline through scene shutdown. `&contentFixture=1` is an explicit test-only input path: Playwright intercepts `/battle/content-fixture.json` with deterministic malformed/unknown-reference catalog variants. No fixture file ships, and an unavailable fixture displays an error.

Provenance remains in `src/content/assets.ts`, `docs/first-battle-content.md` and the approved issue 27 exports. No texture/source/provenance bytes were changed. Full authored-board rendering/picking, canopy and selection remain issue 6. This evidence uses installed desktop Chrome and Playwright Pixel 7 emulation; it makes no physical-device or iPhone certification claim.

## Verification

Base: `origin/main` at `ceaccb7`; prerequisites 29 and 2 were completed before implementation.

RED: before implementing the scene, installed-Chrome desktop checks failed for success, malformed content, unknown reference and missing texture because the old proof returned `Ready`. The stalled check ran after the new build was produced and is not claimed as RED evidence. Initial infrastructure attempts encountered sandbox server restrictions and an absent bundled Playwright browser; subsequent checks use installed Chrome explicitly.

Browser commands use:

```sh
export PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
npx playwright test tests/content-loading.spec.ts
npm test
```

- `npm run validate:content`: 77 tests passed (2 files).
- `npm run test:unit`: 206 tests passed (19 files).
- `npm run typecheck`: both application and DOM-free domain/content strict checks passed.
- `npm run build`: passed; existing large Phaser chunk warning remains.
- `git diff --check`: passed.

Focused screenshots include successful desktop/portrait/landscape renders and controlled malformed-content/missing-texture states. `npx playwright test tests/content-loading.spec.ts` passed all 18 focused tests across desktop and both mobile layouts. `npm test` passed all 117 configured browser tests in 3.2 minutes. After screenshot review found long error text clipping, the final change shortened the message and enabled wrapping; `npx playwright test tests/content-loading.spec.ts tests/layout.spec.ts` passed all 36 relevant content/layout tests on that final build.

Retained visual evidence: [desktop](issue-30/desktop.png), [portrait](issue-30/portrait.png), [landscape](issue-30/landscape.png), [malformed content](issue-30/malformed.png), [missing texture](issue-30/missing.png). Successful renders show the approved materials without baked perspective or visible gaps. Browser output also retains corrupt-image, unknown-reference, timeout and resized screenshots in ignored `test-results/`.
