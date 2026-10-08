# Issue 27: first terrain candidate review

Status: **v3 edge pass awaiting review; v2 approval preserved; not integrated, issue remains open**.
Prepared from current origin/main `53f54fa` after #26 and #2 closed. The merged contract explicitly permits review of existing newly generated terrain sources. This revision reuses those sources rather than generating unrelated materials.

## Current revision: v3 edge pass (2026-10-08)

Brian requested another pass on seamless repeating edges. Stone, water and grass_path were edited with built-in image_gen using their exact v2 sources as references. Grass/forest stay unchanged. Stone now uses more regular paving courses to reduce disconnected border slabs. An earlier irregular stone attempt was rejected: its vertical wrap MAE increased to 25.80, compared with v2’s 17.86. Only the selected output is retained in this package.

Current files and hashes: [manifest-v3.json](issue-27/manifest-v3.json). Exact final prompts: [prompts-v3.json](issue-27/prompts-v3.json). Raw outputs are preserved under `issue-27/generated/`; Pillow 10.2.0 Lanczos exports RGB opaque 1024×1024 sources and 256×256 runtime PNGs. Current runtime total: 718,946 bytes. No procedural seam blending or pixel matching occurred; all artistic editing used image_gen. The tool did not disclose its model.

- [Contact sheet](issue-27/contact-v3.png)
- [3×3 repeats](issue-27/repeat-v3.png)
- [Mixed adjacency](issue-27/adjacent-v3.png)
- [V2/V3 comparison](issue-27/comparison-v3.png): v2 left, v3 right at runtime resolution.

Boundary diagnostics compare first/last rows and columns using mean absolute RGB channel difference on a 0–255 scale. Interior adjacent-pixel differences are also recorded in [edge-review-v3.json](issue-27/edge-review-v3.json). These numbers measure color jumps, not whether a slab/ripple shape continues; there is no acceptance threshold or seamlessness claim.

| Material | V2 horizontal wrap | V3 horizontal wrap | V2 vertical wrap | V3 vertical wrap |
| --- | ---: | ---: | ---: | ---: |
| Stone | 15.32 | 15.99 | 17.86 | 13.91 |
| Water | 5.79 | 4.86 | 13.82 | 5.78 |
| Grass path | 11.46 | 14.32 | 12.55 | 13.90 |

Water is substantially improved at vertical joins. Stone’s vertical color jump is smaller, with a visible change from irregular slabs to paving courses; horizontal continuity still needs review. Path endpoints remain connected, but the new path did not improve raw boundary differences and repeated flower clusters remain visible. This revision is a comparison candidate, not a blanket replacement recommendation. Do not infer that lower average pixel differences prove seamless artwork.

V3 approval is null: the previous receipt covers only the old exact hashes and remains preserved. Issue 27’s seamless-repeat criterion remains unverified. Application behavior and runtime files are unchanged; prior 81 unit tests, 99 browser tests, type-check and build results remain applicable. Inline `python3`/Pillow validation passed exact five IDs, dimensions, RGB PNG opacity and hashes; boundary diagnostics and repeat previews were produced from exact exports. No physical-device acceptance is claimed.

## Approval receipt

Brian responded “looks good” to the displayed v2 candidate set on 2026-10-08. `manifest-v2.json` records visual approval with exact source/runtime filenames, SHA-256 hashes and terrain IDs (grass, grass_path, stone, forest, water). This supersedes earlier pending visual-approval statements for v2. The documented residual edge discontinuities remain; visual approval does not establish the seamless-repeat criterion or authorize a completion claim. Runtime integration remains separate.

## Previous revision: v2 (2026-10-08)

Brian requested revision of stone, water and grass_path after the v1 edge review. Built-in image_gen produced new referenced edits for water/path and a replacement stone layout after the first stone edit still showed broken joins. Only the selected final raw outputs are committed; v1 remains preserved. Grass and forest are unchanged.

Current exact exports and hashes are in [manifest-v2.json](issue-27/manifest-v2.json); exact prompts are in [prompts-v2.json](issue-27/prompts-v2.json). The model was not disclosed by the tool and is recorded as unknown. Raw 1254×1254 PNGs are under `issue-27/generated/`; Pillow 10.2.0 Lanczos exports opaque RGB 1024×1024 sources and 256×256 runtimes. The current five runtime files total 703,602 bytes. Reference IDs and the v1 reference source hashes are recorded for each revised material.

- [Current contact sheet](issue-27/contact-v2.png)
- [Current 3×3 repeats](issue-27/repeat-v2.png)
- [Current mixed adjacency](issue-27/adjacent-v2.png)
- [Before/after comparison](issue-27/comparison-v2.png): v1 left, v2 right, each repeated 3×2 at runtime resolution.

Path alignment between rows is more consistent, and water has less pronounced horizontal banding. Stone has a new, smaller slab arrangement. Repeated motifs and some edge discontinuities remain visible, especially in stone; this revision does not establish seamlessness or final approval. No procedural edge blending or artistic edits outside image_gen occurred. All outputs remain review candidates, outside the runtime asset graph.

V2 validation: inline `python3`/Pillow inspection passed the exact five terrain IDs, source/runtime sizes, RGB PNG format, hashes, runtime bytes and null approval. The earlier 81 unit tests, 99 Chrome browser checks, type-check and build results remain applicable to the unchanged application. No physical-device check or battle integration is claimed.

## Initial review package (v1)

Exactly grass, grass_path, stone, forest and water are represented. Candidate files are outside public/src and have no runtime consumers. `issue-27/manifest-v1.json` records exact filenames, proposed stable asset IDs, hashes, dimensions, prompts, generation notes and unknown model/rights information. Source exports are opaque 1024×1024 PNG; runtime exports are opaque 256×256 PNG (686,732 bytes total). North remains image-up; all resizing uses Pillow 10.2.0 Lanczos, first 1254→1024 then 1024→256. No edge repair, rotation or artistic edits occurred.

Original artwork was generated on 2026-10-07 with built-in image_gen according to the existing production records, without legacy images as generation inputs. The model was not recorded; no third-party license is asserted. Original full-resolution files and original source hashes remain preserved.

- [Contact sheet](issue-27/contact-v1.png): each exact runtime export at 256 pixels.
- [Repeat preview](issue-27/repeat-v1.png): each material repeated 3×3, no tile gaps, at runtime resolution.
- [Adjacent preview](issue-27/adjacent-v1.png): mixed neighboring surfaces without gaps or renderer geometry.

## Initial visual findings

Materials are distinct and readable: green grass, tan path, gray stone, dark forest floor and teal water. No baked projection, block sides, elevation, trees, characters, grid or UI occurs inside the source/runtime files. Labels belong only to the review sheets. Detail scale is comparable, although water's bright ripples are visually stronger than the quieter ground materials.

Grass and forest show recognizable repeated motifs; inspect those at projected cell scale before accepting. Grass_path has abrupt horizontal joins between vertically neighboring path segments, and repeating it across columns produces parallel paths. Stone slabs break at tile edges with visible horizontal/vertical joins. Water shows visible repeated bands and edge discontinuities. These findings mean **seamless-repeat acceptance is not established**. The mixed preview also shows hard material boundaries; renderer-owned transition treatment is outside this issue.

## Remaining work and approval gate

Revise/regenerate the failing edges in the media workflow, then export and review a new exact revision with the same five terrain IDs. Recheck repetitions and readability. Obtain Brian's approval of exact filenames and hashes, record that approval with terrain IDs, and only then integrate approved exports. No acceptance box is claimed complete by this initial review; no physical-device or battle-renderer acceptance is claimed. Do not promote these candidates to the production catalog.

## Verification

Asset inspection checks exact five terrain IDs, source/runtime dimensions, opaque RGB PNGs, hashes, runtime bytes and null approval. Existing application checks are recorded in the accompanying draft PR; they prove regression coverage only, not artistic quality or seamlessness. No new behavioral code or test harness is introduced.

Completion commands: `npm run test:unit` passed 81 tests in 13 files; `npm run typecheck` passed; `npm run build` passed with the existing large-chunk warning; `git diff --cached --check` passed. `npm test` initially encountered sandbox binding and then missing Playwright Chromium. `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test` passed all 99 tests in 3.9 minutes using desktop and mobile emulation. The inline Python/Pillow inspection passed all manifest/file invariants noted above.
