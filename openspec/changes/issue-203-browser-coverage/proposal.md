# Proposal

## Why

Issue [#203](https://github.com/luminari-gurus/tactics-guru-v2/issues/203) is the remaining uncovered P1 matrix-selection task in epic #199. Current main discovers 693 default Chromium selections; some failure-path checks repeat identical device-independent work, while five explicit-viewport layout cases repeat identical Pixel configurations in both mobile projects.

## What Changes

- Select nine reviewed startup/asset failure or delay cases on canonical desktop only, with all assertions retained.
- Run the five explicit-viewport layout cases on desktop and mobile portrait, retaining their complete viewport loops and native mobile configuration; remove only the duplicate mobile-landscape executions whose viewport is overwritten before navigation.
- Preserve every other default selection, representative complete journeys, WebKit acceptance, touch/pointer, focus/keyboard, audio and lifecycle coverage.
- Add an exact before/after coverage map, negative tooling contracts and matched measurements, keeping full-verification/batch selection aligned.

## Capabilities

### New Capabilities

- `browser-verification-selection`: explicit conservative profile selection with exact coverage accounting and auditable measurements.

### Modified Capabilities

None. Existing product and performance contracts remain unchanged.

## Impact

Caller: `dubstylee`. Base: `958bbd90546e1305aab10e370d5555a1d7c9a43a`.
Published branch: [work/issue-203-browser-coverage](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-203-browser-coverage).

Expected implementation files: `playwright.config.ts`; metadata in `tests/assets.spec.ts`, `tests/boot.spec.ts`, `tests/engine-fit.spec.ts`, `tests/layout.spec.ts`; focused selection tooling/tests; `scripts/verification-batches.mjs` only if actual discovery exposes a compatibility need; `docs/verification-policy.md` and `docs/qa/issue-203/`.
No fixture refactors, product edits, timing changes, new dependencies, runner provisioning or deployment. PR #229 owns #205 audio refactors and must not be duplicated. PR #235 is merged; PR #228 batch tooling is already on main.
