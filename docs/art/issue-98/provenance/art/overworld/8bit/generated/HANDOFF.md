# Tactics Guru overworld 8-bit asset handoff

Generated for the Godot project at `/opt/data/tactics-guru`.

## Files

- `overworld_8bit_tiles_icons_48px_sheet.png`
  - Main game-ready transparent RGBA sprite sheet.
  - 5 columns x 7 rows.
  - 48 x 48 px cells.
  - Sheet size: 240 x 336 px.
- `overworld_8bit_tiles_icons_32px_sheet.png`
  - Nearest-neighbor downscaled copy for direct 32 x 32 px use.
  - 5 columns x 7 rows.
  - Sheet size: 160 x 224 px.
- `individual_48/*.png`
  - One transparent RGBA PNG per sprite at 48 x 48 px.
- `individual_32/*.png`
  - One transparent RGBA PNG per sprite at 32 x 32 px.
- `sprite_manifest.txt`
  - Row/column order for sheet slicing.
- `generate_overworld_8bit_assets.py`
  - Deterministic stdlib-only generator script used to create these files.

## Intended sprite size and slicing grid

Recommended source size: 48 x 48 px.

Recommended Godot AtlasTexture / SpriteFrames slicing for the main sheet:

- Cell width: 48
- Cell height: 48
- Columns: 5
- Rows: 7
- Separation/margins: 0
- Filter: nearest / disabled texture filtering
- Mipmaps: off for UI or small tactical map rendering

The 32 px sheet can be used if the existing runtime renderer assumes 32 x 32 source art. It was downscaled with nearest-neighbor sampling to keep hard pixel edges.

## Sheet order

| Index | Row | Col | Asset |
|---:|---:|---:|---|
| 00 | 0 | 0 | terrain_grass_plains |
| 01 | 0 | 1 | terrain_forest |
| 02 | 0 | 2 | terrain_road_path fallback/cross |
| 03 | 0 | 3 | terrain_water |
| 04 | 0 | 4 | terrain_mountain_blocked |
| 05 | 1 | 0 | terrain_fog_unrevealed_overlay |
| 06 | 1 | 1 | terrain_revealed_empty |
| 07 | 1 | 2 | poi_start_trailhead |
| 08 | 1 | 3 | poi_regular_combat |
| 09 | 1 | 4 | poi_elite_combat |
| 10 | 2 | 0 | poi_boss |
| 11 | 2 | 1 | poi_shop |
| 12 | 2 | 2 | poi_camp |
| 13 | 2 | 3 | poi_treasure_cache |
| 14 | 2 | 4 | poi_resource_supply_cache |
| 15 | 3 | 0 | poi_event_unknown |
| 16 | 3 | 1 | player_party_marker |
| 17 | 3 | 2 | terrain_road_straight_horizontal |
| 18 | 3 | 3 | terrain_road_straight_vertical |
| 19 | 3 | 4 | terrain_road_corner_ne |
| 20 | 4 | 0 | terrain_road_corner_se |
| 21 | 4 | 1 | terrain_road_corner_sw |
| 22 | 4 | 2 | terrain_road_corner_nw |
| 23 | 4 | 3 | terrain_road_end_n |
| 24 | 4 | 4 | terrain_road_end_e |
| 25 | 5 | 0 | terrain_road_end_s |
| 26 | 5 | 1 | terrain_road_end_w |
| 27 | 5 | 2 | terrain_road_t_n |
| 28 | 5 | 3 | terrain_road_t_e |
| 29 | 5 | 4 | terrain_road_t_s |
| 30 | 6 | 0 | terrain_road_t_w |
| 31 | 6 | 1 | terrain_border_dark_bevel |
| 32 | 6 | 2 | terrain_border_mossy_broken |
| 33 | 6 | 3 | terrain_road_shoulder_endcap |

## Road and border update notes

- Runtime 8-bit road rendering now picks directional road sprites from revealed road adjacency.
- Straight road cells no longer use the old cross sprite; only true 4-way road topology uses `terrain_road_path`, rebuilt from the same directional-road construction so it matches the new variants.
- Classic/current primitive drawing is unchanged in this PR; the directional-road contract is only wired for the generated 8-bit sprite style.
- Revealed border cells now use the dark bevel stone rim sprite for cleaner platform edges.
- The mossy broken edge and road shoulder/endcap tiles are available as art references/variants for future biome-specific use.

## Palette notes

The set uses a compact warm fantasy palette:

- Warm grass greens for plains and forest.
- Tan, ochre, and brown path/settlement accents.
- Deep blue water with simple wave highlights.
- Warm gray cliffs/mountains with cream snow/edge highlights.
- Red/orange/purple danger colors for combat, elite, and boss icons.
- Gold/cream highlight color for readability at small sizes.
- Dark warm outline color for POI readability against terrain.
- Fog tile uses semi-transparent purplish gray RGBA so it can work as either a tile or an overlay.

## Godot integration notes

Suggested durable source location:

`res://art/overworld/8bit/generated/overworld_8bit_tiles_icons_48px_sheet.png`

Import settings in Godot:

1. Keep this folder under `art/overworld/8bit/`.
2. Select each PNG in the Godot FileSystem dock.
3. In Import settings:
   - Preset/Mode: 2D Pixel, or equivalent pixel-art settings.
   - Filter: Off / Nearest.
   - Mipmaps: Off unless using zoomed-out map views that need them.
   - Repeat: Disabled.
4. Reimport.
5. Slice as AtlasTexture regions using the 48 x 48 grid above, or use the `individual_48` PNGs directly.
6. Terrain tiles can be drawn as full square cells. POIs and the player marker are transparent-background icons intended to sit above terrain.
7. The player marker is a small banner/party pawn with a cream/red flag and blue body; it is intentionally not diamond-shaped, so it remains distinct from POI icons.

## Suggested refinement prompts

If further art polish is desired, ask the media profile for:

- More biome variants: swamp, quarry, ember wastes, ruins, snow, desert.
- Boardwalk, cobble, and rune-lit road variants using the same directional mask contract.
- Animated water frames and pulsing fog overlay frames.
- Larger 2x/3x preview sheet with labels for design review.
- Alternate player marker silhouettes: bootprints, hero pawn, glowing cursor, party banner.

## Limitations

- This is hand-authored procedural pixel art, not model-rendered concept art.
- Directional roads are currently implemented for cardinal road adjacency only.
- Full biome-specific border autotiling is reserved for a follow-up pass.
