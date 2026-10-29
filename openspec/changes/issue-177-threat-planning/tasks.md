# Tasks

## 1. Planning and legality

- [ ] 1.1 Implement pure move-plus-ability preview and live preflight; unit-test unreachable destinations, stale targets, invalid plans, cancellation, RNG and resource invariance.
- [ ] 1.2 Add bounded enemy danger evaluation from shared movement and attack legality; unit-test blockers, occupancy, height, LOS, movement restrictions, spent budgets and deterministic no-RNG behavior; document the displayed scope.

## 2. Undo and persistence

- [ ] 2.1 Implement validated eligible-move undo and invalidate it at action, turn, reload and unsafe consequence boundaries; unit-test budgets, history, events, repeated undo, locks and hazard/reveal/reaction safety.
- [ ] 2.2 Integrate replay and standalone/run/dungeon saves with version compatibility and safe recovery; test old and malformed saves, reload and deterministic replay after undo and continuation; document format changes.

## 3. Presentation

- [ ] 3.1 Integrate compound review, explicit confirmation/cancel, danger overlay and undo into the HUD, board and session; test focus, modal/animation locks, narrow screens, keyboard and touch, stale and interrupted plans.
- [ ] 3.2 Verify complete legal standalone, run and dungeon browser journeys across desktop and portrait/landscape touch and applicable WebKit, including undo, restart and reload; update battle documentation.

## 4. Integration verification

- [ ] 4.1 Map affected consumers and discover all required suites/modes; run final full regression under the verification policy on qualified exclusive self-hosted capacity, preserving source/build identity, failures, skips and limitations.
- [ ] 4.2 Compare each issue acceptance criterion and approved plan against evidence, run `git diff --check`, and record results and unresolved limitations for the PR.
