# Authored first battle (#29)

`src/content/catalog.ts` exports `battleCatalog` only after `validateContent` succeeds. The catalogs and the explicit 144 cells in `forestRuins.ts` are pure TypeScript data with no renderer, browser dependencies, resource parser, or runtime generation. `npm run validate:content` now checks both schema fixtures and the actual authored definitions, including malformed copies. The scripted integration test creates a seeded battle on this exact catalog, dispatches legal moves and turns, verifies Ranger’s +2 high-ground attack and an archer shot rejected `blockedLos` across forest at (1,3), then replays accepted commands to the identical final state and events. Rejected attempts leave the snapshot/RNG unchanged and are excluded from the replay log.

The three heroes and two enemy definitions use the baseline HP/Move/Jump/Acc/AC/Power/Dex/Will rows documented in [the existing design evidence, §4.3](tech_design.phaser4.draft.md). Those rows trace to the legacy builder/resources pinned at `e9433f6b608ae6b2d95418615cce9cf17dadcf74` in [the existing baseline evidence, §3.4](phaser4-restart-plan.md). The fixed six spawns use the documented earlier two-grunt/one-archer trio, not the later seeded shaman roster. No abilities, AI, inventory, or combat behavior are imported.

The 12×12 map retains the baseline platform (8–10,1–3), ledge (2–3,8–10), height-2 ruins (4–6,3–5), water cells, and spawn positions. Row 8 is the authored approach path. The contract has five materials: forest ground substitutes for the baseline tree/cliff blocking cells, with movement and LOS blocked; no tree/cliff art or prop is needed. Water is walkable at cost 3; grass/path/stone cost 1. All six spawns are in bounds, walkable, and distinct. Elevation counts are 120/15/9 at levels 0/1/2. This map is an authored adaptation, not an exact import of the old resource.

`assets.ts` registers exactly five approved terrain surfaces and five canonical sprite/portrait pairs. Surface sources, hashes, exact prompts, tool/date, empty reference lists, and repair history come from [the approved issue 27 manifest](qa/issue-27/manifest-v1-edge.json). Runtime files under `public/battle/terrain` are byte-identical copies of its approved exports. The retained historical production notes describe pending approval at earlier stages; the appended final approval records Brian's 2026-10-08 approval of these exact exports. No original generation source is replaced.

Canonical files are extracted from Git blobs in `luminari-gurus/tactics-guru` at `9303d9916d99e7bf4ecda36b55fbb038983af834`, not from uncommitted files. Every record pins the original path, revision, dimensions and SHA-256. Sources under `public/battle/source` preserve the PNGs unchanged; Fighter reuses its existing `public/proof` sources instead of duplicating them. Sprites remain 64×80 with foot anchor (32,76); portraits retain the full frame and use Pillow 10.2.0 Lanczos 96×96 optimized PNG exports, following the [issue 35 portrait rule](qa/issue-35-proof-asset-export.md) of 48 CSS pixels × density 2. Fighter matches the previously recorded canonical hashes. These are owner-repository project assets; available evidence does not establish a per-file third-party license or generation method, and none is asserted. Rights uncertainty is retained explicitly in each record.

Content E verifies packaged-file/image loading in a separate [catalog-loading and terrain-surface smoke scene](qa/issue-30-content-loading.md). The authored catalog still does not feed a full battle renderer; full board rendering/picking, canopy and selection remain issue 6. Browser emulation does not claim physical-device acceptance.

For future unit artwork, use the [unit-art guide and annotated five-pair reference sheet](art/unit-art-guide.md), with separate [sprite](art/unit-sprite-brief.md) and [portrait](art/unit-portrait-brief.md) briefs. It distinguishes the current 32-pixel battle HUD from the 48-pixel portrait export target and records source identity/padding differences without changing canonical assets.

## Goblin Shaman content foundation (#166)

The catalog now also admits `goblin_shaman` with baseline HP/Move/Jump/Acc/AC/Power/
Dex/Will **10/4/1/3/11/2/1/3** and Basic Attack ownership. The standalone map's
six original spawns and the authored-run/desert rosters remain unchanged. Support
rules and dungeon placement are tracked in [the current plan](ongoing-projects/plan.md)
and are not enabled by the content foundation alone.

The [sprite](../public/battle/source/goblin_shaman_sprite.png) and
[full portrait source](../public/battle/source/goblin_shaman_portrait.png) are
unchanged Git blobs from legacy revision `e9433f6b608ae6b2d95418615cce9cf17dadcf74`.
The registry records exact paths/hashes and the same rights uncertainty as the
existing artwork. Sprite dimensions are 64×80 RGBA, alpha bounds (4,13)–(60,80),
foot anchor (32,76); original lower-edge foliage is retained. The full-frame
portrait export uses Pillow 10.2.0 Lanczos, optimized RGB PNG, 96×96 without cropping.
The eager loader adds **28,208 runtime image bytes** (7,817 sprite + 20,391 portrait);
the retained 3,245,364-byte portrait source is packaged but is not requested by
the runtime loader. See [#166 QA](qa/issue-166/README.md) for actual checks.

## Run battlefield sources (procedural follow-up to PR #147)

The independent `battleCatalog` retains its authored forest map and terrain
records. `desertRunCatalog` adds sand (walkable, cost 1) and rock (blocked,
LOS-blocking), with new project-generated surfaces and provenance in
`src/content/desertAssets.ts` and `docs/art/desert/source/`.

Each production `BattlefieldEncounter` selects exactly one source: authored
`{kind:'authored', mapId:'map:ruined_approach'}` or generated
`{kind:'generated', biome:'desert', generatorVersion:1, profileVersion:'desert-v1'}`.
A bounded reader rejects mixed, missing, unknown and unsupported sources. Stable
full roster templates remain independent of carried HP. The first two existing
encounter IDs select generated desert; the final selects the authored ruined
approach. The final authored map passes common admission unchanged. The historical
forest court fails reversible admission and is not a run source; its independent
single-battle behavior remains available.

`resolveBattlefield` returns a deeply frozen full map, a bounded descriptor and
attempt/fallback diagnostics. Its canonical full-map hash includes all cells and
spawns before defeated heroes are filtered. Battle-local catalogs project
survivors and equipment once without changing the base catalogs.

Desert v1 is 12×12. It reserves flat deployment bands and a four-cell-wide core,
then decorates outside that core with 6–14 sparse rock cells and a broad 2×2
raised sand patch. Admission enforces at least 116 flat sand cells, at most 14
rocks, elevations 0/1, raised patches of at least four cells, two terrain exits
per spawn and two internally vertex-disjoint gateway routes. The gateways are
(5,2) and (5,9). Authored sources receive common structural, movement, deployment
and engagement checks without desert density or gateway restrictions.

Generation derives a layout seed with purpose `battle-layout-v1` from the
encounter seed/ID, then independent attempt seeds with `battle-attempt-v1` and
indices 0–3. Four failed attempts select the fixed open flat fallback. The fallback
is admitted through the same checks; its failure is a controlled error. No combat,
initiative or reward RNG is consumed. Diagnostics never determine reconstruction.
Reason codes are `structure`, `movementComponent`, `deployment`, `engagement`,
`profile` and `gateways`, with relevant cells/unit IDs and details.

Reproduce the corpus with `BATTLEFIELD_CORPUS=full npx vitest run
tests/unit/battlefieldCorpus.test.ts`. See `docs/qa/procedural-grids/corpus.json`
for exact versions, seeds, distinct hashes, selected attempts and measured cost.
