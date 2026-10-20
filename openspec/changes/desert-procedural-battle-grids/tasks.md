# Tasks

## 1. Encounter source and movement contracts

- [x] 1.1 Add discriminated authored/generated encounter definitions, supported version checks and stable roster templates in content types/encounters; verify malformed, ambiguous and unknown-source fixtures reject while existing authored fixtures resolve.
- [x] 1.2 Extract a pure cardinal movement-edge legality/cost helper for movement, validation and AI without changing existing movement behavior; verify grid tests cover uphill, unrestricted downhill, terrain cost, insufficient Move and occupied destinations.
- [x] 1.3 Document source selection and terrain-playability boundaries in current battle content/movement docs; verify examples distinguish authored maps, generated descriptors and temporary occupancy.

## 2. Battlefield admission

- [x] 2.1 Implement bounded structural and directed strongly-connected movement validation using minimum supported capabilities; verify isolated plateaus, irreversible pits, missing cells and over-budget edges return structured reasons/coordinates.
- [x] 2.2 Implement deployment and ability-aware engagement checks for every nonempty hero subset; verify all seven subsets, one-HP survivors, duplicate/blocked spawns, blocked LOS and minimum/maximum attack range fixtures without testing for player victory.
- [x] 2.3 Add generated-profile checks for terrain proportions, raised patches, two gateway routes and spawn exits; verify mandatory bottlenecks and single-exit pockets reject and authored grids receive only common checks.
- [x] 2.4 Validate the current authored final map through common admission; minimally repair only proven failures and verify its authored cells/spawns and resulting identity with regression fixtures. Document validator reason codes and its occupancy limitations.

## 3. Deterministic desert generation

- [x] 3.1 Add battle sand and LOS-blocking rock terrain records plus conforming surfaces/provenance through the established asset workflow; verify content validation and browser asset decoding without adding desert records to the independent base battle catalog.
- [x] 3.2 Implement the versioned 12×12 protected-core generator with isolated layout/attempt seeds, four candidate attempts and a validated flat fallback; verify golden seeds, repeated resolution, rejected-candidate paths and unchanged combat/reward RNG.
- [x] 3.3 Add the pure resolver returning immutable full maps, bounded descriptors and attempt/fallback diagnostics for both sources; verify full-map hashes precede survivor filtering and repeated calls do not mutate base catalogs.
- [x] 3.4 Run a reproducible seed 0–9,999 and uint32-edge corpus across all seven survivor subsets; deliver a report showing admitted grids satisfy every invariant, normal fallback is under 1 percent, map uniqueness is at least 95 percent, and representative rendered layouts retain open desert character.
- [x] 3.5 Document profile versions, purpose tags, fallback semantics, measured generation/validation cost and the reproduction command; verify the report and golden fixtures identify the exact generator/profile versions.

## 4. Enemy detours

- [x] 4.1 Replace only the no-attack pursuit branch with deterministic weighted routes to legal ordinary-attack positions; verify U-shaped detours, uphill/cost restrictions, ranged LOS approaches and stationary-target progress across multiple turns.
- [x] 4.2 Preserve immediate expected-damage attack ordering, spent action budgets, current living occupancy and bounded move/attack/Wait execution; verify reordered inputs, changed blockers, unreachable goals and RNG immutability in AI regression tests.
- [x] 4.3 Verify replanning after every accepted move/attack reproduces the uninterrupted command suffix, events and state; update the rules compatibility identity and document the new pursuit semantics and explicit old-save rejection behavior.

## 5. Save, resume and replay

- [x] 5.1 Integrate the resolver into canonical run entry/catalog projection before state validation, applying equipment once and filtering only defeated heroes; verify identical generated/authored starts and source/seed/hash mismatch rejection.
- [x] 5.2 Add bounded descriptor-aware run snapshot format 2, encounter source identity and reconstruction before hydration; verify exact key/string limits, worst-case payload within the existing cap, corruption/unsupported versions and preserved original bytes.
- [x] 5.3 Connect descriptor-aware canonical replay and continuation records; verify accepted commands reproduce state/events/next RNG and altered map, initial HP, roster, equipment or initiative reject without fabricating pre-resume history.
- [x] 5.4 Extend run persistence tests across preparation, accepted player/enemy presentation boundaries, rewards and terminal states for both sources; verify no terrain reroll, duplicate command, past cue or reward, and unchanged isolation/recovery for independent single-battle storage.
- [x] 5.5 Update run/battle save documentation with descriptor fields, format/version compatibility, explicit legacy-run incompatibility and recovery/rollback steps; verify documented fixtures decode or fail for the stated reason.

## 6. Production integration and acceptance

- [x] 6.1 Connect validated resolved catalogs and desert assets to the existing run host/production board; use the first two generated desert slots and authored final slot after pure and continuation gates pass. Verify source identity, carried HP, equipment and progression through the mixed run.
- [x] 6.2 Add Playwright desktop and portrait/landscape emulation coverage for generated selection, highlights and legal movement after pan/zoom/resize, reload/Continue during enemy detours, forced fallback and authored final entry; verify no page errors or grid/unit/picking mismatch and preserve controlled content/asset failure behavior.
- [x] 6.3 Add independent route-aware test pursuit where the existing test-only player policy stalls; exercise representative generated battles with multiple player policies and wounded-party victory/defeat cases, verifying legal commands and reproducible records without using win rate as a playability gate.
- [ ] 6.4 Measure generation/validation and cold/warm battle entry, static terrain variant memory and repeated restart stability against existing performance contracts; deliver build/seed/viewport-identified evidence with accurate emulation limitations.
- [ ] 6.5 Run strict OpenSpec validation, content validation, typecheck/build, affected unit suites and relevant battle/run/persistence Playwright suites; verify all required checks pass and record any genuine limitations before declaring implementation complete.
