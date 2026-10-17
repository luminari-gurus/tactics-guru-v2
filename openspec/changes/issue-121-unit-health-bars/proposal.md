# Proposal

## Why

[Issue #121](https://github.com/luminari-gurus/tactics-guru-v2/issues/121) requests visible unit health without selecting each unit. Reproduce the legacy shallow curved treatment using the current authoritative battle presentation.

Caller: `dubstylee`. Branch: `work/issue-121-unit-health-bars`. Base: `origin/main` at `718107de00d58a19996386146d792075e3c5c023`. Implementation approval: pending.

## What Changes

- Show a dark shallow curved track and proportional green/yellow/red fill beneath every living hero and enemy, including full-health units.
- Derive HP from the displayed snapshot and maximum HP from its hero/enemy catalog definition; clamp ratios and retain numeric HUD information.
- Attach bars to movement, elevation, camera transforms and existing combat presentation, and dispose them with the scene.
- Verify threshold boundaries, visible pixels, touch/keyboard navigation and lifecycle behavior on desktop and mobile Chromium/WebKit.

## Capabilities

### New Capabilities

- `unit-health-display`: Informational board-attached health, presentation timing and lifecycle.

### Modified Capabilities

None. Existing session, controls and tile-rendering contracts remain regression constraints.

## Impact

Expected: `src/phaser/BoardRenderer.ts`, a small pure `src/phaser/healthBar.ts` geometry/palette helper, `tests/unit/healthBar.test.ts`, a focused `tests/unit-health-bars.spec.ts` and WebKit-capable focused Playwright configuration. Reuse existing battle/animation/persistence/run test helpers and fixtures. Retain QA evidence in `docs/qa/issue-121-unit-health-bars.md` and associated screenshots.

No new dependency, art pipeline, combat rules, save format, HUD redesign or deployment. #111 is related spacing work owned by another caller in unmerged PR #119; it is not a health-bar prerequisite. Recheck its merge status before implementation and preserve its geometry/feedback if merged.
