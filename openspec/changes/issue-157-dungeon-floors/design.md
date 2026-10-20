# Design

## Context

See proposal.md for scope and branch identity. Base source audit: `run.ts` requires exactly three IDs, seed index 0–2 and revision <=16, with terminal third victory. `items.ts` validates equipment IDs against reward indices 0/1. `runSaveEnvelope.ts` format 2 and 32,768 code units bind current encounter definitions; `runStorage.ts` owns primary/backup recovery. `startRunApp.ts` and `runItems.ts` render “of 3”. `BattleScene` accepts a run host and `BattleSession` owns authoritative battle commands. `map/state.ts` provides deterministic 20×20 map/marker state. Existing `battle-session` specs remain unchanged.

## Goals / Non-Goals

**Goals:** A playable floor foundation with stable identities and save semantics for #158/#159; retain narrow validated legacy mode behavior.

**Non-Goals:** Spatial movement/fog/contact encounters (#158), depth scaling/biome pools (#159), new boss rosters, class progression, new loot policy, or unbounded storage promises.

## Decisions

1. **Add `/dungeon` as an explicit mode.** Link it from run entry using BASE_URL. Keep `/run` as the short scenario and existing slots untouched. Replacing `/run` now would unnecessarily invalidate existing saves. No automatic migration or deployment is included.
2. **Separate dungeon aggregate, share bounded primitives.** Add `domain/dungeon.ts`, `dungeonSaveEnvelope.ts`, `content/dungeon.ts`, `app/DungeonSession.ts`, `app/startDungeonApp.ts`, `persistence/dungeonStorage.ts`, and `ui/dungeon.ts`/CSS. Reuse BattleSession/RunBattleHost via a small host adapter; extract common ownership/projection/reward primitives from `items.ts`/`rewards.ts` instead of copying the entire short-run controller or relaxing its validators. Existing run tests must retain their accepted/rejected corpus.
3. **Versioned floor template v1.** Each floor uses the existing ordered three battlefield sources with the last designated guardian; existing enemies/stats stay unchanged. A deterministic Rooms/Grassland overworld descriptor supplies map identity and legal distinct entry/exit positions using existing map generation. The floor summary shows map/positions and explicit encounter/start/stair controls. Encounter order remains sequential for this foundation; no claim of spatial exploration. Entry starts at the upstairs position; newly descended floors start there. Stair controls represent travel to the named stairs and preserve each floor's last position. Ascent from depth 1 is unavailable; revisiting a cleared floor exposes its stairs without restarting encounters. #158 will replace this summary interaction with spatial traversal while preserving floor facts.
4. **No gameplay endpoint.** Use positive safe-integer depths and monotone safe revisions, with checked arithmetic and explicit resource errors before overflow. Reaching a representational/storage limit suspends unsafe operations with recovery, never produces victory. Floor seeds use a versioned hash of run seed, depth and purpose; encounter/reward seeds add stable slot identity. Do not rely on legacy multiplication modulo overflow or use a shared mutable RNG. Store full descriptors and verify regenerated geometry hashes.
5. **Boundary ownership.** Keys include dungeon ID, floor depth, encounter slot and purpose; commands also carry expected revision. Completion atomically commits party HP, POI state and pending offer. First two encounters grant current two-option item rewards; the guardian unlocks descent without adding new loot. Inventory capacity checks remain; rewards stay pending while confirmed owned-charm disposal frees equipment capacity or eligible healing supply use frees consumable capacity. Travel carries party/items; guardian battle does not heal. Defeat ends play, while new-run confirmation resets only dungeon state. Battle-local effects/actions reset on fresh construction, never on reload.
6. **Compact facts and bounded geometry.** Keep at most current and two recently viewed resolved floor maps in memory. Persist every visited floor's compact descriptor, position and three completion bits; never evict durable floor facts. Dungeon envelope v1 uses a 1 MiB UTF-8 budget and validates all collection lengths against remaining bytes before allocation. Geometry is regenerated, not serialized. Persist the one active battle and pending offer in the same checksummed/versioned envelope. Separate dungeon primary/backup keys and existing recovery conventions avoid replacing short-run data.
7. **Travel durability gate.** Compute/validate candidate travel without publishing it, encode and write a recovery-safe snapshot, then publish after successful primary readback. A write/readback failure retains current in-memory floor and offers retry/export. Backup may contain the previous valid snapshot; if a write outcome is uncertain, inspect both slots and require explicit recovery before further travel. Unavailable storage permits explicit unsaved battle play, but travel is blocked until saving succeeds; explain this before starting unsaved mode. Preserve malformed/foreign bytes and namespace ownership. Export current in-memory progress as well as damaged raw slots. Never prune floor history to pass a quota.

## Acceptance mapping and validation

- AC1: route isolation, pure dungeon state and high-depth nonterminal transition tests; retain full three-battle victory suite.
- AC2: guardian gate, two-floor descend/ascend/revisit browser flow and duplicate completion/reward/stair reducer tests.
- AC3: shared identity/ownership projection tests across multi-digit depths, max-safe boundaries and equipped survivor subsets; progress UI screenshots.
- AC4: save format/resource tests, geometry-cache eviction reconstruction, corruption/incompatible recovery, quota/security/readback failures and old-slot byte preservation.
- AC5: active battle/reward/travel roundtrips comparing next command/events/RNG; stale callbacks, defeat and confirmed new-run lifecycle in unit and browser tests.

Run `npm run test:unit`, `npm run validate:content`, `npm run typecheck`, `npm run build`, full `npm test` (including configured encounter/item posttest suites), focused dungeon Playwright on desktop/mobile portrait/landscape, strict OpenSpec validation and `git diff --check`. Retain screenshots/logs and exact source identity in `docs/qa/issue-157-dungeon-floors.md`; measure added route code/save growth and retain existing budget failures. Playwright emulation is sufficient; no physical-device claim.

## Risks / Trade-offs

- Reused guardian roster is foundation content → label accurately; #159/#170 own future selection/bosses.
- A separate aggregate can duplicate logic → share pure item/reward primitives and existing battle engine, keep mode-specific validators.
- Browser storage is finite and writes can be uncertain → explicit readback/recovery, no silent eviction, no terminal depth.
- Open PR #139 changes shared shell/input → avoid duplicating collapse behavior, reconcile on merge and rerun relevant regressions.
- Large cross-cutting delivery → implement in reducer, persistence, adapter and UI slices with boundary checks; material scope changes need revised approval.

## Migration Plan

New mode/namespace only; no old-save rewrite or importer. Document new route and limitations. Removing the dungeon entry rolls back availability without deleting its saves. No production activation or main merge is authorized. Approval of this plan selects the temporary three-encounter floor template and summary stair controls explicitly.

## Approved inventory capacity resolution

The caller selected “Discard with confirmation”. Add a dungeon-only `discardEquipment` command at the existing revision boundary. During ready/reward phases it removes exactly one owned charm and its assignment, if any. It changes neither party HP, RNG, floor completion nor the pending offer; the existing claim command can then use the freed slot. Battle/defeat, unknown instances, malformed commands and stale revisions reject atomically. The UI names the charm and equipped hero, defaults focus to Cancel, and requires an explicit Discard charm action. No currency, replacement item, reward skipping or changes to short-run item commands are introduced. Persist through the existing snapshot/recovery path; a failed save remains visibly unsaved and never restores the item silently in memory.
