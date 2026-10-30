# Battle foundation (#4)

Source reference: `b343ab02ae033a57f8c5f613f07883764f0752c0`. Original implementation and verification notes describe their named historical slices; see [current gameplay overview](../README.md) and linked contracts for later integration.

`src/domain` is pure TypeScript checked separately with ES2022 libraries and no DOM or Node ambient types. It imports only the merged content contract and other domain modules. Unit tests guard imports and ambient entropy, and exercise the APIs with `Math.random`/`Date.now` disabled. The existing Node Vitest unit script is reused; Playwright remains a separate configured runner.

## State boundary

`readBattleState(unknown, catalog)` returns either a fresh, deeply isolated snapshot or `invalidState`. The catalog parameter must already be validated by its producer (the [content-definition validator](../src/content/validate.ts) is provided by #28); this module does not certify arbitrary content JSON. The synthetic two-cell unit fixture uses the merged `MapRecord`, IDs, stats and catalog types and is checked at this runtime boundary.

Snapshots contain format/rules/content/RNG identities, supplied seed, explicit random state, map reference, sorted runtime units, fixed initiative order, active index, round, outcome and accepted-command count. Stats/terrain remain in content; runtime HP and flags remain in state. Units must match their map spawn's identity and side, have bounded HP, occupy an existing map cell, and—when living—a walkable unoccupied cell. All units, including defeated ones, remain in initiative. Outcome must agree with the living sides, and an ongoing battle must have a living active unit. All numeric values are finite safe integers within named shared bounds. Dense plain arrays and exact data-property records reject holes, extra/hidden/symbol keys, accessors and non-JSON instances. JavaScript Proxy hardening is not a JSON-boundary guarantee.

## Random state and continuation

The accepted §6.4 proposal is **sfc32 v1**, seeded as `[0, seed, 0, 1]` with twelve discarded warmup draws. Returned `words` are four uint32 integers. `cursor` counts raw draws since warmup, including redraws rejected by bounded rejection sampling. It is explicit because the fourth word wraps at 2³²; battle snapshots require `counter == (cursor + 13) mod 2³²`, computed without unsafe additions. The stand-alone raw RNG API deliberately accepts arbitrary four-word vectors with an independent cursor, to support the reference rejection/wrap vectors. Cursor exhaustion rejects before arithmetic; no domain function creates entropy.

`nextUint32` and `rollDie` return fresh RNG records and word tuples. JSON round-tripping preserves the next output and cursor. The reference seeds 1, 12345 and 4294967295, redraw threshold and counter wrap are exercised in Node Vitest. No Godot-stream equivalence is promised.

## Version identity

Format, rules and RNG versions are named manual integers. Content version is `sha256:` plus a lowercase SHA-256 digest of canonical JSON (recursively sorted object keys, array order preserved, JSON string escaping, UTF-8 encoding). All catalog data except art contributes (#7): asset records and the asset references on units, terrains and map cells are left out, so a sprite re-export or a provenance fix keeps saves and replays valid. Art is removed rather than rules fields listed, so a field or group a later issue adds counts by default. There is no hand-kept content revision that can silently miss a changed stat. `contentVersion` hashes each catalog object once and caches the digest (#7), because every snapshot check needs it; a catalog must therefore not be edited after use, only replaced. The pure hash (`hashJson`) has independent Node crypto oracle comparisons for ordinary text, non-ASCII, astral Unicode, multi-block text and escaped lone surrogates. A digest identifies data; it does not certify content validity or prevent forged state.

## Commands, previews and replay

Commands carry **intent only**: `move` with destination, `useAbility` with unit/cell target, and `endTurn`. Restart belongs to the session, not the command union. IDs use known content identities and prefixed snake_case references; the `ability:` prefix is checked against the validated ability catalog. Unknown fields, computed paths/damage, malformed target unions and unsafe/noninteger numeric intent are rejected.

`previewCommand` checks command shape, snapshot validity and common actor preconditions in fixed order: malformedCommand, invalidState, battleOver, commandLimit (#7), unknownUnit, unitDefeated, notActiveUnit. Success means an isolated **structurally valid intent**, not a legal move/attack. It never draws or changes RNG. Movement legality, costs and paths arrived with #5 ([grid movement](grid-movement.md)); target legality, combat and dispatch with #7 ([turn flow and combat](turn-flow-combat.md)). Event/result contracts are readonly JSON-compatible data. Current combat and battle-local status behavior is documented in [combat effects](combat-effects.md) and [signature abilities](signature-abilities.md).

`readReplay` validates and isolates a bounded envelope with matching versions, initial snapshot and recorded accepted intents. `initial` is a round-one, command-count-zero boundary, **after creation and initiative** (`createBattle`, #7). It validates structure and continuation metadata, not historical stream authenticity or command legality. Re-executing accepted commands to regenerate events and the final state is `replayBattle` in `src/domain/turns.ts` (#7). It first requires `initial` to be exactly `createBattle(initial.mapId, initial.seed)`, so the seed binds the whole starting snapshot. AI commands are recorded, not recomputed. Snapshot restoration itself accepts later rounds/command counts through `readBattleState`.

## Historical #4 verification

- Focused: `npm run test:unit -- tests/unit/rng.test.ts tests/unit/state.test.ts tests/unit/domainBoundary.test.ts`
- Full unit suite: `npm run test:unit`
- Strict application and domain checks: `npm run typecheck`
- Production build: `npm run build`
- Existing browser regressions: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome npm test` (build first; current config serves existing `dist`).
- Whitespace: `git diff --check`

RNG and state availability assertions failed before production files existed, followed by passing reference/isolation/round-trip assertions. Subsequent RED/GREEN regressions cover sparse/decorated arrays, inconsistent outcomes/spawn identities, getter commands, seeded cursor consistency, post-initiative replay boundaries and invalid identifier suffixes. Those original results do not claim a playable battle or physical-device acceptance. Later integration and OpenSpec artifacts are present; see the [README](../README.md).

### Enemy danger inspection

The battle HUD can show potential danger to living heroes. It checks current enemy ordinary attacks from the enemy's current position and legal reachable positions, with refreshed next-turn movement and action budgets, current occupancy, terrain, line of sight and movement-blocking effects. Orange triangle markers identify hero positions with at least one legal attack; they do not predict the enemy's choice, a hit or a damage roll. Inspection does not change battle state or draw randomness. This first scope does not depict danger on empty tiles or future ability profiles.

### Tactical planning and undo

Choose **Plan move + ability**, select a reachable destination, then choose an ability and target. Review shows the combined plan; confirmation rechecks both parts before the move, then presents the ability after the move finishes. Cancellation accepts neither command. If the page is hidden during the movement presentation, the accepted move remains and the queued ability is cancelled. **Undo move** reverses the latest eligible player move before an action; it is unavailable after an action, turn transition, reload, or any movement with additional consequences. The battle log identifies the reversal.
