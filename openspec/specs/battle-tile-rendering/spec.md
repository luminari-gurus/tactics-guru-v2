# battle-tile-rendering Specification

## Purpose

Preserve the authored battle's visual and interaction behavior while bounding static tile resources and requiring reproducible evidence for rendering optimizations.

## Requirements

### Requirement: Bounded shared static resources
The prototype SHALL reuse one baked static column/surface texture per distinct terrain asset and elevation combination, across cells and scene restarts. Dynamic highlights, units, rings and canopies SHALL remain independently updated. Whole-board baking SHALL be excluded.

#### Scenario: Repeated restart
- **WHEN** the same authored battle is restarted repeatedly after all variants are generated
- **THEN** the static variant count and estimated texture bytes remain constant and cells with identical variants share the same texture

### Requirement: Preserve visual and picking behavior
The prototype SHALL preserve terrain orientation and appearance, elevation and depth ordering, geometric top/side picking, overlays, unit movement, canopy occlusion/fading and maximum zoom quality.

#### Scenario: Transformed elevated battle
- **WHEN** the player selects elevated tops/sides, pans, zooms to maximum, moves legally and restarts in portrait and landscape
- **THEN** selected cells, overlays, unit anchors and canopy behavior remain correct and matched visual comparisons show no material terrain or depth regression

### Requirement: Comparable measured evidence
The experiment SHALL compare exact baseline and prototype builds using the corrected #65 measurement method, matching browser/device profiles, viewport, seed and cold/warm workloads. Raw captures SHALL retain idle and pan/zoom/move intervals, usable time, and renderer/GPU evidence where available.

#### Scenario: Controlled comparison
- **WHEN** baseline and prototype are measured sequentially on the same host without competing renderers
- **THEN** the report links raw build-identified captures, matching conditions and startup movement evidence, and states unavailable GPU evidence explicitly

### Requirement: Resource accounting and adoption decision
The report SHALL record dimensions, unique variant count, estimated texture memory, generation cost and restart stability. Adoption SHALL require measured benefit justified against memory, startup and maintenance costs; retaining the baseline SHALL be a valid outcome.

#### Scenario: No persuasive benefit
- **WHEN** differences are within observed variance or extra resource cost outweighs benefit
- **THEN** the baseline is retained and the report preserves prototype evidence and explains the decision without claiming an unsupported FPS increase or physical certification
