# Issue #6 — authored board rendering and picking

Scope: default Forest Ruins scene, pure projection/picking and render-data helpers, canonical units, tile highlights, canopy occlusion and scene-owned input cleanup. The proof renderer remains at `/?scene=proof` for its existing art/audio/lifecycle diagnostics; the measurement collector now selects that URL explicitly. No new raster art, combat rules or renderer-owned combat state was introduced.

## Behavior and evidence

| Requirement | Implementation and proof |
| --- | --- |
| Elevation, projection, resize, pan/zoom and DPR | Shared 80×40 projection and solid-face picking; `tests/unit/{iso,picking,boardPresentation}.test.ts`; `tests/battle-board.spec.ts` selects visible tops/side faces at elevations 0/1/2, resizes portrait/landscape, pans/zooms and changes live DPR between 1 and 3. Terrain corners match the projected diamond within 0.001 scene pixels. |
| Canonical units and stable ordering | All 144 authored cells and six spawns resolve from the validated catalog. Origins use each sprite's pixel foot anchor divided by runtime dimensions; all sprites draw at 40×50. Shared `tileDepth` reserves three layers per column and uses map height for rectangular-board ties. Browser checks assert actual child depth order and foot/terrain alignment, including Ranger movement onto elevation 1. |
| Active, selected and reachable states | Gold tile border/ring for the active unit; inset white selection; translucent teal reachable surfaces. `BattleScene` obtains reachable previews and dispatches explicit move/turn commands through the pure domain; `BoardRenderer` only presents snapshots. Screenshots show both selection and active/reachable markers. |
| Canopy occlusion | Forest cells draw vector foliage and separate opaque trunks. Only a nearer canopy overlapping living unit art fades to 35%. Pure fixtures cover depth, overlap, elevation and trunk-only overlap. Browser movement takes Grunt #6 to (8,7) behind foliage, then (8,9) in front; opacity and snapshot positions update through legal domain commands. |
| Intended mouse/touch picking and gesture completion | Art passes input to the visible solid top/side face. Click/tap only selects; movement requires the explicit button. Browser checks cover pan release, touch pinch with a trailing pointer and touch cancellation without selection or gameplay commands. A RED-first unit regression fixes held-pointer wheel zoom followed by release accidentally selecting. |
| Teardown and repeated restart | Input shutdown removes six canvas bindings and the visibility binding, releases capture and restores touch style. Scene shutdown also removes resize/button bindings and disconnects the panel observer. Four browser restarts keep object/canvas counts stable; each input and turn click produces exactly one event/command. Every catalog asset is requested only once across those restarts. |
| Controlled loading | The default scene rejects missing/corrupt canonical sprites visibly and leaves controls disabled. Existing content smoke tests retain malformed, unknown, missing, corrupt and timeout coverage. Cached textures are dimension-checked and reused on restart. |

The first authored-board browser tests failed against the previous default proof scene (`Ready` instead of `Battle ready`). Pure presentation/canopy fixtures were added before their implementations. The held-pointer wheel regression failed with one unintended selection before the input fix, then passed with zero selections and a subsequent normal tap still working.

## Screenshots

- [Portrait, 390×844](issue-6/authored-portrait.png)
- [Landscape, 844×390](issue-6/authored-landscape.png)
- [Elevated selection](issue-6/selected-elevated.png)
- [Unit behind canopy](issue-6/canopy-behind.png)
- [Unit in front of canopy](issue-6/canopy-front.png)

These are production-preview Chrome screenshots captured by the authored-board tests. Portrait fits the entire map; zoom/pan lets touch users inspect and select the smaller fitted cells. Visual inspection confirmed top-down terrain mapping, joined elevated columns, feet on their projected surfaces, marker visibility and canopy fading.

## Validation

Environment: installed Google Chrome on macOS; Playwright desktop, Pixel 7 portrait and Pixel 7 landscape emulation. Browser launch uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`. Preview and browser launch require the host's sandbox permission.

- `npm run test:unit -- tests/unit/boardPresentation.test.ts tests/unit/iso.test.ts tests/unit/picking.test.ts`: 14 passed for the first slice.
- `npm run test:unit`: 215 passed after the complete renderer/input changes.
- `npm run validate:content`: 77 passed.
- `npm run typecheck`: passed, including the DOM-free domain/content configuration.
- `npm run build`: passed. The existing large Phaser chunk warning remains.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test -- tests/battle-board.spec.ts`: 15 passed before the two canonical-load-error cases were added.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test -- tests/layout.spec.ts`: 18 passed after updating the helper to exclude controls in hidden scene groups.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`: 138 passed (3.5 minutes), including all 21 authored-board checks across the three profiles.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run measure:fit -- /tmp/issue-6-proof-measurement.json`: 18 cold/warm samples recorded without console/page errors at `http://127.0.0.1:4174/?scene=proof`. This verifies collector compatibility; it is not an authored-battle performance claim. The measured build was the verified dirty implementation on base commit `0cbf2aaee1b013c24681ecb1f1ae140d6b85f7c1`.
- `git diff --check`: passed.

## Limits

Physical iPhone Safari/Chrome and Android touch hardware are unverified. Chromium touch emulation and DPR overrides do not establish physical-device acceptance, safe-area behavior, OS interruptions or browser-chrome resizing. The PR references #6 without an automatic closing instruction.

The controller supplies movement and turn advancement for inspecting the renderer on either side. Enemy AI, attacks, combat animation, full camera rotation, generated art and deployment are outside this change. Restart advances a deterministic session seed; this is not a save/replay UI.
