import type { AssetId, AssetRecord } from './types';
export const desertAssets = {
  "asset:terrain_sand": {
    "id": "asset:terrain_sand",
    "kind": "terrain-surface",
    "sourcePath": "docs/art/desert/source/sand.png",
    "runtimePath": "/battle/terrain/sand.png",
    "sourceWidth": 1024,
    "sourceHeight": 1024,
    "runtimeWidth": 256,
    "runtimeHeight": 256,
    "format": "png",
    "textureSpec": {
      "sourceWidth": 1024,
      "sourceHeight": 1024,
      "runtimeWidth": 256,
      "runtimeHeight": 256,
      "format": "png",
      "orientation": "top-down",
      "cellsPerTexture": 1,
      "opaque": true,
      "edgeTreatment": "seamless-repeat",
      "bakedGeometry": false
    },
    "provenance": {
      "origin": "generated",
      "tool": "Built-in image_gen",
      "generatedAt": "2026-10-19",
      "prompt": "Pale warm desert sand with fine wind ripples and tiny grains. Hand-painted tactical RPG material. Opaque square, orthographic top-down, uniform diffuse lighting, full bleed, seamless repeat edges. No objects, border, horizon, text, grid, watermark, perspective, diamond or baked geometry.",
      "referenceAssetIds": [],
      "sourceSha256": "a8f6da9ab2441e5b352e50658bdfbbcdc6cb6644538a99f3963723df729f94c4",
      "rightsNote": "Project generated with built-in image_gen at caller request. No reference assets or third-party license asserted.",
      "productionNotes": "Original 1254px output retained beside 1024px source. sips source and 256px runtime exports; no creative edits. Original and export visually inspected."
    }
  },
  "asset:terrain_rock": {
    "id": "asset:terrain_rock",
    "kind": "terrain-surface",
    "sourcePath": "docs/art/desert/source/rock.png",
    "runtimePath": "/battle/terrain/rock.png",
    "sourceWidth": 1024,
    "sourceHeight": 1024,
    "runtimeWidth": 256,
    "runtimeHeight": 256,
    "format": "png",
    "textureSpec": {
      "sourceWidth": 1024,
      "sourceHeight": 1024,
      "runtimeWidth": 256,
      "runtimeHeight": 256,
      "format": "png",
      "orientation": "top-down",
      "cellsPerTexture": 1,
      "opaque": true,
      "edgeTreatment": "seamless-repeat",
      "bakedGeometry": false
    },
    "provenance": {
      "origin": "generated",
      "tool": "Built-in image_gen",
      "generatedAt": "2026-10-19",
      "prompt": "Weathered warm gray sandstone rock surface, shallow fissures, darker than sand. Hand-painted tactical RPG material. Opaque square, orthographic top-down, uniform diffuse lighting, full bleed, seamless repeat edges. No objects, border, horizon, text, grid, watermark, perspective, diamond or baked geometry.",
      "referenceAssetIds": [],
      "sourceSha256": "dba4e0ce26b49bd1582d5d8b34ddeb4142d1963004e38f27e2c8adcd3bb1ab4e",
      "rightsNote": "Project generated with built-in image_gen at caller request. No reference assets or third-party license asserted.",
      "productionNotes": "Original 1254px output retained beside 1024px source. sips source and 256px runtime exports; no creative edits. Original and export visually inspected."
    }
  }
} as const satisfies Readonly<Record<AssetId,AssetRecord>>;
