# Issue #35: proof assets re-exported at display size

Evidence for [#35](https://github.com/luminari-gurus/tactics-guru-v2/issues/35) (parent #2, follow-up from #20). The three large PNGs under `public/proof/` were re-exported by hand at the size the proof scene draws them, following restart plan §5.1 and tech design §7.2, and the scene now loads the exports. The originals stay at their paths. Branch `issue-35-proof-asset-export`: `00a8dea` (RED tests and the rule constants), `5cc6cf5` (the exports), `1330f58` (the scene loads them), then this note; the review fixes are `cf7cb74` (decode failure reported, finding 1), `41a1ea9` (§9, §10 and the plan corrected, finding 2), `2b017d9` (L4 gate on the wire, finding 3) and `2664246` (grass export held to the rule, finding 4), with their evidence in §6. Sections 1 to 4 are the export record, 5 the budget arithmetic, 6 the verification, 7 the screenshots, 8 the collector runs, 9 the device record, 10 scope and limitations.

## 1. Sources

All three are the files recorded in [issue-16-assets.md](issue-16-assets.md); bytes and SHA-256 were re-read on 2026-10-08 and match that note. They are unchanged and still shipped beside the exports.

| Source under `public/proof/` | Pixels | Bytes | SHA-256 | Provenance |
| --- | --- | ---: | --- | --- |
| `fighter-portrait.png` | 1254 × 1254 RGB | 3,285,110 | `712956d5e94716d240a0cce5fbcf37d3d82c3c4a68dd29de940d23b99f00e190` | canonical, copied unchanged from the legacy repository (#16 §1) |
| `tree-grass-v1.png` | 1233 × 1276 RGBA | 1,117,492 | `850cb7e6868bc800c4ab108877b19d3f6077ab10ef74092f019c2a819679eba5` | generated project art, prompt in [issue-16/tree-grass-v1-prompt.md](issue-16/tree-grass-v1-prompt.md) |
| `grass-material-v1.png` | 1254 × 1254 RGB | 2,980,361 | `570aef06876d43488db7181dc97e3cf8fcb39dd7b4b515772629d86998d369a2` | generated project art, prompt in [issue-16/grass-material-v1-prompt.md](issue-16/grass-material-v1-prompt.md) |

Since PR #32 (`ed8f34a`) the tile surfaces come from the ten runtime terrain textures under `public/textures/terrain/runtime/`, so `grass-material-v1.png` is no longer requested by the scene; only `tests/grass-surface.spec.ts` fetches it. It is exported anyway because the acceptance criterion names all three files, and the spec now fetches the export.

## 2. Export rule and the three numbers per file

Rule (#35, restart plan §5.1): **largest drawn size × maximum board zoom × pixel-density cap**, rounded up to whole pixels. The constants are in `PROOF_EXPORT` (`src/diagnostics/proofAssets.ts`) so the unit test and this note cite the same numbers.

| File | Largest drawn size (from source) | × max board zoom | × density cap | Export |
| --- | --- | --- | --- | --- |
| `fighter-portrait.png` | 48 × 48 CSS px: `index.html` `<img id="proof-portrait" width="48" height="48">`; not in the board, so zoom does not apply | × 1 | × 2 (DOM) | **96 × 96** |
| `tree-grass-v1.png` | 80 × 82.79 logical px: `PROOF_ART.tree` = 80 × (80 × 1276 / 1233) | × 6 | × 1 (canvas) | **480 × 497** (496.74 rounded up) |
| `grass-material-v1.png` | 57.98 logical px square: `(TILE_WIDTH + 2 × bleed) / √2` = 82 / √2, rotated 45° and squashed to the 80 × 40 diamond | × 6 | × 1 (canvas) | **348 × 348** (347.9 rounded up) |

- **Maximum board zoom 6** = `MAX_BOARD_SCALE` 1.5 (`fitBoard` caps the fit scale, `src/geometry/iso.ts`) × `MAX_ZOOM` 4 (pinch and wheel zoom are relative to the fit, `src/geometry/picking.ts`).
- **Canvas density cap 1.** The game runs `Phaser.Scale.RESIZE` with no `resolution` (`src/phaser/start.ts`); Phaser 4.2.1's ScaleManager never reads `devicePixelRatio`, so the backing store equals the CSS size and canvas textures are sampled at density 1 ([tech design §5.5](../tech_design.phaser4.draft.md)). A DPR-capped canvas is a §5.5 proposal that no issue has implemented; if one does, the exports are regenerated from the retained originals with the commands in §3. Exporting the tree at cap 2 (960 × 993) would also put L4 out of reach with the current terrain set: 159,814 bytes even as WebP q85, against about 147 KB of headroom (plan D-A).
- **DOM density cap 2.** The browser draws the `<img>` at device density; the #20 note's own example is "96 × 96 for 2× DPR". The 3× readability check in §7 is the test that 2 is enough on the densest phone in the device set.
- The tree's 0.05% aspect change (480 × 497 for 480 × 496.74) is invisible: the renderer stretches the texture to 80 × 82.79 regardless, and `originY` stays the fraction 1070 / 1276.

## 3. Conversion commands

Run by hand on 2026-10-08 from the repository root on the WSL2 host (ImageMagick 6.9.12-98 Q16 `convert`/`identify`, `cwebp` 1.3.2 with libsharpyuv 0.2.1, OptiPNG 0.7.8). None is a build dependency; `tmp/` is git-ignored. Lanczos resampling, metadata stripped, intermediate PNGs in `tmp/`.

```sh
sha256sum public/proof/fighter-portrait.png public/proof/tree-grass-v1.png public/proof/grass-material-v1.png
convert public/proof/fighter-portrait.png -filter Lanczos -resize 96x96 -strip tmp/fighter-portrait-96.png
cwebp -q 90 -m 6 -metadata none tmp/fighter-portrait-96.png -o public/proof/fighter-portrait-96.webp
convert public/proof/tree-grass-v1.png -filter Lanczos -resize '480x497!' -strip tmp/tree-grass-v1-480.png
cwebp -q 85 -alpha_q 100 -m 6 -metadata none tmp/tree-grass-v1-480.png -o public/proof/tree-grass-v1-480.webp
convert public/proof/grass-material-v1.png -filter Lanczos -resize 348x348 -strip tmp/grass-material-v1-348.png
optipng -o2 -out public/proof/grass-material-v1-348.png tmp/grass-material-v1-348.png
identify public/proof/fighter-portrait-96.webp public/proof/tree-grass-v1-480.webp public/proof/grass-material-v1-348.png
sha256sum public/proof/fighter-portrait-96.webp public/proof/tree-grass-v1-480.webp public/proof/grass-material-v1-348.png
```

Encoder output: portrait `Output: 4568 bytes Y-U-V-All-PSNR 42.78 43.92 44.31 43.18 dB`; tree `Dimension: 480 x 497 (with alpha)`, `Output: 54200 bytes Y-U-V-All-PSNR 43.13 43.64 46.06 43.59 dB`, `Lossless-alpha compressed size: 25253 bytes`; grass `Output IDAT size = 260105 bytes`, `Output file size = 260162 bytes`. The intermediate lossless PNGs were 20,755 (portrait), 217,747 (tree) and 260,246 (grass) bytes.

Format choices (plan D-C): the portrait is WebP because §5.1 and §7.2 say portraits are WebP, conditional on the device check in §9; the tree is lossy WebP with lossless alpha because the 480 × 497 lossless PNG (217,747 bytes) would break L4 and a 256-colour `pngquant` PNG (71,163 bytes in the trial) is the more visible artifact on a soft painterly canopy at 6× zoom; the grass stays lossless PNG because it is a test fixture whose spec asserts every sampled pixel is opaque, and it never enters the cold load. All three extensions are on the §5.1 release allowlist. If a browser in the device set cannot decode WebP, the PNG fallbacks are `tmp/fighter-portrait-96.png` as is and `pngquant --quality=80-100 --speed 1 tmp/tree-grass-v1-480.png`; both also fit the budget (§5).

## 4. Outputs

| Export under `public/proof/` | Pixels | Container | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `fighter-portrait-96.webp` | 96 × 96 | WebP `VP8 ` (lossy, q90, `-m 6`) | 4,568 | `e6ee42fa2e65ccb09ad80c1353505f5e6accb5ae1bb2b77da9a78eb99994bbb8` |
| `tree-grass-v1-480.webp` | 480 × 497 | WebP `VP8X` + `ALPH` (lossy q85 colour, lossless alpha) | 54,200 | `d835dd041e2bb867798933b166c699ac56b73d1ffcd4774c5cddb9ea2f1acc32` |
| `grass-material-v1-348.png` | 348 × 348 | PNG, RGB, lossless, `optipng -o2` | 260,162 | `002fe98dc7d904b4813205b076e90bf605b594e8a51767e1e6abadbb7605920d` |

Names carry the export size so a later re-export cannot be confused with these. The trial conversions that sized the plan gave the same byte counts; the committed files are the regenerated outputs hashed above.

Edge check on the tree (un-premultiplied resampling would darken the soft canopy edge): mean RGB of the partial-alpha pixels is (89.2, 106.8, 37.7) in the source, (86.5, 104.2, 36.4) after the Lanczos resize and (86.7, 104.3, 36.8) after WebP encoding; the partial-alpha pixel count is identical before and after encoding (75,329) because the alpha plane is lossless. No dark fringe.

## 5. Budget arithmetic

Every file the scene requests on a cold load, bytes on disk (`PROOF_ASSETS` at `1330f58`):

| Group | Bytes |
| --- | ---: |
| Ten runtime terrain textures, PR #32 (`/textures/terrain/runtime/*-top-down-v1.png`) | 1,334,733 |
| `tree-grass-v1-480.webp` | 54,200 |
| `fighter.png` (unchanged, out of scope) | 8,843 |
| `fighter-portrait-96.webp` | 4,568 |
| `unlock-tone.mp3` + `unlock-tone.ogg` | 5,230 |
| Manifest total on disk | 1,407,574 |
| Per-request overhead charged by the unit gate: 300 × (15 requests + 1 portrait re-request) | 4,800 |
| **On the wire (unit gate and §8 measurement)** | **1,412,374** |
| L4 limit (#20 §6) | 1,500,000 |
| Headroom | 87,626 |

Measured on the wire the same set is 1,412,374 bytes (§8): each request carries about 300 bytes of headers and the DOM image's second request for the portrait is a 300-byte cache hit. The unit gate charges that overhead on top of the on-disk sum (`WIRE_OVERHEAD_BYTES` in the test, review finding 3), so a green test means the wire figure is inside L4, not the 4,800-byte smaller on-disk one. Before this change the same measurement was 5,756,208 bytes on the live deploy (`9feb1df`, plan §1), so the asset load drops by 4,343,834 bytes, 75.5%. The terrain set is now 94.8% of the asset load; any content issue that adds a material has to re-examine it against L4 (plan §7.4).

## 6. Verification

Host as in the #20 note: Linux 6.6.114.1 (WSL2), Node v24.15.0, Playwright 1.63.0 with its own Chromium 153.0.8010.12, headless. Commands in order:

- **RED, unit** (`00a8dea`, before the exports existed): `npx vitest run tests/unit/proofAssetExports.test.ts`: 3 failed, 1 passed. Tree `{ width: 1233, height: 1276 }` did not equal `{ width: 480, height: 497 }`; portrait `{ 1254, 1254 }` did not equal `{ 96, 96 }`; cold manifest `expected 5751408 to be less than or equal to 1500000`. The allowlist assertion passed already.
- **RED, browser** (same commit): `npx playwright test tests/assets.spec.ts tests/grass-surface.spec.ts --project=desktop`: 2 failed, 1 passed. Portrait `naturalWidth`/`naturalHeight` `{ 1254, 1254 }` did not equal `{ 96, 96 }`; the grass spec's `image.decode()` threw `EncodingError: The source image cannot be decoded` because `/proof/grass-material-v1-348.png` did not exist.
- **GREEN** (`1330f58`): `npx vitest run tests/unit/proofAssetExports.test.ts`: 4 passed. `npm run test:unit`: 9 files, 45 passed (41 before, 4 new). `npm run typecheck`: clean. `npm run build`: clean apart from the known Phaser chunk-size warning; `dist/proof/` holds the four originals, the three exports and the two tones. `npm test`: 93 passed across desktop, mobile-portrait and mobile-landscape in 2.8 min; the grass-corner, occlusion-fixture, opacity, terrain-material, input, move, audio, lifecycle and layout specs are unchanged. `npm ci`: lockfile unchanged (no new dependency). `git diff --check`: clean.
- **Review fixes** (PR #37, 2026-10-08, same host). Finding 1, RED at `752cba4` with the two new specs in `tests/assets.spec.ts`: `a proof image that downloads but cannot be decoded gives a controlled visible error` (`route.fulfill` of undecodable bytes for `tree-grass-v1-480.webp`) and `a proof asset answered by the HTML shell (missing file on the deploy) gives a controlled visible error` (an `index.html`-shaped 200 for `fighter-portrait-96.webp`); both timed out after 5 s with the status still `Loading`. GREEN at `cf7cb74`: the three error specs pass in 2.1 s. Finding 3, scratch check with `PROOF_COLD_ASSET_BUDGET_BYTES` at 1,410,000: the on-disk assertion passed, the on-the-wire one failed with `expected 1412374 to be less than or equal to 1410000`; at the real budget it passes. Finding 4, scratch check with `MAX_ZOOM` at 5: the old file failed only the tree case (needs 600 × 621), the new one also fails the grass case (`{ 348, 348 }` ≠ `{ 435, 435 }`); at 4 all five pass. Final tree (`2664246`): `npm run build` clean apart from the Phaser chunk warning; `npm run test:unit` 9 files, 46 passed (45 + 1); `npx playwright test` 99 passed across desktop, mobile-portrait and mobile-landscape in 2.9 min (93 + the two new specs × 3); `git diff --check` clean; no dependency change.
- `identify` and `sha256sum` of the three outputs: as in §4.

What the new unit test holds (`tests/unit/proofAssetExports.test.ts`): every `PROOF_ASSETS` extension is on the release allowlist; the tree file's pixel size equals `ceil(PROOF_ART.tree × PROOF_EXPORT.maxBoardZoom × canvasDensityCap)`; the portrait's equals `portraitCssPx × domDensityCap`; the grass fixture's is square at `ceil((TILE_WIDTH + 2 × bleed) / √2 × maxBoardZoom × canvasDensityCap)` (it is not in `PROOF_ASSETS`, so the test names the file; review finding 4); the on-disk sum of every cold-load file plus the §5 per-request overhead (4,800 bytes) is at most `PROOF_COLD_ASSET_BUDGET_BYTES`, so the gate holds the wire figure. It reads the PNG IHDR or WebP `VP8 `/`VP8L`/`VP8X` header directly, so it needs no image library. The dist-wide size report (`check-dist`, every file, largest file, ZIP caps) stays with #3.

## 7. Screenshots

Before: branch at `48383a8` (identical to `origin/main` `9feb1df` except for the plan file), built and captured before any test or asset change. After: `1330f58`. Both from `npm run build && npx playwright test tests/assets.spec.ts --project=mobile-portrait --project=mobile-landscape` (Pixel 7 emulation, device scale factor 2.625), the four fixture screenshots the spec writes. Each montage has the before row on top and the after row below; columns are Ground: Behind, Ground: In front, Raised: Behind, Raised: In front. Montages are scaled to 50% and quantized with `pngquant` so the files stay small.

| Orientation | Before (top) / after (bottom) |
| --- | --- |
| mobile-portrait | [fixtures-mobile-portrait-before-after.png](issue-35/fixtures-mobile-portrait-before-after.png) |
| mobile-landscape | [fixtures-mobile-landscape-before-after.png](issue-35/fixtures-mobile-landscape-before-after.png) |

Reading: tree placement, canopy overlap, the 40% fade behind the Fighter, grass corners and the panel are the same in both rows; the only pixel-level difference is the tree's and portrait's resampling source.

**Portrait at 3×**: [portrait-3x-before-after.png](issue-35/portrait-3x-before-after.png), left before (the 1254 px PNG scaled down by the browser), right after (the 96 px WebP scaled up by the browser), each a 144 × 144 device-pixel element screenshot of `#proof-portrait` on the Pixel 7 profile with `deviceScaleFactor: 3`. Eyes, outline, hair and armour colours read at 48 CSS px; the WebP is slightly softer, as expected from 2× source on a 3× screen. Captured with this script (`tmp/portrait-3x.mjs`, git-ignored, against `npx vite preview --host 127.0.0.1 --port 4175`):

```js
import { chromium, devices } from '@playwright/test';
const [origin, output] = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 3 });
const page = await context.newPage();
await page.goto(origin);
await page.getByRole('status').filter({ hasText: 'Ready' }).waitFor();
await page.locator('#proof-portrait').screenshot({ path: output });
await browser.close();
```

**Tree at maximum zoom**: at 6× the 480 × 497 texture is drawn 1:1, so [tree-480-canopy-lossless-vs-webp.png](issue-35/tree-480-canopy-lossless-vs-webp.png) compares a 200 × 200 crop of the canopy edge from the lossless resize (left, `tmp/tree-grass-v1-480.png`) with the same crop of the shipped WebP (right, decoded with `dwebp`), on the page background. No blocking or ringing at q85; q90 (61,744 bytes) remains within budget if a device review disagrees.

## 8. Collector runs

`scripts/measure-fit.ts` unchanged from `fed3936`. Three fresh-context cold loads and three same-context warm reloads per profile (desktop, Pixel 7 portrait, Pixel 7 landscape emulation); frames are the first ≥120 active scene-update intervals at idle. Timings are milliseconds from navigation start, medians of three.

### 8.1 Local, `1330f58`

`npm run build && npm run measure:fit -- docs/qa/issue-35/fit-local-1330f58.json`, 2026-10-08 10:04 UTC, loopback Vite preview, no TLS: [fit-local-1330f58.json](issue-35/fit-local-1330f58.json). `measuredBuild` `1330f58`, `dirty: false` (`sourceDirty` is true in the file only because this note's untracked screenshots were in the working tree). 18 samples, zero console or page errors.

| Profile | Cache | Transferred bytes | Controls usable ms (min..max) | Frame p50 / p95 ms |
| --- | --- | ---: | ---: | ---: |
| desktop | cold | 1,781,067 | 337 (264..357) | 16.7 / 17.0 |
| desktop | warm | 6,300 | 280 (270..309) | 16.7 / 16.9 |
| mobile-portrait | cold | 1,781,067 | 186 (178..230) | 16.7 / 16.9 |
| mobile-portrait | warm | 6,300 | 191 (161..198) | 16.7 / 16.8 |
| mobile-landscape | cold | 1,781,067 | 225 (223..244) | 16.7 / 17.0 |
| mobile-landscape | warm | 6,300 | 177 (163..191) | 16.7 / 16.9 |

Cold transfer by resource (desktop, first sample; identical bytes in every cold sample):

| Resource | Transferred bytes | Note |
| --- | ---: | --- |
| ten `textures/terrain/runtime/*-top-down-v1.png` | 1,337,733 | PR #32, unchanged |
| `proof/tree-grass-v1-480.webp` | 54,500 | was `tree-grass-v1.png` 1,117,792 |
| `proof/fighter.png` | 9,143 | unchanged |
| `proof/fighter-portrait-96.webp` | 4,868 + 300 (DOM image re-request, cache hit) | was `fighter-portrait.png` 3,285,410 + 300 |
| two unlock tones | 5,830 | unchanged |
| **Assets (L4 scope)** | **1,412,374** | limit 1,500,000: **passes** |
| code (HTML, CSS, three JS chunks) | 368,693 | L3 limit 400,000: passes |
| **Total cold** | **1,781,067** | |

`buildFiles` in the JSON inventories `dist/`: 34 files, 43,384,574 bytes, of which the never-requested sources (PR #32's ten 1024 × 1024 terrain PNGs, 32,928,588 bytes, and the three proof originals, 7,382,963 bytes) are 40,311,551 bytes; see §10.

### 8.2 Cloudflare Pages preview, `6a45b38`

`npm run measure:fit -- docs/qa/issue-35/fit-preview-6a45b38.json --url https://issue-35-proof-asset-export.tactics-guru-v2.pages.dev`, 2026-10-08 10:10 UTC, host network over HTTPS through the Cloudflare CDN, no throttling, CDN edge cache state not controlled: [fit-preview-6a45b38.json](issue-35/fit-preview-6a45b38.json). `measuredBuild` `6a45b38`, `dirty: false`, read from the served bundle and equal to the pushed head of PR #37. 18 samples, zero console or page errors.

| Profile | Cache | Transferred bytes (median of three) | Controls usable ms (min..max) | Frame p50 / p95 ms |
| --- | --- | ---: | ---: | ---: |
| desktop | cold | 1,781,791 | 911 (836..1,479) | 16.7 / 16.9 |
| desktop | warm | 7,271 | 549 (338..568) | 16.7 / 16.9 |
| mobile-portrait | cold | 1,781,522 | 1,189 (1,147..1,199) | 16.7 / 16.9 |
| mobile-portrait | warm | 7,271 | 671 (666..714) | 16.7 / 16.9 |
| mobile-landscape | cold | 1,781,791 | 1,076 (987..1,135) | 16.7 / 16.9 |
| mobile-landscape | warm | 7,271 | 664 (361..678) | 16.7 / 16.9 |

**Assets on a cold load are 1,412,374 bytes in all nine cold samples, exactly the loopback figure: L4 passes on the deploy with 87,626 bytes to spare.** The 324-byte spread in the cold totals is in the Phaser chunk's transfer size (363,607 to 363,931 bytes), that is CDN response headers, not content. Per resource (desktop, first sample): the ten terrain textures 1,337,733 (107–190 ms each), `tree-grass-v1-480.webp` 54,500 (183 ms), `fighter.png` 9,143, `fighter-portrait-96.webp` 4,868 + 300 (318 and 23 ms), two tones 5,830, Phaser chunk 363,931 (537 ms, the slowest request now), HTML 1,271 and the three small code files 4,270: code 369,472 (L3 passes).

Against the live deploy of `9feb1df` measured for the plan on the same host the same morning (cold assets 5,756,208; cold usable medians 1,758 / 1,793 / 1,695 ms; warm 463 / 754 / 700 ms): cold usable medians fall to 911 / 1,189 / 1,076 ms (L1 ≤ 2,500 passes, worst sample 1,479), and the warm medians are 549 / 671 / 664 ms with a worst sample of 714, inside L2's 750 where the morning run had mobile-portrait at 754. The warm change is reported, not attributed: warm reloads transfer only revalidations, so the decode of two much smaller images is the only candidate this change offers.

### 8.3 Main deploy after merge

Pending: `npm run measure:fit -- docs/qa/issue-35/fit-main-<sha>.json --url https://tactics-guru-v2.pages.dev` once Pages serves the merge commit; this is the run the acceptance criterion names.

## 9. Device record

Checklist for the testers on the preview URL, then on main after merge. Recorded as "pass as reported"; device models and versions are not requested. Since `cf7cb74` a WebP decode failure shows on screen as "Error: Could not load proof asset tree" or "… fighter-portrait. Reload the page to retry." with the controls disabled. On the builds before that commit, which the Android and desktop rows ran against, it would have left the status at "Loading" with every control disabled and no message: Phaser 4.2.1's `File.onProcessError` only logs a failed decode and never emits `FILE_LOAD_ERROR`, and `create()` returned silently on the missing texture (review finding 1). Those rows are unaffected, because reaching Ready needs both WebP textures decoded; a status that never leaves Loading on an older build is the decode failure.

Android: the user ran the five rows on a physical Android phone in Brave, Chrome, Edge and Samsung Internet against the preview URL serving `927eef6` on 2026-10-08 and reported a whole-list pass with no on-screen error: https://github.com/luminari-gurus/tactics-guru-v2/pull/37#issuecomment-6057730129. Desktop: the user ran the same rows in a desktop browser against the preview serving `f671042` on 2026-10-08, whole-list pass: https://github.com/luminari-gurus/tactics-guru-v2/pull/37#issuecomment-6057747895. Both WebP files therefore decode in the DOM image and in the Phaser texture on the four Android browsers and the desktop browser of the #20 device set. The iPhone rows are still pending.

| Check | Android: Brave, Chrome, Edge, Samsung Internet | Desktop | iPhone Safari | iPhone Chrome |
| --- | --- | --- | --- | --- |
| Status reaches Ready, no on-screen error | pass as reported | pass as reported | pending | pending |
| Portrait visible beside Restart and readable at its 48 px size (eyes, outline, colours) | pass as reported | pass as reported | pending | pending |
| Tree visible on every fixture; soft canopy edge, no dark halo, at fit zoom and at maximum pinch zoom | pass as reported | pass as reported (wheel for zoom) | pending | pending |
| Tree opacity slider still fades the tree behind the Fighter | pass as reported | pass as reported | pending | pending |
| Cold reload feels faster than before (no number asked for) | pass as reported | pass as reported | pending | pending |

## 10. Scope and limitations

- Out of scope, as the issue says: no new art, no atlas packing, no `check-dist` CI size report (#3), no change to board geometry, fixtures, controls or diagnostics beyond the two manifest URLs and the export-rule constants, no change to the game asset catalog or to `fighter.png` (64 × 80 drawn at 40 × 50 × 6: under-sized by the same rule, but 9 KB and not one of the three files).
- `dist/` is about 43 MB because `public/` is copied verbatim: PR #32's ten terrain sources (about 33 MB) and the three proof originals kept here (7.4 MB) are never requested by the scene, so they do not count toward L4, but the §5.1 release ZIP cap of 20 MiB would reject the folder. That is #3's `check-dist` step; moving the originals out of `public/` is a one-line change if the maintainer prefers it now.
- The canvas density cap of 1 describes today's renderer. If the DPR-capped canvas of tech design §5.5 is adopted, the tree must be re-exported (cap 2 gives 960 × 993, which cannot meet L4 with the current terrain set) or L4 revisited.
- Chromium emulation is not device acceptance: the WebP decode question for the portrait and the 3× readability are settled only by the §9 rows. Android (four browsers) and desktop are settled, pass as reported; the iPhone rows are open. A decode failure is visible as the §9 error message from `cf7cb74`, and the preview alias serves the latest push, so the iPhone rows run against the fix. PNG fallbacks and their commands are in §3.
- Warm medians against L2 are reported in §8.2 for the preview deploy without attributing the change; the loopback figures in §8.1 are not comparable to the deployed ones.
- §8.2 measures the Pages preview of this branch; the main-deploy run the acceptance criterion names (§8.3) can only happen after the merge.
