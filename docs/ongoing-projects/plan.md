# Issue #270 — Recent and best runs with trustworthy statistics

Date: 2026-11-10 (Asia/Jerusalem). Assigned to @moshehbenavraham.
Issue: [#270](https://github.com/luminari-gurus/tactics-guru-v2/issues/270).
Branch: [`branch/issue-270-run-statistics`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-270-run-statistics).
Base: `origin/main`, `f0bdac46dbd018ba11300c800e3dfb0d986fd6a5`.
Status: **increment 1 ready in [PR #365](https://github.com/luminari-gurus/tactics-guru-v2/pull/365); active time/history ready in [PR #368](https://github.com/luminari-gurus/tactics-guru-v2/pull/368); records UI final checks running (2026-11-12)**.
The user authorized implementation, verification and incremental PR publication.

## Live handoff — 2026-11-11

- Clean starting branch at `c6b053d`; fetched origin/main is still the planned base.
- OpenSpec `issue-270-run-statistics`, spec-driven schema, initially 0/9 tasks.
  Run its CLI through WSL Ubuntu (installed Node v24.15.0); Windows PATH does not
  contain npm or OpenSpec. WSL repository:
  `/mnt/c/Users/apexw/OneDrive/Desktop/Projects/Tactics-Guru`.
- Outcome: all AC1–AC8 through the three increments below. Non-goals remain
  combat/balance changes, extra storage/event frameworks and new art.
- Ablation: store only irrecoverable kills/net moves/active milliseconds and one
  bounded receipt; derive exact wins/floors from validated progress. This removes
  redundant persisted counters and their consistency machinery without losing a stat.
- Current files: pure `src/domain/runStats.ts`, existing journey snapshots,
  envelopes, accepted callbacks/owners and focused tests/docs. Proof: reducer and
  compatibility units, legal resume/undo paths, affected persistence consumers and
  `verify:pr` per increment. No implementation acceptance is claimed yet.
- PR #365 is open and ready for review, with `enhancement` labeling. Its coverage
  and remaining acceptance work are posted on #270, which remains open. OpenSpec
  tasks 1.1–1.3 are complete (3/9). Next: qualify and stack active time/history,
  then records presentation and the whole-issue audit. No merge or release occurred.
- Increment 1 qualification is complete at `c4654c6`: final `verify:pr` passed
  in 120.8 seconds (1,319 units, both type scopes/build integrations, bundle and
  all seven core journeys). All 22 extended legal Chromium/WebKit cases and 15
  direct/diagnostic/Qbert isolation cases passed, with one worker and no retries
  or skips. The six selection/batch contract checks passed too. Evidence and
  exact case IDs are in [increment-1.json](../qa/issue-270/increment-1.json);
  raw reports remain under the referenced `verification-receipts/` paths.
  Desktop and touch-portrait screenshots were inspected and retained alongside it.
  This is affected-scope qualification, not a full-regression claim.
- Implemented: optional version-one counters, authored format 10/dungeon format
  12, exact accepted-event callbacks, owner integration, atomic published steps,
  compatible legacy reading and explicit testing-entry gating. Stats-bearing
  backups now rotate complete matching battle/counter snapshots; old draught
  compatibility checkpoints still apply to untracked saves.
- Verification so far: both type scopes and 139 focused tests passed before the
  backup adjustment. First `verify:pr` receipt
  `verification-receipts/pr/1794424875822-103876` failed its units stage (1316/1318):
  the old draught test expected legacy format 9 after an accepted stats upgrade;
  the new complete legal owner journey exceeded its default 5-second unit budget
  under full-suite load. Updated the intended format/backup assertions and gave
  that new legal storage journey 15 seconds (existing equivalent has 20 seconds).
  A focused follow-up caught the old pre-battle checkpoint assertion too; updated
  it to require the exact prior committed battle bytes. Original failures retained.
- Browser environment qualified locally: Windows x64, Node v24.22.1,
  Playwright 1.64.1, Chromium 156.0.8078.4 and WebKit 27.2; report
  `verification-receipts/browser-environment/run-QC1faH/environment.json`.
  WSL is used for OpenSpec only; runtime verification uses native Windows tools.
- Frozen implementation commit: `e7b20c0bb7937d1e1520dd8b33ac898d60ff600a`.
  `verify:pr` passed in 114.6 seconds, receipt
  `verification-receipts/pr/1794425159287-117812`: 1,319/1,319 units,
  both type scopes, both build integrations, root bundle and 7/7 core journeys.
  OpenSpec tasks 1.1–1.2 are complete (2/9); task 1.3 awaits affected browser
  qualification and PR publication. Documentation follow-ups reuse this receipt;
  runtime/test/config/dependency inputs remain unchanged from that commit.
- Running 12 Chromium cases (desktop/Pixel portrait/landscape): the existing
  legal testing and saved-menu dungeon first-floor/descent/backtrack journeys,
  authored undo/reload/defeat and complete authored reward/terminal/restart journey.
  Command: `node node_modules/@playwright/test/cli.js test -c playwright.regression.config.ts tests/run-progression.spec.ts tests/dungeon.spec.ts -g 'run battle undo survives reload|legal run outcomes, earned rewards|saved menu dungeon keeps proof tools hidden|testing dungeon legally clears a floor' --reporter=line,json --output=verification-receipts/issue270/inc1-chromium/artifacts`.
  `PLAYWRIGHT_JSON_OUTPUT_NAME=verification-receipts/issue270/inc1-chromium/report.json`;
  raw log is adjacent `run.log`. Runtime input hashes: `verification-receipts/issue270/inc1-inputs.json`.
  WebKit authored acceptance and dungeon exploration profiles follow serially.
- The 12 Chromium cases passed in 10.0 minutes, and both WebKit authored legal
  reward/terminal/restart journeys passed in 3.0 minutes. Discovery revealed the
  WebKit allowlist omitted the existing undo journey. Added that exact title;
  both portrait/landscape undo/reload/defeat cases then passed (43.2 seconds).
  Reports: `verification-receipts/issue270/inc1-authored-webkit/` and
  `verification-receipts/issue270/inc1-undo-webkit/`. The added selection changes
  no gameplay/build inputs or existing selected cases. Extended direct-route
  spies to assert that run/dungeon snapshots have no stats; qualification pending.
- Parallel preparation (same agent, isolated inputs) lives in
  `C:/Users/apexw/.codex/worktrees/issue-270-active-time-history/Tactics-Guru`,
  branch `branch/issue-270-active-time-history`. Its plan records the active-clock
  and v2 history/bests implementation; 152 focused clock/owner/history tests pass,
  but its browser qualification and PR remain pending. Do not mix those files
  into this counter PR. Merge this branch's final documentation/selector updates
  into that stack before its publication.
OpenSpec: [proposal](../../openspec/changes/issue-270-run-statistics/proposal.md),
[design](../../openspec/changes/issue-270-run-statistics/design.md),
[requirements](../../openspec/changes/issue-270-run-statistics/specs/run-statistics/spec.md),
[tasks](../../openspec/changes/issue-270-run-statistics/tasks.md).
The prior [#176 plan](issue-176-local-records-plan.md) is preserved byte-for-byte.

## Selection and availability

Reviewed all **48 open issues**, their bodies/labels/assignees, relevant comments,
all three open PRs, published branches, merged prerequisite work, repository and
organization projects, native blocking/parent/sub-issue/linked-branch relationships,
and outstanding OpenSpec work. GitHub reports `totalCount: 48`,
`hasNextPage: false`; every nested relationship page was complete. There are no
attached repository Projects v2, organization projects or open-issue project items.
No native blocking edges exist; body dependencies still matter.

**Choose #270**, including it despite the absent `ready for work` label. Its
explicit foundation #176 has just completed through merged #359/#360/#361/#363;
the recording/recovery/replacement implementation is present on main. #153
(menu), #157 (floors), #159 (encounters) and #259 (entry isolation) are closed
and their owning paths are present. #174 is coordination for future reward
counters, not a blocker for existing kills, moves, victories or floor clears.
No published branch or PR claims #270. It adds visible player value to a newly
delivered foundation without changing balance or needing external services.

Complete disposition of the other 47 open issues:

- **Assigned elsewhere:** #85, #128, #161, #162, #184, #200, #208, #219, #254,
  #258, #306, #311. Preserve ownership. Several are delivered implementations or
  investigations awaiting acceptance reconciliation. #311 is actively covered
  by open PR #362; do not mix its ability-rail changes into this task.
- **Epics needing bounded implementation slices:** #170 and #199. #170 explicitly
  requires per-biome issues before coding; #199's remaining work has existing owners.
- **Substantive mechanics/acquisition work:** #167, #168, #169, #171, #173, #174,
  #175. #161 is partially delivered; its open state is not a blanket blocker, but
  push/charge, typed damage, loot policy and their specific consumers remain real
  additional scope. #175 also needs #174's reward/unlock contract.
- **Design/presentation/rules choices:** #178, #180, #181, #182, #185, #261,
  #262, #287. Potential planning candidates, with less direct implementation
  readiness than the concrete follow-up to merged records storage.
- **Explicit product/balance questions:** #301, #313, #320, #323. Do not invent
  defeat/retry, revival, healing or final-floor loot rules while selecting work.
- **Available smaller alternative:** #179, structured combat logs. It is explicitly
  low priority and still needs history/storage scope choices. #270 uses stronger
  existing boundaries and fulfills the planned next layer of records functionality.
- **Merged work covers the reported area:** #291/#330, #292/#333, #296/#344,
  #298/#336, #302/#331, #304/#335, #307/#345, #312/#346. Merge state was checked
  live. #303 overlaps merged #314's contact repair. These need a current residual
  reproduction/acceptance audit before another implementation; they are not
  assumed closed or completely resolved by this planning pass.
- **Mixed polish lists:** #299 and #308; separate remaining UI issues from merged
  fixes and deliberate mechanics before claiming either entire list.
- **Unresolved reproduction/attribution:** #268 and #318. #268 has an investigation
  branch. #318's reported double-penalty diagnosis is not established; current
  sources distinguish Weakened from elevation. Neither is treated as a ready fix.

Other open PRs #12 and #237 concern separately owned deployment tooling and UI
mockups. OpenSpec #127/#153 has historical unfinished acceptance work; preserve
its failures without treating it as newly unassigned implementation. No other
issue is assigned, closed or relabeled by this selection.

## Outcome and definitions

For each admitted menu-origin authored run or dungeon, save an exact, bounded
five-stat summary: **enemies killed, battles won, moves taken, floors cleared and
active playtime**. Show newest 100 journeys plus personal bests, attributed to
their originating journeys, even when a best holder leaves the recent list.

- A move is one accepted hero movement command, independent of path length, or
  one published adjacent dungeon step. Enemy moves and floor travel itself do
  not count. Accepted movement undo removes that move, retaining elapsed time.
- Kills come from enemy `defeated` events, not damage numbers or sprite removal.
  Wins and unique completed floors use validated progress. Authored floors are
  N/A, since the three-encounter run has no dungeon floors.
- Time counts visible, focused ongoing battle and ready dungeon exploration,
  including battle animations/enemy turns. Loading, preparation, rewards,
  terminal screens, menus, paused dialogs, hidden/unfocused pages and closed-app
  intervals are excluded. No speculative inactivity timeout is added.
- Bests are per mode and per applicable stat, using the **maximum**, including
  **longest active playtime**. Include completed/abandoned outcomes. Ties select
  newest recorded time then stable mode/ID order. Keep bounded winning summaries.
- Old records retain known wins/floors. Missing historic kills/moves/time stay
  unavailable; a continued old journey labels new counters as since upgrade.
  Partial fields do not compete as whole-run maxima. Older evicted v1 history
  cannot be reconstructed; show that historical best coverage limitation.

## Source findings and files

- [BattleSession.ts](../../src/app/BattleSession.ts): accepted resolution and
  undo already produce exact domain events before presentation. Extend its
  state-only callback compatibly to expose the current accepted event batch.
  Its standalone-battle consumers must retain identical rules/replay behavior.
- Add `src/domain/runStats.ts` for the pure versioned accumulator, validation,
  accepted-boundary deduplication and stat definitions. No DOM/time reads here.
- [RunItemSession.ts](../../src/app/RunItemSession.ts),
  [DungeonSession.ts](../../src/app/DungeonSession.ts),
  [runBattle.ts](../../src/domain/runBattle.ts) and
  [dungeon.ts](../../src/domain/dungeon.ts): publish stats with accepted state,
  including the final kill before terminal battle removal and save-before-publish
  exploration steps. Rejected spatial saves add no moves.
- [runSaveEnvelope.ts](../../src/domain/runSaveEnvelope.ts) and
  [dungeonSaveEnvelope.ts](../../src/domain/dungeonSaveEnvelope.ts): exact shapes
  and currently supported formats need explicit compatible new versions, with
  stats saved alongside active progress. Keep size/digest/recovery guarantees.
- Add `src/app/ActivePlaytime.ts`, shared by both actual journey owners. Wire
  eligibility/checkpoints in [startRunApp.ts](../../src/app/startRunApp.ts),
  [startDungeonApp.ts](../../src/app/startDungeonApp.ts) and their existing
  [dialogs.ts](../../src/ui/dialogs.ts)/[menuReturn.ts](../../src/ui/menuReturn.ts)
  lifecycle boundaries. Flush before review/freeze/disposal; a timer must not
  invalidate a reviewed replacement token. Use the existing save queues and locks.
- [runRecords.ts](../../src/domain/runRecords.ts),
  [RunHistory.ts](../../src/app/RunHistory.ts) and
  [runRecordsStorage.ts](../../src/persistence/runRecordsStorage.ts): extend
  frozen summaries, pending paired receipts and a bounded personal-best map in
  the existing history store. Preserve first-result-wins and read-only opening.
- [runRecords.ts](../../src/ui/runRecords.ts) and
  [mainMenu.css](../../src/ui/mainMenu.css): extend the existing modal; retain
  recovery actions, focus and responsive readability. Gate tracking with the
  existing [entry.ts](../../src/app/entry.ts)/[routes.ts](../../src/app/routes.ts)
  decision before constructing tracking or touching storage.
- Extend relevant existing unit/browser files and helpers; add focused stats and
  clock unit files. Update [run-records.md](../run-records.md), and retain
  source-bound implementation receipts under `docs/qa/issue-270/`.

## Ablation and non-goals

**Keep:** accepted-event reduction, movement-undo handling, clock pause/flush,
versioned active snapshots/history, legacy partial-data labels, exact terminal
and paired replacement receipts, bounded best-holder summaries, route isolation
and reachable UI verification. Each supplies an explicit #270 acceptance gate;
dropping best-holder retention would incorrectly lose all-time bests at eviction.

**Simplify:** use existing event types and one compatible accepted notification,
existing run/floor identities and command counters for deduplication, existing
save/recovery/locking paths and records modal. Derive exact wins/floors from
validated progress. One injected clock serves two consumers; completed intervals
checkpoint on actions/lifecycle changes and one 5-second active interval.

**Drop:** a new event framework, per-event journal, separate stats storage,
analytics transport, packages/services, historical event reconstruction,
optional class damage totals, generic extension registry, fastest-clear scoring,
new balance/economy behavior, standalone-battle scores and a broader UI redesign.
Document the pure reducer's future granular-stat extension point without building
that future feature. Implementation and incremental PR publication are now
authorized; merge and production operations remain outside this task.

## Implementation increments and acceptance mapping

1. **Persistent accepted counters** — first focused PR, `Refs #270`.
   Add pure stats and compatible stats-bearing active snapshots; wire accepted
   combat/undo/dungeon steps atomically, with tracking disabled on testing entries.
   Land schema/counter tests, resume/undo browser proof and the delivered contract
   documentation with this increment. Covers AC1, the counter portion of AC3,
   active-save compatibility in AC6, AC7's extension note and affected AC8 paths.
   Active time, record projection/bests and final UI remain open.
2. **Active time and frozen history/bests** — depends on increment 1,
   `Refs #270`. Add lifecycle eligibility/clock, compatible v2 history and
   per-mode maxima, integrating terminal/abandoned/paired pending records.
   Land fake-clock, storage/receipt and real reload/modal/replacement/lifecycle
   proof with documentation. Covers AC2, AC4, remaining persistence/once-only
   AC3/AC6 and the corresponding AC8 consumers. Recent/best presentation remains.
3. **Records presentation and final qualification** — depends on 1–2.
   Show all five stats, partial/legacy labels, recent list, best attribution and
   retained winning summaries in the existing modal; land keyboard/touch tests
   and screenshots. Audit every AC1–AC8, including full entry isolation and
   complete legal terminal/replacement journeys. Use `Closes #270` only after all
   eight criteria pass; otherwise `Refs #270` with an explicit remaining list.

Each increment includes its own affected tests/docs and can be reviewed and
verified independently. Keep #270 open through partial delivery and record the
criteria covered, dependencies and remaining work on each PR and the issue.
The OpenSpec tasks contain the executable breakdown and current completion state.

## Proof

For this documentation-only handoff: strict OpenSpec validation, local links and
paths, command/config inspection, archived-plan byte equality, `git diff --check`,
diff review, assignment/comment readback, native branch association and remote
commit parity. No application or browser execution is needed for planning.

Planning validation passed: OpenSpec strict validation, all 30 local links in
the six new/updated review documents, diff whitespace checks and prior-plan Git
blob equality (`cf3d32dd1db967aa9204220068a047da997189f7`). The branch is created
through GitHub's native linked-branch operation for #270; publication and final
commit readback are checked before handoff.

For implementation, follow [verification-policy.md](../verification-policy.md):

- Iterate with the new pure stats/clock units and relevant existing
  `battleSession`, `RunItemSession`, `RunHistory`, `runBattle`, `dungeonBattle`,
  `dungeon`, `exploration`, `runSaveEnvelope`, `runStorage`, `runRecords`,
  `runRecordsStorage` and `menuSaves` unit tests. Preserve domain-boundary checks.
  Cover multi-hit kills, movement undo, duplicate/out-of-order boundary delivery,
  final events, failed spatial writes, stale callbacks, max bounds and RNG parity.
- For each increment's frozen inputs, run `npm run verify:pr` (all fast units,
  both type scopes, root/prefix build integrations, build and seven core journeys).
  Include the entire affected storage/envelope/session family because active
  save admission changes. Keep all original failures and reused evidence explicit.
- Extend existing `main-menu.spec.ts`, `run-progression.spec.ts`, `dungeon.spec.ts`,
  `dungeon-exploration.spec.ts` and `dungeon-lifecycle.spec.ts` where their existing
  helpers support the real path. Discover before running with
  `npm run test:regression -- --list`,
  `npx --no-install playwright test -c playwright.device-acceptance.config.ts --list`
  and `npx --no-install playwright test -c playwright.exploration.config.ts --list`.
  Match the actual added titles, update explicit acceptance grep only if needed,
  and verify new cases enter the owning broad/special matrices and batch manifest.
- Execute affected desktop Chromium and native-touch portrait/landscape cases,
  plus both WebKit acceptance orientations and relevant dungeon WebKit profiles.
  Retain a complete legal authored victory/defeat and dungeon terminal journey,
  real undo/reload/Continue, final-kill counting, first-floor/descent/backtrack,
  terminal Continue, admitted unsaved play and both paired replacement identities.
- Use fake monotonic clocks and visibility/focus transitions for exact time
  accounting; add actual normal navigation/reload, hidden-tab, paused-dialog,
  disposal and Chromium BFCache witnesses. Never claim synthetic pagehide as
  real BFCache or Chromium evidence as WebKit lifecycle proof.
- Exercise legacy active formats/history, pending single/paired receipts, corrupt
  and future bytes, backup recovery, read/write/readback denial, cross-tab conflicts,
  history retention beyond 100, tied maxima and explicit history reset. Test clock
  checkpoints racing review, delayed writes and terminal/replacement freeze.
- Extend existing `testing routes:` storage spies across every direct route and
  diagnostic entry, including `/run`, `/dungeon`, `/battle`, `/map` and `/qbert`.
  Menu-origin journeys must track; these entries must not construct tracking or
  read/write active saves/history. Stats must not alter gameplay/RNG/replay.
- Retain exact source/build inputs, commands/config/project/test IDs, browser/OS,
  workers 1, retries 0 and raw reports/screenshots. Use qualified self-hosted browser
  capacity and existing per-runner concurrency groups; no automatic hosted fallback.
  Reuse unchanged audio/telemetry/render evidence only with documented equivalence.
  Widen verification only for actual affected consumers or failures, not merely
  because this is a save-format change. Do not claim a full-regression run from
  this affected-scope qualification.

Playwright/device emulation is sufficient under AGENTS.md. Physical testing was
not requested or performed. Local `CAN_TEST_MOBILE=android` declares access only;
it does not certify a device or reserve self-hosted capacity.

## Estimate, questions and risks

**My estimate: 6–9 hours of implementation, verification and PR preparation**
for the complete issue, approximately 2–3 hours for the first increment. This
excludes CI queue time, human review and unrelated environment failures. The
main uncertainty is lifecycle/write ordering and compatibility fixtures, not
the stat arithmetic. Re-estimate if the implementation exposes a wider real
consumer than the inspected paths.

**No blocking unanswered question.** The plan explicitly proposes longest active
duration, one move per hero command/exploration step, per-mode maxima, 100 recent
entries and honest legacy partial-data coverage. These are reviewable defaults,
not claims of previously approved product decisions. Requested revisions can be
folded into this concrete plan before implementation.

Known limits: abrupt browser/process termination or storage refusal can lose
uncommitted progress; keep the existing unsaved/recovery behavior and never add
closed time to hide it. Reverse compatibility with older application versions
after writing newer saves is not promised. Pre-upgrade evicted records and past
active time cannot be recovered from data that never stored them.

## Increment 2 workspace — 2026-11-11

Branch `branch/issue-270-active-time-history`, based on counter branch `41bc3cd`,
in `C:/Users/apexw/.codex/worktrees/issue-270-active-time-history/Tactics-Guru`.
The original workspace continues increment-1 browser qualification unchanged.
Outcome: eligible active time plus frozen records/bounded all-time maxima; existing
clock/save/history owners remain the integration points. No new event journal,
storage key, inactivity heuristic or gameplay policy. Files: `ActivePlaytime.ts`,
both session/app owners, existing records model/storage and their focused tests.
Proof: injected-clock tests, review/queued-save races, records compatibility,
retention/replacement units, affected lifecycle/browser journeys and `verify:pr`.
Current work: clock/history implementation is complete; browser qualification and
the increment-2 PR remain pending. Counter PR #365 is its dependency.

Implementation update: the injected clock, lifecycle/dialog/navigation eligibility,
quiet 5-second checkpoints and final queued-save disposal are wired into both
owners. Authored review waits for the existing save queue in a cancelable paused
dialog, then reads exact bytes; Cancel resumes play without waiting for a held
browser lock. Same-origin normal navigation flushes before leaving. No timestamp
is persisted between processes. These paths still need real browser qualification.

History v2 is implemented in the existing keys: frozen version-one summaries,
bounded per-mode maxima and retained winner summaries, max duration, newest/stable
ties, partial-field exclusion and lazy v1 reading with an explicit historical
coverage flag. Existing receipt/replacement reconciliation carries the frozen
summaries. Reads and old pending receipts remain read-only; Reset clears maxima.
Iteration found two expected old-test mismatches (v2 was previously classified as
future; legacy reads previously returned v1 instead of normalized v2) and a typed
max-size fixture still constructing v1. Updated those expectations/fixture, keeping
exact old bytes and no-opening-write assertions. The 34-test records/history
follow-up and the 60-test combined records/owner follow-up passed; both type scopes
pass. New eviction/tie/partial/getter/immutable/paired recovery tests are included.
No increment-2 OpenSpec checkbox or PR readiness is claimed yet. Next: finish
clock/lifecycle and terminal/replacement browser evidence, then `verify:pr`,
document actual failures/results and publish the stacked increment promptly.

Fresh increment-2 evidence: all 1,329 units passed at `7ab6000`, report
`verification-receipts/issue270/inc2/units-first.json`; the ordinary production
build and both type scopes passed (`inc2/build-first.log`). The two desktop
clock browser cases passed in 7.6 seconds using that build, report
`verification-receipts/issue270/inc2-clock-desktop/report.json`: exact 5-second
active checkpoints, 60-second paused/hidden/blur exclusions, actual menu departure
and Continue, and no menu-session time. Hidden/blur were synthetic lifecycle
changes with a fake browser clock, not an actual background-tab claim.
The parent counter branch through `49ad112` has been merged into this branch;
the new authored clock case is included in both WebKit acceptance orientations.

Clock qualification follow-up: first native-background Chromium attempt failed
because Playwright 1.64.1 forces focus/visibility. Disabling only its Chromium
focus emulation via CDP made both real tab-switch cases pass; the full three-profile
Chromium clock matrix then passed 12/12 in 23.5 seconds. WebKit also forces
`Emulation.setActiveAndFocused` internally and exposes no equivalent public CDP
session. Its two owning configs explicitly exclude these **new** native-focus
cases; they retain fake visibility/focus plus actual navigation/Continue, and no
WebKit-native-tab claim is made. Existing cases remain selected; no runtime skip
or assertion weakening is used.

The first WebKit clock run additionally caught a real 26-ms review-handoff gap:
closing the temporary save dialog resumed time in a microtask before the real
review opened, allowing a queued write to drift its token. The authored app now
keeps that paused modal open until the caller replaces it or navigates. Failed
reports remain in `inc2-background-desktop/` and `inc2-clocks-authored-webkit/`;
the source fix and all engine-specific clock checks are being requalified.

Review/cache follow-up: the held-write Cancel and paused replacement token cases
pass. The native BFCache record-history case needed its byte baseline taken after
exploration time was flushed into a paused recovery review; cancel/restore still
preserves that exact reviewed snapshot. The original history-return/replacement
assertions are retained, and a separate normal-navigation case explicitly asserts
native `pageshow.persisted`.

A focused literal-parent comparison is retained under `cache-literal-base/` and
`cache-current/`, with source `docs/qa/issue-270/cache-comparison-witness.ts`.
Parent `49ad112`: typed and normal-link departures both used native BFCache (2/2).
Current: normal-link departure used BFCache and preserved replacement bytes;
unflushed programmatic/hard departure reloaded instead (1/2 for that exploratory
native-cache assertion). The browser reports a masked non-restoration reason;
queued final checkpoint locks are the likely cause, not a proven browser reason.
Do not claim native caching for every hard departure: only the normal flushed
navigation witness proves it. Both restore mechanisms preserve newer saved data.
Keep this failed exploratory attempt and the normal-path proof explicit; no
second lifecycle journal or unlocked write is added to force browser caching.
The six required review/cache desktop cases now pass in 14.8 seconds, report
`verification-receipts/issue270/inc2-review-cache-repair/report.json`.

Latest clock boundary repairs: a focused failing unit reproduced save-status
rendering re-entering eligibility and resuming an in-progress pause. The shared
observer now guards synchronous publication; its negative run is retained as
`inc2/reentrant-pause-failure.log`, with the repaired 153-test family run retained.
Accepted exploration steps now checkpoint elapsed time in the saved candidate.
If spatial saving fails, elapsed time stays in memory as unsaved, with no ghost
move; the next accepted retry preserves the accumulated interval. A focused unit
covers that save/refusal/retry sequence. Clock flush fences also skip a second
identical write, preserving the preceding backup instead of rotating it twice.
The final focused clock/session family passes 115 tests; both type scopes pass.

All four desktop paired saved/unsaved replacement variants passed with explicit
nonzero saved statistics and each live identity's own stats, including interrupted
pending recovery (`inc2-paired-desktop/report.json`, 14.3 seconds). The original
seed-13 authored witness is confirmed as three player victories; final tests now
assert the earned victory, exact event-derived totals, frozen positive duration
on both victory and defeat, and all five dungeon maxima after a legal clear,
descent/backtrack and confirmed abandonment. Full affected engine qualification
and final verify:pr follow on the frozen inputs before publishing this increment.

Final durability feedback repair: a failing unit reproduced a coalesced clock
write saving the current snapshot while leaving the older `Saving run…` message
visible. Quiet writes now publish meaningful pending/error-to-saved transitions
while keeping ordinary healthy checkpoints quiet. Dungeon clock recovery likewise
clears stale unsaved feedback. Negative/positive runs are retained under
`inc2/coalesced-status-failure.log` and `inc2/coalesced-status-repair.log`.

Local command route for continuation: PowerShell tools use native Windows Node;
prepend `C:/Users/apexw/.codex/tmp/issue270-node-tools` to PATH for npm/npx. Those
local launchers invoke the installed WSL npm CLI using native Node, and the old
node_modules/.bin Node shims were repaired to the current installed runtime.
Use WSL Ubuntu for OpenSpec only. All test/build identities and browser versions
remain recorded in the receipts; no unrelated .env values were read or copied.

Frozen runtime `9e2d7cc` passed verify:pr in 120.7 seconds (1,333 units and all
seven core journeys). The affected Chromium batch retained 72/78 passing cases in
8.7 minutes, including legal authored victory/defeat with frozen exact totals,
legal dungeon clear/descent/backtrack/abandonment with five maxima, paired stats,
clock, recovery and native-cache cases. Six failures were two existing lifecycle
tests across three profiles: reload legitimately saved ~335 ms of new exploration
time, and a reset assertion read the old defeat before asynchronous replacement
finished. The tests now checkpoint/pause before exact reload comparison (while
requiring all non-time fields unchanged) and await the acknowledged new identity
and map. No runtime change, retry, skip or timeout increase was needed. Retain the
original `inc2-qualified-chromium/report.json`; fresh six-case repair plus WebKit
qualification follows. Do not call that original batch a clean passing suite.

2026-11-12 handoff repair: WebKit's held-checkpoint case caught a real confirmation
race: closing the confirmation could resume a pending enemy turn during history
preparation, so the current-snapshot guard correctly refused replacement. Both
journey apps now reuse `DialogChoice.keepOpen` and keep a native progress modal
open until the old scene stops and replacement finishes; no engine/input framework
was added. The original failing WebKit report is retained. All 16 focused repair
cases passed (9 Chromium, 4 authored-WebKit, 3 dungeon-WebKit), including a new
staged valid player-to-enemy dungeon boundary held behind a native history lock.
Clock task 2.1 was reopened for that integration repair and is complete again;
OpenSpec is 5/9. History model task 2.2 remains complete; PR publication task 2.3
awaits final affected qualification and source-bound receipt publication.

Requalification is proportional: new confirmation/handoff, reset, cache and
replacement consumers rerun on the final UI change. The previously passing earned
counter/terminal portions of the long journeys remain reusable: no domain,
accumulator, session, history, content, asset or dependency inputs changed; their
frozen summaries were produced before the changed post-record confirmation UI.
Fresh short terminal/live replacement journeys and core checks cover that changed
UI boundary. The original 78-case run remains 72 passing / 6 failed, with a clean
six-case test repair recorded separately; it is never relabeled fully green.

Cleanup note: automatic approval review rejected removal of the clean temporary
literal-base comparison worktree with `blocked by policy`; it remains intact at
`C:/Users/apexw/.codex/worktrees/issue-270-cache-base/Tactics-Guru` (detached
`49ad112`, no running service). Its temporary test file was already removed, and
reports/witness source remain in this feature workspace. Do not retry cleanup via
another shell or a recursive-delete workaround. This is retained diagnostic
state, not a feature or PR-readiness blocker.

2026-11-12 inter-increment migration audit (required before PR 2 publication):
The counter-only #365 writer stores stats v1 with reserved `activeMs: 0` and whole
kill/move coverage. Treating that same v1 as fully timed would fabricate complete
historic zero playtime if #365 merges before the clock increment. Timed stats
therefore need v2 with a separate `timeCoverage` flag: preserve known kill/move
coverage, mark older time since upgrade, and exclude only partial time from its
maximum. New active envelopes become run 11 / dungeon 13, retaining counter-only
10 / 12 and all earlier readers. Validate the old run digest against its raw v1
payload before in-memory normalization; opening remains read-only.

Next: add literal #365 counter-only fixtures, implement stats-v2 compatibility,
per-field best eligibility and UI labels; update both OpenSpec design and the
compatibility scenario; then run affected units/core and focused migration/clock/
records proof. Existing numeric/event/RNG/eligibility witnesses remain useful for
unchanged obligations, with explicit input equivalence; do not call the current
v1-clock implementation publication-ready until this migration is fixed. The UI
worktree must merge this new version and update its typed fixtures/time-only
partial presentation. No first-PR runtime change is needed.

Migration implementation: timed stats v2 now separate counter coverage from
`timeCoverage`, use run 11 / dungeon 13, and accept literal counter-only 10/12.
Fixtures were generated by actual #365 commit `49ad112` with one legal battle:
run 3 kills/4 moves and dungeon 3 kills/5 moves, both reserved zero time. Exact
legacy digest/read/roundtrip tests, read-only Continue and per-field best tests
pass in the 191-test focused family. Earlier nested v1 summaries remain readable
without retaining unproven complete-time maxima. A new browser migration witness
covers both modes: read-only admission, known counters, accepted mutation/reset,
frozen partial time and exclusion only from duration bests. First run: 6/6
Chromium, 3/4 WebKit; the last test polled an absent history slot before async
replacement finished. It now waits for the new identity and safely polls pending
history, retaining the original failed report. Fresh final migration reports are
`inc2-counter-upgrade-chromium-final` and `inc2-counter-upgrade-webkit-final`.

## Active time/history ready — 2026-11-12

The migration audit above is resolved at `8fee762db48b469df763cdddbe9c180a99db9c4c`.
Timed stats v2 separate counter coverage and time coverage; literal #365 saves
keep complete known counters while elapsed time starts since upgrade. New envelopes
are authored 11 / dungeon 13; older supported readers and read-only admission remain.
OpenSpec tasks 2.1 and 2.2 are proven again (5/9); publication completes 2.3.

Final `npm run verify:pr` passed in 127.5 seconds: 1,339 units, both type scopes,
root/prefix build integrations, bundle and 7 core browser journeys. Receipt:
`verification-receipts/pr/1794441623848-109888/summary.json`. Fresh timed-v2 coupled
browser matrices passed 42 Chromium + 18 authored WebKit + 6 dungeon WebKit cases,
with one worker, no retries or skips. Final literal-upgrade witnesses passed 6
Chromium + 4 WebKit cases. Earlier 118 qualified handoff/lifecycle cases and 13
passing earned-progression portions remain scoped to unchanged numeric/event/
eligibility behavior. This does not relabel the earlier failed broad batches as
clean runs or claim their v1 bytes were current timed-v2 proof.

Source identities, commands, exact cases, compatibility boundaries, prior failures
and limitations are retained in [increment-2.json](../qa/issue-270/increment-2.json).
The final records UI is a dependent branch and still needs its current 15-case
keyboard/touch/WebKit proof plus 75-case direct/diagnostic isolation audit. No
merge, release, deployment or tag is needed for these review-ready increments.

Publication: [PR #368](https://github.com/luminari-gurus/tactics-guru-v2/pull/368) is open, ready, labeled enhancement and stacked on #365. Issue #270 records coverage and remaining work. Six selection/batch contracts passed in 67.9 seconds. OpenSpec task 2.3 is complete (6/9). Next: finish UI/isolation proof and open the final dependent PR.


## Review repairs — 2026-11-12

The dungeon transaction race, failed-flush navigation and removed-save recreation are fixed. The stack is rebased onto main at 450dfeb, with wall-aware counter/timed envelopes 16/17 and existing fog recovery preserved. Local source-bound qualification and retained failures are in [review-368.json](../qa/issue-270/review-368.json). All session/storage inputs in the final UI qualification match this parent. Merge #365, then #368, then #369; keep #270 open until the reviewed stack merges. Original heads are preserved in local backup refs; each PR carries one focused commit. No release tag or deployment is part of this handoff.
