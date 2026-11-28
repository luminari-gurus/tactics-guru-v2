# Design

## Context

The HUD formats events into a bounded list of strings and the battle scene displays it in the shared modal. The formatter already covers the game’s user-visible combat events.

## Decisions

- Retain event type alongside the existing display text. One exhaustive category map serves all filter views and gives the grouping and export work in #179 an ordered source.
- Present one list with a row of native toggle buttons. The existing modal owns keyboard focus, board input capture, Escape, and return to the launcher. Each opening starts with All.
- Keep the list and filter selection in the encounter UI. Battle state, command history and saved formats stay in their current owners.

## Risks and trade-offs

The wider filter labels must fit phone widths. Wrap the row, retain 44 CSS pixel minimum hit targets and verify that the dialog scrolls and dismisses normally on the existing browser profiles.
