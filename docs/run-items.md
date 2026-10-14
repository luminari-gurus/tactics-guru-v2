# Run items and reward offers

[Issue #77](https://github.com/luminari-gurus/tactics-guru-v2/issues/77), branch `work/issue-77-reward-catalog`, base `220d40f0ad179a7ffe5a4e3c67188b99718e722e`. Caller `dubstylee` approved [the OpenSpec plan](../openspec/changes/issue-77-reward-catalog/proposal.md) at `4b719e0` on 2026-10-14. These are initial reviewed values; #81 owns later reviewed playtest tuning. #57 remains the feature-release gate.

## Reviewed catalog

| ID | Label | Kind | Effect | Slot |
| --- | --- | --- | --- | --- |
| item:healing_draught | Healing Draught | Consumable | Restore 6 HP, capped at base max HP | None |
| item:warding_charm | Warding Charm | Equipment | +1 armor class | charm |
| item:aiming_charm | Aiming Charm | Equipment | +1 accuracy | charm |

All entries allow Fighter, Ranger and Mage and use `context: betweenEncounters`. A hero with zero HP stays defeated; these items never revive. Healing requires a living injured hero; full-health targets are rejected without consumption. Equipment can be assigned only to a living eligible hero, with one shared charm slot per hero. No automatic healing, maximum-HP increase, attack-power change or signature-damage change is included.

Item use, equip and unequip are permitted at the first two reward boundaries and the subsequent encounter entry before constructing its active battle. Initial entry and terminal outcomes are excluded. A trusted adapter must check the run boundary and that no active battle exists; run `phase: battle` alone is not permission. Claim grants ownership and advances the reward boundary atomically. The next encounter preparation screen can then use the newly claimed item before battle construction. #78 supplies the pure context preflight; #79/#80 supply controls and the trusted active-battle context. Those implementations are outside this package.

For example, Fighter at 12/18 HP uses a draught and enters the next encounter at 18 HP; Fighter at 16/18 reaches 18, consuming one draught without carrying excess healing forward. A zero-HP Mage and an 18/18 Fighter are invalid healing targets. The explicit item transition updates carried HP; the battle-completion reducer's prohibition on healing/revival is unchanged.

## Definitions and validation

[itemTypes.ts](../src/content/itemTypes.ts) defines `ConsumableDef | EquipmentDef`. Consumables have exactly one `{kind: restoreHp, amount}` effect (integer 1–18). Equipment has slot `charm` and exactly one `{kind: statBonus, stat: accuracy|armorClass, amount}` effect (integer 1–2). Definitions contain `id`, `label`, `kind`, `eligibleHeroes`, `context`, `effect`, and equipment alone has `slot`. No arbitrary effect arrays or advanced status framework is included.

[validateItems](../src/content/validateItems.ts) accepts unknown data and returns located errors or an owned validated catalog copy. It requires 1–32 entries, matching unique keys/IDs, `item:` followed by a lowercase letter and up to 63 further lowercase letters/digits/underscores, nonblank labels of 1–64 UTF-16 code units, and 1–3 distinct known heroes. It rejects unknown fields, kinds, contexts, effects, slots, references, out-of-bounds/unsafe/fractional numbers, sparse/extended arrays, hidden fields, symbols, accessors and nonplain records. Catalogs are trusted after validation; inputs are ordinary JSON/data objects, not hostile Proxy objects.

[items.ts](../src/content/items.ts) validates the authored catalog at runtime import and throws a descriptive error if authored definitions fail. `npm run validate:content` exercises this same validator and the authored import, including invalid definition fixtures; `npm run build` runs that content gate before both typechecks and bundling. [Item fixtures](../tests/unit/items.test.ts) cover rejection and a fourth item described entirely through an existing effect type. [Reward fixtures](../tests/unit/rewards.test.ts) show it participating in offers with its catalog-derived label. There are no item-ID-specific gameplay branches.

The item catalog is separate from `ContentCatalog`. It does not enter current battle rules, single-battle content hashes, replays or save decoding. `itemCatalogIdentity` uses the existing canonical SHA-256 helper over every validated item field plus `REWARD_POLICY`. Labels and hero-list order count toward this identity. Future run codecs must retain this identity and offer version and preserve incompatible bytes for recovery; they must not silently reroll or discard offers. No run codec is added here.

## Owned items and equipment contract

Immutable definitions describe item rules. [ItemOwnership](../src/content/itemTypes.ts) describes separate JSON data for #78 and #79/#80:

```json
{
  "consumables": [{"itemId":"item:healing_draught","quantity":2}],
  "equipment": [
    {"instanceId":"attempt-1:reward:0:option:0","itemId":"item:warding_charm"},
    {"instanceId":"attempt-1:reward:1:option:1","itemId":"item:aiming_charm"}
  ],
  "assignments": [{"heroId":"fighter","slot":"charm","instanceId":"attempt-1:reward:0:option:0"}]
}
```

This example demonstrates shape; it is not a history claimed reachable from two grants. Fresh runs start with all three arrays empty. Each consumable definition has at most one stack, quantity 1–9; zero quantity removes the record. There are at most six owned equipment instances total, equipped or unequipped. Instance IDs are stable, unique, bounded strings; #78 must define and validate their exact encoding from reward identity and selected option ordinal, with no entropy draw. At most three assignments exist: one charm slot per hero, one hero per owned instance. Known matching equipment/slot/hero references and all ownership bounds must be checked before a command commits.

Two copies of a charm are distinct owned instances. Equip changes an assignment; replacement removes the previous assignment and assigns the new instance, leaving the prior instance unequipped and still owned. Unequip removes assignment only. An instance cannot occupy two heroes' slots. Consumables cannot be equipped; unowned instances cannot be assigned. Newly defeated heroes retain ownership/assignment records, but receive no projected battle stats and cannot change equipment; they remain absent from later battles. Overflow, incompatible slot, duplicate identity and rejected target/context leave HP, ownership, actions and RNG unchanged.

Example: Fighter's base armor class is 14. Assign Warding Charm instance A and project 15 onto fresh battle stats. Replace A with Aiming Charm B: A remains in owned equipment, B occupies the slot, and the next fresh battle has armor class 14 and accuracy 5 (base 4 + 1). Unequip B returns the next fresh battle to armor class 14 and accuracy 4. Repeating battle construction must start from catalog base stats and add the assigned effect once, never accumulate 15 → 16 → 17 or mutate catalog records. Stat projection and its executable regressions belong to #78/#80.

## Deterministic reward boundary and serialized offer

The [accepted run contract](run-contract.md) provides one reward after each of the first two victories; the third victory and party defeat have none. Each reward offers two distinct catalog items, each quantity 1, and grants exactly one chosen option. Owned copies remain eligible for later offers; no rarity, weighting, target filter or skip/reroll is introduced. A living full-health party can retain a draught for later use.

[createRewardOffer](../src/domain/rewards.ts) consumes trusted validated `RunState` and `ItemCatalog`. Saved/unknown state must pass `readRunState` first; definitions must pass `validateItems`. Battle/terminal phases or fewer than two catalog entries return null. Starting from the persisted `pendingReward.seed`, seed a fresh sfc32 stream, sort item IDs lexically, draw two uint32s, and for each draw remove index `floor(value * remainingCount / 2^32)`. Option order is draw order. This policy consumes exactly two local draws with a negligible partition bias; it cannot touch a battle RNG or obtain entropy. Policy changes require an offer version/identity decision.

Run seed 123 produces reward seeds `1746306032` and `2025501471`. The independent Python/BigInt recurrences produce raw draws `1251049852 / 4269109725` and `468967378 / 2604923694`, respectively. Both offers select Aiming Charm then Warding Charm for the current three-item catalog. Equal run seeds give equal selections across attempt identities; IDs still distinguish callbacks.

```json
{
  "version": 1,
  "id": "attempt-1:reward:0",
  "seed": 1746306032,
  "catalogIdentity": "sha256:<computed identity>",
  "options": [
    {"itemId":"item:aiming_charm","quantity":1},
    {"itemId":"item:warding_charm","quantity":1}
  ]
}
```

The placeholder must be replaced with the computed identity when storing an actual offer. #79/#80 persist this generated value; previews render its options/labels without advancing RNG. `readRewardOffer` validates unknown stored data against the trusted current boundary/catalog, including exact version/ID/seed/hash and regenerated option order/quantities. It rejects stale, tampered, incompatible or malformed data and returns an owned copy. Regeneration here is pure validation of a fixed seed, not a new entropy draw. Fixture oracles use independent BigInt RNG/selection and Node SHA-256, including reordered catalog keys, input freezing, repeated previews, JSON round trips and fourth-item extension.

## Atomic command and integration handoff

`RewardClaimIntent` carries `type: claimReward`, runId, expected revision, encounterId, boundaryId, offerId and selected itemId. #78 must validate the live run and stored offer, require matching identity/revision/phase, ensure the selected item is offered, and preflight grant/ownership capacity. Only one successful transition both grants the item and acknowledges the reward. Failure or a duplicate/stale request must neither grant nor acknowledge, consume RNG, change actions nor partially update party/ownership. Calling the existing acknowledgment independently is not an inventory grant and must not bypass the future atomic command.

The selected option ordinal plus reward identity supplies an equipment instance identity. Consumables increment their one owned stack; equipment adds a new instance without automatically equipping. Successful use decrements exactly once. Equip/unequip do not consume RNG. Previews are read-only. Battle completion obtains legal results from the validated terminal session, never from arbitrary UI HP; explicit item healing is a separate transition.

| Owner | Required follow-up |
| --- | --- |
| #78 | Ownership reader and atomic claim/use/equip/unequip commands, explicit healing transition and fresh stat projection with rejection/determinism fixtures |
| #79 | Catalog-driven controls and persisted ownership, assignments and concrete pending offers; recovery preserves incompatible bytes |
| #80 | One shared save envelope owner; before-battle preparation context, carried HP/equipment battle initialization and replay reconstruction |
| #81 | Legal full-run controls/playtest and reviewed content tuning, physical-device certification and measured budgets |

These contracts implement #77's specification package. They do not claim runnable item commands, rewards UI, stored inventory, equipment projection or full-run completion.

## Acceptance evidence

| #77 acceptance | Evidence |
| --- | --- |
| Reviewed entries, cadence, targets, slots, ownership and timing | Approved plan, catalog table and context/ownership examples above |
| Discriminated bounded definitions and runtime/build rejection | Types, authored import, validator, item fixtures and content/build gate |
| Seeded offers, persisted identity and exactly-once claim specification | rewards.ts, independent offer fixtures and atomic handoff above |
| Separate owned records and derived battle stats | ItemOwnership types and projection/replacement examples above |
| Additional fixture item without special branch | Item/reward fixture extension and catalog-derived label assertions |

Validation on 2026-10-14:

- `npx vitest run tests/unit/items.test.ts tests/unit/rewards.test.ts`: 38 passed.
- `npm run test:unit`: 598 passed across 34 files.
- `npm run validate:content`: 167 passed across five files; also passed as the production build gate.
- `npm run typecheck`: both application and DOM/Node-free domain/content configurations passed.
- `npm run build`: passed; the existing large-chunk warning remains.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`: 348 main-suite cases plus the configured 18 authored-encounter posttest cases passed, across desktop and emulated mobile portrait/landscape; zero failures, retries or skips. The sandbox first prevented the local server binding; the full rerun outside the sandbox completed successfully.
- Strict OpenSpec validation, relative document links and staged whitespace checks passed.

Browser regression checks cover the existing single-battle application; actual reward UI, full-run and physical-device acceptance remain downstream. No live reward controls or audible/physical-device acceptance is claimed.
