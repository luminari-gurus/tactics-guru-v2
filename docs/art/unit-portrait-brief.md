# Reusable unit portrait brief

Follow the [unit artwork guide](unit-art-guide.md). Fill each field; reuse the **same identity block verbatim** in the [sprite brief](unit-sprite-brief.md). These are new briefs, not reconstructed original prompts.

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

## Portrait production request

Create a square head-and-upper-torso portrait for the identity above, following the finer illustrated linework, soft shaded materials and restrained palette of the supplied portrait references. Use {{frontal or slight three-quarter pose / expression}}; keep the face prominent, with {{recognizable equipment parts}} visible. Preserve {{must-keep face, head covering, clothing and accent cues}} from the sprite; proportional/detail simplification differs between media, character identity does not.

Use warm mottled parchment inside a thin dark brown decorative frame, with adequate room for hair, ears and headwear. No text, watermark or new UI. Follow the existing 1254×1254 source convention unless a different master size is explicitly reviewed. Preserve the full square frame when exporting a 96×96 optimized PNG with Lanczos resampling; no automatic face crop. Inspect the runtime export at 32×32 CSS pixels (current battle HUD) and 48×48 (documented export target). Check that the face, main color masses and equipment remain distinguishable. Keep source and export separately.

## Handoff record

- Source master path/dimensions/format: {{source}}
- Runtime path / proposed `asset:<slug>_portrait`: {{runtime / ID}}
- Full-frame composition / face and equipment placement: {{composition}}
- Tool or artist workflow / model/version when known: {{actual settings or unknown}}
- Brief/prompt / reference inputs / seed/settings / edits / date: {{production record}}
- Source and runtime SHA-256 / bytes / export tool/version and operation: {{hashes and export}}
- Rights evidence and unresolved gaps: {{evidence / unknowns}}
- Pair-identity, frame, 96/32/48-pixel review: {{results}}
- Exceptions requiring review / approval record: {{exceptions / disposition}}

Complete the guide's [review checklist](unit-art-guide.md#review-checklist). Text review does not approve new rendered artwork or certify its browser/device integration.
