# Tasks

## 1. Floor contract and reducers

- [x] 1.1 Record explicit caller approval in proposal.md before implementation; verify it selects the route/template/stair/resource decisions in design.md.
- [x] 1.2 Add validated dungeon/floor/encounter state and template v1 using current map/encounter generators; test stable purpose-separated seeds, descriptor hashes, legal stair positions and numeric boundary rejection. Document identity rules in docs/dungeon.md.
- [x] 1.3 Implement guardian completion, reward boundaries, descend/ascend/revisit and defeat/new-run reducers; test duplicate/stale commands, locked stairs, restored position, cleared POIs and high-depth nonterminal behavior. Document carried versus reset state.

## 2. Shared items and battle integration

- [x] 2.1 Extract shared bounded ownership/projection/reward primitives and add dungeon encounter identities; verify existing short-run rejection corpus plus multi-digit depth, capacity, owned-instance and no-duplicate grant tests. Document identity formats.
- [x] 2.2 Add dungeon battle adapter/session using existing BattleSession and host lifecycle; test carried survivor HP, equipment applied once, battle-local reset, stale completion, replay and next-command RNG equality. Document adapter boundary.

- [ ] 2.3 Obtain the caller’s inventory-full policy choice, revise the behavior artifacts, implement the selected confirmed disposal or explicit reward skip, and verify capacity recovery, cancellation, stale commands and save/resume through unit/browser tests.

## 3. Save and resource handling

- [x] 3.1 Add checksummed dungeon envelope v1 and isolated primary/backup storage; test active-battle/reward/travel roundtrips, invalid/incompatible/oversized data, raw-byte preservation and unaffected old slots. Document version and recovery contract.
- [x] 3.2 Implement three-map geometry cache and compact retained floor facts; verify eviction/reconstruction hashes, saved positions/completion and growing-history byte accounting without silent pruning. Document engineering limits separately from gameplay depth.
- [x] 3.3 Add candidate travel save/readback gate, retry/export and uncertain-write recovery; inject quota/security/readback/backup failures and prove current floor and prior durable recovery survive. Verify explicit unsaved battle play and blocked unsaved travel; document user-visible limitations.

## 4. Entry and controls

- [x] 4.1 Add lazy `/dungeon` entry, base-aware navigation and floor summary/stair controls; verify root/run/map regressions, guardian gating, pending reward lock, modal focus, touch/keyboard controls and floor progress in Playwright desktop/portrait/landscape screenshots. Document route and temporary template accurately.
- [x] 4.2 Integrate battle/reward/defeat/recovery screens and lifecycle cleanup; verify legal encounter completion, two-floor travel/backtracking, active battle/reward/travel reload, double input, page suspension, confirmed fresh run and preserved old saves using browser tests. Retain evidence in docs/qa/issue-157-dungeon-floors.md.

## 5. Integration acceptance

- [x] 5.1 Run full unit/content/typecheck/build and configured browser suites including posttest matrices; run focused dungeon tests and compare every issue criterion to evidence. Retain commands/results and actual limitations; verify strict OpenSpec and git diff checks.
- [x] 5.2 Measure new lazy-route code and save growth, retain current performance failures, and audit documentation against source; commit/push only approved issue changes and create/attach PR with verified acceptance coverage.

## Workflow follow-up

- Obtain plan approval before application code/tests are edited.
- Keep the change unarchived until merge; do not merge or deploy in this workflow.
