# Proposal

## Why

The current battle HUD mixes party inspection, acting-unit information, actions, targeting, previews and secondary controls in one scrolling proof panel. [Issue #108](https://github.com/luminari-gurus/tactics-guru-v2/issues/108) needs a reviewable desktop/mobile design and implementation handoff now that the coordinated signature animations from #106 are merged.

## What Changes

- Produce a design package for desktop, mobile portrait and short landscape, using existing game art and actual battle information.
- Specify acting versus inspected/targeted units, named signature actions, action availability, preview/review/cancel, enemy/presentation locks and battle outcomes.
- Document touch sizing, safe areas, focus and keyboard behavior, accessible labels, measured contrast, board visibility and input capture.
- Record the selected design, review disposition, acceptance evidence and a bounded runtime handoff; create a linked follow-up implementation issue only if the reviewed design requires one.

This branch initially contains only the requested plan. Executing the plan produces design artifacts; it does not implement the live HUD or change combat.

## Capabilities

### New Capabilities

None. This is a design/documentation deliverable, with `skip_specs: true`.

### Modified Capabilities

None. Existing `battle-controls` requirements remain the behavioral baseline. Proposed implementation changes will be reconciled with that capability in the later runtime work; this task does not invent duplicate requirements or claim that mockups implement them.

## Impact

- Issue: #108; assignee: `moshehbenavraham`.
- Branch: `work/issue-108-battle-controls-design`, natively linked to #108 and based on `main` at `d2a1a61abb636b5ab38ddce6c26207f6bcb6d4f5`.
- Deliverables: `docs/ongoing-projects/plan.md`, task-specific design/prototype/preview evidence under `docs/ongoing-projects/issue-108-battle-controls-design/`, and this OpenSpec proposal/design/tasks.
- Read-only implementation references: `src/ui/hud.ts`, `src/ui/dialogs.ts`, `src/ui/persistence.ts`, `src/style.css`, `index.html`, `src/phaser/BattleScene.ts`, `src/phaser/BoardRenderer.ts`, `src/geometry/picking.ts`, `src/app/BattleSession.ts` and existing battle browser tests.
- No production code, dependency, content/balance, persistence format, deployment or physical certification changes. Android is available locally; no physical platform is required to complete this design item.
