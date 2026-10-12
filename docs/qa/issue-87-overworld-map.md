# Standalone map prototype — issue 87

[Issue](https://github.com/luminari-gurus/tactics-guru-v2/issues/87) · [Approved plan](../../openspec/changes/issue-87-overworld-map/design.md) · [Requirements](../../openspec/changes/issue-87-overworld-map/specs/overworld-map/spec.md)

The user approved planning commit `ea5a28b` on 2026-10-12. Implementation starts from main `5d8351468463a9766665f3dce1da35f074e3476f` on `work/issue-87-overworld-map`. Follow-up work belongs in isolated issues and gets readiness labeling only with sufficient evidence.

## Generator decision

Select the independently written local room/corridor generator. It uses fresh map-owned state from the existing pure RNG, has fixed work bounds and needs no new dependency. Existing battle RNG/session/save behavior is preserved. The algorithm does not copy legacy or rot.js source.

The comparison inspected the exact [rot-js 2.2.1 package](https://registry.npmjs.org/rot-js/2.2.1) (tarball SHA1 `b80b94836f09ad805e9e600664c4560df8f67ede`), published ESM paths `lib/map/digger.js`, `lib/map/rogue.js`, `lib/rng.js`, declarations and BSD-3-Clause license. The package has a top-level ESM entry and no exports map. Focused deep imports built with this repository's Vite 8.3.2 and passed TypeScript 7.0.2 strict standalone checking. Source/binary redistribution requires preserving license notices; selective copying is not selected. This is a maintenance comparison, not a claim of support for every future package version.

The [pinned legacy generator](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/OverworldMapGenerator.gd), RunState, map tests, roadmap/design and overworld-run spec were read. Its 38×26 layouts, six styles, POIs, progression and economy are context; only deterministic seed, validation, connected layout and fallback scenarios inform the 20×20 prototype. Maintained v2 roadmap/design already describe #87 separately, following #82's merge.

### Measured comparison

Node 26.11.0 on macOS; 260 distinct uint32 seeds: 0–255 plus 12345, 424242, 2147483648 and 4294967295 (the plan's 0 and 1 are already in the sequential range). Every result is checked for 400 valid cells, blocked border, 60–320 floor cells and cardinal connectivity. Run each seed once normally and again with a scratch-only clock advancing 1001 ms on every call. Clock perturbation tests reproducibility limits; it is never applied in the application.

| Candidate | Valid seeds | Floor range | Distinct layouts, 0–255 | Changed by clock | Fallbacks |
| --- | --- | --- | --- | --- | --- |
| Local, six connected rooms | 260/260 | 65–171 | 256 | 0 | 0 |
| rot.js Digger | 260/260 | 86–147 | 256 | 260 | 0 |
| rot.js Rogue | 258/260 | 124–155 | 256 | 0 | 0 |

Digger settings: room width/height 3–6, corridor length 1–5, dug percentage 0.35; default 1000 ms cutoff. Rogue: 3×3 cells, rooms 3–4 in each dimension. Normalize callback value zero to walkable. Rogue seeds 0 and 148 fail the connected-layout contract; neither candidate includes the additional production validation/retry wrapper. A scratch adapter saves/reseeds/restores the rot.js singleton around synchronous generation. This avoids leaving its state changed, but does not turn that singleton into a local explicit RNG.

Selective reuse/adaptation was assessed by tracing the exact source closure: Digger and Rogue together reach seven modules/44,440 bytes, including map/dungeon/features/constants/RNG. Retaining selected features still needs license preservation, local RNG injection, deterministic bounds and validation. Merely copying those modules does not resolve Digger's clock dependence or Rogue's invalid outputs. No adapted copy was shipped or benchmarked; implementing and maintaining that fork has no advantage over the passing local generator for this slice.

The scratch Vite ESM library builds measured 16,534 raw/4,735 gzip bytes for the combined focused Digger+Rogue adapter and 3,635 raw/1,527 gzip bytes for the local generator including its RNG closure. These are candidate-library comparisons, not production route payload estimates. [Raw comparison results and emitted candidate hashes](issue-87/generator-comparison.json).

Reproduce with the exact published package in a scratch directory: reseed its RNG, create 20×20 generators with the above settings, fill row-major callback cells, save/restore original RNG state, and run the listed seed and clock matrix. Build candidate TypeScript entries with Vite `build.lib` in ESM format/minified, gzip emitted bytes, and run `tsc --ignoreConfig --noEmit --strict --skipLibCheck --moduleResolution bundler --module esnext --target es2022`. Local production generation is exercised by `npm run test:unit -- tests/unit/overworldMap.test.ts`.

### Selected implementation bounds

`rooms-v1` accepts uint32 seeds, creates six rooms of 3–6 cells per dimension inside a blocked border, and connects successive centers using cardinal corridors. Every attempt uses at most 29 RNG draws, 216 room-cell writes and 170 corridor steps; four attempts cap those costs. Flood-fill visits at most 400 cells. Candidate rejection advances only map-owned RNG state. After four invalid candidates, an independently validated 10×8 central room provides a deterministic fallback and visible status. The focused exhaustion fixture forces unusable draws and proves the bounded fallback. Normal seed-matrix generation never used fallback.

Seed 1 is the default. Generate uses entered seed; New seed gets view-owned browser entropy and selects a different uint32 seed, using the next seed on entropy failure/equality. Invalid input retains the current map. Seeds do not persist; re-enter a displayed seed for the same layout at this generator version. Grid cells are descriptive, not movement controls.

## Production bundle

The committed implementation build (`136cdd0`, clean) adds 6,220 raw bytes to total dist versus the approved base. Public assets are unchanged. Map-only view JS is 3,457 raw/1,745 gzip bytes and CSS is 1,936/826; shared RNG is 1,651/789. Entry/preload helpers are separately recorded. Map route does not request the Phaser/battle startup chunk; battle routes do not request the map view. [Per-file baseline and implementation sizes](issue-87/build-sizes.json). Gzip here uses Python tooling and differs slightly from Vite's display; this is file size evidence, not network transfer or physical-device frame measurement.

## Validation status

- Focused unit checks: 9 passed, including independent flood-fill, seed extremes/invalid values, clock/entropy isolation, unchanged battle state/next RNG and forced fallback.
- Full unit suite: 325 passed; content checks: 77 passed.
- Both strict typechecks and production build passed. Existing Phaser chunk-size warning remains.
- Focused browser checks: 9 passed across configured desktop, Pixel 7 portrait and landscape, using installed Chrome. Direct `/map` and `/map/`, refresh, seed reuse/regeneration/errors, storage isolation, absent canvas/audio/diagnostics and battle startup regression passed.
- Development direct navigation and refresh pass for `/map`, `/map/`, battle, proof and content-smoke. A temporary production build at `/prototype/` passes `/prototype/map` and `/prototype/map/` directly and after refresh. [Route requests and results](issue-87/route-checks.json).
- Battle/proof/content-smoke fail asset loading under a non-root base on both this branch and unchanged approved base source. [Baseline reproduction](issue-87/baseline-base-path.json) proves this predates #87; [separate issue #92](https://github.com/luminari-gurus/tactics-guru-v2/issues/92) captures the loading/portrait/audio fix and is verified `ready for work`. The map route has no such asset dependency. Root battle/proof behavior remains the regression contract for #87.
- Full configured browser suite: 234/234 passed in 12.8 minutes, 78 per project. After final copy wording and a stronger inverse route-isolation assertion, the final build and all 9 focused browser checks passed again. Runtime battle/Phaser chunks stayed unchanged.
- The committed implementation rebuilt successfully after publication. Full browser and final focused results above cover the implementation working tree; the postcommit build embeds the committed identity and changes chunk hashes without a runtime code change.
- Hosted acceptance now passes on the public branch preview for commit `96482ed1bc1899d7e6e5fa8ad402fb2417e565e7`. Cloudflare reports success for deployment `ccec0cfb-f343-44c7-95e7-2ca86075bb1f`. Direct `/map` and `/map/`, refresh, 400 cells, changed layout for seed 42 and reproduction of seed 1 were verified through the browser. The grid’s embedded commit matches the published branch. [Retained hosted evidence](issue-87/hosted-preview.json). Earlier deployment failure remains historical evidence; its unresolved cause is isolated in [#94](https://github.com/luminari-gurus/tactics-guru-v2/issues/94), with no readiness label pending provider logs.

Browser emulation is responsive/functional evidence, not physical-device certification. No production infrastructure change, deployment upload or release cutover is performed.

## Acceptance evidence

| #87 criterion | Evidence and disposition |
| --- | --- |
| 1: direct route/refresh/base, battle regression | Development root and temporary `/prototype/map` preview pass direct/refresh. Root battle/proof/content-smoke pass. Existing non-root battle asset failure is baseline-confirmed and isolated in #92. Hosted direct navigation and refresh pass at the verified published commit; #94 retains the earlier failure investigation. |
| 2: 20×20 valid legible grid | Independent unit inspection proves 400 binary cells; browser checks count rendered cells, tile/control size and horizontal bounds on all three profiles. |
| 3: nontrivial connected bounded generation | All 260 seed cases pass cardinal flood-fill and floor/border bounds; forced unusable RNG fixture proves capped attempts and connected deterministic fallback. |
| 4: seed repeatability/regeneration/variation | All 256 sequential seeds differ; repeated seeds match, clock perturbation has no effect, and browser seed re-entry/extremes/new-seed/entropy failure pass. |
| 5: comparison and battle isolation | Exact-package comparison and per-file emitted sizes retained. Native view does not instantiate Phaser; route requests omit battle startup, storage methods are untouched, and an existing battle's state and next RNG draw remain identical. |
| 6: configured tests/build/actual results | Focused unit/browser, full unit/content, both typechecks and build pass. Full browser suite 234/234 and final focused checks 9/9 pass. Latest provider deployment succeeded; hosted map acceptance passes. |

Reproduction commands: `npm run test:unit`, `npm run validate:content`, `npm run typecheck`, `npm run build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`, `openspec validate issue-87-overworld-map --strict`, and `git diff --check`. Development route checks use `npm run dev -- --port 4175 --strictPort`; prefixed build uses `vite build --base=/prototype/ --outDir=/tmp/tactics-map-base-dist` and matching preview on port 4176. Baseline source was exported with `git archive 5d8351468463a9766665f3dce1da35f074e3476f`, built with the same tooling/base and served on port 4177; its embedded build stamp came from the task configuration, while the retained source SHA identifies the code under test.

Visual review: [desktop](issue-87/desktop.png), [portrait](issue-87/mobile-portrait.png), [landscape](issue-87/mobile-landscape.png). Full-page captures retain the scrollable layout; short landscape allows vertical scrolling to keep all cells legible.

Delivery: [PR #93](https://github.com/luminari-gurus/tactics-guru-v2/pull/93), runtime implementation `136cdd0551e9140a308990d36b3f7801f5b6b788`. Later evidence/task updates are documentation only. All workflow tasks and #87 acceptance criteria are verified within the documented prototype scope. PR is ready for review; the baseline non-root battle asset defect remains isolated in #92. No merge, manual issue closure or OpenSpec archive occurred.

## Review fix: route import failure

The user requested the resilience fix from [review discussion](https://github.com/luminari-gurus/tactics-guru-v2/pull/93#discussion_r4249483161). `src/main.ts` now catches selected route bootstrap failures and displays an accessible alert with a reload instruction in the existing shell. Failed map loads do not import battle startup. Controlled-abort browser tests cover both selected chunks, disabled restart, absent map/canvas, no unhandled page error, route isolation and successful reload after removing the abort.

Verification after this fix: focused browser 15/15; full configured browser 240/240 (12.9 minutes); unit 325/325; content 77/77; both strict typechecks and production build passed; strict OpenSpec and whitespace checks passed. Existing Phaser bundle-size warning remains. Earlier hosted acceptance identifies the pre-fix runtime commit; deployment verification of this fix is separate from these local checks.
