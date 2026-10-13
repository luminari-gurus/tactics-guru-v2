# Design

## Context

See proposal.md. Canonical registries contain `/battle`, `/proof`, `/textures` and `/audio` paths. Content validation and persistence identity depend on that metadata. Main already extracts battle startup and routes `/map` relative to Vite base.

## Goals / Non-Goals

Outcome: all public resource consumers use the application base, with unchanged guarded battle restart and route isolation after the rebase. Non-goals: changing inventories, content/save identity, simulation, media bytes, dependencies, hosting configuration or physical certification.

## Decisions

- Use one presentation helper to join `import.meta.env.BASE_URL` with the canonical path minus its leading slash. All current callers consume local public paths; no general URL router, fallback, catalog rewrite or new loading layer is needed.
- Files: `src/ui/publicAssetUrl.ts`, content and proof loaders, battle audio fetch, HUD portraits. Proof image/audio/portrait paths share the same helper. Keep existing loaders, error handling and deadlines.
- Reuse the Playwright config with optional base and server-mode inputs, and one focused browser file. The ordinary suite stays at root; the focused file navigates relative to baseURL. Run root/prefix in dev/preview, all existing viewport profiles, with images, portraits, both battle audio backends, proof audio, refresh/Continue and controlled failures. Retain existing unit/content/save/domain checks and full root browser coverage.
- Keep the original PR commits after rebase and place this review repair in its own commit. No release tag, stack or squash is needed; publish to the existing PR branch with the exact old-head lease.

## Risks / Trade-offs

Unprefixed requests hidden by a root server fallback -> assert actual request paths and decoded portraits, not readiness alone. Regression to catalog identity -> unchanged inventory/domain diff plus existing canonical fixture/save tests. Restart conflict resolution -> existing persistence reset/cancel/failure cases and full browser suite. Local browser evidence -> report device and hosted validation limits explicitly.
