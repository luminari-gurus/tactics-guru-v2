# Design

## Context

See proposal.md for motivation. BoardRenderer owns Guarded graphics and all
standalone/run/dungeon presentation. movementBlockSource already validates living
Mage ownership; animatedSnapshot is the presentation boundary.

## Goals / Non-Goals

Preserve existing Guarded rendering, accessible inspection, effect rules and
save bytes. No generic status registry, new assets, overlay or timer is needed.

## Decisions

- Add one graphics map for Snared and share only the local placement/reporting
  functions with Guarded. These are two real consumers of identical geometry.
- Use a dark-backed snowflake in Guarded's 14×16 bounds and foreground depth.
  Guarded applies to player Fighters and Snared to hostile units, so the same
  anchor cannot collide on one unit.
- Derive visibility from the presented snapshot and Frost Snare ability id plus
  movementBlockSource. Events and independent timers could go stale on resume.
- Extend existing dungeon/picker tests and retain all Guarded consumer checks.
  Browser plugin is not available; use the repository's regular Playwright suite.

## Risks / Trade-offs

- Small fitted scale can blur a symbol → minimum 12 CSS-pixel width and screenshot review.
- Camera or animation updates can drift → share all existing annotation placement paths.
- Staged saves can overclaim progression → explicitly label level/position staging;
  lifecycle transitions and browser casts still use accepted legal commands.
