# Design

## Context

See proposal.md for issue and branch identity. Audited base: `2b5a063f4a7e8f4a6329eaf1f80630133754012a`.

- `src/domain/types.ts` stores `guarded?: true`; `battle.ts` permits it only on Fighter. `combat.ts` computes its modifiers and grants it on accepted attacks; `turns.ts` removes it on the next turn. `hud.ts` independently calculates the same modifier values.
- `ai.ts` already scores ordinary attacks using `previewAttack`; reuse that route. `grid.ts` shares command validation but currently has no movement-blocking status. `BattleSession.ts` owns preview/confirm and records only accepted commands.
- State format 1/rules 2 and exact snapshot shapes underpin standalone, short-run and new dungeon persistence. `runSaveEnvelope.ts` currently rejects battle healing above entry HP, an invariant that a later combat-heal consumer must deliberately revise. Equipment is projected into the catalog once.
- Existing main specs for battle-session, battle-controls and enemy-turns require shared legality, pure preview, authoritative execution and bounded ordinary enemy turns. This increment does not extend enemy support-action ordering or change those specs.
- Read pinned legacy `CombatResolver.gd` at `e9433f6b608ae6b2d95418615cce9cf17dadcf74`, including mark, taunt and pin validation. Historical Guarded rules are not authority over approved v2 −2/+2.

## Goals / Non-Goals

Deliver a tested first production effect integration and a complete bounded handoff contract. Keep the difference between a documented future case and enabled executable behavior visible. Do not implement downstream abilities, unlock progression, damage-bearing hazards, new enemy catalogs or a general-purpose effect language to make this foundation appear complete.

## Decisions

### 1. Stage executable mechanics by real consumer

Keep an explicit contract table in `docs/combat-effects.md`; introduce executable variants only when their production content lands. This follows #161's instruction to introduce mechanics with their first real consumer. Shipping a broad union accepted by saves but ignored by gameplay is rejected. Shipping test-only spells in the normal catalog is also rejected.

| Closed case | Proposed semantics for consumer plan | Owning issue / implementation gate |
| --- | --- | --- |
| Guarded | One battle-local self status, attack −2/AC +2, grant after accepted hit/miss, replace not stack; expire at source next-turn start; remove on defeat | This increment; existing Guarded Strike |
| Heal | Living eligible target only; reject full HP; clamp once to projected max HP; no RNG unless profile explicitly requires it | #163 Second Wind / #166 Heal Goblin / #172 item; each owns amount, uses and action cost |
| Mark | One mark per target, newest replaces; next qualifying player attack roll gains +2 and consumes even on miss; previews and automatic missiles do not consume; target defeat removes; source defeat removes | #164; source-lifetime choice is proposed v2 adaptation for approval in that consumer plan |
| Taunt | One living hostile source; restrict offensive targets to source; allow legal approach or Wait if unreachable; remove on source/target defeat; replace same case | #163; duration anchored to target turn boundary and reviewed in its plan |
| Movement block | Reject ordinary movement without consuming movement; Wait/attack remain legal; no implicit forced-movement immunity | #164/#165; selected duration/refresh and adoption remain in their plans |
| Accuracy/AC debuff | Add bounded integer modifier once through shared projection; same identity replaces, distinct permitted identities add within derived bounds | #166 weakened / #168 exposure; no guessed DC/duration in this increment |
| Finite stack | Explicit identity/source/target and cap; add only on consumer's successful trigger; reject overflow in saved input, saturate legitimate gain | #168 frenzy: cap 3, +1 accuracy per stack; trigger/expiry decided with its real profile |
| Uses | Per-ability finite nonnegative integer remaining uses; whole-command validation before decrement; fresh-battle reset; save mid-battle | #163 Second Wind; no inert resources map now |

These proposals resolve the shape of the foundation; they do not approve new hero skills or rebalance those skills before their owning plans. #161 remains open for consumer-dependent acceptance. This increment will produce a draft PR with `Refs #161`, with outstanding gates listed, rather than `Closes #161`.

### 2. Start with one shared Guarded evaluator and lifecycle

Add small pure functions in `src/domain/effects.ts` for supported effect reading, effective accuracy/AC and lifecycle cleanup. Use the current optional `guarded` representation for this increment, with a closed internal normalized view identifying kind, source and target as the Fighter's own unit ID. Do not persist a second representation or introduce a redundant effect array. No runtime generic dispatcher, hook registry, dependency injection or new package.

Combat preview, HUD inspection and therefore AI scoring call the shared projection. Turn advancement expires Guarded before `turnStarted`. Accepted damage causing defeat removes that target's active Guarded marker before state adoption; grant/cleanup ordering must also avoid leaving guard on a defeated actor after a terminal path. Preserve existing `guarded`/`guardExpired` events; do not invent an expiry event on defeat if `defeated` already conveys it. Preview remains free of RNG. Natural 1 misses and natural 20 criticals remain unchanged. Grant on accepted miss remains unchanged. No duplicate penalty when an already-guarded Fighter uses Guarded Strike.

Movement-blocking integration and taunt AI filtering remain contract-only until their real consumers land. Do not touch grid/AI modules unless required to route an actually supported shared value; this avoids unused conditional paths.

### 3. Specify ordering without premature mechanics

Document this pipeline for later consumer work: validate full command/target/resources/immunity policy; compute baseline plus equipment once; add status/height/profile attack modifiers; roll required attack/save dice locally; consume qualifying on-attack effects; compute base damage and attack-specific modifiers; critical multiplier; rational resistance/vulnerability with one floor after combined multiplier; apply minimum 1 only for a damaging hit that is not immune; clamp HP; defeat cleanup; successful damage-trigger stacks; terminal outcome; commit events/state atomically. Immunity yields zero damage and no damage-trigger stack. Effect-only immune target rejects before spending/RNG; mixed damage/status profiles must explicitly state that damage can still resolve with status blocked.

Ordinary attacks remain untyped in this increment. Magic Missile retains force, automatic hit, range 1–5, 1d4+1 per missile, existing count/spread and local all-dice preflight. A later consumer must provide bounded rational trait values rather than floats, exact save ability/DC and natural-roll policy. Proposed save rule is d20 + chosen save modifier >= DC with no automatic 1/20; it is a documented proposal until #166 supplies a real spell. Push/charge/hazard trigger ordering belongs to #167/#168/#171; this change does not pretend to resolve path triggers.

### 4. Preserve compatible saves and reject unsupported state

Keep state format 1/rules 2 because legal Guarded snapshots and command outcomes retain their representation and numerical behavior. Continue reading historical guarded defeated units without changing their decoded bytes: the evaluator treats guard on a defeated unit as inactive. Remove inert markers only on a subsequently accepted transition, after save integrity has been verified; never rewrite storage on inspection. New accepted outcomes remove inactive guard. No old-save deletion, automatic reset or unrelated migration. If implementation discovers a semantic change to living-unit command outcomes requiring a rules bump, stop and revise this plan before implementing that incompatible change.

Test guarded standalone, authored-run and dungeon active battles through their real envelope readers/writers, including existing byte/shape limits. Ensure repeated inspection/resume does not accumulate modifiers. Reject extra unsupported status/resource fields through exact-shape validation. Later consumers own explicit state/rules versions and safe recovery or migration for new arrays, finite resources, healing-above-entry HP and additional statuses; their task gates are listed in the handoff. Do not raise size limits absent measured failure.

## Files and Verification

Expected changes now: new `src/domain/effects.ts`; `src/domain/combat.ts`, `src/domain/turns.ts`, `src/ui/hud.ts`; `src/domain/battle.ts` only if supported validation requires it. Touch `src/domain/types.ts` only if a supported internal type needs exporting. Extend `tests/unit/combat.test.ts`, `turns.test.ts`, `saveEnvelope.test.ts`, `runSaveEnvelope.test.ts`, relevant existing dungeon tests and feedback tests, plus existing battle/run persistence browser suites. Add `docs/combat-effects.md`, update current Guarded text in `docs/signature-abilities.md`, retain task-specific evidence in `docs/qa/issue-161-combat-effects.md`.

Files listed broadly in proposal Impact are potential consumer integration points, not authorization for unrelated edits. No new content abilities or unused damage/save helpers in this increment.

| #161 acceptance | Implementation / proof in this increment | Remaining gate |
| --- | --- | --- |
| Minimal discriminated model | Closed contract table, enabled Guarded case, shared evaluator; unsupported fields reject | Activate additional kinds with real owning content |
| Typed damage/save/immunity only as required | Source-linked ordering/rounding/immunity/save contract; regression preserves current attack/Missile numbers | #166–#169/#171 profiles and executable proofs |
| Pure shared evaluation and atomic preflight | Guarded preview/resolution/HUD/AI share projection; frozen-state and RNG/rejection tests | Same integration required for each new case |
| Source, timing, refresh/stack, cleanup, scope | Guarded self identity, replace semantics, next-turn expiry, defeat/new-encounter cleanup; other cases explicitly mapped | Consumer duration/DC/adoption and stack triggers |
| Bounded serialization and replay tests | Standalone/run/dungeon Guarded roundtrip/continuation, malformed input, misses/natural rolls/expiry/defeat | Finite uses, marks, taunt and movement-block save/replay with real consumers |

After approval run focused unit suites; then `npm run test:unit`, `npm run validate:content`, `npm run typecheck`, `npm run build`, full `npm test` including posttest encounter/item matrices, and `npm run test:telemetry` if configured independently. Retain desktop and mobile portrait/landscape Guarded preview/confirm, inspect, save/reload and expiry screenshots/interactions; use WebKit focused lifecycle coverage and configured Chromium matrices. Playwright emulation satisfies device acceptance. Run strict OpenSpec validation and `git diff --check`. No test pass is claimed during planning.

## Risks / Trade-offs

- Incremental delivery leaves part of #161 open → draft PR and per-criterion handoff distinguish contract from runtime proof; no false closure.
- Replacing duplicate projections could double-apply equipment or Guarded → compare preview, damage, HUD, AI and resumed values against exact existing fixtures.
- Defeat cleanup changes inert snapshot bytes → preserve old input compatibility, keep decoded state unchanged until a subsequently accepted transition, and compare live/resumed/replayed outcomes.
- Pending HUD PR #139 may overlap `hud.ts` → use current main only, preserve its feature ownership, and resolve later overlap without absorbing its branch.
- Broader future effects can grow into an engine → each future variant requires a traced consumer, existing shared command path and focused acceptance proof.

## Backlog readiness record

Scanned all 33 open issues (35 API entries including two PRs), all issue dependency relationships, relevant comments, remote branches and open/merged PRs. Promoted #158 after rereading it: #154/PR #156 and #157/PR #186 are merged ancestors of base, no assignee/dependency/active branch conflict. Verified label readback. Left #159 unchanged because biome/balance policy still needs explicit selection; #163–#175 retain outstanding ability/catalog prerequisites, #180 needs Settings/music decisions, #178 and #182 need adoption decisions, and #185 needs progression/rules decisions. Existing assigned #85/#123/#128 were excluded; PR #139 is open, not merged. Ready labels on #160/#162/#176 do not prove every dungeon/content-dependent acceptance criterion is currently executable.

Selected #161 after refreshed backlog and immediate reread: ready, unassigned, no GitHub blocking relationship or active issue branch/PR; directly named prerequisite for nine issues: #163, #164, #165, #166, #167, #168, #169, #171 and equipment #173. #158/#159 unlock important dungeon work but #159 still needs product policy; #155 is narrower and has fewer evidenced downstream consumers. Assigned `dubstylee` and verified. Published branch at base before writing artifacts. Main checkout's unrelated edits remain untouched.
