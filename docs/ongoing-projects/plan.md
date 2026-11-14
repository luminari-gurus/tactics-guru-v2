# Issue #376 — Dungeon encounter progress and stair availability

Date: 2026-11-13 (Asia/Jerusalem).
Issue: [#376](https://github.com/luminari-gurus/tactics-guru-v2/issues/376).
Owner: [@moshehbenavraham](https://github.com/moshehbenavraham).
Branch: [`branch/issue-376-floor-progress`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-376-floor-progress).
Implementation base: `973b792f3e26b178b71dfa07d5654019cb34e24e`.
Review base: `origin/main`, `4290b700` (merged prerequisite PR #395).
Status: implementation and acceptance complete under OpenSpec
`issue-376-floor-progress` (**4/4 tasks**). Published ready for review as
[PR #396](https://github.com/luminari-gurus/tactics-guru-v2/pull/396), labeled
`enhancement`, targeting `main`. Prerequisite PR #395 is merged. Working tree
started clean; current evidence and review handoff are below.
The previous plan is preserved unchanged as
[issue-389-snared-indicator-plan.md](issue-389-snared-indicator-plan.md).

## Selection and availability

Reviewed all **34 open issues**, including bodies, labels and assignees, without
filtering on `ready for work`; also checked both open PRs (#12 and #237, both
drafts), remote branches, relevant comments, repository discussions and GitHub
dependency/sub-issue/development relationships. REST page 2 was empty; GraphQL
independently reported 34 issues and `hasNextPage: false`. No repository Project
boards or issue Project items were returned. GitHub Issues is the work tracker.

Selected #376 because it supplies actionable progression feedback in a small,
verifiable change. Its actual prerequisite, [#372](https://github.com/luminari-gurus/tactics-guru-v2/issues/372),
is closed and its layout is merged in PR #380 (`6dd4b7f3`). Related automatic
stairs [#230](https://github.com/luminari-gurus/tactics-guru-v2/issues/230) is closed
and merged in PR #243 (`d5b19279`). Current main also includes the final-encounter
reward fix in PR #390, so the plan explicitly handles a reward after all three
encounters. #376 was unassigned, had no linked development branch, matching
remote branch or active PR, and already carried `ready for work`. Assigned it to
the authenticated caller and posted [the pickup comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/376#issuecomment-6861028704).

No evidenced downstream dependency distinguishes the available small fixes.
The strongest alternative, [#366](https://github.com/luminari-gurus/tactics-guru-v2/issues/366),
has concrete radial-label reproductions for Magic Missile and Guarded Strike;
#376 ranks ahead because its feedback explains what players must do to progress.
[#318](https://github.com/luminari-gurus/tactics-guru-v2/issues/318)
could be a combat correctness problem, but needs reproduction and diagnosis:
current HUD and attack evaluation both use `combatStats`, while attack evaluation
also applies height, Guarded and Mark modifiers. Source inspection does not prove
or dismiss the report.

Other issues remain accounted for:

- #85, #128, #161, #200, #208, #258 and #306 belong to @dubstylee. Preserve that
  ownership. #199 is a coordination epic whose checklist also contains completed
  work; the open child issues, not stale checkboxes, determine availability.
- #167–#169 and #171 retain concrete push/charge/stack/typed-damage or immunity
  decisions in the remaining #161 consumers. Completed Ranger/Mage/Shaman slices
  do not resolve all those contracts. #170 needs a bounded biome-pack issue.
- #173–#175 retain acquisition, reward/currency or exploration-contract choices.
  #178–#182, #185, #262 and #287 retain view, history, asset, tutorial, rules or
  presentation decisions. Existing readiness labels do not resolve those choices.
- #261 and #268 already have work/investigation branches; they need remaining
  qualification or diagnosis rather than another overlapping implementation.
- #299 and #308 are mixed QA lists with overlap and behavior decisions;
  #301, #313 and #320 need defeat/revival/balance choices. They were considered,
  not excluded merely for lacking a readiness label.

No other issue was assigned, relabeled or closed during this selection. Parent
or epic references alone were not treated as prerequisites.

## Outcome

Keep a compact, readable summary next to the existing floor/biome header:
`Encounters: 1 / 3 cleared`, with labeled upstairs/downstairs availability and a
short contextual reason. Update it from accepted dungeon state after victories,
reward claim/decline, floor travel/backtracking and Continue.

Suggested copy describes current rules, not new choices:

- Before completion: `Downstairs: locked · clear 2 more encounters`.
- With a pending reward, including at 3 / 3: `Downstairs: locked · resolve reward`.
- Once ready and complete: `Downstairs: unlocked · walk onto the stairs`.
- On floor 1: `Upstairs: unavailable on floor 1`; on deeper ready floors:
  `Upstairs: available`.
- Defeat and active-battle states must not claim travel is available. Retain the
  existing defeat flow and keep the exploration HUD hidden during active combat.
- When standing on an eligible arrival/restored stair, retain the relevant
  step-off-and-back-on instruction without adding a standing instruction block.

Unlocked does not mean discovered or underfoot. The summary may describe general
availability, but must not reveal stair coordinates, hidden cells or enemy
positions. Keep existing discovery and once-per-entry travel behavior intact.
Use visible text rather than color alone, allow narrow-screen wrapping, and keep
rewards, map, party and compass usable without horizontal page overflow.

## Current path and ablation

[dungeon.ts](../../src/domain/dungeon.ts) owns canonical `completed`, floor
descriptors, reward phase and travel validation. `acceptDungeonBattle` increments
the cleared count before publishing `phase: reward`; `dungeonItem` returns to
`ready` only after reward resolution. `travelDungeon` requires ready phase,
completed encounters for descent, a deeper floor for ascent and the correct tile.
`stepDungeon` owns automatic travel after accepted movement.

[dungeonMap.ts](../../src/ui/dungeonMap.ts) derives downstairs visibility from
ready phase, completion and discovery. Upstairs markers remain discoverable on
deeper floors independently of temporary travel locks. [dungeon.ts](../../src/ui/dungeon.ts)
already renders from session state and preserves the mounted map, controls,
secondary panels and focus; it currently shows conditional travel paragraphs but
no cleared/total summary. [DungeonSession.ts](../../src/app/DungeonSession.ts)
already publishes accepted transitions and restored states; it needs no new
subscription or timer.

Keep one small pure projection in the existing domain module for stair
availability/reason, shared by travel validation, the HUD and the map's existing
downstairs eligibility check. Keep discovery and position checks separate:
availability is not remote permission to travel, and an upstairs marker must not
vanish merely because a reward is pending. Read cleared count and total from the
current floor and its descriptor, including supported legacy exploration state.

Ablation removes a new HUD controller, new persisted counters, save migration,
timer/subscription machinery, a general progress framework and new dependencies:
the existing state and render path supply the whole outcome. Keep the small
shared projection because three real consumers otherwise repeat progression
conditions and can disagree about pending rewards. Extend current tests instead
of adding fixtures, a browser matrix or a new workflow. This bounded change needs
only a small OpenSpec contract/tasks alongside this continuation plan, as requested
in the implementation instruction. No extra implementation machinery is needed.

## Non-goals

Do not change encounter counts/order, unlock rules, fog/discovery, automatic stair
traversal, rewards, defeat/revival policy, combat, RNG, save formats or records.
Do not redesign the dungeon screen, add art/assets, change verification selection
or repair unrelated backlog items in this PR.

## Files and implementation steps

1. In [src/domain/dungeon.ts](../../src/domain/dungeon.ts), extract the existing
   stair eligibility conditions into the small pure projection. Reuse it in
   travel validation/automatic-travel admission while preserving rejection
   reasons, revision, tile and phase checks. Do not mutate state or draw RNG.
2. In [src/ui/dungeon.ts](../../src/ui/dungeon.ts), render the encounter summary
   and contextual stair labels in the existing header. Replace overlapping
   travel hints where necessary, retain relevant re-entry guidance, and preserve
   session save/recovery feedback and pending reward prominence. In
   [src/ui/dungeonMap.ts](../../src/ui/dungeonMap.ts), reuse eligibility without
   changing discovery, upstairs marker visibility or accessible map descriptions.
3. Add only the compact wrapping/layout rules needed in
   [src/ui/dungeon.css](../../src/ui/dungeon.css). Use semantic labeled text;
   avoid an extra focus target or duplicate live announcements on every move.
4. Extend [tests/unit/dungeon.test.ts](../../tests/unit/dungeon.test.ts) and
   [tests/unit/exploration.test.ts](../../tests/unit/exploration.test.ts) for
   completion counts, both directions, all phases, pending final reward,
   legacy/current exploration and unchanged travel/rejection behavior. Assert
   that projection leaves the input unchanged.
5. Extend [tests/dungeon.spec.ts](../../tests/dungeon.spec.ts) and
   [tests/dungeon-exploration.spec.ts](../../tests/dungeon-exploration.spec.ts)
   with observable HUD assertions in existing legal victory/reward/travel/Continue
   journeys and discovery/layout checks. Add only a bounded case where those
   journeys lack a required state; reuse current fixture/traversal helpers.
6. Record actual verification/source/build identity in this plan or focused
   evidence under `docs/qa/issue-376/`, commit the focused change and open one PR.
   Use `Closes #376` only after both criteria below are verified. If an unexpected
   dependency requires splitting delivery, use `Refs #376` and record the exact
   outstanding criteria on the issue.

## Proof and acceptance mapping

**Criterion 1 — updates after clearing, rewards, floor changes and resume.**
Extend the existing legal reward/guardian boundary journey to assert 1 / 3,
2 / 3 and 3 / 3 immediately after accepted victories, before and after reward
claim, and across reload/Continue. Cover decline with the existing decline
journey, descent to a fresh floor (0 / 3), ascent/backtracking to a cleared floor
(3 / 3) and another resume. Retain the legal complete battle/defeat journey;
structural saved-state fixtures alone are not victory or traversal proof.

**Criterion 2 — players understand unavailable stairs.** Verify remaining
encounters, pending reward at incomplete and complete floors, floor-one ascent
restriction, deeper-floor ascent, unlocked descent, defeat, and arrival/restored
stair re-entry. Assert agreement with authoritative travel and map availability.
Keep existing hidden-stair tests: completing a floor never reveals its location.

**Affected consumers and proportional checks.** This is dungeon presentation and
an equivalent extraction of travel predicates. Cover dungeon state, battle/reward
boundaries, exploration and restored travel; battle/run shared HUDs, combat
rules, storage format and telemetry remain unchanged. Use the UI/domain rows of
[verification-policy.md](../verification-policy.md), plus ordinary PR checks.
No full regression or new performance campaign is justified by this scope.
Broaden only if implementation changes those inputs or exposes a concrete risk.

Iteration and completion commands (repository root):

```sh
npm run test:unit -- tests/unit/dungeon.test.ts tests/unit/exploration.test.ts tests/unit/dungeonBattle.test.ts tests/unit/dungeonProgressionBoundary.test.ts
npm run typecheck
npm run build
npm run test:regression -- tests/dungeon.spec.ts tests/dungeon-exploration.spec.ts -g 'map markers respect stair availability|stairs|legal reward and guardian boundaries|declining a dungeon reward|fresh dungeon keeps the map and party|dungeon recovery separates status|dungeon battle undo survives reload'
node node_modules/@playwright/test/cli.js test -c playwright.exploration.config.ts tests/dungeon.spec.ts tests/dungeon-exploration.spec.ts -g 'map markers respect stair availability|stairs|legal reward and guardian boundaries|declining a dungeon reward|fresh dungeon keeps the map and party|dungeon recovery separates status|dungeon battle undo survives reload'
npm run verify:pr
git diff --check
```

Use the existing Chromium desktop/Pixel portrait/landscape and WebKit
desktop/iPhone portrait/landscape projects; include keyboard/focus and real touch
interactions, narrow layout screenshots and no horizontal overflow. The two
browser filters were discovered on the base with `--list`: **39 cases each**,
across 13 existing titles and three profiles. Re-discover after extending tests;
include any newly necessary HUD case explicitly rather than assuming a filter
finds it. These counts prove selection only; no browser acceptance ran during
planning. Standard PR CI remains self-hosted, one browser process per runner,
with no automatic GitHub-hosted fallback.

Record exact final tested source/build, commands, profiles, results, reports,
failures/skips/retries and relevant unchanged inputs for reused evidence. Do not
relax timeouts, assertions or budgets. Documentation-only plan validation needs
paths/commands/whitespace checks, not application/browser execution.

## Estimate and open questions

**For me: 2–3 hours of implementation and validation**, approximately 45–60
minutes for code and focused tests, 45–75 minutes for browser/build/PR checks,
and 15–30 minutes for review, evidence and PR handoff. CI queue/unavailable runner
time and any newly reproduced unrelated failure are additional.

There are **no blocking product questions**. Use the compact text above as the
default; refine wording within the same rule contract if layout testing requires
it. Stair availability must remain distinct from discovery and current position.
Local `CAN_TEST_MOBILE` declares Android access only, not completed testing;
physical hardware is not required here. Playwright/device emulation is sufficient
under AGENTS.md, and no physical testing is claimed.

Implementation, verification, commits, pushes and a ready-for-review PR are now
authorized. OpenSpec change: `openspec/changes/issue-376-floor-progress/`.
The Windows shell supplies Node v24.22.1 but no npm/OpenSpec command on PATH.
Use cached OpenSpec via
`node C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js`.
Installed project dependencies are Linux binaries. Execute app checks via
`wsl.exe --exec bash --noprofile --norc -c 'export PATH=/home/aiwithapex/.nvm/versions/node/v26.11.1/bin:$PATH; <command>'`
from this workspace (Node v26.11.1 / npm 11.20.0). A Windows npm shim downloaded
outside the repo was unnecessary: its first unit attempt failed before execution
because installed `.bin` entries are Linux scripts. No project dependency or
lockfile change was required.

## Implementation log

- Shared direction-based stair status now feeds travel validation, automatic
  travel admission and downstairs map eligibility. Discovery, upstairs markers,
  remote/stale rejection order and enemy movement are preserved.
- First focused WSL unit run: **179/179 passed** across dungeon, exploration,
  dungeonBattle and dungeonProgressionBoundary (35.87s). Subsequent additions to
  existing travel assertions will be checked again with final verification.
- HUD now reads the existing current-floor count/descriptor and shows short
  stair labels with contextual lock/re-entry reasons. Existing browser journeys
  now assert progress around legal battle victories, reward claim/decline,
  floor changes, Continue, defeat and hidden stair discovery. No new test files
  or browser selection/configuration changes.
- Final acceptance evidence and current publication status are summarized below.
- Desktop iteration: legal reward/guardian, decline and fresh-layout journeys
  **3 passed**; map-marker journey **1 failed** on an obsolete legend selector.
  The same assertion failed on literal base `973b792f` with matching WSL/browser
  conditions. Source now puts the renamed legend inside the collapsed guide.
  A separate prerequisite branch `branch/issue-376-marker-guide-test` repairs the
  test by opening the guide, asserting its visible legend, then closing it.
  Base comparison lives in that worktree under
  `verification-receipts/issue376/base/`; feature iteration remains preserved at
  `verification-receipts/issue376/iteration/`. Its initial base build failed on a
  Windows worktree path in WSL; the retry used explicit GIT_DIR/GIT_WORK_TREE.
  No failed assertion, timeout or skip was suppressed.
- Repair commit `1a634f59` is merged into this feature branch without rewriting
  history. Its fixed marker journey passed **3 Chromium + 3 WebKit profiles**
  (50.3s / 26.0s). Repair ordinary PR verification passed in 209.6s, and PR #395
  was published with the `bug` label; its remote PR verification passed and it
  subsequently merged into `main` as `4290b700` during this session.
- Feature typecheck and production bundle passed. Desktop fresh and final-reward
  screenshots inspected: count/labels readable, reward choices unobstructed,
  map and party retained. Focused final selection is still **39 cases per engine**
  across desktop, touch portrait and touch landscape. No physical devices claimed.
- Ordinary feature PR verification passed at `f09eb0ac` in **232.9s**:
  **1,364 units**, both type scopes, **2** build integrations, bundle and **7/7**
  core journeys. Receipt: `verification-receipts/pr/1794594728814-1799351/`.
- First affected Chromium run: **36 passed / 3 failed**, no skips/retries.
  The defeat journey fails on all profiles before combat in `walkDungeon`:
  expected cell 108, accepted cell 53. Its helper waits only for the persistent
  screen while asynchronous New Dungeon replacement still exposes the dormant
  snapshot. Literal-base reproduction and a readiness repair are in progress in
  the prerequisite worktree. Do not call this run green. Outputs remain at
  `verification-receipts/issue376/final/chromium.{log,json}`; reruns will use
  different receipt paths. Earlier progress commentary overstated profile passes.
- The literal-base defeat comparison **passed 1/1**. Do not attribute this new
  timing-sensitive failure to a reproduced base failure. The HUD change exposes
  the existing helper's insufficient readiness condition: the persistent screen
  is visible before New Dungeon's asynchronous replacement publishes its map.
  The application already gates movement during replacement; no app workaround
  is needed. This feature's test adaptation now waits for the actual map before
  reading a snapshot, in `tests/helpers/dungeonTraversal.ts` (one condition).
  PR #395 stays the independent legend-only repair.
- Shared-helper consumers are dungeon exploration, dungeon journeys (including
  extended journeys), public-asset dungeon audio and radial persistence tests.
  Re-run the 39-case affected matrices after this helper edit, core journeys,
  and bounded desktop public-asset audio/radial testing witnesses. No traversal,
  save, route/base, audio or extended multi-floor simulation algorithm changed;
  no broad regression or repeated full extended journeys are justified.
- The fixed helper's **three Chromium defeat profiles passed**. Reuse those
  results alongside a new 36-case Chromium run excluding only that already-passed
  title, plus all 39 WebKit cases. This is 39 covered Chromium cases across two
  successful runs; it is not a claim that the original failed run became green.
  The helper patch is retained in `readiness-fix/helper.patch`; no assertion or
  timeout changed. Build inputs remain identical to tested `f09eb0ac`; subsequent
  edits affect only this helper and documentation. Re-run the two affected ordinary
  core dungeon journeys; reuse the five unchanged core journeys, units, type/build
  integration and bundle with their original source identity. Fresh typecheck is
  cheap and will also be run. No production rebuild is necessary for the helper edit.
- Repaired Chromium acceptance is complete: **3/3** defeat cases (102.8s) plus
  **36/36** other cases (184.8s), all profiles, no failures/skips/retries. Fresh
  typecheck passed. Current source checkpoint is `bd719298`; production build
  remains the unchanged `f09eb0ac` build. Input/blob identities are recorded in
  `verification-receipts/issue376/repaired/source-identity.json`, and build hashes
  in `verification-receipts/issue376/final/build-hashes.json`.
- WebKit's full **39/39** selection passed (216.5s), followed by **2/2** affected
  ordinary core dungeon cases (43.7s) and **3/3** desktop transitive consumer cases
  (29.7s: Web Audio dungeon, HTML5 dungeon, radial testing routes). All have zero
  failures, skips or retries. Outputs: `verification-receipts/issue376/repaired/`.

## Verified result and review handoff

- [x] Criterion 1: counts update at all three legal victory/reward boundaries,
  after claim/decline, on descent/backtracking and after Continue.
- [x] Criterion 2: remaining encounters, pending rewards including 3/3, floor-one
  ascent, ready/deeper stairs, defeat and arrival/re-entry are labeled in visible
  text. Discovery remains independent; hidden stairs stay hidden. Native touch,
  keyboard/focus, narrow layout, map/party/reward usability and overflow checks pass.

Final browser acceptance covers **78 cases**: Chromium **3 + 36** and WebKit **39**,
with no skips/retries. `repaired/coverage-summary.json` proves that the two repaired
Chromium runs cover exactly the original 39 selected cases, without omissions or
duplicates, and preserves the original failed-run statistics separately.

The final production bundle was built from clean `f09eb0ac36d6fff7cb88b78a69fe74d1e2ae11cf`.
The later code checkpoint `bd719298127c6507358fee1bf71f8c0ab6f94455` changes only
the test helper and documentation. Relevant app/public/config/lockfile/unit/build
inputs are unchanged. The helper blob is `17c3ae161ed1f2392dbcddd2d07472c01e824d69`.
Subsequent handoff edits are documentation and QA images only. Reuse the earlier
1,364 unit tests, two build integrations, ordinary bundle and five unaffected core
journeys from `verification-receipts/pr/1794594728814-1799351/`; the two affected
core journeys were rerun after the helper edit. Both type scopes passed again.
This does not claim the aggregate command ran a later documentation commit.

Built dungeon files: `startDungeonApp-C9dhlmkO.js` and
`startDungeonApp-DqpiXCti.css`. Recorded SHA-256 hashes for them, the entry HTML
and load manifest were rechecked unchanged after browser acceptance. See
`final/build-hashes.json`, `repaired/source-identity.json` and
`repaired/coverage-summary.json` under the issue's local receipts.

Exact additional commands after the helper repair (same WSL environment above):

```sh
# Three repaired defeat profiles; use the full planned Chromium filter above
# with this title excluded for the other 36 already-accounted-for cases.
npm run test:regression -- tests/dungeon.spec.ts -g 'dungeon battle undo survives reload'
# The other 36: planned two-file/filter command plus:
# --grep-invert 'dungeon battle undo survives reload'
# WebKit: the full planned 39-case command above, with no exclusions.
npm run test:pr -- tests/dungeon.spec.ts
npm run test:regression -- tests/public-asset-base.spec.ts tests/battle-persistence.spec.ts --project=desktop -g '(Web Audio|HTML5) dungeon audio loads at the base|radial testing routes preserve saved games'
npm run typecheck
```

These browser executions used line/JSON reporters and distinct output directories recorded
in the receipts. No assertion, timeout, retry or persistent matrix configuration
was relaxed. The initial missing-legend failure, identical literal-base legend
failure, 36/3 Chromium failure and passing literal-base defeat comparison remain
preserved. There are no unresolved product or acceptance failures. Physical
hardware was not tested; Playwright device emulation satisfies this task.

Representative final screenshots were inspected and committed for review:
[320px floor progress](../qa/issue-376/narrow-floor-progress.png) and
[WebKit landscape final reward](../qa/issue-376/final-reward-webkit-landscape.png).
The changes retain the existing visual theme and use one pure domain projection;
no new controller, saved fields, migration, timer, assets or dependencies were needed.

Publication: [PR #396](https://github.com/luminari-gurus/tactics-guru-v2/pull/396)
is open and ready for review, labeled `enhancement`, targeting `main` and closing
issue #376 when merged. PR #395 was delivered separately with `bug` and merged.
The feature branch incorporated updated main;
its complete Git tree was identical before and after that ancestry-only merge.
Main added only the already-inherited legend test repair, so no evidence was
invalidated. OpenSpec is 4/4 complete and intentionally remains unarchived for
review. No required implementation or acceptance work remains. Review/merge and
the current-head remote CI result are the remaining repository workflow; keep
issue #376 open until PR #396 merges. Final handoff commits change documentation
only and reuse the explicitly recorded runtime evidence above.

An unused npm helper folder at `C:/Users/apexw/.codex/tmp/issue-376-tools` remains
outside the repository: automatic approval rejected its optional deletion as
`blocked by policy`. It has no effect on the source, evidence or PR readiness.
