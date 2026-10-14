# Design

## Context

See [proposal](proposal.md). `BattleScene` already disposes sessions, animation, HUD, dialogs, input and audio on shutdown. Asset loading also cancels its callbacks on shutdown. BFCache does not invoke that lifecycle. The installed Phaser SceneManager `stop(scene)` invokes shutdown synchronously; the scene plugin's queued stop is insufficient before a document freezes.

## Goals / Non-Goals

**Outcome:** prevent one-tab cached documents from overwriting newer saved battles and retain all original #96 acceptance evidence.
**Non-goals:** multi-tab concurrency, ownership tokens, a new save format, physical certification, map changes or release work.
**Files:** battle bootstrap, existing persistence browser tests, storage docs, PR handoff/QA, and this OpenSpec change.
**Proof:** actual `pageshow.persisted` observation with BFCache enabled, exact primary/backup comparisons, Continue state comparison, existing full unit/browser checks and root/prefix builds.

## Decisions

- Bind battle-only page lifecycle listeners in the bootstrap, once per document. On pagehide, disable application controls and call the game scene manager's immediate stop. Reuse shutdown rather than duplicating guards across commands, saves and dialog actions.
- On persisted pageshow, reload the same URL. Existing startup reads current slots and handles normal Continue, corrupt data and unavailable storage. Reload intentionally discards stale UI and in-memory state; accepted commands were saved before their presentation. Normal tab visibility does not reload.
- Extend `battle-persistence.spec.ts`, retaining existing helpers and profiles. Omit Playwright's `--disable-back-forward-cache` for this test file (launch options require worker scope), and require a persisted pageshow event in history regressions. No synthetic event may stand in for the cache-restore proof.
- Keep historical map evidence immutable, record fresh combined-source verification separately and rewrite the PR description around its final scope.

Ablation removes the proposed alternative of persisted session ownership/revision checks: it would change the storage contract and still require UI recovery. Immediate shutdown plus the existing startup flow supplies the requested lifecycle behavior without new state, dependencies or storage rules.

## Risks / Trade-offs

- Cached return incurs a reload and explicit Continue → use the existing recovery UX, including origin/base-path handling.
- Browsers may decline BFCache → tests assert cache use and fail if the environment does not exercise it; normal document reload already uses startup.
- Scene cleanup must happen before suspended work resumes → use synchronous manager stop and verify navigation during presentation and after scene restart.
- Unsaved progress after storage failure cannot be recovered from a departed document → retain the existing visible unsaved warning and best-effort retention contract; do not overwrite current slots with stale memory.
