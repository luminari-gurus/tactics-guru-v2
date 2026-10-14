# Design

## Context

See [proposal](proposal.md) for issue, caller, base and branch identity. `itemTypes.ts` supplies ownership shapes and bounds; `rewards.ts` supplies deterministic offers, strict stored-offer validation and claim intent. `run.ts` validates run revisions by phase/index and exposes acknowledgment without an inventory grant. `docs/run-items.md` contains the accepted timing, healing and replacement rules. `combat.ts` reads accuracy/armor class directly from the supplied content catalog; `createBattle` already consumes that catalog.

## Goals / Non-Goals

**Goals:** Fulfil all five #78 acceptance criteria through pure executable commands and composition fixtures, preserving the #75/#77 contract. Provide one interface for #79/#80.

**Non-Goals:** Runnable run screens, trusted session adapter, save codec, storage, changes to combat rules or item balance, new dependencies, status framework, physical certification and deployment. #57 remains the release gate.

## Decisions

1. **One small pure module.** Add `src/domain/items.ts` using existing strict shape/dense-array helpers and trusted validated catalogs. An ownership reader accepts unknown data, checks all references/bounds and returns independent arrays/records. Reject accessors, unknown fields, sparse arrays and unsafe numbers consistently with existing domain readers. Fresh ownership is empty. Instance IDs use `<runId>:reward:<0|1>:option:<0|1>`; derive the actual new ID from the validated offer's selected ordinal, and validate the bounded encoding and owning run. Keep canonical stack/instance/assignment ordering for stable JSON. A generic inventory engine or multiple adapters adds no required behavior.

2. **Atomic aggregate results.** Commands accept run, ownership, concrete pending offer and item revision as a small aggregate; return a complete new aggregate/events or a failure. Validate run and ownership before branching, then all command constraints before committing. Claim invokes the existing run transition only after validating offer and capacity; its returned run and new ownership appear in one success result. Clear the offer on success. The aggregate reader requires a matching offer in reward phase and no offer otherwise. Existing standalone acknowledgment remains a reference contract, documented as unsuitable for integrated grant; #79/#80 must call the aggregate claim path.

3. **Separate item revision.** Run revision cannot count healing/equip because `readRunState` requires exact phase/index values. Add a bounded nonnegative safe-integer item revision to the aggregate, increment on every successful item command, and require it in every command. Keep the run boundary guards as well. Reject commands at the revision limit. No entropy draw or modification of battle action flags occurs. Repeating a successful operation against its returned state fails as stale, including a second draught use. Persistence of this field belongs to #79/#80. A ledger of every historical command is unnecessary.

4. **Explicit trusted preparation context.** The adapter passes run ID, encounter ID, boundary ID and whether an active battle exists; pure preflight verifies matching identity, `activeBattle: false`, and reward phase or battle phase with encounter index greater than zero. Reject initial entry and terminal phases. This context is a trusted fact supplied by the future session owner, not permission inferred from `phase: battle`. Tests supply both valid and invalid contexts. A new run phase or pending UI state would change #75 unnecessarily.

5. **Generic effects with owned copies.** Healing copies run party and decrements/removes the owned stack; zero HP and full health reject. Equip copies assignments only, rejecting cross-hero instance transfer and incompatible/defeated targets; replacement retains old ownership. Unequip requires a matching existing assignment. Handle effects by discriminant/stat, never item ID.

6. **Project a fresh battle catalog.** A helper takes validated run/ownership and the immutable base catalog and returns a new catalog with copied hero stats, adding each living hero's assigned charm effect once. Never mutate definitions or accept a previous projection as the base in the documented integration path. Unchanged maps/enemies/assets can be shared; avoid deep-copying all assets. Fixtures use this output with existing battle creation/combat resolution, checking changed accuracy/armor class and deterministic RNG; standalone battle calls retain the original catalog. #80 owns survivor spawn/HP initialization and replay reconstruction with the same projected catalog, so no generic combat modifier registry or battle/save schema changes are needed here.

## Files and Proof

Primary implementation: `src/domain/items.ts`; minimal supporting types in `src/content/itemTypes.ts`, `src/domain/rewards.ts` or `src/domain/run.ts` only if required. Proof: `tests/unit/itemCommands.test.ts`, existing rewards/run tests as needed. Handoff: `docs/run-items.md`. No application UI or persistence edits.

| #78 acceptance | Implementation and verification |
| --- | --- |
| Ownership/context/slot/stack preflight and unchanged failure | Strict reader and command preflight; malformed/reference/overflow/phase/context/stale fixtures with frozen inputs and byte-equivalent rejection state |
| Exactly-once deterministic claim | Aggregate grant plus acknowledgment; duplicate/stale/tampered offer/capacity tests and equal-seed replay/next-RNG checks |
| Exactly-once use and retained replacement ownership | Item revision, healing/equip/unequip; injured/full/dead heroes, capped healing, exhausted stack, cross-hero instance and replacement fixtures |
| Fresh nonaccumulating projection | Base-derived catalog helper; repeated battle construction, equip/unequip, restored aggregate and combat composition fixtures |
| Generic fixture item and meaningful focused tests | Additional validated item using existing effect, exercised through commands and projection with no ID-specific branch |

Run focused item/reward/run tests; `npm run test:unit`, `npm run validate:content`, `npm run typecheck` (both configs), `npm run build`, configured `npm test` including encounter posttest, strict OpenSpec and `git diff --check`. Browser checks cover existing battle regressions, not future reward UI or physical devices. Record actual commands, revisions, warnings and limitations.

## Risks / Trade-offs

- Trusting an incorrect active-battle context could permit mistimed use → bind it to the current boundary, reject malformed context, document trusted session ownership for #79/#80; no claim of a live adapter in this issue.
- Passing projected stats as a future base could accumulate effects → expose the base-catalog contract clearly and test repeated projection from the immutable base plus restore/equip cycles.
- Projected catalogs affect battle content identity → #80 must rebuild the same projection before replay/save validation; preserve current single-battle content hashes and make this handoff explicit.
- Separate item revision adds a future persisted field → bounded reader and JSON round-trip tests now, one shared run codec in #79/#80 later.

## Migration Plan

No current app/save migration: the new pure API is not wired into live single-battle play. Implement after explicit plan approval, validate, and open a PR against main. Downstream integration uses the documented aggregate/context/projection API; do not archive this change or merge the PR in this workflow.
