# Issue #7 plan: basic turn flow, attacks and battle outcomes

Status: implementation in progress on `issue-7-turn-flow-combat` (branched from `origin/main` `73d17c0`, created with `gh issue develop` so it is linked on the issue's Development panel). The plan was ablated before coding (§3.0); §9 records each increment's commit as it lands. Owner: moshehbenavraham (assigned on the tracker 2026-10-09, handling comment [6077491133](https://github.com/luminari-gurus/tactics-guru-v2/issues/7#issuecomment-6077491133)). Next step: the first unchecked increment in §4.

Issue: [#7 P1: Implement basic turn flow, attacks and battle outcomes](https://github.com/luminari-gurus/tactics-guru-v2/issues/7).
Parent: epic #1. Dependency: #5 (closed 2026-10-08 via PR #40). Downstream: #8 and #9 depend on #7; #10 depends on #6, #7, #8 and #9.

This document is a working plan under `docs/ongoing-projects/`. It is not
project evidence; the PR, the task note it adds under `docs/` and the issue
carry the evidence. Fold anything durable into the design docs and delete
this file when the issue closes.

## 1. Where things stand

Checked against GitHub, `origin/main` and the legacy reference on 2026-10-09.

### Tracker

| Item | State | Effect on this work |
| -- | -- | -- |
| #7 | Open, `ready for work` (added by dubstylee 2026-10-08 21:11 UTC), assigned to us 2026-10-09 | This plan. |
| #4 | Closed 2026-10-08 via PR #38 (`9ede9a6`) | Gives the snapshot, command union, rejection reasons, event types, sfc32 RNG and the replay envelope. `readReplay` validates the envelope only; its comment says "#7 supplies replay dispatch". |
| #5 | Closed 2026-10-08 via PR #40 (`53f54fa`) | Gives `previewMovement`, `previewMove`, `moveUnit`. Its note says "General command dispatch remains #7". |
| #26, #28 | Closed (PRs #36, #42) | Content contract and `validateContent`. Unit stats carry `accuracy`, `armorClass`, `power`, `dexterity`; terrain carries `blocksLineOfSight`; cells carry `elevation`. The contract keeps abilities, damage and initiative out of unit definitions. |
| #29 | Open, assigned to dubstylee, PR #43 open (head `85f67fc`) | Adds `src/content/{assets,catalog,forestRuins}.ts` and the authored 12 × 12 map. No combat rules. Not a dependency (guardrail: do not build on unmerged work). No file overlap with this plan: we do not touch `src/content/`, `package.json` or the content docs. |
| #8 | Open, depends on #7 | Signatures (Guarded Strike, High Shot, Ember Burst), the ability catalog, Guarded expiry, D5, D6, D11. Builds on the attack path defined here. |
| #9 | Open, depends on #7 and #8 | AI. Consumes `previewAttack`, `previewMovement` and `dispatch` from here. |
| #10 | Open, depends on #6–#9 | Session, UI, animation lock, restart button, and the D7 seed choice. |
| #3, #6, #11, #30 | Open | Untouched. |

### Branches and PRs

| Ref | State | Effect on this work |
| -- | -- | -- |
| `origin/main` `73d17c0` | Current | Base. `npm run test:unit` on it: 14 files, 150 tests, all passing (run 2026-10-09). |
| PR #43 (dubstylee, `codex/issue-29-authored-content`) | Open | See #29 above. If it merges before our PR, §7 item 6 adds one optional smoke test on the real catalog. |
| PR #39 (ours, `issue-35-close-out`) | Open, docs only | Deletes the #19 and #35 plan files from this directory. No overlap with this file. |
| PR #12 (dubstylee, `feat/signed-main-deploy`) | Open | Unrelated. |

### Repository facts that shape the work

- `src/domain` is pure TypeScript. `tsconfig.domain.json` type-checks `src/domain` and `src/content` with `lib: ["ES2022"]` and `types: []`, so `setTimeout`, `requestAnimationFrame` and `performance` do not compile there. That makes "no animation timing decides rules" mechanical, not a review promise. `tests/unit/domainBoundary.test.ts` also rejects `Math.random`, `Date.now` and non-relative imports in both directories.
- The snapshot already has everything turn flow needs: `initiative` (every unit, defeated ones included), `activeIndex`, `round`, `outcome`, `commandCount`, `rng`, per-unit `hp`, `hasMoved`, `hasActed`. `readBattleState` already enforces outcome ↔ living sides and a living active unit while the battle is ongoing. **#7 adds no state fields.**
- `src/domain/types.ts` already declares the rejection reasons #7 needs (`alreadyActed`, `unknownAbility`, `abilityNotOwned`, `wrongTargetKind`, `missingTarget`, `targetDefeated`, `sameSide`, `outOfRange`, `blockedLos`) and the events (`initiativeRolled`, `turnStarted`, `turnEnded`, `abilityUsed`, `attackRolled`, `damaged`, `defeated`, `battleEnded`). We implement against them; we do not reshape them.
- `moveUnit` sets the pattern every resolver here follows: run the preview, re-read the snapshot, reject an exhausted counter as `invalidState`, return one fresh state plus events, increment `commandCount`.
- `rollDie(rng, sides)` does bounded rejection sampling and returns the new RNG state; `D20_SIDES` exists in `constants.ts`.
- `grid.ts` imports `previewCommand` and `readBattleState` from `battle.ts`. Putting dispatch or battle creation in `battle.ts` would make an import cycle, which is why §3 puts them in new modules.
- Tests build their own small maps over `tests/unit/fixtures/contentContract.ts` and recompute `contentVersion` (see `tests/unit/grid.test.ts`). All fixture terrains have `blocksLineOfSight: false`; LOS tests override one terrain on a copy.
- Legacy evidence is §3.4 of [the restart plan](../phaser4-restart-plan.md), pinned at `e9433f6b608ae6b2d95418615cce9cf17dadcf74` in `luminari-gurus/tactics-guru`. The local `ORIGINAL/` snapshot matches that commit: on 2026-10-09 the blob hashes of `TurnManager.gd`, `CombatResolver.gd`, `TargetingService.gd`, `BattleController.gd`, `BattleState.gd`, `UnitState.gd` and `BattleRng.gd` were compared with the GitHub contents API at the pin, and all matched. Line numbers below refer to that pin.

## 2. Scope

### In scope (maps to the four acceptance criteria)

1. **Turn order and lifecycle (AC 1).** Initiative rolled once at creation with the legacy tie-breaks; one move and one action per turn, in either order; Wait/end turn is the only way a turn ends. Every rejection is typed and atomic: no new state, no RNG draw, no flag change.
2. **d20 attacks (AC 2).** Attack bonus, AC, natural 1 and 20, height ±2, minimum damage, critical doubling. A pure, RNG-free preview; resolution draws from the snapshot's RNG only. Explicit tests at every boundary.
3. **HP, defeat and outcome (AC 3).** HP floor at 0, defeat, cell release, skip of defeated units, victory/defeat, each happening exactly once. No timers anywhere in the domain.
4. **Wait, restart and replay (AC 4).** End turn and restart return snapshots that pass `readBattleState`. Tests cover invalid target, range and an already-defeated actor, roll boundaries, and a full seeded battle recorded and replayed command by command.

### Out of scope (say so in the PR)

- Signatures (Guarded Strike, High Shot, Ember Burst), the Dex-save path, Guarded expiry, statuses: #8.
- AI choice and enemy-turn sequencing: #9.
- Session, input mode, animation lock, HUD, the restart button and the D7 seed choice: #10.
- Undo move (legacy `KEY_U`). It is not in the §3.4 baseline and #5 excluded it.
- Initiative tempo reordering, adjacency accuracy, typed damage and status immunities. §3.1 and §3.4 of the restart plan defer them, and the issue's out-of-scope list excludes tempo.
- Saves and resume; the real authored catalog (#29) as a dependency.
- Physical-device acceptance. This is a domain slice; nothing here runs on a phone.

## 3. Design decisions

### 3.0 Ablation pass (2026-10-09, before any code)

Each part of the first draft was checked against the four acceptance criteria and the repository rules: if it is left out, what fails? The text below already reflects the result.

- **LOS uses the legacy float formula, not an integer re-derivation (D-G).** The restart plan (§3.4 porting hazards) expects `Math.round` over the legacy lerp, proven by test vectors. Written in the same operation order, the JavaScript doubles are identical to Godot's, and `Math.round` equals `roundi` on non-negative values. The port is therefore bit-for-bit legacy, which drops the 208-pair divergence and the exhaustive float-oracle test the integer port needed.
- **Modules follow the issue's suggested paths.** The profile table lives in `combat.ts` (no `attacks.ts`); dispatch and replay live in `turns.ts` (no `dispatch.ts`). Neither `combat.ts` nor `grid.ts` imports `turns.ts`, so there is no cycle. Tests are `targeting`, `turns` and `combat`, as the issue suggests.
- **Profile fields that never vary are dropped (D-A).** `accuracyModifier`, `damageModifier`, `requiresLineOfSight` and `target` are the same in both rows; #8 adds each one with the first row that needs it.
- **Preview fields with no #7 consumer are dropped (D-F).** `hitNaturals`, `expectedDamageTwentieths`, `defeatsOnHit/Critical` and the per-term breakdown are AI scoring for #9. The preview keeps what the resolver uses.
- **The replay result type stays next to its function** in `turns.ts`, like `StateRead` and `ReplayRead` in `battle.ts`; `types.ts` is unchanged.
- **Kept, with the reason:**
  - the minimum-damage floor: the restart plan's targeting row says "Keep … minimum hit damage". It is tested like `test_combat_resolver.gd:116-130`, with power −5 on a fixture catalog, because power ≥ 0 in real content makes it unreachable.
  - `orderInitiative` exported: AC 1's tie-breaks need exact rolls.
  - `restartBattle`: AC 4.
  - The counter-exhaustion guards: without them an accepted command could return a snapshot `readBattleState` rejects.
  - `createBattle` re-reading its result: AC 4 asks for a valid fresh state, and the re-read makes that true by construction.

### D-A. Two ordinary attacks live in a typed domain table

`src/domain/combat.ts` holds a readonly, typed table of **attack profiles** and which unit definitions own them. It holds only the two ordinary d20 attacks from §3.4:

| Profile | Range | Base damage | Accuracy mod | Damage mod | LOS | Owned by | Source |
| -- | -- | -- | -- | -- | -- | -- | -- |
| `ability:basic_attack` | 1–1 | 2 | 0 | 0 | required | fighter, ranger, mage, goblin_grunt | `content/abilities/basic_attack.tres`; `CombatResolver.gd:33-38,1392-1408` |
| `ability:shortbow_shot` | 2–4 | 2 | 0 | 0 | required | goblin_archer | `CombatResolver.gd:49-50,634-640`; §3.4 stat table ("Slice abilities") |

Why both: the archer has no Basic Attack in the baseline, so a Basic-Attack-only #7 would give it a melee attack it should not have, or no attack at all. Both rows resolve through the same function, so the second row costs one table entry plus the LOS rule. #9 needs both rows, and the `blockedLos` and `abilityNotOwned` rejections are already declared. The resolver looks up a profile, not an ID switch. The profile shape is `{ rangeMin, rangeMax, baseDamage, owners }`, keyed by ability ID. Both rows have accuracy and damage modifiers of 0, require LOS and target an enemy unit, so those stay rules rather than fields until #8 brings a row that differs (§3.0).

If the reviewer prefers Shortbow Shot and LOS in #8 or #9, we drop the archer row and the LOS code in a single commit (see §7 item 2).

### D-B. Battle creation rolls initiative

`createBattle(mapId, seed, catalog)` in `src/domain/turns.ts` (catalog last, like every other domain API):

- Units come from the map's spawns, sorted by spawn ID, with `hp = maxHp` and both flags false. `rng = seedRng(seed)`.
- One d20 per unit **in ascending unit ID**, drawn with `rollDie(rng, D20_SIDES)`; `total = natural + dexterity` (`TurnManager.gd:8-27`).
- Order: higher total, then higher dexterity, then player before enemy, then lower ID (`TurnManager.gd:101-108`). IDs are unique, so this is a total order and the code does not rely on sort stability (§6 of the restart plan).
- The order is static for the battle; tempo reordering is deferred.
- Events: one `initiativeRolled` per unit in roll order, then `turnStarted { unitId: first, round: 1 }`.
- The result is the replay `initial` boundary that `readReplay` already expects: round 1, `commandCount` 0, nonzero RNG cursor. An unknown map or an invalid seed is rejected as `invalidState`, matching how `readBattleState` reports bad input. The built snapshot goes through `readBattleState` before it is returned, so content that cannot form a valid battle also returns `invalidState`.
- Pure helper `orderInitiative(entries)` is exported so the legacy ordering cases can be tested with exact rolls.

### D-C. Turn lifecycle: one move, one action, explicit end

- `hasMoved` and `hasActed` are independent. Move-then-attack and attack-then-move are both legal; a second move rejects `alreadyMoved` (already in #5), a second action rejects `alreadyActed` (`BattleController.gd:316-327,716-717`).
- Acting never ends the turn. `endTurn` (the legacy Wait) is the only way to end one, for **both sides** (`BattleController.gd:231-267`). Legacy ends an enemy turn after the AI's single command (`:1416-1445`); here #9 appends `endTurn` to what the AI chooses, so the domain has one rule for both sides.
- `endTurn` resolution emits `turnEnded { unitId }`. It then advances `activeIndex` by one at a time, adding 1 to `round` each time it wraps past the end, until it reaches a unit with `hp > 0` (`TurnManager.gd:90-94,119-137`). It clears that unit's two flags (`TurnManager.gd:64-73`), emits `turnStarted { unitId, round }` and increments `commandCount`. The ending unit's flags are left alone; they are cleared at its next turn start, so clearing happens in one place only.
- An ongoing battle has a living unit on each side, so the advance always finds a different living unit within one wrap. No loop guard is needed beyond that invariant, which `readBattleState` already enforces.
- `endTurn` draws no RNG. Wait with no move and no action is legal.
- An exhausted `commandCount` or `round` rejects as `invalidState` before anything changes (same as `moveUnit`).

### D-D. Attack resolution

`resolveAttack(state, command, catalog)` in `src/domain/combat.ts` handles `useAbility` for the profiles in D-A. It calls `previewAttack` (D-F) for every check and number, then rolls.

**Rejection order**, after the existing common checks in `previewCommand` (`malformedCommand`, `invalidState`, `battleOver`, `unknownUnit`, `unitDefeated`, `notActiveUnit`):

1. `alreadyActed`
2. `unknownAbility`: no profile with that ID
3. `abilityNotOwned`: the actor's definition does not own it
4. `wrongTargetKind`: a cell target for a unit-target attack
5. `missingTarget`: no unit with that ID in the snapshot
6. `targetDefeated`
7. `sameSide`: allies and self (legacy: `attacker.side == target.side`)
8. `outOfRange`: Manhattan distance outside `[rangeMin, rangeMax]`
9. `blockedLos`
10. exhausted `commandCount` → `invalidState`

Steps 6–9 follow `TargetingService.gd:28-49`.

**Numbers** (`CombatResolver.gd:1051-1060,1089-1111,1188-1194,1236-1260`):

- `heightModifier` = +2 when the attacker's cell elevation is higher than the target's, −2 when lower, else 0. It is not scaled by the difference.
- `bonus = accuracy + heightModifier`; `total = natural + bonus`. (Legacy also adds the ability's accuracy modifier, status and adjacency terms; all are 0 or deferred in this slice.)
- Natural 1 always misses. Natural 20 is always a critical hit. Otherwise `total >= armorClass` hits (equal hits).
- On a hit, damage is `max(1, baseDamage + power)`; a critical doubles it after the floor (`CombatResolver.gd:1249-1251`). `hp = max(0, hp − damage)`.
- Named constants in `constants.ts`: `HEIGHT_ATTACK_MODIFIER = 2`, `NATURAL_AUTO_MISS = 1`, `NATURAL_CRITICAL = D20_SIDES`, `MIN_HIT_DAMAGE = 1`, `CRITICAL_DAMAGE_MULTIPLIER = 2`.
- With the content bounds (`power ≥ 0`) and base damage 2, the 1-damage floor cannot be reached with real content. The restart plan keeps it, so it is implemented and tested as legacy does: a fixture catalog with power −5 (the domain trusts its catalog; bounds are the content validator's job).

**RNG.** An accepted attack calls `rollDie(state.rng, D20_SIDES)` exactly once. The new RNG state appears only in the returned snapshot.

**Effects and events.** The actor gets `hasActed = true`; `hasMoved` is unchanged; `commandCount + 1`. Events in order: `abilityUsed`, then `attackRolled { natural, bonus, total, armorClass, result }`. On a hit or critical, `damaged { unitId: target, damage, hp }` follows. When HP reaches 0, `defeated` follows. When a side runs out of living units, `battleEnded` follows.

### D-E. Defeat and outcome happen once

- A unit at 0 HP is defeated. It stays in `units` and `initiative` at its last cell. Occupancy derives from `hp > 0` (#5), so the cell is free at once, for movement and for other units' attacks.
- Outcome is evaluated only after HP changes, which in #7 means after an attack. No living player is `playerLoss`; otherwise no living enemy is `playerWin` (`BattleController.gd:1910-1930`). A single-target attack cannot empty both sides, so the order is only fidelity.
- After that, every command rejects `battleOver` via the existing common check, so `battleEnded` cannot repeat and the turn does not advance. `activeIndex` stays on the attacker.
- "Exactly once" is tested as: one `defeated` per unit across a whole replay, one `battleEnded`, no command accepted after it, and a defeated unit never becoming active.

### D-F. Preview shares the resolver's rules

`previewAttack(state, command, catalog)` runs every check in D-D except the counter guard, draws no RNG and changes nothing. On success it returns the isolated `command` plus integers only: `bonus`, `armorClass`, `damage` and `criticalDamage`.

`resolveAttack` calls `previewAttack` first, so legality and numbers cannot drift between the two. Hit chance and expected damage (`CombatResolver.gd:1114-1171`) are AI scoring and belong to #9, which can derive them from these four integers (§3.0). #9 evaluates attacks from other cells by previewing on the snapshot that `moveUnit` returns, so no "from cell" variant is needed.

### D-G. Targeting: Manhattan range and the legacy LOS sampling

`src/domain/targeting.ts`:

- Range is the Manhattan distance between cells (`TargetingService.gd:135-136`).
- LOS samples the cells strictly between attacker and target. Let `steps = max(|dx|, |dy|)`. For each `step` in `1 … steps−1`, legacy takes `roundi(lerpf(from, to, step/steps))` per axis, drops the endpoints and deduplicates (`TargetingService.gd:79-107`). Only terrain with `blocksLineOfSight` blocks; units and height never do.
- The port keeps the legacy arithmetic: `Math.round(from + (to − from) * (step / steps))`, in the same operation order as Godot's `lerpf`, so the doubles are identical. Every value is non-negative, where `Math.round` (half up) equals `roundi` (half away from zero). This is the approach the restart plan's porting-hazards list expects, proven by vectors.
- Pinned vectors: all eight directions, plus the half-way cases. `(0,0)→(2,1)` passes `(1,1)`; `(0,1)→(2,0)` passes `(1,1)`; `(0,0)→(4,1)` passes `(1,0),(2,1),(3,1)`. Also pinned: `(0,0)→(11,22)` at step 15, where the float lerp gives 7.499999999999999 and legacy samples x = 7 rather than the exact 7.5 → 8. This proves the port reproduces legacy rounding rather than exact geometry.
- Why not an integer formula: it was drafted first, and a scratch comparison (2026-10-09) found it disagrees with legacy on 208 of the 1,048,576 cell pairs of a 32 × 32 grid (lines of 22–28 steps). No slice range reaches those lines, but the float port matches legacy everywhere for less proof (§3.0).

### D-H. Dispatch and replay in `turns.ts`

`src/domain/turns.ts` (§3.0):

- `dispatch(state, command, catalog): CommandResult` routes `move` to `moveUnit`, `useAbility` to `resolveAttack` and `endTurn` to `endTurn`. A malformed command still returns `malformedCommand` through the shared check.
- `replayBattle(input, catalog)` validates the envelope with `readReplay`, then folds `dispatch` over the commands. It returns `{ ok: true, state, events }` with all events in order (initiative events are not repeated; they belong to creation). A bad envelope returns `readReplay`'s `invalidReplay`; a command that does not apply returns `{ ok: false, reason: 'invalidReplay', index, rejection }` naming the first one. The result type sits next to the function.
- `turns.ts` imports `grid.ts` and `combat.ts`; neither of them, nor `battle.ts`, imports `turns.ts`, so there is no cycle.

### D-I. Restart, and D7 left to the session

`restartBattle(state, catalog)` reads the snapshot (mid-battle or finished) and returns `createBattle(state.mapId, state.seed, catalog)`. Legacy restart reloads with the same seed (`BattleController.gd:124,1336-1346`), so the same inputs replay the same dice. A new-seed restart is just `createBattle` with a seed the session supplies; the domain never makes entropy. D7 ("replay the same seed or roll a new one") stays open for #10, and the domain supports both without a flag. The PR says so and does not claim D7 is decided.

### D-J. `RULES_VERSION` stays 1

#5 added movement rules without a bump. No replay could have been executed before #7, because dispatch did not exist. Bump once the slice ships. Flag this in the PR for the reviewer.

## 4. Work breakdown

Each increment starts with a failing spec, run and recorded before the implementation exists. One commit per increment, pushed when it lands; §9 records the SHA and the RED/GREEN evidence. Test files follow the issue's suggested names.

### [x] Increment 1: targeting (`feat`)

`tests/unit/targeting.test.ts` (6 tests), then `src/domain/targeting.ts` (D-G): `manhattanDistance`, `lineCellsBetween`, `lineOfSightBlocked(catalog, mapId, from, to)`.

- Manhattan distance; the LOS vectors in the eight directions, the half-way cases, and the `(0,0)→(11,22)` legacy-rounding pin.
- A sampled sweep over the 32 × 32 content bounds shows each line yields `steps − 1` distinct cells and never an endpoint. That is why the port drops legacy's dedup and endpoint checks.
- Blocking terrain between the cells blocks. Blocking terrain on an endpoint, an adjacent pair, height 4 and non-blocking terrain do not block. On `(0,0)→(2,1)` the half-way rounding decides which cell matters.
- Moved to increment 3, because they need profiles and units: the `rangeMin−1 … rangeMax+1` boundaries (as `outOfRange`) and "a unit between does not block" (a shortbow shot past a living unit).

### [x] Increment 2: creation and turns (`feat`)

`tests/unit/turns.test.ts` (8 tests), then `src/domain/turns.ts` (D-B, D-C, D-I): `orderInitiative`, `createBattle`, `endTurn`, `restartBattle`.

- `orderInitiative`: the four `test_turn_manager.gd:43-95` cases (total; Dexterity tie; player-side tie; ID tie), each also with reversed input.
- `createBattle`:
  - units come from spawns listed out of ID order;
  - the naturals equal an independent `rollDie` sequence, and the returned RNG equals the RNG after those draws;
  - events come in roll order, then `turnStarted`;
  - the result passes `readBattleState` and `readReplay`;
  - the same seed gives an equal result and a different seed gives a different RNG;
  - `Math.random` and `Date.now` throw throughout;
  - a seed outside uint32 and an unknown map (including `constructor`) reject.
- `endTurn`:
  - Wait with no move or action; the next unit's flags are cleared and the ending unit's flags are kept; the RNG is untouched; the frozen input is unchanged;
  - the wrap adds 1 to `round`; a defeated unit is skipped, including across the wrap (round added once);
  - rejects `notActiveUnit`, `unknownUnit`, `malformedCommand` (a move, an extra field), `battleOver`, an exhausted `commandCount` and an exhausted `round`. An exhausted `round` with no wrap is accepted.
- `restartBattle`: from a mid-battle and from a finished snapshot it equals the seed's `createBattle`; an invalid snapshot returns `invalidState`.

### [ ] Increment 3: combat (`feat`)

RED: `tests/unit/combat.test.ts`. Roll and damage cases, re-derived from `test_combat_resolver.gd:66-155` and resolved through the real snapshot path. To get a chosen natural, the fixture state's RNG comes from a seed found by scanning `rollDie(seedRng(s), 20)`; the RNG is never stubbed.

- Natural 10 with +4 against AC 14 hits for 5 (base 2 + power 3); natural 9 misses (total 13).
- Total equal to AC hits; AC − 1 misses.
- Natural 1 at accuracy 20 against AC 1 misses.
- Natural 20 at accuracy −10 against AC 30 is a critical for 10.
- Floor and doubling order with power −5: a hit deals 1, a critical deals 2 (`test_combat_resolver.gd:116-130`).
- Height (`test_m4_height_attack.gd:21-74`):
  - +2, −2 and 0, with an elevation difference of 4 still giving exactly ±2;
  - natural 10 with +0 against AC 12 hits from above and misses from below.
- `outOfRange` at `rangeMin − 1` and `rangeMax + 1` for both profiles, and acceptance at `rangeMin` and `rangeMax`; a shortbow shot past a living unit is not blocked.
- Every rejection in the D-D order, each leaving the input unchanged and drawing nothing:
  - `abilityNotOwned`: the archer using `basic_attack`, and the grunt using `shortbow_shot`;
  - `sameSide`: an ally and self;
  - `blockedLos`: a shortbow over forest;
  - `targetDefeated`: a defeated target.
- Accepted attack:
  - draws exactly one d20 (the RNG equals an independent `rollDie` on the same state);
  - events in order; `hasActed` set;
  - a move after the attack still accepted; a second attack rejected.
- Defeat: one `defeated` event, HP floored at 0, the cell released (an ally can move into it), the unit skipped by `endTurn`, and an attack on it rejected.
- Outcome: the last enemy down gives `playerWin` and exactly one `battleEnded`, and every later command rejects `battleOver`. The mirror case with an enemy attacker gives `playerLoss`.
- `previewAttack` returns the numbers resolution uses, is pure (frozen input, throwing `Math.random`), and rejects exactly as resolution does.

Then `src/domain/combat.ts` (D-A, D-D, D-E, D-F).

### [ ] Increment 4: dispatch and replay (`feat`)

RED: more cases in `tests/unit/turns.test.ts`:

- routing for each command type, and a malformed command;
- a **full seeded battle**: fighter and grunt on a small synthetic map, created with `createBattle(seed)`, moving into reach and then alternating attack and `endTurn` until one side falls. The commands are recorded into a `Replay`; `replayBattle` reproduces the identical final state and event stream, also after a JSON round trip;
- a tampered command mid-log fails with its index;
- the whole-replay checks: one `battleEnded`, one `defeated` per fallen unit, and a defeated unit never active.

Then `dispatch` and `replayBattle` in `src/domain/turns.ts` (D-H).

### [ ] Increment 5: task note and PR (`docs`)

- Add `docs/turn-flow-combat.md` in the style of `docs/battle-foundation.md` and `docs/grid-movement.md`: the rules, the rejection order, the legacy citations, the verification commands, and what is not claimed.
- Update the `readReplay` comment in `battle.ts`, the `Replay` comment in `types.ts`, and the "#7" forward references in `battle-foundation.md` and `grid-movement.md`, so they point at `turns.ts`.
- Run the §5 gate, push, and open the PR (§8). Do not delete this plan in the PR; it goes at close-out, as with #35.

## 5. Validation gate (run before the PR, name each in the PR)

| Check | Command | Expectation |
| -- | -- | -- |
| RED evidence | each increment's focused file before its module exists | fails on the missing import, recorded per increment |
| Focused | `npm run test:unit -- tests/unit/targeting.test.ts tests/unit/turns.test.ts tests/unit/combat.test.ts` | all pass |
| Full unit | `npm run test:unit` | the 150 baseline tests plus the new ones, all pass |
| Types | `npm run typecheck` | app and ES2022-only domain/content checks pass |
| Build | `npm run build` | passes; the existing Phaser chunk-size warning is the only warning |
| Browser regressions | `npm test` (Playwright Chromium on this host) | the existing 99 pass; no browser code changes |
| Whitespace | `git diff --check` | clean |

There is no CI besides the Cloudflare Pages preview. The local runs are the evidence.

## 6. Hand-off to the next issues

- **#8** gets the profile shape and the single attack path. It adds three signatures as profiles or moves the table into its catalog, keeping the IDs `ability:basic_attack` and `ability:shortbow_shot`. It adds Guarded's AC term as a new item in the breakdown, not a second formula. D5, D6 and D11 stay with it.
- **#9** gets `previewMovement`, `previewAttack` (integer scores), `dispatch` and the explicit `endTurn`. It appends `endTurn` to each enemy decision. Replays record AI commands; they do not recompute them.
- **#10** gets `createBattle`, `restartBattle`, the event stream to animate, and D7. Events describe what happened. The session animates them and never decides order or outcome. Defeated units stay in the snapshot at their last cell, so the renderer must hide or mark them.
- **#11** gets nothing device-specific from #7.

## 7. Risks and open points

1. **D7 is open.** The domain supports same-seed and new-seed restart; #10 picks. Legacy behaviour (same seed) is the documented default, not a decision.
2. **Shortbow Shot and LOS in #7 (D-A)** may read as scope growth. Ask dubstylee in the PR. Fallback: drop the archer row and `targeting.ts`'s LOS function in a single commit, leaving the archer without an attack until #8/#9.
3. **Ability IDs become contract.** `ability:basic_attack` and `ability:shortbow_shot` appear in replays, so #8's catalog must keep them.
4. **`RULES_VERSION` stays 1 (D-J).** The reviewer may want a bump; it is a one-line change plus fixture updates.
5. **Enemy turns need an explicit `endTurn`.** This differs from the legacy controller, which ends the enemy turn itself. The domain rule is the same for both sides, which is simpler to replay; #9 must append the command.
6. **PR #43 merge order.** If it merges first, add one smoke test that runs `createBattle` on the real forest-ruins map (six units, valid initiative, `readReplay` accepts it). Optional, not a dependency.
7. **The LOS port keeps legacy float rounding (D-G).** It reproduces legacy exactly, including the rare lines (22+ steps) where the float lerp rounds an exact half down. If a reviewer prefers exact geometry instead, the integer formula `floor((2·(from·steps + delta·step) + steps)/(2·steps))` is a one-function swap; it differs from legacy only on lines no slice range reaches. Shortbow Shot (range 2–4) does reach exact half-way lines such as `(0,0)→(2,1)`, where both rules agree, so the pinned vectors matter from #7 on.
8. **Shared checkout.** Another session may commit to this working tree. Re-check `git log -1` and `git status` in the same command as each commit, and stage paths explicitly. A worktree for the branch avoids the problem entirely.

## 8. Branch and process

- Branch: `issue-7-turn-flow-combat`, created 2026-10-09 with `gh issue develop 7 --base main --name issue-7-turn-flow-combat --checkout`. It is on the issue's Development panel, so the merge closes #7. That is fine, because every acceptance box must be verified before the PR is marked ready. If `main` moves before the PR, merge `main` into the branch rather than rebasing.
- No `Closes` line and no completion claim until all four acceptance criteria are verified (issue guardrail). Mark each box with its test names in the PR body.
- Commit and push only when asked. Review follow-up per the usual rules: a RED spec first, one fix commit per finding, inline replies with the SHA, resolved threads, left ready to merge. Merge with a merge commit; keep the branch.
- Request review from dubstylee, who implemented #4 and #5 and filed #8–#10, the issues that consume this API.

## 9. Updates

### 2026-10-09: plan written

#7 assigned to us with a handling comment. The plan was written from `main` `73d17c0` (unit baseline 150/150) and the legacy snapshot verified against `e9433f6`. Branch `issue-7-turn-flow-combat` created from `73d17c0` and linked on the issue; this plan is its first commit. No code yet.

### 2026-10-09: ablation pass

Before any code, the plan was simplified against the acceptance criteria (§3.0). The changes: LOS keeps the legacy float rounding; the modules follow the issue's paths (`targeting`, `turns`, `combat`); profile fields and preview fields with no #7 consumer were dropped; the replay result type moved next to its function. No acceptance criterion lost a test. Next: increment 1.

### 2026-10-09: increment 1 (targeting)

RED: `npm run test:unit -- tests/unit/targeting.test.ts` failed on the missing `src/domain/targeting` import (no tests ran). GREEN: 6/6 pass. The domain-boundary tests and `npm run typecheck` pass.

### 2026-10-09: increment 2 (creation and turns)

RED: `npm run test:unit -- tests/unit/turns.test.ts` failed with `Cannot find module '../../src/domain/turns'`. GREEN: 8/8 pass. The first `npm run typecheck` caught a test-only lookup table missing `mage` (TS7053). With that fixed, the type-check passes.
