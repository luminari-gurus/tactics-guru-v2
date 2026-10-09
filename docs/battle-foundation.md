# Battle foundation (#4)

`src/domain` is pure TypeScript checked separately with ES2022 libraries and no DOM or Node ambient types. It imports only the merged content contract and other domain modules. Unit tests guard imports and ambient entropy, and exercise the APIs with `Math.random`/`Date.now` disabled. The existing Node Vitest unit script is reused; Playwright remains a separate configured runner.

## State boundary

`readBattleState(unknown, catalog)` returns either a fresh, deeply isolated snapshot or `invalidState`. The catalog parameter must already be validated by its producer (the content-definition validator remains #28); this module does not certify arbitrary content JSON. The synthetic two-cell unit fixture uses the merged `MapRecord`, IDs, stats and catalog types and is checked at this runtime boundary.

Snapshots contain format/rules/content/RNG identities, supplied seed, explicit random state, map reference, sorted runtime units, fixed initiative order, active index, round, outcome and accepted-command count. Stats/terrain remain in content; runtime HP and flags remain in state. Units must match their map spawn's identity and side, have bounded HP, occupy an existing map cell, and—when living—a walkable unoccupied cell. All units, including defeated ones, remain in initiative. Outcome must agree with the living sides, and an ongoing battle must have a living active unit. All numeric values are finite safe integers within named shared bounds. Dense plain arrays and exact data-property records reject holes, extra/hidden/symbol keys, accessors and non-JSON instances. JavaScript Proxy hardening is not a JSON-boundary guarantee.

## Random state and continuation

The accepted §6.4 proposal is **sfc32 v1**, seeded as `[0, seed, 0, 1]` with twelve discarded warmup draws. Returned `words` are four uint32 integers. `cursor` counts raw draws since warmup, including redraws rejected by bounded rejection sampling. It is explicit because the fourth word wraps at 2³²; battle snapshots require `counter == (cursor + 13) mod 2³²`, computed without unsafe additions. The stand-alone raw RNG API deliberately accepts arbitrary four-word vectors with an independent cursor, to support the reference rejection/wrap vectors. Cursor exhaustion rejects before arithmetic; no domain function creates entropy.

`nextUint32` and `rollDie` return fresh RNG records and word tuples. JSON round-tripping preserves the next output and cursor. The reference seeds 1, 12345 and 4294967295, redraw threshold and counter wrap are exercised in Node Vitest. No Godot-stream equivalence is promised.

## Version identity

Format, rules and RNG versions are named manual integers. Content version is `sha256:` plus a lowercase SHA-256 digest of canonical JSON (recursively sorted object keys, array order preserved, JSON string escaping, UTF-8 encoding). All catalog data, including stats and asset provenance, contributes. There is no hand-kept content revision that can silently miss a changed stat. The pure implementation has independent Node crypto oracle comparisons for ordinary text, non-ASCII, astral Unicode, multi-block text and escaped lone surrogates. A digest identifies data; it does not certify content validity or prevent forged state.

## Commands, previews and replay

Commands carry **intent only**: `move` with destination, `useAbility` with unit/cell target, and `endTurn`. Restart belongs to the session, not the command union. IDs use known content identities and prefixed snake_case references; the provisional `ability:` intent prefix is only syntactic until the ability catalog arrives in #8. Unknown fields, computed paths/damage, malformed target unions and unsafe/noninteger numeric intent are rejected.

`previewCommand` checks command shape, snapshot validity and common actor preconditions in fixed order: malformedCommand, invalidState, battleOver, unknownUnit, unitDefeated, notActiveUnit. Success means an isolated **structurally valid intent**, not a legal move/attack. It never draws or changes RNG. Movement legality, costs and paths arrived with #5 ([grid movement](grid-movement.md)); target legality, combat and dispatch with #7 ([turn flow and combat](turn-flow-combat.md)). Event/result contracts are readonly JSON-compatible data; no event-producing combat implementation or status catalog is introduced. Status state/events will be added with #8 rather than inventing competing content definitions here.

`readReplay` validates and isolates a bounded envelope with matching versions, initial snapshot and recorded accepted intents. `initial` is a round-one, command-count-zero boundary, **after creation and initiative** (`createBattle`, #7); nonzero consistent RNG cursors are allowed. For a zero cursor, words must match seeded warmup. It validates structure and continuation metadata, not historical stream authenticity or command legality. Re-executing accepted commands to regenerate events and the final state is `replayBattle` in `src/domain/turns.ts` (#7); AI commands will be recorded, not recomputed. Snapshot restoration itself accepts later rounds/command counts through `readBattleState`.

## Verification commands

- Focused: `npm run test:unit -- tests/unit/rng.test.ts tests/unit/state.test.ts tests/unit/domainBoundary.test.ts`
- Full unit suite: `npm run test:unit`
- Strict application and domain checks: `npm run typecheck`
- Production build: `npm run build`
- Existing browser regressions: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome npm test` (build first; current config serves existing `dist`).
- Whitespace: `git diff --check`

RNG and state availability assertions failed before production files existed, followed by passing reference/isolation/round-trip assertions. Subsequent RED/GREEN regressions cover sparse/decorated arrays, inconsistent outcomes/spawn identities, getter commands, seeded cursor consistency, post-initiative replay boundaries and invalid identifier suffixes. This slice claims neither a playable battle nor physical-device acceptance. No OpenSpec tree/tooling is configured in this repository.
