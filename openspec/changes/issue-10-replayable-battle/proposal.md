# Proposal

## Why

The authored board currently exposes movement and manual turn advancement, while combat, signatures and enemy AI exist only as domain APIs. [Issue #10](https://github.com/luminari-gurus/tactics-guru-v2/issues/10) connects those merged pieces into a playable battle and unlocks #11's device/performance acceptance.

## What Changes

- Add a small session controller for player previews, confirmation, automatic enemy turns, accepted-command replay records, outcomes and restart.
- Replace diagnostic battle controls with responsive hero portraits, HP/status/turn feedback, action controls and a bounded battle log.
- Animate resolved events with input locked throughout presentation; provide modal focus/capture and keyboard/mouse/touch controls.
- Prove complete legal wins and losses through real controls, plus replay equivalence, cancellation and repeated restart cleanup.

## Capabilities

### New Capabilities

- `battle-session`: replayable player/enemy battle orchestration and presentation lifecycle.
- `battle-controls`: responsive accessible battle HUD, preview/confirm/cancel and safe input.

### Modified Capabilities

None. Existing domain legality, content and enemy policy remain authoritative.

## Impact

New `src/app/BattleSession.ts`, `src/ui/hud.ts`, `src/ui/dialogs.ts`, focused unit/browser tests and `docs/qa/issue-10-battle.md`; updates to `src/phaser/BattleScene.ts`, `BoardRenderer.ts`, `BoardInput.ts`, `src/main.ts`, `index.html`, and `src/style.css`. Reuse current catalog/portraits/projection/loader and existing test scripts. No added runtime dependencies, rule rebalance, new assets, save UI, route, rewards, inventory, backend or deployment changes.

## Work identity

- Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/10
- Caller/assignee: `dubstylee`.
- Base: `origin/main` at `5a7a5b6808a4e04313b220b2eb42ef00b240982d`.
- Branch: `work/issue-10-replayable-battle`.
- Change: `issue-10-replayable-battle`.
- Prerequisites: #6 renderer (PR #51), #7 combat (main `2ed8a8d`), #8 signatures (PR #47), #9 AI (PR #54), all verified on main. #6 stays open for physical-device acceptance; its merged renderer supplies this integration. #10 has no GitHub blocking relationships or active implementation PR. #1 is the parent epic, not a blocker. #11 waits for this battle integration.
- Approval: pending explicit caller approval of these artifacts.
