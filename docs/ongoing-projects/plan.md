# Issue #259: Isolate testing routes from saved games

Date: 2026-11-03 (Asia/Jerusalem). Status: root-entry PR published; transient-owner/UI/coverage chunk in progress.

### Current qualification checkpoint

Main advanced to `3333281` by merging #273 while final local checks were running.
The entry foundation now incorporates it in `6a886b8` (21 route/menu units pass).
The dependent branch integrates that foundation, retaining both mobile controls and
the save capability; four overlapping import/config/documentation conflicts were
resolved, and both TypeScript scopes pass. #276's literal merge tree with current
main is clean; its focused one-line change needs no merge commit. #274 remains unmerged.

**New integration work is required before completion.** The new radial browser suite
contained a direct-route Continue assumption; it now retains preference assertions while
checking a fresh testing battle. New radial cases prove all three testing game owners
preserve primary/backup/handoff bytes through actions, restart, reload and actual Back,
and a menu-launched radial battle preserves its accepted state through Continue.
These cases and the preference repair pass **9/9 Chromium** (`run-BD716F`, `run-N7pPI6`)
and **4/4 WebKit** (`run-jV4sa0`), one worker/zero retries. Current full units pass
**1,148/1,148**, both TypeScript scopes pass, both root/prefix build integrations pass,
and all **28** batch/selection contracts pass. Logs are `tmp/issue-259/mobile-integration-*`.

Literal-main capture `selection-main-3333281.json` and current capture
`selection-mobile-integration.json` reconcile **1,665 retained**, **102 mapped** and
**75 added** stage/profile IDs in the refreshed [ledger](../qa/issue-259/coverage-map.json).
The [prior ledger](../qa/issue-259/coverage-map-pre-mobile.json) is preserved unchanged.
Current routine discovery: Chromium **1,006**, fixtures **93**, placement **6**, WebKit
acceptance **182**, exploration **120**, health **25**, telemetry **36 per mode**,
assets **78 per mode**; dedicated encounters/items/abilities/smoke are **24/9/60/2**.
The nine-batch partition, 23 approved reductions and both nine-case extended matrices
remain intact. No original execution was silently removed.

Remaining integration qualification runs locally on frozen inputs. It covers both control
skins and all game owners: menu/safety, root/prefix isolation, radial interactions,
legal run outcomes/reloads, dungeon/lifecycle and both extended matrices, dev fixtures,
proof input, health, configured telemetry, asset audio/collector modes and a fresh
performance capture. Reuse is limited by dependency comparison: save codecs, domain,
content, storage owners, recovery UI, menu-return guards and their pure fixtures are
unchanged from the earlier tested candidate. The merged `BattleScene.begin` input/render
implementation is identical to main; the feature changes only admission/session setup.
Unchanged map/placement and noninteractive visual/resource checks retain their prior
evidence. Preserve all original failures and incomplete runs; do not wait for CI.
The task-specific runner is `tmp/issue-259/current-qualification.mjs`. It retains
source and build identities, exact per-stage discovery, logs and incremental outcomes
under `tmp/issue-259/current-qualification/`. It guards builds with the completed full
unit/content checks and fresh typecheck, records performance before other browser
work, serializes every browser stage at one worker/zero retries, preserves failures,
and runs both complete extended matrices after restoring the root bundle.

Integration checkpoint at frozen `7e6d709`: clean/consistent source and build pass
all **18** performance captures; menus pass **84/84 Chromium + 56/56 WebKit**;
root Rail isolation passes **15/15 Chromium**. Full radial Chromium retains **100
passed, 3 native-touch-only desktop skips, 2 failed**; WebKit retains **54 passed,
6 Chromium-CDP-only skips**. Both failures are the same test's setup: synthetic mouse
Plan activation after a touch gesture. Literal `3333281` reproduces both failures
(`main-radial-resize-test.log`, baseline receipt `run-OU8YrY`). The local sequence was
stopped during WebKit isolation for a single-browser-job baseline comparison; that
unfinished stage remains incomplete in `current-qualification/interrupted.json`.

Independent [PR #278](https://github.com/luminari-gurus/tactics-guru-v2/pull/278),
`16cd804`, uses a native tap on touch profiles and retains every assertion/limit.
It passes **3/3 Chromium + 2/2 WebKit** on literal-main application inputs, and the
mirrored feature commit `ab49cba` passes the same **5/5** against the unchanged served
integration bundle. Production code is unchanged. These scoped passes repair the two
failed case/profile obligations; the original radial run remains failed. Main-baseline
worktree now hosts this test-fix branch; do not treat its head as literal `3333281`.

Resume only uncompleted local stages with `current-qualification-resume.mjs`, keeping
the original results immutable and recording reused successful stages separately.
The root bundle is still the exact clean `7e6d709` build. The only relevant edit since
that run is the isolated radial test body; other case inputs and runtime code are
unchanged. Do not rerun passing matrices or label the original failed run clean.

Latest bounded checkpoint: root WebKit isolation **10/10** and legal run/outcome,
reward/reload/stale-cache checks **9/9 Chromium + 4/4 WebKit** pass at `ddfb19f`.
Dungeon Chromium retains **9 passes / 3 failures**: its read-only startup check still
expected empty local storage although the merged Rail fixture deliberately writes
the combat-controls preference. Literal main reproduces `Expected 0 / Received 1`
(`main-dungeon-readonly-before.log`). The repaired check compares the exact fixture
baseline, rejecting every unexpected entry. After that fix, one baseline WebKit run
exposed the already-recorded 400-step random-layout navigator cycle; this non-entropy
workload now uses the existing legal seed, with separate random-layout coverage retained.
All **3 Chromium + 3 WebKit** repaired cases pass on the feature inputs, and both type
scopes pass. This directly blocking consumer repair is committed in #277 as `9a695dc`.
The unfinished WebKit dungeon stage and both earlier failures remain recorded.

Final local work is limited to the remaining save-isolation consumers: the other
WebKit dungeon cases, affected lifecycle and dev fixtures, audio/collector behavior
at both bases/modes, prefix isolation and the two explicitly required extended matrices.
Completed menus, root isolation, legal run, radial and performance evidence is reused.
Unchanged map/placement, noninteractive visual/resource, health and telemetry contracts
retain their recorded evidence; this is not a new qualification of the parent mobile
controls feature. The preliminary extra proof-input/health/telemetry reruns are unnecessary
for the #259 delta and will not expand this task. No additional test-repair workstream
is opened. The existing requirement/coverage ledger remains the completion boundary.
The direct local command sequence records incremental outcomes in
`tmp/issue-259/remaining-local-results.json`; no CI wait is required.

The remaining WebKit dungeon subset passes **9/9**; with the separately repaired
startup case, all 12 selected dungeon obligations are covered. Lifecycle passes
**6/6 Chromium + 6/6 WebKit**. The dev-fixture stage retains **80 passes / 13 failures**:
one initial `page.goto` load timeout, plus 12 executions of two ability-test assertions
that still expected `{}` instead of the Rail fixture preference. The ability checks
now use the same exact preference-only baseline as the dungeon check, retaining the
no-unexpected-entry guarantee and all state/replay/action assertions. Typecheck passes.
Only the affected 12 cases and the one desktop navigation case need a focused follow-up
after the active sequence. No production startup cause is claimed fixed, and the
original failed fixture report remains intact (`run-tnMhYj`). This test-only edit does
not affect the active asset, prefix, lifecycle or extended consumers; no sequence is
restarted and no timeout is raised.

The prior local sequence completed 11 WebKit repairs and all 9 Chromium extended
journeys. Its old-source WebKit extended stage was deliberately interrupted before
integration; there is no final JSON for that stage. The exact owned process tree was
stopped and `local-final-interrupted.json` records why. Process `49853` and all of its
browser/server children have exited. Reopen affected task gates until the merged
consumer audit and local qualification are complete.

### Prior qualification evidence (before the mobile-controls merge)

**Caller execution update:** do not wait for CI; run needed checks locally. Remaining
acceptance now uses the matching locked local browsers and a fresh ordinary root build,
with one worker and zero retries. This changes execution capacity, not test/profile
coverage or any substantive acceptance gate. Existing CI jobs continue in the background
and are not dependencies for finishing this work; observation cell `g15:297` was stopped.

Local final qualification is running through ignored
`tmp/issue-259/local-final-qualification.ps1` (process session `49853`). It records
source identity, browser preflight, a fresh build and bundle hashes, then runs the
remaining WebKit acceptance repairs (2), WebKit exploration repairs (9), Chromium
extended journeys (9) and WebKit extended journeys (9). Independent stages retain
their own results/failures in `tmp/issue-259/local-final-*`; no passing Chromium repair
case or unaffected full-regression stage is repeated. Original failed/incomplete runs
remain retained. Inspect these local reports before closing either remaining task.
The matching Chromium/WebKit preflight passes (`run-6pQVGG`); content validation,
both TypeScript scopes and the fresh root build pass. The served build embeds
`75fe65a`, `dirty: true`: build-time content validation normalized two generated
snapshot files' line endings, with zero logical diff. Those task-generated changes
were restored; no production/test logic changed. Actual bundle hashes are retained
in `local-final-build.json`, and functional qualification uses those served bytes.
Local WebKit repairs are **11/11 passing**: acceptance **2/2** (`run-bUDRuz`) and
exploration **9/9** (`run-iW6Y4o`). Combined with Chromium `run-OWih7J` **12/12**,
all 23 scoped repair executions pass. The independent report audit verifies exact
selected IDs, one worker, zero retries/skips/flakes/global errors, unchanged current
input hash and unchanged served bundle bytes (`local-final-audit.json`). Extended
Chromium now passes **9/9** (`run-7PH40S`, 22.9 minutes), with exact selected IDs,
zero skips/flakes/retries/global errors and unchanged served bytes verified by the
same audit. **Only the 9 WebKit extended journeys remain pending**; the local process
is executing them without a CI wait.

Implementation is published in #275/#277; frozen runtime inputs are `4de79c1`.
Final test/collector-description inputs are `30dc8ac`; cleanup `e168f43` changes only
documentation and removes the temporary trigger. Subsequent documentation commits
may advance the branch head. The scoped repairs below are being validated separately.
Independent Windows contract repair #276 is mirrored as a separate dependency commit.

OpenSpec tasks 1–3 are complete (7/9 total): the consumer/selection audit covers all ordinary,
dev, WebKit, telemetry, asset and extended owners. The current relevant-input hash
matches the coverage ledger, all referenced files exist, and 1,469 retained,
102 mapped and 65 added stage/profile identities are accounted for. Final aggregate
runtime/source acceptance and publication cleanup remain open under tasks 4.1/4.2.

Additional current-source proof: main-menu **84/84 Chromium** (`run-OCCQCn`) and
**56/56 WebKit** (`run-5GHKRG`) pass, including native input, new-game revalidation,
failed-write recovery and the moved item cases. Old-format recovery/export passes
**9/9 Chromium** (`run-ge51Jl`) and **9/9 WebKit** (`run-JHoTSg`) for all three save
families. Focused desktop legal run/reward/replay, saved floor travel/reload/backtracking,
cached-run stale writer, presentation restart and visibility interruption pass **5/5**
(`run-on4ll5`). These preview runs reuse the last ordinary root bundle: `src`, `public`,
Vite/package inputs and menu/helper files are unchanged from its `aca9709` inputs;
later implementation changes are asset-fixture setup and documentation.

Documentation audit checked 109 local links across 13 changed Markdown files with
no missing targets. The preserved #263 plan still hashes to
`28a7610d304e3db8604c144f9a691e01a496d2a0002f5b416e9d286fc92fd104`.
Collector functional cold/warm proof includes the passing traced dev case; that trace
is not used for performance/budget acceptance. Original asset-matrix failures remain
retained, and qualified aggregate/extended/performance gates are still required.

Routine self-hosted [run 41647380978](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41647380978) completed **failed** at frozen `04cf227` on
`unraid-tactics-01`. Background supplemental [run 41657053991](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41657053991), qualification
branch `a3799e3`, asserts source equivalence to `4de79c1` except its temporary
workflow. It covers changed telemetry, repaired audio workloads/collector controls,
root/prefix isolation/history and both extended engines. Earlier queued runs
41647577545/41648868922/41651717195 were cancelled before execution.

Full-run triage retains all 12 unexpected executions: Chromium 885 passed, 6 owning-mode
skips, 7 failed; WebKit acceptance 118 passed, 2 failed; root dev assets 73 passed,
3 production-only skips, 2 failed; prefix dev assets 74 passed, 3 skips, 1 failed.
WebKit exploration passes 120/120. All other routine stages, including 18 untraced
performance samples, completed successfully. Reports were recovered with ZIP entry CRC
verification under `verification-receipts/ci/41647380978/reports`; the complete archive
also passes SHA-256 verification. Artifact `13251420700` is 583,252,554 bytes, digest
`df5b926cfbfcdaf7b41e81dd41fe11e891ced5c98d94d53ac1508b4a439c43b4`.

Scoped repairs published as `30dc8ac`: the run defeat regression still expected saved Continue
after following an intentional testing link. It now checks unchanged primary/backup
bytes through direct battle/run entries and returns through Main menu → Continue for
exact saved state. The new transient dungeon case must tolerate a not-yet-mounted
battle session while polling readiness on touch devices. Two save/input dungeon cases
also reached the existing random-layout navigator cycle; pin only those workloads to
the established legal seed fixture, retaining independent fresh-layout proof. No
production route/domain behavior, assertions, retry count or timeout is relaxed.
The collector's stale descriptive `warmStorage` metadata is corrected to match its
already-tested preservation behavior; historical captures remain unmodified.
All four repaired cases now pass across the three Chromium profiles: **12/12**,
zero skips/flakes/retries (`run-OWih7J`, `tmp/issue-259/ci-repairs-chromium.log`).
Both TypeScript scopes and strict OpenSpec validation pass. The unchanged runtime
bundle is reused; only these test bodies and collector description changed.
The runtime report/selection audit matches all **1,550** full-run browser stage IDs
exactly (`tmp/issue-259/full-ci-audit.json`). Its 12 skips are the six preview placement
executions (covered in dev) and six dev-only production-hint executions (covered in
preview); none is a missing owning-mode obligation. Qualified scoped repair
[run 41680229366](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41680229366)
is queued behind the current supplemental/extended job on the same exclusive lock.
Its verification-only branch `branch/issue-259-repair-qualification` at `b9366a1`
differs from candidate `30dc8ac` only by its workflow, asserted before execution.
It builds the exact candidate and runs Chromium 12, WebKit acceptance 2 and WebKit
exploration 9 repaired cases (23 total), one worker/zero retries, retaining independent
stage failures and source/browser/results artifacts. This workflow is outside #277.
The temporary `.github/full-verify-request` is removed. Its deletion otherwise triggers
another full capture; this docs/trigger-only cleanup uses `[skip ci]` to avoid that
duplicate run. Source-bound qualification still runs at the immutable candidates above,
and the original full failure remains retained. No application/test/config input changes
with this cleanup, and neither remaining task is marked complete yet.

Root and prefix isolation/history are **50/50 passing** across Chromium/WebKit;
configured production/development telemetry are **72/72 passing**. The local four-mode
asset matrix is complete but not clean: root preview 78 passed; root dev 74 passed,
3 production-only skips, 1 initial navigation timeout; prefix preview 77 passed,
1 random-layout navigator cycle; prefix dev 74 passed, 3 production-only skips,
1 random-layout navigator cycle. Logs/results are in `tmp/issue-259/assets-*` and
`assets-matrix-results.json`; receipts are `run-MuzPXV`, `run-fDSIuw`, `run-Ws4PGN`,
`run-rEFYv8` respectively. No failure was erased or retried automatically.

The two random-layout failures reached the existing test navigator's 400-step limit.
Only the asset audio workload is pinned to legal seed 28 in
`tests/public-asset-base.spec.ts`; its purpose is audio/base delivery, while random
new-layout proof remains separate. Both backends/all profiles/four modes pass
`-g 'dungeon audio loads'` (24 cases): `run-txgI9W`, `run-pZttSi`, `run-etW6zc`,
`run-2dUq2y`, 6/6 each, zero skips/flakes/retries. All four asset discoveries still
select the same 78 IDs/profiles. This is scoped repair evidence; the original failed
full-file mode runs remain failed. No draft #274 code was cherry-picked.
The first dev navigation was traced separately: the unchanged collector case passed
in 14.3s; the trace records a 6.5s dev-server wait for preferences CSS before Phaser
startup. It does not establish the timeout's cause or a product fix. Diagnostic trace
is `verification-receipts/issue-259-dev-load-diagnostic`; it is not performance evidence.

Supplemental job steps through both root/prefix isolation matrices, both configured
telemetry modes, all audio/collector modes and restored-root build have passed.
The same live job `126058161857` is executing Chromium extended journeys; WebKit
extended journeys follow. Scoped repair run `41680229366` remains queued behind it.
No local browser/server process remains active, and no qualification run was restarted.
The bounded observation cell `g15:293` ended normally after 15 minutes; that is an
observation deadline, not a stopped CI run. Poll these same run IDs before acting.

Current source audit traces every #259 criterion to the implementation and its proof:

- **Saved games unchanged after testing:** the five storage-condition journeys in
  [battle-persistence.spec.ts](../../tests/battle-persistence.spec.ts) compare exact
  primary/backup/handoff bytes through all seven entry families and real actions,
  restart, reload, cleanup and history, then return to menu Continue. The repaired
  run defeat journey also checks exact saved state after testing-link navigation.
- **Testing always fresh:** [routes.ts](../../src/app/routes.ts) makes direct paths
  and supported diagnostics transient regardless of forged intents; standalone
  testing uses a fresh `BattleSession`, and run/dungeon hosts construct fresh memory
  state. Existing isolation, reload/restart and random-new-layout cases prove these
  boundaries across root/prefix, engines and profiles.
- **No saved-game access:** hosts pass absent storage before provider construction;
  owner save/inspect/export/recovery paths guard that absence. Browser spies cover
  all progress keys and the menu handoff; owner units fail on provider acquisition.
  Non-game preferences keep their existing separate behavior.
- **Persistence regression coverage retained under menu ownership:** saved cases now
  use root game entries, the moved item/ability obligations are reconciled in the
  [coverage ledger](../qa/issue-259/coverage-map.json), and all 1,550 full-run browser
  execution IDs match discovery. Menu negative recovery/new-game, replay, lifecycle,
  BFCache and old-format raw export evidence is retained above.

This source audit found no further production change. Final acceptance still requires
the remaining repaired and extended local executions above, with source/build/browser
identities and failures reconciled before closing tasks 4.1/4.2. Pending CI is no longer
a gate under the caller's execution update.
`origin/main` remains `d8692f9`; #273/#274 remain unmerged independent drafts. The
ignored local scripts and receipts support continuation. `%TEMP%/tactics-259-baseline`
hosts the temporary extended-qualification branch; `%TEMP%/tactics-259-repairs` hosts
the repair-qualification branch. Neither workflow belongs in an implementation PR.

- Issue: [#259](https://github.com/luminari-gurus/tactics-guru-v2/issues/259).
- Owner: `moshehbenavraham`; [pickup comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/259#issuecomment-6603160055).
- Entry branch / PR: [`work/issue-259-testing-route-save-isolation`](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-259-testing-route-save-isolation), [#275](https://github.com/luminari-gurus/tactics-guru-v2/pull/275), pushed `ffbdde0`.
- Active dependent branch: `branch/issue-259-transient-gameplay`, implementation `6c8280f`, [PR #277](https://github.com/luminari-gurus/tactics-guru-v2/pull/277) against #275. Verification request `04cf227` adds only a temporary trigger.
- Base: current `origin/main`, `d8692f94cb652eb6fbb6f4fa2a9330ad57c3d4dd`.
- Planning method: [ablation](../../.agents/skills/ablation/SKILL.md), with [OpenSpec proposal](../../openspec/changes/issue-259-testing-route-save-isolation/proposal.md), [design](../../openspec/changes/issue-259-testing-route-save-isolation/design.md), [contract](../../openspec/changes/issue-259-testing-route-save-isolation/specs/game-save-scope/spec.md), and [implementation tasks](../../openspec/changes/issue-259-testing-route-save-isolation/tasks.md).
- Previous plan: [#263 archive](issue-263-webkit-reload-boot-plan.md), preserved byte-for-byte; SHA-256 `28a7610d304e3db8604c144f9a691e01a496d2a0002f5b416e9d286fc92fd104`.

## Selection and backlog review

Reviewed all **34 open issues**, their bodies/labels/assignees, relevant comments, all **four open PRs**, remote branches, native issue dependencies/branch associations, and local OpenSpec work. REST pagination had no next page; GraphQL independently reported `totalCount: 34` and `hasNextPage: false`. Selection was not restricted to `ready for work`. GitHub Projects/draft work-items could not be audited: the credential lacks `read:project`. No claim is made about inaccessible project-only work.

**Why #259 wins:** it has concrete acceptance criteria, no competing branch/PR or assignee at pickup, and an already merged prerequisite. #153 is closed; menu PR #256 merged as `78a3f75`, #269's save safeguards as `1f1c37e`, and randomized new-dungeon layouts #272 as `d8692f9`. All are in the selected base. It protects existing player progress and settles the route/storage boundary explicitly referenced by #270 before records instrumentation is added. This has greater immediate enabling value than independent convenience features and less diagnosis uncertainty than intermittent startup investigations.

The full backlog was accounted for as follows; these are selection dispositions, not changes to other owners' scope or labels:

- **#259 — selected.** Promoted from unlabeled readiness to exact `ready for work`, assigned to the authenticated caller, and claimed by comment after a fresh state check.
- **#176, #270 — strong subsequent records candidates.** Overlapping storage/UI and stats work should be coordinated. #270 explicitly requires isolation of dedicated routes; records, active-time policy, retention and ranking are outside this plan.
- **#179, #181 — independent lower-priority presentation/export candidates.** Useful bounded work, with less enabling value than the persistence boundary; their remaining export-history/tutorial/pace choices still need planning.
- **#172 — existing ready candidate.** Combat healing/revival remains useful but adds action/supply/content policy and cross-mode item behavior; it does not unblock the selected route boundary.
- **#184 — existing ready candidate.** Generator selection, deterministic bounded execution, compatibility and optional rot.js adoption need evaluation before durable-floor integration. Its larger design uncertainty lowers its rank here.
- **#167, #168, #169, #171 — mechanics candidates requiring coordinated consumer slices.** #161 is owned and explicitly retains the remaining push/charge/typed-damage/hazard contracts. Its open parent/foundation label alone is not treated as a blocker; the actual missing contracts and shared ownership require coordination.
- **#170, #173, #174, #175 — broader content/equipment/reward/exploration work.** Biome packs must be split; acquisition, currency/upgrades and trap contracts remain interdependent. They are not a single bounded next implementation.
- **#178, #180, #182 — optional lower-priority rotation/music/editor adaptations.** Each requires selecting its intended behavior or delivery scope first.
- **#185, #261, #262 — explicit unresolved progression/visibility/visual choices.** Preserve these as desired work without silently selecting formulas, sight rules, rendering treatment or dependencies.
- **#85, #128, #161, #162 — already assigned to `dubstylee`.** Release operation/acceptance, analytics and remaining shared ability/effect acceptance are not reclaimed. The #161/#162 comments distinguish merged consumer slices from the still-open umbrella criteria.
- **#199, #200, #208, #219 — DevOps epic/owned acceptance work.** #200 already has implemented timing tooling; #208 retains its separate capacity blocker; #219 records implementation/integration rather than unclaimed fresh coding. No readiness is inferred from stale epic checklist rows.
- **#254 — assigned and implemented in merged #260.** Its still-open tracker and remaining remote branches are not a new chase/block task; local OpenSpec shows 7/7 tasks complete.
- **#257, #258, #268 — valid unresolved diagnostic/bug candidates.** Historical loading failures and the existing #268 investigation branch require source-bound causal evidence. The merged #263 runtime repair does not prove every separate symptom resolved. Do not combine or close them based on visual similarity or passing repetitions.
- **#271 — assigned, active draft PR #273.** Design draft #237 is reference work; #273 is not available for duplicate implementation.

The other open PRs are #274 (dungeon entropy fixtures, potentially overlapping test helpers) and #12 (unselected deployment alternative). Neither is a prerequisite to cherry-pick. Recheck #273/#274 and current main before implementation; integrate merged changes normally. Local OpenSpec's incomplete #153 checklist is historical planning state, not a second unclaimed menu feature.

## Outcome and non-goals

**Outcome:** a menu-launched saved battle, run or dungeon remains unchanged after any testing-route visit or play. Direct testing entries always start fresh and never inspect, hydrate, write, remove or clear saved progress. Main-menu save/recovery behavior remains available with its current protections.

**Non-goals:** no Hall of Records or stats implementation (#176/#270), save migration/key changes, combat or enemy-policy changes, new renderer/router/storage framework, dependency adoption, production operation, CI-capacity change, or unrelated backlog cleanup. Existing privacy/audio preferences are separate from saved-game state and retain their current behavior.

## Observed owners and affected files

- `src/main.ts`, `src/app/routes.ts`, `src/ui/mainMenu.ts`: route dispatch, one-shot entry requests and menu URLs. Today menu play navigates to the same paths as testing.
- `src/app/startBattleApp.ts`, `src/phaser/start.ts`, `src/phaser/BattleScene.ts`, `src/ui/persistence.ts`, `src/app/BattlePersistence.ts`: standalone startup currently installs durable persistence and recovery controls.
- `src/app/startRunApp.ts`, `src/app/RunItemSession.ts`, `src/app/startDungeonApp.ts`, `src/app/DungeonSession.ts`, `src/ui/dungeon.ts`, `src/ui/menuReturn.ts`: unconditional storage construction, accepted-state writes, save UI and departure behavior. `src/app/menuSaves.ts` and existing `src/persistence/*Storage.ts` remain the durable owners, reused without format changes.
- `vite.config.ts`: emitted preload script has its own path classifier; it must recognize persistent root modes while preserving lightweight menu boot and existing diagnostics.
- Existing route/session/storage units; `tests/main-menu.spec.ts`, `tests/battle-persistence.spec.ts`, `tests/run-progression.spec.ts`, `tests/dungeon*.spec.ts`, `tests/helpers/menuFixtures.ts`, `tests/helpers/dungeonTraversal.ts`, `tests/helpers/run*`, and their actual consumers. Save assumptions also occur in ability, effects, battle/audio, asset and telemetry fixtures; inspect each call site before choosing its new entry scope.
- `scripts/measure-fit-controls.ts`, `tests/public-asset-base.spec.ts`: collector warm reload currently removes game saves; transient testing must instead reset by reload while preserving sentinels and the HTTP cache.
- `playwright*.config.ts`, `scripts/verification-selection.mjs` and selection contracts only where moved/new cases require changes; `docs/main-menu.md`, `docs/dungeon.md`, persistence documentation and `docs/verification-policy.md` for changed route/coverage guidance.

This is an ownership map, not a requirement to edit every listed file. Retain a file change only when a traced behavior or proof needs it.

## Implementation sequence

1. **Establish the entry capability.** Resolve route and persistence scope together. Bare base renders the menu. Menu games use closed root URLs such as `/?game=dungeon&entry=new`; consuming `entry` retains `game` so reload stays in the persistent flow. Add a menu-game URL builder; retain direct testing URL construction. Explicit root `scene=battle|proof|content-smoke` remains diagnostic/transient, including when parameters conflict. Direct paths cannot opt into persistence with `entry` or `game`. Cover `/` and `/prototype/`, trailing slash, unknown and conflicting values. Align emitted preloads and update route documentation with this change.
2. **Keep one gameplay implementation with optional persistence.** Start direct standalone battle through the existing pure `BattleSession` without constructing `BattlePersistence` or save controls. Run/dungeon owners accept persistence explicitly absent; accepted domain transitions still execute, but no save provider, serialization, hydration, review, clear or write runs. For transient dungeon travel, publish the legal candidate without a durable commit; persistent play retains save-before-publish. Preserve restart seed policy, randomized new-dungeon layouts, RNG/replay and stale-callback cleanup. Add focused owner tests alongside this change.
3. **Scope UI and new-game safeguards.** Persistent root play retains Continue/recovery, backup/export, stale review, failed-write recovery and unsaved-departure safeguards. Preserve all #269 empty/changed/backup-only new-game checks inside that flow. Transient play has fresh controls, normal restart and an honest resets-on-reload indication, with no saved-game prompts or menu-review handoff access. Retain inspect/log/sound and Main menu navigation. Add menu/transient browser cases and update the relevant mode docs with this change.
4. **Move persistence proof to menu play.** Remove direct testing-route persistence regression expectations. Rehome their meaningful assertions to persistent menu journeys using current helpers; do not simply delete corruption, backup, reload, terminal, item/reward, floor, stale-write, BFCache or replay coverage. Keep non-save gameplay cases on testing routes. Add save-access spies and exact primary/backup sentinels for every direct entry family; distinguish application accesses from harness setup/assertion reads. Cover missing/valid/corrupt/backup-only/unavailable storage and ignored entry parameters.
5. **Reconcile shared consumers and qualify.** Update affected authored/dev/ability/item fixtures, WebKit acceptance/exploration, extended journeys, telemetry and root/prefix assets. Remove collector save-clearing for transient captures and prove its cold/warm workload still works. Capture before/after selected IDs, map moved/removed cases to retained obligations, and update only necessary selectors/contracts. Run the final qualified full matrix and affected legal extended journeys on frozen source/build inputs. Publish an implementation PR with source-bound results and limitations; a closing reference belongs only after every issue criterion passes.

## Ablation decisions

- **Keep** the root entry capability: a one-shot `entry` flag is consumed and cannot retain persistent identity through reload; allowing durable play on direct paths violates #259.
- **Simplify** to full-page root-query navigation and current hosts. An SPA router, session-wide eligibility marker, alternate save namespace and second gameplay engine solve no requirement here.
- **Keep** an explicit transient mode in the session owners. The current dungeon `playUnsaved()` path intentionally blocks stairs; using it would leave testing incomplete. A fake-success store would misrepresent durability and still exercise save machinery.
- **Keep** existing save safety and move its tests: isolation does not authorize dropping main-menu corruption, recovery, backup or lifecycle acceptance.
- **Drop** speculative migrations, generic storage abstractions, records accumulators, broad test-framework refactors, new dependencies and incidental issue closeouts. Existing formats and test tools meet the requested boundary.
- **Keep** full final regression because the change crosses shared save admission, entry/lifecycle behavior and many fixture consumers. Use focused checks during iteration; do not repeatedly rerun green full matrices for prose changes.

## Proof and acceptance mapping

1. **Menu save unchanged after testing:** create/continue real menu progress, retain primary/backup bytes for all three families and unrelated sentinels, exercise every testing entry, then return to menu Continue and compare exact state. Include actions, restart, reload, visibility and history lifecycle boundaries.
2. **Testing always fresh:** with each storage condition, assert no Continue/recovery and no hydration; a reload/restart resets progress. Preserve the supported seed/random-layout policy rather than requiring every new random dungeon to have identical geometry. Verify legal transient battle/run play and dungeon descent/ascent.
3. **No saved-state access:** instrument the browser storage accessor/method boundaries for progress keys and save-review handoffs before boot; fail on any application access in direct routes, explicit scene diagnostics and forged entry combinations. Pure owner tests use a provider that fails on acquisition. Non-game preferences are checked separately rather than silently forbidden.
4. **Persistence regressions belong to menu flow:** preserve meaningful negative/continuation assertions under menu entries, remove old direct-route persistence expectations, run menu save tests and record before/after test/coverage mapping. Preserve menu new-game safeguards from #269 and existing saved floor/seed identities from #272.

Implementation iteration commands (discover browser selections with `--list` first):

```sh
npm run test:unit -- tests/unit/routes.test.ts tests/unit/menuSaves.test.ts tests/unit/battlePersistence.test.ts tests/unit/RunItemSession.test.ts tests/unit/dungeon.test.ts tests/unit/exploration.test.ts
npm run build
npx --no-install playwright test tests/main-menu.spec.ts tests/battle-persistence.spec.ts tests/run-progression.spec.ts tests/dungeon.spec.ts tests/dungeon-lifecycle.spec.ts --list
npx --no-install playwright test tests/main-menu.spec.ts tests/battle-persistence.spec.ts tests/run-progression.spec.ts tests/dungeon.spec.ts tests/dungeon-lifecycle.spec.ts --retries=0
npx --no-install playwright test -c playwright.device-acceptance.config.ts --list
npx --no-install playwright test -c playwright.exploration.config.ts --list
npm run test:build
npm run verify:full -- --list
```

Extend the existing owner tests for the changed boundary. Build includes content validation and both TypeScript scopes. Apply the existing discovery comparison contracts to selection changes; new/removed IDs need explicit mappings, not an unchanged-count claim.

**Final tier: full regression**, under [verification-policy.md](../verification-policy.md), plus affected `npm run test:extended` and `npm run test:extended:webkit` legal progression journeys. Account for all routine stages, dev fixtures, placement, both WebKit matrices, health bars, configured production/development telemetry and root/prefix asset modes. Run prefix/preview/dev modes using the policy's commands; PowerShell must use environment-variable assignments rather than pasted POSIX prefixes. Preserve exact source/build/browser/config identities, one worker, zero blanket retries, artifacts and all failures/skips/incomplete outcomes. Reuse only unchanged relevant inputs with provenance; a focused pass cannot erase an earlier failed full run.

Browser CI stays on qualified `[self-hosted, tactics-browser]` capacity with the `tactics-browser-exclusive` lock and no automatic hosted fallback. Playwright desktop and mobile portrait/landscape emulation satisfy acceptance under AGENTS.md. The local declared physical capability is Android; physical testing is neither required nor claimed. Queue/offline capacity is a scheduling risk, not a reason to weaken acceptance.

## Planning validation and publication (historical, `41eda1d`)

The planning commit was documentation-only. Its checks covered strict OpenSpec validation, local links/paths, command/config ownership, archive bytes, `git diff --check`, task-only scope, issue ownership/readiness/comment, native Development branch association, and local/remote parity. No app build, runtime fix, gameplay test or implementation acceptance was claimed by that planning publication.

Planning checks completed against unchanged application/test/config inputs from the base above: strict OpenSpec validation passes; the existing full-stage discovery lists 19 stages. Direct installed Playwright CLI discovery selects 237 cases in the five focused files, 100 WebKit acceptance cases in five files, and 105 WebKit exploration cases in three files. These are baseline selection checks using Playwright 1.64.1 and Node 24.22.1 on Windows, not executed browser tests or final implementation counts. Local npm/openspec shims were absent from PATH; planning used the cached OpenSpec 1.14.1 CLI and installed Playwright CLI through Node without altering application dependencies.

The previous plan is preserved at the archive path above. Related #176/#270 are context only and are not assigned or given closing links.

## Implementation handoff (2026-11-03)

- Authorization: caller approved implementation, autonomous repairs, commits, pushes and focused PRs. No merge/deployment requested.
- Main remains `d8692f9`; #273 and #274 were rechecked and remain independent drafts. Neither was cherry-picked.
- Delivery split: publish the root entry/menu/preload chunk first, then stack the transient-owner/UI/coverage change. The first chunk enables durable root URLs while legacy direct owners still exist; it must not close #259 or claim isolation. Final full/extended qualification applies to the completed stack.
- Implemented one self-contained `resolveAppEntry` policy shared by application routing and the emitted preloader, plus `menuGameHref`. Menu actions now use root game URLs. Existing destination safeguards and save formats remain unchanged.
- Extended route units cover root/prefix, trailing slash, supported/unknown/duplicate selectors, diagnostic precedence, forged testing parameters and one-shot intent consumption. Existing menu tests now use persistent root journeys and check reload. Build integration executes the emitted preloader at both bases.
- Baseline selected IDs captured before edits in ignored `tmp/issue-259/selection-before.json` at clean `41eda1d`. After restoring the lockfile, a detached literal `41eda1d` worktree at `%TEMP%/tactics-259-baseline` supplied `selection-before-locked.json`; it uses a junction to the same locked `node_modules`. Stage counts: Chromium 853, fixtures 87, placement 6, WebKit acceptance 100/exploration 105, health 25, telemetry production/development 36 each, asset modes 78 each. Separate encounter/item/ability/smoke configs captured too. Deep comparison with `selection-entry.json` confirms all 15 selections and effective device settings unchanged; no cases were removed or added in this chunk.
- Environment correction: installed Playwright was 1.63.0 despite the lockfile requiring 1.64.1. Initial focused units (21) and build integrations (2) passed on the mismatched install; initial build failed at existing `screen` config types. These are preliminary results, not locked-dependency acceptance. Ran `npm ci` to restore the lockfile (0 audit findings); repeat invalidated checks on 1.64.1. npm itself was absent from PATH, so an isolated temporary npm CLI/shim lives under `%TEMP%/tactics-259-tools`; no app dependency/config change was made for this setup. A first browser preflight failed for missing binaries; installation and preflight must match the restored lockfile.
- Locked-dependency validation: `node node_modules/vitest/vitest.mjs run tests/unit/routes.test.ts tests/unit/menuSaves.test.ts` passed 21 tests; `npm run build` passed 223 content tests, both TypeScript scopes and production build; `npm run test:build` passed both root/prefix builds and emitted-preloader assertions. Browser preflight passed Chromium 156.0.8078.4 (revision 1248) and WebKit 27.2 (2370), Playwright 1.64.1, Node 24.22.1, Windows x64; receipt `verification-receipts/browser-environment/run-BkKGp5/environment.json`. Existing Vite native-config advisory and large Phaser chunk warning remain.
- Browser evidence uses the repository Playwright wrapper, one worker, zero retries, untraced preview builds; no physical device claim. Initial `node scripts/browser-test.mjs tests/main-menu.spec.ts` retained 66 passes/3 failures in `verification-receipts/browser-runs/run-AoDT2L/results.json`: the newly added battle reload check incorrectly compared a pre-enemy fixture against a post-enemy save. Corrected only the three-mode fixture/reload block to seed on menu entry and compare the settled save; `... -g 'Continue resumes'` passed 9/9 in `run-baYPQZ`. The other 60 original Chromium cases are reused unchanged, covering all 69 obligations without claiming a clean rerun of the first suite. `... -c playwright.device-acceptance.config.ts tests/main-menu.spec.ts` passed 46/46 (`run-k4x0PY`). Root menu asset/navigation passed 3/3 (`run-moFba9`). No app bug or acceptance assertion was removed to obtain these passes.
- Prefix validation: `vite build --base=/prototype/` followed by `PLAYWRIGHT_BASE_PATH=/prototype/ node scripts/browser-test.mjs tests/main-menu.spec.ts tests/public-asset-base.spec.ts -g 'Continue resumes|New Game starts immediately|changed dungeon save|stale Continue|menu public artwork'` passed 21/21 (`run-cIbKCZ`). The root bundle was restored afterward. PowerShell supplied the environment assignment; unchanged successful content/type prerequisites were reused for these bundle steps.
- Test/source hashes are recorded in ignored `tmp/issue-259/entry-source.json`; all receipts above are local retained evidence. OpenSpec tasks 1.1/1.2 are complete. Full-regression and extended journeys have not run and remain required for the finished isolation stack.
- Entry PR #275 is open for review, without a closing reference. Runtime/test inputs are the tested inputs above; its final changes after verification are documentation/task tracking only.
- Dependent chunk now resolves `appEntry` once, passes the capability to standalone battle, and supplies `null` storage to transient run/dungeon owners. Testing restart discards only memory; persistent reset/recovery and failed-travel guards remain. Save controls/review handoffs are guarded by storage eligibility. Battle telemetry lifecycle events are retained independently of saves. The collector's warm reload no longer removes game slots.
- Iteration: the existing 132 owner tests passed after introducing optional storage. Two additional transient tests pass (complete legal run/replay/restart and dungeon descent/ascent without storage-factory acquisition). The updated build passes content/type/bundle checks. Initial desktop isolation journey passes 5/5 (`verification-receipts/browser-runs/run-3nWegI/results.json`), each exercising seven direct/diagnostic entry families with forged parameters, actions, restart, synthetic visibility/pagehide cleanup and reload against exact primary/backup/handoff sentinels. These are iteration results, not final acceptance; actual history/BFCache and full engine/device coverage remain required.
- Save cases now use root `game` entries across battle/run/dungeon, effects, audio, health bars, procedural grids, lifecycle/BFCache, telemetry and extended journeys. Item fixture durability/recovery moved into five real menu-run cases; direct item/ability fixtures now keep only memory and reset on reload. Learned-ability save proof remains in the menu-owned extended Mage/Ranger/Fighter journeys, with a new menu dungeon XP 0/60/180/600 exact caster/active-boundary corpus. Fictional `zz_*` abilities retain immediate command/replay proof and have no production save contract.
- The transient legal dungeon browser case passed a complete first floor, descent and return (`run-KBzO8y`, desktop). Its first attempt (`run-DCzA7w`) failed after 400 steps chasing one specific moving enemy; using the existing nearest-encounter traversal and Fighter seed-28 policy resolved the test-helper misuse. No domain movement rule or timeout was relaxed. The four menu caster cases pass (`run-H52nis`). Four moved item cases pass in `run-60uXcb`; the fifth initially expected the fixture's null-provider word `unavailable` for an actual denied browser getter. It correctly reports `Storage security`; its corrected exact classification passes in `run-oTBoS7`.
- Dev fixture iteration `run-yTSHGQ` retained 16 passes/1 first-navigation timeout. Matched focused diagnostic runs of the same original picker case passed at parent `ffbdde0` (21.2s, `%TEMP%/tactics-259-baseline/verification-receipts/browser-runs/run-ldxrNV`) and current source (19.1s, `run-6BW9jS`). Neither reproduces that timeout; its cause is not claimed fixed or attributed to this change. Earlier mixed dev/root-item iteration `run-XLhGAx` was interrupted after startup timeouts and a host-specific recovery-summary assertion; error contexts remain, but no final JSON exists and it is incomplete. The final inventory must retain these outcomes and run the actual owning modes.
- Final fast checks: all **1,122 unit tests pass** (`tmp/issue-259/all-units.json`), both build integrations pass (`tmp/issue-259/build-integration.log`), both TypeScript scopes/content/root build pass. The selection tooling run retained **27 passes/1 pre-existing CRLF parser failure** (`tmp/issue-259/selection-contracts.log`); literal `ffbdde0` reproduces that exact failure. Fixed independently in [PR #276](https://github.com/luminari-gurus/tactics-guru-v2/pull/276), commit `aa3cfc7`, mirrored here as `ae7dfc1`. All 23 batch contracts pass on that repair; the formerly failing contract also passes on this branch. Put bundled Git's `usr/bin` on PATH for the existing real POSIX-shell guard assertions on Windows; no assertion/runner/timeout/skip was removed.
- [Coverage ledger](../qa/issue-259/coverage-map.json) accounts for 1,469 unchanged stage/project IDs, 102 moved/renamed prior IDs and 65 added executions across the 15 captures. Current routine counts: Chromium **898**, dev fixtures **75**, placement **6**, WebKit acceptance **120** and exploration **120**, health **25**, telemetry **36 per mode**, assets **78 per mode**. Dedicated encounter/item/ability/smoke configs are **24/9/42/2**. These are discovery counts, not completed runtime results. Existing nine-batch exact partition, all extended profiles and the 23 approved matrix reductions passed discovery contracts; no test file or fixture consumer is left unassigned.
- Final routine regression is running on frozen `04cf227` in [self-hosted run 41647380978](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41647380978). Host disposition, locked setup, both browser preflights and exact full/batch discovery succeeded before the 19-stage execution started. The three historical PR-only workflow gates skip this unrelated branch; those skips are not runtime coverage.
- Required extended journeys are queued behind the same exclusive lock in [run 41647577545](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41647577545), verification-only branch `branch/issue-259-extended-qualification` at `4b372a3`. It differs from candidate `04cf227` only by its temporary workflow; that exact diff is asserted before execution. It builds the same gameplay inputs, runs both existing extended commands with one worker/zero retries, continues independent engines after a failure, and retains source/browser/results artifacts. This workflow is not part of either implementation PR and must not be merged into the product branches.
- Review follow-up found telemetry's separate pathname-only classifier labels `/?game=run` as battle. A real configured production assertion reproduced `Expected run / Received battle` (`run-rmt8Ji`). `startTelemetry` now uses the existing shared route policy and preserves the disabled menu/dungeon taxonomy. The same existing ingestion case asserts the actual `app_entered` route. This is a required consumer repair, with no new event/schema or selection change.
- Telemetry follow-up: 23 route/telemetry units and both root/prefix build integrations pass. Configured production **36/36** (`run-0YbuHD`) and development **36/36** (`run-02Orv4`) pass with no skips/flakes/retries, retaining the synthetic-error sanitization assertions. Both telemetry discoveries still select exactly the prior 36 IDs/effective profiles. Routine run `04cf227` remains valid gameplay evidence but cannot qualify this changed telemetry path; source-bound supplemental qualification is required. No original full-run failure or incomplete result may be erased by supplements.
- Strengthened the five existing isolation journeys with accepted battle actions followed by actual Back navigation in the existing BFCache-enabled harness. They require exact fresh state and unchanged primary/backup/handoff bytes after return. All **15 Chromium** profiles/cases (`run-yloL62`) and **10 WebKit** (`run-7Xd3FS`) pass. Earlier full-file desktop persistence coverage also passed **26/26** (`run-wA5Jh9`), including the retained actual cached-document/stale-writer cases. Prefix isolation and asset-mode checks follow; the case IDs/matrix remain unchanged.
- Superseded queued extended run `41647577545` was cancelled before execution. Replacement [run 41648868922](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41648868922), qualification branch `bfa6c3f`, asserts equivalence to telemetry candidate `0377781` and adds both configured telemetry suites plus changed units/build integrations ahead of the extended journeys. Align this queued branch once more with the stronger history proof before it executes. All supplemental work stays on the same `tactics-browser-exclusive` lock; its temporary workflow is never part of the implementation PR.
- Next: inspect both final runs/artifacts, diagnose any failures without retries/limit changes, reconcile all acceptance gates, update PR #277 with source-bound results, and remove `.github/full-verify-request` from the implementation branch before review handoff. Do not merge or tag/release/deploy. Task checkboxes close only when their complete proof is retained.

## Estimate for my implementation

**8–12 hours of my elapsed working time after implementation starts**, including code, test migration, qualification and an implementation PR: about 3–5 hours for entry/session/UI changes and focused tests, 2–3 hours for cross-suite fixture migration and coverage accounting, and 2–3 hours for serial full/extended verification and evidence review, with some overlap.

The historical #263 full run took about 2 hours 24 minutes, so serial qualification is a material part of this estimate, not an instant final check. Allow **12–16 hours** if merged #273/#274 changes materially affect integration or a genuine regression needs diagnosis. Runner queue/offline time, external review, merge and deployment are excluded. This is my execution estimate, not a human engineer estimate or a guaranteed deadline.
