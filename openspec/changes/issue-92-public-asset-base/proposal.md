# Proposal

## Why

PR #95 review reproduces #92: battle, proof and content-smoke cannot start under `/prototype/` because public assets are fetched from the origin root. This also blocks Continue and recovery before they can render.

## What Changes

- Resolve canonical public paths against Vite's configured base only where images, portraits and audio are consumed.
- Cover direct navigation, refresh, real audio gestures and controlled asset failures in development and production preview at `/` and `/prototype/`.
- Record supported commands and actual acceptance evidence.

## Capabilities

### New Capabilities

- `public-asset-loading`: base-aware public resource addressing without modifying canonical content or persistence identities.

### Modified Capabilities

None. Existing audio failure and gesture requirements remain unchanged.

## Impact

One presentation URL helper, content/proof loaders, battle audio fetches, HUD/proof portraits, browser checks, README and QA evidence. No dependency, content, save format, combat, hosting configuration or release change. Integration first rebases #95 onto main while preserving extracted routing and guarded restart handling.
