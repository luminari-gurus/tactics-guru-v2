# First-battle content contract (#26)

`src/content/types.ts` defines plain, immutable, renderer-independent records; `constants.ts` owns inclusive numeric bounds and the texture specification. The runtime validator in `src/content/validate.ts` checks unknown input without Phaser, DOM, combat rules, asset generation or an authored map. The existing diagnostic terrain catalog remains independent: its fourteen IDs are not the battle contract.

## Identity, references and numeric rules

Map IDs use `map:` and asset IDs use `asset:` prefixes with nonempty stable snake_case suffixes. Hero IDs are fighter/ranger/mage; minimal enemy IDs are goblin_grunt/goblin_archer. Terrain IDs are grass/grass_path/stone/forest/water. IDs survive file relocation. Catalog keys must equal record IDs; references resolve within the same catalog. Spawn IDs are unique positive integers within a map and remain stable for ordering; multiple spawns can reference one enemy definition. Side determines the allowed unit-reference family. Cell identity is the unique (x,y) pair within its map, not a renderer coordinate.

All numeric fields are finite safe integers within `CONTENT_BOUNDS`. Width/height are 1–32; coordinates are 0–31 and additionally less than the map dimensions; elevation is 0–4. Every coordinate must appear exactly once (width × height cells). Spawns must name existing, walkable, unoccupied cells; spawn IDs are 1–64. Move cost stays positive even on unwalkable terrain; `walkable` determines whether it can be entered. Prop art is optional and separate from terrain; a prop reference does not implicitly change movement or LOS.

Stats use maxHp (1–100), move (1–8), jump (0–4), accuracy/dexterity/will (-10–20), armorClass (1–30) and power (0–20). These are schema safety limits chosen for a small fixed battle, not balance rules. Runtime HP, abilities, damage, initiative and AI do not belong in these definitions. Image dimensions are integers 1–4096; terrain surface dimensions and format must equal `TERRAIN_TEXTURE_SPEC`. Sprite/prop anchors are source-pixel positions within the source rectangle, measured from the top-left; portraits use the full frame. Re-export notes must record scaling and anchor changes.

TypeScript checks structure, discriminants and complete hero/enemy/terrain keys through `satisfies ContentCatalog`; it does not validate numbers, unique cells, key/ID equality or reference existence. `validateContent(input: unknown)` checks those invariants and returns either `{ ok: true, catalog: ContentCatalog }` or `{ ok: false, errors: ContentError[] }`. Errors include a typed code, field path and corrective message. It rejects unknown fields, non-data/accessor records, sparse arrays, malformed asset kinds/provenance, wrong asset-reference kinds and side/unit mismatches without changing inputs or inserting defaults. The returned catalog aliases the input; callers must preserve its readonly contract.

## Selected stat sources

Use the fixed legacy baseline documented in the repository's [source audit](phaser4-restart-plan.md), §3.4, rather than current seeded roster/progression values. Primary reference revision: `e9433f6b608ae6b2d95418615cce9cf17dadcf74` in `luminari-gurus/tactics-guru`.

| Definition | HP | Move | Jump | Accuracy | AC | Power | Dex | Will |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fighter | 18 | 4 | 1 | 4 | 14 | 3 | 0 | 1 |
| Ranger | 12 | 4 | 1 | 5 | 12 | 2 | 2 | 0 |
| Mage | 11 | 4 | 1 | 3 | 11 | 4 | 1 | 2 |
| Goblin Grunt | 9 | 4 | 1 | 4 | 12 | 2 | 1 | 0 |
| Goblin Archer | 8 | 4 | 1 | 4 | 11 | 2 | 2 | 0 |

Heroes come from `scripts/combat/ForestRuinsMvpBuilder.gd:1190–1211`; archer from that builder at 1527–1538; grunt from `content/classes/` and `content/units/` resource definitions, as traced in the audit §3.3. The old three-enemy composition is a deliberate baseline choice, not today's seeded shaman roster. These values select a future catalog baseline; only synthetic test data is shipped here. No combat behavior is inferred from stats.

## Terrain production brief

The first map is a forest ruin: grass for open ground, grass_path for paths, stone for ruins/platforms, forest for the ground under trees, water for blocked pools. Tree density and brush are props, not additional surfaces. Sand, ash, lava, mud and cliff materials are unnecessary for this map; height and cliff faces are renderer geometry. This is the smallest terrain set for that brief, not a full legacy terrain port.

`TERRAIN_TEXTURE_SPEC` requires newly generated **top-down surface textures**, with 1024 × 1024 source PNGs and 256 × 256 runtime PNGs. Sources preserve editing detail; runtime downsampling limits transfer/decode cost. Textures are square, opaque, diffuse-lit, one cell per image, at a consistent detail scale (features roughly 1/16–1/4 of a cell). PNG avoids lossy seams and supports the existing loader. North is image-up; no perspective, directional cast shadows, borders, baked diamonds, walls, elevations, trees or characters. Phaser owns projection, tile geometry, elevation, clipping and depth.

Edges must seamlessly repeat on both axes without a contrasting frame. Inspect a 3 × 3 repeat at runtime resolution and neighboring material transitions; generated prompts alone do not prove seamlessness. Retain material-specific palette variation, but avoid strong lighting gradients. The existing [newly generated terrain sources](art/terrain-textures.md) may satisfy this brief after that review; they are not automatically accepted production assets. Legacy tiles are inspiration only and never required imports or generation inputs.

Prompt template (substitute one of the five materials): “Orthographic top-down {material} ground surface for a forest-ruin tactics map, square seamless repeating texture, uniform diffuse lighting, consistent small natural detail, opaque edge-to-edge material, no perspective, isometric blocks, walls, elevation, trees, characters, text or frame.” Production notes must record material variations, exact prompt, tool/model, generation date, reference asset IDs (empty if none), edge review, resampling method and rejected/accepted artifact revision.

## Asset preservation and provenance

Every image has stable asset ID, source/runtime paths, both pixel dimensions, PNG format and provenance. Generated records require tool, date, exact prompt, reference IDs, source SHA-256, rights note and production notes. Canonical records require repository, pinned revision, original path, source SHA-256, rights note and production notes. A rights note records known origin/permissions or uncertainty; generation does not assert a third-party license. Keep source hashes when optimizing runtime exports and document the transformation.

Preserve the canonical Fighter/Ranger/Mage sprites and portraits. Fighter and its portrait already exist under `public/proof/`, with pinned source revision and hashes in [issue #16 asset evidence](qa/issue-16-assets.md); use those records rather than regenerate the hero. Ranger/Mage and selected goblin sprite/portrait records now pin their source revision in the [authored first-battle catalog](first-battle-content.md). The generated upright proof tree may be retained as a separate prop with its generation notes and foot anchor; the generated unlock tone may remain presentation audio outside this image contract. No bulk copy or mandatory legacy tile import is required. Runtime re-exports must preserve recognizable canonical art while addressing the open asset-size budget (#35).

## Focused proof and subsequent work

Reuse the configured Node Vitest harness: `npm run test:unit -- tests/unit/contentContract.test.ts`. `tests/unit/fixtures/contentContract.ts` contains a complete synthetic catalog with a one-cell map, bounded placeholder stats for all five unit IDs and generated surface metadata, plus compile-time rejection fixtures for enemy references in hero spawns and canonical terrain surfaces. Paths/hashes are intentionally fake; no asset files are implied. Run `npm run validate:content` for the representative valid/invalid synthetic fixtures in `tests/unit/content.test.ts` and actual authored catalog regressions in `tests/unit/authoredContent.test.ts`; this is schema/reference validation, separate from the renderer diagnostic board. It does not read packaged files, verify image pixels or hashes against files, assess rights, or approve generated art. Content E owns packaged-file checks.

Completion checks: `npm run test:unit`, `npm run typecheck`, `npm run build`, `npm test`, and `git diff --check`. Browser regression checks cover the existing diagnostic only. No physical-device or final battle acceptance is claimed by this schema change. The merged #20 [fit decision](qa/issue-20-fit-gate.md) permits first-battle work with its documented limitations and #35 loading follow-up; parent #2 remains open in the tracker.
