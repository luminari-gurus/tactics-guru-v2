# Tasks

Caller approved published plan e115ea2 with “Approved” on 2026-10-20. Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/158. Caller: `dubstylee`. Branch: `work/issue-158-overworld-traversal`. Base: `38474f210da723c7d66cf323a19236de85cb5e57`.

## 1. Floor exploration model

- [x] 1.1 Record explicit caller approval in proposal.md; confirm the same branch/base and review current #155 integration state. Verify approval refers to this plan before implementation.
- [x] 1.2 Add deterministic exploration placement/discovery primitives using existing marker IDs and generated geometry; extend floor validation with legal positions, stable encounter/stair POIs, sorted revealed/visited sets and bounds. Verify seed-corpus reproducibility, no overlap with stairs, connected reachability, allocation failures and malformed-state rejection in focused unit tests.
- [x] 1.3 Add one-step cardinal commands with dungeon/floor/revision guards, phase locks and pure reveal; verify blocked/edge/diagonal/stale/repeated inputs leave state and RNG unchanged. Document movement, reveal radius/no-occlusion and POI ordering in docs/dungeon.md alongside implementation.

## 2. Versioned unified saves

- [x] 2.1 Add dungeon v2 identity/envelope and explicit legacy v1 decoding/conversion with retained original bytes. Verify ready/reward/active/defeat, multiple retained floors, inventory and exact active-battle/RNG preservation; reject foreign identity and malformed discovery without overwriting saves.
- [x] 2.2 Apply candidate-save/readback to movement and encounter entry, reuse existing recovery and explicit unsaved mode, and retain no-unsaved-travel behavior. Verify quota/security/unavailable/write-after-throw/readback-mismatch cases keep previous in-memory exploration, launch no uncommitted battle and expose exact durable/current exports.
- [x] 2.3 Document v1 conversion, v2 bounds, uncertain-write recovery, best-effort multi-tab limits and older-build rollback limitations in docs/dungeon.md. Verify documented storage keys and format against encoder/reader tests.

## 3. Spatial battle and stairs

- [x] 3.1 Bind next-POI entry to existing battle construction/session ownership, validating floor/slot/entry association in one snapshot. Verify exact active resume, duplicate entry/callback rejection and no new battle/RNG after stale inputs in dungeon battle/session tests.
- [x] 3.2 Return victories to the entry cell, complete/reward exactly once, retain defeat and item carryover, and allow re-entry only for the available next encounter. Verify legal final-command victory/defeat fixtures, pending reward cancellation/claim/reload, capacity recovery and equipment projection; update existing fixtures to canonical POI associations.
- [x] 3.3 Gate travel on matching stair position, preserve guardian/phase locks and retained discovery on backtracking. Verify remote stairs reject, legal travel persists before publication, cached geometry eviction/regeneration matches identity and revisits never regrant rewards. Document spatial encounter and stair rules with these changes.

## 4. Accessible map integration

- [x] 4.1 Replace dungeon summary and remote start controls with retained-state map, discovered-POI list, adjacent-cell activation, focused keyboard and 44px directional controls. Verify actual pointer, keyboard and touch steps, disabled reasons, modal/input capture, visible focus and no overflow on desktop/portrait/short-landscape Playwright projects.
- [x] 4.2 Reuse biome/art helpers for view-local Simple/Legacy artwork without simulation mutation. Add disposal guards for callbacks/bindings. Verify exact snapshot/RNG equality across art switches, delayed/failed image loads, resize/rotation, hidden page and route teardown; retain /map inspection regressions.
- [x] 4.3 Wire spatial entry to shared BattleScene and map return/recovery focus. Verify a real UI walk to an encounter, legal battle action and reload, legal terminal fixtures, reward then movement, stair travel/backtracking and stale callback isolation. Update route/navigation help and current docs to describe the delivered flow.

## 5. Integration acceptance

- [x] 5.1 Run focused exploration/dungeon suites plus full npm run test:unit, npm run validate:content, npm run typecheck, npm run build and npm test including configured encounter/item posttests. Run focused WebKit traversal/resume/return checks. Verify existing standalone battle, short run, map prototype and dungeon recovery regressions; preserve failures and limits.
- [x] 5.2 Capture source-bound screenshots, state receipts and raw logs for desktop/mobile portrait/short landscape in docs/qa/issue-158-overworld-traversal.md; measure route bundle/transfer and map responsiveness against existing budgets. Verify each acceptance row in design.md has direct evidence and no physical-device claim.
- [x] 5.3 Validate OpenSpec strictly and git diff --check, audit final diff against approved scope, commit/push only issue changes and create/attach a PR. Verify all acceptance criteria before Closes #158; otherwise use a draft with Refs #158 and remaining gaps. Do not merge or archive before merge.

Delivery: https://github.com/luminari-gurus/tactics-guru-v2/pull/189. All issue functional criteria verified; baseline native-select failures and WebKit idle observations remain explicitly retained in the acceptance report. No merge or archive before merge.
