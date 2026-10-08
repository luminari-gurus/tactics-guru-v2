# Issue #35 plan: re-export the proof assets at display size

Status: implemented 2026-10-08 on `issue-35-proof-asset-export` (branched from `origin/main` `8794ae4`, created with `gh issue develop` so it is linked on the issue's Development panel). Increments 1–4 committed (`8063935`, `87b44b1`, `129dab8`, then the docs commit carrying this update); increment 5 (push, PR, preview measurement, device checklist) is the current step. Owner: moshehbenavraham (assigned on the tracker). See §9 for the state of play and what is left.

Issue: [#35 P1: Re-export the proof assets at display size per restart plan §5.1](https://github.com/luminari-gurus/tactics-guru-v2/issues/35).
Parent: #2 (proof-of-fit), within epic #1. Follow-up from #20 (closed 2026-10-07; budgets agreed). Dependencies: none for the export work itself.

This document is a working plan under `docs/ongoing-projects/`. It is not
project evidence; the PR, its QA note under `docs/qa/` and the issue carry
the evidence. Fold anything durable into the README or the design docs and
delete this file when the issue closes.

## 1. Where things stand

Checked against GitHub, `origin/main` and the live deploy on 2026-10-08.

### Tracker

| Item | State | Effect on this work |
| -- | -- | -- |
| #20 | Closed 2026-10-07; budgets L1–L4, F1–F2, I1 agreed as proposed in [issue-20-fit-gate.md](../qa/issue-20-fit-gate.md) §6 | L4 "asset transfer per scene, cold ≤ 1.5 MB" is the number this issue has to meet. The loading gate is held open on that row. |
| #35 | Open, assigned to us, branch linked | This plan. |
| #2 | Open, parent, no open children except through #35 | The maintainer decides when #2 closes; we add the L4 evidence and stop. |
| #26 | Closed via PR #36 (`8794ae4`) | Content contract is on `main`: terrain runtime textures are 256 × 256 PNG by contract (`src/content/constants.ts`). We do not touch that catalog. |
| #27, #28 | `ready for work` (dubstylee's queue marker) | Not ours. #27 produces the terrain set for the game; nothing here depends on it. |
| #3, #29, #30, #4–#11 | Open, downstream | Untouched. The §7.2 `check-dist` CI size report belongs to #3, not here. |

### Branches and PRs

| Ref | State | Effect on this work |
| -- | -- | -- |
| `origin/main` `8794ae4` | Current; deployed at https://tactics-guru-v2.pages.dev (`dirty: false`, verified from the served bundle) | Base. |
| PR #32 `codex/top-down-terrain-textures` | Merged 2026-10-08 (`44f3f7e`) | **Changed the premise of #35.** The board's tile surfaces now come from ten runtime terrain textures under `public/textures/terrain/runtime/` (1,337,733 bytes transferred together). `public/proof/grass-material-v1.png` is no longer loaded by Phaser; only `tests/grass-surface.spec.ts` fetches it. PR #32 also committed its ten 1024 × 1024 sources under `public/textures/terrain/` (about 33 MB), which Vite copies into `dist/` verbatim. They are never requested by the scene, so they do not count toward L4. |
| PR #12 `feat/signed-main-deploy` | Open, must stay unmerged pending authorization | Source of the §5.1 release limits (20 MiB ZIP, allowlisted extensions). Not a dependency; pages.dev is the approved beta URL per #20. |
| `issue-35-proof-asset-export` | This branch, at `8794ae4` | Single-task. Cloudflare Pages builds a preview for every pushed branch; the alias `https://issue-35-proof-asset-export.tactics-guru-v2.pages.dev` answered 200 on 2026-10-08 within minutes of the branch push (it currently serves `8794ae4`). Each push rebuilds it; the PR's "Cloudflare Pages" check links the dashboard entry. |

### Repository facts that shape the work

- No CI besides the Cloudflare Pages preview. Every validation command runs locally and is named with its result in the PR.
- `public/` is copied into `dist/` unhashed and served by Pages with `cache-control: public, max-age=0, must-revalidate`. New files under `public/proof/` are therefore safe to add under new names; overwriting in place would both violate "the originals stay where they are" and rely on revalidation.
- Converters on this host: ImageMagick 6.9.12-98 (`convert`), `cwebp`/`dwebp` 1.3.2, `pngquant` 2.18.0, `optipng`. None is a build dependency; §5.1 says they are run by hand and the commands recorded.
- The proof scene loads its images through `PROOF_IMAGES` in `src/diagnostics/proofAssets.ts` (ten terrain materials, `tree`, `fighter`, `fighter-portrait`), then shows the portrait as a DOM `<img width="48" height="48">` from the same URL (`FitScene.ts`). `tests/assets.spec.ts` asserts `assetCount` 13 and `objectCount` 72; neither changes.
- Draw sizes and zoom limits, from source: `PROOF_ART.tree` is 80 × (80 × 1276 / 1233) = 80 × 82.79 logical px; the grass square's side is (TILE_WIDTH + 2 × bleed) / √2 = 82 / √2 = 57.98 logical px; `fitBoard` caps the fit scale at `MAX_BOARD_SCALE` 1.5 (`src/geometry/iso.ts`) and `MAX_ZOOM` is 4 × fit (`src/geometry/picking.ts`), so the largest logical-to-CSS factor is 6.
- Canvas density, from source and the tech design: the game runs `Phaser.Scale.RESIZE` with no resolution setting (`src/phaser/start.ts`). Phaser 4.2.1's ScaleManager never reads `devicePixelRatio`; in `RESIZE` mode the backing store equals the CSS size ([tech design §5.5](../tech_design.phaser4.draft.md)). Canvas textures are therefore sampled at r = 1 today; the DPR-capped canvas (r = min(dpr, cap)) is a §5.5 proposal that no issue has implemented.
- Phaser 4 builds mipmaps only for power-of-two textures and only with `mipmapFilter` set (§7.2); the scene sets neither, so a texture far larger than its drawn size is minified without mipmaps.

### The live deploy today (measured for this plan)

`npm run measure:fit -- <scratch>/deployed-now.json --url https://tactics-guru-v2.pages.dev`, 2026-10-08 09:41 UTC, this WSL2 host, Playwright Chromium, build `8794ae4`, 18 samples, zero console or page errors. The JSON is in the session scratchpad, not in the repository; the PR will carry its own runs.

Desktop cold, first sample (bytes identical in every cold sample):

| Resource | Transferred bytes | Note |
| --- | ---: | --- |
| `proof/fighter-portrait.png` | 3,285,410 (+300 for the DOM image's second request, served from cache) | 1254 × 1254, drawn at 48 × 48 CSS px |
| `proof/tree-grass-v1.png` | 1,117,792 | 1233 × 1276, drawn at 80 × 82.79 logical px |
| ten `textures/terrain/runtime/*-top-down-v1.png` | 1,337,733 | 256 × 256 each, PR #32 |
| `proof/fighter.png` | 9,143 | unchanged, out of scope |
| two unlock tones | 5,830 | unchanged |
| code (HTML, CSS, three JS chunks) | 369,398 | within L3 |
| **Total cold** | **6,125,606** | |
| **Assets cold (L4 scope)** | **5,756,208** | L4 limit 1,500,000: **fails** |

Cold usable-controls medians (min..max): desktop 1,758 ms (1,167..2,137), mobile-portrait 1,793 (1,144..1,925), mobile-landscape 1,695 (1,545..2,149). Warm reload transfers 7,271 bytes; warm usable medians: desktop 463, mobile-portrait 754, mobile-landscape 700 (worst 782). The mobile warm medians sit at or just over the L2 line (750 ms) on this run, where the #20 run had 333–570; the only content change since is #32's ten extra requests. Not our scope, but the PR should report whether the smaller decodes move it.

The grass PNG that #35 lists is no longer in the cold load. The two files that are, the portrait and the tree, are 76.5% of it; the terrain runtime set is 23.2%.

## 2. Scope

### In scope (maps to the five acceptance criteria)

1. **Export rule applied and named.** For each of the three files: largest drawn size × maximum board zoom × pixel-density cap, with the three numbers stated per file in the QA note (§3, D-A to D-C).
2. **L4 met and measured on a deploy.** Proof assets at most 1,500,000 bytes on a cold load; `measure:fit --url` against the deploy that carries the new files, zero errors, JSON beside the note.
3. **Visual parity.** Grass-corner assertions, the four occlusion fixtures and the opacity checks pass unchanged; portrait readable at 48 px on a 3× screen; before/after screenshots in both orientations.
4. **No new build dependency.** Converters run by hand; `npm ci`, `npm run build`, `npm test` change only in the asset bytes they see.
5. **#20 note L4 row updated** with the new measurement so the maintainer can close the loading gate.

Plus the record itself: conversion commands, source hashes, output bytes and hashes in `docs/qa/issue-35-proof-asset-export.md`, in the shape of [issue-16-assets.md](../qa/issue-16-assets.md). The originals stay at their current paths.

### Out of scope (say so in the PR)

- No new art generation; no atlas packing; no change to board geometry, fixtures, controls or diagnostics beyond the asset URLs and one export-rule constant.
- No `check-dist` CI size report and no cleanup of the unreferenced sources now in `dist/` (PR #32's 33 MB of terrain sources, the 7.4 MB of proof originals). Both are release-cap matters for #3's `check-dist` step (§7.2, §9.2). The PR names the numbers so the maintainer can decide; moving the originals out of `public/` is a one-line change if asked.
- No change to the game asset catalog (`src/terrain/materials.ts`, `src/content/*`) or to `fighter.png` (64 × 80 drawn at 40 × 50 × 6: under-sized by the same rule, but not one of the three files and not a transfer problem at 9 KB).
- No physical-device claims beyond what the testers record (§6).

## 3. Design decisions

### D-A. Pixel-density cap: 1 for canvas textures today, 2 for the DOM portrait

The rule multiplies by "the pixel-density cap". For Phaser textures the honest number is the density the renderer actually samples at, and that is 1: `RESIZE` mode, backing store in CSS pixels, no `resolution`, ScaleManager blind to `devicePixelRatio` (§1). Exporting the tree at r = 2 (960 × 993) would size it for a renderer that does not exist, and it would make L4 unreachable: with the terrain set at 1,337,733 bytes the headroom under 1,500,000 is about 147 KB for portrait plus tree, and a 960 × 993 tree is 737,887 bytes as lossless PNG, 251,519 through `pngquant` and 159,814 as WebP q85 (trial conversions, §4 increment 2). Only the last is close, and it still fails by 18 KB.

The DOM portrait is different: the browser draws an `<img>` at the device's own density. The #20 note's own example is "96 × 96 for 2× DPR", so the cap is 2 there, and the acceptance criterion's 3× readability check is the test that 2 is enough on the densest phone in the device set. If it is not, re-export at 144 × 144 (7,312 bytes at q85): the budget does not notice.

Both caps are named constants next to `PROOF_ART` so the unit test (D-E) and the note cite the same numbers. If a later issue adopts §5.5's DPR-capped canvas, the exports are regenerated from the retained originals with the recorded commands; that is why the originals stay.

### D-B. Sizes

| File | Largest drawn size | × max board zoom | × density cap | Export |
| --- | --- | --- | --- | --- |
| `fighter-portrait.png` | 48 × 48 CSS px (DOM `<img>`; not in the board, so zoom does not apply) | × 1 | × 2 | **96 × 96** |
| `tree-grass-v1.png` | 80 × 82.79 logical px (`PROOF_ART.tree`) | × 6 (1.5 fit cap × 4 zoom) | × 1 | **480 × 497** (480 × 496.74 rounded up; the renderer stretches to 80 × 82.79 regardless, so the 0.05% aspect change is invisible; `originY` stays 1070 / 1276 as a fraction) |
| `grass-material-v1.png` | 57.98 logical px square (`(80 + 2) / √2`, rotated 45° then squashed to the 80 × 40 diamond) | × 6 | × 1 | **348 × 348** |

### D-C. Formats

- **Portrait: WebP**, lossy q90, `-m 6`, metadata stripped: 4,568 bytes in the trial (q85: 3,570; PNG: 20,755). §5.1 and §7.2 say portraits are WebP. Conditional on the device check (§6): both the DOM image and the Phaser texture must decode it on the #20 device set; otherwise ship the 96 × 96 PNG.
- **Tree: WebP**, lossy q85 with lossless alpha (`-alpha_q 100`): 54,200 bytes (q90: 61,744). The alternatives at 480 × 497 are 217,747 lossless PNG, which breaks L4 (1,352,706 + 217,223 = 1,569,929), and 71,163 through `pngquant --quality 80-100`, which fits. WebP is chosen over the palette PNG because a 256-colour quantization of a soft painterly canopy over a grass patch is the more visible artifact at 6× zoom; the quantized PNG is the fallback if the device check fails for WebP. A WebP decode failure in a non-supporting browser is an `<img>` error inside Phaser's XHR image processing, which `File.onProcessError` only logs; it never emits `FILE_LOAD_ERROR`, so `create()` has to report the missing texture itself (`16c1c67`, review finding 1). With that in place the scene shows the existing controlled error and a tester cannot miss it; before it, the status stayed at Loading with no message. Edge check done on the trial: mean RGB of partial-alpha pixels is (89, 107, 38) in the source and (87, 104, 37) after resize and encode, so no dark fringe from un-premultiplied resampling.
- **Grass: PNG**, lossless, `optipng -o2`: 260,162 bytes. It is a test fixture, not a runtime load, and `tests/grass-surface.spec.ts` asserts every sampled pixel is opaque, so lossless keeps that assertion exact. It never enters L4.
- All three extensions are on the §5.1 release allowlist. Names carry the export size so a future re-export cannot be confused with these: `fighter-portrait-96.webp`, `tree-grass-v1-480.webp`, `grass-material-v1-348.png`, all under `public/proof/` beside the untouched originals.

Budget check with the chosen formats, cold, per-request header overhead of about 300 bytes as measured: terrain 1,337,733 + fighter 9,143 + tones 5,830 + tree 54,500 + portrait 4,868 + portrait DOM re-request 300 = **1,412,374 bytes**, 87,626 under L4. With the PNG fallbacks for both: 1,445,524, still under.

### D-D. Wiring is two URLs and no behaviour change

`PROOF_IMAGES` points `tree` and `fighter-portrait` at the new files; `tests/grass-surface.spec.ts` fetches the new grass file. The portrait stays loaded through Phaser first and then displayed by the DOM from the same URL, as today. `index.html`, `FitScene.ts`, `BoardRenderer.ts`, fixtures, controls and diagnostics are untouched. A comment block in `proofAssets.ts` records bytes and SHA-256 per export, as the unlock-tone block already does.

### D-E. The RED-first test is the export rule, not a dist report

`tests/unit/proofAssetExports.test.ts` (Vitest, Node, pure): for every entry in `PROOF_IMAGES` and `PROOF_AUDIO`, read `public<url>`, parse the dimensions from the PNG IHDR or the WebP `VP8 `/`VP8L`/`VP8X` header (a 30-line helper under `tests/unit/helpers/`), and assert

1. the extension is on the release allowlist (`png`, `jpg`, `jpeg`, `webp`, `mp3`, `ogg`, `wav`);
2. `tree` and `fighter-portrait` are no larger than their export ceilings, computed from `PROOF_ART`, `MAX_BOARD_SCALE × MAX_ZOOM` and the two density caps (D-A), which means exporting `MAX_BOARD_SCALE` from `iso.ts` and adding a `PROOF_EXPORT` constant beside `PROOF_ART`;
3. the summed bytes of every file the scene requests on a cold load are at most `PROOF_COLD_ASSET_BUDGET_BYTES` = 1,500,000, named after the #20 L4 row.

RED today on all three of 2 and 3 (1254 > 96, 1233 > 480, 5.75 MB > 1.5 MB). This is the proof scene checking its own manifest against the agreed budget; the dist-wide `check-dist` (every file, largest file, ZIP caps) stays with #3. Browser-side, `tests/assets.spec.ts` tightens the portrait check from `naturalWidth > 0` to the exported 96 × 96 (RED: 1254), and `tests/grass-surface.spec.ts` asserts the new file's 348 (RED: file missing).

### D-F. Evidence shape follows #16 and #20

`docs/qa/issue-35-proof-asset-export.md`: source table (path, pixels, bytes, SHA-256, provenance pointer to the #16 note), the three rule numbers per file, exact commands with tool versions, output table (path, pixels, bytes, SHA-256), the budget arithmetic, verification commands with results, the screenshot table, the device record, and the preview and main-deploy `measure:fit` runs as `docs/qa/issue-35/*.json`. Screenshots: one montage per orientation (four fixtures, before row and after row) from `tests/assets.spec.ts` output, plus a before/after crop of the portrait at device scale factor 3, all run through `pngquant` so the four files stay small. The #20 note gets its L4 row updated, nothing else.

## 4. Work breakdown

Each increment is one commit on the branch; commit messages carry the session trailer. Order matters: tests go RED before any asset changes.

### Increment 1: RED tests and the rule constants (`test`)

- Export `MAX_BOARD_SCALE` from `src/geometry/iso.ts`.
- Add `PROOF_EXPORT` (`maxBoardZoom`, `canvasDensityCap: 1`, `domDensityCap: 2`) and `PROOF_COLD_ASSET_BUDGET_BYTES` to `src/diagnostics/proofAssets.ts` with comments citing #20 L4 and tech design §5.5.
- Add `tests/unit/proofAssetExports.test.ts` (D-E) with the PNG/WebP header reader inlined (one consumer, so no `tests/unit/helpers/`). Run `npx vitest run tests/unit/proofAssetExports.test.ts` and record the RED output.
- Tighten `tests/assets.spec.ts` (portrait 96 × 96) and `tests/grass-surface.spec.ts` (new file, 348). Run those two specs on the desktop project and record the RED output.

### Increment 2: the exports (`chore`)

Run by hand from the repository root, then record the exact command lines, tool versions, and `sha256sum` of inputs and outputs in the QA note:

```sh
sha256sum public/proof/fighter-portrait.png public/proof/tree-grass-v1.png public/proof/grass-material-v1.png
convert public/proof/fighter-portrait.png -filter Lanczos -resize 96x96 -strip tmp/fighter-portrait-96.png
cwebp -q 90 -m 6 -metadata none tmp/fighter-portrait-96.png -o public/proof/fighter-portrait-96.webp
convert public/proof/tree-grass-v1.png -filter Lanczos -resize 480x497! -strip tmp/tree-grass-v1-480.png
cwebp -q 85 -alpha_q 100 -m 6 -metadata none tmp/tree-grass-v1-480.png -o public/proof/tree-grass-v1-480.webp
convert public/proof/grass-material-v1.png -filter Lanczos -resize 348x348 -strip tmp/grass-material-v1-348.png
optipng -o2 -out public/proof/grass-material-v1-348.png tmp/grass-material-v1-348.png
identify public/proof/fighter-portrait-96.webp public/proof/tree-grass-v1-480.webp public/proof/grass-material-v1-348.png
sha256sum public/proof/fighter-portrait-96.webp public/proof/tree-grass-v1-480.webp public/proof/grass-material-v1-348.png
```

`tmp/` is git-ignored. Trial runs of these commands on 2026-10-08 gave 4,568, 54,200 and 260,162 bytes; the committed outputs are regenerated from the originals and their hashes recorded, not copied from the trial. Keep the PNG fallbacks (`pngquant --quality=80-100 --speed 1` for the tree, plain for the portrait) ready in `tmp/` but uncommitted unless §6 forces them.

### Increment 3: wire the URLs (`feat`)

- `PROOF_IMAGES`: `tree` → `/proof/tree-grass-v1-480.webp`, `fighter-portrait` → `/proof/fighter-portrait-96.webp`; add the bytes and SHA-256 comment block.
- `tests/grass-surface.spec.ts`: `/proof/grass-material-v1-348.png`.
- Increment 1's tests go GREEN: `npx vitest run tests/unit/proofAssetExports.test.ts`, then `npm run test:unit`, `npm run build`, `npm test`. Record counts and times.

### Increment 4: evidence (`docs`)

- "Before" screenshots: taken on this branch at `8024f26` (identical to `8794ae4` except for this plan file) before increment 1 touched any test or asset: `npm run build && npx playwright test tests/assets.spec.ts --project=mobile-portrait --project=mobile-landscape`, four fixture screenshots per orientation kept in the session scratchpad. No worktree needed. "After": the same spec on the finished branch. Montage per orientation with `convert ... +append / -append`, then `pngquant`, into `docs/qa/issue-35/`.
- Portrait at 3×: `tmp/portrait-3x.mjs` (git-ignored; its 10 lines are reproduced in the QA note) launches Playwright Chromium with the Pixel 7 profile at `deviceScaleFactor: 3` against a `vite preview` on port 4175 and takes an element screenshot of `#proof-portrait` (144 × 144 device px). "Before" captured at `8024f26`; "after" on the finished branch; side by side in the note.
- Local collector run for the branch: `npm run build && npm run measure:fit -- docs/qa/issue-35/fit-local-<sha>.json` (local mode refuses a `dist` from another commit, so build first).
- Write `docs/qa/issue-35-proof-asset-export.md` (D-F). Update README line "`public/proof/`: the four canonical images …" to describe originals plus exports, and the #20 note's L4 row with the local number and a placeholder for the deployed one.

### Increment 5: PR, preview measurement, device check (`docs`)

- Push; open the PR with title "Re-export the proof assets at display size (#35)", `Refs #35`, no `Closes`. Body: the rule numbers, the budget arithmetic, every command and result from §5, what is out of scope (§2), and the §6 checklist for the testers.
- When the Cloudflare Pages check is green, `npm run measure:fit -- docs/qa/issue-35/fit-preview-<sha>.json --url https://issue-35-proof-asset-export.tactics-guru-v2.pages.dev`; `measuredBuild` must equal the pushed commit. Commit the JSON and the L4 row value in a follow-up `docs` commit.
- Post the §6 checklist on the PR for the user (Android, four browsers; desktop) and dubstylee (iPhone Safari and Chrome). Record answers in the note's device table in the shape of the #20 note: "pass as reported", no versions asked for.
- If any browser in the set fails to decode WebP: swap in the PNG fallbacks (D-C), re-run increments 3 and 4 for the changed files, re-measure.

### After merge (not part of the PR)

- `npm run measure:fit -- docs/qa/issue-35/fit-main-<sha>.json --url https://tactics-guru-v2.pages.dev` once Pages serves the merge commit; post the number on #35; a one-line docs commit on a fresh branch updates the L4 row with the main-deploy figure if the maintainer wants it in the note rather than on the issue.
- Close #35 with the evidence links when the maintainer agrees every box is ticked; the maintainer closes the #20 loading gate and decides on #2.
- Delete this plan file; fold the README change already made.

## 5. Validation gate (run before the PR, name each in the PR)

| Command | Expectation |
| -- | -- |
| `npx vitest run tests/unit/proofAssetExports.test.ts` before increment 2 | RED on ceilings and budget (record the assertion output) |
| `npx playwright test tests/assets.spec.ts tests/grass-surface.spec.ts --project=desktop` before increment 2 | RED: portrait 1254 ≠ 96; grass file 404 |
| `npm run test:unit` | all pass (36 today plus the new file) |
| `npm run typecheck` | clean |
| `npm run build` | clean apart from the known Phaser chunk-size warning; `dist/proof/` contains originals and exports |
| `npm test` | all pass across desktop, mobile-portrait, mobile-landscape (90 today); grass corners, occlusion fixtures, opacity, terrain materials unchanged |
| `npm ci` | lockfile unchanged (no new dependency) |
| `git diff --check` | clean |
| `sha256sum` and `identify` of the three outputs | match the note |
| `npm run measure:fit` local, then `--url` preview | zero console or page errors; assets cold ≤ 1,500,000 bytes; `measuredBuild` equals HEAD |

## 6. Device checklist for the testers (on the preview URL, then on main after merge)

| Check | Android: Brave, Chrome, Edge, Samsung Internet | Desktop | iPhone Safari | iPhone Chrome |
| --- | --- | --- | --- | --- |
| Status reaches Ready, no on-screen error (since `16c1c67` a WebP decode failure shows "Error: Could not load proof asset tree" or "… fighter-portrait"; earlier builds left the status at Loading) | | | | |
| Portrait visible beside Restart and readable at its 48 px size (eyes, outline, colours) | | | | |
| Tree visible on every fixture; soft canopy edge, no dark halo, at fit zoom and at maximum pinch zoom | | | | |
| Tree opacity slider still fades the tree behind the Fighter | | | | |
| Cold reload feels faster than before (no number asked for) | | | | |

Record as "Android phone, four browsers" and "pass as reported"; versions are not requested.

## 7. Risks and open points

1. **Density cap disagreement.** If the maintainer wants canvas textures exported at cap 2 to anticipate §5.5, L4 cannot be met with the current terrain set (D-A numbers). The PR states this so the choice is explicit: cap 1 now and regenerate later, or revisit the L4 number.
2. **WebP on the device set.** iOS 14+ and every Android browser in the set decode WebP, but the criterion requires the device check, and iPhone rows depend on dubstylee. PNG fallbacks are prepared and also fit the budget.
3. **Lossy artifacts at 6× zoom.** Judged from the montage; if q85 shows blocking in the canopy, q90 (61,744 bytes) still fits.
4. **Terrain set dominates L4.** 1,337,733 of 1,500,000 bytes are PR #32's runtime textures; any content issue that adds a material breaks L4 unless those are also re-examined. For #3/#29/#30, noted in the PR, not fixed here.
5. **Dist size.** `dist/` is about 41 MB because of unreferenced sources in `public/` (PR #32's 33 MB, the 7.4 MB proof originals this issue keeps). Pages serves it; the §5.1 20 MiB release ZIP would not. `check-dist` is #3's.
6. **L2 at the line.** Today's warm medians on mobile are 700–754 ms against 750; the PR reports the post-export figure without claiming a cause.
7. **Preview alias.** Confirmed live for this branch (§1). The collector must still check `measuredBuild` against the pushed commit, because the alias serves whichever push Pages built last.
8. **Edge cache state** on cold deployed samples is uncontrolled, as in #20; three samples per profile, bytes must agree exactly.

## 8. Branch and process

- Branch `issue-35-proof-asset-export` from `origin/main` `8794ae4`, created through `gh issue develop 35` on 2026-10-08 and listed on #35's Development panel. One task, no dependency on unmerged work.
- Commits per increment with the `Claude-Session` trailer; no `Closes #35` anywhere until every criterion is verified; `Refs #35` in the PR.
- Review handling as on PRs #31 and #34: inline replies, one fix commit per finding, resolve threads, leave the PR ready to merge with a merge commit, keep the branch.
- `#35` stays assigned to us until the maintainer closes it.

## 9. Updates

### 2026-10-08: plan written, branch linked

Branch created and linked; live deploy measured (§1); trial conversions run in the session scratchpad to size the decisions (D-A to D-C); nothing under `public/` or `src/` changed yet.

### 2026-10-08: ablation pass and increment 1 (RED)

Ablation against the code changed three mechanics, no outcomes: "before" screenshots are taken from the current HEAD build instead of a `8794ae4` worktree; the image-header reader lives inside the unit test instead of a helpers folder; PNG fallbacks are not pre-generated (commands stay in D-C, run only if the device check fails). Before captures done at `8024f26` (eight fixture screenshots, two orientations; portrait at 3× = 144 × 144 device px) and held in the session scratchpad until increment 4 writes the montages.

Increment 1 committed: `MAX_BOARD_SCALE` exported; `PROOF_EXPORT` (`maxBoardZoom` 6, `canvasDensityCap` 1, `domDensityCap` 2, `portraitCssPx` 48) and `PROOF_COLD_ASSET_BUDGET_BYTES` 1,500,000 added; unit test and the two spec tightenings in place. RED recorded:

- `npx vitest run tests/unit/proofAssetExports.test.ts`: 3 failed, 1 passed. Tree `{1233, 1276}` ≠ `{480, 497}`; portrait `{1254, 1254}` ≠ `{96, 96}`; cold manifest 5,751,408 bytes > 1,500,000. The allowlist assertion passes already.
- `npx playwright test tests/assets.spec.ts tests/grass-surface.spec.ts --project=desktop`: 2 failed, 1 passed. Portrait `{1254, 1254}` ≠ `{96, 96}`; grass `image.decode()` threw `EncodingError: The source image cannot be decoded` because `/proof/grass-material-v1-348.png` does not exist yet.

### 2026-10-08: increments 2–4 done

- Increment 2 (`87b44b1`): the D-C commands run from the originals; outputs match the trial byte for byte (4,568 / 54,200 / 260,162). Source hashes match the #16 note. Fringe check on the committed WebP: partial-alpha mean RGB (89.2, 106.8, 37.7) source, (86.7, 104.3, 36.8) output; alpha plane lossless (75,329 partial pixels before and after).
- Increment 3 (`129dab8`): `PROOF_IMAGES` wired, comment block with bytes and hashes. GREEN: focused vitest 4/4, `npm run test:unit` 45 (41 + 4), typecheck clean, build clean, `npm test` 93 passed in 2.8 min, `npm ci` lockfile unchanged, `git diff --check` clean. On-disk manifest 1,407,574 bytes.
- Increment 4: after captures at `129dab8`; montages, portrait 3× pair and a 1:1 canopy crop (lossless vs WebP, the 6× zoom case) under `docs/qa/issue-35/`; local collector `fit-local-129dab8.json`: assets cold 1,412,374 bytes (exactly the D-C estimate), total cold 1,781,067, zero errors, 18 samples. QA note `docs/qa/issue-35-proof-asset-export.md` written; README `public/proof/` line and the #20 note's L4 row updated with the loopback figure and "deployed pending".

### 2026-10-08: increment 5, PR #37 open, preview measured

- Pushed `7d50248`; PR #37 https://github.com/luminari-gurus/tactics-guru-v2/pull/37 ("Re-export the proof assets at display size (#35)", `Refs #35`, body carries the rule numbers, budget, commands, out-of-scope list and the §6 checklist). Cloudflare Pages check green within minutes; the alias served `7d50248`.
- Preview collector run `docs/qa/issue-35/fit-preview-7d50248.json`: `measuredBuild` `7d50248`, 18 samples, zero errors, assets cold **1,412,374 bytes in all nine cold samples** (L4 passes by 87,626), cold usable medians 911 / 1,189 / 1,076 ms, warm 549 / 671 / 664 ms. QA note §8.2 and the #20 L4 row filled; committed as a `docs` commit after this entry and pushed.
- The §6 checklist posted on PR #37 for the testers.

### 2026-10-08: review of PR #37 handled

Two adversarial passes at `86b9266` (reviews 5455226513 and 5455277223) gave four findings; one fix commit each, RED first, numbers in the QA note §6:

1. `16c1c67` fix: `create()` reports the first missing `PROOF_IMAGES` texture through the error callback. Phaser's `File.onProcessError` only logs a failed decode, so a WebP that does not decode, or the `index.html` the deploy returns for a missing `/proof/` path, left the status at Loading with no message. Two specs in `tests/assets.spec.ts` cover undecodable bytes and the HTML shell. No boolean guard: `showError` is idempotent.
2. `4d3af19` docs: §9/§10 of the note and D-C/§6 here now state the symptom per build and the real mechanism.
3. `d8f5534` test: the L4 unit gate charges 300 bytes per request plus the portrait re-request (4,800), so it holds the wire figure 1,412,374.
4. `6fbddff` test: the grass export is held to `ceil((TILE_WIDTH + 2 × bleed) / √2 × maxBoardZoom × canvasDensityCap)` from the constants; the browser spec drops its literal.

Final tree: build clean, 46 unit tests, 99 browser checks, diff check clean. Threads replied to and resolved, PR body updated, testers told that a decode failure now shows the error message on the preview.

What is left, and who does it:

1. **Testers (human):** the §6 rows on the preview URL, then on main after merge. **Android and desktop done 2026-10-08**: the user reported all five rows passing in Brave, Chrome, Edge and Samsung Internet on the preview at `bde9aa4` (PR #37 comment 6057730129) and in a desktop browser at `574d4a1` (comment 6057747895), recorded in the QA note §9. iPhone Safari and iPhone Chrome: dubstylee checked them on the preview and reported to the user directly; recorded as "pass as reported" in §9 (PR #37 comment 6058472893). The device set is complete.
2. **If any browser fails to decode WebP:** PNG fallbacks per D-C (`tmp/fighter-portrait-96.png` as is; `pngquant --quality=80-100 --speed 1 tmp/tree-grass-v1-480.png`), rewire `PROOF_IMAGES`, re-run increments 3 and 4 for the changed files, re-measure the preview. Both fallbacks fit L4 (1,445,524 estimated).
3. **Review handling** on PR #37 per §8: done 2026-10-08 (see the entry below); a further round follows the same rules.
4. **After merge (session work):** `npm run measure:fit -- docs/qa/issue-35/fit-main-<sha>.json --url https://tactics-guru-v2.pages.dev` once Pages serves the merge commit (check `measuredBuild`); post the number on #35; a one-line `docs` commit on a fresh branch updates the #20 L4 row and the QA note §8.3 if the maintainer wants it in the notes rather than on the issue.
5. **Close-out:** the maintainer closes #35 when every box is ticked, closes the #20 loading gate and decides #2; then delete this plan file (the README line is already folded).
