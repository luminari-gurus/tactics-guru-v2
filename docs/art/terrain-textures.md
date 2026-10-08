# Top-down terrain materials v1

New project-generated artwork, created with the built-in image_gen tool on 2026-10-07 at Brian's request. Exact prompts are in `terrain-prompts-v1.json`. No legacy PNGs were used as generation inputs and no third-party license is asserted.

Full-resolution source PNGs are preserved for future artwork generation. Phaser loads 256×256 Lanczos-resampled PNGs from `public/textures/terrain/runtime/` (1,334,733 bytes total for 10 materials). The catalog exposes both `url` and `sourceUrl`.

The 14 terrain IDs from the legacy BattleView texture catalog map to 10 square, opaque ground material sources in `public/textures/terrain/`. The catalog is `src/terrain/materials.ts`; a tile's optional `terrain` selects its Phaser texture, defaulting to grass. The diagnostic board displays the catalog in row order, repeating grass and path in its last two cells.

Phaser rotates the square 45 degrees, compresses its vertical axis to the shared 2:1 diamond, and clips one pixel of bleed to the tile face. Elevation and sides remain geometry. Slope/corner artwork should reuse these materials rather than bake perspective into another source texture.

Tree single, cluster, and dense terrain IDs all map to the forest floor texture. Brush terrain uses grass. Embedded canopy and brush textures have been removed. Trees and foliage are added as separate depth-sorted props, following issue 16/PR 23; the existing upright tree remains separate in the diagnostic.

For future variants, use the relevant PNG as a material/style reference and request the new geometry explicitly. Preserve palette, detail scale, and diffuse lighting. The prompts request repeat-friendly edges, but seamless wrapping is not guaranteed by generation; inspect neighboring copies before using a source across a continuous surface.

The original generated grass proof image is retained under `public/proof/` for the existing projection regression check. Runtime terrain now uses the new catalog.

Asset sizes and SHA-256 hashes are in `terrain-manifest-v1.json`. Visual review: `terrain-contact-v1.png` and `terrain-board-v1.png`.
