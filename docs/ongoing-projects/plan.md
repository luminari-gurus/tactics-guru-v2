# Issue #166: Goblin Shaman support combat

Date: 2026-10-28 (Asia/Jerusalem). Status: implementation authorized and in progress.
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

## Selection and available work

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

- Starting source: clean `b5b450f80405d14a28082c43ba555bcf02f2b11e` on the named
  branch; fetched `origin/main` remains `7cea1e9`, with no intervening changes.
- Current work (2026-10-29): foundation PR [#251](https://github.com/luminari-gurus/tactics-guru-v2/pull/251)
  is open and non-draft, pushed at `d2e211d`. OpenSpec task 1.1 is complete (1/9).
  Gameplay/placement continues on `branch/issue-166-shaman-support`, based on this
  branch, with its PR targeting `branch/issue-166-goblin-shaman` until #251 merges.
  No tag/release/merge/deployment is needed for these review chunks.
- Environment: Windows Node and installed Windows dependencies work; WSL provides
  npm, authenticated gh and OpenSpec. Use Windows Node for native dependencies
  and browser runs; do not replace the shared installed node_modules.
- Foundation proof: 199 focused content tests, 28 combat/turn fixture tests, 222
  content-validation tests, both type scopes, production bundle and two root/prefix
  header integrations pass. The final 27-case desktop/portrait/landscape browser
  selection passes on installed Chrome via the supported executable override.
  Setup failures, exact commands/input/build inventory and screenshots are retained
  in [#166 QA](../qa/issue-166/README.md). No full-issue acceptance is claimed.
- Browser environment: packaged Windows Chromium fails `spawn UNKNOWN`; installed
  Chrome 155.0.8059.41 works. Native npm shim in ignored `tmp/issue166/tools/npm.cmd`
  invokes Node + `C:/Users/apexw/AppData/Local/node/corepack/v1/npm/12.0.2/bin/npm-cli.js`.
  Add that shim directory to PATH for nested npm/test-server commands. Keep one
  browser worker; Linux WebKit qualification is still required later.
- Ablation: retain the existing catalog, pure preview, candidate loop, bounded
  optional state and event surfaces. No general effect interpreter, configurable
  scoring framework, new UI controls or asset generation is needed.

## Evidence and proposed implementation decisions

Legacy evidence is pinned to `e9433f6b608ae6b2d95418615cce9cf17dadcf74`:
[Shaman stats](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/classes/goblin_shaman.tres),
[Hex](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/abilities/weakening_hex.tres),
[heal](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/abilities/heal_goblin.tres),
[Weakened](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/status_effects/weakened.tres),
[resolver](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd#L775-L824),
[AI](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/AIController.gd),
and [turn countdown](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TurnManager.gd#L184-L225).
These proposed v2 adaptations are reviewable design decisions, not implemented
behavior or a claim of identical legacy AI.

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
   docs, commit/push implementation and prepare a focused PR when implementation
   is requested. Use `Closes #166` only with complete proof; use `Refs #161` and
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

## Planning validation and estimate

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
