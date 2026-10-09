# Turn flow and combat (#7)

`src/domain/turns.ts`, `src/domain/combat.ts` and `src/domain/targeting.ts` add battle creation, the turn lifecycle, ordinary d20 attacks, defeat, the battle outcome, command dispatch and replay. Like #4 and #5, every API takes an untrusted snapshot and command plus a trusted, already validated catalog. It returns either one fresh snapshot with its events, or a typed rejection that changes nothing and draws nothing. Only two things touch the RNG: initiative at creation and the single d20 of an accepted attack, both through `rollDie` on the snapshot's own state.

Order, defeat and outcome are decided when a command resolves. Legacy deferred the outcome check while combat or movement animated ([BattleController.gd:1904-1908](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/BattleController.gd#L1904-L1908)). Here the session (#10) only animates the events it is given, and timer APIs do not compile in `src/domain` (ES2022-only `tsconfig.domain.json`).

Legacy links below are pinned at `e9433f6b608ae6b2d95418615cce9cf17dadcf74` of `luminari-gurus/tactics-guru`.

## Creation, initiative and restart

`createBattle(mapId, seed, catalog)` places one unit per map spawn, sorted by spawn ID, at full HP with both flags clear. It rolls one d20 per unit in ID order and adds the unit's Dexterity ([TurnManager.gd:8-27](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TurnManager.gd#L8-L27)).

`orderInitiative` sorts by total, then Dexterity, then player before enemy, then lower ID ([TurnManager.gd:101-108](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TurnManager.gd#L101-L108)). IDs are unique, so this is a total order and does not rely on sort stability. The order is fixed for the battle; tempo reordering is not included.

Creation emits one `initiativeRolled` per unit in roll order, then `turnStarted` for round 1. The result is checked by `readBattleState` before it is returned, and it is the round-one, command-count-zero `initial` boundary a replay starts from. An unknown map or a seed outside uint32 is `invalidState`.

**Restart is a new battle with a new seed** (D7, decided by dubstylee on 2026-10-09). The session calls `createBattle` again with the same map and a seed it supplies, because the domain never makes entropy. Legacy restart reloaded with the same seed ([BattleController.gd:124](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/BattleController.gd#L124)), so a retry dealt the same dice in the same order; that is deliberately not kept. A seed override for testing still reproduces a battle, because the session passes the override as the seed.

Resuming a saved battle is different: the snapshot carries the RNG state, so play continues from the next draw. Saves are a follow-up.

## Turns

Each turn allows one move and one action, in either order. Acting never ends a turn: `endTurn` (the legacy Wait) is the only way, for both sides, and Wait with no move or action is legal. Enemy turns end the same way. The legacy controller ended an enemy turn itself after its AI's command. Here the AI's command list (#9) ends with `endTurn`, so replays record every turn end and follow one rule for both sides.

`endTurn` emits `turnEnded`, then steps through the initiative order, skipping units at 0 HP and adding one round each time it wraps. It clears the next unit's `hasMoved` and `hasActed` and emits `turnStarted` ([TurnManager.gd:64-73,90-94,119-137](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TurnManager.gd#L64-L137)). An ongoing battle has a living unit on each side, so it stops within one wrap. It draws no RNG. An exhausted `commandCount` or `round` is `invalidState`.

## Attacks

`combat.ts` holds the slice's two ordinary attacks. Both need line of sight, target one enemy unit and add no accuracy or damage modifier of their own. Shortbow Shot and line of sight belong to this slice because the archer has no other attack; without them a full battle would have an enemy that can only move and Wait. The IDs are recorded in replays, so they are contract: #8's ability catalog keeps them.

| Ability | Range | Base damage | Owned by |
| -- | -- | -- | -- |
| `ability:basic_attack` | 1 | 2 | fighter, ranger, mage, goblin_grunt |
| `ability:shortbow_shot` | 2–4 | 2 | goblin_archer |

After the shared intent checks (`malformedCommand`, `invalidState`, `battleOver`, `unknownUnit`, `unitDefeated`, `notActiveUnit`), an attack rejects in this order: `alreadyActed`, `unknownAbility`, `abilityNotOwned`, `wrongTargetKind` (a cell target), `missingTarget`, `targetDefeated`, `sameSide` (allies and self), `outOfRange`, `blockedLos`. The target checks follow [TargetingService.gd:28-49](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TargetingService.gd#L28-L49).

An exhausted command counter or RNG cursor is then `invalidState`. That includes a cursor one draw short of the limit when that draw needs a rejection-sampling redraw, so a crafted snapshot cannot make resolution throw.

Range is Manhattan distance. Line of sight samples the cells strictly between attacker and target the way [TargetingService.gd:91-107](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TargetingService.gd#L91-L107) does: the same float lerp, so the same doubles. `Math.round` equals Godot's `roundi` on these non-negative values, so exact halves round up, and `(0,0)→(2,1)` passes through `(1,1)`.

The port reproduces legacy rounding exactly, including the rare long line where the double lerp lands just under a half: on `(0,0)→(11,22)` legacy samples x = 7 at step 15, not the exact 7.5 → 8. Only terrain marked `blocksLineOfSight` blocks; units and height never do.

The numbers ([CombatResolver.gd:1051-1060,1236-1260](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd#L1236-L1260)):

- **Bonus:** accuracy plus a flat height modifier. The modifier is +2 when the attacker's cell is higher and −2 when lower, whatever the difference.
- **Hit:** natural 1 always misses and natural 20 is always a critical; otherwise a total of natural plus bonus at least equal to AC hits.
- **Damage:** a hit deals `max(1, base damage + power)`, and a critical doubles that after the floor. With real content (power ≥ 0) the floor is unreachable; it is kept as the legacy rule and tested with power −5.
- **HP:** HP never drops below 0.

`previewAttack` performs every check and returns `targetId`, `bonus`, `armorClass`, `damage` and `criticalDamage` without touching the RNG. `resolveAttack` runs the preview, then draws exactly one d20. Hit chance and expected damage are left to #9's AI scoring, which can derive them from these integers.

An accepted attack sets `hasActed`, leaves `hasMoved` alone and emits `abilityUsed` and `attackRolled`. On a hit it also emits `damaged`. When the target reaches 0 HP it emits `defeated`, and when a side has no living units it emits `battleEnded`.

## Defeat and outcome

A unit at 0 HP stays in the snapshot and initiative at its last cell. Occupancy derives from living units (#5), so its cell is free at once. `endTurn` skips it, and attacks on it reject `targetDefeated`.

The outcome is checked after each attack: no living player is `playerLoss`, otherwise no living enemy is `playerWin` ([BattleController.gd:1910-1930](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/BattleController.gd#L1910-L1930)). After that, every command rejects `battleOver` through the shared check, so `defeated` and `battleEnded` each happen once and the active unit stays on the attacker.

## Dispatch and replay

`dispatch(state, command, catalog)` routes `move` to `moveUnit`, `useAbility` to `resolveAttack` and `endTurn` to `endTurn`. It reads the command type only after the shared intent check.

`replayBattle(replay, catalog)` validates the envelope with `readReplay`. It then rebuilds `createBattle(initial.mapId, initial.seed)` and rejects the replay unless `initial` matches it exactly, compared as sorted-key JSON so key order does not matter. A replay therefore cannot start from chosen HP, dice, initiative, flags or outcome. Then it re-executes the commands. It returns the final snapshot and every event in order; creation's initiative events are not repeated. A bad envelope is `invalidReplay`. A command that does not apply is `invalidReplay` with its `index` and the `rejection`. AI commands are recorded, not recomputed.

Each command re-validates its snapshot against the content version. `contentVersion` hashes each catalog object once, so the longest accepted log (10 000 Waits by six units on a 32 × 32 map) replays in about 0.5 s on the development host; before the cache it took about 89 s. Catalogs are immutable: to change content, build a new catalog rather than editing one that has been hashed.

## Not included

- Signatures, the Dex-save path, statuses and Guarded: #8.
- Enemy AI: #9.
- The session, input, HUD, animation, the restart button and where its new seed comes from: #10.
- Undo move, initiative tempo, adjacency accuracy, typed damage, immunities and saves.

`RULES_VERSION` stays 1. No replay or save has been recorded outside tests, so a bump would protect nothing. Once #10 records replays, bump it whenever a rules change would make a recorded replay play out differently.

## Verification commands

- Focused: `npm run test:unit -- tests/unit/targeting.test.ts tests/unit/turns.test.ts tests/unit/combat.test.ts`
- Full unit suite: `npm run test:unit`
- Strict application and domain checks: `npm run typecheck`
- Production build: `npm run build`
- Existing browser regressions: `npm test` (build first; the config serves `dist`)
- Whitespace: `git diff --check`

Each focused file was written first and failed on its missing module, or for dispatch on the missing export, before the implementation landed.

The specs pin the legacy cases from `test_turn_manager.gd`, `test_combat_resolver.gd` and `test_m4_height_attack.gd`. They also cover every rejection in order, the roll and range boundaries, and a scripted 2v2 battle created from a seed and replayed command by command to the identical state and events. Domain tests run with `Math.random` and `Date.now` stubbed to throw. This slice is domain-only: it does not wire a playable battle, and it makes no claim about physical devices.
