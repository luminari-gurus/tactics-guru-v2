# Signature abilities (#8)

## Mage progression (#165)

Arc Bolt is intentionally consolidated into Magic Missile, available at level 1.
There is no separate Arc Bolt unlock at level 2. Magic Missile retains one action,
automatic hits with no attack/save/critical, 1d4+1 force damage per missile,
Manhattan range 1–5 and LOS. Count is min(5, floor((casterLevel+1)/2)); levels
1–5 yield 1, 1, 2, 2, 3 missiles. Each draws its own seeded d4 in designated
order. Repeated targets and living allies are legal; distinct targets must be
pairwise within three tiles. The HUD confirms deliberate friendly fire and sends
all missiles to the selected target. All-target/dice preflight is atomic;
overkill does not retarget or duplicate defeat, and Mark is not consumed.

Frost Snare unlocks at level 3 (180 XP). It uses one action against one living
hostile at Manhattan range 2–4 with LOS, without damage, attack/save rolls,
RNG draws, cooldown or limited uses. The Mage may still move and must Wait to
end its turn. Both current goblin types are susceptible; no immunity is invented.

Pin and Snare share one movement block per target. Either rejects an existing
block without stacking, replacement, refresh or expenditure. Ordinary moves reject
and reachability contains only the origin; legal in-place attacks and Wait remain
available. A block expires after the target's next accepted endTurn, or immediately
on source/target defeat through any damage path, including friendly missiles.
Unrelated turns, round wrap and later range/LOS changes do not expire it. Mark
remains independent; new encounters reset all battle-local blocks.

The existing picker, pure preview, inspection, log and floating feedback distinguish
Snared by Mage from Pinned by Ranger. Effect-only casts emit no attack cue or
signature animation. No new assets, resistance system, Ember Burst or reward
upgrade is included.

## Ranger progression (#164)

Mark Target unlocks at level 2 (60 XP); Pinning Shot at level 3 (180 XP).
Both spend one action against a living hostile unit at Manhattan range 2–5 with
ordinary LOS, without damage, attack/save rolls, cooldowns or limited uses.
High Shot retains its existing range, elevation and damage rules.

Mark stores one living Ranger source per enemy. The newest application replaces
that source without stacking; different enemies may be marked simultaneously.
The next accepted player-side attack roll gains +2 accuracy and consumes the Mark,
including misses and natural 1/20. Basic Attack, High Shot and Guarded Strike use
that same evaluation. Preview/cancel/rejection, enemy attacks, movement, Wait and
automatic-hit Magic Missile do not consume or benefit. Multi-missile damage clears
a mark only if its target or source is defeated. Mark has no turn countdown;
target/source defeat and replacement of the battle clear it.

Pinning Shot is deliberately adopted in v2: the legacy resolver and level-3
unlock existed, but the normal legacy Ranger action list omitted it. Pin prevents
ordinary movement through the target's next accepted endTurn, including round
wrap. Attacks and Wait remain legal; source/target defeat also clears it. An
already movement-blocked target rejects without spending anything. Movement preview retains
only the origin so enemy planning can still choose an attack or Wait; this grants
no forced-movement immunity. Mark and Pin may coexist. Both current goblin kinds
are susceptible; typed/tag immunity remains with #169's first immune consumer.

The existing picker, no-roll preview, inspection, accepted-event log and floating
feedback expose these rules. Learned actions follow run/dungeon progression;
standalone starts at level 1. Current save/resume retains exact bounded
`markedBy` and `movementBlock: {sourceId, abilityId}` references; new encounters reset both. No status engine,
Lingering Mark upgrade is introduced.

## Fighter progression (#163)

Second Wind unlocks at level 2. It targets the living active Fighter itself at
range 0, heals `min(missing HP, 4 + projected power)`, and spends an action and
the single battle use atomically. It makes no roll or RNG draw. Full HP, a spent
use/action, a foreign/dead target or unavailable ability rejects without mutation.
The picker and inspection show 0/1 or 1/1 use; the preview shows actual healing.
Turn changes and reload retain spent use; fresh encounters/restart reset it.

Taunt unlocks at level 3. It spends one action, targeting a living hostile at
Manhattan range 1 with ordinary LOS. No hit/save roll, damage, cooldown or use
limit applies. All current enemies are eligible; no current enemy has immunity.
Unsupported immunity fields reject through exact content/state readers.
One source instance replaces the previous source without stacking. The target's
next accepted endTurn expires it, including an idle turn across initiative wrap;
source/target defeat clears it immediately. A defeated source never restricts attacks.
Shared offensive previews/resolution and AI enforce the living source exclusively.
AI attacks from a legal position, approaches a reachable firing position or Waits,
respecting bow minimum range, terrain, LOS, occupancy and spent budgets.

Healing and Taunt use the existing native picker, board/self targets, direct
confirmation, inspection, accepted-event log and floating feedback. Guarded Strike
and Magic Missile retain their approved rules and Guarded retains its board shield.

Current battle state format 4/rules 5 and run envelope 6 reject earlier versions as incompatible while preserving original bytes through existing recovery/export. Dungeon envelope 8 accepts format 7 and rejects earlier versions with the same recovery/export safeguards. The standalone wrapper remains format 1 and RNG stays 1.
Run/dungeon readers admit healing above entry HP only within the spent Fighter's
single heal bound and projected max HP. Short-run completion carries the spent-use
fact from the validated battle into its reducer; it is never stored in party data.
Dead heroes stay dead and new encounters carry HP while resetting battle-local flags.

## Current ability controls (#162)

Standalone battles project the validated raw catalog to the starting party's
level-1 learned abilities before loading, session creation and persistence.
Run and dungeon battles use their own earned progression projection.

The shared standalone/run/dungeon battle HUD lists every owned non-basic ability in the
**Ability** selector, ordered by ID. Changing the selector activates that exact
ability; its named action button reactivates the selected ability after Move,
Basic attack or cancellation. Selection prepares a preview only. **Confirm action**
executes the authoritative command immediately, without an additional modal.
Move, Basic attack and Wait remain directly available, and spent budgets and locked phases disable actions
with readable reasons.

Range and target guidance come from the selected profile; hit/damage previews
come from shared domain evaluation. Ordinary attacks target living enemies.
Magic Missile may deliberately target a living ally within range and LOS, with a
named **Friendly fire** warning in the preview before direct confirmation. Its
current minimum range excludes self-targeting. The HUD sends all missiles to the chosen creature;
the domain's per-missile allocation API and spread rules are unchanged.

Inspection and viewport changes retain ability/target/intent. Cancel, accepted
commands, actor changes and restart discard stale intent; Continue reconstructs
current availability without executing an uncommitted choice. Selection and
cancellation do not change saved state, RNG or replay.

Ownership comes from catalog `owners` after shared [progression projection](hero-progression.md).
Production has the three starting signatures plus the Fighter, Ranger and Mage actions
above; extra test profiles exercise selection independently. Hero profiles can
declare `requiredLevel` (default 1); canonical learned state gates availability.
Implemented kinds are attack, guardedAttack, magicMissile, secondWind, taunt,
markTarget, pinningShot and frostSnare. Second Wind has one bounded battle use; generic
resources, cooldowns and cell/area actions remain future work.
Additional well-formed ability IDs can use these existing profiles with bounded
values and distinct existing owners. Canonical IDs remain required with their
original kind and ordered owners. See `src/content/validate.ts` and
[ability-picker acceptance](qa/issue-162-ability-picker.md).

## Historical implementation and verification

The sections below retain the original implementation sequence and test results.
Their references to future UI integration and absent persistence describe those
historical revisions, not the current application.


Implementation branch: `codex/issue-8-signature-abilities`, based on merged #7 and #29.

The first slice moves Basic Attack and Shortbow Shot into validated content while preserving
their replay IDs and ordinary d20 behavior. High Shot belongs only to the Ranger: Manhattan
range 2–5, line of sight, base damage 2 plus Power, and +2 damage only from higher ground.
The existing +2/−2 elevation accuracy rule still applies. Preview and dispatch use the same
profile and calculation. Ability data counts toward the content version; catalogs remain
immutable inputs and changed content requires a new catalog object.

Brian approved High Shot and initially mapped Guarded Strike to Fighting Defensively on
2026-10-09. Issue #49 supersedes that −4/+2 choice with a fixed −2 attack / +2 dodge AC
Combat Expertise-inspired tradeoff. Magic Missile remains the approved Ember Burst replacement.
Issue #8 is complete; this correction changes only Guarded Strike's tradeoff.

## Guarded Strike: fixed Combat Expertise tradeoff

Source: [D&D 3.5E SRD, Combat Expertise](https://www.d20srd.org/srd/feats.htm#combatExpertise).
The Fighter uses its action for a normal range-1 melee attack (base damage 2 plus Power),
with **−2 to attack rolls and +2 dodge AC for the round**. The defense applies on a resolved
hit, critical, or miss, including natural 1. Rejected commands grant nothing and consume
neither action budget nor RNG. Damage and natural 1/20 rules stay unchanged.

For this game's turn system, the round-long effect expires immediately before the Fighter's
next turn starts, rather than when the global round counter changes. The penalty applies to
the activating attack and any further attacks while Guarded; it is applied once, not stacked.
Basic Attack retains normal accuracy, so Guarded Strike trades offense for defense (D6).
This resolves the Guarded-on-miss portion of D5; the Magic Missile replacement retires
Ember Burst's ally-targeting question.
The name Guarded Strike is retained, with −2/+2 approved for this slice (its part of D11).

The fixed two-point exchange is inspired by a Fighter bonus feat. The SRD feat requires
Intelligence 13 and allows a variable exchange limited by base attack bonus (up to five);
this slice adds neither those character systems nor a variable selector. Its existing
next-turn expiry is a game adaptation, not exact tabletop duration parity.
The mapped slice uses the flat +2 rule: no Tumble-rank adjustment, distinct-source stacking,
full attacks, or generic effects engine. Preview, resolution and attack events share the AC
and accuracy calculation. Snapshots record only an active `guarded: true` on the Fighter;
turn transitions remove it and emit expiry before `turnStarted`. Shared effect projection now
supplies HUD/inspection and the attack previews used by AI. Defeat removes guard; historical
saves with inert defeated-unit guard remain readable. See [combat effects](combat-effects.md).

A persistent shield badge beside the living Fighter marks active Guarded on the battle
board, including after a missed strike and when resuming a save. It follows the snapshot
rather than replaying the activation animation. Status and touch-accessible inspection
explain both modifiers and next-turn expiry; the badge clears on expiry or defeat.

## Magic Missile replaces Ember Burst

Approved plan change (2026-10-09): the Mage's signature is **Magic Missile**, not Ember Burst.
Source: [D&D 3.5E SRD, Magic Missile](https://www.d20srd.org/srd/spells/magicMissile.htm).

- A 1st-level Sorcerer/Wizard evocation spell dealing force damage. It uses one standard
  action, mapped to the game's one action budget.
- Each missile hits its designated creature automatically: no attack roll, AC check,
  critical hit, or saving throw. Each missile deals **1d4+1 damage (2–5)**; do not replace
  the roll with a fixed 3 or add Power, height damage, or attack modifiers.
- Missile count depends on **caster level**, not spell level: one at levels 1–2, two at
  3–4, three at 5–6, four at 7–8, and five at 9 or higher. A level-1 caster therefore
  fires one missile; the starting Mage uses caster level 1 in the validated ability profile.
- Multiple missiles may strike one creature or be divided among creatures. All targets
  are designated before resistance checks or damage rolls; one missile hits one creature.
  This is unit targeting, not a radius attack or an empty-cell cast. There is no automatic
  splash damage or friendly fire; the tabletop spell can deliberately target any eligible
  creature, so an enemies-only game restriction would be an adaptation.
- Tabletop range is 100 feet + 10 feet per caster level; when targeting several creatures,
  no pair may be more than 15 feet apart. Brian requested Ranger-like range: the slice uses Manhattan range 1–5 tiles, matching High Shot’s maximum. Multiple targets must be within 3 tiles of each other. These are explicit game adaptations.
  Automatic hits do not bypass total cover or total concealment; retain legal-target and
  line-of-effect checks. Spell resistance applies in 3.5E; relevant protections such as
  Shield must be honored if those mechanics enter the game. They are not implemented here.

Implemented domain contract: use the seeded battle RNG for a separate d4 per missile in recorded
missile order. Preview shows the 2–5 damage range per missile and designated targets without
advancing RNG. Validate the whole cast before spending the action or rolling; rejection
leaves state, budget and RNG unchanged. No Dex-save resolver, blind status or area-selection
UI is needed for this signature. Tests cover damage bounds, seeded replay, automatic
hits, legality, action spending, and missile count/assignment across caster levels 1–20.

All three signatures are implemented in the pure domain. Magic Missile uses `previewMagicMissile`
from `src/domain/combat.ts` and resolves through `dispatch`. A `{ unitId }` target sends every
missile to one creature; `{ missileTargets: [id, ...] }` assigns one target per missile in order.
It may deliberately target allies, as the tabletop creature-target rule permits; the minimum one-tile range excludes self-targeting in this slice.
Profiles record starting caster level; run/dungeon projection uses the Mage hero level (1–5), preserving this formula. No spell-resistance system is added.
All assigned dice are drawn before applying damage, so RNG exhaustion rejects the whole cast.
Overkill does not retarget later missiles or emit duplicate defeat/outcome events.

Focused verification: `npm run test:unit -- tests/unit/abilities.test.ts`, plus existing combat
and content tests. High Shot tests exercise the real authored Ranger through preview and
dispatch, critical damage, range limits, ownership, LOS, wrong targets, spent actions, input
isolation, content identity and malformed profile validation.

First-slice results:
- Against the original `combat.ts`, the initial focused tests failed for the missing High Shot
  behavior (2 failed, 1 passed); restoring the new implementation made them pass.
- `npm run test:unit`: 195 passed, including the expanded 4-test ability suite.
- `npm run validate:content`: 77 passed.
- `npm run typecheck`, `npm run build`, and `git diff --check`: passed. Build retains the
  existing large Phaser chunk warning.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`:
  99 passed across desktop and emulated mobile portrait/landscape. These check the existing
  proof scene; they do not demonstrate a playable signature UI or physical-device acceptance.

Guarded Strike verification (2026-10-09):
- Focused Guarded Strike preview, resolution and rejection tests failed before implementation;
  the final `tests/unit/abilities.test.ts` suite passes all 9 tests, including deterministic
  replay, turn-boundary expiry, malformed guards/profile rejection and nonstacking penalties.
- `npm run test:unit`: 200 passed; `npm run validate:content`: 77 passed.
- `npm run build` (including both strict TypeScript checks) and `git diff --check`: passed.
  The existing large Phaser chunk warning remains.
- The configured `npm test` suite with the Chrome executable above passed 99 tests again.
  UI integration remains #10; the three-signature domain acceptance for #8 is implemented.

## Completed three-signature verification (2026-10-09)

- `npm run test:unit`: 206 tests passed across 19 files, including all 15 signature tests.
- `npm run validate:content`: 77 tests passed.
- `npm run build`: strict app/domain type checks and production build passed; the existing Phaser bundle-size warning remains.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`: all 99 configured browser regression tests passed (desktop and mobile emulation). These exercise the existing app shell, not signature UI or physical iPhones.
- `git diff --check`: passed.

The domain implements all three initial signatures. Their battle UI integration remains #10.

Guarded Strike correction (#49, 2026-10-09): the shared `GUARDED_STRIKE_TRADEOFF`
uses a positive penalty magnitude of 2, subtracted once, and an AC bonus of 2.
The ability data changes the rules-content hash; snapshots and replays carrying the old
content version are rejected. `RULES_VERSION` remains 1 under its existing policy:
the app has no battle save/replay persistence yet, and no migration is introduced.
The focused regressions were RED first (three failures: bonus, old penalty validation,
and unchanged content identity), then all 16 signature tests passed. They cover natural
9 missing versus natural 10/11 now hitting at +2 against AC 12, plus existing miss/critical,
Guarded AC/expiry, non-stacking, rejection purity and replay behavior.
Final #49 validation: `npm run validate:content` 77 passed; `npm run test:unit` 207
passed (19 files); `npm run build` passed strict application/DOM-free domain checks and
production build (existing Phaser chunk-size warning); `git diff --check` passed.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`
passed all 117 configured browser regressions in 3.2 minutes. These exercise the current
proof/content shell in desktop and mobile emulation; they do not claim a signature HUD
or physical-device certification. #9 and #10 should consume the corrected shared preview.

Additional guardedAttack profiles retain the domain’s Fighter-only guarded-effect lifecycle; the validator rejects other owners for that profile.
