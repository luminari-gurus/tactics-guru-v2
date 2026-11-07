# Issue #297 — Keep proof diagnostics out of gameplay

Planning date: 2026-11-07 (Asia/Jerusalem). [Issue #297](https://github.com/luminari-gurus/tactics-guru-v2/issues/297), assigned to `@moshehbenavraham`. Base: `origin/main` at `4148eb1043163587de30eb1243d4eee717b248bf`. Work branch: `branch/issue-297-hide-gameplay-diagnostics`.

Status: implementation and affected qualification are complete; [PR #338](https://github.com/luminari-gurus/tactics-guru-v2/pull/338) is the review handoff, labeled `bug` and `risk:medium`. The caller authorized implementation on 2026-11-07. [OpenSpec tasks](../../openspec/changes/issue-297-hide-gameplay-diagnostics/tasks.md) track the delivered scope; do not archive or merge without the subsequent review workflow. The previous #172 plan is preserved in [issue-172-combat-consumables-revival-plan.md](issue-172-combat-consumables-revival-plan.md).

## Selection and readiness

Reviewed all **59 open issues**, including bodies, labels and assignees, the relevant discussions, all **four open PRs**, 48 remote branches, current main and existing planning artifacts. GitHub's issue connection reports `totalCount: 59`, `hasNextPage: false`. Native blocked-by and linked-branch relationships were checked for all 59; they are empty, so body-level dependencies and active branch/PR evidence still govern eligibility. The authenticated login is `moshehbenavraham`, independently verified through the connector and GitHub API.

GitHub Project draft items could not be inspected: the available credential lacks `read:project`, and the connector has no Projects capability. This selection covers the accessible issue backlog and repository work; it does not claim an audit of inaccessible draft cards.

Choose #297 because its later [dungeon report](https://github.com/luminari-gurus/tactics-guru-v2/issues/297#issuecomment-6667078355) identifies persistent production-facing controls as well as a first-load flash. Both have concrete source causes, no prerequisite or product decision is outstanding, and no existing PR/branch covers the fix. It repairs shared player-facing startup and a repeatable dungeon UI leak with a small change. No evidenced unclaimed foundation issue currently unlocks more immediately actionable downstream work: #161's remaining mechanics are assigned elsewhere, #170 requires separate biome-pack issues, and #174 still needs reward/economy decisions.

The readiness pass considered unlabeled work equally. Added and read back the exact `ready for work` label on [#316](https://github.com/luminari-gurus/tactics-guru-v2/issues/316): its prerequisite #314 is merged, the current Mage helper still uses the seed-68 witness, and the issue defines bounded fixture/replay/progression and timing acceptance. #327's XP-picker reduction is already merged and does not complete that journey-resilience work. #316 remains unassigned and is the strongest follow-up for verification reliability; #297 has the clearer immediate player impact and smaller implementation uncertainty.

Backlog accounting at selection, covering each open issue once:

- Selected: #297.
- Other bounded UX candidates: #284, #293, #294, #296, #307, #309, #311, #312. Some need confirmation of existing intended UI behavior; #309 is especially small but has less impact than the confirmed diagnostic leak.
- Newly ready: #316.
- Investigations needing cause/reproduction evidence: #257, #258, #268, #303, #306, #318, #322. In particular, `combatStats()` subtracts Weakened once; Guarded Strike adds its separate attack penalty, so #318's apparent double penalty is not yet a confirmed rules defect. Stair generation already excludes the entry/exit cells; #322 needs its actual arrival trigger identified before prescribing a placement fix.
- Product decisions, epic decomposition, or remaining prerequisite/consumer contracts: #167, #168, #169, #170, #171, #173, #174, #175, #176, #178, #179, #180, #181, #182, #185, #199, #261, #262, #270, #287, #299, #301, #308, #313, #320, #323. Existing readiness labels do not remove those scope/dependency checks. Do not treat the parent references themselves as blockers.
- Already assigned to another owner or active work: #85, #128, #161, #162, #184, #200, #208, #219, #254. Retain their assignments and acceptance records; an open tracker can represent remaining acceptance after substantial merged implementation.
- Active fix PRs: #295 → #337; #324 → #334. Do not duplicate them. The other open PRs are design draft #237 and the separately gated SSH alternative #12.
- Open reports whose corresponding fixes are already on main: #291 → #330, #292 → #333, #298 → #336, #302 → #331, #304 → #335. Leave issue closure and any remaining acceptance to those deliveries.

## Outcome

Player-facing production routes show only a neutral loading/error state during boot and their proper gameplay UI after initialization. Proof-scene restart wording, fixture buttons, tree-opacity controls, diagnostic movement/audio controls, measurement panels and diagnostic landmark names never appear during ordinary menu, battle, run or dungeon use, including a cold load and dungeon battle re-entry.

Keep intentional diagnostic entry points (`?scene=proof` and `?scene=content-smoke`) functional for existing QA and performance tools. These are explicitly selected test scenes, distinct from controls leaking into gameplay. Preserve the route resolver's first-scene-value and `/qbert` behavior. Preserve player restart/new-game, recovery, battle sound, privacy, targeting and accessibility controls.

## Findings on the planning base, now repaired

- [index.html](../../index.html) renders `#fit-panel` with the label `Proof scene diagnostics`, a visible `Restart proof scene` button, open Board controls and Measurements before any module has loaded. CSS is imported by route modules, so late hiding cannot prevent the initial HTML exposure.
- [mountBattleLayout()](../../src/ui/battleLayout.ts) moves every existing panel child under `#battle-scroll`. [startDungeonApp.ts](../../src/app/startDungeonApp.ts) calls it before battle entry, then tries `#fit-panel > details` when starting a battle. Those details are no longer direct children, so they remain visible. The dungeon owner also never replaces the diagnostic panel label.
- [startBattleApp.ts](../../src/app/startBattleApp.ts) and [startRunApp.ts](../../src/app/startRunApp.ts) hide direct-child details before reparenting and set player-facing labels. They must still work after changing the default HTML visibility. [main.ts](../../src/main.ts) reports application-import failure through `#fit-status`; hiding that live status with the diagnostic UI would break recovery.
- Main menu and map entry replace/hide the shell after loading. Explicit proof/content-smoke scenes, [FitScene.ts](../../src/phaser/FitScene.ts), `window.fitDiagnostics`, layout/boot tests and performance collection consume the existing diagnostic IDs. Preserve those contracts rather than deleting the diagnostic subsystem.

## Non-goals

No combat, balance, seed, RNG, movement, save-format, telemetry-schema or routing-policy changes. No HUD redesign, broad scroll fix, removal of the Discovered places list (#309), general debug framework, new dependency, new configuration switch or new verification infrastructure. Do not close #308's separate scroll report merely because removing these controls may help it. Keep #295/#324 layout/camera work separate.

## Files and implementation

Use one focused implementation PR. Per the caller's explicit continuation request, use the repository's OpenSpec workflow with a compact proposal, startup spec, design and tracked tasks. The original implementation scope stays unchanged.

1. **Default HTML to the player-facing state.** In `index.html`, retain a visible generic live loading/error status and stable shared gameplay nodes. Mark proof-only sections hidden in the markup, including before JavaScript or styles arrive, and use neutral initial landmark/restart wording. Keep visibility rules effective after layout reparenting. Do not hide the only error announcement or depend solely on post-load CSS.
2. **Reveal diagnostics deliberately.** In `src/app/startBattleApp.ts`, reveal the existing proof controls and diagnostic wording only for the explicit proof scene; preserve content-smoke's restricted status output. Keep normal standalone and Q*bert gameplay controls correctly named and available. Reuse the existing scene decision and element IDs.
3. **Keep gameplay owners consistent.** In `src/app/startDungeonApp.ts`, set the dungeon's player-facing panel name and use stable IDs or a scoped marker for diagnostic visibility, independent of direct-child topology. Verify subsequent battle starts after `mountBattleLayout()` cannot reveal the controls. Inspect `src/app/startRunApp.ts` and `src/ui/battleLayout.ts` as consumers; edit them only if the default visibility change needs corresponding initialization. Prefer static defaults plus the existing owner paths over another global state manager.
4. **Add only missing behavioral proof.** Extend existing `tests/main-menu.spec.ts`, `tests/boot.spec.ts` and `tests/dungeon.spec.ts` as appropriate for the pre-module shell and dungeon re-entry regression. Reuse existing helpers and legal gameplay journeys. Retain proof-scene layout/boot and content-smoke checks. Update the existing startup/QA documentation only where it describes changed behavior; record final exact-source evidence with the implementation.

Likely production edits are `index.html`, `src/app/startBattleApp.ts` and `src/app/startDungeonApp.ts`. Additional initialization, CSS or test/config edits require the traced consumer above, not cleanup preference.

## Proof and acceptance gates

- **Before scripts/styles and while imports are delayed:** inspect the served initial shell and a controlled delayed-module navigation to `/`, saved menu modes, `/battle`, `/run` and `/dungeon`. A visible generic status is allowed; every listed diagnostic control and diagnostic landmark is absent from the visible/accessibility UI. Repeat the affected cold-start case with mobile emulation and capture a screenshot.
- **Actual gameplay:** start a saved dungeon from the menu, enter a battle, make a legal reviewed action, finish the encounter through the existing journey and enter another battle. Assert the diagnostic controls stay hidden after reparenting/re-entry, panel naming is correct, and gameplay action, sound, restart and recovery controls remain usable. Cover desktop keyboard plus native touch portrait/landscape, including the ordinary run/standalone consumers. Reuse existing complete legal battle/run/dungeon tests rather than introducing a new simulated gameplay engine.
- **Recovery:** the existing missing-engine-chunk cases still show a visible recoverable alert with reload guidance. Also cover route-module failure if a changed visibility boundary affects `main.ts`'s catch. Delayed/failed startup must not expose proof controls or leave a blank screen.
- **Diagnostics remain intentional:** `?scene=proof` still exposes working fixtures, movement, sound and measurements; `?scene=content-smoke` retains its status/content/failure behavior. Preserve repeated `scene` parameter precedence and Q*bert semantics. Explicit diagnostics remain testable in production preview and development.
- **Regression scope:** both TypeScript scopes, production build/content validation and root/prefix build integrations are required because the shared HTML/bootstrap changes. Run ordinary `verify:pr`, then only additional affected startup/layout/run/dungeon/proof cases and the relevant WebKit consumers. This plan does not require a full regression or performance recapture unless implementation reveals a broader behavioral or loading-budget change.

Commands to use during implementation, selecting exact test titles after discovery:

```sh
npm run typecheck
npm run build
npm run test:build
npm run test:regression -- --list tests/main-menu.spec.ts tests/boot.spec.ts tests/dungeon.spec.ts tests/layout.spec.ts tests/content-loading.spec.ts
npm run test:regression -- tests/main-menu.spec.ts tests/boot.spec.ts tests/dungeon.spec.ts tests/layout.spec.ts tests/content-loading.spec.ts --grep '<affected exact titles>'
npm exec -- playwright test -c playwright.device-acceptance.config.ts --list
npm exec -- playwright test -c playwright.exploration.config.ts --list
npm run verify:pr
git diff --check
```

Use discovery to confirm selected project/test IDs before each focused run. Existing WebKit acceptance selects main-menu/standalone/run checks; exploration config owns dungeon checks. Add bounded selected tests to those existing configs only if a new title would otherwise be omitted. Prefix preview needs its matching successful build and existing asset configuration. Retain failed/skipped/incomplete runs and exact commit/build, browser, OS, worker and retry identity under the [verification policy](../verification-policy.md); focused recovery does not erase an earlier failure.

Browser/device emulation is sufficient under [AGENTS.md](../../AGENTS.md). Local `CAN_TEST_MOBILE` parses as `android`; no physical platform is required for this task and no hardware test is claimed. Browser CI uses the self-hosted runner with one worker and no automatic hosted fallback. The planning-only commit claimed no execution; actual qualification follows below.

## Ablation decisions

- **Keep** HTML-level hiding: JavaScript-only cleanup leaves the reported cold-load flash possible.
- **Keep** the visible generic status and explicit proof reveal: hiding the entire shell or deleting diagnostics breaks real error handling and existing QA consumers.
- **Simplify** dungeon hiding to stable elements and player-facing naming: the current direct-child selector is invalid after the existing layout move. No new ownership/visibility framework is necessary.
- **Keep** one pre-module witness and real repeated dungeon battle checks: a DOM/helper assertion after startup cannot prove no initial flash or later re-exposure.
- **Drop** generalized feature flags, diagnostic service refactors, unrelated panel scrolling and broad full-matrix/performance repetition. No #297 requirement depends on them.

## Planning validation

Local Markdown link/path validation passed for both plan files, and the archived #172 plan matches the previous committed content after line-ending normalization. `git diff --check` passed. Playwright discovery succeeded: the five named Chromium regression files select 215 cases, WebKit acceptance selects 204, and WebKit exploration selects 168. These are discovery counts, not executed browser results or a recommendation to run every selected case for this fix. The work branch was created from the recorded base and linked natively to #297 using GitHub's `createLinkedBranch` mutation.

## Implementation progress — 2026-11-07

- The caller explicitly authorized implementation and requested OpenSpec. Change `issue-297-hide-gameplay-diagnostics` is valid under strict validation; its three tasks cover startup, repeated dungeon gameplay and integrated delivery.
- Implemented native hidden defaults, neutral initial wording, explicit proof reveal, shared gameplay restart/caption reveal and dungeon panel naming. Removed the three obsolete direct-child diagnostic-hiding loops. No rules, saves, scene selection or dependencies changed.
- New desktop regressions failed on the unchanged application: visible proof restart before modules and missing dungeon panel naming (`tmp/issue297-red.log`). The first fixed-build run retained two test-setup failures: the saved New Game seed was 29 instead of the unsaved witness's 28, and held stylesheets blocked the screenshot. The saved test now draws 27 to obtain playable seed 28 through the existing collision rule; styles are aborted while scripts are held. Neither repair changes gameplay or timeouts.
- Root build passed both TypeScript scopes and 226 content checks. `tmp/issue297-focused-desktop.json` records **3/3 passes**, one worker, zero retries: delayed startup across nine routes, route-import recovery for all three game modes, and the saved legal three-battle/floor-travel journey. Battle screenshot visually reviewed: no proof tools overlap the playfield. Cross-device, explicit-proof and core qualification remain pending.
- Local commands need the existing npm wrapper at `C:/Users/apexw/.codex/tmp/issue163-tools` on PATH. OpenSpec 1.14.1 is cached at `C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js`. Baseline content checks rewrote snapshot line endings; only those generated normalization changes were restored after confirming identical normalized content. Restore them again after later units if needed; never commit them.
- Implementation source is committed and pushed as `ea70451`; [PR #338](https://github.com/luminari-gurus/tactics-guru-v2/pull/338) is open with `bug` and `risk:medium`, temporarily draft during qualification. Self-hosted [PR verification](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42319614188) passed for that commit.
- Local `verify:pr` passed in 106.9 seconds: 1,233 units, both types, two build integrations and seven core journeys. Receipt: `verification-receipts/pr/1794012062004-16564/summary.json`. Two earlier command attempts remain failed: bundled Node was not discoverable by npm exec (fixed with an ignored local node shim), then LF-only workflow parsing saw autocrlf CRLF bytes (restored the four unchanged workflows to their committed LF bytes). These are environment corrections; no workflow or tooling assertion was changed.
- Additional Chromium qualification passed **59/59**, no skips/retries: `tmp/issue297-ui-chromium.json`, with exact discovery in `tmp/issue297-ui-chromium-discovery.json`. It covers delayed startup, import/engine recovery, explicit proof fixture/opacity/move/audio/measurements, content smoke, shared HUD/run restart and Q*bert precedence on desktop and native-touch portrait/landscape. Three existing consumer cases gained explicit hidden-diagnostic/restart assertions. Application/build inputs remain those of `ea70451`; only these assertions and handoff artifacts differ. Mobile/WebKit repeated encounters, development and prefix preview remain pending.
- Touch dungeon qualification retained one portrait pass and a landscape setup failure from reading the seed before New Game mounted the map. An explicit `#dungeon-map` visible wait fixes that setup race; the landscape case passed alone (`tmp/issue297-dungeon-landscape-recovery.json`). The saved legal commands, assertions and timeouts were retained; the successful portrait evidence is reused because its map was already ready at that same boundary.
- WebKit's eight-case UI selection retained six passes and two timeouts in the delayed-startup screenshot harness (`tmp/issue297-ui-webkit.json`). All cold-shell assertions passed, but WebKit required navigation to settle for a screenshot. The harness now rejects the held modules after inspecting each shell, so no application code executes while screenshotting. Exact recovery passed both WebKit orientations (`tmp/issue297-startup-webkit-recovery.json`) and all three Chromium profiles (`tmp/issue297-startup-chromium-final.json`). No assertion or timeout was relaxed.
- WebKit dungeon qualification passed **6/6** in six minutes, one worker and zero retries (`tmp/issue297-dungeon-webkit.json`): all desktop/portrait/landscape saved three-battle journeys and active resume checks. Both implementation tasks are complete; the final delivery checks are recorded next. Production source has not changed since `ea70451`. Current selection discovery is 1,126 broad Chromium cases, 208 WebKit acceptance cases and 171 WebKit exploration cases; these inventory counts are not executed full-matrix claims.

## Final qualification and handoff

All required runtime gates are covered. Final checks passed: both TypeScript scopes after the last test edits; explicit WebKit proof boot **1/1**; root development **8/8**; `/prototype/` production preview **4/4**, including native touch. The ordinary root build was restored successfully and its HTML SHA-256 again matches the earlier qualified root (`67cf434b62dfac1a75130936ebc065d079d468f7598f884555fd1a79c0309c6c`). All successful final selections have zero skips or retries. Earlier failed captures remain failed with their targeted recoveries recorded above.

Environment: Windows x64 `10.0.26300`, Node `24.22.1`, Playwright `1.64.1`, Chromium `156.0.8078.4` revision 1248, WebKit `27.2` revision 2370; one browser worker. These are browser/device emulation results. No physical-device, full-regression or new performance-budget claim is made. Development Vite/Phaser warnings are retained in logs; no renderer or warning-suppression change was added.

[Verification summary and exact selectors](../qa/issue-297/verification.json), [receipt manifest](../qa/issue-297/manifest.json) and compressed original reports under `docs/qa/issue-297/` preserve source/build inputs, successful selections, failed attempts and recovery. Desktop, touch portrait, WebKit landscape, explicit proof and cold-shell screenshots were visually reviewed; representative [desktop](../qa/issue-297/desktop.png), [touch portrait](../qa/issue-297/touch-portrait.png), [WebKit landscape](../qa/issue-297/webkit-landscape.png), [proof](../qa/issue-297/proof.png) and [cold shell](../qa/issue-297/cold-start.png) images are retained.

Production, asset, dependency, build and browser configuration inputs still match `ea70451a3b13c495c6874a93ec62a42c14d64a85`. Subsequent changes add only explicit assertions in existing consumer cases, the two described test readiness/capture repairs, QA evidence, OpenSpec progress and documentation. Reuse follows that input comparison: unchanged core cases and units retain their passing source-bound results; changed harness cases have exact fresh recovery. The final PR checks provide current-head CI status. No acceptance item remains deferred.

Completion audit: initial HTML and delayed/failed imports retain only player-facing status; repeated dungeon battles and resume keep diagnostics hidden and preserve controls; standalone/run/Q*bert and explicit proof/content-smoke consumers pass; root/prefix and development delivery pass; OpenSpec validates strictly; the published branch and issue remain linked. One focused PR completes #297. Leave review, merge, release tags and deployment to a subsequent instruction.

## Estimate and delivery

Estimated time for **me**: **2–3 hours** to implement the visibility/naming repair and focused regressions, plus **1–2 hours** for affected browser/build qualification, review and PR preparation: **3–5 hours total**, excluding runner queue/unavailability and unrelated pre-existing failures. This is an estimate, not execution evidence.

The original planning delivery is complete at `be97c75`. Continue implementation on the same branch, keep this document and OpenSpec tasks current, commit and push coherent work, and open a focused labeled PR. Do not create a release tag or deploy for this UI repair.
