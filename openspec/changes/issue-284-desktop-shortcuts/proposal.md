# Proposal

## Why

Battle actions currently require navigating controls even when using a keyboard. Issue [#284](https://github.com/luminari-gurus/tactics-guru-v2/issues/284) requests discoverable shortcuts without bypassing previews, availability or native editing.

## What Changes

- Add M/A/S/1–9 selection, W immediate Wait, C explicit confirmation and existing Escape cancellation to active battles.
- Preserve native arrows/Enter/Space, rail action-first and radial target-first interactions, modal focus and scene cleanup.
- Add compact hints and a keyboard-accessible full-map disclosure.
- Verify typing/modifier/repeat guards and shared standalone/run/dungeon consumers through real controls.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `battle-controls`: add discoverable, context-safe action shortcuts for both control skins.

## Impact

Scene keyboard ownership, HUD hints/ability selection, radial aim/focus, minimal CSS and player instructions; existing browser regressions and OpenSpec tracking. No dependencies, configurable input framework, gameplay, saves, RNG or telemetry changes. Follow the approved `docs/ongoing-projects/plan.md` on `branch/issue-284-desktop-shortcuts`.
