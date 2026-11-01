# Design

## Context

See proposal.md for motivation and docs/ongoing-projects/issue-166-goblin-shaman-plan.md for the reviewed
legacy evidence and full acceptance map. The current catalog has closed actor IDs,
discriminated abilities, exact readers, pure previews, bounded source effects and
an ordered enemy candidate pass. These existing seams own the new consumer.

## Goals / Non-Goals

Keep simulation independent of Phaser, use existing DOM inspection/logs and event
presentation, and preserve deterministic command/replay boundaries. No general
effect interpreter, configurable score weights, save migration, new dependencies,
hero support buttons, UI redesign or generated artwork.

## Decisions

1. Reuse pinned legacy sprite and portrait at e9433f6b; retain source bytes/hashes,
   inspect alpha/foot anchor, export the full portrait to the existing 96px budget.
   Deliver catalog/art independently, then stack runtime/placement changes.
2. Extend discriminated abilities with fixed Hex/heal profiles and validate exact
   rules/owners. Optional catalog immunities admit only weakened/debuff; one shared
   predicate rejects effect-only immune casts before spending. Production actors
   receive no speculative immunity.
3. Store one optional `weakenedBy` living opposing Shaman reference. Project −2
   accuracy once in combatStats; expire at target turn end and either defeat using
   existing cleanup paths. Reapplication replaces the source. This avoids generic
   arrays, stacking rules and parallel modifier implementations.
4. Add one pure support preview/resolver through existing dispatch/previewAbility.
   Full preflight precedes the one Hex die; healing uses no die. Save preview
   enumerates twenty faces; resolution emits the shared save event then the effect.
5. Extend the existing AI candidate loop, score/tie order and route goals; shared
   previews enforce filters, Taunt and immunity. Ordinary attackers keep exact
   scores/order. No hidden-roll lookahead or scoring configuration is needed.
6. Replace only Forest Ruins dungeon composition spawn 6, retaining selection RNG
   and existing map adaptation. Do not edit canonical map spawns. Advance state
   4→5, rules 5→6, run 6→7, dungeon 8→9; RNG/wrapper stay 1. Main's concurrent
   movement change allocated dungeon 8 while this increment was qualifying.
   Preserve movement-aware exploration in format 9, including legacy exploration
   payloads, but recover/export exact prior 7/8 bytes without migration. Exact incompatible
   bytes remain recoverable. Enemy healing does not broaden hero aggregate HP.
7. Reuse existing logs, inspection, floating healing and cue contracts. Display
   source-specific saves/Weakened and correct support ranges without new controls.

## Risks / Trade-offs

- Added eager-loaded assets increase startup transfer → measure the pair, retain
  loader/budget assertions and visual desktop/mobile evidence.
- Changed shared rules/admission affect every route → focused iteration followed
  by full policy qualification, with valid reuse only for unchanged inputs.
- Natural battles may not show every branch → separate deterministic witnesses
  supplement, never replace, the complete legal production dungeon journey.

## Migration Plan

No migration or deployment is authorized. Existing incompatible saves retain
recovery/export behavior. Commit/push independently ready chunks and focused PRs;
keep plan/task/QA progress current. Archive/sync after review when requested.
