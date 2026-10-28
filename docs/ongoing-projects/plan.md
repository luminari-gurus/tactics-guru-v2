# Issue #165: Mage adaptation and Frost Snare

Date: 2026-10-28 (Asia/Jerusalem). Status: implementation in progress under the
caller's explicit goal authorization. OpenSpec change `issue-165-mage-frost-snare`
tracks implementation and acceptance. No application acceptance is claimed until
the evidence below is completed.

- Issue: [#165](https://github.com/luminari-gurus/tactics-guru-v2/issues/165).
- Assignee: `moshehbenavraham`, verified through both authenticated GitHub clients.
- [Pickup comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/165#issuecomment-6467267388).
- Base: fetched `origin/main`, `bd06447d8dea21d65acc8f8a3851c379c04509d1`.
- Work branch: [branch/issue-165-mage-frost-snare](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-165-mage-frost-snare).
  Created and published from that base after writing this plan through GitHub's
  native linked-branch operation; #165's Development association is established.
  The plan commit is pushed to this branch; verify remote commit parity at handoff.
- Previous root plan: [issue-164-ranger-abilities-plan.md](issue-164-ranger-abilities-plan.md),
  preserved byte-for-byte, SHA-256
  `77476596ee291bf0f4a1c6f7878621d2ac9c4ce96ea9545c97b0471a14086dfa`.
  Its PR-open wording is historical: #248 is now merged and #164 is closed.

## Selection and available work

Reviewed all **31 open issues**, their bodies, labels and assignees, the **three
open PRs**, **six remote branches**, native dependency/linked-branch relationships,
and the relevant foundation comments and source. REST pagination has an empty
second page; GraphQL independently reports 31 open issues with no next page.
Repository, organization and authenticated-user Projects V2 inventories each
report zero projects; all open issues have zero Project memberships. No additional
Project draft work items are available in those inventories.

Selection was not restricted to `ready for work`: #165 has only `enhancement`.
It is the oldest remaining unassigned high-priority class-ability issue, with no
active branch/PR. It completes the Mage's additional-skill consumer of #162 and
extends a concrete movement-blocking mechanic already delivered by #164. It also
settles Mage ability choices that later reward work in #174 must respect; it does
not unblock all of #174 by itself.

Actual prerequisites are available on main:

- #160 is closed; [PR #238](https://github.com/luminari-gurus/tactics-guru-v2/pull/238)
  merged at `852e9d5a5a6b23fb5b986f2d555fcf000c70a70f`. Catalog `requiredLevel`
  drives learned actions; progression projects Mage level into missile count.
- #161 remains assigned to `dubstylee` for later effects. Its foundation merged
  in #188 at `38474f2`; #248 adds Mark/Pin, expiry and defeat cleanup. The
  [current handoff](https://github.com/luminari-gurus/tactics-guru-v2/issues/161#issuecomment-6446666267)
  explicitly leaves Mage effects to their first consumer.
- #162 remains assigned to `dubstylee` for wider acceptance. Its picker merged
  in #211 at `c051b005a3dcb8656f6b8c13c80a98ba8afe88b8`; its
  [current handoff](https://github.com/luminari-gurus/tactics-guru-v2/issues/162#issuecomment-6446666780)
  identifies Mage #165 as a remaining consumer.
- [PR #248](https://github.com/luminari-gurus/tactics-guru-v2/pull/248) merged at
  `370799c797ed2322d27fcaeef9688134b65dec5a`. The movement-block helper exists,
  but its source validation, stored `pinnedBy` and feedback are Ranger-specific.
  Adding a catalog entry alone cannot implement Frost Snare correctly.

Disposition of every other open issue:

- **Existing ownership:** #85 release operations, #128 telemetry, #155 movement
  (draft PR #246), #161/#162, #200 baseline, #208 isolated CI capacity and #219
  process cleanup belong to `dubstylee`. #208 explicitly remains capacity-blocked;
  #219's implementation is integrated, so its stale tracker is not fresh coding
  work to reclaim. Draft #12 is restricted SSH delivery; draft #237 is combat UI
  design. Existing Safari/HUD branches are preserved.
- **Broader high-priority alternatives:** #166 Shaman adds reviewed saves/debuffs,
  support AI and content; #167 Hobgoblin adds forced movement/formation/AI;
  #168 Orc adds charge/stacks; #169 Skeleton adds damage traits/immunity and
  Graveyard placement. Each is viable planning work but needs more new contracts
  than the shipped Pin-to-Snare extension.
- **Medium-priority alternatives:** #153 menu needs route/destination/save-selection
  policy; #172 consumables needs supply/action/revival policy; #176 records needs
  completion/retention semantics; #177 planning/undo needs information and history
  boundaries; #183 documentation audit is useful but lower immediate gameplay
  value; #184 generators needs distinct-algorithm/profile choices.
- **Dependent or broader scope:** #170 is a biome epic requiring bounded child
  slices; #171 hazards needs shared damage/path ordering; #173 equipment needs
  functioning effects/acquisition; #174 rewards needs selected upgrade/currency
  policies; #175 scouting/traps depends on reward/unlock/currency choices.
- **Lower-priority or deferred:** #178 rotation is a usability/adoption review;
  #179 log export is independently plan-able; #180 music needs Settings and
  provenance choices; #181 queue/tips/pace follows core skills; #182 editor needs
  an adoption decision; #185 explicitly defers unresolved class-stat design.
  #199 is the DevOps epic, with owned children and historical checklist drift,
  rather than an unclaimed implementation slice.

No other issue is assigned, closed or relabeled. #161/#162/#174 are coordination
references, not additional scope claimed by this branch.

## Outcome

Make Frost Snare a real level-3 Mage action in earned progression, through the
existing HUD, with pure preview, explicit lifecycle, deterministic continuation
and honest feedback. Resolve Arc Bolt's adaptation explicitly by consolidating
its automatic force-attack role into Magic Missile. Preserve approved Magic
Missile, Ranger Pin, Mark, Fighter actions and ordinary movement/turn behavior.

## Rules selected for the implementation plan

These selected v2 rules guide implementation. Acceptance evidence is tracked below
and in [the QA record](../qa/issue-165/README.md).

### Arc Bolt consolidation and Magic Missile

Use the consolidation option expressly allowed by #165. There is no separate
Arc Bolt catalog entry, button, alias, damage formula or level-2 unlock. Magic
Missile stays available from level 1. At level 2 it still has one missile; level
3 supplies two missiles and the separate Frost Snare unlock. Make this deliberate
adaptation clear in maintained Mage rules and level-gate feedback.

Magic Missile retains one action, automatic hits, no attack/save roll or critical,
**1d4+1 force damage per missile**, Manhattan range **1–5**, LOS/line-of-effect,
and all-target preflight. Count remains `min(5, floor((casterLevel + 1) / 2))`;
current earned levels 1–5 yield one, one, two, two, three missiles. Each missile
has its own seeded d4 in designated order. Repeated targets are legal; different
targets must be at most three tiles apart pairwise. Living allies remain deliberate
legal targets with the existing confirmation; self is excluded by minimum range.
Overkill never retargets, duplicates defeat, or draws extra dice. Exhausted RNG
rejects the entire cast. Neither missiles nor Snare consume Ranger Mark.

Legacy source is evidence for the comparison, not an instruction to restore its
different damage or Ember Burst. Inspect the pinned
[Arc Bolt resolver, lines 448–577](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd#L448-L577),
[Snare resolver, lines 579–627](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd#L579-L627),
and [unlock table](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/UnitProgressionService.gd#L15-L28).
The issue's older Arc Bolt line anchor currently lands in Second Wind; the
function locations above were checked against the actual pinned file.

### Frost Snare

- Canonical ID `ability:frost_snare`, Mage only, `requiredLevel: 3` (180 XP),
  one action, one living hostile unit, Manhattan range **2–4**, existing LOS.
  No damage, attack roll, saving throw, RNG draw, cooldown or per-battle use limit.
  Casting does not end the Mage's turn or grant extra movement/actions.
- Block ordinary movement immediately. Reachability contains only the target's
  origin; move commands reject without spending, moving, logging acceptance or
  drawing RNG. Legal attacks and Wait remain available. The existing enemy
  planner uses that same reachability and can attack in place or Wait.
- Expire after the target's next accepted endTurn, or immediately on source/target
  defeat through every damage path, including friendly Magic Missile. Global
  round changes and unrelated unit turns do not expire it. Leaving range/LOS
  after application does not cancel it. New battles carry no movement block.
- Keep **one movement block per target** shared with Pinning Shot. Applying Pin
  or Snare to an already movement-blocked target rejects before spending/RNG;
  no stacking, replacement, refresh or extension, including cross-ability casts.
  Pin keeps its existing range 2–5 and Ranger-only ownership.
- Both current goblin definitions are susceptible. There is no implemented
  immunity-bearing enemy in this scope; do not invent frost damage, a save,
  creature immunities or a generic immunity catalog. State this policy and test
  both real enemy types. Later immunity content must extend shared preflight
  when its first actual consumer lands.
- Preview, target overlays, picker details, accepted result text and inspection
  identify **Snared**, the Mage source, no damage/roll, and exact expiry. Pin
  remains identified as **Pinned** with its Ranger source. Use existing text and
  feedback presentation; add no bespoke art, animation or sound. Verify no attack
  cue is emitted for the effect-only cast while sound is enabled and ready.

### Shared representation and compatibility

Replace Ranger-only `pinnedBy` with one bounded movement-block reference carrying
`sourceId` and `abilityId`, admitted only for the implemented Pin/Snare profiles.
Validate exact shape, living opposing source/target, source class/ownership and
availability in the projected learned catalog. A wrong-class, dead, absent,
locked or unsupported source/ability cannot become a valid saved status.

Reuse one movement-block evaluator, rejection rule, target-end-turn expiry and
defeat cleanup. Keep Mark's Ranger-only policy distinct. Accepted status/expiry
events carry enough ability identity for correct Pin/Snare feedback. Remove the
replaced pin-only state/event path and its obsolete consumers in the same change;
do not maintain parallel runtime implementations or an unneeded legacy alias.

This changes shared saved-state admission. Advance battle state **3 → 4**, rules
**4 → 5**, run envelope **5 → 6**, dungeon envelope **6 → 7**. Keep RNG and the
standalone outer envelope at 1, and unchanged aggregate payload shapes at their
current versions. Content/progression identities must include the new ability.
Retain the existing safe incompatibility/recovery policy: earlier saves remain
byte-preserved and exportable; inspection must not rewrite, clear or silently
migrate them. Capture exact-base fixtures before modifying readers, including
current 3/4 battle, run-5 and dungeon-6 inputs. Update current-format fixture
builders without rewriting historical QA evidence.

## Non-goals and ablation decisions

Keep only the shared movement-block change needed by two real consumers, the
Mage catalog/unlock, correct feedback, save identity/recovery, tests and rule docs.
Consolidating Arc Bolt removes a redundant automatic-force attack and avoids
competing missile implementations. Generalizing the existing Pin path avoids
a second immobilization lifecycle. The caller subsequently requested OpenSpec;
the change artifacts track this plan's rules and tasks without reopening settled decisions.

Drop generic effect scripting, arbitrary stacking/durations, new save migrations,
spell resistance/typed-damage systems, tabletop class-stat progression, area
spells, Ember Burst, Mage Drill/Mana Charm/reward upgrades, enemy support AI,
route/menu redesign and new dependencies/assets. Do not change #161/#162 ownership,
claim their whole trackers complete, or add unrelated documentation cleanup.

## Files and implementation sequence

1. **Freeze regression boundaries and content.** Extend existing ability,
   validation and progression tests for the selected rules; retain exact-base
   incompatible-save fixtures. Add the bounded Mage profile in
   `src/content/types.ts`, `abilities.ts` and `validate.ts`. Reuse
   `src/domain/progression.ts` required-level projection; change that code only
   if a demonstrated new requirement needs it. Update content identity assertions
   without changing authored map fingerprints or missile rules.
2. **Share the actual movement block.** Update `src/domain/types.ts`, `effects.ts`,
   `battle.ts`, `combat.ts` and `turns.ts`: exact state admission, whole-command
   preflight, one resolution/expiry/cleanup policy, ability-aware events. Trace
   `grid.ts` and `ai.ts` through their existing helper consumers; preserve their
   algorithms unless the shared evaluation requires a signature adjustment.
   Verify Pin/Snare cannot bypass turn/action/movement locks.
3. **Carry the state through every route.** Update `src/domain/constants.ts`,
   `runSaveEnvelope.ts` and `dungeonSaveEnvelope.ts` and affected identity/fixture
   consumers. Inspect `saveEnvelope.ts`, `runBattle.ts`, `dungeon.ts` and
   `src/app/BattleSession.ts` for admission, battle-entry, resume and cleanup
   consequences. Do not add effects to persistent party progression; retain
   nonaccumulating equipment/HP projection and fresh encounter resources.
4. **Expose honest Mage feedback.** Update `src/ui/hud.ts` and
   `src/phaser/abilityPresentation.ts`. Reuse `battleActions.ts`, `targetPreview.ts`,
   existing picker/confirmation/cancel and `BattleScene.ts` session authority.
   Trace `src/audio/battleCues.ts` and telemetry consumers for changed events;
   no new cue or analytics schema is intended. Extend existing
   `tests/fixtures/abilities/main.ts` only where real-profile picker coverage needs
   it; synthetic extra-ability fixtures do not prove production reachability.
5. **Prove and document the result.** Extend existing units, `ability-picker.spec.ts`
   and `dungeon.spec.ts` with the real earned Mage journey. Update
   `docs/signature-abilities.md`, `docs/combat-effects.md`, `docs/hero-progression.md`
   and a bounded `docs/qa/issue-165/README.md` evidence record. Update affected
   canonical OpenSpec rules only where an existing current scenario changes;
   OpenSpec change `issue-165-mage-frost-snare` now tracks the authorized implementation.
   Finish acceptance audit, commit/push implementation and prepare a focused PR
   when implementation is requested.

## Proof and acceptance mapping

Each of #165's five acceptance criteria has an implementation and proof path:

1. **Arc Bolt adaptation:** maintained rules and picker feedback document the
   consolidation, level-1/2/3 behavior, range/damage/count/spread. Content and
   progression tests prove no separate Arc Bolt unlock and the real Mage catalog.
2. **Shared Snare lifecycle:** domain tests cover both actual enemy definitions,
   1/2/4/5-tile boundaries, blocked LOS, wrong side/class, dead/missing targets,
   spent action, origin-only movement, useful in-place AI attack/Wait, exact expiry,
   both source/target defeat paths and Pin↔Snare duplicate rejection. Assert state,
   budgets, replay log and RNG are unchanged on every rejection/preview.
3. **Picker, gates and feedback:** dev fixture coverage at XP 0/60/180, mouse,
   keyboard and native touch, cancel/Escape, resize/inspection, stale selection,
   correct Snared/Pinned sources and reload. Run desktop and portrait/landscape
   Chromium; add explicit WebKit selection for the new cases, since the current
   acceptance grep and exploration file list do not automatically cover picker
   fixtures. Preserve deliberate friendly-missile confirmation.
4. **Approved missile behavior:** retain and extend only missing assertions for
   automatic hits versus ordinary d20 attacks, each seeded d4, multi-hit event
   order, overkill, all-target preflight, pairwise spread, RNG exhaustion and
   Mark nonconsumption. Verify current caster-level 1–5 growth and existing
   broader domain bounds. No Snare damage/save/attack/missile events or RNG draws.
5. **Continuation and real use:** round-trip standalone/run/dungeon active Snare
   with exact source/ability identity, replay state/events/RNG equality, expiry
   after reload, terminal cleanup and no carry to the next encounter. Test corrupt,
   unsupported/forged and previous-format recovery with original bytes preserved.
   A complete legal production-HUD dungeon journey must earn 180 XP, show the
   level-3 unlock, use Frost Snare and multi-missile Magic Missile, reload while
   Snare is active, demonstrate blocked enemy movement/expiry, and reach a legal
   terminal outcome with exact continuation replay. Extend the existing Ranger/
   Fighter journey pattern; dev injection alone does not meet this gate.

Relevant existing unit owners include `abilities.test.ts`, `abilityValidation.test.ts`,
`state.test.ts`, `grid.test.ts`, `ai.test.ts`, `turns.test.ts`, `progression.test.ts`,
`battleSession.test.ts`, `battleActions.test.ts`, `saveEnvelope.test.ts`,
`runSaveEnvelope.test.ts`, `dungeonBattle.test.ts`, `dungeon.test.ts`,
`battleCues.test.ts` and existing recovery fixtures. Add a new file only if existing
owners cannot express a required behavioral assertion clearly.

Focused iteration commands (from the repository root, supported Node and locked
dependencies installed):

```sh
npm run test:unit -- tests/unit/abilities.test.ts tests/unit/abilityValidation.test.ts tests/unit/progression.test.ts tests/unit/grid.test.ts tests/unit/ai.test.ts tests/unit/turns.test.ts
npm run test:unit -- tests/unit/state.test.ts tests/unit/battleSession.test.ts tests/unit/battleActions.test.ts tests/unit/saveEnvelope.test.ts tests/unit/runSaveEnvelope.test.ts tests/unit/dungeonBattle.test.ts tests/unit/dungeon.test.ts tests/unit/battleCues.test.ts
npm run build
npm run test:fixtures -- ability-picker.spec.ts
npx --no-install playwright test tests/battle-persistence.spec.ts tests/run-progression.spec.ts tests/dungeon.spec.ts tests/dungeon-lifecycle.spec.ts
npx --no-install playwright test -c playwright.exploration.config.ts tests/dungeon.spec.ts tests/dungeon-lifecycle.spec.ts
```

Final implementation qualification is **full regression**, because shared
movement/effect state, replay events and cross-route save admission change.
Follow [verification-policy.md](../verification-policy.md), discover the current
`npm run verify:full -- --list`, then run `npm run verify:full` on qualified,
otherwise idle capacity or the existing resumable serial batch pipeline with a
complete coverage ledger. Account for all 19 stages: tooling, units/content, both
type scopes, root/prefix build integrations and bundles, default Chromium,
all dev fixtures, dev placement, both WebKit matrices, health bars, both configured
telemetry modes, root/prefix asset modes, performance and root-build restoration.
Add explicit Mage WebKit coverage where the configured selections omit it; use
discovery to verify all old IDs/settings remain and all new cases are selected.

Browser runs stay serial with one worker, no blanket retries and the existing
exclusive self-hosted CI lock; there is no automatic GitHub-hosted fallback.
Playwright/device emulation is sufficient under AGENTS.md. Local physical access
is `CAN_TEST_MOBILE=android`; no physical-device testing is required or claimed.
Retain source/build hashes, exact commands/configs/test IDs, modes, browser/host,
screenshots, replay receipts and all failures/skips/incomplete runs. Reuse evidence
only for unchanged relevant inputs with retained provenance. Prior failed runs
remain failed; compare suspected regressions with the literal base and rerun only
invalidated coverage. No new runtime results are claimed by this planning task.

## Planning verification and publication

- Local Markdown links and all named existing source/unit paths pass inspection.
- `node scripts/verify-full.mjs --list`: all 19 stages discovered without execution.
- Direct installed Playwright CLI `test ... --list`: 156 default selections across
  the four listed files; 45 WebKit exploration selections across the two listed
  files; 36 ability-picker fixture selections. These validate the current command
  selections, not future Mage coverage or runtime test results.
- The old plan's SHA-256 matches its original bytes. Its #164 QA backlink now
  points to the archived plan, so this move does not redirect that evidence to #165.
- No application/browser tests ran for this documentation-only task. Windows has
  Node 24.19.0 but no `npm` on this shell's PATH; discovery used the installed
  Node/Playwright entry points directly. Actual implementation qualification
  needs a supported npm/browser environment on qualified capacity.
- Final publication checks: `git diff --check`, staged file-scope/rename review,
  native issue/branch and assignee readback, then local/remote commit equality.
  Commit only the new plan, old-plan move and necessary backlink change.

## Estimate for my implementation

**6–9 hours of my elapsed working time after implementation is requested**:
roughly 2–3 hours for content/domain/save changes and focused tests, 1–1.5 hours
for feedback and legal earned-progression journeys, 2–3 hours for serial full
qualification and focused repairs, and 0.5–1.5 hours for evidence/docs/PR handoff.
This estimates my execution, not a human engineer's schedule or a guaranteed
deadline. Runner queue/offline waiting, review and deployment are excluded.

Allow **10–12 hours** if legal Mage progression, save-fixture updates or WebKit/
base regressions require substantive repair. The plan is grounded in the current
source and suite inventory; no fresh implementation timing benchmark was run.

## Implementation handoff (2026-10-28)

- Current source base: e2f0cddd5037cd36d24442ebb099b5225fd9bc33; clean at start, remote parity verified after fetch. No feature PR yet.
- Using ablation and OpenSpec apply, schema spec-driven; 1/5 tasks complete. See `openspec/changes/issue-165-mage-frost-snare/tasks.md`.
- Exact-base battle (state 3/rules 4), run-5 and dungeon-6 bytes captured under `tests/fixtures/saves/issue-165/` before modifying readers. Temporary capture unit passed and was removed.
- Core rules and save work is implemented: bounded movementBlock source/ability reference, Frost Snare catalog/validation, shared control preview/resolver/cleanup, ability-aware events and versions. Both type scopes and 352 focused tests passed; rule docs and existing Pin consumers are updated. No runtime alias/parallel Pin implementation remains.
- npm and OpenSpec exist outside PATH. npm bin: `C:/Users/apexw/AppData/Local/node/corepack/v1/npm/12.0.2/bin`; cached OpenSpec CLI: `C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js` (run with Node).
- Required work remaining: focused units/types/build, real Mage picker and earned production journey, full policy qualification, QA evidence/docs, final commits/push/ready PR. Do not treat the captured-fixture test as feature acceptance.
- The standalone build passed (221 content checks plus both type scopes). Mage seed-17 legal witness reaches level 3, uses both actions, and ends in defeat; pure replay passed. New Chromium picker checks passed with one retained cold-navigation failure followed by its targeted pass. Windows WebKit real-media preconditions fail because MP3 is unavailable; WSL Linux is the existing supported real-media route. See the QA record for all retained failures.
- Next: commit/push this coherent implementation for fixed source identity; clone it into a fresh WSL `/tmp/tactics-issue-165-20261028` checkout and reuse the existing lockfile-compatible Linux dependency/browser installation. Use the unchanged, guarded `docs/qa/issue-164/wsl-vite-bind.cjs` adapter if port 4173 requires wildcard bind. The established `docs/qa/issue-164/webkit-fixtures.config.ts` selects real WebKit fixture cases; no new permanent config is needed.
- Windows nested npm needs the ignored `tmp/issue165-bin/npm.cmd` wrapper invoking the npm CLI directly. Chromium override is `C:/Users/apexw/AppData/Local/Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe`. Do not relax audio assertions/timeouts for Windows limitations; retain original reports and qualify in Linux.
