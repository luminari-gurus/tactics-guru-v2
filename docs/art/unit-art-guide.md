# Unit artwork guide

Use this guide and the [sprite brief](unit-sprite-brief.md) / [portrait brief](unit-portrait-brief.md) to produce a coherent player or enemy pair. This documents the five existing pairs; new guidance is labeled **Recommendation**. It does not approve new units or replace canonical artwork.

## Reference sheet and sources

![Five sprite/portrait pairs with annotated identity cues and display previews](unit-art-reference.png)

[Open the sheet at original size](unit-art-reference.png) for the 1:1 sprite sources, 3× nearest-neighbor inspections, and 40×50 board / 32×32 HUD / 48×48 export-target previews. Portrait inspection thumbnails are 230×230 from 1254×1254 sources; open the source links below to inspect their full resolution. The tile previews use an 80×40 diagnostic diamond at board scale 1, with the registered foot anchor. They illustrate size/placement, not a screenshot or physical-device readability certification. Phaser filtering, camera scale and device density can change the final sampling.

All ten sources are preserved from `luminari-gurus/tactics-guru` revision `9303d9916d99e7bf4ecda36b55fbb038983af834`. The [asset registry](../../src/content/assets.ts) records original paths, full SHA-256 hashes, dimensions, anchors and runtime exports. The sheet uses these exact source files and registered runtime PNGs; no source artwork was altered. Source links below point to the preserved copies, whose hashes were checked against that registry.

| Pair / asset IDs (`asset:` prefix) | Preserved sprite | Preserved portrait | Runtime portrait | Legacy originals at pinned revision |
| --- | --- | --- | --- | --- |
| Fighter: `fighter_sprite`, `fighter_portrait` | [64×80](../../public/proof/fighter.png) | [1254×1254](../../public/proof/fighter-portrait.png) | [96×96](../../public/battle/portraits/fighter.png) | [sprite](https://github.com/luminari-gurus/tactics-guru/blob/9303d9916d99e7bf4ecda36b55fbb038983af834/art/units/fighter.png), [portrait](https://github.com/luminari-gurus/tactics-guru/blob/9303d9916d99e7bf4ecda36b55fbb038983af834/art/portraits/fighter_portrait.png) |
| Mage: `mage_sprite`, `mage_portrait` | [64×80](../../public/battle/source/mage_sprite.png) | [1254×1254](../../public/battle/source/mage_portrait.png) | [96×96](../../public/battle/portraits/mage.png) | [sprite](https://github.com/luminari-gurus/tactics-guru/blob/9303d9916d99e7bf4ecda36b55fbb038983af834/art/units/mage.png), [portrait](https://github.com/luminari-gurus/tactics-guru/blob/9303d9916d99e7bf4ecda36b55fbb038983af834/art/portraits/mage_portrait.png) |
| Ranger: `ranger_sprite`, `ranger_portrait` | [64×80](../../public/battle/source/ranger_sprite.png) | [1254×1254](../../public/battle/source/ranger_portrait.png) | [96×96](../../public/battle/portraits/ranger.png) | [sprite](https://github.com/luminari-gurus/tactics-guru/blob/9303d9916d99e7bf4ecda36b55fbb038983af834/art/units/ranger.png), [portrait](https://github.com/luminari-gurus/tactics-guru/blob/9303d9916d99e7bf4ecda36b55fbb038983af834/art/portraits/ranger_portrait.png) |
| Goblin Grunt: `goblin_grunt_sprite`, `goblin_grunt_portrait` | [64×80](../../public/battle/source/goblin_grunt_sprite.png) | [1254×1254](../../public/battle/source/goblin_grunt_portrait.png) | [96×96](../../public/battle/portraits/goblin_grunt.png) | [sprite](https://github.com/luminari-gurus/tactics-guru/blob/9303d9916d99e7bf4ecda36b55fbb038983af834/art/units/goblin_grunt.png), [portrait](https://github.com/luminari-gurus/tactics-guru/blob/9303d9916d99e7bf4ecda36b55fbb038983af834/art/portraits/goblin_grunt_portrait.png) |
| Goblin Archer: `goblin_archer_sprite`, `goblin_archer_portrait` | [64×80](../../public/battle/source/goblin_archer_sprite.png) | [1254×1254](../../public/battle/source/goblin_archer_portrait.png) | [96×96](../../public/battle/portraits/goblin_archer.png) | [sprite](https://github.com/luminari-gurus/tactics-guru/blob/9303d9916d99e7bf4ecda36b55fbb038983af834/art/units/goblin_archer.png), [portrait](https://github.com/luminari-gurus/tactics-guru/blob/9303d9916d99e7bf4ecda36b55fbb038983af834/art/portraits/goblin_archer_portrait.png) |

Canonical sources are owner-repository project artwork. No per-file third-party license, original prompt, model or generation method is recorded. Retain that uncertainty; these briefs are new production instructions, not reconstructed original prompts or a rights clearance.

## Observed visual language

Sprites are compact, softly shaded raster figures with enlarged heads, short limbs, dark contour separation and a readable full-body equipment silhouette. They have visible pixel-scale detail at 64×80; the sheet enlarges them with nearest-neighbor sampling to expose it. Avoid inferring a strict pixel-art palette or uniform one-pixel outline: shaded edges include intermediate alpha/color values. Faces use a few high-contrast marks; tiny buckles and ornament are subordinate to hat/hood, weapon, shield and body shape.

Portraits use much finer illustrated linework and layered shading, with more natural head/body proportions than sprites. All five show head and upper torso inside a thin dark brown decorative frame over warm mottled parchment. Faces and equipment overlap that background; the frame remains visible. Their generally frontal or slight three-quarter pose reads toward the viewer. Sprites are upright front/three-quarter figures on the isometric board, rather than top-down silhouettes or perspective-baked terrain diamonds. One static facing is observed; no directional or animation contract is inferred.

The palette is restrained: olive greens, navy blues, brown leather, aged gold and gray metal. Highlights on upper-facing hair, hats and armor and darker undersides suggest soft overhead illumination; there is no verified universal light angle. Sprites use stronger simplification, portraits finer material detail. Preserve broad light/dark masses at small size instead of copying every portrait hatch into a sprite.

| Sheet annotation | Shared identity to preserve | Meaningful differences / review cue |
| --- | --- | --- |
| Fighter A/B | Blond tousled hair; blue/gold clothing; silver shoulder armor; sword and blue/gold shield | Sprite weapon and shield form the silhouette. Portrait crops the body and adds metal texture and straps. |
| Mage A/B | Blond hair; large blue/gold pointed hat; blue robe/cloak; staff with blue jewel | Hat height and staff are more useful at board size than fine embroidered borders. |
| Ranger A/B | Brown hair; olive hood and cloak; brown leather; bow and quiver | Hood and bow distinguish Ranger from Mage despite similar compact bodies. |
| Goblin Grunt A/B | Green skin, long pointed ears; stocky/crouched body; rough blade, round shield, dull armor | Portrait emphasizes angular face and teeth; sprite depends on ears, broad shoulders and shield. |
| Goblin Archer A/B | Green skin, long ears; slimmer archer silhouette; brown equipment, bow and quiver | Existing sprite has a pale cap; portrait has a green hood. Do not silently standardize this source mismatch. |

**Recommendation:** For new pairs, lock the same face/species, hair or head covering, clothing layers, weapon type, accent placement and distinguishing marks in a single shared identity block. The portrait may crop a weapon but should retain a visible recognizable part. Simplify detail and exaggerate key equipment in the sprite without changing character identity. Palette accents, species, build and equipment can vary by brief; framing, scale, edge treatment and rendering language should remain consistent. Player/enemy role alone does not require a new rendering style or a red/blue team recolor.

## Canvas, anchor and export contract

These values were checked on main base `d15caca` against [assets](../../src/content/assets.ts), [board rendering](../../src/phaser/BoardRenderer.ts), [unit geometry](../../src/geometry/canopy.ts), [tile geometry](../../src/geometry/iso.ts), [HUD](../../src/ui/hud.ts), and the [portrait export rule](../qa/issue-35-proof-asset-export.md).

| Property | Observed current convention | Guidance for new work |
| --- | --- | --- |
| Sprite source/runtime | 64×80 PNG, transparent background; sources are loaded unchanged | Preserve editable/high-resolution masters separately if used. Deliver a reviewed 64×80 RGBA runtime export. Do not resize/crop existing sources. |
| Foot anchor | Source pixel (32,76), normalized (0.5,0.95) | Align ground contact to this anchor; check placement beside all five references. It is a placement anchor, not the last opaque pixel. |
| Board size | 40×50 board units on an 80×40 tile; camera fit/zoom scales both | Compare at board scale 1 and in the actual fitted/zoomed scene. Do not make all species the same opaque height. |
| Portrait source/runtime | Full 1254×1254 square source → 96×96 optimized PNG, Pillow Lanczos | Keep the full frame, with no new crop. This source size is the observed baseline; a different master size requires a recorded exception and equivalent export proof. |
| Portrait display | Battle HUD is 32×32 CSS pixels; proof/export convention is 48 CSS pixels × density 2 | Preview at both 32 and 48. The 96 export is retained; this guide does not change the HUD. Enemy portraits are catalog assets, not displayed in the current hero-only party HUD. |
| Background | Sprite alpha; portrait warm parchment and brown frame | Avoid terrain, baked tile or opaque rectangle around sprites. Keep portrait framing and warm background unless an exception is reviewed. |

Measured nonzero-alpha bounds below use half-open coordinates `(left, top, right, bottom)` in the original sprite canvas. Faint edge pixels count. They are inspection evidence, not a mandatory silhouette envelope.

| Sprite | Alpha bounds | Transparent margins: left / top / right / bottom |
| --- | --- | --- |
| Fighter | (2,7,62,78) | 2 / 7 / 2 / 2 |
| Mage | (7,2,56,78) | 7 / 2 / 8 / 2 |
| Ranger | (4,2,59,78) | 4 / 2 / 5 / 2 |
| Goblin Grunt | (2,14,62,80) | 2 / 14 / 2 / 0 |
| Goblin Archer | (3,4,60,80) | 3 / 4 / 4 / 0 |

**Recommendation:** Aim for at least two transparent edge pixels around new sprite content, including weapons/headwear, and keep feet near the established baseline. If these conflict for a wide/tall design, review the silhouette rather than squeezing it or silently moving the anchor. Existing goblins touch the bottom edge and remain unchanged. Check alpha on light and dark backgrounds for halos, clipped tips or unexpected ground shadows.

### Production handoff

1. Copy both briefs and fill one identical identity block. Attach the closest complete reference pair and the five-pair sheet; provide exact reference file/revision or hash identifiers. Review pose, silhouette and identity before final export.
2. Keep source masters and production settings: tool/model/version when known, prompt or artist brief, reference inputs, seed/settings when applicable, date, edits and rights evidence/gaps. Unknown fields stay unknown. No invented provenance.
3. For a new snake_case slug, propose `asset:<slug>_sprite` and `asset:<slug>_portrait`. Current non-Fighter source names are `public/battle/source/<slug>_sprite.png` and `<slug>_portrait.png`; portrait runtimes are `public/battle/portraits/<slug>.png`. Fighter's proof paths are a historical exception. These names are recommendations until the new asset's integration is approved.
4. Export the sprite as RGBA PNG at 64×80, preserving edge alpha. Export the portrait from the entire source frame using `Image.resize((96, 96), Image.Resampling.LANCZOS)` and `save(..., optimize=True)` in Pillow; record the actual tool/version. Do not upscale a tiny portrait to manufacture detail. This follows existing production records, not a new dependency requirement.
5. Record source/runtime pixel dimensions, format, anchor, SHA-256, file byte sizes and source-to-export operation. In a future integration, register the reviewed files in `src/content/assets.ts` and reference those IDs from the hero/enemy catalog; never replace a canonical asset merely to add a unit. Follow [content loading](../qa/issue-30-content-loading.md), the [restart budgets](../phaser4-restart-plan.md) and [technical design](../tech_design.phaser4.draft.md). Account for added runtime transfer, image decoding and catalog validation before shipping. This documentation issue adds no unit or runtime asset.

## Review checklist

- [ ] Both briefs name identical species/face, headwear, clothing, weapon, accents and distinctive marks; references identify exact files/revisions/hashes.
- [ ] Silhouette distinguishes the unit beside Fighter/Mage/Ranger and both goblins at 40×50; face/equipment remain legible at 32×32 and 48×48 portrait sizes.
- [ ] Sprite retains simplified shading/contours; portrait retains finer illustrated materials, parchment and frame. Detail supports the identity rather than noise.
- [ ] Full source canvas, alpha bounds, padding, ground-contact anchor and relative body scale are checked; no clipped weapons, halos or unintended background on light/dark surfaces.
- [ ] Portrait full-frame export, visible face and recognizable equipment are checked at 96×96 and both display sizes; no silent crop or headwear substitution.
- [ ] Names, source/runtime files, dimensions, hashes, bytes, export settings and provenance/rights gaps are recorded; proposed exceptions are explicit.
- [ ] Before future runtime integration, validate catalog/loading, actual board/HUD placement, fit/zoom and transfer budget on the intended browser/device matrix. Text approval is not rendered-art approval.

## Worked briefs (text only)

### Hypothetical player: Amber Sentinel

Shared identity block: `amber_sentinel`; player; human, young adult with compact armored build; guard class concept; short auburn hair, round face and a left-eyebrow notch; steel pauldrons over navy cloth, brown belt, muted amber border; straight sword and oval navy shield bearing one amber chevron. Distinctive silhouette: broad shoulders and shield, with the hair visible. Primary reference: Fighter pair; all other pairs are scale/style checks. This describes artwork, not a playable class or stat change.

Sprite brief filled: use the shared identity above; full body, upright slight three-quarter stance toward the viewer; sword angled down on viewer-left, oval shield on viewer-right; simplify the chevron to one clear mark. 64×80 RGBA, foot anchor (32,76); target two-pixel clear margins; preserve a 40×50 readable shoulder/shield silhouette. No tile or backdrop.

Portrait brief filled: use exactly the same identity; head/upper torso, face centered above mid-frame, shield chevron visible in the lower-right composition and sword hilt visible opposite it; retain the eyebrow notch and auburn hair. Warm parchment and thin brown frame; illustrated steel/cloth shading. Square master following 1254×1254 reference convention, full-frame 96×96 PNG export; check 32/48 views.

Checklist review: identity, reference inputs, silhouettes, framing, sizes and proposed naming are specified. The notch may disappear in the sprite and is supplementary; shield/hair/colors carry identity. Alpha, clipping, actual readability, hashes, export settings and rights remain **pending rendered production**, rather than passed by this text example. No new runtime integration is proposed.

### Hypothetical enemy: Goblin Scout

Shared identity block: `goblin_scout`; enemy; green goblin, lean crouched build, long pointed ears and angular face; scout class concept; olive hood in both images, dark brown vest, tan wrist wraps, muted ochre shoulder patch; short wooden bow and quiver with three visible arrow tips. Distinctive silhouette: long ears outside the hood and a narrow bow arm. Primary reference: Goblin Archer pair; Grunt provides species/material contrast. Explicitly use the same hood in both outputs instead of repeating the existing cap/hood mismatch.

Sprite brief filled: use that identity unchanged; full body, slight three-quarter pose toward viewer, bow on viewer-left and quiver rising behind viewer-right shoulder; simplify patch and arrow tips. 64×80 RGBA at (32,76), two-pixel clear margins recommended, smaller opaque body than Sentinel without reducing the canvas; preview on the 80×40 tile at 40×50.

Portrait brief filled: same face, long ears, olive hood, ochre patch, wraps and bow/quiver; head/upper torso with bow grip and shoulder arrows visible; no pale cap. Warm parchment and brown frame; finer leather and skin detail matching the goblin references. Square 1254×1254 master convention → uncropped 96×96 PNG, reviewed at 32/48.

Checklist review: identity and the reference discrepancy are explicitly resolved for this hypothetical design; species/build contrast, silhouette, framing and export requirements are specified. Ear/arrow-tip clipping and hood readability require rendered checks. Hashes, tool settings, provenance/rights and actual integration acceptance remain **pending production**. No claim of a new playable enemy is made.

## Decisions and limits

Current conventions are evidenced above. The two-pixel padding recommendation, stricter pair identity matching and new-file naming are proposed guidance for future production; exceptions need art review. The existing Archer cap/hood difference, goblin bottom-edge coverage, 32-pixel HUD versus 48-pixel export target, original generation method and per-file rights evidence remain explicit. None requires rewriting existing assets to finish this guide.

Verified for [issue #88](https://github.com/luminari-gurus/tactics-guru-v2/issues/88) on 2026-10-13: all ten source dimensions/hashes and runtime dimensions against the registry, sprite alpha bounds, 35 relative links/anchors, ten pinned legacy source links, and the sheet's original-size layout. `npm run validate:content` passed 77 tests; `npm run build` passed both TypeScript configurations and production build, with the existing large Phaser chunk warning. `git diff --check` passed.

Local production-preview inspection in headless Chrome at 1280×900 and 412×915 reached Battle ready without page errors; screenshots were visually reviewed for board/HUD sampling. All three hero HUD images measured 32×32 with 96×96 natural dimensions. The proof scene's portrait measured 48×48 with 96×96 natural dimensions. These checks support the documented conventions; the mobile viewport is supporting emulation, not physical-device acceptance. Full gameplay unit/browser suites were not rerun for this documentation-only change.

Reference-sheet export: 1120×1720 RGB PNG (838,851 bytes), composed from unchanged sources/runtime exports using Pillow 12.3.0. Sprite inspection enlargement uses nearest-neighbor sampling; portrait thumbnails and runtime-size previews use Lanczos; labels use the local Helvetica font. The dark background and diagnostic tile are documentation layout elements. This file stays under `docs/art` and is not added to the game asset registry or runtime bundle.
