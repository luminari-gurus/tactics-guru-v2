# Overworld map contract

Open `/map` under the configured Vite base. The independent 20×20 inspection prototype has Map type and Biome controls; it does not initialize a battle, audio or storage.

## Layout and biome

Defaults are Rooms, Grassland and Simple art. Layout IDs/versions are `rooms`/`rooms-v1`, `random-walker`/`random-walker-v1` and `cellular`/`cellular-v1`. Layout owns 400 row-major binary blocked/walkable cells, a blocked perimeter, 60–320 open cells, cardinal connectivity and bounded fallback status. Rooms output is preserved.

Biome treatment follows layout generation and preserves every cell's walkability. All nine type/biome combinations are supported. There are no battle terrain rules, movement costs or generation constraints associated with a biome.

| Biome ID / version | Open terrain / Simple color | Blocked terrain / Simple color | Treatment |
| --- | --- | --- | --- |
| `grassland` / `grassland-v1` | `grassland-open`: grass, `#b9cba3` | `grassland-blocked`: rock, `#233339` | Existing light grass and dark raised-edge blocked appearance |
| `forest` / `forest-v1` | `forest-open`: clearing, `#8dbb81` | `forest-blocked`: dense pines, `#173c2e` | Green clearings, dark canopy motif on blocked cells |
| `desert` / `desert-v1` | `desert-open`: sand, `#e5c581` | `desert-blocked`: rock, `#6b4c38` | Pale sand, dark diagonal rock motif on blocked cells |

The six stable terrain IDs identify environmental treatment, not art style. `applyBiome` in [biomes.ts](../src/map/biomes.ts) returns layout fields plus biome ID/version and a separate readonly per-cell `terrain` layer. Treatment is a pure 400-cell mapping and consumes **no RNG**. Seed + map type/version + biome/version reproduce identical data; changes to treatment behavior require a biome version change. Rendering reads the retained treated map and does not generate terrain or consume generation/battle entropy.

## Controls and reproducibility

Each labeled native dropdown supports keyboard/mouse/touch. Changing type or biome applies the displayed valid unsigned 32-bit seed and current choices. Generate reproduces those choices; New seed changes seed while retaining committed selections. Invalid seed input leaves the map unchanged, restores both committed dropdowns and displays validation feedback. New seed still works when browser entropy is unavailable or repeats the current seed. Refresh resets to default seed 1/Rooms/Grassland; no URL or persistence feature exists.

Status and grid metadata identify seed, map type, algorithm version, biome ID/version and layout fallback. The legend matches the selected treatment, consistently showing light walkable and dark blocked cells; blocked motifs add differentiation beyond hue.

## Art integration and fallback

Simple is the only current art style and always covers all six terrain IDs. Imported styles belong to #98, which adds its own dropdown and verified inventory. That renderer must consume this retained terrain layer, preserve cells/terrain/seed/selections, and never draw generation RNG. Missing coverage or failed assets must render the matching Simple treatment with visible fallback feedback and matching legend. No legacy artwork is imported by #99, and no complete-coverage or new-artwork prerequisite exists. All three biomes can therefore be inspected now.

## Legacy references

Reference revision: [`e9433f6b608ae6b2d95418615cce9cf17dadcf74`](https://github.com/luminari-gurus/tactics-guru/tree/e9433f6b608ae6b2d95418615cce9cf17dadcf74).

- [Grass definition](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/terrain/grass.tres) identifies Grass.
- [Dense Pines definition](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/terrain/tree_dense.tres) is blocked and blocks LOS in legacy combat. Only its descriptive terrain meaning is used here; no legacy LOS rule is imported.
- The pinned inventory contains [grass/forest/mountain overworld files](https://github.com/luminari-gurus/tactics-guru/tree/e9433f6b608ae6b2d95418615cce9cf17dadcf74/art/overworld/8bit/generated/individual_32), corresponding 48px exports, and grass/forest tiles. File presence does not establish verified style coverage, licensing or suitable desert overworld art. Desert is an approved Simple treatment, not a claim of existing imported assets. #98 owns exact style/provenance/export verification.

See [issue #99](https://github.com/luminari-gurus/tactics-guru-v2/issues/99), [approved plan](../openspec/changes/issue-99-map-biomes/design.md), and [map algorithm evidence](qa/issue-97-map-algorithms.md).
