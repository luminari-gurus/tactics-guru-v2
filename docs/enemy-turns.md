# Enemy turns (#9)

`planEnemyTurn(snapshot, unitId, catalog)` chooses commands for the living active enemy. It accepts equivalent unit-array permutations by sorting a copied array before the shared snapshot checks; it leaves inputs and RNG unchanged. Shared intent rejections are preserved; an active player returns `notEnemyUnit`. The catalog must be trusted and immutable, as for other domain APIs.

Candidates use `previewMovement`, `moveUnit` snapshots and `previewAttack`. Owned ordinary attacks only are considered. Expected damage is the sum of damage across the 20 d20 faces, including natural 1 misses and natural 20 criticals. The preview supplies all accuracy, AC, height and damage modifiers.

Attack ordering is higher expected damage, lower movement cost, lower target ID, lexical ability ID, then cell y/x. Staying in place costs zero. When no attack exists, choose the reachable cell with lowest Manhattan distance to the nearest living player, then movement cost, target ID and cell y/x. Move only if distance strictly decreases; otherwise Wait. Spent move/action budgets prohibit a second move/action. Dead targets are ignored and living occupancy remains authoritative.

This greedy policy can wait at obstacles requiring a temporary move away from the target. It has no difficulty profiles, signature evaluator, hazard strategy or multi-turn lookahead. Domain execution uses no browser globals, timers or external entropy.

## Execution and #10 hand-off

`runEnemyTurn(snapshot, unitId, catalog)` plans once, dispatches sequentially and attempts at most one move, one attack and one Wait. An attack ending the battle stops execution before Wait. Success returns `state`, accepted `commands` and ordered `events`. Rejection returns `ok: false`, a typed `reason`, the last valid `state`, and the accepted prefix of commands/events; malformed snapshots return `state: undefined`. The rejected command itself changes nothing, and there are no retries or automatic turn advances. A move accepted before an attack rejection stays explicitly represented in the result.

The session supplies the active initiative unit ID, adopts the returned state when present, records only accepted commands for replay, and animates the returned events. It handles rejection explicitly rather than retrying a partially spent turn. Input locks and animation timing do not decide rules. For per-command animation the session can use `planEnemyTurn` and dispatch each command itself, stopping on rejection or terminal outcome exactly as the runner does. No Phaser or HUD integration is included here.

## Verification

`npm run test:unit -- tests/unit/ai.test.ts` covers candidate ordering, melee/archer attacks, natural roll boundaries, height, line of sight, ownership, dead units, occupancy/chokepoints, unreachable targets, spent budgets, terminal attacks, accepted prefixes and exhausted RNG/command/round limits. Three authored battles (seeds 0, 1 and 42) run to completion twice with a fixed player policy, then replay accepted commands to identical states and events. `Math.random` and `Date.now` throw during this simulation. These are domain checks; device acceptance remains #11.
