# Proposal

## Why

Direct testing routes currently inspect, hydrate, replace and save the same game slots used by the main menu. [Issue #259](https://github.com/luminari-gurus/tactics-guru-v2/issues/259) requires that testing cannot disturb a player's saved journey; the menu prerequisite #153/#256 and new-game follow-up #269 are merged.

## What Changes

- Keep persistent menu-launched battle, run and dungeon sessions at the configured base route, selected by a closed `game` query parameter that survives reload.
- **BREAKING**: `/battle`, `/run`, `/dungeon`, `/map` and explicit diagnostic scenes become fresh, transient testing entries. They cannot inspect, hydrate, replace, remove or write game saves, even with an `entry` parameter.
- Reuse the current combat, item, exploration and floor-travel rules with persistence explicitly absent in testing sessions. Keep existing save keys, formats, recovery checks and menu behavior for persistent sessions.
- Move save/recovery browser coverage to the menu flow; replace testing-route save expectations with isolation checks. Update preload routing, affected fixtures, performance navigation and documentation.

## Capabilities

### New Capabilities

- `game-save-scope`: Persistent base-route journeys, transient testing entries, and preservation of saved progress across navigation and lifecycle boundaries.

### Modified Capabilities

None. Canonical `battle-session` remains unchanged: its deterministic in-memory replay and restart requirements apply to both entry scopes. The unarchived #153 main-menu change documents the old destination URLs; this change explicitly supersedes those URLs for persistent play.

## Impact

Issue: #259. Owner: `moshehbenavraham`. Planned branch: `work/issue-259-testing-route-save-isolation`, from main `d8692f94cb652eb6fbb6f4fa2a9330ad57c3d4dd`.

Owners include `src/main.ts`, `src/app/routes.ts`, the three application/session hosts, `BattleScene`, persistence controls, main-menu and dungeon UI, `vite.config.ts`, existing tests/helpers and verification selection, and `scripts/measure-fit-controls.ts`. See the [human implementation plan](../../../docs/ongoing-projects/issue-259-testing-route-save-isolation-plan.md).

No dependency, save migration, record subsystem, combat rule, deployment or runner-capacity change is proposed. #270 explicitly references this route boundary; #176/#270 implementation remains separate. Current draft PRs #273/#274 remain independent and were rechecked before implementation. Implementation progress and evidence are tracked in tasks.md and the human plan.
