# Design

## Context

See proposal.md for work identity and prerequisites. `previewMovement` gives cost-ordered reachable cells, `moveUnit` returns a fresh moved snapshot, `previewAttack` returns exact combat numbers, and `dispatch` owns all state transitions. `endTurn` skips defeated units. The ES2022-only domain configuration excludes DOM and timers. No AI exists today.

## Goals / Non-Goals

Expose a pure `planEnemyTurn(state, unitId, catalog)` and a bounded `runEnemyTurn` suitable for #10. Preserve command/replay formats. No UI wiring, player automation, signature use by enemies, pathfinding replacement or multi-turn strategy.

## Decisions

1. Normalize a copied unit array by numeric ID before validation (the shared reader requires canonical ID order); malformed entries still reject. Validate state and actor through existing intent/state checks; reject a player actor with an AI-specific typed rejection. Keep shared rejection reasons intact. The active initiative entry selects the enemy; never choose an enemy by array order.
2. Enumerate origin plus legal reachable cells (only origin if movement spent), living player targets by numeric ID, and owned ordinary attack profiles by lexical ability ID. Use `moveUnit` snapshots for attack previews, never duplicated legality formulas. Only enemies' existing ordinary attack profiles are candidates; no generic effect evaluator.
3. Score expected damage with integer d20 enumeration using `D20_SIDES`, natural miss/critical constants, and the preview's bonus/AC/damage/criticalDamage. Compare total damage across the die faces without division. Tie-break: higher score, lower movement cost, lower target ID, lexical ability ID, cell y then x. This avoids random tie-breaking and floating-point probability comparisons. Staying put wins equivalent attacks because its cost is zero.
4. If no attack exists and movement is available, minimize Manhattan distance to the nearest living player, then movement cost, target ID, cell y/x. Move only if distance strictly decreases; otherwise Wait. This small greedy policy deliberately does not promise global path progress around obstacles. No arbitrary retry loops.
5. Plans contain at most move, attack, endTurn. `runEnemyTurn` dispatches sequentially, stops immediately when outcome ends or a command rejects, and returns accepted commands/events plus resulting snapshot. On rejection it reports the reason and any accepted prefix explicitly; the failing command remains atomic and never advances ownership. Do not append a turn end to a terminal battle. Replanning or automatic retry belongs to no layer in this change.

## Files and proof

`src/domain/ai.ts` owns decisions and bounded execution. `tests/unit/ai.test.ts` uses existing validated catalog fixtures and real dispatch/replay. `docs/enemy-turns.md` documents API, scoring, rejection-prefix semantics and #10 integration. No dependency or command schema changes are planned.

| Issue acceptance criterion | Implementation | Verification |
| --- | --- | --- |
| Stable ordering, tie-breaks, shared legality and defeat checks | Sorted candidate enumeration and preview-based ranking | Reorder fixtures; equal-score ties; range/LOS/height/occupancy; inactive/dead/player actor and targets |
| Legal reachable move/attack, bounded Wait fallback | Reachable moved snapshots and strict-distance fallback | Melee/archer fixtures, occupied chokepoints, unreachable and no-action cases |
| Seeded command/event equality; rejection preserves ownership | Existing dispatcher and explicit accepted prefix | Repeat seeded scenarios, replay recorded commands; rejection before and after accepted move; RNG/command limits |
| Required edge tests; no timers/browser dependencies | Pure AI module | Focused RED/GREEN suite; strict domain typecheck; throwing Math.random/Date.now stubs |

## Risks / Trade-offs

- Greedy movement can wait at obstacles → document the limitation; advanced routing/strategy is out of scope.
- Hypothetical attacks may become terminal or resolution may reject → stop execution and expose actual accepted prefix; never infer success from preview.
- Candidate enumeration repeatedly validates snapshots → keep the authored board bounded; no caches or new infrastructure without measured need.
- Browser checks verify regressions, not physical-device acceptance → report actual coverage and leave device certification to #11.

## Migration Plan

Additive domain API, no persisted-state migration or deployment changes. Rollback removes the module and its tests/documentation. OpenSpec setup files are tooling only; no legacy plans are imported.

## Approval

Approved by the caller in this conversation on 2026-10-10: “Approved”. Implementation follows the published plan at 161a085.

## Implementation evidence

- Chooser RED: `npm run test:unit -- tests/unit/ai.test.ts` failed because the AI module did not exist. Initial five chooser tests then passed.
- Fallback RED: the same command failed two new strict-distance/spent-action cases before fallback was implemented; all 12 tests then passed.
- Execution RED: six new runner cases failed because `runEnemyTurn` did not exist; all 18 tests then passed after implementation.
- Final focused suite: 25 passing tests, including exact cell ties, malformed normalization, scoring boundaries, accepted-prefix rejection and seeded authored replay.
- Shared battle/movement/combat rules and dependency manifests are unchanged. New implementation is one 93-line domain module, focused tests and a short #10 hand-off.
- `npm run test:unit`: 22 files, 240 tests passed.
- `npm run typecheck`: application and ES2022-only domain checks passed.
- `npm run build`: passed; existing large Phaser chunk warning remains.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`: all 144 configured browser regressions passed (desktop, mobile portrait, mobile landscape; 4.0 minutes). These use Chromium/emulation and do not certify physical devices.
- `git diff --check` and `git diff --cached --check`: passed.
- `openspec validate issue-9-deterministic-enemy-turns --strict`: passed.
- All four issue acceptance criteria and every capability scenario have direct test evidence in `tests/unit/ai.test.ts`; no issue #9 acceptance gaps remain. UI composition is #10 and physical-device acceptance is #11.
