# Combat effects

Foundation audit: `2b5a063f4a7e8f4a6329eaf1f80630133754012a`, implemented by the
approved [#161 staged change](../openspec/changes/issue-161-combat-effects/proposal.md).
The #164 Ranger consumer builds on main `56e2b0d`; it enables the cases below
without claiming delivery of every downstream effect.

## Enabled runtime: Guarded, Second Wind, Taunt, Mark, Pin, Snare and Shaman support

Issue #163 activates the bounded Heal/Uses/Taunt handoffs below. See [the current Fighter rules](signature-abilities.md#fighter-progression-163). `secondWindUsed?: true` stores one spent Fighter use; `tauntedBy?: number` stores one living opposing Fighter source on a living enemy. Exact readers reject malformed values and ineligible profiles/references. Pure previews, dispatch, AI and inspection share these rules; accepted events drive logs and floating feedback. Taunt expires at target endTurn or source/target defeat. No generic status/resource framework is added.

Issue #164 activates Mark and movement blocking through [the Ranger rules](signature-abilities.md#ranger-progression-164).
`markedBy?: number` references one living opposing Ranger with the learned Mark
profile. Pin and Frost Snare now share `movementBlock?: {sourceId, abilityId}`;
exact readers admit only learned Pin/Ranger and Snare/Mage ownership. Mark grants +2 to the next accepted
player attack roll and is consumed even on miss; automatic missiles do not use it.
Pin/Snare block ordinary movement through target endTurn while permitting attack/Wait.
Either rejects an existing movement block without stacking, replacing or refreshing.
Mark and movement blocks clear on source/target defeat and new-battle construction;
distinct targets and Mark plus one movement block can coexist. Their
previews spend nothing and all damage paths perform defeat cleanup. Current
goblins have no immunity. #166 adds only optional validated `weakened`/`debuff`
immunity IDs for its real consumer; no general immunity/forced-movement engine.

Issue #166 enables Weakening Hex and Heal Goblin through the existing preview,
dispatch, AI and event surfaces. Hex has hostile range 2–4 and LOS, draws one d20
after full preflight and saves on `d20 + target.will >= 10 + projected caster.power`.
Natural 1/20 have no automatic save outcomes. Failure stores one `weakenedBy`
living opposing Shaman and subtracts two accuracy once in shared projection.
Reapplication replaces/refreshes; a saved cast preserves an existing source.
Target endTurn or source/target defeat expires it. It affects attack rolls, not
Will, AC, movement or automatic Magic Missile. Preview/result/inspection expose
the same exact twenty-face chance arithmetic. Immune effect-only casts reject
before spending or RNG; production actors have no assigned immunities.

Heal Goblin has allied range 1–4 and LOS, targets only living injured grunt,
archer or Shaman, and applies `min(4, projectedMaxHp-hp)`. It consumes one ordinary
action, no die/use pool/cooldown, and cannot revive or self-heal. Invalid casts
leave state/events/budgets/RNG unchanged. Enemy healing remains within projected
max HP and grants no hero-entry HP or Second Wind allowance.

`src/domain/effects.ts` reads one closed `guarded` case with the Fighter instance as both source and target. Guarded Strike applies −2 attack and grants +2 AC after an accepted hit or miss; an active guard and a prospective Guarded Strike never double the penalty. Shared projection supplies combat previews/resolution, enemy expected-damage scoring through those previews, and HUD/inspection. Catalog stats already include equipment, which is not applied again.

The optional `guarded: true` field is a stored effect; it is a finite boolean, not a stack. Grant replaces rather than stacks. It expires before the living Fighter's next turn, including initiative wrap. Accepted damage and turn transitions remove it from defeated units; new battle construction starts without it. Defeat carries its own event, not a second guard-expiry event. Previews, cancellation and rejected commands never grant/expire effects, spend budgets, append events or draw RNG. Resolution preflights before drawing locally and adopting a complete result.

## Closed downstream contract — remaining cases are not enabled gameplay

| Closed case | Enabled semantics / remaining consumer proposal | Owning issue / implementation gate |
| --- | --- | --- |
| Guarded | One battle-local self status, attack −2/AC +2, grant after accepted hit/miss, replace not stack; expire at source next-turn start; remove on defeat | This increment; existing Guarded Strike |
| Heal | Living eligible target only; reject full HP; clamp once to projected max HP; no RNG unless profile explicitly requires it | #163 Second Wind / #166 Heal Goblin / #172 item; each owns amount, uses and action cost |
| Mark | One mark per target, newest replaces; next qualifying player attack roll gains +2 and consumes even on miss; previews and automatic missiles do not consume; target/source defeat removes | #164; source-death cleanup is the approved v2 adaptation |
| Taunt | One living hostile source; restrict offensive targets to source; allow legal approach or Wait if unreachable; remove on source/target defeat; replace same case | #163; duration anchored to target turn boundary and reviewed in its plan |
| Movement block | Pin/Snare keep only origin reachable, rejects ordinary moves without spending, permits attack/Wait; target endTurn or source/target defeat expires; already blocked rejects without stacking, replacement or refresh | #164 enables Pin; #165 enables Frost Snare |
| Accuracy/AC debuff | Add bounded integer modifier once through shared projection; same identity replaces, distinct permitted identities add within derived bounds | #166 weakened / #168 exposure; no guessed DC/duration in this increment |
| Finite stack | Explicit identity/source/target and cap; add only on consumer's successful trigger; reject overflow in saved input, saturate legitimate gain | #168 frenzy: cap 3, +1 accuracy per stack; trigger/expiry decided with its real profile |
| Uses | Per-ability finite nonnegative integer remaining uses; whole-command validation before decrement; fresh-battle reset; save mid-battle | #163 Second Wind; no inert resources map now |

Guarded, Second Wind healing/uses, Taunt, Mark, Pin, Snare, Weakened and Goblin healing are enabled. Other cases
remain specified handoffs. Unsupported status/resource fields and ability kinds
reject through exact-shape readers/validators. There is no general effect script,
unused resource map or test-only action in production. Future profile amounts,
DCs, immunity and acquisition remain with their owning issues.

Source evidence: pinned legacy [resolver](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd), [status definitions](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/content_defs/StatusEffectDefinition.gd), and the linked content issues in the table. Approved v2 [signature rules](signature-abilities.md) take precedence over legacy Guarded/Mage behavior.

## Proposed ordering for later consumers

Preflight complete command, targets, uses and immunity policy; project baseline/equipment once; evaluate status/height/profile modifiers; roll required attack/save dice locally; consume qualifying on-attack effects; compute base damage and profile modifiers; multiply critical; combine bounded rational resistance/vulnerability and floor once; apply minimum 1 to a nonimmune damaging hit; clamp HP; clean defeated effects; grant successful-damage stacks; decide terminal outcome; commit state/events atomically. Immunity means zero damage and no damage-trigger stacks. Immune effect-only targets reject before spending or RNG; mixed damage/status profiles must explicitly define blocked-status behavior.

The Shaman consumer now implements Will saves with the exact arithmetic above;
other save kinds still need their own reviewed consumers. Ordinary attacks remain
untyped. Magic Missile retains automatic force hits, range 1–5, 1d4+1 per missile
and existing count/spread. No resistance machinery is added. Forced movement and
path/hazard trigger order belong to #167/#168/#171.

## Persistence and acceptance gates

Issue #166 advances battle state to format 5/rules 6, run envelope to 7 and dungeon
envelope to 8 (following #165’s 4/5, 6 and 7 respectively); standalone wrapper and
RNG remain 1. Earlier saves are incompatible and retain recovery/export of original
bytes. Historical defeated-unit `guarded` flags are read without normalization
before digest checking; projection treats them as inactive. Inspection does not
rewrite storage. Unsupported/corrupt/incompatible data uses existing recovery.
Effects are battle-local and never projected into carried party data. Second Wind
admits bounded spent healing above entry HP in aggregate readers/completion. New
effects require reviewed versioning, source/lifetime/resource bounds and recovery.

| #161 criterion | This increment | Remaining acceptance |
| --- | --- | --- |
| Minimal model | Closed contract; Guarded, Second Wind, Taunt, Mark, Pin/Snare and Shaman support | Additional real consumers |
| Typed damage/save/immunity | Shaman Will save and bounded weakened/debuff immunity; current attacks preserved | Typed damage/resistance and #167–#169/#171 consumers |
| Shared pure evaluation/preflight | Fighter/Ranger/Mage/Shaman combat, movement, support AI and UI projection | Same integration for each remaining kind |
| Lifecycle/scope | Bounded guard/use/taunt/mark/movement-block/Weakened, target/source expiry and fresh-battle cleanup | Future stack/resource semantics |
| Serialization/replay | Bounded enabled effects and continuation | Future effects/resources |

Keep #161 open until all consumer-dependent gates have production evidence. The original Guarded increment used `Refs #161` and a draft PR. Browser/device emulation is sufficient; physical hardware testing is not claimed. See the task-specific QA report for measured results.
