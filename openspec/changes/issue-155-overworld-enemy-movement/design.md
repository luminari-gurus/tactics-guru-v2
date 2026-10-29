# Design

**Scope update:** The caller subsequently restricted wandering to `/dungeon`, on player steps. The original `/map` timer and pause sections below are historical and superseded by the dungeon integration section.

## Context

See [proposal](proposal.md) for issue/branch identity and motivation. Inspected base: `d5b19279a869501205e98856ebd5e5f91f8c287d`.

- `src/map/state.ts` provides validated immutable placement, four stable IDs and exactly four local placement draws. `src/domain/exploration.ts` extends `OverworldMarker`; changing that shared marker shape would unnecessarily affect dungeon save validation.
- `src/map/view.ts` retains the world and renders 400 cells. Both controls and asynchronous `createMapArt` callbacks call `render`; rendering already preserves pending input and validation. There is currently no movement scheduler or disposal return value.
- `src/main.ts` dynamically imports `/map`; other routes initialize separate applications. Navigation is document-based. Only the map branch needs to retain a disposer for development replacement.
- `tests/overworld-map.spec.ts` assumes static initial positions in marker and artwork tests. Time must be controlled for those assertions once movement starts. The development placement-failure test intercepts only `createOverworld`; preserve that export contract.
- Existing specs cover battles, not overworld movement. See the [new contract](specs/overworld-enemy-movement/spec.md).

## Goals / Non-Goals

**Goals:** bounded pure simulation, direct observable movement on the real route, stable configuration and scheduling, and focused proof of all seven issue acceptance items.

**Non-goals:** player controls, combat initiation/damage, enemy animation framework, persistence, dungeon movement, terrain/placement changes, new assets/dependencies, user-editable behavior settings or a general AI framework. Configurable means a typed initialization configuration; the prototype displays the chosen values.

## Decisions

### Keep movement separate from placement and shared dungeon types

Add `src/map/movement.ts` with readonly simulation state containing the retained `OverworldState`, behavior assignments, movement RNG and step count. Initialization wraps the unmodified placement result. A pure step returns a new simulation/world/marker collection without mutating the input map or marker objects. Validate configuration at initialization: exactly one profile per enemy, known IDs/kinds and integer aggressive range 1–38 (the 20×20 Manhattan maximum). Invalid configuration rejects explicitly before state changes. Default assignments are those in the spec.

Seed movement with `(map.seed ^ 0x4d4f5645) >>> 0` using existing `seedRng`. Each passive enemy consumes exactly one `nextUint32` draw per step, including when enclosed; use modulo legal-neighbor count when nonzero. Aggressive enemies consume no RNG. Neither rendering nor detection/pathfinding uses clock or entropy. Compare terrain and battle RNG before/after in tests. Modulo bias is acceptable for prototype wandering, as in existing placement.

Alternative: extending `OverworldMarker` or sharing dungeon exploration state would require unrelated type/save changes. A separate wrapper preserves those consumers and existing placement fingerprints.

### Use explicit range-based visibility and deterministic BFS

Default ranges 6 and 10 are deliberately prototype values. Detection uses Manhattan distance inclusive of the configured range; blocked terrain does not occlude visibility on this fully revealed inspection map. Aggressive enemies outside range remain idle, without wandering or pursuit memory. An adjacent enemy stays still.

For each detected enemy, search cardinal walkable cells excluding all other markers and the player. Stop at the first reachable free player-adjacent cell using FIFO BFS and north/east/south/west neighbor order; reconstruct one first step. Each search visits at most 400 cells. Update enemies in fixed ID order using current occupancy: earlier moves claim destinations, later enemies can use vacated cells, and direct swaps are impossible. An unreachable target causes a wait. No unrestricted retries or heuristic future-roll scoring.

Alternative: terrain LOS adds a separate occlusion/corner rule without helping the requested pathfinding demonstration. Range-only visibility is explicitly documented; it does not import battle LOS semantics. A shortest-path search handles blocked terrain better than greedy coordinate movement.

### One visible timer, no elapsed-time catch-up

Own one cancellable recursive 1000ms timeout in the map view. Start after successful initial placement. Each callback checks disposal, visibility and current view ownership, steps once, updates only marker projection, then schedules the next delay. Hidden state and `pagehide` cancel the timeout; `visibilitychange`/`pageshow` resume only if visible and not already scheduled. Successful regeneration resets the simulation and full delay; failure retains the previous simulation and existing cadence. No world means no timer. Unexpected step failure stops the loop with explicit feedback rather than retrying indefinitely.

Make `startMap` return an idempotent disposer that clears the timer and removes its lifecycle listeners. Wire it into the map branch's `vite:beforeFullReload` event; document departure uses `pagehide`. The entry has no HMR accept boundary, so a bare hot-dispose registration would not run on its normal full reload. BFCache suspension is reversible and distinct from final disposal: retain only the listeners needed for restoration while the document is cached; noncached document destruction releases them. Guard asynchronous art-triggered render calls while page-hidden, after disposal or after view replacement; refresh presentation from retained state on restoration. Avoid adding a scheduler library or app-wide lifecycle abstraction.

### Update markers without rebuilding controls or terrain each tick

Keep existing full terrain render for generation/art changes, then project markers from current simulation. Ordinary ticks update marker attributes and the accessible position description without replacing the form, terrain cells or native selects. Render an enemy number with a CSS pseudo-element above each existing diamond and matching numbered legend key, including narrow layouts. Display a compact visible text list of enemy IDs/profiles/ranges beside the existing legend; mirror it in accessible description. Do not announce every tick through the status live region. A single per-step count attribute can support deterministic browser assertions without putting authoritative state in the DOM. No production test-only movement API.

Preserve pending valid/invalid seed edits and existing error messages. Failed regeneration preserves state at the action boundary; later scheduled movement is expected and must not be mistaken for regeneration mutation. Art completion may rerender the latest world but cannot reinitialize it or change its timer.

### Proportional verification with controlled time

Select PR-readiness coverage under `docs/verification-policy.md`. This is isolated `/map` behavior, not shared battle turn/RNG/save/input behavior. No full battle, telemetry or dungeon matrix is required while imports and shared marker shapes remain unchanged. If implementation crosses those boundaries, reassess coverage before proceeding.

Expected files are listed in the proposal. Extend existing map units/browser tests instead of adding fixture infrastructure. Choose native-clock cases with an explicit test tag, and capture compared marker/step/description fields atomically in one browser evaluation. Use monotonic advancement assertions for the native BFCache case. Freeze or explicitly advance browser time for old static placement/art assertions; keep a real-time smoke to prove automatic scheduling without clock control. Do not tag away existing device coverage or relax assertions. Browser discovery must confirm all named cases/projects before execution.

Commands after implementation:

```sh
npm run test:unit -- tests/unit/overworldMap.test.ts
npm run build
npx --no-install playwright test tests/overworld-map.spec.ts --list
npx --no-install playwright test tests/overworld-map.spec.ts
PLAYWRIGHT_SERVER_MODE=dev npx --no-install playwright test tests/overworld-map.spec.ts -g 'controlled placement failure preserves complete state and supports retry'
npx --no-install playwright test tests/public-asset-base.spec.ts -g 'extracted map route still loads directly and on refresh at the base'
npm run build -- --base=/prototype/
PLAYWRIGHT_BASE_PATH=/prototype/ npx --no-install playwright test tests/overworld-map.spec.ts tests/public-asset-base.spec.ts -g 'map direct entry|extracted map route'
npm run build
git diff --check
openspec validate issue-155-overworld-enemy-movement --strict
```

The standalone build includes content validation and both TypeScript scopes. Run browser work serially with one worker and no automatic hosted fallback. Retain desktop keyboard, actual emulated portrait/landscape touch, 320px screenshots, focus/pending-edit preservation, art delay/failure, visibility pause/resume, page departure and BFCache restoration. Use an actual BFCache navigation for the restoration claim; synthetic events alone are insufficient. If unavailable, retain that acceptance limitation. The map browser file owns this capability in the existing suite inventory.

Acceptance mapping:

| Issue criterion | Implementation | Proof |
| --- | --- | --- |
| Explicit configurable profiles, both demonstrated | Typed initialization plus visible/accessible assignments | Valid/invalid config units; actual route assignments and both behaviors on desktop/portrait/landscape |
| Passive legal wandering/stay | Ordered legal neighbors, local draw | Enclosed/one/multiple neighbor fixtures, frozen input, repeated-step seed corpus |
| Aggressive detection/visibility/loss | Inclusive Manhattan ranges, no occlusion/memory | Exact range, one beyond, blocked sight, moved-player pure fixtures, idle after loss |
| Pathfinding/collisions/adjacency | Bounded BFS and sequential occupancy | Wall detour, blocked approach, occupied goals, conflicts, no swaps, adjacency and uniqueness over corpus |
| Cadence/order/separate RNG | Pure steps and one 1000ms loop | Repeat initial states/step counts, stable tie breaks, untouched generation/placement/battle RNG, no catch-up or double loop |
| Reset/art/hidden/disposal | Atomic initialization, marker projection, lifecycle owner | Generate/New seed/type/biome reset, failed placement, pending edits, delayed art success/network/decode, hidden resume, departure/remount and BFCache |
| Desktop/mobile evidence | Existing map suite and screenshots | Source/build-bound reports and reviewed desktop/portrait/landscape/320px screenshots, keyboard/native touch |

Keep exact commands, final relevant source hashes/build ID, browser/runtime/host, results, failures/skips/retries and screenshot/report paths in `docs/qa/issue-155-overworld-movement.md`. No preimplementation app test result is claimed by this plan.

## Risks / Trade-offs

- Fixed ID order can favor earlier enemies at chokepoints → deterministic waiting is intentional; no fairness scheduler is needed.
- Range-only visibility can detect through walls → visible documentation calls this an inspection-map rule; paths still respect terrain.
- Existing marker tests race automatic motion → control time explicitly and retain independent real-time scheduling evidence.
- Hidden/native-control and late artwork work can overwrite user edits → retain the current form and guard view ownership/disposal.
- Browser BFCache differs by engine/environment → record actual restoration evidence or an explicit incomplete gate; do not claim synthetic lifecycle events prove caching.
- Physical availability is none → no physical testing is required; describe Playwright device emulation accurately.

## Migration Plan

The caller subsequently expanded scope: dungeon enemies advance once per accepted player step and entering any live marker starts its encounter. After integrating the newer ability rules, format 8 stores positions, cleared slots and movement RNG and reads format 7; older builds cannot be assumed to read format 8. No placement versions or dependencies change. Deliver one feature PR after explicit approval and verified acceptance; do not deploy or merge automatically. Reverting the feature removes movement without converting stored data. Keep OpenSpec unarchived until merge and a separate archive request.

## Scope review

The ablation pass keeps one pure module and the existing map view/test paths. It omits settings UI, a reusable scheduler framework, new fixture services and dungeon integration because no acceptance item needs them. No required outcome is deferred.


## Caller-authorized review repairs (2026-10-25)

The caller requested implementation of the first five grouped review recommendations after PR #246's feedback was assessed. This explicitly authorizes the visible marker/legend IDs, stronger contention and U-shaped shortest-path tests, deterministic browser clock handling, Pause/Resume control, direct disposer/hidden-art tests and corrected development full-reload cleanup. It does not authorize unrelated review nits or general validation frameworks.

Pause is a view-local choice, initially false. The existing scheduler checks it; the control cancels the outstanding timeout, exposes its state, and resumes with a new full delay. It preserves the choice through regeneration, artwork, visibility and BFCache. No preference storage or new simulation state is needed. Ordinary unpaused behavior stays as approved. Hidden-time and artwork callbacks do not change the choice.

Use the full affected map browser file after final runtime changes, then run both source-interception cases explicitly in dev mode (placement failure and direct disposer), plus root/prefix route checks. Preserve prior failed runs and add new source-bound receipts and reviewed screenshots separately. No full project regression is selected for these bounded map/view/test changes.

## Dungeon integration (caller clarification)

The `/map` prototype is independent, stationary and encounter-free. The earlier timer and pause design above is superseded by this caller clarification. In `/dungeon`, an accepted player step either enters the touched uncleared enemy battle or advances each live enemy once using the existing movement policy and a separate saved RNG. Waiting and rejected commands never advance movement. Position, enemy movement and entry are saved atomically in one revision. Encounters can be cleared in any order; descent requires all three. Continue validates format-7 saves and upgrades them on progress. Shared save and route changes require full regression under the verification policy.
