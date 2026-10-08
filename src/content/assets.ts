import { TERRAIN_TEXTURE_SPEC } from './constants';
import type { AssetId, AssetRecord } from './types';

export const battleAssets = {
  "asset:terrain_grass": {
    "id": "asset:terrain_grass",
    "kind": "terrain-surface",
    "sourcePath": "docs/qa/issue-27/candidates/grass-source-v1-edge.png",
    "runtimePath": "/battle/terrain/grass.png",
    "sourceWidth": 1024,
    "sourceHeight": 1024,
    "runtimeWidth": 256,
    "runtimeHeight": 256,
    "format": "png",
    "textureSpec": TERRAIN_TEXTURE_SPEC,
    "provenance": {
      "origin": "generated",
      "tool": "Built-in image_gen",
      "generatedAt": "2026-10-07",
      "prompt": "Use case: stylized-concept\nAsset type: reusable battle grid material texture\nPrimary request: Create a single square opaque top-down texture of short meadow grass, muted sage and olive greens.\nStyle/medium: hand-painted tactical RPG terrain, restrained natural colors, crisp readable shapes at small tile scale.\nComposition/framing: exact orthographic straight-down view, full-bleed square, surface reaches every edge, flat material only.\nLighting: soft uniform diffuse lighting, no directional cast shadows.\nConstraints: no isometric perspective, no diamond shape, no tile border, no extruded sides, no horizon, no text, no grid, no watermark. Opposite edges should blend when repeated. Keep texture detail moderately sized.",
      "referenceAssetIds": [],
      "sourceSha256": "ecddc2478d7757bd00b83ec5d532509999c2f8be60a6bdb55974b3892d7903b8",
      "rightsNote": "Project-generated with built-in image_gen; model and third-party license not recorded. Original production notes state no legacy PNG generation inputs.",
      "productionNotes": "Pillow 10.2.0 RGB opaque PNG; Lanczos original 1254 square to 1024 source, then 256 runtime. No rotation, edge repair, or artistic edits. North remains image-up. Existing generated artwork reused per merged contract; approval and seamlessness remain pending. Scripted repair authorized by Brian on 2026-10-08. Source and runtime repaired independently from exact v1 files; no interior regeneration, rotation or palette change. Source bands 64px; runtime bands 16px. Prior v1 generation provenance retained. New exact exports require review. Final exact source/runtime approved by Brian on 2026-10-08 (manifest-v1-edge.json approval); runtime copied byte-for-byte into public/battle/terrain."
    }
  },
  "asset:terrain_grass_path": {
    "id": "asset:terrain_grass_path",
    "kind": "terrain-surface",
    "sourcePath": "docs/qa/issue-27/candidates/grass_path-source-v1-edge.png",
    "runtimePath": "/battle/terrain/grass_path.png",
    "sourceWidth": 1024,
    "sourceHeight": 1024,
    "runtimeWidth": 256,
    "runtimeHeight": 256,
    "format": "png",
    "textureSpec": TERRAIN_TEXTURE_SPEC,
    "provenance": {
      "origin": "generated",
      "tool": "Built-in image_gen",
      "generatedAt": "2026-10-07",
      "prompt": "Use case: stylized-concept\nAsset type: reusable battle grid material texture\nPrimary request: Create a single square opaque top-down texture of worn tan earth path running vertically through meadow grass, path reaches top and bottom edges.\nStyle/medium: hand-painted tactical RPG terrain, restrained natural colors, crisp readable shapes at small tile scale.\nComposition/framing: exact orthographic straight-down view, full-bleed square, surface reaches every edge, flat material only.\nLighting: soft uniform diffuse lighting, no directional cast shadows.\nConstraints: no isometric perspective, no diamond shape, no tile border, no extruded sides, no horizon, no text, no grid, no watermark. Opposite edges should blend when repeated. Keep texture detail moderately sized.",
      "referenceAssetIds": [],
      "sourceSha256": "d9b4398c3b734bfe709d364e792693b41fb9d88521769b36553e6d77af9fdfa8",
      "rightsNote": "Project-generated with built-in image_gen; model and third-party license not recorded. Original production notes state no legacy PNG generation inputs.",
      "productionNotes": "Pillow 10.2.0 RGB opaque PNG; Lanczos original 1254 square to 1024 source, then 256 runtime. No rotation, edge repair, or artistic edits. North remains image-up. Existing generated artwork reused per merged contract; approval and seamlessness remain pending. Scripted repair authorized by Brian on 2026-10-08. Source and runtime repaired independently from exact v1 files; no interior regeneration, rotation or palette change. Source bands 64px; runtime bands 16px. Prior v1 generation provenance retained. New exact exports require review. Final exact source/runtime approved by Brian on 2026-10-08 (manifest-v1-edge.json approval); runtime copied byte-for-byte into public/battle/terrain."
    }
  },
  "asset:terrain_stone": {
    "id": "asset:terrain_stone",
    "kind": "terrain-surface",
    "sourcePath": "docs/qa/issue-27/candidates/stone-source-v1-edge.png",
    "runtimePath": "/battle/terrain/stone.png",
    "sourceWidth": 1024,
    "sourceHeight": 1024,
    "runtimeWidth": 256,
    "runtimeHeight": 256,
    "format": "png",
    "textureSpec": TERRAIN_TEXTURE_SPEC,
    "provenance": {
      "origin": "generated",
      "tool": "Built-in image_gen",
      "generatedAt": "2026-10-07",
      "prompt": "Use case: stylized-concept\nAsset type: reusable battle grid material texture\nPrimary request: Create a single square opaque top-down texture of weathered gray stone paving, irregular fitted slabs with subtle moss in cracks.\nStyle/medium: hand-painted tactical RPG terrain, restrained natural colors, crisp readable shapes at small tile scale.\nComposition/framing: exact orthographic straight-down view, full-bleed square, surface reaches every edge, flat material only.\nLighting: soft uniform diffuse lighting, no directional cast shadows.\nConstraints: no isometric perspective, no diamond shape, no tile border, no extruded sides, no horizon, no text, no grid, no watermark. Opposite edges should blend when repeated. Keep texture detail moderately sized.",
      "referenceAssetIds": [],
      "sourceSha256": "a4964fc33b9487c25b56955d0c0442fb7e78d46713ac490ca0ff73134607b254",
      "rightsNote": "Project-generated with built-in image_gen; model and third-party license not recorded. Original production notes state no legacy PNG generation inputs.",
      "productionNotes": "Pillow 10.2.0 RGB opaque PNG; Lanczos original 1254 square to 1024 source, then 256 runtime. No rotation, edge repair, or artistic edits. North remains image-up. Existing generated artwork reused per merged contract; approval and seamlessness remain pending. Scripted repair authorized by Brian on 2026-10-08. Source and runtime repaired independently from exact v1 files; no interior regeneration, rotation or palette change. Source bands 64px; runtime bands 16px. Prior v1 generation provenance retained. New exact exports require review. Final exact source/runtime approved by Brian on 2026-10-08 (manifest-v1-edge.json approval); runtime copied byte-for-byte into public/battle/terrain."
    }
  },
  "asset:terrain_forest": {
    "id": "asset:terrain_forest",
    "kind": "terrain-surface",
    "sourcePath": "docs/qa/issue-27/candidates/forest-source-v1-edge.png",
    "runtimePath": "/battle/terrain/forest.png",
    "sourceWidth": 1024,
    "sourceHeight": 1024,
    "runtimeWidth": 256,
    "runtimeHeight": 256,
    "format": "png",
    "textureSpec": TERRAIN_TEXTURE_SPEC,
    "provenance": {
      "origin": "generated",
      "tool": "Built-in image_gen",
      "generatedAt": "2026-10-07",
      "prompt": "Use case: stylized-concept\nAsset type: reusable battle grid material texture\nPrimary request: Create a single square opaque top-down texture of forest floor, dark moss, pine needles and sparse fallen leaves.\nStyle/medium: hand-painted tactical RPG terrain, restrained natural colors, crisp readable shapes at small tile scale.\nComposition/framing: exact orthographic straight-down view, full-bleed square, surface reaches every edge, flat material only.\nLighting: soft uniform diffuse lighting, no directional cast shadows.\nConstraints: no isometric perspective, no diamond shape, no tile border, no extruded sides, no horizon, no text, no grid, no watermark. Opposite edges should blend when repeated. Keep texture detail moderately sized.",
      "referenceAssetIds": [],
      "sourceSha256": "41af49a534e10853b200ed88b87a3cffe29a2c722ba49cf1a682b17ee5ba1855",
      "rightsNote": "Project-generated with built-in image_gen; model and third-party license not recorded. Original production notes state no legacy PNG generation inputs.",
      "productionNotes": "Pillow 10.2.0 RGB opaque PNG; Lanczos original 1254 square to 1024 source, then 256 runtime. No rotation, edge repair, or artistic edits. North remains image-up. Existing generated artwork reused per merged contract; approval and seamlessness remain pending. Scripted repair authorized by Brian on 2026-10-08. Source and runtime repaired independently from exact v1 files; no interior regeneration, rotation or palette change. Source bands 64px; runtime bands 16px. Prior v1 generation provenance retained. New exact exports require review. Final exact source/runtime approved by Brian on 2026-10-08 (manifest-v1-edge.json approval); runtime copied byte-for-byte into public/battle/terrain."
    }
  },
  "asset:terrain_water": {
    "id": "asset:terrain_water",
    "kind": "terrain-surface",
    "sourcePath": "docs/qa/issue-27/candidates/water-source-v1-edge.png",
    "runtimePath": "/battle/terrain/water.png",
    "sourceWidth": 1024,
    "sourceHeight": 1024,
    "runtimeWidth": 256,
    "runtimeHeight": 256,
    "format": "png",
    "textureSpec": TERRAIN_TEXTURE_SPEC,
    "provenance": {
      "origin": "generated",
      "tool": "Built-in image_gen",
      "generatedAt": "2026-10-07",
      "prompt": "Use case: stylized-concept\nAsset type: reusable battle grid material texture\nPrimary request: Create a single square opaque top-down texture of blue teal water surface with soft small ripples, no shore.\nStyle/medium: hand-painted tactical RPG terrain, restrained natural colors, crisp readable shapes at small tile scale.\nComposition/framing: exact orthographic straight-down view, full-bleed square, surface reaches every edge, flat material only.\nLighting: soft uniform diffuse lighting, no directional cast shadows.\nConstraints: no isometric perspective, no diamond shape, no tile border, no extruded sides, no horizon, no text, no grid, no watermark. Opposite edges should blend when repeated. Keep texture detail moderately sized.",
      "referenceAssetIds": [],
      "sourceSha256": "37765429bc45966d827ed25d3e8a016b99737612e8ec08acfb36044c1d06d3a5",
      "rightsNote": "Project-generated with built-in image_gen; model and third-party license not recorded. Original production notes state no legacy PNG generation inputs.",
      "productionNotes": "Pillow 10.2.0 RGB opaque PNG; Lanczos original 1254 square to 1024 source, then 256 runtime. No rotation, edge repair, or artistic edits. North remains image-up. Existing generated artwork reused per merged contract; approval and seamlessness remain pending. Scripted repair authorized by Brian on 2026-10-08. Source and runtime repaired independently from exact v1 files; no interior regeneration, rotation or palette change. Source bands 64px; runtime bands 16px. Prior v1 generation provenance retained. New exact exports require review. Final exact source/runtime approved by Brian on 2026-10-08 (manifest-v1-edge.json approval); runtime copied byte-for-byte into public/battle/terrain."
    }
  },
  "asset:fighter_sprite": {
    "id": "asset:fighter_sprite",
    "kind": "unit-sprite",
    "sourcePath": "public/proof/fighter.png",
    "runtimePath": "/proof/fighter.png",
    "sourceWidth": 64,
    "sourceHeight": 80,
    "runtimeWidth": 64,
    "runtimeHeight": 80,
    "format": "png",
    "provenance": {
      "origin": "canonical",
      "repository": "https://github.com/luminari-gurus/tactics-guru",
      "revision": "9303d9916d99e7bf4ecda36b55fbb038983af834",
      "originalPath": "art/units/fighter.png",
      "sourceSha256": "b5b947941d91b9729fd953e903a932eef161c27de133bc5c5294d24fa0830981",
      "rightsNote": "Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.",
      "productionNotes": "Unchanged canonical PNG; source-pixel foot anchor (32,76)."
    },
    "anchor": {
      "x": 32,
      "y": 76
    }
  },
  "asset:fighter_portrait": {
    "id": "asset:fighter_portrait",
    "kind": "portrait",
    "sourcePath": "public/proof/fighter-portrait.png",
    "runtimePath": "/battle/portraits/fighter.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "runtimeWidth": 96,
    "runtimeHeight": 96,
    "format": "png",
    "provenance": {
      "origin": "canonical",
      "repository": "https://github.com/luminari-gurus/tactics-guru",
      "revision": "9303d9916d99e7bf4ecda36b55fbb038983af834",
      "originalPath": "art/portraits/fighter_portrait.png",
      "sourceSha256": "712956d5e94716d240a0cce5fbcf37d3d82c3c4a68dd29de940d23b99f00e190",
      "rightsNote": "Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.",
      "productionNotes": "Canonical full frame retained; Pillow Lanczos 96x96 PNG export for 48 CSS pixels at density 2, following issue 35 portrait rule."
    }
  },
  "asset:ranger_sprite": {
    "id": "asset:ranger_sprite",
    "kind": "unit-sprite",
    "sourcePath": "public/battle/source/ranger_sprite.png",
    "runtimePath": "/battle/source/ranger_sprite.png",
    "sourceWidth": 64,
    "sourceHeight": 80,
    "runtimeWidth": 64,
    "runtimeHeight": 80,
    "format": "png",
    "provenance": {
      "origin": "canonical",
      "repository": "https://github.com/luminari-gurus/tactics-guru",
      "revision": "9303d9916d99e7bf4ecda36b55fbb038983af834",
      "originalPath": "art/units/ranger.png",
      "sourceSha256": "7203e2b3a992c9c88baa79f2cbddf89046613eb99440c413eda2e3bc45387332",
      "rightsNote": "Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.",
      "productionNotes": "Unchanged canonical PNG; source-pixel foot anchor (32,76)."
    },
    "anchor": {
      "x": 32,
      "y": 76
    }
  },
  "asset:ranger_portrait": {
    "id": "asset:ranger_portrait",
    "kind": "portrait",
    "sourcePath": "public/battle/source/ranger_portrait.png",
    "runtimePath": "/battle/portraits/ranger.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "runtimeWidth": 96,
    "runtimeHeight": 96,
    "format": "png",
    "provenance": {
      "origin": "canonical",
      "repository": "https://github.com/luminari-gurus/tactics-guru",
      "revision": "9303d9916d99e7bf4ecda36b55fbb038983af834",
      "originalPath": "art/portraits/ranger_portrait.png",
      "sourceSha256": "bd8c8786e1006f85df5db3dc423d3535ee7664dee4b32b1a679041b59cc1cb8a",
      "rightsNote": "Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.",
      "productionNotes": "Canonical full frame retained; Pillow Lanczos 96x96 PNG export for 48 CSS pixels at density 2, following issue 35 portrait rule."
    }
  },
  "asset:mage_sprite": {
    "id": "asset:mage_sprite",
    "kind": "unit-sprite",
    "sourcePath": "public/battle/source/mage_sprite.png",
    "runtimePath": "/battle/source/mage_sprite.png",
    "sourceWidth": 64,
    "sourceHeight": 80,
    "runtimeWidth": 64,
    "runtimeHeight": 80,
    "format": "png",
    "provenance": {
      "origin": "canonical",
      "repository": "https://github.com/luminari-gurus/tactics-guru",
      "revision": "9303d9916d99e7bf4ecda36b55fbb038983af834",
      "originalPath": "art/units/mage.png",
      "sourceSha256": "37fcb2969f129de5c29445cb8eabaa4589953b02879054e5d070adfd99a65e0b",
      "rightsNote": "Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.",
      "productionNotes": "Unchanged canonical PNG; source-pixel foot anchor (32,76)."
    },
    "anchor": {
      "x": 32,
      "y": 76
    }
  },
  "asset:mage_portrait": {
    "id": "asset:mage_portrait",
    "kind": "portrait",
    "sourcePath": "public/battle/source/mage_portrait.png",
    "runtimePath": "/battle/portraits/mage.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "runtimeWidth": 96,
    "runtimeHeight": 96,
    "format": "png",
    "provenance": {
      "origin": "canonical",
      "repository": "https://github.com/luminari-gurus/tactics-guru",
      "revision": "9303d9916d99e7bf4ecda36b55fbb038983af834",
      "originalPath": "art/portraits/mage_portrait.png",
      "sourceSha256": "f40dcba51ab801afbbcb6588579e18229cb74360497972991bfa50e679610c5c",
      "rightsNote": "Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.",
      "productionNotes": "Canonical full frame retained; Pillow Lanczos 96x96 PNG export for 48 CSS pixels at density 2, following issue 35 portrait rule."
    }
  },
  "asset:goblin_grunt_sprite": {
    "id": "asset:goblin_grunt_sprite",
    "kind": "unit-sprite",
    "sourcePath": "public/battle/source/goblin_grunt_sprite.png",
    "runtimePath": "/battle/source/goblin_grunt_sprite.png",
    "sourceWidth": 64,
    "sourceHeight": 80,
    "runtimeWidth": 64,
    "runtimeHeight": 80,
    "format": "png",
    "provenance": {
      "origin": "canonical",
      "repository": "https://github.com/luminari-gurus/tactics-guru",
      "revision": "9303d9916d99e7bf4ecda36b55fbb038983af834",
      "originalPath": "art/units/goblin_grunt.png",
      "sourceSha256": "57972fe37b1c0579eb2edc744965e7efda1d89334548279e33ebb7c42783cc97",
      "rightsNote": "Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.",
      "productionNotes": "Unchanged canonical PNG; source-pixel foot anchor (32,76)."
    },
    "anchor": {
      "x": 32,
      "y": 76
    }
  },
  "asset:goblin_grunt_portrait": {
    "id": "asset:goblin_grunt_portrait",
    "kind": "portrait",
    "sourcePath": "public/battle/source/goblin_grunt_portrait.png",
    "runtimePath": "/battle/portraits/goblin_grunt.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "runtimeWidth": 96,
    "runtimeHeight": 96,
    "format": "png",
    "provenance": {
      "origin": "canonical",
      "repository": "https://github.com/luminari-gurus/tactics-guru",
      "revision": "9303d9916d99e7bf4ecda36b55fbb038983af834",
      "originalPath": "art/portraits/goblin_grunt_portrait.png",
      "sourceSha256": "73248f68e4ada0036bb8cf379352631acec98b058ef63cc35ee17bc97f0b8992",
      "rightsNote": "Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.",
      "productionNotes": "Canonical full frame retained; Pillow Lanczos 96x96 PNG export for 48 CSS pixels at density 2, following issue 35 portrait rule."
    }
  },
  "asset:goblin_archer_sprite": {
    "id": "asset:goblin_archer_sprite",
    "kind": "unit-sprite",
    "sourcePath": "public/battle/source/goblin_archer_sprite.png",
    "runtimePath": "/battle/source/goblin_archer_sprite.png",
    "sourceWidth": 64,
    "sourceHeight": 80,
    "runtimeWidth": 64,
    "runtimeHeight": 80,
    "format": "png",
    "provenance": {
      "origin": "canonical",
      "repository": "https://github.com/luminari-gurus/tactics-guru",
      "revision": "9303d9916d99e7bf4ecda36b55fbb038983af834",
      "originalPath": "art/units/goblin_archer.png",
      "sourceSha256": "070fb462027ed7a5b530a5fdf343aaac95b54c5dc9b8e16e7e071664d129c39e",
      "rightsNote": "Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.",
      "productionNotes": "Unchanged canonical PNG; source-pixel foot anchor (32,76)."
    },
    "anchor": {
      "x": 32,
      "y": 76
    }
  },
  "asset:goblin_archer_portrait": {
    "id": "asset:goblin_archer_portrait",
    "kind": "portrait",
    "sourcePath": "public/battle/source/goblin_archer_portrait.png",
    "runtimePath": "/battle/portraits/goblin_archer.png",
    "sourceWidth": 1254,
    "sourceHeight": 1254,
    "runtimeWidth": 96,
    "runtimeHeight": 96,
    "format": "png",
    "provenance": {
      "origin": "canonical",
      "repository": "https://github.com/luminari-gurus/tactics-guru",
      "revision": "9303d9916d99e7bf4ecda36b55fbb038983af834",
      "originalPath": "art/portraits/goblin_archer_portrait.png",
      "sourceSha256": "a4ee1b8eb0ab4ed959a6cb160f9b8db330c2e4125b99122c17e175cd2becde4e",
      "rightsNote": "Canonical project artwork from owner repository. No per-file third-party license or generation method recorded; no third-party license asserted.",
      "productionNotes": "Canonical full frame retained; Pillow Lanczos 96x96 PNG export for 48 CSS pixels at density 2, following issue 35 portrait rule."
    }
  }
} satisfies Record<AssetId, AssetRecord>;
