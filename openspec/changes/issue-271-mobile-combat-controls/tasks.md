# Tasks

## 1. Shared model and skin choice

- [x] 1.1 Extract `BattleSelection` and unit-test select/preview/confirm/cancel/endTurn/plan/default Move.
- [x] 1.2 Add Auto/Radial/Rail preference, coarse-pointer Auto resolution, persistence, and mid-battle skin changes that keep pending intent.

## 2. Radial skin and gestures

- [x] 2.1 Implement slice table, Special sub-ring (legal only), hub cancel, haptic, reduced-motion tap path, and docked 48 px End turn.
- [x] 2.2 Adapt `BoardInput` with 10 px touch / 6 px mouse-pen thresholds, 300 ms hold, pan-before-hold, second-finger/pinch/cancel/visibility dismissals.
- [x] 2.3 Plan move slice that reopens at the destination; Magic Missile single-target on the radial; overflow for inspect/log/sound/restart/recovery/danger/undo.

## 3. Tests, spec and verification

- [x] 3.1 Playwright: mobile-portrait/landscape hold, tap, pan vs hold, sub-ring, hub cancel, End turn, undo, danger, reduced motion, orientation, one-line labels; WebKit grep hold/tap/cancel/End turn/labels.
- [x] 3.2 Keep desktop battle files passing; typecheck, unit tests, build, and the listed Playwright suites.
