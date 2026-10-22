# Design

## Context

See proposal.md for issue, caller, branch and base identity. Source inspected at base `38474f2`:

- `domain/dungeon.ts` owns 20×20 Rooms/Grassland floor descriptors, first/last-open stairs, a position restricted to those stairs, ordered completion count and one active battle. `dungeonBattle` projects owned equipment and survivor HP into existing content.
- `DungeonSession` owns accepted battle callbacks. Travel already saves/readbacks candidates before publishing; encounter start currently publishes before saving. `dungeonStorage` preserves backup and exposes uncertain writes; it is best-effort synchronous storage, not a cross-tab transaction.
- `ui/dungeon.ts` renders an SVG summary and remote encounter/stair buttons. `startDungeonApp` switches that view and the shared BattleScene, including recovery and BFCache reload.
- `/map` uses readonly `OverworldMarker` / `OverworldState`, `createOverworld`, biome and art helpers. It does not move enemies. #155 remains open and owns that simulation.
- Dungeon envelope v1 binds content identity and a 1 MiB limit. FloorCache retains only three generated geometries, while descriptors/completion remain durable.
- Main battle-session specs were read in full; they remain unchanged. The unarchived #157 change supplies continuing-floor constraints and current `docs/dungeon.md` documents their shipped behavior.

## Goals / Non-Goals

Goals: satisfy every #158 acceptance criterion with a single dungeon transition path, existing battle/reward/item primitives and recoverable saves. Keep deterministic floor facts independent of DOM/image state.

Non-goals: biome/roster/scaling changes (#159), passive/aggressive motion (#155), scouting/trap/cache actions (#175), shops/camps, player movement on `/map`, new dependencies or telemetry collection. Stationary encounter markers here are not a claim that #155 is complete.

## Decisions

### One continuing route and one source of truth

Implement exploration on `/dungeon`; retain `/map` inspection and standalone battle/short-run behavior. Add pure `domain/exploration.ts` and a focused `ui/dungeonMap.ts`, integrating existing dungeon state/session rather than introducing another app/session/store. The map view uses existing biome/art helpers and marker IDs/coordinates; it does not call `startMap`, which replaces the document and owns prototype controls.

Alternative: turn `/map` into gameplay. Rejected because its generator controls and independent inspection contract would conflict with retained floor identity. A shared map framework is unnecessary with these different input/lifecycle consumers.

### Deterministic markers, placement and discovery

Extend each durable floor with exploration policy `exploration-v1`, exactly three ordered POIs with stable `enemy-1` through `enemy-3` identities and an `encounterSlot` 0–2, and revealed/visited cell sets encoded as sorted unique indices (0–399). Player identity remains `player`. Stairs retain descriptor indices and separate `stairs-up`/`stairs-down` IDs. Position moves from the floor's existing field; do not store a second player position.

Place encounter markers by a fixed seeded shuffle without replacement of open cells excluding both stairs, using a hash-derived exploration-purpose seed independent of floor/battle/reward streams. Stable row-major candidates and fixed iteration order make regeneration reproducible. Require sufficient open cells and connected cardinal reachability before accepting a floor; bounded placement failure returns a visible error without publishing a partial floor. Hash/version-bind placement policy. The current three encounters stay ordered; later POIs can be crossed without launching them, and become available after the existing reward is claimed. Entering an available POI starts its battle; if already standing there when it becomes available, an explicit Enter encounter control is enabled only on that cell. No remote encounter button remains.

Reveal a Manhattan-radius-two diamond, including blocked cells with no wall occlusion, at initial position and every accepted step. Reveal is geometric awareness, not combat LOS. Maintain monotone visited and revealed sets. POI discovered derives from reveal, visited from visited cells, completed from authoritative encounter completion; do not store redundant completion booleans. All 400 map cells remain traversable under existing terrain legality, including locked/cleared encounter markers. Defeat and pending rewards freeze traversal. These rules avoid requiring enemy-motion semantics or a second POI scheduler.

### Single-step commands and input

Commands carry dungeon ID, floor depth and expected revision. A legal step is exactly one N/E/S/W walkable neighbor, rejected outside ready phase. Each accepted step increments revision once, reveals/visits its destination and optionally includes the next encounter's battle creation in the same candidate. Rejections consume no RNG/resources. No diagonal movement, click-to-path automation, timers or key repeat. Pointer/touch map activations move only to an adjacent cell; nonadjacent POIs can be inspected without movement. Arrow/WASD keys apply only with map focus; form controls and open dialogs retain their normal keys. Provide four 44px direction buttons for narrow touch screens and map status describing movement/locked POIs.

Dungeon rendering uses retained state; art choice is view-local and does not alter saves or simulation. Async art callbacks require a live generation token/disposed check. Dispose input bindings on route teardown; backgrounding cannot advance steps because there is no simulation timer. Coordinate with #155's exported state contract when available, without adding its behavior profiles or claiming to persist unimplemented wandering state.

### Encounter ownership and return

Use `dungeonBattle`, existing `BattleSession`/`BattleScene`, `acceptDungeonBattle`, rewards and item commands. Associate an active battle with its floor/slot/POI entry cell in the same snapshot; validate that association at construction and decode. Prepare and persist/readback entry before publishing or creating the live session; a failed entry remains on previous in-memory exploration and cannot launch a battle. Retain idempotent session identity and current phase/revision checks for callbacks. An already persisted active battle resumes directly rather than entering again.

Accepted battle commands continue to save the entire snapshot at existing authoritative boundaries. A later battle save failure follows existing visible unsaved/recovery behavior; never claim all storage writes roll back resolved battle commands. On victory, keep the entry cell, update HP/completion once, retain reward until claimed, then allow exploration. On defeat, retain final discovery and terminal party state with no further movement. Items remain available through current preparation/reward UI and project once into each new encounter.

### Stairs and floor retention

Require matching current stair position in `travelDungeon`; retain existing guardian/ready/unsaved gates. New floors start at upstairs with initial reveal. Returning to a retained floor restores its last departure cell and discovery. Use existing FloorCache and validate generated identity when a floor is entered. Do not keep rendered maps for all floors or prune durable discovery to fit limits. A remote stair request must reject without incrementing revision.

### One payload, explicit versioning and recovery

Write dungeon format v2 under the current dungeon storage keys; the key is a namespace, not the encoded format. Update dungeon identity to bind exploration schema/placement policy. Retain an explicit v1 identity and exact legacy shape/content validation based on the shipped base so decoding never accepts arbitrary old or foreign data.

For a valid v1 snapshot, deterministically synthesize POIs and initial revelation for retained positions. Preserve party/ownership, revision, floor seed/hash, completion, pending offer and battle bytes/RNG. For an active or reward-pending encounter, map the current position to that encounter's deterministic POI and reveal/visit that cell; for ordinary ready/completed floors preserve the existing stair position. Completed POIs become discovered/visited as historical facts. This is new spatial state, not invented prior traversal. Continue is read-only until an explicit existing save boundary; before the first v2 write the existing primary-preservation mechanism retains exact original v1 bytes in backup, and export remains available. Decode backup v1 without recursively migrating newly encoded v2 data.

Validate collection bounds, sorted unique indices, legal positions, visited subset of revealed, POI seed/identity, completion ordering and battle association before publishing. Keep the 1 MiB bound, quota/security/uncertain-write feedback and export/compare-before-removal behavior. Spatial steps and encounter entries use travel's candidate-save/readback pattern; explicit unsaved play permits movement and battles with visible status, but no floor travel. Do not silently retry uncertain writes. Multiple tabs remain best-effort; commands protect the live revision but do not promise a cross-tab transaction.

Alternative: invalidate all v1 saves. Rejected because valid active parties/battles are current player progress. Alternative: separate exploration storage. Rejected because independent writes could detach a battle from its POI and duplicate rewards.

## Acceptance mapping and proof

| Issue criterion | Implementation | Verification |
| --- | --- | --- |
| Legal player traversal and controls | Pure cardinal transition, revision guard, map and direction input | Blocked/edge/diagonal/stale/repeat unit tests; actual keyboard and touch steps on three layouts |
| Fog and POI state | Sorted reveal/visited sets, stable seeded POIs, derived completion | Seed corpus, reveal boundaries, discovered/visited/cleared list and screenshots |
| Contact, battle and return | Atomic entry candidate and existing accepted callback boundary | Reach a POI through legal UI steps, execute battle actions, reload active state; legal final-command fixtures for victory/reward/defeat; duplicate callbacks |
| Floors and art independence | Spatial stair gates, retained floor exploration, existing art helper | Remote/locked stairs, legal walk/travel/backtrack, compare complete snapshots across art completion/rotation |
| Unified save and lifecycle | v2 envelope, v1 conversion, readback/recovery and disposal | v1 ready/reward/active/defeat conversion, malformed corpus, quota/security/write-after-throw/readback mismatch, reload/recovery/old callbacks |

Expected tests: extend `tests/unit/dungeon.test.ts`, `dungeonBattle.test.ts`, `tests/dungeon.spec.ts`, `dungeon-lifecycle.spec.ts` and `tests/helpers/dungeonFixtures.ts`; add `tests/unit/exploration.test.ts` and focused `tests/dungeon-exploration.spec.ts` only for coverage not practical in existing files. Update fixtures to enter or represent canonical POI associations rather than bypassing new validation. Retain actual production UI path evidence rather than proving traversal solely through injected snapshots. Run focused checks during work, then full `npm run test:unit`, `npm run validate:content`, `npm run typecheck`, `npm run build`, `npm test` (including configured posttest encounter/item suites), strict OpenSpec and `git diff --check`. Add focused WebKit checks for map keyboard/touch, migration and battle-return lifecycle. Capture desktop, mobile portrait and short landscape screenshots, raw logs and precise implementation revision in `docs/qa/issue-158-overworld-traversal.md`. Measure route bundle/transfer and map responsiveness against existing budgets and retain any failures. Device emulation is sufficient; no physical-hardware claim.

## Risks / Trade-offs

- Larger durable floor history → enforce existing byte/allocation/quota limits with explicit recovery; never silently prune discovery.
- v1 migration accidentally changes battle identity → keep legacy identity/validation isolated, compare active state/RNG byte-for-byte and round-trip all phases.
- Repeated render handlers or stale battle callbacks → one abortable view binding and session/floor/revision association checks.
- Stationary ordered markers feel less dynamic → intentional #158 slice; wandering/pursuit remain #155, new encounter selection remains #159.
- New art rendering adds cost → reuse bounded existing assets/fallbacks, avoid full regeneration on each input and measure actual route cost without relaxing budgets.
- Future #155 merges touch marker types → reconcile with readonly contract while preserving this scope; material behavior changes require revised plan approval.

## Migration Plan

Implementation is pending caller approval. Ship only reviewed application changes and versioned conversion; retain existing save exports and recovery controls. A prior application build cannot read v2: rollback guidance must export v2 and return to the matching build, or explicitly select a preserved v1 backup with disclosed progress loss. Do not overwrite new data with a synthesized old save. No production cutover or deploy is authorized by this plan.
