# Reusable unit sprite brief

Follow the [unit artwork guide](unit-art-guide.md). Fill each field; reuse the **same identity block verbatim** in the [portrait brief](unit-portrait-brief.md). These are new briefs, not the original canonical generation prompts.

## Shared identity block

- Unit name / proposed snake_case slug: {{name / slug}}
- Player or enemy role / class concept: {{role / class}}
- Species / body type / relative scale: {{species / build / scale}}
- Face / hair / head covering / recognizable marks: {{identity cues}}
- Clothing / armor / material layers: {{layers and materials}}
- Weapons / carried equipment: {{weapon types and visible shapes}}
- Palette base / accent colors and locations: {{palette}}
- Distinctive silhouette: {{primary shape}}
- Exact reference sprite + portrait files, revision/hashes: {{closest pair and five-pair sheet}}

## Sprite production request

Create one full-body static unit sprite for the identity above, following the compact, enlarged-head proportions, simplified shaded raster treatment and dark contour separation of the supplied sprite references. Use an upright frontal/slight three-quarter pose toward the viewer, with {{weapon placement / stance}}. Preserve {{must-keep face, clothing, equipment and accent cues}} from the matching portrait. Reduce fine detail to readable shapes; do not substitute another head covering or weapon.

Deliver a 64×80 RGBA PNG on a transparent canvas, foot anchor (32,76), scaled relative to the existing units. Recommended clear margin: at least two pixels around content; record exceptions rather than moving the anchor. No terrain diamond, scenery, text, watermark, opaque backdrop or baked UI. Check weapons, ears, hat and feet for clipping and edge halos on light/dark backgrounds. Preview at 40×50 board units on an 80×40 tile, beside the five existing units; inspect fitted/zoomed runtime sampling before integration.

## Handoff record

- Source master path/dimensions/format: {{source}}
- Runtime path / proposed `asset:<slug>_sprite`: {{runtime / ID}}
- Canvas / alpha bounds / foot anchor: {{measured values}}
- Tool or artist workflow / model/version when known: {{actual settings or unknown}}
- Brief/prompt / reference inputs / seed/settings / edits / date: {{production record}}
- Source and runtime SHA-256 / bytes / export operation: {{hashes and export}}
- Rights evidence and unresolved gaps: {{evidence / unknowns}}
- Pair-identity, silhouette, padding, scale and halo review: {{results}}
- Exceptions requiring review / approval record: {{exceptions / disposition}}

Complete the guide's [review checklist](unit-art-guide.md#review-checklist). A text brief alone cannot pass rendered readability or integration checks.
