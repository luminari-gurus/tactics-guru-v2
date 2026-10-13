# Design

## Context

See proposal.md for issue/branch identity and motivation. Current `BattleState` owns RNG, initiative, flags and Guarded. `createBattle` in `src/domain/turns.ts` fills HP from catalog spawns; replay reconstructs precisely that start. `BattleSession` commits commands before presentation and guards delayed presentation with tokens. `saveEnvelope.ts` accepts a battle-only snapshot under format 1. None of these currently owns a run.

## Goals / Non-Goals

**Goals:** Provide a small pure contract/reference reducer and executable deterministic fixtures, plus downstream handoff documentation. Record all five #75 acceptance criteria.

**Non-Goals:** No playable run, scene/UI wiring, actual encounter catalog, inventory/effects, storage changes, revival, XP, leveling or production activation. Future revival is acknowledged, not implemented. Keep existing single-battle rules, version and replay behavior intact.

## Decisions

1. Put contract types, strict reader, creation, seed derivation and transition reference functions in one `src/domain/run.ts`, using existing validation/RNG/catalog helpers. Add `tests/unit/run.test.ts` and `docs/run-contract.md`. A general workflow engine adds no required capability; documentation alone cannot prove deterministic atomicity.
2. State format/version 1 contains caller-provided run identity (1–64 ASCII letters/digits/hyphens), uint32 seed, content/rules/RNG identities, exactly three distinct bounded encounter IDs supplied by a trusted run definition, canonical Fighter/Ranger/Mage party HP and a discriminated phase: battle, reward, victory or defeat. Index is 0–2. HP bounds use catalog maxima; zero encodes permanent defeat. Require a safe bounded revision counter (maximum 16); each accepted transition increments it. Run IDs identify separate attempts even if a seed is reused elsewhere.
3. Commands carry run identity, expected revision and encounter identity. A battle-completed command carries the boundary identity and complete resulting party HP. Validate phase, identity, roster, HP and consistent outcome before creating a copy. No healing or resurrection through completion payloads. Reward acknowledgment carries the matching pending identity; it advances exactly once. Reference acknowledgment represents a future atomic item/reward transaction, not an inventory grant. #78/#80 must compose ownership and progression as one preflighted transition, never grant then independently advance.
4. Derive uint32 seeds with a documented fixed/versioned purpose-tag mixing algorithm and fixed test vectors, using fresh `seedRng` instances. Encounter and reward purposes do not share mutable RNG. Include index; derive boundary identities from run identity/index/purpose. Reject new-run requests with the old identity or seed. Entropy is an adapter responsibility; the pure module never accesses time, crypto or Math.random.
5. Document the next-battle descriptor (encounter ID, seed and surviving party HP). #76 owns actual encounter IDs/maps and legal survivor spawns. #80 owns carried-party creation and replay initial-boundary changes; do not patch `createBattle` now. HP/status separation is proven by descriptors, not a claim of integrated battle behavior.
6. Document save extension fields (versioned RunState, active battle only in battle phase, pending offer identity/seed in reward phase, future owned inventory/equipment payload), plus cross-field validation, bounded sizes and incompatible-format handling requirements. Leave numeric inventory limits/item effect choices to #77 and codec/storage work to #79/#80. Do not widen the battle-only decoder or reuse its format number implicitly.
7. Caller decisions: carry HP; defeated heroes stay dead for now; no automatic healing; reward choice after first two victories; wipe ends run; third victory ends run. Both outcome screens use Start new run, fresh seed/full party/empty inventory. No additional modal. Outcome screens themselves remain #80 acceptance.

## Acceptance mapping and proof

| #75 criterion | Deliverable and verification |
| --- | --- |
| Reviewed gameplay decisions | Decision record in docs; creation, carryover, wipe, third victory and fresh-run fixtures |
| Bounded state/IDs/ownership | Strict reader, adversarial bounds/shape/phase tests and JSON round trips |
| Acyclic exactly-once sequence | Full three-encounter transition fixtures, stale/duplicate/out-of-order commands, immutable rejection checks |
| Reward/save interfaces | Typed pending identity and descriptors; docs map #77–#80 and #58 extensions without implementing them |
| Deterministic fixtures/#59 mappings | Golden seed vectors, identical complete transition traces, preview independence and documented #59 acceptance handoff |

After approval run focused run/domain-boundary tests, full `npm run test:unit`, `npm run validate:content`, `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`, and strict OpenSpec validation. Browser tests prove existing battle regression only. Record actual pass/fail and any unavailable checks; physical acceptance remains outside this issue.

## Risks / Trade-offs

- Carried-party starts conflict with existing replay assumptions → explicit #80 handoff; preserve present battle APIs.
- Reward acknowledgment could be misused as a grant → document atomic composition ownership; reference module grants no items.
- Untrusted battle results → strict shape/HP checks here; #80 must obtain completion from the accepted domain session, not UI-supplied HP.
- New run identities/seeds must come from a caller → deterministic rejection guards and documented adapter responsibility.
- #57 has outstanding recorded acceptance → contract may merge independently; no feature-delivery or hardware certification claim.

## Migration Plan

Additive contract only; no save migration or runtime activation. Reverting this issue's files removes the reference contract without changing current battle behavior.
