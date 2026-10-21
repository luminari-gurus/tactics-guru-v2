# Spec Delta

## Purpose

Provide reproducible biome encounters and bounded depth scaling in continuing dungeons while preserving existing opponents, completion and recovery.

## ADDED Requirements

### Requirement: Validated playable encounter catalog
The dungeon SHALL admit bounded, versioned definitions for normal/elite/vault/boss kinds, Forest/Desert biomes, map pools, compatible compositions and full-battle guardians. Unknown IDs, duplicate definitions, empty pools, illegal spawns and incompatible authored rosters MUST reject explicitly.

#### Scenario: Admit every enabled pairing
- **WHEN** a map/composition pairing enters an enabled pool
- **THEN** its source, spawns, reachability and all seven nonempty hero survivor subsets pass existing battlefield admission, including generated fallback

#### Scenario: Invalid definitions
- **WHEN** content has an unsupported version, foreign reference, duplicate ID, illegal spawn or authored roster mismatch
- **THEN** admission fails without substituting another biome or rerolling content

### Requirement: Independent stable selection
Fresh dungeons SHALL use policy `dungeon-encounters-v1`: seed-select Forest or Desert first, alternate later floors, and select normal, equally weighted elite/vault, then boss. Biome, kind, map and composition draws SHALL use separate stable versioned streams without changing existing floor, battle, reward or POI streams.

#### Scenario: Reproducible floor plan
- **WHEN** the same dungeon seed and depth are constructed repeatedly
- **THEN** identical sorted catalog definitions produce identical choices and durable identities, covering both biomes and all four kinds across the seed corpus

### Requirement: Bounded baseline enemy projection
Policy `enemy-depth-v1` SHALL round baseline HP/power/accuracy/AC times `(depth+9)/10`, clamp to current bounds, then for vault only round times `6/5` and clamp again. Rounding SHALL be nearest with half toward positive infinity, preserving zero and supporting signed accuracy. Normal/elite/boss SHALL have no extra multiplier. Projection MUST saturate safely at maximum safe-integer depth.

#### Scenario: Exact depth and vault order
- **WHEN** a baseline Grunt enters depth 2
- **THEN** HP/power/accuracy/AC are 10/2/4/13, or 12/2/5/16 in a vault; depth 10 yields 17/4/8/23, or 20/5/10/28 in a vault

#### Scenario: One catalog for battle consumers
- **WHEN** preview, inspection, AI, resolution, replay or repeated construction consumes a selected encounter
- **THEN** each uses the same baseline-derived projected catalog, with hero equipment applied once, saved damage preserved and baseline content unchanged

### Requirement: Durable encounter facts
Each new floor SHALL retain policy/catalog identity, biome, three kind/source/map/composition/roster selections, guardian reference, scaling depth/policy and resolved battlefield hash. Resume and revisit SHALL validate saved facts against matching definitions without rerunning selection or compounding scaling. Existing encounter/reward identities SHALL remain stable.

#### Scenario: Tampered or unsupported selection
- **WHEN** a descriptor disagrees with its definitions, depth, policy, roster or resolved geometry
- **THEN** the snapshot is rejected through recoverable validation with original raw bytes retained

### Requirement: Compatible bounded saves
Format 3 SHALL retain current storage keys, atomic recovery and the 1 MiB limit. Formats 1/2 MUST pass their original validation before normalization to fixed/unscaled legacy encounters, including unvisited floors. Inspection SHALL never rewrite storage. Candidate size/write/readback failure SHALL preserve current floor/history and offer recovery/export.

#### Scenario: Continue prior gameplay
- **WHEN** a valid prior ready, active/Guarded, reward, defeated or backtracked dungeon is resumed
- **THEN** party, items, battle/RNG, offers, completion and exploration retain their meaning and subsequent unvisited floors keep legacy opponents

#### Scenario: Bounded legacy normalization work
- **WHEN** a prior-format save has a long retained floor history
- **THEN** normalization defers derived fixed-policy battlefield geometry until battle entry, without resolving three graphs per historical floor; active battles still validate exact geometry/RNG, existing full format-3 legacy descriptors remain supported, and new-policy descriptors cannot omit battlefield facts

#### Scenario: No destructive migration
- **WHEN** old data is inspected or a format-3 candidate fails
- **THEN** no save is deleted, floor evicted, player moved, reward granted, unit healed or encounter rerolled

### Requirement: Reachable truthful presentation
The real dungeon route SHALL show saved biome/depth/kind in summaries, discovered POIs and battle headings, using existing Forest/Desert treatment and Simple fallback; legacy play SHALL retain Grassland. Art/loading/lifecycle changes MUST NOT alter selection or reveal undiscovered POIs. Keyboard/touch/focus behavior SHALL remain usable across desktop, portrait and landscape.

#### Scenario: Art and active battle reload
- **WHEN** art switches or fails, the viewport changes or combat reloads
- **THEN** selected definitions, scaled inspection values, damage and progress remain the same

### Requirement: Authoritative exactly-once guardian completion
Only the matching active battle's full victory SHALL complete its POI and unlock descent once. Duplicate/stale callbacks and travel MUST NOT duplicate rewards or completion. The persisted-candidate travel gate, living-party filtering and existing two reward boundaries SHALL remain authoritative.

#### Scenario: Guardian journey and revisit
- **WHEN** a party legally clears a guardian, descends, ascends and revisits
- **THEN** saved choices and completion persist, no cleared encounter or reward restarts, and killing only one guardian-roster unit never unlocks descent
