# Proposal

## Why

[#123](https://github.com/luminari-gurus/tactics-guru-v2/issues/123) lets mobile players reclaim board space after the responsive HUD merged in #119 and #118. The shared shell serves both standalone battles and authored run encounters.

Caller: `dubstylee`. Branch: `work/issue-123-collapsible-hud`. Base: `origin/main` at `a009a3ec4c35b3e57adc58ac700e56721af9ae8f`. Implementation approval: caller explicitly approved this published plan in chat on 2026-10-18.

## What Changes

- Add an accessible mobile collapse/expand button with a persistent compact expand affordance; start expanded and retain the choice only for the current app session.
- Hide expanded HUD contents without changing authoritative battle state, while releasing their layout space to the drawable board region.
- Preserve camera navigation, input capture, prepared actions, dialogs and recovery across toggles, resize, restart and run encounter boundaries.
- Verify both routes with touch/keyboard Playwright evidence in portrait, short landscape and narrow layouts, and desktop regression coverage.

## Capabilities

### New Capabilities

- `mobile-battle-hud`: Collapsible mobile battle controls, geometry, accessibility and lifecycle behavior.

### Modified Capabilities

None. Existing battle-controls behavior remains a regression constraint.

## Impact

Expected implementation: `src/ui/battleLayout.ts`, `src/style.css`, `src/phaser/BattleScene.ts`, and only if needed the existing board camera/input modules and battle/run entry points. Extend battle browser fixtures and add focused collapse coverage; retain screenshots and acceptance mapping under `docs/qa/issue-123-collapsible-hud.md`.

No combat rules, save format, cross-session preference, framework, dependency, deployment or broad HUD redesign. #127 remains an independent performance remediation; this issue does not claim its acceptance.
