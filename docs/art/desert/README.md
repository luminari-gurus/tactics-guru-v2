# Desert battle surfaces

New images generated with built-in image_gen on 2026-10-19 after the caller chose
new desert textures over reuse. No input/reference assets were used. The original
1254px outputs are retained under `source/`; `sips -z` exported 1024px contract
sources and 256px runtime PNGs. Source SHA-256 hashes and provenance live in
`src/content/desertAssets.ts`. No creative raster edits were applied after generation.

Sand prompt: Use case: stylized-concept. Asset type: seamless repeatable tactical
RPG ground material. Create one opaque square 1024x1024 image of pale warm desert
sand, subtle fine wind ripples and tiny grains. Hand-painted restrained natural
warm ochre cream palette, readable at small scale. Exact orthographic straight-down
view, uniform diffuse lighting, full bleed surface to edges. Seamless opposite
edges. No objects, footprints, border, horizon, text, grid, watermark, perspective,
diamond, sides or baked geometry. This is a single material texture, not a scene.

Rock prompt: Use case: stylized-concept. Asset type: seamless repeatable tactical
RPG desert rock material. Create one opaque square 1024x1024 image of rough weathered
warm gray sandstone rock surface, shallow fissures, restrained brown gray palette
clearly darker than pale sand. Hand-painted natural texture, readable at small
scale. Exact orthographic straight-down view, uniform diffuse lighting, full bleed
surface to edges. Seamless opposite edges. No separate boulders, no sand, no cliff
silhouette, no objects, border, horizon, text, grid, watermark, perspective, diamond,
sides or baked geometry. This is a single material texture, not a scene.

Both exports were visually inspected for readability. Browser asset decoding and
production-board captures verify their runtime dimensions and use. Neither forest
nor water artwork represents the desert terrain.
