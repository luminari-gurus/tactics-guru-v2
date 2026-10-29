# Authored encounters

Current source audit: `b343ab02ae033a57f8c5f613f07883764f0752c0`. The standalone battle uses authored Forest Ruins. The production short run uses two seeded generated Desert battlefields and the authored Ruined Approach finale, as configured in [encounters.ts](../src/content/encounters.ts); carried heroes, items and continuation are integrated by [run session](../src/app/RunItemSession.ts). The three authored maps below remain validated content and regression fixtures. See [run contract](run-contract.md) and [dungeon](dungeon.md) for their separate production flows.

## Historical #76 authored package

Issue [#76](https://github.com/luminari-gurus/tactics-guru-v2/issues/76) supplied the original fixed content for #80. The following handoff and evidence describe that historical slice, not the current production run.

| Order | Encounter ID / map suffix | Layout | Hero spawns (IDs 1/2/3) | Enemy spawns (IDs 4/5/6) |
| --- | --- | --- | --- | --- |
| 1 | `forest_ruins` | Existing forest, raised stone ruins and water | Fighter (1,8), Ranger (2,8), Mage (1,9) | Grunt (8,4), Archer (9,2), Grunt (8,5) |
| 2 | `woodland_crossing` | Water rows 5/6; dry approaches at columns 3/8; forest cover and a raised northern firing position | Fighter (3,9), Ranger (4,9), Mage (3,10) | Grunt (3,3), Archer (7,2), Grunt (8,4) |
| 3 | `ruined_approach` | Stone court at columns 4–7, rows 4–7; elevation-1 entrances at rows 4/7 lead to elevation 2; grass flanks | Fighter (5,9), Ranger (6,9), Mage (5,10) | Grunt (4,5), Archer (7,5), Grunt (8,3) |

IDs are `encounter:<suffix>` and `map:<suffix>`. Every board is 12×12. No procedural generation or extra RNG draw creates cells. The exact map hashes and original battle content identity are retained in the unit snapshots. Existing [first battle content](first-battle-content.md) and [asset metadata](../src/content/assets.ts) document provenance/conversion. All 15 asset records are reused unchanged; no artwork or conversion was added. Existing forest vector canopies and terrain surfaces are reused.

## Integration handoff

`src/content/encounters.ts` exports `authoredRun`, `authoredEncounters`, `runCatalog`, `readEncounters` and `projectEncounterSpawns`. The reader validates unknown catalogs and exactly three ordered encounter records before resolving maps. It reuses bounded content validation, then checks distinct IDs/maps, one canonical hero spawn each and enemies. Required art passes existing file checks and the runtime asset loader.

The projection takes the encounter ID and either all carried heroes (zero HP omitted from spawns) or `describeRunBattle`'s living subset. It rejects empty/all-dead, duplicate/unknown heroes and unsafe/out-of-range HP. Its owned map copy retains numeric spawn IDs and enemies. #80 must compose it with authoritative carried-HP construction and compatible replay/content identity. The projection does not restore HP, construct a playable run or grant rewards. Validate the complete base roster before projecting; the survivor map intentionally lacks defeated-hero spawns. Filtering spawns changes the projected catalog identity and expected unit count, so #80 must use the same projected content for battle construction, replay and restore, rather than decoding it against the complete roster. Keep this run catalog separate from `battleCatalog`: its extra maps change content identity while the default catalog hash remains unchanged.

The 21 map/subset fixtures use one-HP survivors and test-only state construction; they validate the resulting state and explore legal moves/turns with authoritative movement and attack previews until each surviving hero can engage an enemy. Stationary enemies and no-damage turns prove routes and target eligibility, not survival, balance or full-run completion. #81 owns that playtest and physical certification; #57 still gates feature release.

## Verification

Unit suite: 560/560; focused encounter fixtures: 52/52; content validation: 129/129. Strict TypeScript checks and root and `/prototype/` production builds pass. `npm run build` runs content validation before type checking and bundling, so malformed encounter data is rejected during the build as well as by the runtime reader. `npm test` runs the existing production-preview suite then the isolated dev-entry encounter suite, serially. Full browser regression: **336/336** in 16.0 minutes; encounter suite: **18/18** in 17.3 seconds. No failures, skips or retries in these completed runs. The final npm argument/hook check lists the 336 existing tests and runs the 18 encounter checks again.

The first focused browser run passed 18/18 checks. A setup run initially failed because of an incorrect relative import in the test fixture; the path was corrected before the passing run. No application defect or unsupported fix claim follows from that setup failure. The completed full-run fixture stage includes pre-transform and transformed boards plus diagnostic JSON.

| Encounter | Portrait | Landscape |
| --- | --- | --- |
| Forest Ruins | [capture](qa/issue-76/forest_ruins-portrait.png) | [capture](qa/issue-76/forest_ruins-landscape.png) |
| Woodland Crossing | [capture](qa/issue-76/woodland_crossing-portrait.png) | [capture](qa/issue-76/woodland_crossing-landscape.png) |
| Ruined Approach | [capture](qa/issue-76/ruined_approach-portrait.png) | [capture](qa/issue-76/ruined_approach-landscape.png) |

The six transformed screenshots were inspected for terrain continuity, elevation, unit anchors, selection/reachability and canopy layering. Zoom intentionally clips board edges. The `-fitted` captures show the reference before each additional transform; orientation refitting preserves relative zoom from the preceding view. Metadata records seed 1, viewport, project, Chrome 155.0.8059.41, build commit/dirty flag and the renderer report. [Validation record](qa/issue-76/validation.json) binds the tested source/config inputs; [full browser log](qa/issue-76/browser.log) and [final npm hook log](qa/issue-76/npm-hook.log) retain actual output. All twelve retained screenshots were visually inspected. Final hook repeat: 18/18 passed in 17.4 seconds. The isolated Vite browser fixture lives under tests/fixtures/encounters and uses production BoardRenderer/BoardInput and asset loading. It has no persistence or progression UI and is excluded from production entries. Browser evidence is emulated renderer/picking verification, not physical certification.

## Size impact and acceptance mapping

[Build comparison](qa/issue-76/build-comparison.json) retains baseline/result file inventories and SHA-256 hashes. Baseline: clean planning commit `4237c11`; result: same commit with approved source changes (dirty build). Both root builds total **57,459,483 bytes**. All public media is byte-identical; added media and current production transfer delta are **zero**. The run modules are not imported by normal startup and the browser fixture is not a production entry. Actual future playable-run transfer must be measured in #80.

The reused 15 catalog images total **829,288 body bytes**, plus 11,741 bytes of unchanged battle cues gives **841,029 body bytes**, under the existing L4 asset limit of 1,500,000 bytes. All built JavaScript totals **396,030 gzip bytes** with Python's deterministic gzip, under L3's 400,000-byte code limit. These are local file/body accounting, not newly measured CDN transfer, loading-time or frame-budget acceptance. The current artifact still contains unused public map/proof media; this task does not alter its existing packaging. L1/L2/F1/F2 and physical release readiness remain with #57/#64 and later integration certification. Existing large-chunk build warnings remain.

| #76 criterion | Evidence and disposition |
| --- | --- |
| Three encounters, approved IDs, unchanged stats/abilities | Ordered roster and fixed hashes; original map/catalog preserved; checked unit fixtures |
| Build/runtime bounds, references, spawns, assets | Mandatory build content checks; strict runtime reader; 19 adversarial content cases; reused asset file checks and browser missing/decode failures |
| Reachable cells/targets and carried-party starts | All 21 survivor subsets; legal initial-state reader and movement/attack route proof for every living hero; no production carryover claim |
| Approved assets and size impact | Unchanged metadata/provenance, zero new media; baseline/result dist and local body/gzip inventory |
| Determinism, representative rendering/picking and configured checks | Golden catalog/identity snapshots; portrait/landscape real-pointer tests and retained screenshots/diagnostics; final suite totals recorded above |
