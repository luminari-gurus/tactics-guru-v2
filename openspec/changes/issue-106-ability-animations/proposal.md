# Proposal

## Why

[Issue #106](https://github.com/luminari-gurus/tactics-guru-v2/issues/106) asks for recognizable Guarded Strike, High Shot and Magic Missile animations. The current renderer shows overlapping combat labels during a generic 180 ms transition, making actor, target and ability harder to follow despite the existing deterministic combat and presentation lifecycle.

## What Changes

- Add a short directed melee strike and fighter guard cue, a readable ranged arrow, and a distinct magical projectile/impact using existing Phaser drawing primitives and art.
- Derive effect identity, target, hit/miss, damage, guard and defeat from accepted events and snapshots; retain the current automatic-hit Magic Missile rules.
- Keep effects inside the board transform, preserve gameplay input locking and destroy temporary objects/tweens on completion, cancellation and shutdown.
- Verify normal controls, transformed views, repeated use, suspension, restart and browser-history recovery with existing deterministic and browser test mechanisms plus visual evidence.

## Capabilities

### New Capabilities

- `battle-ability-presentation`: Recognizable signature ability effects, their event-to-visual mapping, spatial alignment and temporary resource lifecycle.

### Modified Capabilities

None. Existing `battle-session` resolution/replay/restart and `battle-controls` locking/confirmation requirements remain unchanged and are regression constraints.

## Impact

Primary implementation is in `src/phaser/BoardRenderer.ts`, with a small presentation-only event descriptor helper if useful for isolated tests, and minimal `BattleScene.ts` integration only where lifecycle correctness requires it. Tests extend the existing battle policy, session/replay, input and persistence coverage. No content/rules/RNG/save-format changes, new dependencies, asset generation, audio expansion or control redesign are planned; #108 remains separate.

Planning base: `main` at `6292b1c808fc7d18aab2a70da7cfe8bbdef87837`. Task branch: `branch/issue-106-ability-animations`. Assignee: `moshehbenavraham`. See [implementation plan](../../../docs/ongoing-projects/plan.md). Implementation and incremental PR publication were authorized on 2026-10-14.
