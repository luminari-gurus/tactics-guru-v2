# Proposal

## Why

Issue [#158](https://github.com/luminari-gurus/tactics-guru-v2/issues/158) connects the merged marker and continuing-floor foundations to playable exploration. Today `/dungeon` shows a floor summary with remote battle/stair buttons; players cannot traverse it or retain discovery.

Caller: `dubstylee`. Branch: `work/issue-158-overworld-traversal`. Base: `origin/main` at `38474f210da723c7d66cf323a19236de85cb5e57`. Implementation approval: pending.

## What Changes

- Add authoritative cardinal player steps, persistent reveal/visited cells and inspectable encounter/stair POIs on `/dungeon`.
- Reuse the marker contract to place three distinct encounter markers on each generated floor, away from stairs; retain the existing ordered two battles plus guardian template.
- Trigger the next encounter by explicit entry into its cell, carry party/items into the existing battle session, and return to that cell after victory with exactly-once completion/rewards.
- Require physical map arrival at stairs for floor travel; preserve guardian gating and cached-floor backtracking.
- Version the dungeon envelope for exploration and provide deterministic, non-destructive continuation of valid v1 saves. Keep exploration and active battle together in one validated payload.
- Provide keyboard, adjacent-cell pointer/touch and 44px direction controls, a readable discovered-POI list, art switching and mobile evidence.

## Capabilities

### New Capabilities

- `dungeon-exploration`: Deterministic floor traversal, discovery, spatial encounter entry, floor return and saved exploration.

### Modified Capabilities

None. Existing battle-session requirements remain regression constraints; the continuing-floor change is currently an unarchived plan rather than a main capability spec.

## Impact

Expected files: new `src/domain/exploration.ts` and `src/ui/dungeonMap.ts`; existing `src/domain/dungeon.ts`, `src/domain/dungeonSaveEnvelope.ts`, `src/content/dungeon.ts`, `src/app/DungeonSession.ts`, `src/app/startDungeonApp.ts`, `src/ui/dungeon.ts`, `src/ui/dungeon.css`, and `src/persistence/dungeonStorage.ts` only where migration requires it. Reuse `src/map/state.ts`, `generate.ts`, `biomes.ts` and `art.ts` without changing `/map` semantics. Extend dungeon domain/browser tests and fixtures; add focused exploration tests, current docs and QA evidence.

Prerequisites #154 / PR #156 and #157 / PR #186 are merged. #155 owns enemy motion; #159 owns biome selection/scaling; #175 owns scouting, traps and caches. None is imported into this scope. No new dependencies, combat rules, content packs, shops, camps, telemetry taxonomy, main-menu changes, deploy or merge.

Readiness refresh: inspected all 34 open issues, open PRs and branches. Promoted #187 after rereading its unassigned, concrete scope and empty dependency list; production `hud.ts` still contains Review action. Left #159 unchanged because biome/balance policy still needs a decision. Selected #158 among eligible high-priority work: both actual prerequisites are merged and it supplies #175 exploration; #161 remains the caller’s ongoing incremental tracker. #155 is coordinated independently, not treated as a completed or mandatory prerequisite.
