# Issue #163: Fighter Second Wind and Taunt

Date: 2026-10-25 (Asia/Jerusalem). Status: plan ready; branch published and
natively linked to #163. Implementation and runtime qualification remain to be done.

- Issue: [#163](https://github.com/luminari-gurus/tactics-guru-v2/issues/163).
- Assignee: `moshehbenavraham`; [pickup comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/163#issuecomment-6396849340).
- Base: `origin/main` at `f2b8b95df128d6936d405eacdc235834c575a207`.
- Branch: [branch/issue-163-fighter-abilities](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-163-fighter-abilities).
  Created from the recorded base after writing this plan through GitHub's
  native linked-branch operation; this branch appears in #163's Development section.
- Prior root plan: [issue-205-audio-equivalence-plan.md](issue-205-audio-equivalence-plan.md),
  preserved byte-for-byte (SHA-256
  `e31af7d1fbeb855d192039dc71eb6cb2c8b1e32f446e2a4761829dcfe9c3e6d7`).
  Its recorded statuses are historical; PR #229 is now merged.

## Outcome

Make Second Wind and Taunt real, level-gated Fighter abilities through the existing
domain, session and accessible ability picker. Second Wind heals once per battle;
Taunt constrains one enemy's offensive targeting for its next turn. Preserve
atomic rejection, deterministic replay, save/resume, encounter transitions and
the approved Guarded Strike and Magic Missile rules.

## Backlog review and selection

Reviewed all **37 open issue bodies**, labels and assignees, all **four open PRs**,
and all **six remote branches**, including work without `ready for work`. REST
page 2 is empty; GraphQL reports `totalCount: 37`, `hasNextPage: false`. Native
blocked-by and Development relationships were checked for every open issue.
Every open issue has zero project memberships; the organization and authenticated
user each report zero Projects V2. Repository-level Projects V2 listing requires
an unavailable `read:project` scope, so a separate repository-only draft-item
inventory could not be verified. No access settings were changed.

Selection is based on current source and completed prerequisite increments, not
the readiness label. #163 has only `enhancement`, was unassigned with no comments,
linked branch or competing PR immediately before pickup, and is high priority.
It is the oldest concrete high-priority class-ability slice newly enabled by
merged [#160 / PR #238](https://github.com/luminari-gurus/tactics-guru-v2/pull/238).
The existing picker and effect handoff provide its integration path. The reusable
healing and forced-target behavior can support later content, but completing
#163 does not certify those other issues or promise to unblock every criterion.

The complete open inventory is accounted for:

- **Selected:** #163, a bounded high-priority production consumer of progression,
  healing, finite uses and taunt.
- **Already owned by `dubstylee`:** #85 release operations, #123 HUD collapse
  (PR #139), #128 telemetry, #161 staged effects, #162 ability picker, #187 direct
  confirmation (PR #240), #200 timing acceptance, #208 parallel CI capacity and
  #219 process cleanup. Keep their ownership. Open tracker state does not make
  integrated work available to duplicate. #208 explicitly awaits another isolated
  host; #200 explicitly rejects an automatic new baseline capture.
- **Other actionable or independently plannable alternatives:** #153 menu, #155
  overworld movement, #164 Ranger abilities, #166 Shaman, #167 Hobgoblin, #168 Orc,
  #172 consumables/revival, #176 records, #177 planning/undo, #179 log export,
  #181 queue/tips/pace, #183 documentation, #184 generation, #218 Guarded badge and
  #230 automatic stairs. #155's native blocker #154 is closed. Several enemy
  features still need their first effect/profile decisions. None has the same
  combination of an earlier concrete class scope and settled unlock foundation.
- **Need decisions, content slices or prerequisite contracts:** #165 Mage
  adaptation, #169 Graveyard traits, #170 biome-pack epic, #171 hazards and
  push/charge ordering, #173 equipment/acquisition, #174 rewards/upgrades, #175
  reward-dependent exploration, #178 rotation adoption, #180 music/Settings,
  #182 editor adoption and #185 class-stat formulas. These remain valid future
  work; absence of a readiness label alone is not the reason to defer them.
- **Coordination:** #199 is the DevOps epic; its implemented child work and
  remaining baseline/capacity acceptance stay with their existing owners. It is
  not an additional unclaimed implementation patch.
- **Open PR coordination:** #139 and #240 already own related shared-HUD changes;
  #237 is a design-only combat-UI draft and #12 a held deployment alternative.
  No existing branch belongs to #163. `work/issue-66-safari-restart` also remains
  separate. Do not import or merge any of this work as part of planning.

No issue was relabeled or closed. Only #163 is claimed. Browser/device emulation
satisfies acceptance under AGENTS.md. No physical-device request was made;
`CAN_TEST_MOBILE` was absent in this checkout and no hardware testing is claimed.

## Source audit and implementation decisions

The findings below describe the recorded base; proposed behavior is not yet
implemented. Pinned legacy sources were read directly:
[resolver definitions and lifecycle](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd#L74-L119),
[Taunt resolution](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd#L348-L394),
[Second Wind resolution](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd#L827-L872),
and [unlock levels](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/UnitProgressionService.gd#L15-L28).

1. **Unlocks and mode boundaries.** Add validated `ability:second_wind` at level 2
   and `ability:taunt` at level 3, owned by Fighter. Reuse `requiredLevel`,
   `progressHero` and `projectProgression`; unlock through actual run/dungeon XP.
   The standalone battle remains level 1. Its `BattleScene` currently receives
   the full `battleCatalog`, without progression projection: explicitly project
   a level-1 catalog at that boundary so adding definitions cannot grant locked
   abilities. Reuse the same catalog for its session, persistence and resume.
   Raw content definitions remain available to run/dungeon progression. No
   production debug unlock, level selector or new XP model.
2. **Second Wind.** Self target only, range 0, living active Fighter, unused action
   and unused once-per-battle use; heal `min(missing HP, 4 + projected power)`.
   It needs no LOS, attack/save roll or RNG. Full HP, dead/foreign targets, locked
   skills, spent actions/uses and stale commands reject with no changes to HP,
   budgets, RNG, events or history. Commit healing, action and use together.
   Store one bounded spent marker on the Fighter, equivalent to 0/1 remaining
   uses; absence means unused. Fresh encounter/restart resets it; turn changes
   and reload do not. No revival or preparation-item consumption.
3. **Taunt.** One living hostile unit at Manhattan range 1 with ordinary clear
   LOS; consumes one action, has no cooldown/use cap, damage, attack/save roll
   or RNG draw. Store one source instance ID on the target. Reapplication
   replaces the source without stacking. Expire after the target's next accepted
   `endTurn`, including an otherwise idle turn, rather than at source turn start
   or global round wrap. Source/target defeat clears it immediately; fresh battle
   drops it. A defeated-source reference is never an effective restriction.
4. **AI and immunity policy.** Offensive commands from a taunted enemy may target
   only the living taunter, enforced by authoritative preview/resolution as well
   as AI candidate filtering. Reuse route-based scoring and stable tie-breaks:
   attack the source from a legal position, move toward a legal firing position
   if one exists, otherwise Wait. Respect minimum bow range, terrain, LOS,
   occupancy, movement/action budgets and presentation locks; never redirect an
   illegal attack to another hero or stall the turn. Current enemy definitions
   have no taunt immunity: all current living hostiles are eligible. Document
   that boundary and reject unsupported immunity data through exact readers;
   do not add a generic immunity catalog with no real immune consumer.
5. **UI and presentation.** Extend the current picker, target list, board/self
   targeting and preview dispatch for these two profile kinds. Show actual heal,
   0/1 use availability, unlock requirement, taunter and expiry; a heal must not
   be described as friendly fire or an attack roll. Use accepted events for
   heal/status logs and existing text feedback; inspection reads current state,
   including on resume. Keep keyboard/touch, review/cancel, resize, stale-intent
   clearing and input locks. Preserve the current confirmation flow at this
   branch's base; if #240 merges before implementation, adapt to its shared
   confirmation path without restoring a removed modal. No new art/audio assets
   or persistent board-badge system (#218 remains separate).
6. **Persistence is part of healing.** `runSaveEnvelope.ts:63-64` and
   `dungeon.ts:204-206` reject live HP above encounter-entry party HP. Replace
   that no-healing assumption deliberately: after a spent Second Wind, bound the
   living Fighter's HP by `min(projected max HP, entry HP + 4 + projected power)`;
   retain entry-HP bounds for other heroes and unspent healing state. Keep
   roster, seed, map, equipment,
   outcome and defeated-hero constraints. Carry healed HP at accepted completion;
   never carry battle-local spent/taunt state into party or floor state.
7. **Versioning.** Extend exact-shape readers for only the new bounded fields,
   validate source ID/allegiance and profile eligibility, and reject malformed
   resources/references. Proposed versions: battle state 1→2 and rules 2→3,
   run envelope 3→4 and dungeon envelope 4→5; retain RNG version 1 and the
   independent standalone wrapper unless its envelope itself changes. Recheck
   those numbers before editing if the base advances. Catalog/rules identities
   must bind new abilities and semantics, including dungeon saves with no active
   battle. Choose explicit incompatibility with existing export/recovery for
   pre-change saves, preserving original bytes; no silent default injection,
   destructive reset or speculative multi-version migration. Document this
   player-visible compatibility boundary with the implementation.

The [#161 effect contract](../combat-effects.md) is staged: only Guarded runs
today, and new kinds/resources are intentionally introduced with their first
consumer. Its [completed increment](../../openspec/changes/issue-161-combat-effects/tasks.md)
and the [picker increment](../../openspec/changes/issue-162-ability-picker/tasks.md)
are on main. #161/#162 remain separately owned and open; this issue implements
only the heal/use/taunt portions it actually needs, without closing those trackers.

## Non-goals and ablation

No Ranger/Mage/enemy ability additions, generic effect language, typed damage or
save resolver, unused immunity/stack/cooldown framework, revival, new class stats,
reward/equipment upgrades, UI redesign, music/assets, CI parallelism, deployment,
merge or unrelated cleanup. Keep Guarded Strike's −2 attack/+2 AC and next-own-turn
expiry, and Magic Missile's approved force/count/range/damage/spread behavior.

The ablation pass keeps exactly two profile kinds, one 0/1 spent marker and one
taunt source/lifetime. Existing command shapes, progression, route scoring,
picker, presentation events and storage recovery do the rest. A generic resource
map, status scheduler, event bus, new UI framework and compatibility adapter add
no required behavior, so omit them. Save admission and versioning cannot be cut:
the traced readers otherwise reject legal healing or misinterpret changed state.
Shared legality cannot be cut: AI-only filtering would leave direct commands and
previews inconsistent. No separate ablation report or extra approval workflow.

## Files and affected consumers

Expected edit locations; touch a file only when its traced behavior needs it:

- Content: `src/content/{types,abilities,validate}.ts`, existing content constants
  only for bounds; retain catalog validation and required-level projection.
- Domain: `src/domain/{types,effects,combat,turns,battle,ai,constants}.ts` for
  profiles, atomic resolution, lifecycle, command legality and bounded state;
  `progression.ts` only if the existing projection needs a demonstrated change.
- Save/encounter integration: `src/domain/{runSaveEnvelope,runBattle,dungeon,dungeonSaveEnvelope,saveEnvelope}.ts`
  and relevant identity construction. Existing storage adapters and recovery
  flows should remain the path; edit them only for a demonstrated version issue.
- Shared app/UI: `src/app/BattleSession.ts`, `src/ui/{battleActions,targetPreview,hud}.ts`,
  `src/phaser/{BattleScene,abilityPresentation}.ts`. Inspect event consumers such
  as audio/diagnostics for exhaustiveness; add no new cue asset requirement.
- Extend existing unit files for ability validation, progression, abilities,
  combat, AI, turns, session, feedback, run/dungeon battle and all save/storage
  boundaries. Reuse `tests/ability-picker.spec.ts`, its existing dev fixture,
  `tests/guarded-effects.spec.ts` and relevant battle/run/dungeon suites before
  adding any test file. Existing policy helpers need explicit ability-kind
  handling if they enumerate newly unlocked actions; trace all their consumers.
- Update `docs/{combat-effects,signature-abilities}.md` and current save/run rules
  that describe changed behavior; record source-bound qualification under
  `docs/qa/issue-163/` during implementation. This `plan.md` is the requested
  human plan; no additional planning artifact set is needed for this setup task.

Shared combat, turns, command admission, state readers and the HUD serve standalone,
authored runs and dungeon battles. Catalog changes also reach content loading,
fixtures, deterministic policies and telemetry gameplay journeys. That union
drives verification; a Fighter-only UI test cannot prove all consumers.

## Implementation sequence and acceptance proof

All items below are pending implementation.

- [ ] **Profiles and unlocks (criterion 1):** add and validate both definitions;
  prove levels 1/2/3/5, malformed owners/kinds/resources and direct locked-command
  rejection. Verify standalone level 1 and run/dungeon canonical learned lists;
  repeated catalog/battle construction must not accumulate projection.
- [ ] **Atomic healing (criteria 2 and 5):** implement shared pure preview and
  resolution, bounded use state and accepted heal event. Test partial/capped
  healing, projected HP/power, full-health rejection, exhausted use, wrong/dead
  targets, spent actions, repeated preview/cancel, duplicate confirmation and
  unchanged RNG. Verify fresh-battle reset and mid-battle resume retains use.
- [ ] **Taunt and AI (criteria 3 and 5):** implement one-source status and shared
  offensive legality. Test no-roll application irrespective of attack accuracy,
  same-side/out-of-range/blocked/dead targets, replacement, source/target defeat,
  exact target-turn expiry, initiative wrap, minimum bow range, obstacles,
  unreachable/blocked firing positions, legal approach/Wait and no AI stall.
- [ ] **Save/replay integration (criterion 5):** update versions/admission together;
  prove healing above entry HP in run and dungeon, over-max/non-Fighter/ineligible
  HP rejection, no accidental revival, malformed resource/source rejection,
  pending-action read-only behavior and old-save byte preservation. Compare
  uninterrupted, replayed and resumed state/events/RNG; accepted encounter/floor
  transitions retain HP and reset battle effects/uses once.
- [ ] **Reachable UI (criterion 4):** expose self heal and hostile taunt in the
  real picker with accurate availability, status and logs. Exercise keyboard and
  touch, narrow portrait/short landscape, inspection, cancel, repeated activation,
  resize and presentation locks. Retain screenshots. Use existing level fixtures
  for boundary cases, plus a complete legal production dungeon journey that
  earns level 3 and uses both abilities; fixtures alone are not reachability proof.
- [ ] **Preservation and delivery (all criteria):** retain Guarded and Magic
  Missile numeric, targeting, event, AI, replay and resume regressions. Reconcile
  every acceptance criterion with source-bound results, update rule/compatibility
  docs, inspect the final diff, commit/push only issue work and prepare the PR
  when implementation is requested. Incomplete acceptance stays explicit.

## Proof and verification scope

**For this planning commit:** check relative links, cited source paths, script/config
names, full backlog accounting, archive SHA-256, `git diff --check`, commit/remote
parity, issue assignment/comment and native branch link. Documentation-only setup
requires no build or app/browser run and makes no gameplay acceptance claim.

**During implementation:** start with selected existing units, for example:

```sh
npm run test:unit -- tests/unit/abilityValidation.test.ts tests/unit/progression.test.ts tests/unit/abilities.test.ts tests/unit/combat.test.ts tests/unit/ai.test.ts tests/unit/turns.test.ts
npm run test:unit -- tests/unit/battleSession.test.ts tests/unit/runBattle.test.ts tests/unit/runSaveEnvelope.test.ts tests/unit/dungeonBattle.test.ts
npm run test:fixtures -- ability-picker.spec.ts
npx --no-install playwright test tests/guarded-effects.spec.ts --list
```

Confirm the exact new/changed test titles with discovery before selecting browser
filters. Add the existing save/storage/feedback unit files to iteration selection
as their consumers change. No application checks are executed merely to validate
this plan's prose.

**Final implementation readiness selects full regression** under
[verification policy](../verification-policy.md): shared turn/command contracts,
state admission and cross-route persistence change. Use `npm run verify:full -- --list`
to inventory the final selection, then `npm run verify:full` or the existing
resumable `verify:batches` workflow on qualified exclusive self-hosted capacity.
Account for all suites: tooling, full units/content, both TypeScript scopes,
root/prefix builds and assets, default Chromium, combined dev fixtures, dev-only
placement, WebKit battle/run and dungeon/exploration, health bars, separately
configured production/development telemetry and isolated performance capture.
Audit new cases against specialized config greps so required WebKit scenarios
are actually selected; list-only output is not an executed test.

Keep one browser job/worker per shared GPU, the existing exclusive lock and no
automatic GitHub-hosted fallback. Reuse only evidence with unchanged relevant
source/test/config/dependency/build inputs and retained artifacts; record source,
build, host/browser, commands, selection, hashes, retries/skips and every failure.
The #200 baseline and PR #240's reported procedural-grid/WebKit focus failures
remain historical failures; reproduce an affected failure on the literal base
under matching conditions before calling it pre-existing. A focused pass does
not turn those old aggregates green. Do not repeat an unchanged completed suite
solely because this plan or later evidence prose changed.

## Risks and continuation

The principal risks are accidental standalone unlocks, valid healing rejected by
aggregate readers, healing/use reset on reload, expiry attached to the wrong
turn, AI unable to finish under a taunt, and save identity drift. Each has an
explicit implementation path and proof above. New on-disk state is intentionally
incompatible with prior saves; recovery must preserve and export their bytes.
PRs #139/#240 overlap shared HUD code: recheck live main before implementation,
preserve their merged behavior if present, and update this plan for material scope
changes. This setup request ends with the claimed issue, published plan and
linked branch; no application code or runtime tests are changed by this commit.
