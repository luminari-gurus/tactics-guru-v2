# Overworld 8-bit Visual Style Placeholders

This directory defines the stable sprite-path contract for the experimental 8-bit overworld style.

Current implementation uses runtime-drawn placeholder sprites while these paths are reserved for
future art assets. They are intentionally stable and can be populated with real graphics later.

Expected asset names:

- terrain_forest_hidden.png
- terrain_forest_revealed.png
- terrain_road_hidden.png
- terrain_road_revealed.png
- terrain_water_hidden.png
- terrain_water_revealed.png
- poi_start_hidden.png
- poi_start_available.png
- poi_start_completed.png
- poi_combat_hidden.png
- poi_combat_available.png
- poi_combat_completed.png
- poi_elite_hidden.png
- poi_elite_available.png
- poi_elite_completed.png
- poi_event_hidden.png
- poi_event_available.png
- poi_event_completed.png
- poi_boss_hidden.png
- poi_boss_available.png
- poi_boss_completed.png
- party_marker.png

The paths are exposed by `OVERWORLD_8BIT_TILESET_PATHS` in
`scripts/run/OverworldScene.gd`.

## Generated art handoff

A generated cohesive 8-bit/16-bit inspired overworld set is available at:

`res://art/overworld/8bit/generated/`

Primary files:

- `generated/overworld_8bit_tiles_icons_48px_sheet.png` — transparent RGBA atlas, 5 columns x 7 rows, 48 x 48 px cells.
- `generated/overworld_8bit_tiles_icons_32px_sheet.png` — transparent RGBA atlas, nearest-neighbor 32 x 32 px version.
- `generated/individual_48/*.png` — one 48 x 48 px PNG per sprite.
- `generated/individual_32/*.png` — one 32 x 32 px PNG per sprite.
- `generated/HANDOFF.md` — full grid order, palette notes, and integration guidance.

Godot import notes:

- Use 2D Pixel import settings.
- Disable texture filtering or set filter to nearest.
- Disable mipmaps for crisp map/UI rendering.
- Atlas slicing for the 48 px sheet: cell size 48 x 48, columns 5, rows 7, margin 0, separation 0.
- Use terrain sprites as the base tile layer, POIs as an icon overlay, and `player_party_marker` as a separate top overlay so it remains visually distinct from POIs.
- Road tiles now include directional straight, corner, endcap, T, and cross variants so paths only read as crossroads where the map topology actually branches.
- Border tiles now include a dark bevel rim variant plus mossy/road-shoulder trim references for cleaner platform edges.
