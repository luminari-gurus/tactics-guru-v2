# Design

## Context

See proposal.md for issue/base/branch identity and motivation. Read at main `5a880275`: `RunHero` currently contains heroId/hp; `transitionRun` validates revision/boundary and completes terminal battles. `completeRunBattle` owns accepted aggregate completion. Dungeon `acceptDungeonBattle` carries HP and increments floor completion, without awarding on guardian reward-less boundaries. `projectOwnedCatalog` applies equipment and is shared by both modes; preparation healing and UI currently assume baseline max HP. Run save format is 2; dungeon envelope format is 3 with legacy readers. Catalog content identity binds saves and replay. Existing #162 picker discovers owned catalog abilities.

Pinned legacy `UnitProgressionService.gd` at `e9433f6b608ae6b2d95418615cce9cf17dadcf74` confirms HP increments +6/+5/+4 and thresholds. Legacy stores within-level remainder and discards XP at cap; this proposal instead stores bounded cumulative XP (0–600) to make validation and UI unambiguous. Equivalent level boundaries remain unchanged. Legacy Mage Ember Burst is not imported; v2 Magic Missile remains its signature.

## Goals / Non-Goals

**Goals:** one canonical progression representation; pure projection used by rules, validation, preview, AI, UI and saves; exactly-once advancement through existing accepted boundary ownership. All five issue acceptance bullets map to spec requirements and tasks.

**Non-Goals:** parallel XP caches, render-time unlock decisions, retroactive XP reconstruction, speculative future ability records, revival implementation, new combat effects, non-HP class growth or deployment. Defeat/revival coverage means defeated heroes stay defeated and existing preparation rejects revival; no revival feature currently exists.

## Decisions

1. **Validated definitions and bounded state.** Add `src/content/progression.ts` and `src/domain/progression.ts` (names provisional), with class HP increments, thresholds and encounter-kind awards. Extend canonical `RunHero` with cumulative XP, level, maxHp and learned IDs; validate redundant values against the same pure derivation, not arbitrary saved values. Add optional required-level metadata to implemented hero ability definitions, defaulting existing signatures to 1. Validation rejects unknown owners/IDs, out-of-range levels, duplicate unlocks and impossible state. Progression definitions participate in save/rules identity. Derived state alone would reduce fields but explicit validated learned/maxHP state meets carryover requirements and makes inspection reliable.

2. **Award only in accepted completion.** The run reducer derives the award from trusted encounter definition data (extend run definition with bounded kinds); commands supply combat HP, never caller-selected XP/level. Dungeon completion uses the persisted encounter descriptor kind. Validate combat HP against pre-award state first, then apply XP/healing and publish progression plus phase/revision atomically. Existing phase/revision/slot checks reject repeated completion. Do not add a second reward-click award or global ledger. Include terminal boss victories and stable behavior for legacy dungeon encounter policy. Events/return data report old/new values for feedback; reconstruction emits no awards.

3. **Projection before equipment.** Extend the shared catalog projection used by `runBattleCatalog`, dungeon battle creation and party UI to derive maxHp and learned abilities/caster level from the immutable base, then existing equipment once. Preserve equipment modifiers, baseline move/jump/power/accuracy/AC/Dexterity/Will, enemy scaling and Guarded. Update preparation caps, party readers, carried-HP bounds, spawn filtering and projected-catalog/content identities coherently. Level-5 max HP is Fighter 42, Ranger 32, Mage 27. Magic Missile uses existing min(5, floor((casterLevel+1)/2)) formula and damage rolls; current level cap reaches three missiles. Existing implemented signatures remain learned from level 1. Fixture-only legal profiles prove future required-level unlocks without adding inert production content for #163–#165.

4. **Explicit compatibility boundary.** Bump progression-bearing run/dungeon envelope/state identities. Older formats, including existing dungeon legacy readers, return incompatible at the new progression boundary with original storage bytes preserved and export/recovery available. Do not silently default an old mid-run party to zero XP or invent retroactive awards/healing. Keep standalone catalog defaults unchanged where possible; if shared identity changes affect standalone saves, retain the same honest incompatible recovery behavior and document/test it. No automatic overwrite on load/inspection. Existing explicit new-game/replacement safeguards remain required. A migration alternative is deferred because old data cannot establish prior living eligibility and awards faithfully.

5. **Small UI additions.** Update `src/ui/dungeon.ts`, run party/item flow (`src/ui/runItems.ts` and its host), and shared inspection via existing session context. Show “Level N · XP X / next” or “Level 5 · MAX”, current/max HP and learned actions; show concise accepted level-up HP/healing/unlock feedback. Do not rerender/reannounce an award on restoration. Keep targeting locks and modal focus intact; no new progression screen or framework.

## Risks / Trade-offs

- Save incompatibility prevents immediate continuation of old runs → explicit review decision, preserved raw bytes, recovery/export and documented return-to-originating-build guidance; no promise that older code reads new saves.
- Projection identity can affect every save/replay consumer → unit/session round trips, repeated construction, legal browser restoration, equipment/healing and both standalone/run/dungeon smoke coverage.
- Short runs reach only early levels → boundary units cover all levels; legal fixture-backed browser cases cover progressed states, plus a real accepted victory proves wiring.
- New abilities are separate issues → only implemented definitions enter learned lists; locked/unlock fixture coverage establishes the extension contract without false production unlock claims.
- Existing CI startup/performance failures remain → retain all original failed evidence, select affected tests using discovery, no retries/budget relaxation or full-baseline claim.

## Migration Plan

No deployment is part of this task. Ship new format writers with incompatible-old-format recovery tests and documentation in one PR; preserve existing slots during inspection. Validate content/type/build, progression and transitive save/item/session consumers, then targeted self-hosted browser acceptance. Document exact source/build identity, discovery, actual failures/skips and screenshots. Reverting code requires returning to the originating version for newly written saves; keep exports rather than promising bidirectional migration.

## Verification scope

Follow docs/verification-policy.md. Iteration: focused progression/run/dungeon/items/save/ability validation units. PR readiness: full unit suite, content checks, both TypeScript scopes, production build; focused Chromium desktop/portrait/landscape legal victory/progression, party/inspection, healing/equipment, floor travel/reload, defeat, no duplicate awards, terminal awards and save recovery. Discover and run affected fixture/dev ability-picker and persisted run/dungeon recovery suites; focused WebKit resume/keyboard/touch flow and engine smoke. Because catalog projection is shared, cover preview/resolution/AI/replay and ordinary standalone battle compatibility in units plus representative browser smoke. Run telemetry representative run/dungeon flows only if changed session event inputs invalidate their prior evidence; keep telemetry builds separate. Browser execution uses exclusive self-hosted capacity, no hosted fallback. No full performance matrix is required absent a measured regression or expanded scope; never claim a focused result clears the existing failed full capture. Local physical availability none; required physical platforms none; emulation is accepted.
