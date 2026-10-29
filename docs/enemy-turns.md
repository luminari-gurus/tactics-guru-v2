# Enemy turns (#9)

Current source reference: `b343ab02ae033a57f8c5f613f07883764f0752c0`. Historical evidence retains its original revision and test limits.

`planEnemyTurn(snapshot, unitId, catalog)` chooses commands for the living active enemy. It accepts equivalent unit-array permutations by sorting a copied array before the shared snapshot checks; it leaves inputs and RNG unchanged. Before copying or sorting, it validates the original record/array shapes and ID descriptors so hidden fields, custom prototypes and accessors reject without evaluating getters. Only unit order is normalized; all remaining snapshot checks stay with the shared reader. Shared intent rejections are preserved; an active player returns `notEnemyUnit`. The catalog must be trusted and immutable, as for other domain APIs.

Candidates use `previewMovement`, `moveUnit` snapshots and `previewAttack`. Owned ordinary attacks only are considered. Expected damage is the sum of damage across the 20 d20 faces, including natural 1 misses and natural 20 criticals. The preview supplies all accuracy, AC, height and damage modifiers.

Attack ordering is higher expected damage, lower movement cost, lower target ID, lexical ability ID, then cell y/x. Staying in place costs zero. When no attack exists, find reachable firing cells that satisfy the owned attack’s range and line of sight. Choose a goal by route cost, target ID, ability ID and cell y/x, then move to a reachable position that reduces the remaining route cost; otherwise Wait. Living occupancy, movement costs and elevation constrain the route. A living Taunt source restricts eligible targets. Spent move/action budgets prohibit a second move/action. Dead targets are ignored and living occupancy remains authoritative.

The route can initially move away from a target to reach a legal firing position. It has no difficulty profiles, hazard strategy or multi-turn lookahead. Domain execution uses no browser globals, timers or external entropy.

Plans order optional movement, optional attack, then Wait. After state/actor validation, `hasActed: true` returns only Wait, even if `hasMoved: false`: an attack has already committed the final decision before Wait. After an accepted move, replanning from the new origin selects the same attack or Wait as the original plan suffix. Thus accepted nonterminal snapshots can reconstruct the existing session queue without storing it. This policy does not remove the domain's legal move-after-attack command; it preserves the enemy session's existing choices. Ended or command-exhausted snapshots still reject through shared validation.

## Execution and #10 hand-off

`runEnemyTurn(snapshot, unitId, catalog)` plans once, dispatches sequentially and attempts at most one move, one attack and one Wait. An attack ending the battle stops execution before Wait. Success returns `state`, accepted `commands` and ordered `events`. Rejection returns `ok: false`, a typed `reason`, the last valid `state`, and the accepted prefix of commands/events; malformed snapshots return `state: undefined`. The rejected command itself changes nothing, and there are no retries or automatic turn advances. A move accepted before an attack rejection stays explicitly represented in the result.

The session supplies the active initiative unit ID, adopts the returned state when present, records only accepted commands for replay, and animates the returned events. It handles rejection explicitly rather than retrying a partially spent turn. Input locks and animation timing do not decide rules. For per-command animation the session can use `planEnemyTurn` and dispatch each command itself, stopping on rejection or terminal outcome exactly as the runner does. The production battle session integrates this planner with the renderer and HUD.

## Historical verification (#9)

`npm run test:unit -- tests/unit/ai.test.ts` covers candidate ordering, melee/archer attacks, natural roll boundaries, height, line of sight, ownership, dead units, occupancy/chokepoints, unreachable targets, spent budgets, terminal attacks, accepted prefixes and exhausted RNG/command/round limits. Three authored battles (seeds 0, 1 and 42) run to completion twice with a fixed player policy, then replay accepted commands to identical states and events. `Math.random` and `Date.now` throw during this simulation. These are historical domain checks; #11 is now closed and its original device evidence retains its recorded limits.
