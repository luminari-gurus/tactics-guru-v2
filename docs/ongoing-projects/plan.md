# Issue #166: Goblin Shaman support combat

Started: 2026-10-28; updated: 2026-10-29 (Asia/Jerusalem). Status: integrate newly advanced main.
OpenSpec change: `issue-166-goblin-shaman` (spec-driven).

- Issue: [#166](https://github.com/luminari-gurus/tactics-guru-v2/issues/166).
- Assignee: `moshehbenavraham`, verified through the connected GitHub account and CLI.
- [Pickup comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/166#issuecomment-6481328751).
- Base: fetched `origin/main`, `7cea1e9071c922b8a27cefe105d2fe069bc82a56`.
- Work branch: [branch/issue-166-goblin-shaman](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-166-goblin-shaman).
  Created and published after writing this plan, from the base above, using
  GitHub's native linked-branch operation for #166. Development association:
  `LB_kwDPAAAAAWJCX-bOAQIPrQ`. This branch carries the committed planning changes;
  final remote parity is checked at handoff.
- Related foundation: [#161](https://github.com/luminari-gurus/tactics-guru-v2/issues/161).
  Contribute only its Shaman save/heal/debuff slice; retain its existing owner and
  remaining acceptance. [#170](https://github.com/luminari-gurus/tactics-guru-v2/issues/170)
  retains the wider forest roster.
- Previous root plan: [Mage #165](issue-165-mage-frost-snare-plan.md), preserved
  byte-for-byte with SHA-256
  `db6c03a113d4ecfa7e8b18fe7142324198acff9b5a7a7af0d1853ae4b4d128f9`.
  Its QA backlink is updated. Its historical PR-ready wording is preserved;
  PR #250 is now merged and #165 is closed.

## Selection and available work (pickup snapshot)

Reviewed all 30 open issues, their bodies/ownership/dependencies, the three open
PRs, local/remote branch inventory, current source and uncompleted OpenSpec tasks.
REST pagination returned 33 issues/PRs on page 1 and zero on page 2; GraphQL
independently reports 30 open issues with no next page. Repository, organization
and authenticated-user Projects v2 inventories each report zero projects; all
open issues have zero project memberships. No project draft work items are
available in those inventories.

#166 is the oldest unassigned **high-priority concrete combat slice**. It adds a
distinct support enemy and supplies the first Will-save/accuracy-debuff consumer
for #161, supporting later parity work. It does not have `ready for work`; that
label was not an eligibility filter. #159's encounter foundation and #160/#163/
#164/#165 are closed and merged. #161 is an incremental foundation, not a gate
requiring all future mechanics first: its body and `docs/combat-effects.md`
explicitly require implementing remaining primitives with their real consumer.
No branch, linked branch or open PR currently owns #166.

Other work was considered as follows:

- #85, #128, #155, #161, #162, #200, #208 and #219 already belong to `dubstylee`.
  #155 has PR #246; #208 is explicitly blocked on isolated runner capacity;
  #200 is acceptance/timing follow-up, not fresh tooling implementation. #161/
  #162 have delivered slices and open umbrella acceptance. Their historical
  text does not justify taking over ownership or calling them complete.
- #167/#168/#169 are subsequent high-priority consumers with push/charge/typed
  damage or Graveyard coordination. #166 is earlier and its exact support rules
  are recoverable from pinned source. #170 is a content epic requiring slices.
- #172 is the strongest medium-priority gameplay alternative and helps #174.
  #173/#174/#175 still require equipment/reward/currency/unlock policy decisions.
  #176 and #153 are useful, but menu destinations/record boundaries need choices.
  PR #237 remains separate combat-UI design work.
- #177/#184 are independent medium-priority planning/generation expansions;
  #183 is a useful independent documentation reconciliation. They provide less
  immediate core-combat progress than the selected high-priority support enemy.
  #171 is hazard work coupled to damage/movement semantics. #178/#179/#180/#181/
  #182 are lower-priority view/export/audio/convenience/editor work. #185 explicitly
  defers unresolved class-stat design. #199 is the DevOps parent, not one delivery.
- Open PR #12 remains a separately controlled deployment proposal. Uncompleted
  historical #127 OpenSpec follow-ups do not establish a new unclaimed issue.

No unrelated issue is closed, reassigned or relabeled by this pickup.

## Outcome and non-goals

Deliver a validated Goblin Shaman with Basic Attack, Weakening Hex and Heal
Goblin, reachable through deterministic dungeon Forest Ruins content. Pure shared
previews, resolution, AI and presentation must agree; a complete legal seeded
battle must preserve exact continuation through save/reload and replay.

Preserve the standalone six-spawn canonical battle and authored-run/generated
desert rosters. Preserve approved Fighter/Ranger/Mage mechanics, movement/action
locks, deterministic streams and recovery/export behavior. New Shaman art is
source-pinned and bounded by existing loading budgets.

Non-goals: the full #161 effect engine, broader #170 roster, new hero buttons,
typed damage/resistance, hazards, push/charge, generic resource/stack scripting,
new services/dependencies, UI redesign, telemetry schema expansion, save migration,
production deployment and merge. The caller has now authorized implementation,
testing, commits, pushes and focused review-ready PRs, including dependent stacks.

## Implementation handoff (live)

Snapshot: 2026-10-29. **7/9 OpenSpec tasks** are complete. Tasks 4.1
(qualification reconciliation) and 4.2 (final delivery) remain open. All six
fresh Shaman journeys pass; final asset checks and evidence packaging remain.

- Active branch: `branch/issue-166-shaman-support`, pushed at
  **`ecab640e376888b22d3a71b84a5edcd545141a05`**, including `baa1402`.
  Local **28cba2a3fe3aab8a36e9d87579945ec68768c19b** adds the verified test-only
  backup-readiness repair; it must be pushed with the final QA handoff.
- [PR #251](https://github.com/luminari-gurus/tactics-guru-v2/pull/251): independently
  verified catalog/art foundation on the requested branch, open/non-draft.
  [PR #252](https://github.com/luminari-gurus/tactics-guru-v2/pull/252): dependent
  runtime change, draft during qualification. Its two issue-scoped hosted
  workflows were skipped; do not call them green browser validation.
- Implemented: exact Hex/heal profiles and bounded immunities; atomic pure
  preview/resolution; one-source Weakened projection/lifecycle; deterministic
  support AI; versions **state/rules/run/dungeon 5/6/7/8**; dungeon-only
  `forest_ruins_shaman_v1`; existing inspection/log/floating feedback. Other
  standalone/authored-run/desert rosters and wider #161/#170 ownership stay intact.
- See [QA](../qa/issue-166/README.md) for retained original failures, artifact
  identities and acceptance mapping. Original checkpoint `4e765f8` passed all
  **1,048 units**, both type scopes, build integrations and root build. Shaman
  seed 3 gives a legal 53-command victory, failed Hex, two heals, active Weakened
  reload/expiry and exact actual command/event/RNG replay in Chromium's three
  profiles. Ranger seed 1 also naturally proves a successful Shaman Will save.

### Repairs and proof already prepared

- Source-backed roster changes invalidated old fixed witnesses without changing
  their acceptance gates. Ranger now uses **1**, guardian **4**, Fighter **17**.
  Fighter 17 preserves six battles, level three, healing/Taunt, terminal defeat at
  depth 2/slot 2 and exact replay. Original Fighter 190 loses at depth 2/slot 0
  before Taunt; preserve that original failure.
- A stronger AI fixture put an injured ally right and all attack goals left. It
  exposed a real implementation defect: hypothetical support goals passed rich
  MapCells as UnitState positions, which the exact reader correctly rejected.
  The one-line `src/domain/ai.ts` repair projects `{x,y}`. All **45 AI + 14
  dungeon-battle tests** and both type scopes pass after the fix.
- Complete before/after packets are equal for Ranger 1, Mage 17, Shaman 3,
  guardian 4, healed-Fighter and selected victory boundaries, including commands,
  events, states/RNG, progression and replays. Windows `tmp/issue166/` holds
  `consumer-traces.json`, `consumer-equivalence.json` and capture logs; the Linux
  original packet is below. This bounds reuse of unchanged long UI histories.
- Original Chromium additionally found two mobile backup-resume failures: a test
  reads `data-session` after exactly 32 mocked milliseconds, before asynchronous
  scene/asset readiness. A test-only local patch waits for the published restored
  projection, advancing one frame only while absent. Exact continuation snapshot,
  visibility, one-canvas and subsequent legal-defeat assertions remain unchanged.
  It typechecks; all five owning Chromium/WebKit profiles now pass. Retained
  literal-base-equivalent reports also show the original cases passing, while the
  original loading/null failure remains recorded.

### Current serial repair qualification

- Linux checkout: **`/tmp/tactics-issue-166-20261029`**, clean detached repair head
  **`28cba2a3fe3aab8a36e9d87579945ec68768c19b`**. Keep browser/GPU work serial.
  Default Chromium Shaman/Fighter/backup checks passed **9/9**, zero retries/skips.
  WebKit Shaman/Fighter passed **6/6** and WebKit backup-resume **2/2**. All
  **17/17 fresh journey/backup executions** pass without retries/skips. Actual
  Shaman histories are identical across all six profiles (53 commands, two heals,
  failed Hex, active Weakened reload/expiry and victory). Fresh Chromium portrait
  and WebKit desktop/portrait/landscape inspections were reviewed.
  Engines are Chromium **153.0.8010.12** and WebKit **26.6**, Playwright 1.63.0;
  this is emulation, not physical hardware testing.
- Fresh repair preparation passed: **1,049/1,049 units**, both TypeScript scopes,
  **2/2 build integrations**, root build and **18/18 performance samples**.
  Standard receipt bundle:
  `verification-receipts/timings/issue166-repair-28cba2a/` (report.json, expanded
  unit JSON/metadata and stage logs). Inputs remained unchanged. Final root
  inventory: Linux `tmp/issue166/repair-root-inputs.json`.
- Controlled landscape-WebKit cold-history comparison is complete: literal base
  `7cea1e9` passed 3/3 at **1,058/1,066/1,088 ms** (924,857 bytes); repair head
  passed 3/3 at **1,061/1,155/1,169 ms** (926,177 bytes), unchanged 2,500 ms budget.
  Original 3,844 ms was not reproduced under these recorded idle conditions;
  preserve it without claiming a timing cause. Baseline and repair reports,
  build inventories and sample artifacts are in Linux `tmp/issue166/`. The first
  anchored baseline filter selected no tests; that incomplete attempt is retained
  separately as `base-cold-discovery-failure.*`.

### Original aggregate — completed, failed status retained

- Source **`4e765f8`**; all **19 stages executed: 17 passed, 2 failed**. Browser
  executions: **1,286 passed / 9 failed / 9 expected mode skips**, no flaky/retry
  cases. Chromium: 734/5/3; WebKit exploration: 92/4/0. Failures are six old
  Fighter witnesses, two mobile backup-readiness checks, and one 3,844 ms cold-
  history startup finding. Other stages passed, including fixtures 87, dev
  placement, WebKit acceptance 54, health bars 25, both telemetry modes 36 each,
  asset modes, integrations and all 18 performance samples.
- Raw tree: `/tmp/tactics-issue-166-20261029/tmp/verification/full-2026-10-28T22-38-13.070Z-3061420/`.
  Its input hash stayed unchanged, source remained clean, and root restoration
  was byte-identical. Root hash:
  `ace84f9570c810d914d61abbc15861e2218f951ac5afd389334a2baf8bb26ba5`.
  Original full session 33257 and metadata watcher 49387 have both finished.
- Portable original evidence is now in `docs/qa/issue-166/full-run/aggregate/`:
  all top-level reports/logs compressed, per-case JSON/error-context archive,
  complete 1,407-artifact hash inventory, source/root/prefix/restored inventories
  and manifest. Original raw screenshots remain at the raw tree above.
- Linux Node 24.15.0/npm 12.0.2 and pinned engines; separately installed Linux
  dependencies. Windows node_modules is untouched. Literal base and current
  dependencies match. Retained #165 reports plus verified relevant-input equality
  between qualified `4f8c194` and literal `7cea1e9` supply baseline proof where
  applicable. Do not relabel the original aggregate clean.

### Remaining execution and delivery

1. Asset follow-up finished: **60/60** cases across four modes, zero skips/retries;
   prefix/root builds passed and restored root is byte-identical. Portable repair
   evidence is in `docs/qa/issue-166/full-run/repair/` (80 final-source passing
   browser executions including 17 journeys/backup and three cold repeats;
   three separate literal-base diagnostic repeats). The checks used
   `tests/public-asset-base.spec.ts -g 'collector cold/warm|direct entry and refresh resolve public assets'`
   (**15 executions per mode**) in root/prefix preview/dev. Build prefix with
   `npm run build:bundle -- --base=/prototype/`, capture its inventory, then restore
   root with `npm run build:bundle` and verify equality with the validated root.
   Reuse the passed fresh unit/type prerequisites only while inputs stay unchanged.
   The original full asset failure/nonce coverage is reusable: loader, URL/cache/
   nonce generation, configurations and image bytes are unchanged by the AI fix.
2. Retain final-source representative Chromium/WebKit screenshots and all
   actual journey/replay traces. Reconcile original stages with fresh affected
   proof and explicit dependency/trace equivalence; preserve every original
   failure and the timing finding. No whole-matrix rerun is required for these
   bounded repairs. Investigate any additional actual failure.
3. Finish QA/acceptance mapping and OpenSpec tasks; validate strictly, check links
   and artifact/input hashes, commit/push, update #252 and mark it ready only after
   every gate passes. No merge, tag, release or production deployment is requested.

### Newly advanced main: integration gate

Final fetch discovered `origin/main` **b343ab02ae033a57f8c5f613f07883764f0752c0**,
which merged #246/#155 overworld enemy movement after this work's base. The
foundation merges cleanly, but the combined runtime has seven content conflicts:
three combat/dungeon/ability docs, dungeon save envelope, dungeon browser suite,
dungeon fixture helper and dungeon-battle units. Main now writes dungeon format 8
with movement-aware exploration, colliding with this branch's independent 8 bump.
Do not silently drop either reader contract, movement-aware witnesses or Shaman
proof. Preserve all completed evidence above as the pre-integration checkpoint.

Next: commit this checkpoint, merge main into the foundation branch and verify
its bounded content/type scope, push #251; merge that updated parent into the
runtime branch, resolve both features, allocate a new compatible dungeon format
and retain exact incompatible bytes. Inspect the actual combined consumer reach,
run changed units/types/builds and only invalidated browser/asset checks. Reuse
unchanged combat/standalone/run/tooling evidence with explicit input comparison;
do not restart every already-qualified suite. Keep both PRs open and leave actual
PR merging/deployment to review. Final readiness now includes this integration.

## Evidence and proposed implementation decisions

Legacy evidence is pinned to `e9433f6b608ae6b2d95418615cce9cf17dadcf74`:
[Shaman stats](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/classes/goblin_shaman.tres),
[Hex](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/abilities/weakening_hex.tres),
[heal](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/abilities/heal_goblin.tres),
[Weakened](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/status_effects/weakened.tres),
[resolver](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd#L775-L824),
[AI](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/AIController.gd),
and [turn countdown](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TurnManager.gd#L184-L225).
The following reviewed v2 adaptations define this change's implementation contract.
Live progress and qualification are tracked above and in QA; deliberate departures
from legacy behavior are stated explicitly below.

1. **Content and placement.** Baseline HP 10, move 4, jump 1, accuracy 3, AC 11,
   power 2, Dexterity 1, Will 3. Extend the closed enemy/ability catalog and exact
   validators. Add one stable `forest_ruins_shaman_v1` dungeon composition that
   replaces grunt spawn ID 6 with the Shaman, retaining the archer and other grunt,
   coordinates and IDs. Select it for the existing dungeon Forest Ruins map;
   standalone and authored-run map spawns remain unchanged. Preserve existing
   map/biome selection RNG and scaling; catalog identity changes deliberately.
   Prove legal spawn routes and living-party subsets on the dungeon map variant.
2. **Hex.** Hostile living target, Manhattan range 2–4 and existing blocked-LOS
   rule. Roll exactly one d20 after complete preflight: `d20 + target.will >=
   10 + projected caster.power` saves (baseline DC 12); natural 1/20 have no
   automatic save outcomes. Publish exact success/failure face counts and the
   rolled result. A failed save applies accuracy −2 once through `combatStats`;
   no damage, AC, Will, movement or automatic-Magic-Missile change. End the target's
   next turn to expire. Store one bounded Shaman source reference: reapplication
   refreshes/replaces, never stacks; a successful save leaves an existing debuff
   intact. Follow v2 control-effect convention and clear on source/target defeat
   and new battle entry; source-defeat cleanup is an explicit v2 adaptation.
3. **Heal.** Same-side living injured eligible goblin, range 1–4 and LOS; apply
   `min(4, projectedMaxHp - hp)`, without RNG. The closed eligible IDs are grunt,
   archer and Shaman; range minimum excludes self. No name-prefix inference,
   revival or free hero heal. Both support abilities use the ordinary one action,
   with no additional cooldown/use pool. Full-health/dead/wrong-side/non-goblin/
   out-of-range/blocked targets reject without state, events, budgets or RNG changes.
4. **Immunity boundary.** #166 explicitly requires immunity proof. Admit only
   bounded catalog immunity IDs/tags relevant here (`weakened` / `debuff`) and
   evaluate one shared predicate in preview, resolution and AI. Do not assign
   immunities to current production actors without source evidence. Controlled
   validated catalog variants exercise immune targets in tests. Immune effect-only
   casts reject before action/RNG per the v2 #161 handoff, an explicit adaptation
   from legacy's accepted immune cast. No resistance/damage-type framework.
5. **AI.** Extend the existing candidate pass to shared legal attack/heal/Hex
   previews at the same reachable positions. Keep ordinary enemy choices identical.
   Use deterministic integer scores in the existing summed-d20 damage-score units:
   ordinary attacks retain their current score; healing scores `20 * appliedHeal`;
   Hex scores `failedSaveFaces * max(1, targetEffectiveAccuracy + targetPower)`.
   AI skips zero-value healing and already-Weakened/immune targets. This bounded
   target-strength heuristic adapts legacy scoring without a new configurable AI
   framework or preview RNG. Preserve ties by score descending, movement cost,
   target ID, ability ID, then y/x; extend legal route goals to useful support
   targets before Wait. Taunt restricts offensive targets, not allied healing;
   Pin/Snare still allow a legal in-place support action or Wait. No hidden-roll
   lookahead or extra move/action after a committed ability.
6. **Admission, identity and continuation.** Use an exact optional Weakened source
   field with eligible living source/target validation, following current bounded
   fields rather than a generic effects array. Bump state format 4→5, rules 5→6,
   run envelope 6→7 and dungeon envelope 7→8; keep RNG and standalone wrapper at 1.
   Existing content/dungeon identity hashing includes the new rule/catalog data.
   Preserve/export previous-format bytes as incompatible through existing recovery;
   no silent migration/reset. Retain battle-local status across active reload,
   never carried party progression. Trace enemy healing through full snapshot
   admission and run/dungeon aggregate limits; it must not relax hero-entry HP
   checks or Second Wind bounds. Any changed AI replay behavior is versioned.
7. **Assets and feedback.** Reuse pinned `art/units/goblin_shaman.png` and
   `art/portraits/goblin_shaman_portrait.png`; record source hashes, actual
   dimensions, foot anchor, rights uncertainty and bounded portrait export under
   existing art guidance. No generation or bulk asset import. The current loader
   loads all catalog images, so include the added pair's startup/transfer cost even
   in modes without a Shaman; optimize only if measured budgets require it. Reuse
   existing inspection/log/floating-heal presentation, add save/Weakened feedback
   and honest ability/range/chance text. Trace audio events and telemetry allowlists;
   retain current cue and sanitized-event contracts unless an actual consumer
   requires a bounded update. Do not describe Heal Goblin as a spent Second Wind use.

## Ablation and affected files

Keep only the Shaman's real consumer and its required shared seams. Remove the
proposed need for a general effect interpreter, configurable AI weights, full
forest pack, new player support controls, save migration or new test harness.
Existing discriminated abilities, exact readers, projection, AI candidate loop,
event presentation, dungeon composition and recovery are sufficient. Retain the
immunity seam and full qualification because explicit acceptance/shared contracts
depend on them; dropping them would leave requirements unproven.

Expected implementation owners, confirmed against current source:

- `src/content/{constants,types,abilities,catalog,validate,assets}.ts`,
  `src/content/dungeonEncounters.ts`, and the added source/runtime Shaman PNG pair
  under `public/battle/source/` and `public/battle/portraits/`.
- `src/domain/{types,effects,combat,battle,turns,ai,constants}.ts` and
  `src/domain/{runSaveEnvelope,dungeonSaveEnvelope}.ts`. Inspect
  `contentIdentity.ts`, `runBattle.ts`, `dungeon.ts` (including `dungeonBattle`),
  `saveEnvelope.ts` and `src/app/BattleSession.ts` for identity, HP admission and
  continuation consequences; edit only required consumers. Preserve grid/route/RNG
  algorithms while testing their new actor and effect consumers.
- `src/ui/hud.ts`, `src/phaser/abilityPresentation.ts`; trace `battleActions.ts`,
  `targetPreview.ts`, `BattleScene.ts`, `src/audio/battleCues.ts` and telemetry.
  Enemy-only support does not need new player picker actions.
- Extend existing content/ability/state/AI/turn/session/save/dungeon unit owners,
  `tests/dungeon.spec.ts`, affected persistence/loading/asset browser cases and
  existing authored-encounter fixtures where isolated support coverage is needed.
- Update `docs/combat-effects.md`, `docs/enemy-turns.md`,
  `docs/first-battle-content.md`, `docs/dungeon.md`, related current ability/save
  rules and `docs/qa/issue-166/README.md`. Update existing canonical enemy-turn
  requirements where behavior changes; avoid rewriting old QA as fresh evidence.

## Implementation sequence and proof

1. **Freeze the rule/content contract.** Add closed catalog profiles/validators,
   source-pinned assets and the dungeon-only composition. Add missing behavioral
   assertions to existing test owners, including unchanged canonical spawns,
   malformed catalog/immunity data and deterministic map/composition identities.
2. **Resolve atomically.** Add pure Hex/heal previews, exact save arithmetic,
   bounded Weakened projection/lifecycle/events and immutable resolution. Test
   all 20 save faces, equality boundaries, natural 1/20, projected DC, modifiers
   with Guarded/Mark, refresh and successful-save preservation, both defeat paths,
   target-endTurn and RNG exhaustion. Snapshot every rejected command/preview to
   prove no mutation/draw/spending. Healing covers partial four/full clamp and
   every invalid ally/LOS/range case, including the last living ally.
3. **Use the real AI/session path.** Add useful support candidates and legal
   approach/Wait behavior. Assert exact scores/ties, unit permutations, repeated
   planning, taunt restrictions, Pin/Snare, dead/missing targets, existing grunt/
   archer command equivalence and no preview RNG. Drive accepted commands through
   normal enemy turns and preserve event order and one-action locks.
4. **Carry and explain the result.** Version all changed formats, update exact
   compatible/incompatible fixtures, add feedback and prove standalone/run/dungeon
   round trips, forged-source rejection, corrupted/old-format recovery with bytes
   retained, status expiry after reload and fresh encounter reset. A legal dungeon
   production-HUD journey must enter the actual Shaman composition, observe useful
   Hex and ally healing, inspect Weakened/save feedback, reload active Weakened,
   observe expiry and reach a legal terminal battle outcome. Retain commands,
   state/events/RNG and exact continuation replay. Use separate deterministic
   witnesses if one natural battle cannot demonstrate every save/heal branch;
   injected fixture state alone does not prove production reachability.
5. **Qualify and hand off.** Audit all five #166 criteria against evidence, finish
   docs, commit/push implementation and publish focused review-ready PRs.
   Use `Closes #166` only with complete proof; use `Refs #161` and
   retain its wider remaining criteria. No unrelated issue closure or deployment.

The five issue criteria map respectively to content/placement proof (1),
save/debuff/feedback proof (2 and 4), heal/atomicity proof (2), AI equivalence/
support proof (3), and negative/complete-continuation proof (2–4).

Focused iteration commands from a supported Node/npm environment:

```sh
npm run test:unit -- tests/unit/content.test.ts tests/unit/abilityValidation.test.ts tests/unit/abilities.test.ts tests/unit/state.test.ts tests/unit/ai.test.ts tests/unit/turns.test.ts
npm run test:unit -- tests/unit/battleSession.test.ts tests/unit/saveEnvelope.test.ts tests/unit/runSaveEnvelope.test.ts tests/unit/dungeonBattle.test.ts tests/unit/dungeonEncounters.test.ts tests/unit/dungeon.test.ts
npm run build
npx --no-install playwright test tests/dungeon.spec.ts tests/dungeon-lifecycle.spec.ts tests/battle-persistence.spec.ts
npx --no-install playwright test -c playwright.exploration.config.ts tests/dungeon.spec.ts tests/dungeon-lifecycle.spec.ts
```

Final qualification is **full regression** under
[verification-policy.md](../verification-policy.md): shared commands/AI/effects,
versioned save admission and cross-route consumers change. Discover selection
with `npm run verify:full -- --list`, then run `npm run verify:full` on qualified,
otherwise idle capacity or use the existing complete serial-batch ledger. Account
for all 19 stages: tooling, units/content, both type scopes, root/prefix build
integrations/bundles, default Chromium, dev fixtures/placement, both WebKit
matrices, health bars, both configured telemetry modes, root/prefix assets,
exclusive performance capture and restored root build. Use test discovery to
prove new journeys are selected on Chromium and WebKit desktop/portrait/landscape;
add only explicitly missing selection, preserving prior IDs and metadata.

Keep one browser worker, serial GPU/performance use and the existing self-hosted
CI lock; there is no automatic GitHub-hosted fallback. Device emulation satisfies
acceptance under AGENTS.md. Local `CAN_TEST_MOBILE=android` describes availability
only; physical-device work is neither required nor claimed. Preserve source/build
hashes, commands, test IDs, mode/engine/host and all failures/skips/incomplete runs.
Reuse prior results only with unchanged relevant inputs and retained provenance;
#165 evidence does not qualify changed Shaman rules or the new build.

## Planning validation and estimate (historical)

Planning checks passed: source/acceptance tracing, 21 local links across the three
changed documents, 15 named test
paths, traced source paths and command/script consistency.
`node scripts/verify-full.mjs --list` discovers all 19 stages without execution.
Direct installed Playwright CLI discovery selects 105 default cases in the three
listed files and 48 WebKit cases in the two listed files. These are selection
checks of existing tests, not Shaman runtime evidence. The archive's raw hash and
Git blob match the previous root plan. Before publication verify
`git diff --check`, only the plan/archive/backlink file scope,
native issue/branch association, assignment and local/remote commit parity.
No application/browser test execution is required or claimed for this prose change.
The native Windows shell has Node but no npm/gh on PATH; authenticated WSL gh is
available. Runtime qualification later needs the supported npm/browser environment.

**My implementation estimate: 7–11 hours of elapsed working time after an
implementation request**, comprising 2–3 hours for rules/state/save admission and
focused units, 1–2 hours for content/assets/AI, 1–2 hours for feedback and legal
continuation journeys, and 3–4 hours for full qualification, focused repairs and
evidence/PR handoff (some tasks overlap). Allow **12–15 hours** if legal support
witnesses, WebKit behavior or existing regressions need substantive repair.
This estimates my execution, not a human engineer's schedule or a guaranteed
deadline; runner queues/offline waits, review, merge and deployment are excluded.
