# Issue #164: Ranger Mark Target and Pinning Shot

Date: 2026-10-27 (Asia/Jerusalem). Status: implementation approved and active.
The caller approved this plan and requested implementation, required verification
and a PR on `branch/issue-164-ranger-abilities` on 2026-10-27.

## Current implementation checkpoint

- Runtime and tests are implemented/published in `af9c1b6`; current full-run source
  is `789161c`, which only adds the task-local WSL bind adapter. Main's `b629926`
  README update is integrated. No PR has been opened yet.
- Windows iteration: all 986 units, both types, build/content, 12 Ranger picker
  cases and the complete earned level-3 Ranger HUD journey passed. The journey
  uses five encounters/338 combat commands, resumes both effects, observes Mark
  consumption and ends in defeat with exact replayed state. Raw/retained evidence
  and failures are described in [QA](../qa/issue-164/README.md).
- The full 19-stage run is **live** in WSL checkout
  `/tmp/tactics-issue-164-20261027`, Node process `2506569`, unified-exec session
  `74639`. Reports:
  `tmp/verification/full-2026-10-27T11-14-39.281Z-2506569/` in that checkout.
  Check its actual process/session and summary; never restart because observation
  times out. Units, types and build integrations passed; browser stages continue.
- Initial tooling failed because `wsl-vite-bind.cjs` resolves a `node -e`
  argument as a file. **Do not edit this adapter while the run is live:** its
  `NODE_OPTIONS` path points into the Windows worktree. After completion, add a
  Vite-filename guard before realpath lookup, rerun affected tooling and actual
  Vite smoke, and retain the failed aggregate. Successful unaffected coverage is
  reusable; do not rerun it merely for a green aggregate.
- The fix is prepared separately in ignored
  `tmp/issue-164/wsl-vite-bind-fixed.cjs`; its 10 verification, 20 process/reporting
  and 27 selection/batch contracts pass. Candidate hashes/logs are retained under
  `docs/qa/issue-164/tooling-candidate/`. Apply these same bytes only after the
  live run, then prove actual Vite/engine startup with the corrected adapter.
- Additional previous-format browser recovery cases are prepared in
  `tests/dungeon-lifecycle.spec.ts` and typecheck passes; they still need focused
  Chromium/WebKit execution after the live run. The extra simultaneous/replaced
  source assertions in `abilities.test.ts` pass all 35 cases. No runtime changed.
- Actual baseline/current selection comparison preserves every old ID, metadata,
  worker and project: default 715 → 727, fixtures 72 → 81, WebKit exploration
  78 → 90 and acceptance 54 → 54. This includes nine recovery cases added after
  the full run froze at 718 default/81 exploration selections. Retained raw
  selections and [continuity summary](../qa/issue-164/selection-continuity.json)
  identify every addition.
- Remaining: reconcile full results/failures, execute added recovery cases and
  the task-specific WebKit picker config, preserve final reports/screenshots and
  source/build identities, finish the acceptance audit, then open/attach the PR.

- Issue: [#164](https://github.com/luminari-gurus/tactics-guru-v2/issues/164).
- Assignee: `moshehbenavraham`, resolved from the authenticated GitHub account.
- [Pickup comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/164#issuecomment-6439889068).
- Base: `origin/main`, `56e2b0ddd1fb8d7559239a2db38220c59241976e`.
- Work branch: [branch/issue-164-ranger-abilities](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-164-ranger-abilities),
  created after writing the plan through GitHub's native linked-branch operation.
  Its Development association is #164. Planning files are published from an
  isolated managed worktree; verify remote commit parity before handoff.
- Previous root plan: [issue-163-fighter-abilities-plan.md](issue-163-fighter-abilities-plan.md),
  moved without changing its bytes; SHA-256
  `26940ba96adebce344ca58a97e5ba5ff887a567de9f50eb73613811596bbb159`.
  It is historical: its four PRs are now merged and #163 is closed.

## Selection and available work

Reviewed all **33 open issues**, their complete bodies, labels and assignees,
the **four open PRs**, and **six remote branches**. The paginated REST issue list
contains 37 entries including PRs, with an empty second page; GraphQL independently
reports 33 open issues and no next page. Native dependency and linked-branch
relationships were inspected for all issues, together with relevant comments,
merged prerequisites, existing plans and current source. Selection was not
restricted to the `ready for work` label; #164 had only `enhancement`.

All open issues have zero Project memberships. The authenticated user and
organization each expose zero Projects V2. Repository-only Project/draft-item
listing requires unavailable `read:project` permission, so that separate inventory
could not be verified. No permission changes were made.

**Choose #164:** it is high priority, unclaimed, has concrete legacy/source-backed
rules and can use the shipped progression, picker and effect boundaries. It is
the oldest remaining unassigned high-priority class-ability issue after #163.
Adopting Pinning Shot also supplies a tested movement-blocking primitive for
#165's Frost Snare; this enables that part of #165, not its unresolved Arc Bolt
adaptation. Mark semantics also provide a real consumer for #161 and later Ranger
reward work in #174. No active branch or PR covers #164.

Prerequisites are judged by merged functionality, not blanket tracker closure:

- #160 is closed; [PR #238](https://github.com/luminari-gurus/tactics-guru-v2/pull/238)
  merged progression at `852e9d5`. `progressHero` derives learned abilities from
  catalog `requiredLevel`; `projectProgression` removes locked profiles.
- #161 remains assigned to `dubstylee` and open for downstream effects.
  [PR #188](https://github.com/luminari-gurus/tactics-guru-v2/pull/188) merged the
  Guarded foundation at `38474f2`; [combat-effects.md](../combat-effects.md)
  explicitly assigns Mark and movement-block activation to their first consumers.
- #162 remains assigned to `dubstylee` and open for wider acceptance.
  [PR #211](https://github.com/luminari-gurus/tactics-guru-v2/pull/211) merged the
  catalog-driven picker at `c051b00`. Its existing real consumer is now #163.
- [PR #247](https://github.com/luminari-gurus/tactics-guru-v2/pull/247), current
  main, delivered Second Wind/Taunt and bounded source references, turn/defeat
  cleanup, accessible feedback, replay and save recovery. Those patterns are
  directly reusable; they do not mean marks or immobilization already work.

Disposition of the rest of the open backlog:

- **Existing ownership/work:** #85 (operator release acceptance), #123 (PR #139),
  #128 (telemetry), #155 (PR #246), #161, #162, #200 (baseline acceptance),
  #219 (cleanup already integrated via #222/#209) are assigned to `dubstylee`.
  #208 remains assigned and blocked on additional isolated runner capacity.
  #199 is the DevOps epic, not an unclaimed implementation slice. PR #12 is the
  separate restricted-SSH proposal; draft PR #237 is combat UI design.
- **Strong alternatives:** #165 needs an Arc Bolt adaptation decision; #166 needs
  reviewed save/debuff rules, support AI and new content; #167 needs push/formation
  rules; #168 needs charge/stack rules; #169 needs damage traits/immunity and
  Graveyard placement. #164 has a smaller, more established gameplay contract.
- **Ready or plan-able, lower immediate priority:** #153 menu/navigation needs
  destination and save-selection choices; #172 consumables/revival needs supply
  policy; #176 records needs retention/counter semantics; #177 movement undo has
  information/save boundaries; #179 logs, #181 convenience UI, #183 documentation
  and #184 generator profiles are useful but less direct core-combat progress.
- **Broader or dependent design:** #170 requires per-biome issue slices; #171
  needs hazard/damage and forced-move ordering; #173 equipment and #174 rewards
  need functioning modifier/acquisition choices; #175 depends on rewards/unlocks;
  #178 rotation is a deliberate usability/cost review; #180 music depends on
  Settings/provenance choices; #182 editor needs an adoption decision; #185
  explicitly remains deferred pending a class-stat mapping.

No unrelated issue was reassigned, closed or relabeled. #161/#162 are references,
not additional issues claimed by this branch.

## Outcome

Make Mark Target a real level-2 Ranger action and adopt Pinning Shot as a real
level-3 action. Both must be reachable through the existing HUD in earned
progression, survive active-battle save/resume, replay deterministically, and show
accurate effect information. Keep High Shot, Guarded Strike, Fighter skills,
Magic Missile, ordinary movement and existing input/confirmation boundaries intact.

## Rules selected for implementation

These are concrete planning decisions, including explicit v2 adaptations. They
are not claims that the feature is implemented or that every legacy detail is
already approved v2 behavior.

### Mark Target

- Ranger only, level 2 (60 XP), one action, living hostile unit, Manhattan range
  2–5 and the existing line-of-sight rule. No damage, attack/save roll, cooldown
  or per-battle use limit. Successful application does not end the actor's turn.
- One mark per target; reapplication replaces its source and never stacks the
  bonus. Different enemies can be marked simultaneously; there is no global
  one-mark-per-Ranger cap. Mark and Pin may coexist on the same enemy.
- The next accepted **player-side attack roll** against that target receives +2
  accuracy exactly once, including Basic Attack, High Shot and Guarded Strike.
  Consume on a hit, miss, natural 1 or natural 20. Preserve existing height,
  Guarded penalties, critical and damage calculations; this is target-dependent
  attack accuracy, not a permanent actor stat bonus.
- Previews, prepared/cancelled commands, rejected actions, Wait, movement,
  enemy attacks and automatic-hit Magic Missile do not consume or benefit.
  Multi-missile damage leaves a surviving target's mark intact; target defeat
  still removes it. A future rolled multi-hit profile is outside current content;
  it must consume on its first qualifying roll if introduced later.
- No turn countdown. Remove on target defeat, marking Ranger defeat, or battle
  replacement. Source-death cleanup is the explicit v2 adaptation proposed by
  #161. Rebuilding a new encounter never carries battle-local marks forward.

### Pinning Shot decision: adopt

The pinned legacy source defines a level-3 unlock and a resolver, but its normal
Ranger action list omits Pinning Shot. Adopt it deliberately in v2; do not describe
it as a previously reachable legacy ability.

- Ranger only, level 3 (180 XP), one action, living hostile unit, range 2–5 with
  ordinary LOS. No damage or attack/save roll, cooldown or per-battle use limit.
- Prevent ordinary voluntary movement until the target completes its next
  accepted `endTurn`. Attacks and Wait remain legal. Expire at that exact boundary
  across initiative wrap, or on source/target defeat; no stacking/countdown array.
- Reject an already pinned target before spending an action or changing state.
  This follows the legacy resolver's explicit `already_pinned` rejection and
  avoids an extra refresh policy. Reapplication after expiry is legal.
- Movement preview exposes only the origin for a pinned active unit; an actual
  move rejects with an intelligible immobilized reason and spends nothing.
  Keeping an origin-only reachable result lets existing enemy planning still
  consider attacks or Wait instead of failing its whole turn. No ordinary-move
  candidate may escape the lock. This does not confer forced-movement immunity;
  push/charge content remains owned by #167/#168.
- Use a small shared movement-block predicate in `effects.ts`, exercised by Pin
  now. #165 can later reuse it; no dormant Frost Snare profile ships here.

### Immunity and atomicity

Current validated enemy content consists of Goblin Grunt/Archer with no status
immunities. The selected policy makes both susceptible to Mark and Pin. Verify
both explicitly and keep malformed/unsupported immunity metadata rejected by
content validation; do not invent a current immune enemy or silently skip this
policy check. Positive typed/tag immunity behavior belongs to #169's first real
immune consumer, and is not claimed as implemented/tested here.

Every action checks ownership/unlock, actor/target, action availability, range,
LOS, existing Pin and current state before adoption. Rejection and previews leave
HP, actions, movement, RNG, command count, events and stored bytes unchanged.
An exhausted RNG cursor rejects a qualifying attack without consuming its mark.

## Source and consumer trace

Legacy revision: `e9433f6b608ae6b2d95418615cce9cf17dadcf74`.

- [Profiles and status hooks](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd#L102-L146):
  ranges, +2 Mark, no Mark countdown, Pin turn-end hook.
- [Mark and Pin resolution](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd#L301-L450):
  action spending, no attack roll/damage, already-pinned rejection.
- [Mark accuracy](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd#L1095-L1107)
  and [consumption](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd#L1238-L1262)
  establish player-side roll semantics, including misses.
- [Unlocks](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/UnitProgressionService.gd#L15-L28)
  versus [normal action list](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/ForestRuinsMvpBuilder.gd#L1190-L1215)
  distinguish the Pinning Shot adoption from ordinary legacy parity.

Current source has explicit `Ability` kinds and exact validators, `UnitState`
optional bounded effect fields, shared previews and `dispatch`, and source-bound
Taunt cleanup. `BattleSession` delegates all commands to those domain paths.
`battleActions.ts` already builds hostile unit targets from catalog profiles;
`targetPreview.ts` uses `previewAbility`. HUD preview text currently identifies
Taunt by `sourceId`, so adding another source-bearing preview requires an
explicit discriminant rather than letting Mark/Pin render as Taunt.

`grid.ts` supplies both player movement and AI candidates; `ai.ts` propagates a
failed movement preview, explaining why the origin-only Pin preview matters.
`BattleScene` is shared by standalone, short runs and dungeon battles. Existing
`abilityPresentation.ts` can show accepted status events without new sprites or
attack animations. `progression.ts` derives learned identities from catalog
profiles; short runs can exercise Mark after level 2, while the continuing dungeon
is the normal route to use level-3 Pin during a later encounter.

## Files and implementation steps

1. **Content and bounded effect data.** Extend
   `src/content/{types,abilities,validate}.ts` with the two canonical Ranger kinds
   and levels. Add bounded source references and effect events/rejections to
   `src/domain/types.ts`; validate exact shapes and living, eligible source/target
   references in `src/domain/battle.ts`. Reuse catalog-derived progression;
   change `src/domain/progression.ts` only if an observed gate requires it.
2. **One authoritative resolution path.** Extend
   `src/domain/{effects,combat,grid,turns}.ts`. Apply/consume Mark around accepted
   rolled attacks, clean both statuses after every damage path including missiles,
   expire Pin at target endTurn, and share movement restriction with previews and
   AI. Edit `src/domain/ai.ts` only if its existing origin/attack/Wait path needs
   adjustment; preserve deterministic tie-breaks and no preview RNG.
3. **Versioned persistence and continuation.** Extend the existing exact readers
   and envelopes in `src/domain/{constants,saveEnvelope,runSaveEnvelope,dungeonSaveEnvelope}.ts`
   and inspect `src/domain/{run,dungeon}.ts`, `src/app/BattleSession.ts` and owning
   storage/session consumers. Planned versions: battle state 3 / rules 4, run
   envelope 5, dungeon envelope 6; RNG stays 1 and standalone wrapper stays 1.
   Recheck these against implementation base before reserving values. New learned
   identities also affect progression/catalog hashes. Use the existing incompatible
   save recovery/export behavior, retain original primary/backup bytes, and never
   silently migrate, normalize or clear old data. Current-format reload preserves
   exact effects/events/RNG; the next encounter starts without them.
4. **Reachable actions and feedback.** Extend `src/ui/hud.ts` with discriminated
   no-roll previews, source/lifetime information, action guidance and event text;
   extend `src/phaser/abilityPresentation.ts` for accepted Mark/Pin feedback. Check
   `src/ui/{battleActions,targetPreview}.ts`, `src/phaser/BattleScene.ts` and
   `src/app/BattleSession.ts`; change only necessary consumers. Reuse the native
   picker, direct HUD confirm, cancel, inspection, targeting and input locks.
5. **Proof and current documentation.** Extend existing unit/browser files below,
   update [signature-abilities.md](../signature-abilities.md) and
   [combat-effects.md](../combat-effects.md), and retain source-bound QA under
   `docs/qa/issue-164/`. Record enabled versus deferred #161/#162 acceptance;
   completing #164 must not close either broader tracker automatically.

## Non-goals and ablation decisions

- Keep two closed effect cases and existing state/command paths. Drop a generic
  status engine, scripting language, global effect registry, middleware and a
  resource/cooldown subsystem: neither chosen ability needs them.
- Keep shared movement blocking because Pin needs it now; drop all Mage ability,
  typed-damage/save, enemy-immunity catalog, hazard and forced-move implementations.
  Their future owners do not justify shipping unused machinery here.
- Keep HUD/inspection/log/floating feedback because live status information is an
  acceptance criterion. Drop new art, sound packs, persistent board badges, a
  replacement picker and any dependency on unmerged mobile collapse/design PRs.
- Keep version/recovery work because exact state shapes and derived learned lists
  change. Drop speculative backwards migration; retain the established safe
  incompatible-save flow and explicit proof of untouched bytes.
- Keep High Shot and all approved signatures unchanged. Drop Lingering Mark,
  class-stat growth, rewards, recruitment and balance changes outside these rules.
- Keep focused iteration and final full-regression accounting because shared
  attack, movement, turn and save contracts change. Reuse valid unaffected proof
  under the verification policy; do not rerun suites merely for a new docs commit.

Removing any retained work would omit a named acceptance criterion or a traced
consumer. This plan is the requested repository document; no duplicate planning
report, general framework or separate approval artifact is needed for this handoff.

## Proof and acceptance mapping

Follow [verification-policy.md](../verification-policy.md). This planning commit
requires documentation/link/path/command/diff checks only, not app execution.
The following commands and cases are the future implementation gates, not results.

1. **Mark rules and level gate (criteria 1–2).** Extend `combat.test.ts`,
   `state.test.ts`, `progression.test.ts`, `content.test.ts` and
   `contentContract.test.ts`: levels 1/2/3, real ownership, range edges/LOS,
   ally/self/missing/dead targets, source defeat, simultaneous marked enemies,
   replacement, miss/natural rolls, additive accuracy without double projection,
   pure repeated preview/cancel, exhausted RNG and rejected-command equality.
   Exercise automatic multi-missile casts against both surviving and defeated
   marked targets and friendly damage defeating a source.
2. **Adopted Pin (criterion 3).** Extend `grid.test.ts`, `ai.test.ts` and
   `turns.test.ts`: only origin reachable, movement rejected without spending,
   legal attack/Wait, no-attack fallback, next target endTurn including round wrap,
   source/target defeat, already-pinned rejection, Mark/Pin coexistence, new-battle
   reset, and deterministic enemy plan/replay. Both current enemies are susceptible
   under the explicit immunity policy; unsupported immunity fields remain invalid.
3. **Real UI and unchanged High Shot (criterion 4).** Extend
   `battleActions.test.ts`, `battleSession.test.ts`, `abilities.test.ts`,
   `tests/ability-picker.spec.ts` and its existing fixture only as needed. Verify
   locked/learned choices, correct no-roll text, effect source/expiry, hit chance
   with Mark, target switching, cancel, repeat input, stale intent, inspection,
   resize, keyboard focus, native touch and narrow portrait/landscape. Assert no
   accidental damage animation or false attack/magic audio cue. Retain High Shot
   and Fighter/Magic Missile regression coverage.
4. **Continuation and real progression (criterion 5).** Extend
   `saveEnvelope.test.ts`, `runSaveEnvelope.test.ts`, `dungeon.test.ts`,
   `dungeonBattle.test.ts`, session/storage tests and `tests/{battle-persistence,run-progression,dungeon,dungeon-lifecycle}.spec.ts`.
   Prove exact active Mark/Pin reload, replay/state/event/RNG agreement, corrupt
   references and old-format recovery without data loss, new-encounter cleanup,
   and no leakage into carried party fields. Play a complete legal production
   dungeon journey earning level 3 and using both abilities through the HUD with
   reloads, then reach victory or defeat. Use a demonstrated legal seed/strategy;
   do not assume #163's Fighter trace guarantees Ranger survival or rewrite saves
   to manufacture progression. Short-run acceptance covers earned Mark; standalone
   acceptance keeps level-one actions and the unchanged initial battle boundary.

Focused iteration commands, from the repository root after installing locked
dependencies with the supported Node version:

```sh
npm run test:unit -- tests/unit/combat.test.ts tests/unit/state.test.ts tests/unit/grid.test.ts tests/unit/ai.test.ts tests/unit/turns.test.ts tests/unit/progression.test.ts
npm run test:unit -- tests/unit/saveEnvelope.test.ts tests/unit/runSaveEnvelope.test.ts tests/unit/dungeon.test.ts tests/unit/dungeonBattle.test.ts tests/unit/battleSession.test.ts tests/unit/battleActions.test.ts tests/unit/abilities.test.ts
npm run build
npm run test:fixtures -- ability-picker.spec.ts
npx --no-install playwright test tests/battle-loop.spec.ts tests/battle-persistence.spec.ts tests/run-progression.spec.ts tests/dungeon.spec.ts tests/dungeon-lifecycle.spec.ts
npx --no-install playwright test -c playwright.exploration.config.ts tests/dungeon.spec.ts tests/dungeon-lifecycle.spec.ts
```

Final selection is **full regression** because this changes shared attack/move/
turn behavior and save admission across routes. Use `npm run verify:full -- --list`
to inventory every stage, then `npm run verify:full` on qualified exclusive
capacity, or the existing resumable serial batch workflow with an exact coverage
ledger. Include all fast units/content, both type scopes, root/prefix build
integrations, default Chromium desktop/touch profiles, all dev fixtures and dev
placement, WebKit acceptance/exploration, health bars, distinct configured telemetry
modes, root/prefix assets and the existing full-run performance capture. Add the
new Ranger browser cases to the appropriate engine selections where existing
grep/testMatch would otherwise omit them; discover and preserve existing IDs.

Retain failures/skips/interrupted runs, final build/source and relevant input
hashes, browser/host/mode identity, screenshots and replay receipts. Run browser
suites sequentially with one worker and zero blanket retries. Browser CI remains
self-hosted without automatic GitHub-hosted fallback. Physical access in the
caller's `.env` is `android`; none is required here because Playwright/device
emulation is sufficient under AGENTS.md. Do not claim physical-device coverage.
Use a functioning qualified WebKit environment for its real media/engine cases.

Reusable evidence must have unchanged relevant inputs and retained original
receipts; a prior failed aggregate cannot become a clean full run by adding focused
passes. Investigate any new regression against the literal base under matching
conditions and rerun only invalidated coverage. Finish with `git diff --check`,
an acceptance-by-acceptance audit and a focused PR referencing #164; only use
`Closes #164` after every selected criterion is proven. No merge or deployment is
part of this plan.

## Planning verification

- Local Markdown links and named unit/browser paths checked against current main.
  The first path check caught a proposed `abilityPresentation.test.ts` filename;
  corrected it to the existing `abilities.test.ts` that owns that coverage.
- `npm run verify:full -- --list`: all 19 stages discovered without execution.
- Playwright `--list` for the five listed default browser files: 189 selections;
  the two listed WebKit exploration files: 33; ability-picker fixtures: 27.
  These establish valid current commands, not future Ranger coverage or test passes.
- The previous plan's archive hash matches its original bytes. The primary
  checkout's original plan was restored after moving this work into isolation;
  concurrent README/art changes were left intact and are excluded from this branch.
- No application, browser or physical-device tests were run for this docs-only
  change. Final staged whitespace, file-scope and remote parity checks precede
  handoff; implementation acceptance remains entirely outstanding.

## Estimate for my implementation

**6–9 hours of elapsed working time**, assuming a usable, otherwise idle browser
environment and no new base regression: roughly 2–3 hours for domain/content/save
work and focused tests, 1–1.5 hours for UI and legal progression journeys, 2–3 hours
for full verification and focused repairs, and 0.5–1.5 hours for final evidence,
documentation and PR preparation. This estimates my work after implementation
is requested; it is not a human-engineer estimate or a guaranteed deadline.

The largest uncertainties are a legal Ranger level-3 journey, changed save
admission/old-format recovery, WebKit media availability and serial runner queues.
Allow **10–12 hours** if those expose substantive repairs. Queue/offline waiting,
review and deployment time are excluded. No new benchmark was run for this plan.
