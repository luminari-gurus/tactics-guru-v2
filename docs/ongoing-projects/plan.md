# Issue #259: Isolate testing routes from saved games

Date: 2026-11-03 (Asia/Jerusalem). Status: implementation in progress; entry-routing chunk under verification.

- Issue: [#259](https://github.com/luminari-gurus/tactics-guru-v2/issues/259).
- Owner: `moshehbenavraham`; [pickup comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/259#issuecomment-6603160055).
- Branch: [`work/issue-259-testing-route-save-isolation`](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-259-testing-route-save-isolation).
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
- Next: publish the verified entry-routing PR; then consume `persistent` in the existing hosts, make storage explicitly absent for testing, migrate remaining save fixtures, add storage-spy isolation cases, and run the full/extended acceptance inventory. Task checkboxes close only when their complete proof is retained.

## Estimate for my implementation

**8–12 hours of my elapsed working time after implementation starts**, including code, test migration, qualification and an implementation PR: about 3–5 hours for entry/session/UI changes and focused tests, 2–3 hours for cross-suite fixture migration and coverage accounting, and 2–3 hours for serial full/extended verification and evidence review, with some overlap.

The historical #263 full run took about 2 hours 24 minutes, so serial qualification is a material part of this estimate, not an instant final check. Allow **12–16 hours** if merged #273/#274 changes materially affect integration or a genuine regression needs diagnosis. Runner queue/offline time, external review, merge and deployment are excluded. This is my execution estimate, not a human engineer estimate or a guaranteed deadline.
