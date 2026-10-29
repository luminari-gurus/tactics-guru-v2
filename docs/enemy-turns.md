# Enemy turns (#9)

`planEnemyTurn(snapshot, unitId, catalog)` chooses commands for the living active enemy. It accepts equivalent unit-array permutations by sorting a copied array before the shared snapshot checks; it leaves inputs and RNG unchanged. Before copying or sorting, it validates the original record/array shapes and ID descriptors so hidden fields, custom prototypes and accessors reject without evaluating getters. Only unit order is normalized; all remaining snapshot checks stay with the shared reader. Shared intent rejections are preserved; an active player returns `notEnemyUnit`. The catalog must be trusted and immutable, as for other domain APIs.

Candidates use `previewMovement`, `moveUnit` snapshots and shared attack/support
previews. Owned ordinary attacks retain summed damage across the 20 d20 faces,
including natural 1 misses and natural 20 criticals. The preview supplies all
accuracy, AC, height and damage modifiers. Goblin Shaman also considers Heal
Goblin (20 × applied healing) and Weakening Hex (failed-save faces × max(1, target
effective accuracy + power)). Zero healing, already-Weakened and immune Hex
targets are excluded without drawing RNG. Taunt restricts offensive targets;
allied healing remains legal. Pin/Snare permit a legal in-place action or Wait.

Ability ordering is higher score, lower movement cost, lower target ID, lexical
ability ID, then cell y/x. Staying in place costs zero. Without an immediate
useful action, choose a reachable legal action-position goal by route cost,
target ID, ability ID and y/x, then a legal move that strictly reduces remaining
route cost. Useful support targets participate in those goals. If no improving
move exists, Wait. Spent budgets prohibit a second move/action. Dead targets are
ignored and living occupancy remains authoritative.

Route costs allow a detour that temporarily increases Manhattan distance. There
are no difficulty profiles, configurable weights, hazard strategy or multi-turn
lookahead. Domain execution uses no browser globals, timers or external entropy.

Plans order optional movement, optional ability, then Wait. After state/actor
validation, `hasActed: true` returns only Wait, even if `hasMoved: false`: an
ability commits the final decision before Wait. Accepted nonterminal snapshots
reconstruct the existing session queue without storing it. The domain's legal
move-after-action command remains available; enemy planning preserves its stricter
one-decision policy. Ended or command-exhausted snapshots still reject.

## Execution and #10 hand-off

`runEnemyTurn(snapshot, unitId, catalog)` plans once, dispatches sequentially and attempts at most one move, one ability and one Wait. A terminal attack stops execution before Wait. Success returns `state`, accepted `commands` and ordered `events`. Rejection returns `ok: false`, a typed `reason`, the last valid `state`, and the accepted prefix of commands/events; malformed snapshots return `state: undefined`. The rejected command itself changes nothing, and there are no retries or automatic turn advances. A move accepted before an ability rejection stays explicitly represented in the result.

The session supplies the active initiative unit ID, adopts the returned state when present, records only accepted commands for replay, and animates the returned events. It handles rejection explicitly rather than retrying a partially spent turn. Input locks and animation timing do not decide rules. For per-command animation the session uses `planEnemyTurn` and dispatches each command itself, stopping on rejection or terminal outcome exactly as the runner does. The domain API remains independent of Phaser and the HUD.

## Verification

`npm run test:unit -- tests/unit/ai.test.ts` covers candidate ordering, melee/archer attacks, natural roll boundaries, height, line of sight, ownership, dead units, occupancy/chokepoints, unreachable targets, spent budgets, terminal attacks, accepted prefixes and exhausted RNG/command/round limits. Shaman cases cover useful healing/Hex scores, deterministic ties, Taunt, Pin/Snare, and approaching an injured ally opposite ordinary attack goals. Three authored battles (seeds 0, 1 and 42) run to completion twice with a fixed player policy, then replay accepted commands to identical states and events. `Math.random` and `Date.now` throw during this simulation. Browser/device-emulation evidence is retained in the [task-specific QA](qa/issue-166/README.md).
