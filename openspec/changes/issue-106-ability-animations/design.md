# Design

## Context

See [proposal](proposal.md) for motivation and [behavior contract](specs/battle-ability-presentation/spec.md) for acceptance. Inspection is against `main` at `6292b1c808fc7d18aab2a70da7cfe8bbdef87837`.

- `BoardRenderer.animate(before, after, events)` already returns `{done, cancel}`, uses one progress tween, and renders the accepted snapshot when finished. Movement has its own interpolation. Combat currently uses a 180 ms marker and labels at `event.unitId`; for `attackRolled`, that ID is the attacker, while `targetId` identifies the defender. Several outcome labels share one position.
- `BattleSession.resolve` commits frozen state/events and invokes the accepted-state observer before returning a presentation token. `finishPresentation(token)` changes phase only for the current token. Rendering must not dispatch commands, rerun combat or save again.
- `BattleScene` awaits completion, guards continuations with `live`, cancels on hidden documents and disposes the session before cancellation during shutdown. `src/phaser/start.ts` synchronously shuts down on page departure and reloads a BFCache return through current-save startup.
- `tests/helpers/battlePolicy.ts` already drives real controls; seed-2 full-battle coverage exercises all three signatures and compares `replayBattle` state/events. Browser persistence tests cover accepted boundaries and real BFCache. Existing `battle-session` and `battle-controls` specifications remain authoritative.

## Goals / Non-Goals

**Goals:** Add a small presentation sequence per signature, correlate feedback to the correct unit, and retain one completion/cancellation contract across all termination paths. Keep tests capable of inspecting effects during motion, not just the settled frame.

**Non-Goals:** No generalized animation graph, command queue, event bus, asset pipeline, pooling subsystem or new dependency. No changes to abilities, balance, RNG, session tokens, save formats, sound or #108 HUD design. Basic/enemy attacks and movement keep their existing fallback behavior except for shared label placement/cleanup improvements needed here.

## Decisions

### 1. Consume accepted event data

Choose the signature from `abilityUsed.abilityId`. Obtain attack actor/target and outcome from `attackRolled`, missile actor/target from `missileRolled`, and final feedback from `damaged`, `guarded` and `defeated`. Damage is taken from events, not recalculated from HP differences or content formulas. Guarded Strike grants guard even on a miss; Magic Missile produces no attack roll. Resolve actor/target positions using the before snapshot so a defeated unit remains a valid impact anchor until final presentation.

A small pure helper such as `src/phaser/abilityPresentation.ts` may organize these descriptors and be unit-tested without importing Phaser. Keep it limited to this mapping; do not build an independent event or simulation model. An inline mapping is acceptable if equally clear and directly testable. No change to domain event shapes is needed.

### 2. Reuse board-local rendering

Attach temporary Graphics/Text objects to the existing board root. Calculate actor and target anchor points with `projectTile` and consistent body offsets; root pan/zoom/fit then moves the complete effect automatically. Use a small slash plus shield outline for Guarded Strike, an arrow-shaped streak for High Shot, and a luminous orb/trail plus impact ring for Magic Missile. Shape and motion distinguish the abilities without color alone.

Start with roughly 280–420 ms total per signature, with a short travel/strike followed by readable outcome feedback; tune within a bounded duration using captured frames. Keep a single progress tween per presentation and derive stages from its progress rather than chaining timers/promises. No dynamic textures, particles or downloads are required. This preserves the current lightweight rendering approach and avoids asset provenance/loading work.

Implementation decision (2026-10-14): captured fit-scale frames required minimum-size feedback and more reading time. Use 560 ms total (252 ms travel/strike, 308 ms outcome), at least 14 CSS px label text, a minimum size for shape details and scale-aware separation of defeat/result labels. Anchors remain board-local. See the QA report for the retained images.

Use a deliberate temporary overlay depth above units/canopies, keeping endpoints anchored to them. Place miss/damage/defeat feedback at the target and guard at the actor, with separate offsets or stages to prevent overlap. Leave existing HUD/log state authoritative and immediately committed; temporary visuals do not delay combat or persistence.

### 3. One idempotent finish path

Own the tween and every temporary object within the animation handle. A single guarded finish path stops active work, destroys temporary objects once, restores any changed sprite properties, and resolves `done` once. Render `after` only when the board/display objects are still alive; shutdown may already have destroyed them. Guard update callbacks after termination. Prefer animating temporary objects rather than altering permanent sprite properties.

Retain `BattleScene`'s existing `live` and session-token checks. Cancellation on visibility loss completes presentation without replay; shutdown must never pump the old session. Retain pagehide/pageshow behavior and the current-save recovery flow. Change `BattleScene.ts` only if a focused regression proves the integration needs an adjustment. No additional browser lifecycle listeners or persistence writes belong in the effect layer.

### 4. Verify visual behavior and state separately

Reuse the existing real-control policy and seeded accepted command paths. Use a controlled browser clock to inspect travel/impact stages without long sleeps. Assert effect kind, actor/target anchoring, cleanup and lock behavior through minimal read-only diagnostics added to the existing battle report only where needed. Do not expose state mutation controls or create a second diagnostic system.

For event mapping, use real domain results/frozen fixtures covering hit, miss, critical, defeat, guard-on-miss and automatic-hit missiles. Compare replay/session state, command count, RNG and save boundaries before/after normal and cancelled effects. Legal full-battle flows remain end-to-end evidence; isolated fixtures are explicitly component evidence. Parameterize lifecycle coverage across signatures where resource paths differ, and retain movement/enemy restart regressions.

Record mid-effect and impact screenshots for all three abilities across desktop and emulated mobile portrait/landscape, including transformed/elevated targets. Inspect the images for alignment, occlusion, overlapping labels and readability. Run existing real BFCache cases and accepted-boundary reload checks alongside new ability-specific cases. Physical Android access is available but no hardware result is assumed; no physical iOS acceptance is part of #106.

## Risks / Trade-offs

- More readable effects lengthen action presentation → use short bounded phases, retain lock assertions, and avoid raising timeouts to hide lifecycle failures.
- Modal/HUD refresh can redraw during an effect → keep transient objects independent of committed snapshots and verify restart-dialog open/cancel plus viewport changes while effects are active.
- Shutdown ordering can destroy objects before cancellation → make cleanup tolerant of destroyed objects and test restart, departure and repeated cancellation.
- A target disappears or labels overlap → use before-state anchors and explicit impact/feedback staging; verify defeat and critical outcomes visually.
- A screenshot at rest can falsely imply animation coverage → capture and inspect controlled intermediate frames and retain source/test metadata.

## Migration Plan

No data migration or compatibility change. After plan approval, implement and validate on the linked branch, then open a review PR for #106. Reverting the presentation change restores the generic transition without altering saves or rules. This planning task does not authorize a merge, manual deployment or production cutover. Existing hosting automation may build pushed branches.

## Open Questions

Only visual polish remains deferrable: exact stroke widths, palette accents, feedback offsets and timings will be chosen from browser evidence within the agreed scope. No unresolved product decision blocks implementation of this plan.
