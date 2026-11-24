# Tasks

See the [implementation and verification plan](../../../docs/ongoing-projects/plan.md) for scope and commands.

## 1. Repair the browser assertion

- [x] 1.1 Capture both WebKit failures on the literal planning base and retain the reports showing expected 13 and received 17.
- [x] 1.2 Export the existing wall-sight timed-stats format and use it for the persisted fresh-save assertion. Check the diff for an unchanged fixture, unchanged migration and records checks, and unchanged encoder and decoder logic.

## 2. Verify the final build

- [ ] 2.1 Pass the dungeon unit suite, ordinary PR verification, the two WebKit case IDs, and the three Chromium case IDs on the final implementation. Record source, build, profiles, and pass/fail evidence in the plan.
