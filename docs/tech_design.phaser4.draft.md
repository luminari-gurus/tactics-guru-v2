# Tactics Guru — Browser-First Tactical Game Technical Design

**Document status:** proposed `docs/tech_design.md` for the new project, revisiting the original Godot TDD. Tracked since 2026-10-06 on the `docs` branch next to the restart plan; not on `main`, and not applied to the legacy repository. Core product decisions below are approved; the engineering details are proposals that the issue named beside each one settles. This document authorizes nothing by itself. Revised 2026-10-06 against the legacy source at the pinned SHA, the scaffold, the tracker, the open release PR and the installed packages — see *Revision notes*.
**New project repository (Brian's decision):** https://github.com/luminari-gurus/tactics-guru-v2 (public). It holds a minimal scaffold (`main` at `df693f0`), Epic #1 with child issues #2–#11, and the open release PR #12.[51][52][53] Earlier wording that the repository must not be initialized or scaffolded is superseded. Still in force: no completion claim precedes acceptance, and plans stay off `main` and out of implementation PRs. The tracker's issue texts go further and say design plans stay out of the repository until separately authorized, whereas this draft and the plan have been on a `docs` branch since 2026-10-06, at the request of the collaborator who commissioned that day's reviews. Reconcile that wording before the branch is merged, and do not base task branches on it.
**Reference baseline:** `luminari-gurus/tactics-guru` (private), `main` at `e9433f6b608ae6b2d95418615cce9cf17dadcf74`, inspected 2026-10-05 UTC and re-verified 2026-10-06. Local read-only mirror: `ORIGINAL/`. Legacy line numbers in this document refer to that SHA.
**Stack (pinned in the scaffold):** Phaser **4.2.1**, TypeScript 7.0.2, Vite 8.3.2, Playwright 1.63.0, Node ≥ 22.12.[37][38][51] Vitest is planned and not yet a dependency; the current release is 5.0.3.[76]
**Approved presentation/rules:** isometric board and basic tactical rules, including the baseline height/movement/d20 model. Tile footprint 64×32 logical units with an elevation step of 16, as in the legacy build; integer elevation; responsive HTML/CSS HUD.[60]
**Approved MVP:** one polished replayable tactical battle (coordinator question 1, option A). A short roguelike route is deferred, not a prerequisite.
**Companion document:** `docs/phaser4-restart-plan.md` ("the plan") holds the legacy audit, the tracker mapping, the evidence for the release constraints and the open-decision register D1–D11. This document states the design contracts. Where the two disagree, that is a defect to fix, not a choice. The tracker's issues are the authority for scope and acceptance.[52]
**Conventions:** *baseline* means legacy behaviour at the pinned SHA; *target* means what the new runtime implements; *proposal* means a design choice not yet made in code. D1–D11 refer to the plan's register; T1–T11 are design questions this revision raises (§12). Source numbers [1]–[77] are the plan's; [78] onward are new here.

## 0. Executive summary and historical context

Tactics Guru should be a compact browser game, not an engine/tooling project. Preserve the original design's valuable intent: meaningful positioning, readable combat, small squads, brisk turns, reproducible debugging, extensible content and rules separated from presentation.[1]

The old implementation has grown beyond its TDD: resource-backed content validation, a generated overworld, inventory/equipment UI, level gating, local save/resume, custom maps and advanced status/combat systems are present. Some old sections still call these future work or describe a stub content database.[2][8][13] This design deliberately reduces restart scope rather than promising that all existing behavior survives.

Godot Resources, Nodes, TileMapLayer assumptions, autoloads, GDScript, `.tscn` tests and Web export are retired **in the new runtime** at `luminari-gurus/tactics-guru-v2`. The original `luminari-gurus/tactics-guru` repository/history and running Godot build remain untouched. Selected assets, content facts, algorithms and behavioral tests are references, not a line-for-line source port. Implementation is tracked by Epic #1; this design is input to its issues and does not authorize a production cutover.[52]

The restart was motivated by deployed load time and mobile usability (§1). Three parts of this design answer that directly: a critical path of script, board tiles and unit sprites only (§7.3); assets that go through the build's hashed asset graph and stay inside the release limits (§9); and a canvas whose resolution is bounded on purpose (§5.5). None of these is a measured result yet. Budgets come from issue #2 (D2).

## 1. Product goals and scope

### Approved product requirements

Brian confirmed **a lean playable loop first, selectively bringing back proven features later**; first release supports **mobile and desktop browsers, touch and mouse**, not full Godot parity. His coordinator answers resolve the scope as follows:

- **Loop:** A — one replayable tactical battle; no route or exploration requirement initially.
- **Restart motivation:** deployed load time/mobile issues, rather than a request to abandon basic gameplay rules.
- **Presentation/rules:** retain isometric presentation and basic rules.
- **Required QA matrix:** iPhone Safari, iPhone Chrome, Android Chrome and desktop; both portrait and landscape. Actual device models, OS/browser versions and desktop browser selection remain to be agreed (D1); Telegram/in-app webviews are optional.
- **Compatibility:** fresh new runtime; no importer for Godot saves, runs, records or custom maps. Preserve old data untouched.
- **Repository:** `luminari-gurus/tactics-guru-v2`, initialized with a scaffold and tracked by Epic #1. Merging these plans into `main` remains on hold.

### Proposed goals

- Small, readable tactics battles playable by mouse, keyboard and touch.
- Fighter, Ranger and Mage have visibly different tactical roles.
- Height and terrain matter without full 3D physics or raycasting.
- Players preview movement, target legality and resolution before committing.
- A seed plus commands can reproduce a bug without relying on frame timing.
- Adding a content definition should not require a new UI branch.
- First interaction arrives quickly on a phone connection: only script, board tiles and unit sprites are on the critical path, and everything else loads after it.

### Combat MVP

One authored forest board: Forest Ruins, 12×12, heights 0 to 2 (§4.3). Three fixed heroes against the legacy trio of two Goblin Grunts and one Goblin Archer; the encounter choice is D4. Cardinal weighted movement, occupancy and Jump; initiative; one move and one action per turn, in either order; Basic Attack and one signature per hero; greedy legal AI; win/loss, restart, turn queue, log, inspection and touch-safe preview/confirm/cancel. A small set of existing art and SFX, mute, and a nonblocking loading/error screen. No save or resume in the first tranche: issue #11 lists it as a follow-up.[52]

Signatures: Guarded Strike, High Shot and Magic Missile provide defensive melee, elevation-sensitive ranged attacks and reliable rolled force damage. Their semantics are in §6.2. Brian revised Guarded Strike to a fixed Combat Expertise-inspired −2/+2 tradeoff (#49) and replaced Ember Burst with 3.5E Magic Missile on 2026-10-09. The abilities current main unlocks with levels are later content, not MVP acceptance: Second Wind, Mark Target and Arc Bolt at level 2; Taunt, Pinning Shot and Frost Snare at level 3.[3][12]

### Explicitly outside combat MVP

Procedural overworld/combat generation, multi-floor campaigns, shops, recruitment, XP/meta progression, item economy UI, broad biome rosters, editor/custom map exchange, advanced stacks/typed resistances/immunities/auras/charge/forced movement/summons/tempo, camera rotation, multiplayer/accounts/global leaderboard and analytics collection.

Also outside, although the legacy battle screen has them: undoing a move before acting (`BattleController.gd:352-370,398-432`; issue #5 excludes it unless separately scoped), the tactical threat overlay, compound move-and-attack planning, combat pace and skip-animation settings, class tutorial callouts and combat log export.[17][56]

A later separately approved short-run slice may add three encounters, party HP carryover, one reward choice and a few generic items. Exploration is not part of the approved first loop; do not silently expand this MVP to the current procedural system.

### Definition of done

Start/play/win/lose/restart without developer tools; movement/target previews match actual resolution; no illegal AI actions or soft locks; three signatures have distinct useful situations; every reachable cell and every legal target can be selected (D8); fully played repeated battles, not only forced-outcome fixtures; no console errors during a full battle; agreed mobile devices and orientations pass; measured loading and frame budgets are met (D2); production cutover is separately approved. Numeric budgets are set after measurement, not asserted here.

## 2. Architecture and dependency boundaries

```text
Validated content catalog + seed
                  ↓
      engine-independent domain core
  grid / targeting / turns / combat / AI / rng
                  ↓
  Result: new state + ordered domain events
                  ↓
  app BattleSession: current state, UI mode, playback queue
            ↙                ↘
 Phaser board/input/audio   HTML/CSS HUD/dialogs
                  ⋮
     storage adapter (deferred, §8)
```

Domain code imports no Phaser, DOM, browser globals or animation helpers. The session validates/dispatches player or AI commands, exposes a pure preview and coordinates presentation. Phaser Scenes load/render assets and translate pointers/camera positions into commands; they never determine legality, HP or victory. DOM controls consume selectors and send intentions through the same session. Storage only receives plain domain data.

This keeps the original simulation/presentation boundary while replacing engine-specific structure.[1] Avoid ECS, generic event buses, state-management frameworks and dependency injection containers until a concrete need exists.

### 2.1 Rules live in the domain; the session only sequences

In the legacy build part of the rule lifecycle is not in the pure services. Action economy, end of turn, outcome evaluation, enemy-turn sequencing and RNG continuation sit in `BattleController.gd`, a 2,393-line scene node that awaits animations; it even skips the win/loss check while an animation is running (`:1904-1907`).[56] The target removes that coupling:

- Every command resolves completely and at once in the domain. The returned state is final before any animation starts.
- The session plays the returned events back as animation and sound. It keeps two things apart: the committed state, which is always current, and a presented view, which advances one event at a time and equals the committed state when the queue drains. The board and the HUD render the presented view, so HP, defeat and the outcome appear when their event plays, not when `dispatch` returns. Skipping or shortening playback can never change an outcome.
- `BattleSession` imports neither Phaser nor the DOM. It drives a presenter interface (show a view, play one event and resolve when done, set highlights) and receives intents (cell picked, ability chosen, confirm, cancel, end turn, restart). With a presenter that resolves at once, the mode machine and the enemy loop run under Vitest, and the renderer in #6 can be built against the same interface before #10 wires it.
- Enemy turns are a loop in the session: ask the domain for the active enemy's commands, dispatch them, play the events, repeat until a hero is active or the battle is over. The domain has no timers and no waits. Bound the loop by the number of units, as the legacy controller does (`:1423-1424`); running past the bound is a defect.
- Each battle carries a generation token. Every asynchronous continuation (tween completion, timer, loader callback) checks it and drops its work if the battle was restarted meanwhile. The legacy controller needs the same guard (`battle_generation`, `:49,99`).[56]

Failures are handled by class, not ad hoc:

| Failure | Behaviour |
|---|---|
| Exception while presenting (tween, sound, drawing) | contained: record it, drop the queue, show the committed state, continue |
| A command the current mode does not allow | ignored by the session and recorded; the domain would reject it too |
| An AI command the domain rejects | End turn for that enemy, recorded and counted; tests assert the count is zero |
| Enemy loop passes its bound, or the domain throws | `fatal` with the diagnostics panel (§10.4) |

Containment needs a mechanism. Phaser's frame callback requests the next frame only after the step returns, so an exception thrown inside the step — from a tween, timer, input or update callback — stops the loop for good while it still reports itself as running (`src/dom/RequestAnimationFrame.js`).[93] Run every such callback through one guard that catches and records, and have the global error handler restart a stopped loop (`loop.sleep()` then `loop.wake()` revives it) or go to `fatal`.

### 2.2 Session interaction modes

The session owns one explicit UI mode. Input handlers switch on it; nothing infers the mode from which sprites are visible.

| Mode | Board input | HUD | Leaves on |
|---|---|---|---|
| `boot` | none | loading or error screen | critical assets ready, or failure |
| `ready` (T10) | pan, zoom, inspect | Begin button | Begin |
| `player.idle` | select, inspect, pan, zoom | actions for the active hero; settings | cell tap, ability chosen, End turn |
| `player.movePreview` | another cell replaces the preview | Confirm, Cancel; path and cost | confirm, cancel |
| `player.targeting` | legal targets highlighted | Cancel; ability summary | target tap, cancel |
| `player.targetPreview` | another target replaces the preview | Confirm, Cancel; hit chance and damage, or save DC per target | confirm, cancel |
| `playback` | pan, zoom, inspect | controls disabled | the hero's own events have played |
| `enemy` | pan, zoom, inspect | controls disabled; who is acting | a hero's turn, or outcome; covers the enemies' playback too |
| `outcome` | none (modal) | result, Restart | Restart |
| `fatal` | none | diagnostics panel, Reload | reload |

The board appears as soon as the critical assets are in, already pannable, with a Begin button over it; no turn starts before Begin (T10). A separate title screen would put a tap between loading and the board, which works against the reason for the restart. Starting with no gate at all is worse: with the §6.4 generator an enemy holds the first turn in 51% of seeds, and two or more enemies act before any hero in 20%, so the battle would open with enemies moving, silently, before the player has touched anything. Begin is also the tap that unlocks audio (§7.4). "Usable controls" is measured at the moment pan and zoom are accepted, which does not depend on the seed.

Camera pan/zoom, mute and inspection stay available in the ready, player, playback and enemy modes. Settings, with mute and Restart, open from the player modes; Restart there gives the player a way out of a battle that has no turn limit, and gives tests a restart that does not need a finished battle. A command dispatched in a mode that does not allow it is a defect, not something the domain should have to reject; the domain rejects it anyway (§4.2).

### 2.3 Boundary enforcement

Enforce the import rule mechanically, not by review:

- Type-check `src/domain`, `src/content`, the session (`src/app/BattleSession.ts`) and the pure view code (`iso.ts`, `picking.ts` and `gestures.ts` under `src/phaser/`) with a second `tsconfig.domain.json` whose `lib` is `["ES2022"]` and whose `types` list is empty. Checked on 2026-10-06 with TypeScript 7.0.2: under those settings `document`, `window`, `console`, `setTimeout`, `performance` and `process` fail to compile.
- `Math.random()` and `Date.now()` still compile, because they belong to the ECMAScript library. Cover them at run time: unit tests stub both to throw, and a source check rejects the two names under `src/domain` and `src/content`.
- Pure view math must not import `phaser` at run time; type-only imports are fine. Importing `phaser` under plain Node fails with `ReferenceError: window is not defined`, so a module that pulls it in cannot run in the unit-test environment.
- The scaffold's single `tsconfig.json` gives every file DOM and Node types, so it cannot enforce this by itself; `npm run typecheck` runs both projects (§10.1).[51] The second project arrives with the first pure module, which by the tracker's order is the projection and picking math in #2, not with #4.

### 2.4 Determinism rules

- All rule and AI arithmetic uses safe integers. No floating point, no time, no locale.
- Order-sensitive collections are arrays sorted by comparators that are total orders. Do not depend on object key order or on sort stability. JavaScript objects iterate integer-like keys in numeric order, which differs from the insertion order the legacy dictionaries rely on.
- Compare IDs with `<` and `>`, never `localeCompare`: locale-aware comparison can differ between devices.
- Position has one source of truth: a unit's cell. Occupancy is derived from the cells of the living units, not stored on tiles, so tile and unit records cannot drift apart as they can in the legacy state (`tile.occupant_id` beside `unit.cell`).[69]

## 3. Proposed module/file layout

```text
package.json                 # exists: one npm project, exact pins, tracked lockfile
index.html                   # exists; gains static loading and failure markup (§7.3)
tsconfig.json                # exists: app and tests, DOM and Node types
playwright.config.ts         # exists; testDir moves to tests/e2e (§10.1)
vite.config.ts               # to add: asset, chunk and server settings (§9.2)
tsconfig.domain.json         # to add: ES2022 lib only, no ambient types (§2.3)
vitest.config.ts             # to add with the first unit test: tests/unit only, node environment
src/
  main.ts                    # exists; becomes preflight, game creation, HUD mount
  style.css                  # exists
  domain/                    # pure
    types.ts constants.ts rng.ts
    grid.ts targeting.ts turns.ts combat.ts abilities.ts ai.ts battle.ts
  content/                   # pure
    types.ts validate.ts catalog.ts
  app/
    BattleSession.ts selectors.ts diagnostics.ts
  phaser/
    BootScene.ts BattleScene.ts BoardRenderer.ts input.ts audio.ts
    FitScene.ts              # the #2 diagnostic scene
    iso.ts picking.ts gestures.ts   # pure, no runtime import from 'phaser'
  ui/
    hud.ts dialogs.ts styles.css
  assets/                    # imported through Vite, never placed under public/
    manifest.ts              # typed rows: key, file, origin, size, anchor
    tiles/ units/ portraits/ audio/
  storage/                   # deferred (§8)
content/
  maps/forest-ruins.json
  terrain.json classes.json units.json abilities.json statuses.json
  ai-profiles.json encounters.json
tests/
  unit/                      # Vitest
  e2e/                       # Playwright; tests/boot.spec.ts moves here; engine-fit.spec.ts with #2
  fixtures/                  # seeds, command logs, picking boards
scripts/check-dist.mjs       # to add: release limits checked at build time (§9.2)
deploy/  .github/workflows/  # release mechanism from PR #12; not designed here
```

Paths not marked "exists" are proposals for `luminari-gurus/tactics-guru-v2`. They start from the paths the tracker's issues suggest and add what those leave out: selectors, diagnostics, the boot scene, the asset folder, the other content files and fixtures.[52] Notes:

- Nothing the game loads may live under `public/`. Vite copies that folder verbatim, without hashing and with its subfolders; the release mechanism rejects nested folders and would cache an unhashed file under `/assets/` for a year (§9).
- There is no `manifest.json` at the output root: the publisher reserves that name and the server answers 404 for it.[53] The asset manifest is a TypeScript module.
- Source subfolders under `src/assets/` are fine. Checked: Vite emits imported files flat, as `dist/assets/<name>-<hash>.<ext>`.
- No `docs/` or `openspec/` tree on `main` until separately authorized. The new repository tracks requirements as issues and carries no OpenSpec tree.[52]
- `run.ts`, `inventory.ts`, `equipment.ts` and `items.json` appear only if the optional short-run slice is approved.

Use named constants for dice bounds, critical multiplier, elevation step, tile dimensions, UI hit targets and rule limits. Split a service only when its responsibility warrants it; do not rebuild every Godot class in TypeScript.

## 4. Data contracts and content validation

### 4.1 Immutable definitions

Terrain (ID, positive move cost, walkable, LOS block, asset key); Class (ID, role, bounded base stats, ability IDs); Unit (ID, class ID, side, AI profile, sprite/portrait keys); Ability (ID, discriminated effect/target, range, presentation keys); Status (ID, modifier, expiry hook); Map (ID, size, tile coordinates/height/terrain); Encounter (map ID, placements); AI profile (explicit integer weights).

Presentation data belongs to the definition. The legacy view keeps display names, hotkeys, icon types and blurbs in its own dictionaries, so adding an ability means editing `BattleView.gd` as well as the content (`:138-189,210-227`; the legacy contributor guide lists that step).[17][77] In the target, an ability's name, blurb, icon kind, hotkey slot and sound cues are fields of the ability definition, and the HUD renders whatever the catalog holds.

The implemented slice uses three discriminated ability kinds in `src/content/types.ts`:

```ts
type Ability =
  | (AttackFields & { kind: 'attack' })           // Basic Attack, Shortbow, High Shot
  | (AttackFields & { kind: 'guardedAttack'; attackPenalty: 2; armorClassBonus: 2 })
  | { kind: 'magicMissile'; id: AbilityId; owners: readonly UnitId[];
      casterLevel: number; rangeMin: number; rangeMax: number };
```

`AttackFields` supplies identity, owners, range, base damage and uphill damage. Magic Missile's
1d4+1 damage and five-missile cap are named rule constants, not freely editable effect fields.
Presentation metadata remains separate from these pure rule profiles.

An unknown `kind` or an unknown field fails validation. Do not add a generic effect list until a second ability needs one.

### 4.2 Runtime state, commands and results

```ts
type Cell = { x: number; y: number };
interface BattleState {
  versions: { rules: number; content: number; rng: number };
  seed: number;                                   // unsigned 32-bit
  rng: readonly [number, number, number, number]; // §6.4
  mapId: string;
  units: readonly UnitState[];                    // ascending id
  initiative: readonly number[];                  // unit ids, fixed for the battle
  activeIndex: number;
  round: number;                                  // starts at 1
  outcome: 'ongoing' | 'playerWin' | 'playerLoss';
  commandCount: number;
}
interface UnitState {
  id: number; defId: string; side: 'player' | 'enemy';
  cell: Cell; hp: number;
  hasMoved: boolean; hasActed: boolean;           // defeated means hp === 0
  statuses: readonly string[];                    // status ids
}
type Command =
  | { type: 'move'; unitId: number; to: Cell }
  | { type: 'useAbility'; unitId: number; abilityId: string; target: { unitId: number } | { cell: Cell } }
  | { type: 'endTurn'; unitId: number };
type Result =
  | { ok: true; state: BattleState; events: readonly BattleEvent[] }
  | { ok: false; reason: RejectionReason };

// entry points, signatures abbreviated
createBattle(catalog, encounterId, seed): { state: BattleState; events: readonly BattleEvent[] }
preview(state, query, catalog): Preview           // pure, no RNG
dispatch(state, command, catalog): Result         // returns a new state
chooseEnemyCommands(state, catalog): Command[]    // pure, no RNG (§6.5)
```

- **State.** JSON-compatible, integers only, no class instances. Tiles are not in the state: terrain and height never change in the slice, so they are read from the catalog. Runtime HP is never stored in immutable definitions. A unit is defeated exactly when its HP is 0; there is no separate flag to fall out of step. Defeated units stay in `units` and in `initiative`, are skipped, and lose their statuses. Unit IDs are the integers given in the encounter's placements.
- **Versions.** `rules` and `rng` are integers raised by hand when resolution, the AI or the generator change. `content` is not hand-kept: it is a hash of the validated catalog without its art (asset records and the references to them), so a changed stat cannot go unnoticed and a sprite or provenance edit does not invalidate saves or replays. Diagnostics print all three, and a replay refuses a log recorded under different ones.
- **Commands** carry intent only: actor, target unit or cell. No computed damage, no caller-supplied path. The domain recomputes legality, cost and path. `endTurn` is the legacy Wait. Restart is not a command: the session calls `createBattle` again with a new seed (D7, resolved 2026-10-09).
- **Mutation isolation.** `dispatch` never modifies its arguments. Unit tests deep-freeze the input state and the catalog.
- **State validation.** A validator for `BattleState` rejects unsafe or non-integer numbers, unknown IDs and broken invariants (two living units on one cell, HP out of range, an active index outside the order).[52] Tests run it after every command; a later replay or save loads through it.
- **Results.** A rejection carries a reason code and nothing else changes: no RNG draw, no action or movement spent, no partial state. This reuses the existing advanced tests' atomicity principle without retaining their effects.[33] Reason codes are a closed union, checked in a fixed order so that the first failure is the one reported, by `dispatch` and by preview alike:

  | Order | Applies to | Code |
  |---|---|---|
  | 1 | all | `malformedCommand` (non-integer or missing fields) |
  | 2 | all | `battleOver` |
  | 3 | all | `unknownUnit`, then `unitDefeated`, then `notActiveUnit` |
  | 4 | move | `alreadyMoved`, `outOfBounds`, `sameCell`, `notWalkable`, `occupied`, `unreachable` |
  | 4 | ability | `alreadyActed`, `unknownAbility`, `abilityNotOwned`, `wrongTargetKind`, `missingTarget` or `outOfBounds`, `targetDefeated`, `sameSide`, `outOfRange`, `blockedLos` |

  The target-related order follows the legacy targeting service, which returns those reasons as strings (`TargetingService.gd:13-52`); a rejected move there is only a bare `false` (`BattleController.gd:326-330`).[56][57]
- **Events** are ordered and typed. `createBattle` emits `initiativeRolled` for each unit in ID order (natural roll and total), then the first `turnStarted`. A move emits `moved` with the path. An ability emits `abilityUsed` first, even when it affects nobody; then `attackRolled` (natural roll, bonus, total, target AC, miss/hit/critical), or one `saveRolled` per target (natural roll, modifier, total, DC, saved), each followed at once by its `damaged` (the damage dealt, not capped by remaining HP, and HP after) and `defeated`; then `statusApplied`; then `battleEnded` if the battle is over. `endTurn` emits `turnEnded`, then `turnStarted` for the next living unit, then `statusExpired` for anything that lapses at that start. Every event names the units involved by ID, and `turnStarted` carries the round. The log, the animations and the sound cues are all derived from this list, one command at a time.
- **Preview** answers four questions without RNG or mutation, from the same functions resolution uses: which cells a unit can reach and at what cost; the path and cost of one move; which creatures an ability may target; and what one use of an ability will do. For an attack that is bonus, target AC, the lowest natural roll that hits, the number of hitting faces out of 20, damage and critical damage; for Magic Missile, the missile count, target assignments and 2–5 damage range per missile. Attack percentages are faces × 5 and are always exact. The attack count is clamped by the natural-roll rules: never more than 19 hitting faces and never fewer than 1. An illegal query returns the reason code `dispatch` would give.
- **Enemy commands.** `chooseEnemyCommands` is called once, at the start of an enemy's turn. It returns an optional move, an optional ability use and a final `endTurn`. The session dispatches them in order and stops as soon as a result ends the battle. Called at any other time it returns an empty list, which the session treats as a defect.
- **Command log.** The session keeps the versions, the encounter ID, the seed and every accepted command, the enemies' included. That record reproduces the battle without re-running the AI and is the bug-report format (§10.4); it is bounded by battle length and is not part of the pure state.

### 4.3 Slice content

Legacy facts for the content files. They are pinned in the plan (§3.3, §3.4) with line references; the additions here are the unit IDs, the AI weights and the derived map facts. One caution: the enemy rows are the legacy trio, which current main no longer spawns on this map. It now draws a seeded three-unit roster that always includes a Goblin Shaman (`ForestRuinsMvpBuilder.gd:1231-1246`). Using the trio is the recommendation under D4, not a conversion of the current encounter.[3]

**Map: Forest Ruins.** 12×12, 144 cells, x and y from 0 to 11; heights 0 on 120 cells, 1 on 15, 2 on 9.[58]

| Feature | Cells |
|---|---|
| Stone platform, height 1 | (8..10, 1..3) |
| Ledge, height 1 (path on row 8, grass below) | (2..3, 8..10) |
| Ruin block, stone, height 2 | (4..6, 3..5) |
| Trees (block movement and LOS), all at height 0 | (1,3); (0..1, 4..5); (9,7), (10,7); (9,8), (10,8) |
| Cliff (blocks movement and LOS) | (11,4), (11,5), (10,6), (11,6) |
| Water (cost 3) | (6,8), (7,8), (8,8), (7,9) |

Derived on 2026-10-06 from the resource: 131 cells are walkable; 122 can be reached with Jump 1; the nine that cannot are the ruin block, which no slice unit can climb. The ruin's stone does not block line of sight, and height never does, so units shoot across it.

**Terrain.** Grass, path and stone cost 1. Water costs 3. Cliff and the three tree terrains are unwalkable and block line of sight.

**Units and placements.** IDs matter: initiative is rolled in ID order and ties fall back to the lower ID.[3][6]

| ID | Unit | Cell | HP | Move | Jump | Acc | AC | Power | Dex | Will | Abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Fighter | (1,8) | 18 | 4 | 1 | 4 | 14 | 3 | 0 | 1 | Basic Attack, Guarded Strike |
| 2 | Ranger | (2,8), on the ledge | 12 | 4 | 1 | 5 | 12 | 2 | 2 | 0 | Basic Attack, High Shot |
| 3 | Mage | (1,9) | 11 | 4 | 1 | 3 | 11 | 4 | 1 | 2 | Basic Attack, Magic Missile |
| 4 | Goblin Grunt | (8,4) | 9 | 4 | 1 | 4 | 12 | 2 | 1 | 0 | Basic Attack |
| 5 | Goblin Archer | (9,2), on the platform | 8 | 4 | 1 | 4 | 11 | 2 | 2 | 0 | Shortbow Shot |
| 6 | Goblin Grunt | (8,5) | 9 | 4 | 1 | 4 | 12 | 2 | 1 | 0 | Basic Attack |

**AI profiles.** Effective values, with the definition's defaults filled in where a resource omits them.[87] Take them from the resource files: the builder's code fallback for the grunt sets only the range, which would leave the definition's defaults of 10, 15 and 2 for damage, can-attack and safety (`ForestRuinsMvpBuilder.gd:2940-2943`).[3]

| Weight | Goblin Grunt | Goblin Archer |
|---|---|---|
| Expected damage | 4 | 10 |
| Can attack | 10 | 15 |
| Target's missing HP | 6 | 6 |
| High ground | 4 | 8 |
| Safety (no adjacent hero) | 1 | 4 |
| Distance to nearest hero | 1 | 1 |
| Overextension (per adjacent hero) | 3 | 8 |
| Preferred range | 1 to 1 | 2 to 4 |

The legacy profile also has a `prefer_high_ground` flag. Nothing reads it; high ground is expressed only through the weight. Do not carry the flag over.

### 4.4 Validation

Checks, at build time and again at load: unique IDs; every reference resolves; no NaN, infinity or fractional numbers; bounded map dimensions and each cell present exactly once; heights within the supported range; spawns in bounds, walkable and distinct; positive integer move cost; `1 ≤ rangeMin ≤ rangeMax`; bounded radius; known effect kinds only; known asset keys; an AI profile for every enemy; at least one unit on each side; no unknown fields. Unknown content must fail with a useful path and message, not create a partially working battle. Existing content validation in the legacy build is a real implementation, not the stub described in the old TDD.[2]

- **Build time.** `validate:content` runs the real catalog through the validator as a unit test, so it needs no extra tooling and is gated by CI (§10.1).
- **Load time.** The same validator runs on the bundled catalog before the first battle. A failure leads to the `fatal` screen, never to a default value.[52] In a shipped build this cannot fire, because the bundled catalog already passed at build time. So boot takes the catalog as a parameter: unit tests pass malformed catalogs and assert the controlled error, and the browser suite reaches the same screen through a missing asset.
- **Asset keys.** The validator cannot import the asset manifest: the manifest imports image and sound files, which do not type-check under the domain-only settings (checked: `TS2307`). Pass the set of known keys in as plain data, and let one unit test assert that the set equals the manifest's keys.
- **Conversion.** A one-off done outside the project; no `.tres` parser ships in it, which issue #3 rules out.[52] The map resource omits default values: the (0,0) tile has no `cell` line, height-0 tiles have no `height` line and the 12×12 size is itself a default. A converter that reads only what is written misplaces or drops them; check the result against the counts above.[58] Heroes, spawns, Guarded Strike, High Shot and the archer's class are defined in legacy code, not in resources (plan §3.3).

### 4.5 Optional inventory/equipment contract

Use `ConsumableDef | EquipmentDef`, typed categories, stack policy, usable contexts/target rules, slot layouts and generic whitelisted stat/ability effects. Owned stacks/equipment instances are separate from catalog definitions. Equip validates ownership, slot and category; unequip returns the prior item; invalid use never consumes; successful effects compose on fresh battle stats without contaminating base stats. Generate UI from catalog entries. Existing tests demonstrate battle-local equipment and composition, but current equip code does not itself enforce owned inventory.[8][10][26] None of this is in the first tranche.

## 5. Coordinates, rendering and input

### 5.1 Projection and anchors

The logical square grid is independent of the screen projection. World units are the legacy's logical pixels.[60][61]

| Quantity | Value | Baseline source |
|---|---|---|
| Tile width, tile height, elevation step | 64, 32, 16 | `GameConfig.gd:6-8` |
| `project(x, y, h)` | `((x − y)·32, (x + y)·16 − h·16)` | `IsoMath.gd:4-8` |
| What `project` returns | the top corner of the cell's logical diamond; the flat inverse floors, so the diamond runs from that corner 32 units down | `IsoMath.gd:11-20` |
| Tile image | drawn 78×107 with its top-left corner at `project − (39, 45)` | `BattleView.gd:74-75,2832-2841` |
| Top-face centre of the drawn tile | `project + (0, 24)`; the visible top face is that point ± (32, 16) | `BattleView.gd:76,3351-3372` |
| Unit foot anchor | the top-face centre | `BattleView.gd:3506-3507` |
| Unit sprite | 64×80, bottom centre on the anchor (in Phaser: origin (0.5, 1)) | `UnitView.gd:810`; `UnitView.tscn` |

Two consequences:

- The drawn top face sits 8 units below the logical diamond, whose centre is `project + (0, 16)`. The flat inverse therefore does not match what the player sees; the legacy picker tests the drawn polygons and uses the flat inverse only as a fallback. The target picks by the drawn top face only (§5.4).
- The top face of a height-2 cell (x, y) is drawn exactly where flat cell (x − 1, y − 1) is drawn (§5.3).

The flat board spans 768×384 world units for its top faces; the tile images extend a little beyond that.

### 5.2 Draw order and occlusion

**Baseline.** Tiles are painted in order of x + y, then height (`BattleView.gd:3025-3033`); cells with equal keys have no defined order. Units live in a layer above all tiles and are ordered among themselves by (x + y)·10 + height (`UnitView.gd:256`). So a unit is never hidden by terrain: one standing behind a tree or behind the ruin is painted over it. The one occlusion aid redraws the lower half of a tree tile at 72% opacity over a unit, and only for a tree tile directly in front of the unit that is higher than the unit's own tile (`BattleView.gd:2873-2930`).[17][62] Every tree on Forest Ruins is at height 0, so on this map that code never draws anything.

Build the board from ordinary Images and Graphics; do not assume an isometric Tilemap solves height. `Graphics.fillPoints` and `setDepth` exist, and neither supplies occlusion or picking.[47][48]

**Target (proposal; T1, decided with D8 in #2).** The tracker asks for "correct near/far occlusion" and for canopy occlusion.[52] That needs units and tiles in one depth order:

- Depth key: `(x + y)·1000 + rank·100 + x`, with rank 0 for tiles, 1 for highlights on a top face, 2 for units and 3 for unit markers. Within one diagonal every tile is drawn before any unit, and every object has its own key, so the order does not rest on sort stability (Phaser's display-list sort is stable in any case).[85]
- A unit moving between two cells uses the larger key of the two for the whole step, so the tile it is stepping onto never covers it.
- Because correct occlusion hides things, add a readability rule: a tile that covers the active unit, the selected unit or a highlighted cell is drawn translucent for as long as it does. "Covers" must be a fixed relation computed once per map from the tile art, with a threshold: tile T covers cell C when T is drawn later and hides at least a set share of C's top face. Without a threshold the rule fades most of the board: counting any overlap at all, the six units' starting move ranges would turn 26 to 44 tiles translucent, where a 50% threshold leaves 0 to 3. The pointer cannot be part of the rule, because it resolves through the picker to the tile in front.
- Effects sit in a layer above the board. Keep text, floating numbers included, in the DOM: at a resolution scale below the device's ratio (§5.5) canvas text is drawn soft.

Fixtures for this map, computed on 2026-10-06 from the tile art under this depth order: ten walkable cells have at least 80% of their top face hidden. Five are behind the ruin (§5.3); five are behind trees: (0,2), (0,3), (8,6), (8,7) and (9,6). Between 12 and 16 cells are at least half hidden, depending on whether the slope and corner images are drawn. The cell a tree hides most is the one straight up the screen from it, at (x − 1, y − 1), not the two diagonal neighbours the legacy redraw looks at.

If the proof-of-fit shows the translucency rule is not readable on a phone, the fallback is the baseline model (units above terrain). That model draws no occlusion at all on this map, so choosing it means amending the occlusion criteria of #2 and #6, not quietly meeting them. Record which model was chosen; the picker and the tests depend on it.

Raised cells need sides. The legacy view swaps in slope and corner images for raised cells that have a lower neighbour (`BattleView.gd:2972-3001`); rules still treat the edge as a step. §7.1 names the images this map uses.

### 5.3 Covered cells (D8)

The ruin block at (4..6, 3..5) covers the tiles of walkable cells (3,2), (4,2), (5,2), (3,3) and (3,4): each lies exactly under the top face of the ruin cell at (x + 1, y + 1). A unit standing on one of them appears to stand on the ruin, which nothing in the slice can climb.

The legacy build copes with a picker that prefers occupied or highlighted cells (§5.4) and with grid rotation (`BattleView.gd:624-626`), which is deferred. The target must show, in #2 and before #6 builds on it, how a player selects, targets and inspects those five cells and the units on them. Candidates, not exclusive:

- the translucency rule of §5.2, so the covered tile and its highlight are visible through the ruin. On its own this does not say which cell a highlight belongs to: the ruin cell's top face and the covered cell are the same diamond on screen;
- the picker rule of §5.4, with a defined result when the ruin cell and the covered cell are both legal choices;
- a path that does not use the pointer at all: the HUD lists legal targets and lets the player step through them. This also serves keyboard play, so T7 has to be settled here with D8, in #2, even though the HUD itself is built in #10;
- a content change: make the five cells unwalkable, or reshape the ruin so that no walkable cell is fully hidden. It alters the legacy map, so it is a product decision, but it removes the problem instead of working around it.

### 5.4 Picking

Picking is a pure function from a world point, the board and the current highlights to a cell or nothing. It never decides legality.

**Baseline** (`BattleView.gd:3112-3169`): take every cell whose drawn top face contains the point; add any occupied or highlighted cell whose top-face centre is within 38 units; score each by distance to its centre minus 10 if occupied and minus 8 if highlighted; the lowest score wins. Among cells whose face contains the point a tie goes to the one drawn later, that is, the front-most; an added cell wins a tie against those. If no top face contains the point, the best score among centres within 38 units wins, and failing that the cell from the flat inverse. Only tiles are picked; a unit is selected through its tile.[17]

**Target (proposal for #6):**

1. Candidates: cells whose top face contains the point (`|dx|/32 + |dy|/16 ≤ 1` from the top-face centre), plus legal or occupied cells within a snap radius.
2. The snap radius, the two bonuses and the tap threshold are defined in CSS pixels and converted to world units (§5.5), so forgiveness is constant on screen. A tap is picked at its release position, as in the baseline. The legacy numbers are in Godot viewport units; use them as ratios of the 64-unit tile, not as pixel values (plan §4.2).
3. Score as in the baseline. Break ties by larger x + y, then larger height, then smaller x, so the order is total.
4. With the baseline scoring the ruin cell in front wins every tie. A covered cell is picked only when its bonus is strictly larger: it holds a unit, or it is highlighted and the ruin cell is not. When both are highlighted and empty (an Ember Burst centre can be either) the covered cell cannot be picked at all; D8 must say which wins and how the player reaches the other.
5. Unit bodies (T4). A sprite is 80 units tall, so a tap on a unit's body lands on tiles further up the screen, not on the unit's own tile. With the baseline numbers, a tap 30 units above the feet of a highlighted enemy scores 12 for the enemy's cell (30 − 10 − 8) and 2 for the empty cell behind it, whose centre is 2 units away, so the empty cell is picked. Test in #2 whether units need their sprite bounds as pick targets, front-most first, in modes where a unit is a valid choice.

Unit tests cover: every cell on the real map round-trips through project and pick, except the five covered cells, which must resolve as D8 decides (to the ruin cell in front under the baseline rule); points on shared edges; the snap radius at several zoom levels. One behaviour to confirm rather than assume: picking by top face means a tap on a tree's canopy selects the cell behind the tree.

### 5.5 Camera, canvas size and device pixel ratio

- Fitting the 768-unit board to a 390-pixel-wide phone gives a zoom of about 0.51 and diamonds of about 32×16 CSS pixels, far below a 44-pixel target (plan §4.2). The default zoom per orientation, the zoom range and the snap radius are therefore outputs of #2. The legacy range is 0.75 to 3.0 with steps of 0.15 (`BattleView.gd:238-240`), in viewport units.
- Phaser's ScaleManager never reads `devicePixelRatio`. In `RESIZE` mode, which the scaffold uses, the canvas backing store equals the parent's size in CSS pixels: cheap to fill, but upscaled by the browser on a high-density screen.[44][51]
- For a sharper canvas with a bound (T2): scale mode `NONE`, game size = CSS size × r, `scale.zoom = 1/r`, and `scale.resize()` on every container resize, with r = min(devicePixelRatio, cap). `resize()` keeps the CSS size at game size × zoom.[44] Checked in headless Chromium at a device scale factor of 3 with a cap of 2: the backing store was 780×1688 for a 390×844 CSS canvas, pointer coordinates arrived in backing-store pixels, and a `ResizeObserver` calling `scale.resize()` followed a rotation to 844×390. The camera keeps its scroll position across a resize, not its centre, so re-centre it afterwards. Fill cost grows with r²: a 390×844 phone is 0.33 megapixels at r = 1, 1.3 at r = 2 and 3.0 at r = 3.
- Three coordinate spaces are in play, and one helper should own the conversions: CSS pixels (the DOM and the test hook), canvas pixels (CSS × r, what Phaser's pointers report) and world units (canvas pixels through the camera). A length in CSS pixels is `css · r / zoom` world units.
- #2 measures frame time for r = 1, 1.5 and 2 on the agreed phones and picks the cap. To make that possible on a phone, the diagnostic needs a runtime switch for r and an on-screen, copyable readout. It should also reserve a mock HUD frame in each orientation: the default zoom, the tile size and the snap radius all depend on the board area the HUD leaves, and the real HUD arrives only in #10. Keep the diagnostic reachable until #11 has measured against it.
- `EXPAND` with a fixed base size is the alternative to test if a fixed resolution is preferred. A bound matters on desktop too: in `RESIZE` mode a 2560×1440 window is a 3.7-megapixel canvas, and the ScaleManager's own notes warn about fill rate there.[44]
- Size the canvas from its container with a `ResizeObserver`: the HUD changes the board area, and mobile browser toolbars change the viewport without an orientation change. Apply the new size once per frame at most; a toolbar animation fires many callbacks, and each `resize()` reallocates the backing store. The scaffold already uses `100dvh` and `viewport-fit=cover`.[51]
- Camera: world units as above, through the camera's `getWorldPoint` and `setZoom`;[46] bounds are the board extents plus a margin; pinch zoom keeps the point under the fingers fixed; a control recentres on the active unit.
- Choose texture filtering on purpose. `roundPixels` now defaults to `false`.[39] The legacy view draws enemy sprites with nearest-neighbour filtering and hero sprites filtered, because the 64×80 art is enlarged by the camera (`UnitView.gd:266-268`); pick one rule.[62]
- Phaser renders every frame even when nothing moves. If device measurements show heat or battery cost during idle turns, limit the loop (`fps.limit`, `setFPSLimit`) or sleep it while the board is static.

### 5.6 Renderer creation and failure handling

- Request WebGL explicitly. `Phaser.AUTO` falls back to the deprecated Canvas renderer with no warning and nothing visible to the player; `Phaser.WEBGL` throws `Cannot create WebGL context, aborting.` during boot when WebGL is missing.[70] Check for WebGL before creating the game and wrap creation, so the player sees a DOM message instead of a blank page. Checked locally: explicit WebGL boots in the headless Chromium that the smoke tests use. Confirm it on the CI runner when #2 makes the switch; with `AUTO`, a runner without WebGL would have passed unnoticed.
- Context loss. The renderer emits `Phaser.Renderer.Events.LOSE_WEBGL` and `RESTORE_WEBGL`.[80] On loss, show an overlay and stop accepting board input; the domain state is unaffected. On restore, redraw from the state. If no restore arrives within a few seconds, offer a reload. Checked: forcing a loss and a restore through the `WEBGL_lose_context` extension raises both events and rendering continues, so this is testable in the browser suite; the real behaviour on phones is a #2 item.
- Tab hidden. Phaser pauses its loop when the page is hidden and resumes when it is visible again.[84] Sequence playback from tween and scene-clock completion, never from wall-clock timers, so a hidden tab cannot skip or repeat a step.
- Config defaults worth changing: `disableContextMenu: true` (right click and long press are cancel gestures); `input.activePointers: 2` for pinch (the default is 1).[79]

### 5.7 Input and gesture arbitration

Facts about the engine, verified in the installed package:

- Phaser listens to mouse and touch DOM events, not Pointer Events, and also listens on the window.[81]
- A press or release on a DOM element above the canvas reaches the scene as `pointerdownoutside` / `pointerupoutside`, not as `pointerdown` / `pointerup`.[45] Checked in a browser: clicking a HUD button over the canvas raised only the outside events.
- With `input.touch.capture` on (the default), Phaser calls `preventDefault` on canvas touch events.[79][81] That should also stop the browser from sending compatibility mouse events after a tap, which the legacy build had to filter with a 250 ms window (`BattleView.gd:243`); confirm on devices.

Rules (target):

| Gesture | Meaning |
|---|---|
| One pointer down and up, movement under the tap threshold (baseline: 14 units, `BattleView.gd:241`), shorter than the long-press time | tap: pick |
| One pointer, movement over the threshold | pan; it can never end as a tap |
| Second pointer down | pinch zoom; cancels any pending tap; when one finger lifts the other continues as a pan; no tap counts until all pointers are up |
| Press held past the long-press time without moving | cancel; optional, because the visible Cancel button is the required path (baseline: 0.45 s, `BattleView.gd:242`) |
| Release outside the canvas, or touch cancelled | ends the gesture; never a tap |
| Right click, Escape | cancel |
| Wheel | zoom at the pointer |

- Track the largest distance from the press point, not the net displacement. `Pointer.getDistance()` reports the distance between the press point and the current position, so a finger that wanders and returns would read as a tap.[81]
- Two-step commit everywhere (T5): the first tap on a legal cell or target shows the preview; a second tap on the same cell, or the Confirm button, commits. The legacy build does this on touch only (`BattleView.gd:963-998`); with a mouse, hover previews and one click commits (`CombatScene.tscn:462-463`).[91] One model for all pointers is simpler to test and matches the tracker's wording.[52] It costs mouse players one more click per action; if that proves irritating, hover-then-click for mice is the fallback.
- Hover may add a passive preview on desktop. Nothing may require hover.
- Scene handlers take presses and releases from `pointerdown` and `pointerup`, movement from `pointermove`, and treat the outside events as "gesture over". Keep the arbitration itself in a pure reducer (`gestures.ts`): pointer samples in, gesture intents out. It is then unit-tested like the projection math, which matters because a pinch can be synthesised in the browser suite only through Chromium's debugging protocol.
- Modal dialogs use the native `<dialog>` element opened with `showModal()`, which makes the rest of the page inert; the session also ignores board input while a modal is open. A `<dialog>` closes on Escape by default: allow that for settings, and cancel it for the outcome dialog, which must end in a choice.
- Page-level behaviour is set in CSS, not left to event handlers: `touch-action: none` on the board container; `overscroll-behavior: none` on the page; no text selection or long-press callout over the board and HUD; `touch-action: manipulation` on HUD buttons; safe-area insets through `env(safe-area-inset-*)`.
- Keyboard. The legacy map is a ready default: A attack, S signature, W wait, R restart on the outcome screen, arrows pan, plus/minus zoom, Escape cancel.[77] It cannot choose a cell or a target without a pointer. Whether keyboard-only play is required is T7; if it is, stepping through legal targets plus a cell cursor on the logical grid is the cheapest complete path, and it also reaches covered cells.

### 5.8 HUD

Plain DOM and CSS, rendered from selectors over the presented view (§2.1): turn order, active unit panel with portrait, action bar (Attack, signature, End turn, Confirm, Cancel), preview panel, inspection panel, combat log, outcome dialog, settings (mute, Restart), diagnostics. The legacy log panel shows 8 lines (`BattleView.gd:254`).

- Inspection shows, for a unit, its name, HP, stats and statuses, and for a cell, its terrain, height and move cost.
- A status is visible in two places: a chip on the unit's panel and a marker on the unit on the board.
- The two Goblin Grunts need distinct display names in the log and the turn order.
- Hit targets of at least 44 CSS pixels; safe-area insets; clear action names; visible keyboard focus; accessible HTML dialogs.
- Lay out from the space actually available, with container queries or measured sizes, not from a desktop-resolution threshold. Reflow across portrait, landscape and short windows; do not merely shrink all controls.
- The log is a polite live region. No state is shown by colour alone: the legacy overlays distinguish move, attack, valid and risky targets by colour (`BattleView.gd:36-70`), so add shape or pattern.[17] Animations respect the reduced-motion preference.
- Portraits are DOM images that load after the board (§7.3), not GPU textures.

### 5.9 Presentation playback

Animation consumes events after the simulation has committed. Input is locked while the queue plays; cleanup and restart cancel stale tweens and listeners; animation and sound failures cannot stall turn advancement or corrupt state.

- Starting durations from the legacy build: 0.12 s per tile moved, 0.24 s for a basic attack, 0.36 s for a signature; its fast setting multiplies them by 0.48 (`GameConfig.gd:33-35`, `BattleView.gd:261`).[17][60] Unit sprites are single frames, so animation means tweens and effects.
- Register scene listeners on scene-scoped emitters and remove them on shutdown. Register DOM listeners with one `AbortController` per battle and abort it on teardown. A test restarts the battle several times and asserts that one tap still produces one command.[52]
- Memoize reachable cells and legal targets per state, not per pointer move or per frame.
- Keep the action on screen. At a zoom where tiles are large enough to tap, a phone shows only part of the board, so an enemy can act out of view. Before an event plays, pan so the actor and its target are visible, unless the player is touching the board. The legacy build has only a manual recentre control (`BattleView.gd:1168,2081`).[17]

## 6. Rules, initiative, targeting and AI

The target keeps the baseline rules unless a decision in the plan's register changes them. Legacy evidence with line numbers is in the plan (§3.4); the legacy resolver test covers hit, miss, the natural-roll rules and defeat with injected rolls.[4][5][6][7][25][56][57]

### 6.1 Battle lifecycle

1. **Create.** Place the units of the encounter. Roll initiative once: one d20 per unit in ascending unit ID, plus Dex. Order by total, then Dex, then player side, then lower ID. The order is fixed for the battle. Current main can reorder at round boundaries through tempo modifiers; that is omitted here.[6][34]
2. **Start of a turn.** Skip defeated units. Statuses that expire at the owner's turn start expire now. Clear `hasMoved` and `hasActed`.
3. **During a turn.** At most one move and one action, in either order. A hero's turn ends only on End turn; acting does not end it (T6). An enemy's turn is the AI's single choice — an optional move, then an optional action, or nothing — followed by End turn.
4. **End turn.** Advance to the next living unit; the round counter increases when the order wraps.
5. **Outcome.** Checked after every action and at every end of turn: no living hero is a loss; otherwise no living enemy is a win. The check never waits for presentation.

### 6.2 Pinned rules

| Rule | Target behaviour |
|---|---|
| Movement graph | Four cardinal neighbours. A step needs a walkable destination that no other unit occupies (allies block too) and an uphill difference no greater than Jump. Downhill is unrestricted. |
| Movement cost | Destination terrain cost plus the uphill difference; budget is Move. No split movement. The destination must differ from the current cell. |
| Path choice | Lowest cost. Frontier ordered by cost, then y, then x; neighbours tried in the order +x, −x, +y, −y; a route replaces a known one only if strictly cheaper. Implement exactly this so equal-cost paths match the legacy scenarios. |
| Range | Manhattan distance within the ability's minimum and maximum. |
| Line of sight | Sample the cells between the two ends (§6.3). Only terrain flagged as blocking stops it; units and height never do. Every slice ability requires it. |
| Area shape | No area-targeting signature in this slice: Magic Missile designates creature targets. |
| Attack roll | d20 + Accuracy + height modifier + status modifiers against AC + status AC. A total equal to the AC hits. Natural 1 always misses; natural 20 always hits and is critical. One d20 per attack. |
| Height modifier | +2 to hit when the attacker's cell is higher, −2 when lower; not scaled by the difference. |
| Damage | Ordinary attacks deal max(1, ability base + Power + modifiers); a critical doubles the result. Magic Missile instead rolls 1d4+1 per missile, without those bonuses or criticals. A unit at 0 HP is defeated and leaves its cell at once. |
| Basic Attack | Range 1, base damage 2. |
| Guarded Strike | Approved fixed Combat Expertise-inspired mapping: range 1, base damage 2, −2 to attack rolls and +2 dodge AC until the start of the Fighter's next turn. Granted whenever the strike resolves, including on a miss. The −2 penalty applies once to the activating attack and any further attacks while Guarded. The +2 AC applies after resolution, hit or miss (D5), and repeated Guarded Strike effects do not stack with themselves. Basic Attack keeps normal accuracy, creating an offense/defense tradeoff (D6). See `docs/signature-abilities.md` for the 3.5E source and scope. |
| High Shot | Range 2 to 5, base damage 2; +2 damage when the Ranger's cell is higher than the target's, on top of the +2 to hit. |
| Magic Missile | Approved 3.5E replacement for Ember Burst: automatic hit, 1d4+1 force damage per missile, no attack roll, critical or saving throw. No Power or elevation damage bonus. One missile at caster levels 1–2, two at 3–4, three at 5–6, four at 7–8, five at 9+. Creature targets are designated before rolling; missiles can share a target or be divided. Tabletop range is 100 ft. + 10 ft./level and multiple targets must be within 15 ft. of each other. The starting Mage is caster level 1; Brian requested Ranger-like range, implemented as Manhattan range 1–5 tiles and 3-tile target spread; see `docs/signature-abilities.md` for source, line-of-effect requirements and RNG contract. |
| Shortbow Shot | Range 2 to 4, base damage 2, ordinary attack roll. |

**Combat Expertise source and slice mapping.** [Combat Expertise](https://www.d20srd.org/srd/feats.htm#combatExpertise) is a Fighter bonus feat with an equal melee attack-penalty/dodge-AC exchange. The game uses a fixed two-point exchange, preserving range 1, base damage 2, Guarded on a resolved hit or miss and expiry before the Fighter's next turn. The penalty applies once while Guarded. Intelligence 13, base attack bonus limits, a variable exchange selector and full attacks remain outside this slice; duration follows the game's existing turn mapping. Issue #49 supersedes the prior Fighting Defensively −4/+2 decision; Fighting Defensively itself remains a distinct tabletop rule, not the current ability source.

**Stacking scope.** “Does not stack” means repeated applications of Guarded Strike do not accumulate additional AC or attack penalties. It is not a general ban on combining dodge bonuses: the [SRD dodge-bonus rule](https://www.d20srd.org/srd/theBasics.htm#dodgeBonus) allows dodge bonuses from distinct sources to stack. Other sources and their interactions remain outside this slice; this mapping does not add a general stacking system.

Dropped from current main's attack path: adjacency accuracy modifiers, typed damage, status immunities, marks and taunts. Expected numbers in legacy tests that exercise them do not transfer. The legacy ability definition also carries per-ability accuracy and damage modifiers; they are zero for all five slice abilities, so the sketch in §4.1 omits them.

### 6.3 Deliberate differences from the baseline

1. **Lifecycle location.** In the domain, not in a scene controller (§2.1).
2. **Line of sight in integers.** The legacy code interpolates in floating point and rounds halves away from zero (`TargetingService.gd:91-107`).[57] The target samples, for step s from 1 to n − 1 with n = max(|dx|, |dy|), the cell `( ⌊(2(x₀n + dx·s) + n) / 2n⌋, ⌊(2(y₀n + dy·s) + n) / 2n⌋ )`, excluding the two ends; with n of 0 or 1 there is nothing between and the line is clear. Checked exhaustively on 2026-10-06: on a 12×12 board this gives the same cells as the legacy formula for all 20,592 ordered pairs, and the result is the same in both directions. On a 24×24 board the floating-point form already disagrees with exact arithmetic for 8 ordered pairs and becomes direction-dependent, so the integer form is also the safe one for larger maps. Exact half-way samples are common: they occur in 1,584 of the 5,612 ordered pairs at Manhattan distance 2 to 5 on this board. So the tie rule matters: halves round up.
3. **One expected-damage measure in the AI** (T8, §6.5).
4. **Occupancy derived, not stored** (§2.4).
5. **Preview and resolution share code.** One function evaluates a legal attack or Magic Missile cast; resolution adds the rolls. Magic Missile preview reports 2–5 damage per missile without RNG use. Legacy Ember Burst's inconsistent ally warning (`BattleView.gd:3090-3093,5724-5750`) is historical; its area/save path is not part of the replacement.[17]

### 6.4 Random numbers

Requirements (plan §6): the state is a small fixed set of unsigned 32-bit integers that serialize as JSON numbers; no BigInt and no floats; bounded rolls use rejection sampling; the app layer supplies the seed and the domain never creates entropy. Matching Godot's seeded streams is not promised: its generator state is a 64-bit value saved after each action.[13][63] Determinism is guaranteed only within one rules/content/RNG version.

**Proposal for #4 (T3): sfc32**, the 32-bit "small fast counter" generator from PractRand.[78]

- State `[a, b, c, counter]`. One step: `t = a + b + counter; counter += 1; a = b ^ (b >>> 9); b = c + (c << 3); c = rotl(c, 21) + t; return t`, all modulo 2³².
- Seeding from a 32-bit seed, as the reference does for a 64-bit seed whose high half is zero: state `[0, seed, 0, 1]`, then discard 12 outputs.
- d20: draw a value; if it is 4294967280 or more, draw again; otherwise `value mod 20 + 1`.
- Magic Missile d4: use the same bounded-roll helper with four sides, then add 1 damage. Four divides 2³² exactly, so each missile consumes one raw draw without a rejection-sampling redraw.
- The fourth word is a draw counter, so it doubles as the cursor: draws so far = `counter − 13`.
- The app layer makes the seed with `crypto.getRandomValues`, shows it in the log and diagnostics, and accepts an override for tests (§10.4).

Reference vectors, computed on 2026-10-06. A C transcription of the reference, a JavaScript and a Python implementation agree on every value; a TypeScript implementation under Vitest also reproduced the seed-1 row:

| Seed | State after seeding | First five outputs | First twelve d20 |
|---|---|---|---|
| 1 | 725930813, 1286218714, 3405868155, 13 | 2012149540, 1872316204, 1707632675, 1779833415, 2026416846 | 1, 5, 16, 16, 7, 17, 2, 7, 20, 1, 9, 15 |
| 12345 | 658686678, 3871441195, 854079202, 13 | 235160590, 2967261163, 116171463, 2882324903, 362604721 | 11, 4, 4, 4, 2, 7, 5, 12, 13, 1, 1, 18 |
| 4294967295 | 3163937632, 3115766180, 1501450466, 13 | 1984736529, 3747275468, 1287205723, 2021412065, 2215341480 | 10, 9, 4, 6, 1, 20, 2, 13, 19, 13, 20, 14 |

No row of the table reaches the redraw branch, so add two raw-state vectors: from state `[4294967279, 0, 0, 0]` the next d20 is 20 after one draw, and from `[4294967280, 0, 0, 0]` it is 2 after two draws, leaving `[0, 4294967152, 4263510016, 2]`.

Worked example with seed 1 and the §4.3 units: the six initiative rolls are 1, 5, 16, 16, 7, 17 for units 1 to 6; the totals are 1, 7, 17, 17, 9, 18; the order is 6, 3, 4, 5, 2, 1. The Mage and the first Grunt tie on total and on Dex, and the hero goes first. If #4 chooses another generator, replace this subsection and its vectors; nothing else depends on the choice.

### 6.5 Enemy AI

**Baseline** (`AIController.gd:47-160,348-485,622-656`).[7] For the active enemy, list every legal choice: each reachable cell as a move; each ability on each legal target from the current cell (attack) or from each reachable cell (move, then attack); and Wait. Score each one:

```text
score = damage·wDamage + (canAttack ? wCanAttack : 0) + missingHp·wLowHp
      + highGround·wHighGround + safe·wSafety
      − nearest·wDistance − adjacent·wOverextension − rangePenalty·wDistance
      (Wait: −100)
```

`missingHp` is the target's lost HP; `highGround` is 1 when the cell attacked from is higher than the target's; `safe` is 1 when no hero is adjacent to the destination; `nearest` is the distance from the destination to the nearest hero; `adjacent` counts adjacent heroes; `rangePenalty` is how far the distance to the target, or to the nearest hero when not attacking, lies outside the preferred range. The highest score wins. Ties: attack before move-then-attack before move or Wait; then lower target ID, where a choice without a target counts as −1; then destination by y, then x; then ability ID. No multi-turn planning. The chosen command is validated again before it is applied, and an invalid one becomes Wait.

**Target.**

- Same candidates, same terms, same tie order, in integers: multiply every term by 20 and use the damage expectation as a sum over the 20 die faces, so scores are exact. That is `score = damage20·wDamage + 20·(the other terms) − (Wait ? 2000 : 0)`, with `damage20` as in §6.6. Positional terms use the destination cell, or the current cell when the unit does not move.
- The enemy's choice becomes ordinary commands through `dispatch`. A rejection is a defect: it falls back to End turn and is counted (§2.1), so that the fallback cannot hide illegal AI output.
- The AI uses no randomness. Never compute candidates per rendered frame.
- **T8.** The baseline's `damage` term is the damage of a hit (base + Power), with no hit chance, unless a status changes the matchup; then it is the true expectation (`AIController.gd:407-425`). In the slice that switch flips exactly when the target is a Guarded Fighter. Recommended: always use the previewed expectation. Visible effect: with everything else equal, goblins prefer the hero they are most likely to hit (Mage, then Ranger, then Fighter) where the baseline falls through to the lowest unit ID (the Fighter). Decide in #9 and record it.

### 6.6 Check values

Computed from §6.2 and the §4.3 stat blocks; "expectation" is mean damage multiplied by 20. For ordinary attacks this is the sum of damage over the 20 attack faces; for Magic Missile it is five times the sum over the four damage faces, per missile.

| Situation | To hit | Hits on | Faces | Damage / critical | Expectation |
|---|---|---|---|---|---|
| Fighter, Basic Attack, on a Grunt | +4 vs AC 12 | 8+ | 13 (65%) | 5 / 10 | 70 |
| Fighter, Guarded Strike, on a Grunt | +2 vs AC 12 | 10+ | 11 (55%) | 5 / 10 | 60 |
| Ranger, High Shot on a Grunt, level ground | +5 vs AC 12 | 7+ | 14 (70%) | 4 / 8 | 60 |
| Ranger, High Shot on a Grunt, Ranger higher | +7 vs AC 12 | 5+ | 16 (80%) | 6 / 12 | 102 |
| Ranger, High Shot on the Archer, Ranger lower | +3 vs AC 11 | 8+ | 13 (65%) | 4 / 8 | 56 |
| Mage, Basic Attack on a Grunt | +3 vs AC 12 | 9+ | 12 (60%) | 6 / 12 | 78 |
| Grunt on the Fighter | +4 vs AC 14 | 10+ | 11 (55%) | 4 / 8 | 48 |
| Grunt on the Fighter, Guarded | +4 vs AC 16 | 12+ | 9 (45%) | 4 / 8 | 40 |
| Grunt on the Ranger | +4 vs AC 12 | 8+ | 13 (65%) | 4 / 8 | 56 |
| Grunt on the Mage | +4 vs AC 11 | 7+ | 14 (70%) | 4 / 8 | 60 |
| Archer, Shortbow Shot on the Mage, Archer higher | +6 vs AC 11 | 5+ | 16 (80%) | 4 / 8 | 68 |
| Magic Missile, per missile on an eligible unprotected creature | Automatic | No attack roll | 100% | 1d4+1 (2–5), no critical | Mean damage 3.5; ×20 expectation 70 |

## 7. Assets, audio and content workflow

### 7.1 What the slice needs

Measured in `ORIGINAL/`; the first four rows are from the plan (§5.1).

| Asset set | Files | Legacy form | Bytes |
|---|---|---|---|
| Portraits: three heroes, two goblins | 5 | 1254×1254 PNG | 16,405,399 |
| Unit sprites, same five | 5 | 64×80 PNG, single frame | 41,265 |
| SFX routed for the slice's actions | 12 | 16-bit WAV | 1,585,752 |
| One combat music track | 1 | Ogg Vorbis | about 1,120,000 |
| Tile images the legacy view actually draws on Forest Ruins | 20 | 256×352 PNG, drawn at 78×107 | 545,820 |

The tile row is new. The map's eight terrain IDs account for 8 images and 366,900 bytes; the other 12 are the slope and corner variants the view selects for raised cells: eight for stone (`stone_corner_{up,right,down,left}` and `stone_slope_{up_left,up_right,down_left,down_right}`) and four for grass (`grass_slope_{up_left,down_right}` and `grass_corner_{left,down}`), each with the `_N.png` suffix. Two more variants are requested and do not exist (`grass_path_corner_up`, `grass_path_corner_right`), so the Ranger's spawn row falls back to the flat path image. Decide in #3 whether to ship the variants, draw cell sides another way, or accept flat edges; the answer changes the critical path's file count.

Reuse only what the slice uses. Do not transfer Godot `.import`/`.uid` metadata or unused asset batches.[24]

**Source records.** The legacy asset docs have no origin entry for the hero or goblin art, any SFX or any music, and four of the twelve SFX have no origin record at all. They do record that six of the map's eight base tile images, and the four grass variants, were generated from a user-supplied screenshot used as a style reference: 10 of the 20 tile images.[24][66][67] Record the origin of every shipped file when it is added. Until the real assets are in, #2 can merge code that draws placeholder shapes and plays a synthesized tone.

### 7.2 Pipeline (proposal for #3)

- Every asset is imported through Vite, so it is emitted flat and content-hashed under `dist/assets/` (§9.2). The manifest module imports each file: a missing file breaks the build, and a content reference to an unknown key fails validation.
- One manifest row per shipped file: key, source path at the pinned SHA, origin, dimensions, anchor.
- Portraits: resize to the largest size the HUD shows multiplied by the DPR cap, and encode as WebP.
- Tiles and unit sprites are small enough to ship individually; pack an atlas only if request count shows up in the measurements. PNG is directly usable; Phaser 4 handles ordinary image texture orientation automatically.[39]
- Size tile images for the screen, not from the source. Phaser 4.2.1 creates a WebGL 1 context and builds mipmaps only for power-of-two textures, and only when `mipmapFilter` is set.[80][92] The 256×352 tile images therefore get none. At a phone's fit zoom and a resolution scale of 1 a tile is drawn about 40 pixels wide from a 256-pixel source, and minification that strong shimmers. Export them near the largest size they are shown at (drawn size × maximum zoom × resolution cap), or use power-of-two images with a mipmap filter. Judge the result in #2.
- Audio: music as MP3, the only compressed format on the release allowlist that every target browser decodes: Ogg Vorbis cannot be relied on before iOS 18.4, and M4A is not allowlisted.[53][73][74] For SFX the plan says MP3 as well; T11 asks whether short mono WAV, which is allowed and plays everywhere, is the better container. The twelve cues last 9.3 seconds in total and come to 0.41 MB as 22.05 kHz mono PCM, and four of them are only 0.09 to 0.12 seconds long, where an MP3's padding and decoder delay are a large share of the sound. Either way ship one format per sound: Phaser picks a file by its extension and the browser's `canPlayType` answer.[83]
- Commit the optimized outputs; the originals stay in the private repository. Record the conversion commands beside the manifest. Converters are run by hand and are not build dependencies.
- The build's `check-dist` step (§9.2) reports total `dist/` bytes and the largest file, and fails above the agreed budget (D2).

### 7.3 Loading phases and failure policy

| Phase | Contents | If it fails |
|---|---|---|
| Critical | script, styles, board tiles, unit sprites, system fonts | `fatal` screen with Reload |
| After the board is interactive | portraits (DOM images) | placeholder portrait |
| After Begin | SFX | play without that sound |
| Last | music | no music |

Phaser reports two kinds of failure differently, and the handler must catch both:[82]

- A request that fails (for example a 404) increments the loader's failure count and emits `loaderror`.
- A response that arrives but cannot be decoded only logs `Failed to process file` and leaves the texture missing; no `loaderror` is emitted, and the loader counts the file as complete. This is what happens when a server answers a missing file with an HTML page and status 200. Checked in a browser on 2026-10-06: `vite preview` does that for any missing path, including under `/assets/`, unless `appType: 'mpa'` is set (§9.2); with that setting the same request is a 404 and raises `loaderror`.

So after each phase, verify that every expected key exists in its cache instead of trusting the event alone. A missing texture otherwise renders as Phaser's placeholder image.

Two cases need more than the loader:

- The script itself can fail or stall, and then none of this code runs. `index.html` carries a static loading indicator, which is also what the player sees while the 1.38 MB engine downloads, and a static failure message revealed by an error handler on the entry script and by a timeout. Neither depends on the bundle.
- A request that stalls never fails by itself: `loader.timeout` defaults to 0, which means no timeout. Set it, so that a stall becomes a load error.[79][82]

This minimal loading and failure surface is needed first by #2 (no WebGL) and #3 (bad content), so it arrives with #2; #10 extends it into the diagnostics panel.

### 7.4 Audio

Domain events name what happened; the audio adapter maps them to cues. There are no sound calls in the domain.

Baseline cue routing for the slice (`BattleController.gd:2155-2229`, `AudioFeedback.gd:3-64`):[56][86]

The following table records legacy sound candidates. Ember Burst cues are historical and excluded from the revised slice; Magic Missile release/impact cues remain to be chosen in #10, with no save or empty-area miss cue.

| When | Cue | Legacy file | Level (dB) | Pitch |
|---|---|---|---|---|
| A unit moves | `move` | `move.wav` | −10 | 1.0 |
| A unit waits: a hero's End turn, or an enemy with nothing to do | `wait` | `wait.wav` | −10 | 1.0 |
| Basic Attack released | `attack` | `issue377/basic_attack_release.wav` | −8 | 1.02 |
| Guarded Strike released | `guarded_strike` | same file | −8 | 0.96 |
| High Shot or Shortbow Shot released | `high_shot` | `high_shot.wav` | −7 | 1.01 |
| Ember Burst released | `ember_burst` | `issue377/ember_burst_release.wav` | −6 | 1.0 |
| An attack hits | `attack_hit` | `issue377/basic_attack_hit.wav` | −5 | 1.05 |
| Guarded Strike hits | `guarded_strike_clang` | `hit.wav` | −5 | 0.86 |
| An attack misses, or Ember Burst catches nobody | `miss` | `issue377/basic_attack_miss.wav` | −4.5 | 1.0 |
| Ember Burst damages at least one target, once per cast | `ember_burst_impact` | `issue377/ember_burst_impact.wav` | −4.5 | 0.88 |
| At least one target saves against Ember Burst, once per cast | `ember_burst_save` | `miss.wav` | −5.5 | 1.18 |
| Victory, defeat | `victory`, `defeat` | `victory.wav`, `defeat.wav` | −4, −4.5 | 1.0 |

- The baseline has one sound player and stops the previous sound before each cue, and it requests an action's release cue and its impact cue in the same call (`AudioFeedback.gd:83-100`, `CombatScene.tscn:450`).[86][91] The release cue is therefore cut off at once. The target plays cues from the playback timeline — release when the animation starts, impact when it lands — and needs at least two voices. Whether the release cues are worth shipping at all is T9.
- Level and pitch map to Phaser's per-play `volume` (10^(dB/20)) and `rate`.
- Unlock. Phaser's WebAudio manager starts locked when the context is suspended and resumes it on the first touch, mouse or key event on the page.[49] The Begin tap is that gesture (§2.2). Load SFX after it.
- Required controls: mute, with volume optional. The manager pauses on blur and resumes on focus, including from the `interrupted` state that iOS uses.[49] First-gesture playback, the hardware silent switch and in-app browsers still need real-device testing.
- Music is optional and one track at most.

## 8. Saves and optional services

**Not in the first tranche.** Issue #11 lists saves and resume as a follow-up.[52] Until then a battle is lost when the browser discards the tab, which phones do to background tabs under memory pressure. Say so in the deferred list. The seed and command log (§4.2) keep a later resume cheap.

Preferences such as mute may use `localStorage` from the start, under the same rules as below: a namespaced key, every access wrapped, and a visible but nonfatal result when storage is unavailable.

When the save slice arrives:

- Use a new namespaced key, e.g. `tactics_guru.phaser4.save.v1`. Never read or write the legacy keys `tactics_guru.active_run_state`, `tactics_guru.active_battle_state` and `tactics_guru.leaderboard_records`.[13][14][88]
- The envelope carries format, rules, content and RNG versions and either a domain snapshot at a command boundary or the seed and command log with a snapshot digest. Validate type, size, finite safe integers, known IDs and state invariants.
- Corrupt or future versions offer recover/reset/export choices without automatic deletion. Keep a last-known-good backup; catch quota and security exceptions. A checksum detects accidental corruption, not cheating.
- Resume requires next-command and RNG equivalence tests. Do not serialize animation phase, Phaser objects, DOM, resource references or unbounded logs. Migrations are pure functions with fixtures and backup-first behavior.
- Two limits to state plainly. `localStorage` is per origin, so the namespaced key protects old data only if the new build is ever served from the legacy origin. Safari deletes script-writable storage after seven days of browser use without interaction with the site, so resume on iPhone is best-effort.[75]
- Legacy Godot save import is separate optional scope; its 64-bit RNG values need a precision policy, not JavaScript number coercion.[13][27]

No server is required. The existing global leaderboard is a deferred payload contract, not a working upload backend.[29] Meta Renown is not guaranteed durable by the base spec.[31] Analytics has actual privacy-constrained code in the legacy build but is optional for the restart (D10): default disabled, no replay/raw logs/saves/seeds, no domain dependency.[20][21]

## 9. Browser delivery and operational simplicity

One Vite application builds static `dist/` HTML, script and assets. No Godot export stage, WASM or PCK is retained.[22]

### 9.1 Release mechanism constraints

From PR #12, which is open and unmerged; re-check when it lands.[53]

- One ZIP of at most 20 MiB per release; at most 64 MiB expanded, 16 MiB per file and 512 files.
- Allowed extensions, case-sensitive: `.html .js .css .json .png .jpg .jpeg .webp .svg .ico .woff .woff2 .mp3 .ogg .wav`. Not shippable, among others: `.map`, `.wasm`, `.m4a`, `.avif`, `.txt`, `.webmanifest`, `.ttf`, `.otf`.
- Files sit at the root of `dist/` or exactly one level down under `assets/`. Names use only letters, digits, `_`, `.` and `-`, at most 200 characters with the folder, and must be unique ignoring case. Root `manifest.json` and `_deployment.json` are reserved; the publisher writes `_deployment.json` itself, with the release SHA.
- Serving, per the proposed `deploy/nginx.conf`: `/assets/` is cached for a year as immutable and a missing file there is a 404; `/index.html` is revalidated; any other missing path returns the page with status 200, apart from a few reserved paths that return 4xx; `X-Content-Type-Options: nosniff` is set; there is no compression directive in the server block.
- A release replaces the served directory atomically.

### 9.2 Build configuration

A proposal for #3. The settings were tried on 2026-10-06 in a throwaway copy of the scaffold.

| Setting | Why | Checked result |
|---|---|---|
| All assets imported, none in `public/` | flat, hashed names under `/assets/` | imported files from source subfolders come out as `dist/assets/<name>-<hash>.<ext>` |
| `build.assetsInlineLimit: 0` | Vite inlines files under 4,096 bytes as base64 by default; that hides small assets from the manifest-to-file mapping and puts deferred ones into the script. Two of the slice's sounds, `hit.wav` and `miss.wav`, are 4,012 bytes even before transcoding | default: a 74-byte PNG became a data URI in the script; with 0 it is a file |
| Engine in its own chunk: `build.rolldownOptions.output.codeSplitting.groups` with a group matching `node_modules/phaser`[90] | returning players keep the engine cached across game releases, until Phaser or the bundler changes | engine chunk 1,374,548 bytes (352,038 gzip); an app-code edit renamed only the app chunk. With one bundle the same edit renamed the whole 1.38 MB file |
| `appType: 'mpa'` | the preview server otherwise answers every missing path with the page and status 200, unlike production under `/assets/` | with it, a missing file is a 404 in preview |
| No source maps in `dist/` | `.map` is not allowlisted; keep maps as CI artifacts if needed | — |
| `scripts/check-dist.mjs` at the end of `npm run build` | the publisher applies its limits only when publishing from `main`, so a pull request that adds a disallowed file, a nested folder or an oversized asset passes its checks and fails at release. The script applies the §9.1 rules and the size budget, and prints total bytes and the largest file | not built |
| Default `build.target` | Vite 8.3.2 targets Chrome 111, Edge 111, Firefox 114, Safari 16.4 and iOS 16.4.[89] If D1 names an older browser, lower the target on purpose; otherwise this is the floor | — |

Content JSON is imported statically, so it is bundled and hashed with the script. Fonts are system fonts; only WOFF and WOFF2 could be shipped. A favicon, if added, goes through the asset graph too: a file at the root gets no cache header from the proposed server.

### 9.3 Runtime behaviour around releases

- A session that started before a release gets a 404 for any file it requests afterwards whose name changed in that release; unchanged files, such as the engine chunk, are still served. Deferred assets fail soft (§7.3); a failed critical request offers a reload.
- Check `content-encoding` on the deployed script at the edge: 1.38 MB uncompressed against about 0.35 MB compressed.
- Build identity for diagnostics: a build-time constant, or `/_deployment.json` on the deployed host. That file does not exist in dev or preview, so the fallback is `dev`.
- No third-party requests. If a content security policy is added later, note that Phaser loads images through XHR and blob URLs by default (`loader.imageLoadType`).[79]

### 9.4 Not carried over

- The legacy `Dockerfile` exports Godot and serves through nginx; its README records that Coolify's GitHub App deploys `main`. The old TDD's claim of a `.github/workflows/deploy.yml` is the stale part; the tree has no `.github` path.[1][22][54] Do not invent or promise Coolify automation for the new build. The production host and cutover target are D9.
- The legacy nginx configuration sends `no-store` for the engine, pack and page, so nothing heavy is cacheable.[23] The proposed server does the opposite for hashed assets; keep it that way.
- No service worker, PWA, offline cache, native wrapper, authentication, backend or telemetry until explicitly approved. The release allowlist excludes `.webmanifest` and reserves `manifest.json`, so install metadata could not ship through this pipeline as it stands. Local play being browser-based does not by itself guarantee offline first-load availability.

## 10. Tests and acceptance gates

### 10.1 Scripts and CI wiring

Existing at `df693f0`: `dev`, `preview`, `typecheck` (`tsc --noEmit`), `build` (type-check, then `vite build`) and `test` (`playwright test` against the production build). The last three were run on 2026-10-06 and passed.[51]

The workflow proposed in PR #12 runs `npm ci`, `npm run build` and `npm test`.[53] Until that PR is merged `main` has no workflow at all, so nothing is gated automatically yet. Once it is, a new script gates nothing unless one of those three reaches it. Proposed wiring, which needs no workflow change:

```json
"typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.domain.json",
"build": "npm run typecheck && vite build && node scripts/check-dist.mjs",
"test:unit": "vitest run",
"validate:content": "vitest run tests/unit/content.test.ts",
"test:e2e": "playwright test",
"test": "npm run test:unit && npm run test:e2e"
```

- `vitest run` runs once and exits; never start a watcher in CI.
- Runner scoping is required, not optional. Checked with Vitest 5.0.3 and Playwright 1.63.0 installed side by side: with no configuration Vitest's default pattern picks up `tests/e2e/*.spec.ts`, and the run fails with Playwright's "did not expect test() to be called here" error. Restrict Vitest to `tests/unit/**/*.test.ts`, point Playwright's `testDir` at `tests/e2e`, and move `tests/boot.spec.ts` there, all in the PR that adds Vitest. The plan ties that to #4, which names the unit script; #3 comes first in the tracker's order and its acceptance already asks for unit fixtures, so whichever of the two lands first carries the runner and the scoping.[52]
- Vitest 5.0.3 accepts Vite 8 and requires Node `^22.12.0 || ^24.0.0 || >=26.0.0`, which is narrower than the scaffold's `>=22.12.0`: Node 23 and 25 are excluded.[76]
- `npm test` serves whatever `dist/` already holds: the Playwright configuration only starts the preview server.[51] CI builds first, but a local run can test a stale build. Have the web-server command build before it serves.
- These scripts remain proposals until a PR adds them.[52]

### 10.2 Unit tests (Vitest, node environment)

Content validation with representative malformed inputs; RNG vectors and state round-trip through JSON (§6.4); occupancy, weighted paths, Jump and the equal-cost tie order; a move to a cell that became occupied after it was previewed; line-of-sight vectors in all eight directions including exact halves, and symmetry (§6.3); Magic Missile target assignments; initiative ties and skipping; d20 edges at natural 1, natural 20 and total equal to AC; Magic Missile automatic hits, 1d4+1 damage bounds and seeded missile ordering; the three signatures and Guarded expiry; pure previews that leave the RNG untouched; rejected commands that leave the state deep-equal; legal AI choices, occupied chokepoints, unreachable targets, the Wait fallback and tie order; outcome exactly once.

The gesture reducer and the session's mode machine are pure and are unit-tested here too (§2.1, §5.7).

Three properties worth testing directly:

- **Replay.** The same seed and command list produce an identical event list, twice in one process. One golden replay is also committed with a digest of its final state, so a change to rules or content that alters outcomes has to update that fixture on purpose. A second check recomputes the enemies' logged commands with the AI and compares.
- **Preview equals resolution.** Resolution is a pure function of the evaluation and the natural roll; `dispatch` only draws the roll. For every legal attack, applying each of the 20 faces to that function gives the hit count, damage and critical damage that the preview reported. The legacy tests reach the same end by injecting a fake generator.[25]
- **No soft lock.** Play many seeded battles to the end through the session with an instant presenter (§2.1), asserting the state invariants after every command and a zero count of AI fallbacks. Heroes are driven by the same chooser with a test profile, which keeps the run deterministic. The harness can also report win rates, which is the evidence D6, D11 and T8 need. The rules have no turn limit, so the test needs a cap; a battle that reaches it is a finding, not a pass.

Expected numbers come from §6.6 and the plan's §3.4, not from legacy fixtures that exercise dropped effects. The 154 legacy test files are a scenario library, not a portable or verified-green suite (plan §7.3); `.tscn` node layout tests are replaced with browser tests. Existing forced win/loss restart fixtures do not satisfy full-battle play acceptance.[36] Later inventory tests must prove extensible catalog entries, ownership, compatibility, atomic consumption and battle-local effects.

### 10.3 Browser tests (Playwright)

Boot and loading failures; move, attack, signature, end turn, outcome and restart through real controls; picking under pan, zoom and elevation, including the covered cells; modal no-click-through; keyboard; tap versus drag versus pinch; screen-size and DPR changes; log and portrait visibility; repeated restart without duplicate listeners; a forced WebGL context loss; missing assets.

- Assert state and control outcomes as well as screenshots; fixed seed, fonts, animation and viewport for any visual fixture.
- Add a WebKit project as an inexpensive check for engine-specific breakage. It is not evidence for iPhone audio or performance. It needs two changes outside the test files: the proposed workflow installs Chromium only, and the scaffold's Playwright configuration applies its optional Chromium `executablePath` to every project.[51][53]
- Run at least one spec with motion on; if every spec uses reduced motion, the animated path is never exercised. Pinch runs in Chromium only (§5.7).
- Screenshots that include text depend on the machine's fonts: generate them on the CI image, or keep text out of them.
- The proposed workflow gives the whole job 20 minutes, release step included.[53] Keep full-battle specs few; most rule coverage belongs in the unit suite.
- The suite runs against `vite preview`. It cannot observe production's cache headers or compression, and CI runners have no GPU, so frame times from the suite mean nothing. Those are checked on the deployed host (§10.5).
- Emulated WebKit and touch are not proof of physical iPhone or in-app webview behavior.

### 10.4 Test seams and diagnostics

- **Seed.** A query parameter overrides the seed, for example `?seed=12345`. It accepts an unsigned 32-bit decimal integer; anything else is ignored and reported in the log. While the override is present, Restart reuses it; otherwise each restart takes a new seed (D7). The seed is always shown in the log.
- **State.** The HUD exposes mode, active unit, round and outcome as text and `data-*` attributes. A read-only hook returns the presented view (§2.1): units with cell, HP and statuses, the selection, the legal cells and targets, and whether playback is running. Tests read those instead of hard-coding cells per seed.
- **Board coordinates.** The same hook converts a cell to client coordinates, so tests tap cells without hard-coded pixels. It exposes no way to change state. Because the suite runs against the production build, the hook ships in production.
- **Motion.** With the reduced-motion preference, which Playwright can emulate, playback is near-instant.
- **Restart.** Restart rebuilds the battle through the same path as first boot, under a new generation token; there is one way to start a battle, not two.
- **Diagnostics panel.** A global error handler shows a visible, copyable panel: message, build identity, the three version numbers, seed, the index of the last command and the accepted command list. That text is a complete reproduction recipe. No third-party error service.

### 10.5 Manual/device gate

Physical iPhone Safari, iPhone Chrome, Android Chrome and agreed desktop browsers; portrait and landscape; audio after tap; background/resume; repeated fully played battles. Record with every number: device model, OS and browser version, orientation, network conditions, cold or warm cache, and build SHA. Capture transferred bytes and request count, time to first render, to usable controls and to the first playable battle, and frame times over a scripted pan/zoom/move sequence. Loading numbers count only from the deployed host, after signing in through Cloudflare Access; never weaken Access to test. Compare with the old Godot build under matching conditions where safely accessible, or record the gap. The plan (§4.2) has the full protocol. Establish numerical budgets with Brian after measurement (D2); improvement is an acceptance concern, not a proven result. Telegram/in-app webviews are optional and not substitutes for the approved device matrix.

## 11. Incremental roadmap

The tracker's order stands: proof-of-fit first; then content, pure state/RNG, grid, combat, signatures, AI; rendering after content and grid; UI integration after its dependencies; device and performance acceptance last.[52] The plan (§7.1) maps phases to paths and gates. What each issue takes from this design:

| Issue | Sections here |
|---|---|
| #2 Proof-of-fit | §2.3, §5.2–§5.7 (D8, T1, T2, T4, T7), §7.3, §9.2 |
| #3 Content and asset catalog | §3, §4.1, §4.3, §4.4, §7.1–§7.2, §9.2 (D4, T11); §10.1 if it adds the first unit test |
| #4 State, commands, RNG | §2.4, §4.2, §6.4 (T3), §10.1 |
| #5 Grid and movement | §6.2 movement rows |
| #6 Board and picking | §5.1–§5.5 (D8, T4) |
| #7 Turn flow, attacks, outcomes | §6.1–§6.3, §6.6 (D7) |
| #8 Signatures | §4.1, §6.2 (D5, D6, D11) |
| #9 Enemy turns | §6.5 (T8) |
| #10 Wiring, HUD, input | §2.1, §2.2, §5.7–§5.9, §7.4, §10.4 (T5, T6, T9, T10) |
| #11 Device validation | §10.3, §10.5; the deferred list in §8 |
| After the epic | §8 saves; the optional short-run slice |

Where the order leaves ownership unclear:

- #2 needs the map's geometry and a few images before #3's catalog and manifest exist. It carries them as a fixture of its own, and #3 replaces that fixture.
- The second TypeScript project and the minimal loading and failure surface arrive with #2 (§2.3, §7.3).
- #3 defines the units with Basic Attack, and the archer's Shortbow Shot, which is a plain attack. The three signatures and the Guarded status enter the catalog with #8, so validation must accept a hero with one ability until then.
- #4 delivers the state, command and event types, the generator, the state validator and fixtures. `createBattle` with initiative, and the turn flow, are #7's.
- Where this design asks more of an issue than its text does, the issue text governs until it is amended. The plan (§8, item 6) lists the additions that have not been posted.

Every slice is reviewed from a clean TDD worktree based on current `origin/main`, with focused/full test evidence. No closing issue/PR language until acceptance is complete. Task branches never start from `docs`.

## 12. Risks, assumptions and open decisions

Primary risk: full feature-parity creep defeats the purpose. The plan (§9) keeps the full risk table; the design-level risks are:

| Risk | Where it bites | Mitigation |
|---|---|---|
| Units and highlights hidden by correct occlusion | five cells behind the ruin, five behind trees | T1 with D8, proven in #2 (§5.2, §5.3) |
| Mis-taps on small tiles | diamonds about 32×16 CSS pixels when the board is fitted to a phone | zoom defaults and snap radius from #2; two-step commit (§5.4, §5.7) |
| Canvas too expensive or too soft | unbounded size on desktop, upscaling on phones | T2 (§5.5) |
| Preview and resolution disagree | separate code paths, float scores | shared evaluation, integers (§6.3, §6.5) |
| Replays differ between browsers | key order, locale compare, float rounding | §2.4, §6.3 |
| Rule lifecycle lost in translation | rules inside a scene controller | §2.1, §6.1 |
| Asset failures go unnoticed | decode failures emit no load error; preview server masks 404s | cache checks, `appType: 'mpa'` (§7.3, §9.2) |
| Build rejected or mis-cached by the release mechanism | nesting, extensions, reserved names, year-long caching | §9.1, §9.2 |
| iPhone audio silent | codec support, unlock, silent switch | a universally decoded format, unlock on Begin, device test (§7.2, §7.4) |
| Battle lost on tab discard | no saves in the first tranche | accept and state it (§8) |
| Renderer and API drift | Phaser 4's renderer is new | pinned version, standard APIs, context-loss handling (§5.6) |
| Board freezes after an uncaught error | Phaser's frame loop does not restart after an exception in the step | one guard around step callbacks; restart or `fatal` (§2.1) |
| A release fails after merge | the publisher's limits run only when publishing from `main` | the same checks at build time (§9.2) |
| Enemies act before the player is ready | an enemy holds the first turn in about half of all seeds | Begin gate (§2.2, T10) |
| Toolchain novelty | TypeScript 7 and Vitest 5 are young major versions | exact pins; tool upgrades as their own PRs |

4.2.1 fixes resize, ESM, stencil and delayed tweens; pin it and avoid custom rendering internals. Phaser 4 removes the old pipelines and unifies FX/masks into filters; Canvas is deprecated. Do not silently target Phaser 3 or promise unsupported-device performance.[38][39][72]

**Resolved by Brian:** one replayable tactical battle; deployed loading/mobile problems as the restart motivation; isometric presentation and basic rules retained; iPhone Safari, iPhone Chrome, Android Chrome and desktop in both orientations; fresh runtime without legacy import; the new repository. **Open:** the decisions below; D7 (the restart seed) was resolved on 2026-10-09: a restart takes a new seed. The plan's register (§2) is authoritative; in short:

| # | Decision | Blocks |
|---|---|---|
| D1 | Minimum browser versions and the physical device list | #2, #11 |
| D2 | Numeric loading and frame budgets | #2, then #11 |
| D4 | Encounter: the legacy trio or the current seeded roster | #3 |
| D5 | Resolved: Guarded on miss; Ember Burst replaced by Magic Missile | Resolved for #8 |
| D6 | Resolved: Guarded Strike trades −2 accuracy for +2 AC | #8 |
| D8 | Selecting cells covered by raised terrain | #2, #6 |
| D9 | Production host and cutover target | after #11 |
| D10 | Analytics | after #11 |
| D11 | Guarded Strike −2/+2 and Magic Missile 1d4+1 approved; starting caster level 1, range 1–5 tiles and 3-tile spread recorded | Tuning #10 |

**Design questions raised by this revision.** They are not yet in the plan's register; add them when confirmed.

| # | Question | Recommendation | Decide in |
|---|---|---|---|
| T1 | Depth model: units above terrain (baseline) or interleaved with terrain plus translucent occluders | interleaved, if #2 shows it stays readable | #2, with D8 |
| T2 | Canvas resolution: CSS-pixel `RESIZE` or a bounded device-pixel scale | bounded scale, cap from measurement | #2 |
| T3 | Generator | sfc32 as specified in §6.4 | #4 |
| T4 | Unit sprites as pick targets | test in #2; adopt if body taps miss | #6 |
| T5 | Commit model on desktop | two-step for every pointer | #10 |
| T6 | End the turn automatically when move and action are both spent; ask before End turn discards an unused move or action | keep the baseline: manual, no prompt | #10 |
| T7 | Keyboard-only play | decide scope; target stepping plus a cell cursor if required | #2 with D8; built in #10 |
| T8 | AI damage measure | previewed expectation always | #9 |
| T9 | Sound voices, and whether release cues ship | cues on the playback timeline, two voices | #10, with #3 for the files |
| T10 | How a battle begins | board visible and pannable at once, with a Begin button; no separate title screen | #10 |
| T11 | Container for the short sound cues | mono WAV for cues, MP3 for music; the plan currently says MP3 for both | #3 |

## 13. Transition mapping from the original TDD

Section numbers are those of the legacy `docs/tech_design.md`.[1]

| Original sections | Proposed treatment |
|---|---|
| 0–2 summary/goals/MVP | Preserve compact positioning/readability intent; replace stale status with explicit proposal and reduced combat MVP. |
| 3 architecture | Keep rules/view separation; use domain→session→Phaser/DOM boundary, with the lifecycle in the domain. |
| 4–5 Godot structure/scenes | Retire `res://`, autoload, Node/Resource/TileMapLayer layout; use TS modules and minimal Phaser Scenes. |
| 6 coordinate math | Retain the projection and constants; pin the anchor conventions the code added; define the depth model and the picker. |
| 7–8 content/runtime | Replace Resources/Vector2i/StringName with immutable typed definitions and serializable runtime state; validate actual data. |
| 9–13 lifecycle/turns/movement/targeting/combat | Preserve the baseline rules as pinned in §6; explicitly exclude newer deep effects and tempo. |
| 14–15 initial content/AI | Keep three roles and the two goblin profiles, not the expanded rosters and abilities. |
| 16–18 UI/rendering/audio | Rebuild browser/mobile UI and event presentation; reuse selected artwork/SFX with recorded sources. |
| 19–21 authoring/database/signals | One validated JSON map/catalog; typed commands/events instead of Godot signal/resource tooling; editor later. |
| 22–25 debugging/tests/performance/saves | Seed and command log; Vitest/Playwright and devices; measured performance; saves deferred, with a safe namespaced design when they return. |
| 26–27 milestones/backlog | Replaced by the tracker's issues. |
| 28–30 risks/extensions/questions | Explicit scope ledger, optional run, product questions; no automatic parity. |
| 31–33 operations/references/immediate step | Static browser build through the reviewed release mechanism; official Phaser 4 tagged references; proof-of-fit first, not old M1 movement work. |

### OpenSpec alignment, not mutation

The new repository carries no OpenSpec tree; its requirements are the tracker's issues.[52] The original repository's `openspec/specs/combat-core/spec.md`, `overworld-run/spec.md`, `mobile-web-ux/spec.md` and `meta-progression/spec.md` remain reconciliation inputs for implemented and deferred behavior. If documentation on `main` is later authorized, establish only the accepted Phaser requirements there. Do not edit, mass-delete or archive the original Godot requirements as part of this work; existing unarchived changes include already-implemented work.[30]

The list of legacy change, delta and task paths was saved in `phaser4-discovery/evidence.md`, which is not stored with this copy; `ls ORIGINAL/openspec/changes` regenerates it. The plan supplies feature decisions and the PR-sized mapping.

## Revision notes (2026-10-06)

Corrections to the earlier draft:

- Status and repository wording: the repository is initialized and tracked, and this draft is on the `docs` branch; "do not initialize or scaffold" and "not applied to either repository" are superseded. The stack line gives the pinned versions.
- File layout: `public/assets/` with nested folders and a `manifest.json` conflicted with the release mechanism; assets now go through the build's asset graph and the manifest is a module. The `docs/` and `openspec/` entries are removed from the target tree.
- Rules: the saving-throw path, the exact height, critical and damage rules, the turn lifecycle and the status expiry were missing or only named; §6 now states them.
- Commands: `wait` is `endTurn`; `restart` is a session operation, not a domain command.
- Saves: moved out of the first tranche, to match issue #11; the legacy leaderboard key is named.
- Delivery: the hosting paragraph now reflects PR #12 and the legacy README; "host on existing static infrastructure" is no longer a recommendation.
- Audio: "WAV/OGG" replaced by MP3, with the reason.
- Tests: the existing scripts are distinguished from the proposed ones; "none have run" is no longer true for type-check, build and the smoke test.
- Roadmap: replaced by a mapping to the tracker's issues.

Additions: session modes and playback rules (§2.1, §2.2); boundary and determinism rules (§2.3, §2.4); type sketches (§4.1, §4.2); slice content with unit IDs and AI weights (§4.3); anchor conventions, depth model, covered cells, picker, canvas policy, failure handling and gesture table (§5); lifecycle, integer line of sight, generator proposal with vectors, AI formula and check values (§6); tile variants, loading phases, failure detection and the cue table (§7); build settings with checked results (§9.2); script wiring, properties and test seams (§10); the T1–T11 questions (§12).

Checked by experiment on 2026-10-06, in throwaway copies outside the repository. No file was added to the project and no dependency was installed in it. The copies linked to the project's `node_modules`, where Vite left an empty, ignored temporary folder that was removed afterwards. The scaffold's own type-check, build and smoke tests were also re-run in place and passed, which regenerated the ignored `dist/` and `test-results/`. The checks:

- TypeScript 7.0.2 with the domain-only settings: which globals fail and which do not (§2.3).
- Vite 8.3.2 production builds: flat hashed output, the inline limit, the engine chunk and its stable name, `appType: 'mpa'` (§9.2).
- Vitest 5.0.3 in an isolated install: default pattern collision and the scoped configuration (§10.1); the generator vectors (§6.4).
- Playwright 1.63.0 with headless Chromium: explicit WebGL boot, outside-canvas events, forced context loss and restore, the bounded-resolution canvas at a device scale factor of 3, the missing-asset signals under both preview-server modes, and the frame loop stopping after an exception and reviving (§2.1, §5.5, §5.6, §5.7, §7.3).
- Scripts over the legacy sources and art: line-of-sight equivalence (§6.3), the map facts and the hidden-cell and overlap counts (§4.3, §5.2, §5.3, §7.1), who acts first by seed (§2.2), the check values (§6.6).

Two independent reviews of this revision were run the same day, a fact-check against the sources and an implementer's read against the tracker, and their corrections are included. Both re-derived the generator vectors, the line-of-sight comparison, the map facts and the check values.

The plan received four small edits in the same pass (its §5.1 item 1, §8 item 7, §9 and revision notes), so that it no longer describes this draft's old state.

Not done: no gameplay code, no device test, no measurement of loading or frame time. The companion plan's rule and asset facts were reused as verified there. Nothing here is a signal to begin anything beyond what the tracker already covers.

## Sources

Numbers [1]–[77] are shared with the plan; only those cited here are listed. Links into `luminari-gurus/tactics-guru` need access to that private repository; the same paths resolve under `ORIGINAL/`.

[1] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/docs/tech_design.md
[2] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/autoload/ContentDatabase.gd
[3] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/ForestRuinsMvpBuilder.gd
[4] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/GridService.gd
[5] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd
[6] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TurnManager.gd
[7] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/AIController.gd
[8] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/RunState.gd
[10] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/ItemCatalog.gd
[12] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/UnitProgressionService.gd
[13] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/ActiveBattleStorage.gd
[14] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/ActiveRunStorage.gd
[17] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/view/BattleView.gd
[20] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/analytics/AnalyticsService.gd
[21] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/web/posthog-bootstrap.js
[22] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/Dockerfile
[23] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/nginx.conf
[24] https://github.com/luminari-gurus/tactics-guru/tree/e9433f6b608ae6b2d95418615cce9cf17dadcf74/docs
[25] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_combat_resolver.gd
[26] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_run_equipment_effects.gd
[27] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_active_battle_storage.gd
[29] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_m22_leaderboard_global_sync_contract.gd
[30] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/openspec/project.md
[31] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/openspec/specs/meta-progression/spec.md
[33] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_issue_599_summon_command_actions.gd
[34] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_issue_606_tempo_modifiers.gd
[36] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_m7_stability_pass.gd
[37] https://registry.npmjs.org/phaser/latest
[38] https://github.com/phaserjs/phaser/releases/tag/v4.2.1
[39] https://github.com/phaserjs/phaser/blob/v4.2.1/changelog/v4/4.0/MIGRATION-GUIDE.md
[44] https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js
[45] https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/InputPlugin.js
[46] https://github.com/phaserjs/phaser/blob/v4.2.1/src/cameras/2d/BaseCamera.js
[47] https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/components/Depth.js
[48] https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/graphics/Graphics.js
[49] https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/webaudio/WebAudioSoundManager.js
[51] https://github.com/luminari-gurus/tactics-guru-v2/commit/df693f0185defda88c0de306ae12ec2424466b6e
[52] https://github.com/luminari-gurus/tactics-guru-v2/issues/1 (child issues #2–#11)
[53] https://github.com/luminari-gurus/tactics-guru-v2/pull/12 (head `636e0ea462ee24a36cf572d1f93ac5fffcb69525`: `deploy/release.py`, `deploy/nginx.conf`, `.github/workflows/release.yml`)
[54] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/README.md
[56] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/BattleController.gd
[57] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TargetingService.gd
[58] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/maps/forest_ruins_mvp.tres
[60] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/autoload/GameConfig.gd
[61] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/view/IsoMath.gd
[62] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/view/UnitView.gd (and `scenes/combat/UnitView.tscn`)
[63] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/BattleRng.gd
[66] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/audio/music/bgm_variants/README.md
[67] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/docs/issue-377-sfx-running-table.md
[69] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TileState.gd
[70] https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/CreateRenderer.js
[72] https://github.com/phaserjs/phaser/blob/v4.2.1/changelog/v4/4.2.1/CHANGELOG-v4.2.1.md
[73] https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes
[74] https://caniuse.com/ogg-vorbis
[75] https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
[76] https://registry.npmjs.org/vitest/latest
[77] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/CLAUDE.md
[78] https://github.com/MartyMacGyver/PractRand/blob/master/src/RNGs/sfc.cpp (mirror of PractRand; `sfc32::raw32` and `sfc32::seed`)
[79] https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/Config.js
[80] https://github.com/phaserjs/phaser/blob/v4.2.1/src/renderer/webgl/WebGLRenderer.js
[81] https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/touch/TouchManager.js (with `src/input/mouse/MouseManager.js` and `src/input/Pointer.js`)
[82] https://github.com/phaserjs/phaser/blob/v4.2.1/src/loader/LoaderPlugin.js (with `src/loader/File.js` and `src/loader/XHRLoader.js`)
[83] https://github.com/phaserjs/phaser/blob/v4.2.1/src/loader/filetypes/AudioFile.js (with `src/device/Audio.js`)
[84] https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/Game.js
[85] https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/DisplayList.js
[86] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/view/AudioFeedback.gd
[87] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/content_defs/AIProfileDefinition.gd (with `content/ai_profiles/goblin_grunt.tres` and `goblin_archer.tres`)
[88] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/LeaderboardRecordStorage.gd
[89] Vite 8.3.2 as installed: `node_modules/vite/dist/node/index.d.ts` (build options) and the default target list in `dist/node/chunks/node.js`
[90] https://rolldown.rs/reference/OutputOptions.codeSplitting (Rolldown 1.2.12 as installed)
[91] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scenes/combat/CombatScene.tscn
[92] https://github.com/phaserjs/phaser/blob/v4.2.1/src/renderer/webgl/wrappers/WebGLTextureWrapper.js
[93] https://github.com/phaserjs/phaser/blob/v4.2.1/src/dom/RequestAnimationFrame.js
