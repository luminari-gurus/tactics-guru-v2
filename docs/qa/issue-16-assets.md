# Issue #16: canonical proof assets and occlusion

## Source and selected files

Read-only source: local `tactics-guru` repository, revision `9303d9916d99e7bf4ecda36b55fbb038983af834`.
The source checkout was clean; each copied PNG was checked against the Git blob at that revision. Only these four runtime images were copied, unchanged. No Godot resources or gameplay catalogs were imported.

| Legacy source | Proof file under `public/proof/` | Source pixels | Display size before board fit | Anchor in source pixels |
| --- | --- | --- | --- | --- |
| `art/tiles/grass_detailed_N.png` | `grass.png` | 256 × 352 | 88 × 121 | (128, 226); render crop (0,170,256,106), top only |
| `art/tiles/tree_single_detailed_N.png` | `tree.png` | 256 × 352 | 80 × 110 | (128, 170), base center |
| `art/units/fighter.png` | `fighter.png` | 64 × 80 | 40 × 50 | (32, 76), feet |
| `art/portraits/fighter_portrait.png` | `fighter-portrait.png` | 1254 × 1254 | 48 × 48 CSS | DOM image, full frame |

| Proof file | Bytes | SHA-256 |
| --- | ---: | --- |
| `grass.png` | 45,908 | `a3606b0dfeea0fe5022ec70cdbc1b29849c3b9b87bbefee2c973391771b2958e` |
| `tree.png` | 48,755 | `f7fac432ba6619e6e341f33bbf404fc6475ce9587c09f37434a6f070b3793044` |
| `fighter.png` | 8,843 | `b5b947941d91b9729fd953e903a932eef161c27de133bc5c5294d24fa0830981` |
| `fighter-portrait.png` | 3,285,110 | `712956d5e94716d240a0cce5fbcf37d3d82c3c4a68dd29de940d23b99f00e190` |

Total selected PNG bytes: **3,388,616**. The unchanged portrait accounts for 3,285,110 bytes. This increment records that cost; #20 measures deployed cold/warm performance and sets budgets.

## License and provenance status

Legacy `docs/asset_licenses.md` records grass and single-tree art as project-generated detailed terrain: built-in image generation from a user-provided tactical RPG editor reference, followed by local extraction/normalization. It describes Kenney Sketch Town proportions/palette as a style reference and Kenney source assets as CC0. These selected project-generated images do **not** acquire a CC0 declaration merely from that style reference.

Fighter sprite first appears in source commit `d71a71d0376f4625d1e06d602f011e5b4397993b`; portrait first appears in `542a03d83bfec52d8f4fd4372f22620dabae13b6`. Both commits were authored by the project owner and introduce the assets for this game's runtime. The available source does not record their creator/generation method or a separate asset license. No root license or explicit redistribution grant was found for these selected files. These are existing canonical project assets reused for the authorized diagnostic; third-party licensing or outside-project redistribution rights are not asserted. The source provenance gap is preserved here rather than filled with an invented license.

## Rendering and lifecycle

The 4×4 diagnostic board retains generated side faces and uses the canonical grass top art. Render-only cropping hides the legacy base slab, avoiding duplicate elevation geometry; source PNG bytes stay unchanged. Grass uses a top-face anchor, tree a base anchor, and Fighter a foot anchor.

Complete tile columns, surface art and occupants share stable grid-depth slots with the existing sum/y/x ordering. Elevation changes projected position, not depth priority. The fixed fixture buttons show one Fighter and one tree at a time. Ground fixtures use a tree at (2,0), elevation 0; raised fixtures use (1,1), elevation 1. The raised front Fighter stands on the existing elevation-2 tile at (2,2). Ground fixtures have ±28 logical-pixel foot offsets inside their tiles to make canopy overlap visible. They are diagnostic positions, not tactical moves.

Layout fits the union of all fixtures and full image rectangles below the panel, including transparent padding. The portrait displays separately in the panel. The four unique selected assets load through Phaser; the DOM portrait uses the same cached URL because Phaser revokes its temporary loader blob URL. Controls wait for both a rendered frame and the decoded DOM portrait. A failed asset produces a visible error with reload instructions and disabled scene controls.

Phaser owns the container and its 34 children (16 side/top graphics, 16 grass images, one tree and one hero); scene shutdown destroys them. Explicit shutdown removes fixture, portrait, resize, post-render and visibility listeners and disconnects the panel observer. Four cached textures are game-owned and reused across scene restarts. Restart returns to ground-behind and clears scene diagnostics.

## Verification

- RED-first: the two new desktop browser checks failed against the old scene: missing portrait and no controlled asset-load failure. The typed diagnostic contract was added before executing these behavior failures.
- `npm run test:unit`: all 12 existing geometry/measurement tests passed.
- `npm run build`: strict TypeScript check and production build passed; existing Phaser bundle-size warning remains.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`: all 21 checks passed across configured desktop and mobile-emulated portrait/landscape projects. New checks exercise actual fixture buttons, assert asset count/near-far depth/elevation, verify a decoded portrait, repeat restart three times, and abort the Fighter request to verify controlled errors. Existing checks cover complete board bounds, resize, readiness and lifecycle.
- `git diff --check`: passed.

Representative screenshots are linked below. Visual review checks grass alignment, readable Fighter/portrait, visible near/far canopy overlap and complete-board framing. Physical iPhone/Android acceptance remains in #20; these Chromium screenshots are supporting evidence.

| Fixture | Desktop | Mobile portrait | Mobile landscape |
| --- | --- | --- | --- |
| ground-behind | [image](issue-16/desktop-ground-behind.png) | [image](issue-16/mobile-portrait-ground-behind.png) | [image](issue-16/mobile-landscape-ground-behind.png) |
| ground-front | [image](issue-16/desktop-ground-front.png) | [image](issue-16/mobile-portrait-ground-front.png) | [image](issue-16/mobile-landscape-ground-front.png) |
| raised-behind | [image](issue-16/desktop-raised-behind.png) | [image](issue-16/mobile-portrait-raised-behind.png) | [image](issue-16/mobile-landscape-raised-behind.png) |
| raised-front | [image](issue-16/desktop-raised-front.png) | [image](issue-16/mobile-portrait-raised-front.png) | [image](issue-16/mobile-landscape-raised-front.png) |
