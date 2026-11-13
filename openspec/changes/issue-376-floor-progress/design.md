# Design

## Context

See proposal.md for motivation and docs/ongoing-projects/plan.md for continuation
details. Dungeon state already contains completion, descriptor encounter count
and phase. The HUD rerenders accepted/restored states; map discovery is separate.

## Goals / Non-Goals

**Goals:** Share progression eligibility across domain travel, HUD and map without
changing location validation, enemy movement, revision handling or rejection order.

**Non-Goals:** No save migration, new state owner, subscriptions, assets, engine
changes or general progress framework.

## Decisions

- Add a pure direction-based stair status with named lock reasons to the existing
  domain module. Existing consumers translate that small result; a new service or
  UI controller adds no required behavior.
- Read count and total directly from the current floor. Keep discovery and tile
  checks separate; discovered upstairs markers remain visible during temporary locks.
- Render a compact wrapping DOM list in the header using the existing palette and
  typography. Put re-entry guidance in the applicable stair label, replacing the
  overlapping standalone travel paragraph. Keep save status and rewards intact.
- Extend current unit and browser journeys. Preserve legal victory/defeat witnesses,
  Chromium/WebKit desktop and touch orientations, focus and narrow screenshots.

## Risks / Trade-offs

- Extra header height could push rewards or party out of view → inspect narrow
  portraits/landscapes and assert existing visibility/overflow boundaries.
- A shared predicate could alter travel → retain revision/tile rejection order and
  test both directions, phases, current/legacy states and projection purity.

## Migration Plan

No data migration. Ship the bounded code and tests in one reviewable PR; reverting
the change restores prior presentation without affecting saved games.
