# Overworld map contract

Current source reference: `b343ab02ae033a57f8c5f613f07883764f0752c0`. Historical evidence retains its original revision and test limits.

Open `/map` under the configured Vite base. The independent 20×20 inspection prototype has Map type, Biome and Art style controls plus stationary markers; it does not initialize a battle, audio or game-save storage. The shared privacy control may read the telemetry opt-out preference.

## Layout and biome

Defaults are Rooms, Grassland and Simple art. Layout IDs/versions are `rooms`/`rooms-v1`, `random-walker`/`random-walker-v1` and `cellular`/`cellular-v1`. Layout owns 400 row-major binary blocked/walkable cells, a blocked perimeter, 60–320 open cells, cardinal connectivity and bounded fallback status. Rooms output is preserved.

Biome treatment follows layout generation and preserves every cell's walkability. All nine type/biome combinations are supported. There are no battle terrain rules, movement costs or generation constraints associated with a biome.

| Biome ID / version | Open terrain / Simple color | Blocked terrain / Simple color | Treatment |
| --- | --- | --- | --- |
| `grassland` / `grassland-v1` | `grassland-open`: grass, `#b9cba3` | `grassland-blocked`: rock, `#233339` | Existing light grass and dark raised-edge blocked appearance |
| `forest` / `forest-v1` | `forest-open`: clearing, `#8dbb81` | `forest-blocked`: dense pines, `#173c2e` | Green clearings, dark canopy motif on blocked cells |
| `desert` / `desert-v1` | `desert-open`: sand, `#e5c581` | `desert-blocked`: rock, `#6b4c38` | Pale sand, dark diagonal rock motif on blocked cells |

The six stable terrain IDs identify environmental treatment, not art style. `applyBiome` in [biomes.ts](../src/map/biomes.ts) returns layout fields plus biome ID/version and a separate readonly per-cell `terrain` layer. Treatment is a pure 400-cell mapping and consumes **no RNG**. Seed + map type/version + biome/version reproduce identical data; changes to treatment behavior require a biome version change. Rendering reads the retained treated map and does not generate terrain or consume generation/battle entropy.

## Marker model

[state.ts](../src/map/state.ts) exports readonly `OverworldMarker` and `OverworldState` types
and `createOverworld(map: BiomeMap)`. The result is `{ ok: true, state }` or
`{ ok: false, reason }`, with no partial world on failure. A complete state retains the map,
`placementVersion: 'markers-v1'` and four ordered markers: `player`, `enemy-1`, `enemy-2`,
`enemy-3`. Each has a `player`/`enemy` kind and zero-based integer `x`/`y`.
DOM attributes project this state. The dungeon movement model reuses the marker shape.

Placement validates the existing connected 20×20 layout and matching terrain, then samples
four distinct row-major walkable indices without replacement. A fresh local RNG is seeded
with `(map.seed ^ 0x4d41524b) >>> 0`; the first four partial Fisher–Yates steps each use
`i + nextUint32(rng).value % (count - i)`. There are exactly four selection draws after
the existing RNG warmup, no retries, terrain regeneration, clock or browser entropy.
The same layout and seed reproduce positions. Biome and artwork never affect them.
All terrain versions and outputs are preserved; placement changes require their own version.
Modulo bias is accepted for these prototype spawns, with no distance or center-spawn rule.

The view retains this complete state. A cyan circle marks the player; coral diamonds numbered 1–3 mark
individual enemies with matching numbered legend keys, with dark borders and light edging above the existing terrain. The matching legend
wraps on narrow displays. The grid's accessible name includes occupant counts and its associated
description lists IDs at one-based row/column. Markers are noninteractive and add no tab stops.
See [issue #154 acceptance evidence](qa/issue-154-overworld-markers.md) for placement,
failure/recovery, browser matrices and screenshots.

## Controls and reproducibility

Each labeled native dropdown supports keyboard/mouse/touch. Changing type or biome applies the displayed valid unsigned 32-bit seed and current choices. Generate reproduces those choices; New seed changes seed while retaining committed selections. Invalid seed input leaves the map unchanged, restores both committed dropdowns and displays validation feedback. New seed still works when browser entropy is unavailable or repeats the current seed. Refresh resets to default seed 1/Rooms/Grassland; no URL or persistence feature exists.

Each successful generation commits terrain and all four markers together. Repeating inputs
reproduces positions; biome-only regeneration resets the state but reproduces positions on
the unchanged layout. Failed placement retains the previous complete world and committed
choices with explicit status feedback. Initial failure shows an unavailable empty grid and
usable retry controls. Successful regeneration clears the error.

Status and grid metadata identify seed, map type, algorithm version, biome ID/version and layout fallback. The legend matches the selected treatment, consistently showing light walkable and dark blocked cells; blocked motifs add differentiation beyond hue.

## Art integration and fallback

Simple is the default and always covers all six terrain IDs. Legacy 8-bit (`legacy-8bit`) uses three unchanged 48×48 procedural legacy PNGs. Grass plains represents grassland grass and forest clearings; mountain/rock represents blocked grassland, and pines represents blocked forest. Both desert treatments use Simple with visible missing-coverage feedback. HTTP/decode failures use Simple for the affected treatment; the legend always matches the actual presentation. Blocked imported cells have a dark outline for small-size readability.

Art changes only rerender retained terrain and markers and consume no generation/placement/battle RNG. A pending valid seed edit stays in the input without changing the generated map. Invalid seed input rejects art changes and keeps the committed choices with validation feedback. Generate/New seed retain the art selection. Late image completion reads current selections and preserves pending seed edits, validation and placement-failure feedback.

Images load lazily only when needed for Legacy 8-bit, under the configured base path, with no map artwork requests on the battle route. The three PNGs total 1,118 bytes before HTTP overhead. [Pinned inventory, hashes and coverage](art/issue-98/README.md) and [export manifest](art/issue-98/inventory.json) preserve source records and the known absence of an explicit license/creator entry; no CC0 license is asserted. Current and ASCII are legacy code-drawn presentations, and legacy isometric battle tile families are outside this bounded import. See [issue 98 QA](qa/issue-98-map-art.md) for measured transfer/bundle sizes and checks.

## Legacy references

Reference revision: [`e9433f6b608ae6b2d95418615cce9cf17dadcf74`](https://github.com/luminari-gurus/tactics-guru/tree/e9433f6b608ae6b2d95418615cce9cf17dadcf74).

- [Grass definition](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/terrain/grass.tres) identifies Grass.
- [Dense Pines definition](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/terrain/tree_dense.tres) is blocked and blocks LOS in legacy combat. Only its descriptive terrain meaning is used here; no legacy LOS rule is imported.
- The pinned inventory contains [grass/forest/mountain overworld files](https://github.com/luminari-gurus/tactics-guru/tree/e9433f6b608ae6b2d95418615cce9cf17dadcf74/art/overworld/8bit/generated/individual_32), corresponding 48px exports, and grass/forest tiles. File presence does not establish verified style coverage, licensing or suitable desert overworld art. Desert is an approved Simple treatment, not a claim of existing imported assets. #98 owns exact style/provenance/export verification.

See [issue #99](https://github.com/luminari-gurus/tactics-guru-v2/issues/99), [approved plan](../openspec/changes/issue-99-map-biomes/design.md), and [map algorithm evidence](qa/issue-97-map-algorithms.md).


## Dungeon movement model

`src/map/movement.ts` supplies the pure movement transition used by `/dungeon`. Enemy 1 wanders passively; enemy 2 chases the player’s pre-step position within Manhattan range 6, and enemy 3 blocks toward the resulting position within range 10. Detection ignores terrain. Each accepted dungeon player step advances living enemies at most one cardinal cell, in stable ID order, with collision resolution, avoidance of available stairs and an independent saved RNG. Pursuers use a shortest walkable path to a free cell adjacent to their target. Actual player and enemy positions govern occupancy, including when the old player cell is contested; adjacent or unreachable targets cause the pursuer to stay. See [Dungeon floors](dungeon.md) for encounters and persistence.

The `/map` inspection prototype has no movement timer, encounters, or player movement. Markers remain stationary until the user regenerates the map. The view's idempotent disposer removes lifecycle listeners; hidden or detached views ignore delayed artwork callbacks, and cached-page restoration redraws the retained map. Earlier movement demonstrations in [issue 155 QA](qa/issue-155-overworld-movement.md) describe historical revisions.
