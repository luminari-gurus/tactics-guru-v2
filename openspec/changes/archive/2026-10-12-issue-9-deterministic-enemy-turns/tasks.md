# Tasks

## 1. Approved scope and deterministic chooser

- [x] 1.1 Record explicit caller approval in design.md and read OpenSpec apply instructions; verify issue/branch/base identity before implementation.
- [x] 1.2 Write RED-first chooser tests in tests/unit/ai.test.ts for living active enemies, invalid/dead/inactive/player actors, reordered inputs and exact score ties; record the focused failing command.
- [x] 1.3 Implement candidate enumeration and integer expected-damage ranking in src/domain/ai.ts using existing previews; verify melee, archer, range, LOS, height, ownership and defeated-target fixtures with `npm run test:unit -- tests/unit/ai.test.ts`.
- [x] 1.4 Add RED-first occupied-chokepoint, unreachable-target, spent-move/action and Wait-fallback tests, then implement strict-distance movement fallback; verify focused GREEN and input/RNG immutability. Document chooser ordering and fallback limits in docs/enemy-turns.md.

## 2. Bounded execution and replay

- [x] 2.1 Add RED-first real-dispatch tests for move/attack/Wait, immediate attack, terminal attack, first rejection and rejection after an accepted move; verify unchanged rejected snapshots, accepted-prefix reporting and correct ownership.
- [x] 2.2 Implement bounded runEnemyTurn through dispatch, stopping on rejection or completion; verify no more than three attempted commands and document return/rejection semantics and #10 integration.
- [x] 2.3 Add repeated seeded battle scenarios with scripted player commands, compare enemy commands/events/snapshots and replay accepted logs through replayBattle; verify command/RNG limits and throwing Math.random/Date.now stubs in the focused suite.

## 3. Integration and delivery

- [x] 3.1 Run `npm run test:unit`, `npm run typecheck`, `npm run build`, `npm test` (configured desktop and both mobile orientations; use installed Chrome executable if needed), and `git diff --check`; record actual results and any limits.
- [x] 3.2 Compare every issue criterion and capability scenario against implementation/evidence, rerun `openspec validate issue-9-deterministic-enemy-turns --strict`, and verify the diff contains only task-specific work.
- [x] 3.3 Commit and push implementation, reuse any existing branch PR or create one against main and attach it to this task; verify PR links and test results. Use Closes #9 only if all criteria are verified; otherwise draft with Refs #9 and explicit gaps.

## Workflow follow-up

- Do not merge or manually close the issue. Archive OpenSpec only after merge.
