# Issue #163: Fighter Second Wind and Taunt

Date: 2026-10-25 (Asia/Jerusalem). Status: implementation active via OpenSpec
`issue-163-fighter-abilities` (spec-driven; gameplay and UI qualification complete, final evidence/delivery pending, 7/9 tasks).
The branch was clean at handoff. Main `e489a30` was merged without conflict,
including direct HUD confirmation (#240) and Guarded badges/pan fix (#241).
Do not restore the old confirmation modal or overwrite those indicators.

## Current continuation checkpoint

- Main advanced to `d5b1927` (#243 automatic stairs) during qualification. Earlier
  qualification is fully reconciled in [QA](../qa/issue-163/README.md); current
  completion now includes integrating this bounded stair delta through the PR
  stack. Adapt the new Fighter journey to automatic descent, reuse unchanged
  combat evidence, and qualify healed-party/resource carry at the new transition.
  Do not restart the full matrix for the stair-only integration.

- Current feature source: both profiles, atomic effects, authoritative Taunt/AI,
  bounded state/readers and versioned run/dungeon healing are implemented.
  Short-run completion also required an exact spent-use command fact; this is
  validated and never persists in party data. Raw host catalogs are validated
  before trusted progression/equipment projection.
- Final unit run: 968/968 in 55 files, no skips, 21.06 seconds; both type scopes pass.
  Earlier failures are retained in QA logs: version literals, old catalog identity
  snapshot, additive status text and policy callers using raw catalogs. Browser
  standalone consumers now share a level-one projected test catalog; explicit
  raw unit consumers pass their own catalog. No pre-existing assertions were removed.
- Fighter fixture browser: 3/3 desktop/Pixel touch portrait/landscape pass, including
  320px preview, cancel/resize, legal approach, heal, Taunt, inspection/logs/reload.
  Six retained PNGs were visually inspected for readable feedback.
- Production journey: first desktop attempt played all six encounters from a
  canonical fresh seed-190 save, earned level 3, used/reloaded both abilities,
  then reached terminal defeat at floor-2 guardian. The initial test incorrectly
  required two-floor victory, which #163 does not require. It now asserts the
  deterministic terminal defeat after both milestones, retaining the failed run.
  The final desktop, Pixel portrait and Pixel landscape production journeys all
  passed; their complete traces are identical (canonical SHA-256
  `ecee36ea8c28011e6ac191e53e6d6958e578221caa943d686f7dd8fe0e0d2f00`).
  Each plays 6 encounters/365 accepted commands, earns Fighter level 3 and ends
  with five wins then the second-guardian defeat. Encounter 6 proves legal healing
  above entry HP (24 → 30). Traces and representative PNGs are in `docs/qa/issue-163/`.
  Remaining browser stages, focused repairs and final receipts are still pending.
- WebKit exploration/dungeon stage passed 63/63; health bars passed 25/25.
  All three Windows WebKit production traces also match the Chromium trace exactly,
  giving 6 engine/device journeys with the same 365 commands and terminal state.
  Source-bound traces and representative screenshots are copied under QA. This
  completes OpenSpec 3.2; 3.1 stays reopened until the default Mage fixture repair.
- Continue by running the 19-stage policy inventory with reused valid unit/type
  evidence, serial browser jobs/one worker and pinned task-local Chromium. No
  CI/physical-device or release claim. Open the dependent feature PR after checks,
  targeting `branch/issue-163-standalone-level` while PR #242 is open.

- OpenSpec: [proposal](../../openspec/changes/issue-163-fighter-abilities/proposal.md),
  [design](../../openspec/changes/issue-163-fighter-abilities/design.md),
  [spec](../../openspec/changes/issue-163-fighter-abilities/specs/fighter-abilities/spec.md),
  [tasks](../../openspec/changes/issue-163-fighter-abilities/tasks.md).
- First chunk: standalone level-1 projection after raw validation, before asset
  loading, session and persistence. Raw definitions remain available for progression.
  Published ready for review as [PR #242](https://github.com/luminari-gurus/tactics-guru-v2/pull/242),
  commit `bad8f19`, branch `branch/issue-163-standalone-level`, base main.
  Feature work continues on the requested `branch/issue-163-fighter-abilities`,
  targeting the prerequisite branch while #242 is open. Full feature remains pending.
- The 19-stage qualification finished against clean feature source `d208a6b` and
  its production build. Reused unit/type results have matching
  input hash `405039eaba83caeb6484dca3a8310885bb817f49b8f51ad10a6e4fca6aa57dbc`.
  Live reports: `tmp/issue-163-full/qualification/summary.json` and per-stage logs.
  Runner: `node tmp/issue-163-full/run.mjs`, a temporary wrapper over the existing
  19-stage manifest. Keep its failed aggregates; reconcile focused repairs without
  rerunning unaffected checks. Both telemetry stages passed 36/36; performance
  passed all 18 proof cold/warm samples with no failures. Prefix/root builds passed.
  Asset modes retain the known expectation failures pending focused repair runs.
- Known qualification repairs to finish after frozen-input coverage: the battle
  case in `tests/public-asset-base.spec.ts` still constructs its expected session
  with the raw catalog; use the existing level-one test catalog. The authored-final
  case in `tests/procedural-grids.spec.ts` compares HP-only projections to complete
  progression records. `tests/battle-animations.spec.ts` still expects the obsolete
  short Guarded status in both actor and inspection; preserve the current full
  penalty/expiry explanation in its assertion. An exact-base worktree at
  `C:/Users/apexw/.codex/tmp/issue163-base-e489a30` is built with the same lockfile,
  Node and browser versions for a focused literal-base comparison. Do not run it
  concurrently with the active browser matrix. Retain failures, repair the carried
  party assertion as a separate focused PR, and rerun only affected cases/modes.
- Original qualification shell `68827` finished. Its base comparisons also ran:
  both stale Chromium assertions and representative WebKit launch/media failures
  reproduced on literal `e489a30`. The standalone assertion repair passed 9/9 on
  `c4eed28` and is published ready for review as
  [PR #244](https://github.com/luminari-gurus/tactics-guru-v2/pull/244), branch
  `branch/issue-163-battle-assertions`, head `95e1a6a`, stacked on #242. The notes
  below describe the repair sequence; do not repeat the completed base work.
  use the same pinned Chromium and desktop filter
  `authored final entry|ability:guarded_strike: spent action` on the literal base.
  Correct the HP comparison at the proper boundary and retain a separate full
  party metadata assertion; expect the complete current Guarded explanation in
  both actor and inspection. Qualify both repairs on all three Chromium profiles,
  publish their focused dependency PR, merge that dependency into the feature
  branch, and fix the feature's raw-catalog asset assertion with its affected
  root/prefix preview/dev cases only. Do not rerun unaffected passing suites.
- Chromium aggregate finished at `d208a6b`: 688 passed, 9 assertion failures
  (the three known titles across all three profiles), 3 expected preview skips,
  no retries/flakiness. The separate dev placement stage passed all 3 skipped
  obligations. Fixtures: 69/72 passed; the three friendly-Missile failures expose
  a task-owned fixture regression: default XP-null projection replaced its custom
  `zz_mage` caster level 3 with level 1. Keep the level-one Fighter gating but
  restore that explicitly authored default Mage fixture profile; XP fixtures must
  still use canonical progression. Rerun the friendly-Missile and later-Mage cases
  on all three profiles. This is a fixture repair, not a production ability change.
  The original WebKit acceptance aggregate and all other stages are now finished.
- WebKit acceptance on Windows finished 8/52 passed. Of 44 failures, 40 are
  launch setup: file-level overrides in battle-persistence/run-progression pass
  the Chromium executable to WebKit (`--inspector-pipe` against Chrome). Four audio
  cases report unavailable load/decode on Windows WebKit. Keep both failure kinds
  explicit. Fix engine-aware launch overrides in their own focused dependency PR
  (the same pattern also exists in battle-animations). Compare representative
  cases on literal base, then rerun WebKit acceptance on the existing WSL Linux
  WebKit 2359 runtime with a deliberately unusable Chromium override to prove
  that WebKit ignores it. Keep test IDs, workers, retries and selection intact.
- WSL preparation only: isolated clone
  `/home/aiwithapex/.cache/issue163-webkit-linux`, shared Git objects from primary,
  detached at `d208a6b`, locked Linux dependencies installed. The ordinary Windows
  production `dist` was copied; `pin-wsl-node.sh` verifies every file against the
  root build inventory and pins task-local Node 24.19.0 / npm 12.2.1 (the initial
  system Node 24.14.0 produced an npm engine warning). No WSL browser has launched.
  Do not overlap WSL and Windows browser jobs. After committing repairs, check out
  their exact feature SHA in the WSL clone; retain its source and runtime receipt.
- Current source commits: `b45a011` repairs the feature's asset expectation and
  preserves the explicit default `zz_mage` caster profile; `64adcdb` is the
  separate browser-fixture dependency, merged into the feature at `9157214`.
  Both type scopes pass. The browser fixture repair also corrects an obsolete
  WebKit grep: 52 retained IDs are unchanged and exactly two complete authored-run
  cases are added (54 total), with no omissions or altered assertions/workers/retries.
- Active browser job is now **WSL acceptance**, shell session `78045`, exact
  integration source `9157214`, verified ordinary `d208a6b` build. Its invalid
  Chromium override sentinel must never reach WebKit. Parent Windows WebKit
  startup/run-reload checks passed 2/2 with the fixed engine selection. Finish WSL
  acceptance, publish the browser-fixture dependency, then run the feature's
  focused Chromium assertion/launch, full ability-picker fixture and root/prefix
  asset cases. Serialize all browsers across Windows/WSL. Keep raw reports and
  finish the source-bound reconciliation, PR and cleanup.
- Runtime: bundled Windows Node v24.19.0; npm is available at
  `C:/Users/apexw/.codex/tmp/issue163-tools/npm.cmd` (prepend that directory to PATH
  per shell call). `npm ci --ignore-scripts --no-audit --no-fund` restored Windows
  dependencies from the unchanged lockfile after inherited shims/native bindings failed.
  Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to
  `C:/Users/apexw/.codex/tmp/issue163-tools/browsers/chromium-1243/chrome-win64/chrome.exe`;
  the default installed Chromium failed to launch (`spawn UNKNOWN`). Fresh pinned
  Chromium 153.0.8010.12 and installed WebKit 26.6 launch checks passed.
  OpenSpec CLI is cached at
  `C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js`;
  run with Node. No application dependencies changed.
- Retain this checkpoint, exact tested source identities and any failures as work advances.
- Prerequisite proof: 48 tests in progression/battlePersistence, 221 build content
  tests, both type scopes and production build passed. Focused default-Move Continue
  browser case passed desktop/native-touch portrait/native-touch landscape (3/3,
  no skips/retries). See [prerequisite evidence](../qa/issue-163/prerequisite.md).

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

The findings below record the base audit and approved implementation decisions;
the checkpoint above describes current implementation and qualification. Pinned
legacy sources were read directly during planning:
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

Use the OpenSpec tasks and current checkpoint for implementation status. Runtime
acceptance and delivery below are checked only when their whole proof is complete.

- [x] **Profiles and unlocks (criterion 1):** add and validate both definitions;
  prove levels 1/2/3/5, malformed owners/kinds/resources and direct locked-command
  rejection. Verify standalone level 1 and run/dungeon canonical learned lists;
  repeated catalog/battle construction must not accumulate projection.
- [x] **Atomic healing (criteria 2 and 5):** implement shared pure preview and
  resolution, bounded use state and accepted heal event. Test partial/capped
  healing, projected HP/power, full-health rejection, exhausted use, wrong/dead
  targets, spent actions, repeated preview/cancel, duplicate confirmation and
  unchanged RNG. Verify fresh-battle reset and mid-battle resume retains use.
- [x] **Taunt and AI (criteria 3 and 5):** implement one-source status and shared
  offensive legality. Test no-roll application irrespective of attack accuracy,
  same-side/out-of-range/blocked/dead targets, replacement, source/target defeat,
  exact target-turn expiry, initiative wrap, minimum bow range, obstacles,
  unreachable/blocked firing positions, legal approach/Wait and no AI stall.
- [x] **Save/replay integration (criterion 5):** update versions/admission together;
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
PR #240 and the #241 Guarded indicator work were merged before implementation;
their confirmation and board behavior are preserved. Keep #139's independently
owned work separate, and inspect live branch/PR state before final delivery.
Continue from the current checkpoint and OpenSpec tasks, retaining source/build
identities, failed attempts and focused repair receipts. Deliver the remaining
reviewable dependency/feature PRs and leave the stack open for review.
