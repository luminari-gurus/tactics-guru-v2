# Asset Licenses

## Project-Generated Menu Art

- Runtime asset: `art/menu/splash_screen_v2.png`
- Legacy tracked menu image: `art/menu/splash_screen.png`
- Current loader: `scripts/menu/MainMenu.gd` uses `res://art/menu/splash_screen_v2.png`
- Runtime constraints: `splash_screen_v2.png` is a 1024x1536 main-menu artwork, temporarily restored to the original menu presentation while the refreshed title treatment is revisited. Live Godot `Button` controls remain positioned over `MainMenu.gd` `SPLASH_BUTTON_RECTS`.
- Provenance status: project-generated or project-edited asset; keep source prompts, source layers, or edit history with the art pipeline before reusing the image outside this repository.

## Hobgoblin Warrior Art

- `art/units/hobgoblin_warrior.png` — generated with OpenAI `gpt-image-2`; reviewed production unit sprite.
- `art/portraits/hobgoblin_warrior_portrait.png` — generated with OpenAI `gpt-image-2`; reviewed production portrait.

## Orc Berserker Art

- `art/units/orc_berserker.png` — generated with OpenAI `gpt-image-2`; reviewed production unit sprite.
- `art/portraits/orc_berserker_portrait.png` — generated with OpenAI `gpt-image-2`; reviewed production portrait.

## Skeleton Archer Art

- `art/units/skeleton_archer.png` — generated with OpenAI `gpt-image-2`; reviewed production unit sprite.
- `art/portraits/skeleton_archer_portrait.png` — generated with OpenAI `gpt-image-2`; reviewed production portrait.

## Documentation Visuals

- `docs/visuals/menu-button-cleanup-before-after.png`
- Purpose: before/after reference for the main-menu cleanup that removed baked button labels from the splash art and moved labels/states into runtime UI.
- Provenance status: repository documentation artifact; do not treat as a runtime game asset.

## Kenney Sketch Town

- Source folder: `sketch-town/`
- Runtime assets copied to: `art/tiles/`
- Creator/distributor: Kenney
- Website: https://www.kenney.nl
- License: Creative Commons Zero, CC0
- License URL: http://creativecommons.org/publicdomain/zero/1.0/
- Source license file: `sketch-town/License.txt`

Legacy source/runtime copies still tracked in `art/tiles/` but no longer selected by
`BattleView.TERRAIN_TEXTURE_PATHS` after the detailed terrain follow-up:

- `art/tiles/grass_center_N.png`
- `art/tiles/castle_center_N.png`
- `art/tiles/water_center_N.png`
- `art/tiles/dirt_low_N.png`
- `art/tiles/rocks_dirt_N.png`
- `art/tiles/tree_multiple_N.png`

## Project-Generated Terrain Tiles

- Runtime assets generated for this project in `art/tiles/`
- Style reference: existing CC0 Kenney Sketch Town tile proportions and palette
- Generation method: deterministic local image script run during development

Runtime assets currently selected by `BattleView.TERRAIN_TEXTURE_PATHS`:

- `art/tiles/grass_detailed_N.png`
- `art/tiles/grass_path_detailed_N.png`
- `art/tiles/stone_detailed_N.png`
- `art/tiles/forest_smooth_N.png`
- `art/tiles/forest_dense_detailed_N.png`
- `art/tiles/tree_single_detailed_N.png`
- `art/tiles/tree_cluster_detailed_N.png`
- `art/tiles/water_smooth_N.png`
- `art/tiles/cliff_smooth_N.png`
- `art/tiles/mud_smooth_N.png`
- `art/tiles/sand_smooth_N.png`
- `art/tiles/ash_smooth_N.png`
- `art/tiles/lava_smooth_N.png`
- `art/tiles/brush_smooth_N.png`

Slope and corner variants generated for terrain overlays:

- Pattern: `art/tiles/{terrain}_slope_{direction}_N.png`
- Corner pattern: `art/tiles/{terrain}_corner_{corner}_N.png`
- Terrains: `grass`, `stone`, `forest`, `water`, `cliff`, `mud`, `sand`, `ash`, `lava`, `brush`
- Directions: `up_left`, `up_right`, `down_left`, `down_right`
- Corners: `up`, `right`, `down`, `left`
- Current grass slope/corner overlays match the detailed `grass_detailed_N.png` style. `grass_smooth_N.png` remains in `art/tiles/` but is not selected by `BattleView.TERRAIN_TEXTURE_PATHS`.

## Project-Generated Detailed Terrain Tiles

- Runtime assets generated for this project in `art/tiles/`
- Style reference: user-provided tactical RPG editor screenshot with detailed isometric grass, ruins, and pine forest tiles
- Generation method: built-in image generation reference sheet, then local chroma-key extraction and normalization to the project tile canvas
- Alignment note: `grass_detailed_N.png` and `grass_path_detailed_N.png` have been adjusted to sit correctly under `BattleView.TILE_TEXTURE_SIZE = Vector2(78, 107)` and `TILE_TEXTURE_OFFSET = Vector2(39, 45)`. Runtime path names stayed the same, so code and web export filters should continue to include the existing `art/tiles/` PNG paths.

Generated detailed assets:

- `art/tiles/grass_detailed_N.png`
- `art/tiles/grass_path_detailed_N.png`
- `art/tiles/stone_detailed_N.png`
- `art/tiles/forest_dense_detailed_N.png`
- `art/tiles/tree_single_detailed_N.png`
- `art/tiles/tree_cluster_detailed_N.png`
- `art/tiles/grass_slope_{up_left,up_right,down_left,down_right}_N.png`
- `art/tiles/grass_corner_{up,right,down,left}_N.png`

## Fire Elemental Art

- `art/units/fire_elemental.png` — generated with OpenAI `gpt-image-2` via the dedicated Hermes media profile for issue #597, 2026-07-20; postprocessed, cropped, and downsampled to a transparent 64×80 tactical sprite.
- `art/portraits/fire_elemental_portrait.png` — generated with OpenAI `gpt-image-2` via the dedicated Hermes media profile for issue #597, 2026-07-20; postprocessed and cropped to a 512×512 portrait.

## Goblin Chief Art

- `art/units/goblin_chief.png` — generated/edited by provider `openai-codex` with `gpt-image-2-medium`, using Goblin Shaman, Grimgor, and Hobgoblin references; ImageMagick cleanup, downscale, and outline produced the approved 64×80 transparent tactical sprite.
- `art/portraits/goblin_chief_portrait.png` — generated/edited by provider `openai-codex` with `gpt-image-2-medium`, using Goblin Shaman, Grimgor, and Hobgoblin references; ImageMagick resize/crop produced the approved 1254×1254 portrait.
