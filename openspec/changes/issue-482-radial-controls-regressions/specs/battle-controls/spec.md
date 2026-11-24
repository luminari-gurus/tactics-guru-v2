## ADDED Requirements

### Requirement: Radial invalid reselection

Selecting a different target from an open radial SHALL replace the previous
preview. An unavailable attack SHALL identify the selected target, give the
reason, and leave the previous command cleared when switching to Rail.

#### Scenario: A legal move is followed by an out-of-range attack target

- **WHEN** a player previews a legal move, selects an out-of-range enemy, and
  switches to Rail
- **THEN** the enemy and the unavailable attack are shown before the switch,
  Rail cannot confirm the stale move, and battle state and replay are unchanged

### Requirement: Reachable radial plan cancellation

Cancel plan SHALL be visible and reachable with a target of at least 44 by 44
CSS pixels while the radial is closed and awaiting a destination or target.

#### Scenario: Cancel a plan at either picking step

- **WHEN** a player activates Cancel plan by touch or keyboard while picking a
  destination or follow-up target
- **THEN** normal selection resumes, with no pending action, accepted command,
  replay entry, or RNG change

### Requirement: Tap-open radial reflow

A tap-open radial SHALL reposition within a drawable board that can fit its
controls when the HUD reflows without a viewport resize, preserving its pending
selection.

#### Scenario: HUD reflow crosses the original Plan button

- **WHEN** a HUD layout change moves the drawable board edge past the old Plan
  button at a fixed viewport and the new board can fit the radial
- **THEN** the radial stays open, Plan fits within the board, and the prepared
  move remains unchanged
