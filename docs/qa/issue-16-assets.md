# Issue #16: canonical proof assets and occlusion

## Source and selected files

Read-only source: local `tactics-guru` repository, revision `9303d9916d99e7bf4ecda36b55fbb038983af834`.
The source checkout was clean; each copied PNG was checked against the Git blob at that revision. Fighter and portrait are copied unchanged. The runtime uses the generated grass and tree replacements described below. Original grass/tree PNGs are retained only in the legacy source checkout and excluded from this PR. No Godot resources or gameplay catalogs were imported.

| Legacy source | Proof file under `public/proof/` | Source pixels | Display size before board fit | Anchor in source pixels |
| --- | --- | --- | --- | --- |
| `art/tiles/grass_detailed_N.png` | Not included | 256 × 352 | Source reference only | — |
| `art/tiles/tree_single_detailed_N.png` | Not included | 256 × 352 | Source reference only | (128, 170), base center |
| `art/units/fighter.png` | `fighter.png` | 64 × 80 | 40 × 50 | (32, 76), feet |
| `art/portraits/fighter_portrait.png` | `fighter-portrait.png` | 1254 × 1254 | 48 × 48 CSS | DOM image, full frame |

| Canonical source filename (grass/tree excluded from PR) | Bytes | SHA-256 |
| --- | ---: | --- |
| `grass.png` | 45,908 | `a3606b0dfeea0fe5022ec70cdbc1b29849c3b9b87bbefee2c973391771b2958e` |
| `tree.png` | 48,755 | `f7fac432ba6619e6e341f33bbf404fc6475ce9587c09f37434a6f070b3793044` |
| `fighter.png` | 8,843 | `b5b947941d91b9729fd953e903a932eef161c27de133bc5c5294d24fa0830981` |
| `fighter-portrait.png` | 3,285,110 | `712956d5e94716d240a0cce5fbcf37d3d82c3c4a68dd29de940d23b99f00e190` |

Original canonical PNG bytes: **3,388,616**. Current loaded PNG bytes, including the fresh grass material: **7,391,806**. The unchanged portrait accounts for 3,285,110 bytes; fresh grass accounts for 2,980,361 and the new tree for 1,117,492. #20 measures deployed cold/warm performance and sets budgets.

## Source history

Legacy docs record grass and single-tree art as project-generated detailed terrain: built-in image generation from a user-provided tactical RPG editor reference, followed by local extraction/normalization, with Kenney Sketch Town proportions/palette as a style reference.

Fighter sprite first appears in source commit `d71a71d0376f4625d1e06d602f011e5b4397993b`; portrait first appears in `542a03d83bfec52d8f4fd4372f22620dabae13b6`. Both commits were authored by the project owner and introduce the assets for this game's runtime. The available source does not record their generation method.

## Rendering and lifecycle

The 4×4 diagnostic board retains generated side faces and uses a fresh, opaque square grass material after the user's explicit authorization to generate new assets. The texture has no baked perspective or tile silhouette. The renderer rotates a square by exactly π/4 inside a container with vertical scale TILE_HEIGHT/TILE_WIDTH (1/2). Its unexpanded projected corners are the same 80×40 diamond vertices used by side faces and tile projection. A one-pixel horizontal bleed is clipped by masks made from those vertices. Original canonical grass remains in the legacy source checkout; the earlier transparent derivative is also excluded from this PR. The new tree uses its root anchor, and Fighter uses its canonical foot anchor.

Complete tile columns, surface art and occupants share stable grid-depth slots with the existing sum/y/x ordering. Elevation changes projected position, not depth priority. The fixed fixture buttons show one Fighter and one tree at a time. Ground fixtures use a tree at (2,0), elevation 0; raised fixtures use (1,1), elevation 1. The raised front Fighter stands on the existing elevation-2 tile at (2,2). Ground fixtures have ±28 logical-pixel foot offsets inside their tiles to make canopy overlap visible. They are diagnostic positions, not tactical moves.

Layout fits the union of all fixtures and full image rectangles below the panel, including transparent padding. The portrait displays separately in the panel. The four selected runtime images load through Phaser; the DOM portrait uses the same cached URL because Phaser revokes its temporary loader blob URL. Controls wait for both a rendered frame and the decoded DOM portrait. A failed asset produces a visible error with reload instructions and disabled scene controls.

Phaser owns the container and its 38 children (16 side/top graphics, 16 surface containers, four elevated-top outlines, one tree and one hero), plus 16 nested grass images and 16 scene-owned mask graphics: 71 objects in total; scene shutdown destroys them. Explicit shutdown removes fixture, portrait, resize, post-render and visibility listeners and disconnects the panel observer. Four cached textures are game-owned and reused across scene restarts. Restart returns to ground-behind and clears scene diagnostics.

## Verification

- RED-first: the two new desktop browser checks failed against the old scene: missing portrait and no controlled asset-load failure. The typed diagnostic contract was added before executing these behavior failures.
- `npm run test:unit`: all 12 existing geometry/measurement tests passed.
- `npm run build`: strict TypeScript check and production build passed; existing Phaser bundle-size warning remains.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`: all 24 checks passed across configured desktop and mobile-emulated portrait/landscape projects. New checks exercise actual fixture buttons, assert asset count/near-far depth/elevation, verify a decoded portrait, repeat restart three times, abort the Fighter request to verify controlled errors, and compare all 64 grass corners from actual Phaser transform matrices with the shared grid vertices after resize in both orientations. Existing checks cover complete board bounds, resize, readiness and lifecycle.
- `git diff --check`: passed.

Representative screenshots are linked below. Visual review checks grass alignment, readable Fighter/portrait, visible near/far canopy overlap and complete-board framing. Physical iPhone/Android acceptance remains in #20; these Chromium screenshots are supporting evidence.

| Fixture | Desktop | Mobile portrait | Mobile landscape |
| --- | --- | --- | --- |
| ground-behind | [image](issue-16/desktop-ground-behind.png) | [image](issue-16/mobile-portrait-ground-behind.png) | [image](issue-16/mobile-landscape-ground-behind.png) |
| ground-front | [image](issue-16/desktop-ground-front.png) | [image](issue-16/mobile-portrait-ground-front.png) | [image](issue-16/mobile-landscape-ground-front.png) |
| raised-behind | [image](issue-16/desktop-raised-behind.png) | [image](issue-16/mobile-portrait-raised-behind.png) | [image](issue-16/mobile-landscape-raised-behind.png) |
| raised-front | [image](issue-16/desktop-raised-front.png) | [image](issue-16/mobile-portrait-raised-front.png) | [image](issue-16/mobile-landscape-raised-front.png) |

## Previous transparent grass derivative (removed experiment)

`public/proof/grass-surface.png` was an experimental built-in ImageGen edit, now removed from this PR, of the original `art/tiles/grass_detailed_N.png`. The original remains in the read-only legacy checkout; its earlier proof copy was removed from this PR. The edit removes dirt walls, orange underside and opaque black bands. It has genuine RGBA transparency; inspection found no opaque pure-black pixels. Because ImageGen changes small texture details, this is an edited derivative rather than a pixel-exact crop of the canonical image.

- PNG dimensions: 1774×887; alpha bounds: (71,20) to (1758,869).
- Renderer frame: x=130, y=62, width=1510, height=755 (2:1); uniform scale: 82/1510; display before clipping: 82×41; masked visible diamond: 80×40; origin: center.
- SHA-256: `f4840886a8b68a4ecac4eb5a7ebb694d51a4184d91936510290ffdf67ccd2509`.
- Bytes: 1,093,498. These metadata record the removed experiment; it is not shipped.
- Method and final prompt: [grass-surface-prompt.md](issue-16/grass-surface-prompt.md).
- Visual comparison confirms that the old black bands and detached grass lips are removed. The screenshots in the table above now show the fresh material described below.

## Previous aspect-ratio and coverage correction

The previous alpha bounding frame measured 1687×849 (1.987:1) and included transparent padding and edge specks. Its actual grass diamond did not fill that rectangle, leaving exposed top-face color. The corrected runtime crop is 1510×755 (exactly 2:1) at (130,62), chosen inside the solid grass. Uniform scaling and clipped bleed fill the whole visible diamond without skewing the texture. The PNG bytes remain unchanged.

A prior version of `tests/grass-surface.spec.ts` failed on aspect ratio and uncovered alpha samples, then passed after that crop correction. The current test replaces the image-boundary assumption with actual transformed-corner checks for the fresh square material. Gray vertical faces are the authored elevation sides.

## Fresh material and exact corner projection (current)

The user subsequently authorized fresh generated assets to resolve the perceived angle mismatch. `public/proof/grass-material-v1.png` was generated with built-in ImageGen as a square, direction-neutral top-down grass material. It has no isometric edges or padding. Its square-to-diamond projection is renderer geometry, not a guessed image boundary.

- Dimensions: 1254×1254, RGB, completely opaque.
- Bytes: 2,980,361.
- SHA-256: `570aef06876d43488db7181dc97e3cf8fcb39dd7b4b515772629d86998d369a2`.
- Method and exact final prompt: [grass-material-v1-prompt.md](issue-16/grass-material-v1-prompt.md).
- Source: generated for this project at the user's request, with no reference image or externally sourced texture. The generation prompt is preserved.
- Projection: square side (TILE_WIDTH + 2×bleed)/√2, image rotation π/4, parent Y scale TILE_HEIGHT/TILE_WIDTH. Remove the bleed when comparing projected corners with the shared tile-face vertices. No empirical rotation adjustment is applied.
- Diagnostics expose maximum transformed-corner error. The browser check allows <0.001 CSS pixel for Phaser float32 matrix rounding; focused measurements observed about 0.000018 pixel, far below visible drift. All 64 corners are compared after resize.
- RED-first corner check failed against the prior renderer's missing projection evidence. Existing geometry tests already verify adjacent equal-height tiles share identical vertices.

The fresh texture and current fixture screenshots are a starting point for further visual iteration. The original tree asset remains in the legacy source checkout; Fighter/portrait remain canonical; newly generated grass is explicitly user-authorized and does not claim to satisfy unchanged canonical-grass artwork requirements.

## Elevated tile edge separation

Elevated tiles have a one-logical-pixel dark green outline along their exact top-face polygon. Borders draw above the grass and below occupants within each tile's depth slot, separating raised surfaces from lower grass behind/below them without changing projection or assets. Ground-level tops remain borderless. The four outline objects are scene-owned and reset with the rest of the proof.

## Generated tree and grass replacement (current)

The previously loaded tree was `art/tiles/tree_single_detailed_N.png` previously copied unchanged to `public/proof/tree.png` (now removed from this PR). At the user's request it is now replaced with `public/proof/tree-grass-v1.png`. Built-in ImageGen used the fresh `grass-material-v1.png` as a palette/material reference and the legacy tree only as a pine silhouette reference. The generated tree has a matching soft grass patch around its roots and a transparent background, without a hard tile/slab boundary. The existing projected grass remains underneath, so no grid geometry changes are needed.

- Dimensions: 1233×1276, RGBA; alpha bounds: (49,21) to (1205,1230).
- Bytes: 1,117,492; SHA-256: `850cb7e6868bc800c4ab108877b19d3f6077ab10ef74092f019c2a819679eba5`.
- Display: 80×(80×1276/1233), about 80×82.79 logical pixels, preserving source aspect ratio.
- Root anchor: horizontal center, source y=1070; originY=1070/1276.
- Exact prompt and method: [tree-grass-v1-prompt.md](issue-16/tree-grass-v1-prompt.md).
- Original tree PNG remains in the legacy source checkout and is excluded from this PR. This replacement is generated project art, explicitly user-authorized, and is not claimed to be unchanged canonical art.
- Current screenshots verify front/behind occlusion at ground and raised elevations, framing, borders, and restart using the replacement.

## Unit readability through canopy

The tree renders at the selected opacity when its bounds overlap the hero and it is in front in the existing depth order. The controls include a keyboard-accessible 0–100% slider with a live percentage display, initially set to 40%. It returns to full opacity for front fixtures or when bounds do not overlap. Only the prop fades; hero rendering and depth remain unchanged. The chosen opacity persists across fixture changes and scene restarts; restart restores the ground-behind fixture. The slider is disabled until ready and on asset-load failure, and its scene input listener is removed on shutdown. Diagnostics expose the actual prop alpha; browser checks verify both behind/front states at both elevation levels, 0%/100% endpoints and intermediate values, and repeated restart persistence. The new opacity assertions failed before the renderer change.

The slider acceptance check failed before implementation because no slider existed. After implementation it verifies actual rendered alpha via diagnostics and native keyboard input on desktop and mobile-emulated portrait/landscape.
