# Design

## Context

See [proposal.md](proposal.md) for the problem and [the contract](specs/game-save-scope/spec.md) for observable behavior. At main `d8692f94cb652eb6fbb6f4fa2a9330ad57c3d4dd`, `routeHref` sends menu choices to direct mode paths; `consumeEntryIntent` strips the request. The dungeon and run entry modules construct durable storage unconditionally, and standalone `BattleScene` constructs `BattlePersistence` and `BattleSaveControls`.

`DungeonSession.publishSpatial` saves before publishing normal spatial transitions. Its existing `playUnsaved` path deliberately prevents floor travel. `RunItemSession` already centralizes accepted item/battle boundaries. `BattleSession` is the existing storage-independent combat owner. These constraints favor an explicit entry capability without a second implementation of gameplay.

The menu's reviewed new-dungeon handoff uses `sessionStorage`; #269 added empty-slot and changed-save safeguards on both sides. Production HTML also contains a separate preload route classifier in `vite.config.ts`. The performance collector clears battle/run slots on warm reload, which becomes unnecessary for testing entries.

## Goals / Non-Goals

**Goals:** One base-aware entry policy, complete transient play, unchanged durable slot/format safety, and real browser proof of both scopes.

**Non-Goals:** No new save namespace, migration, history store, generic storage framework, new game rules, new test runner, dependency adoption or deployment. Non-game privacy/audio preferences remain separate from saved progress.

## Decisions

1. **Persistent mode stays at the base root.** Add a closed `game=battle|run|dungeon` root selector and a menu-game URL builder. Keep `routeHref` for testing/navigation paths. Menu New/Continue/recovery use root URLs such as `/?game=dungeon&entry=new`; consuming `entry` leaves `game` for reload. Explicit supported `scene` diagnostics take precedence and remain transient. Direct mode paths cannot acquire persistence through query parameters. Resolve route and persistence eligibility together once and pass the result to the hosts. A per-tab/session-storage marker is rejected because it can leak eligibility into diagnostic routes and becomes fragile across reload/history.

2. **Persistence is absent for testing sessions.** Pass the entry capability into existing owners. For direct standalone battle, create the existing fresh `BattleSession` without `BattlePersistence`/save controls. For run/dungeon, make storage explicitly optional and bypass durable inspection, serialization and writes at accepted boundaries when absent. Reuse the same domain transitions, battle host and restart cleanup. Transient dungeon travel publishes a valid candidate without the durable commit step. Persistent travel keeps save-before-publish and its failure recovery. Reject a fake-success store or a parallel simulation, and do not repurpose `playUnsaved`, whose travel restriction is intentional for failed durable play.

3. **Scope save UI and handoffs to persistent play.** Persistent hosts retain current recovery, compare-before-remove and unsaved-departure behavior. Transient hosts start fresh with ordinary mode controls and an honest indication that testing progress resets. They do not mount Continue, save recovery, retry/remove/export-save actions or read the menu review handoff. Keep non-save inspection, log, sound, restart and Main menu navigation. Scope the dungeon renderer's recovery action to the owning mode.

4. **Keep formats and old saves.** Menu inspection continues to discover the same battle/run/dungeon slots. Revalidation and the #269 empty/changed/backup-only/failed-write cases run inside the root game flow. Existing direct saved-game bookmarks intentionally become testing entries; guidance directs players to base-menu Continue. No automatic clearing, copying or rewrite of old saves occurs. Full-page navigation remains; no SPA router is needed. Align the production preloader with the entry policy so menu boot stays lightweight and root battle/run entries get their expected resources.

5. **Move coverage instead of deleting obligations.** Capture selected test IDs before edits. Remove assertions that expect direct testing routes to persist; preserve their save/recovery assertions under menu-owned root entries and update shared fixtures. Leave non-persistence gameplay cases on direct entries. Instrument progress-key and handoff accesses, seed primary/backup sentinels, and verify no access through startup, actions, restart, reload, visibility and navigation. Do not count assertion/test-harness sentinel reads as application access. Preserve independent preference behavior. Update collector warm navigation to rely on fresh transient reload instead of removing saves.

## Risks / Trade-offs

- Entry/preload classification drift → share or explicitly verify the same finite policy at `/` and `/prototype/`, including conflicting and unknown parameters.
- Optional storage could weaken real save failure guards → retain durable-owner tests and add transient travel plus persistent failed-travel comparisons.
- Existing browser helpers assume direct-route Continue → inventory all fixture consumers before editing, then map retained and removed IDs explicitly across default, WebKit, dev, telemetry and extended modes.
- Draft #274 changes dungeon entropy fixtures; #273 changes the battle host → recheck merged main and PR state before implementation, integrate only merged prerequisites, and preserve current random-new-game/saved-seed behavior.
- Full regression is substantial → iterate with narrow cases, then run the required inventory once on final relevant inputs with exclusive self-hosted capacity. Preserve failures; do not widen timeouts or add retries to obtain green results.

## Migration Plan

Implement the entry boundary, transient owners, scoped UI and fixture migration together. Validate existing saves through menu Continue with unchanged codecs. Update the main-menu/dungeon/battle persistence docs and the verification coverage mapping before the implementation PR. A code rollback restores the previous routing; no player-data rollback or migration is needed. Publishing this plan does not deploy or merge implementation.
