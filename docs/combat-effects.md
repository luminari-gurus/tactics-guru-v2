# Combat effects

Audited runtime base: `2b5a063f4a7e8f4a6329eaf1f80630133754012a`; implemented by the approved [#161 staged change](../openspec/changes/issue-161-combat-effects/proposal.md). This is a contract and first production integration, not delivery of all downstream effects.

## Enabled runtime: Guarded

`src/domain/effects.ts` reads one closed `guarded` case with the Fighter instance as both source and target. Guarded Strike applies −2 attack and grants +2 AC after an accepted hit or miss; an active guard and a prospective Guarded Strike never double the penalty. Shared projection supplies combat previews/resolution, enemy expected-damage scoring through those previews, and HUD/inspection. Catalog stats already include equipment, which is not applied again.

The optional `guarded: true` field is the only stored effect; it is a finite boolean, not a stack. Grant replaces rather than stacks. It expires before the living Fighter's next turn, including initiative wrap. Accepted damage and turn transitions remove it from defeated units; new battle construction starts without it. Defeat carries its own event, not a second guard-expiry event. Previews, cancellation and rejected commands never grant/expire effects, spend budgets, append events or draw RNG. Resolution preflights before drawing locally and adopting a complete result.

## Closed downstream contract — not enabled gameplay

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

These cases are specified handoffs. Unsupported status/resource fields and ability kinds reject through the existing exact-shape readers/validators. There is no general effect script, unused resource map or test-only action in production. Mark source-death, taunt duration, immobilization refresh, profile amounts/DCs and acquisition remain subject to the owning issue's approved plan.

Source evidence: pinned legacy [resolver](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd), [status definitions](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/content_defs/StatusEffectDefinition.gd), and the linked content issues in the table. Approved v2 [signature rules](signature-abilities.md) take precedence over legacy Guarded/Mage behavior.

## Proposed ordering for later consumers

Preflight complete command, targets, uses and immunity policy; project baseline/equipment once; evaluate status/height/profile modifiers; roll required attack/save dice locally; consume qualifying on-attack effects; compute base damage and profile modifiers; multiply critical; combine bounded rational resistance/vulnerability and floor once; apply minimum 1 to a nonimmune damaging hit; clamp HP; clean defeated effects; grant successful-damage stacks; decide terminal outcome; commit state/events atomically. Immunity means zero damage and no damage-trigger stacks. Immune effect-only targets reject before spending or RNG; mixed damage/status profiles must explicitly define blocked-status behavior.

Proposed saves are d20 + the chosen save modifier >= DC, without automatic natural-1/20 outcomes. This is not an implemented save resolver: #166 must settle its actual profile and prove boundaries. Ordinary attacks remain untyped here. Magic Missile retains automatic force hits, range 1–5, 1d4+1 per missile and existing count/spread; no resistance or save machinery is added. Forced movement and path/hazard trigger order belong to #167/#168/#171.

## Persistence and acceptance gates

State format 1/rules 2, standalone envelope format 1 and existing run/dungeon envelopes remain unchanged. Historical defeated-unit `guarded` flags are read without normalization before digest checking; projection treats them as inactive. Inspection does not rewrite storage. Unsupported/corrupt/incompatible data uses existing recovery and retains original bytes. Effect state is battle-local and never projected into carried party data. Later heal consumers must replace the run reader's current entry-HP upper bound deliberately; later new kinds/uses require reviewed versioning, source references, lifetime/stack/resource bounds, size limits and safe recovery or migration.

| #161 criterion | This increment | Remaining acceptance |
| --- | --- | --- |
| Minimal model | Closed contract and enabled Guarded view | Additional real consumers |
| Typed damage/save/immunity | Explicit proposed ordering and source links; current attacks preserved | #166–#169/#171 implementation/proof |
| Shared pure evaluation/preflight | Guarded combat, AI and UI projection | Same integration for each new kind |
| Lifecycle/scope | Self identity, one guard, expiry/defeat/new-battle cleanup | Consumer durations, stack/resource semantics |
| Serialization/replay | Existing bounded Guarded shape and continuation | Marks, taunt, immobilization and finite uses with production profiles |

Keep #161 open until all consumer-dependent gates have production evidence. The first increment uses `Refs #161` and a draft PR. Browser/device emulation is sufficient; physical hardware testing is not claimed. See the task-specific QA report for measured results.
