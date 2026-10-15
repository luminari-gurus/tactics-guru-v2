# Proposal

## Why

The live battle HUD mixes actor information, inspection, actions and secondary tools in a top panel that constrains the board. The owner accepted the merged #108 rail/dock design on 2026-10-15; [issue #111](https://github.com/luminari-gurus/tactics-guru-v2/issues/111) now has a concrete responsive design to implement while preserving the current battle behavior.

## What Changes

- Implement the accepted desktop/short-landscape right rail and bounded portrait dock, with persistent actor information, catalog-named actions, separate inspection and target feedback, and visible unavailable reasons.
- Fit, clamp and navigate the board using one drawable viewport rectangle that excludes controls, captions and safe areas. Preserve navigation on HUD changes and relative zoom on real viewport changes.
- Preserve preview/review/cancel, immediate Wait, authoritative presentation completion, one native dialog owner, focus/held-key protections, accepted-command saves, history return and audio lifecycle.
- Verify actual game controls and board geometry at the three design sizes and two stress sizes, enlarged text and synthetic safe areas; retain proof, encounter and reward/item regressions.

## Capabilities

### New Capabilities

None. The existing battle-controls capability owns these behaviors.

### Modified Capabilities

- `battle-controls`: specify responsive rail/dock feedback, separate inspection, drawable-board geometry and the accepted keyboard/focus behavior without changing combat or persistence rules.

## Impact

Primary code: `src/ui/hud.ts`, `src/style.css`, `index.html`, `src/app/startBattleApp.ts`, `src/phaser/BattleScene.ts`, `src/phaser/BoardRenderer.ts`, `src/geometry/iso.ts` and `src/geometry/picking.ts`. Adapt all shared geometry callers, including proof/content-smoke scenes and the encounter fixture. Change `BoardInput` or `BattleDialogs` only where the accepted behavior needs it; retain their existing ownership and lifecycle.

Extend existing geometry/input unit tests and battle-loop/battle-board browser tests, retaining animation, persistence, audio, proof, content, encounter and run-item suites. No dependency, save-format, balance, new-art, framework, deployment or physical-device certification changes.

Plan: [docs/ongoing-projects/plan.md](../../../docs/ongoing-projects/plan.md). Branch: `work/issue-111-responsive-battle-controls`; base: `main` at `4e601480400a241a2c08cb88a41442e55a5385b7`. Assignee: `moshehbenavraham`. This publication contains planning only; implementation approval remains pending.
