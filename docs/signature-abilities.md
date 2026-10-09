# Signature abilities (#8)

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
turn transitions remove it and emit expiry before `turnStarted`. UI and AI remain later work.

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
Profiles record the starting caster level; no progression tree or spell-resistance system is added.
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
