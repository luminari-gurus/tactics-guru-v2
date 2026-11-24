## Why

The matched browser runs for #208 found six failures around radial target
reselection, plan cancellation and desktop reflow. Players need to see which
action they are aiming, cancel a plan from either picking step, and retain an
open tap selection through ordinary HUD layout changes.

## What Changes

- Verify invalid radial reselection clears the previous move and explains the
  new target's unavailable attack before a switch to Rail.
- Keep the existing Cancel plan control reachable during destination and
  follow-up target picking in mobile portrait and landscape.
- Exercise a real board-edge change at a fixed viewport and keep the open
  radial and pending move intact when the controls fit the new board.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `battle-controls` specifies radial reselection, plan cancellation and reflow.

## Impact

The shared battle UI serves standalone battles, authored runs and dungeon
battles. Use the existing scene, HUD, and Playwright suites to verify
[#482](https://github.com/luminari-gurus/tactics-guru-v2/issues/482). See the
[implementation plan](../../../docs/ongoing-projects/issue-482-radial-controls-regressions-plan.md) and
[task branch](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-482-radial-controls-regressions).
