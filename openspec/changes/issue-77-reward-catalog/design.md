# Design

## Context

See [proposal](proposal.md). `run.ts` already derives purpose-separated reward seeds, persists `{id,seed}`, and provides an acknowledgment reducer which does not grant inventory. `ContentCatalog` has exact-shape validation and drives current battle save identity. No item definitions, ownership or item commands exist. Base hero HP is 18/12/11; equipment effects must not change maximum HP or signature damage.

## Goals / Non-Goals

Supply concrete reviewed content, validation, deterministic offers and a downstream ownership/claim contract. Keep this package pure and separate from live battle/storage adapters. Do not implement claim/use/equip commands or stat projection merely to test their documented future semantics.

## Decisions

### Small catalog and explicit timing

Proposed entries:

| ID | Label | Kind | Effect | Quantity per reward |
| --- | --- | --- | --- | --- |
| item:healing_draught | Healing Draught | consumable | restoreHp: 6 | 1 |
| item:warding_charm | Warding Charm | equipment | armorClass: +1 | 1 |
| item:aiming_charm | Aiming Charm | equipment | accuracy: +1 | 1 |

All three heroes are eligible; dead heroes are excluded. Healing requires injured living targets and caps at base max HP. Use and equipment changes occur between encounters: during reward phase or after acknowledgment at the next encounter entry, before an active battle has been constructed. This allows a newly claimed draught or charm to be used before the next battle. The command adapter must prove this context using run boundary and absence of an active battle; `phase: battle` alone is insufficient. Initial encounter entry and terminal outcomes are excluded. One `charm` slot per living hero; unequipped items remain owned. No automatic healing/revival. Battle-time consumables would introduce action-economy decisions, so this catalog restricts use to between encounters.

Types use `kind: consumable` with one `restoreHp` effect, or `kind: equipment` with one `statBonus` effect limited to `accuracy|armorClass` and slot `charm`. Bounds: 1–32 definitions, item IDs `item:` plus 1–64 lowercase ASCII letters/digits/underscores beginning with a letter, labels 1–64 nonblank characters, heal amount 1–18, bonus 1–2, unique nonempty eligible hero lists drawn from Fighter/Ranger/Mage. Fixed contexts are part of discriminated shapes. No effect arrays or general status framework; multiple bonuses can be considered in later reviewed scope.

### Separate catalog and identity

Use `itemTypes.ts`, authored `items.ts` and `validateItems.ts`, following existing pure shape/dense-array/reference helpers. Validation returns located errors and an owned validated copy. Runtime import validates authored content; add its focused tests to `validate:content` so build-check instructions catch invalid authored values. Keeping items outside `ContentCatalog` preserves existing battle saves and avoids importing unused item rules into single-battle combat. Compute separate `hashJson` identity over all validated item values plus reward policy/version; downstream run codecs must record it and fail safely on mismatch.

### Deterministic offer construction

`rewards.ts` accepts a validated reward-phase RunState and validated catalog. Start fresh `seedRng(pendingReward.seed)` and sort item IDs lexically. Draw twice, each time select `floor(uint32 * remainingCount / 2^32)` and remove the selected entry; two distinct options each grant quantity 1. This fixed two-draw algorithm is deterministic but carries tiny modulo/partition bias, acceptable for three casual reward entries. Avoid rejection sampling complexity; pin independent golden fixtures. Require at least two rewardable entries. No mutable battle RNG is accepted by this interface.

Offer shape: `{version:1, id, seed, catalogIdentity, options:[{itemId,quantity:1},{itemId,quantity:1}]}`. ID and seed equal #75's pending boundary. A pure reader checks exact shape, bound values, identity and exact regenerated options against the trusted boundary/catalog, returning owned data. #79/#80 persist the generated offer; UI previews display it. Regeneration is for validation, not a new mutable draw. No offer at battle/terminal phases. Rule changes require offer-version/identity changes.

### Owned data and atomic claim handoff

Document JSON shapes for consumable stacks `{itemId,quantity}` (one entry per definition, 1–9), equipment instances `{instanceId,itemId}` (at most 6, unique bounded IDs), and assignments `{heroId,slot:'charm',instanceId}` (at most one per hero; one owner per instance). Fresh runs start empty. Claims mint an equipment identity from reward boundary plus option ordinal, without entropy; exact encoding/validation belongs to #78. Assignment refers to an owned compatible instance and eligible living hero. Replacing/unequipping changes assignment only, never duplicates ownership. A maximum of two grants in this run fits the bounds; overflow rejects the whole claim.

Claim intent includes #75 runId/revision/encounterId/boundaryId plus selected item ID and offer identity. #78 must preflight ownership, phase, eligibility and grant, then commit inventory plus `acknowledgeReward` together. Failed/duplicate commands do not acknowledge the boundary. Healing updates explicit run party HP under a reviewed item transition, rather than weakening `completeBattle`'s no-healing rule. #80 must coordinate equipment projection with battle initialization/replay; #79/#80 share one save envelope owner. This issue specifies these contracts without implementing reducers or changing RunState.

## Verification and acceptance mapping

| #77 criterion | Evidence to deliver |
| --- | --- |
| Reviewed values, cadence, contexts, ownership and timing | Approved design table and `docs/run-items.md` |
| Discriminated bounded definitions and runtime/build rejection | Compile checks and malformed catalog fixtures through runtime validator and content script |
| Deterministic offers, persisted identity, exactly-once intent | Independent golden/order/nonmutation/invalid-offer fixtures plus atomic claim handoff documentation |
| Owned records distinct from definitions/stat projection | Bounded JSON contract and worked equip/replace/unequip/projection examples; no command implementation claim |
| Additional generic fixture item | Fourth definition accepted/offered via existing effect shape and catalog label |

Run focused item/reward tests, full configured unit/content/browser suites, both typechecks, production build, strict OpenSpec validation and `git diff --check`. Existing browser flows provide regression evidence only; real reward UI/device/full-run acceptance is downstream. Record exact results and limitations.

## Risks / Trade-offs

- Proposed balance may need later playtesting → approval establishes initial values; #81 owns reviewed content tuning.
- Equipment changes can affect replay → document #80's initialization/replay obligation without changing current battle stats.
- Healing requires a future explicit item transition → #78 supplies it atomically; no relaxation of accepted completion validation here.
- New item content invalidates future run offers → separate identity/version, explicit fail-safe codec handoff, no silent rerolls.

## Migration Plan

This package adds no live player flow or storage format. Existing saves remain compatible. Revert the isolated package if needed before downstream integration. Feature release still waits for #57; no deployment is included.
