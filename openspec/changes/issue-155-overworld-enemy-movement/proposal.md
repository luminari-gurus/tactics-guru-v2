# Proposal

## Why

The independent `/map` prototype places enemies but never moves them. Issue [#155](https://github.com/luminari-gurus/tactics-guru-v2/issues/155) requests reproducible passive wandering and aggressive pursuit using the merged marker foundation.

## What Changes

- Add pure, bounded simulation steps with explicit per-enemy behavior configuration, a separate seeded movement RNG, stable update order and collision handling.
- Add visible numbered enemy markers and matching legend keys to the static `/map` inspection view.
- Advance dungeon enemies only when the player moves, and start an encounter when the player enters any uncleared enemy cell.
- Document the chosen range-based visibility and pathfinding rules and retain desktop/mobile interaction evidence.

## Capabilities

### New Capabilities

- `overworld-enemy-movement`: deterministic passive/aggressive movement and player-driven dungeon integration.

### Modified Capabilities

None. The existing spec inventory contains battle contracts, not an overworld movement contract.

## Impact

Expected implementation files: new `src/map/movement.ts`, `src/map/view.ts`, `src/map/style.css` if legend layout needs adjustment, and the map branch of `src/main.ts` for disposal. Extend `tests/unit/overworldMap.test.ts` and `tests/overworld-map.spec.ts`; update `docs/overworld-map.md` and add task-specific QA evidence. Preserve `src/map/state.ts`'s marker shape and placement output because dungeon exploration extends that type. The caller subsequently expanded this PR to include player-driven dungeon enemy movement, unordered encounters and durable progress; `/map` remains encounter-free. No terrain-generation changes or dependencies are required.

Issue owner/caller: `dubstylee`. Branch: `work/issue-155-overworld-enemy-movement`, published from `origin/main` at `d5b19279a869501205e98856ebd5e5f91f8c287d`. Prerequisite #154 / PR #156 is merged into that base. Physical availability: none (local CAN_TEST_MOBILE missing/invalid); required physical platforms: none. Browser/device emulation satisfies acceptance.

Caller explicitly approved this published proposal, design, specification and tasks in chat on 2026-10-25.

The caller explicitly authorized the first five grouped PR review repairs on 2026-10-25, including stronger lifecycle/test evidence; the later caller clarification removed the map pause and timer. See design and review follow-up tasks.
