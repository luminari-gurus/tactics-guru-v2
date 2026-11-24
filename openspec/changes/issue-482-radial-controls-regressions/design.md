## Context

`BattleScene` feeds selection state to both the radial and the HUD.
`BattleHud` already renders and wires Cancel plan, while `BattleScene` and
`BattleRadial` already observe changes to the board and clamp the radial.

## Goals / Non-Goals

Keep the shared selection and cancellation paths. Changes are scoped to the
radial interaction, responsive layout where needed, and its regression tests.

## Decisions

- Measure the canvas hit and radial overlay before the second native click or
  tap. Choose a reachable opening tile that leaves the enemy exposed if the
  fixture alone causes the interception.
- Measure Cancel plan before Playwright can scroll it into view. If its
  current container clips the button, fit the existing control into the
  available layout while the plan is waiting. Put it beside the scroll
  viewport so it cannot cover controls brought into view by keyboard focus.
  Reserve one tap-target height for the scroller in stacked landscape.
- Make the reflow witness drive an actual board-edge crossing at the same
  viewport. Trace the existing resize observer and radial placement only if
  the control fails to follow the measured change.

## Risks / Trade-offs

Radial and HUD layout are shared across battle entry routes. Verify the
original cases in Chromium and WebKit, retain the valid Rail switch and
resize witnesses, and exercise the affected shared routes on the final build.
