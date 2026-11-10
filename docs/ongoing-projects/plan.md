# Issue #176 — Device-local Hall of Records

Date: 2026-11-10 (Asia/Jerusalem). Assigned to @moshehbenavraham.
Issue: [#176](https://github.com/luminari-gurus/tactics-guru-v2/issues/176).
Related follow-up: [#270](https://github.com/luminari-gurus/tactics-guru-v2/issues/270).
Branch: [`branch/issue-176-local-records`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-176-local-records).
Authored branch: `branch/issue-176-authored-records` / PR #360, based on the
review-ready first increment at `7d73d35`.
Current implementation branch: `branch/issue-176-dungeon-records`, based on
qualified PR #360 at `c79146e`; PR #361 targets that authored branch.
The first two increments are ready for review; continue final acceptance here.
Base: `origin/main`, `491f92a080d8577aca882c3e48ddaf910cf30369`.
OpenSpec: [proposal](../../openspec/changes/issue-176-local-records/proposal.md),
[design](../../openspec/changes/issue-176-local-records/design.md),
[requirements](../../openspec/changes/issue-176-local-records/specs/run-records/spec.md),
[tasks](../../openspec/changes/issue-176-local-records/tasks.md).

**Status:** implementation authorized on 2026-11-10. The caller requested autonomous
implementation, verification, commits/pushes and focused labeled PRs as each chunk
is ready, stacking dependent increments. Using OpenSpec change `issue-176-local-records`;
9/9 implementation tasks complete and verified. Review-only delivery; no PR merge or deployment.
The previous plan is preserved byte-for-byte in
[the #316 handoff](issue-316-mage-acceptance-fixtures-plan.md).

## Selection and backlog coverage

Reviewed all **49 open issues**, including bodies, labels and assignees; relevant
comments; both open PRs; published branch heads; main history; native dependency,
parent/sub-issue and linked-branch relationships; and outstanding OpenSpec tasks.
GitHub's issue connection reports `totalCount: 49`, `hasNextPage: false`.
There are no attached repository Projects v2 or issue project items. No native
blocking edges were present, so body prerequisites were checked separately.

Choose #176: it is unassigned, genuinely absent in current code, has concrete
acceptance criteria, and establishes storage/terminal boundaries explicitly
needed by #270. #157 (floors), #159 (encounters), #153 (menu) and #259 (route/save
isolation) are closed/completed and their implementations are present on main.
#174 is coordination for future currencies, not a prerequisite for recording
existing progress. Neither a parent epic nor completion of every parity feature
is an eligibility gate. Selection considered issues without `ready for work`.

Complete disposition of the other 48 items:

- **Assigned elsewhere:** #85, #128, #161, #162, #184, #200, #208, #219, #254,
  #258, #306. Preserve ownership. Several are implemented investigations or
  acceptance follow-ups, rather than fresh implementation work; #208 is blocked.
- **Larger work requiring a bounded first slice:** #170 (biome packs), #199
  (DevOps epic). #170 itself requires a separate bounded pack issue before coding.
- **Mechanics, acquisition, or reward contracts to settle with actual consumers:**
  #167, #168, #169, #171, #173, #174, #175. The partially delivered #161 is not
  treated as a blanket blocker; the missing push/charge/damage/loot behavior is
  the actual additional scope.
- **Design, presentation, or rules choices remain:** #178, #180, #181, #182,
  #185, #261, #262, #287. These can be planned, but offer a less direct bounded
  implementation than #176; existing readiness labels do not resolve choices.
- **Product/balance decisions:** #301, #313, #320, #323. These reports explicitly
  leave intended behavior open; do not invent revival, healing or loot policy.
- **Available smaller alternatives:** #179 (structured logs; explicitly low
  priority), #311 (direct ability buttons; low-severity UX). Neither supplies
  #270's documented storage dependency. #270 can follow this foundation; its
  duration ranking and full accumulator remain its own scope.
- **Existing merged changes cover the reported area:** #291/#330, #292/#333,
  #296/#344, #298/#336, #302/#331, #304/#335, #307/#345, #312/#346. These need
  acceptance reconciliation before another implementation is selected. #303
  overlaps merged #314's encounter-contact work; verify any residual crossing
  case before treating the original report as new work.
- **Mixed polish lists:** #299, #308; separate remaining items from their merged
  fixes and deliberate mechanics rather than claim the whole list as one patch.
- **Unresolved reproduction/attribution:** #268, #318. #268 has a published
  investigation branch. Current `combatStats` applies Weakened once and
  `previewAttack` separately applies elevation; #318's double-penalty diagnosis
  is not established by source inspection. No issue is closed or relabeled here.

Open PRs #12 (restricted SSH deployment) and #237 (combat UI mockups) are drafts
owned by @dubstylee and do not implement records. Stale OpenSpec acceptance tasks
for #127/#153 are historical evidence to reconcile, not new unclaimed issues;
this plan does not erase their recorded failures.

## Outcome

The existing Hall of Records menu shows the newest device-local summaries of
saved authored runs and dungeons. Each admitted journey has at most one immutable
record at real victory, defeat, or confirmed replacement of an unfinished run.
Continued dungeon descent is still the same journey. History is bounded, versioned,
recoverable, and independent of active-save storage.

Initial counters are deliberately limited to exact facts already retained:
`battlesWon` for both modes, and `floorsCleared`/`deepestFloor` for dungeons.
Authored runs use null/not-applicable for floor fields. Compute authored wins from
encounter index and phase; compute dungeon wins/cleared floors from distinct
saved cleared slots and deepest floor from the visited floor descriptors, not
current depth. Do not fabricate zero-valued currencies or unavailable counters.

## Source findings and files

- [mainMenu.ts](../../src/ui/mainMenu.ts) already owns the modal, focus return,
  New Game review/handoff and records placeholder. Replace only that placeholder
  and add a small `src/ui/runRecords.ts` renderer, reusing `mainMenu.css`.
- [RunItemSession.ts](../../src/app/RunItemSession.ts) owns accepted battle
  completion, terminal resume, serialized writes and reviewed replacement.
  [startRunApp.ts](../../src/app/startRunApp.ts) owns entry and replacement UI.
- [DungeonSession.ts](../../src/app/DungeonSession.ts) owns accepted outcomes,
  validated continuation and two-slot replacement.
  [startDungeonApp.ts](../../src/app/startDungeonApp.ts) consumes the menu handoff.
  Main-menu confirmation alone is not a successful replacement.
- [routes.ts](../../src/app/routes.ts) and [entry.ts](../../src/app/entry.ts)
  already gate persistent menu-origin journeys. Testing entries pass null storage.
  Gate history before constructing an adapter or touching storage too.
- [run.ts](../../src/domain/run.ts), [dungeon.ts](../../src/domain/dungeon.ts)
  and [exploration.ts](../../src/domain/exploration.ts) supply validated progress.
  Add `src/domain/runRecords.ts` for bounded validation and pure projection only;
  timestamps come from the application, not domain entropy.
- Add `src/persistence/runRecordsStorage.ts`: one records-specific local-storage
  adapter using the existing injected-provider/readback patterns and browser-lock
  pattern from [runStorage.ts](../../src/persistence/runStorage.ts).
  Existing active run/dungeon envelope readers and keys remain compatible.
- Extend existing session, envelope, menu, run and dungeon tests. New record-model
  and storage unit files are justified by the new behavior; reuse existing browser
  files/helpers and configured matrices. Document the delivered contract in
  `docs/run-records.md` and source-bound receipts in `docs/qa/issue-176/README.md`.

## Ablation and non-goals

**Keep:** stable identity, immutable summaries, actual accepted boundaries,
duplicate prevention, retention, recovery, route isolation and reachable UI proof.
Removing any loses an explicit #176 gate. Keep a bounded pending/closed receipt
for the current journey of each mode because two-slot replacement can partially
fail and a terminal save can outlive retained history.

**Simplify:** derive existing counters from validated progress instead of adding
an event accumulator or changing active-save formats. Use the existing menu modal,
providers, validation and locking patterns. History has one implementation shared
by the two real run consumers, with small mode-specific projections.

**Drop:** new packages/services, a generic analytics/event framework, active
playtime, moves/kills/damage accounting, personal-best aggregation, music, economy,
balance/defeat-policy changes, standalone-battle records, save import, and broad
UI redesign. #270 still owns its full five statistics, recent/best presentation,
undo semantics and extensible accumulated stats. No production operation is planned.

## Delivery and acceptance mapping

1. **Record model, storage and menu (first PR; `Refs #176`).** Versioned immutable
   records keyed by mode plus existing run ID, bounded inputs, newest-first order
   with a stable tie-break, and retention of 100 summaries. Implement honest empty,
   degraded and unavailable states in the existing menu. Preserve corrupt/unknown
   bytes; explicit reviewed export/reset affects records only. This meets AC1,
   AC3/AC4 and the storage/UI portion of AC5. End-to-end recording remains open.
2. **Authored-run recording (second PR; `Refs #176`).** Record accepted victory,
   defeat and confirmed replacement; repair a missed terminal write on explicit
   Continue, idempotently. Snapshot the reviewed old journey before replacing it;
   pending replacement is finalized only when the replacement is accepted.
   Cancel, stale review, failed replacement, rendering, pagehide and menu return
   never manufacture an abandonment. This covers authored-run AC2 and its AC5
   repeated-callback/resume/failure proof. Dungeon acceptance remains open.
3. **Dungeon recording and final qualification (third PR).** Integrate defeat and
   confirmed replacement with the same store. A boss win, three cleared slots,
   stairs, revisiting a floor or returning to the menu never completes the endless
   run. Cover the root-menu New Game handoff as well as in-flow replacement.
   This finishes dungeon AC2/AC5 and the complete AC1–AC5 audit. Use `Closes #176`
   only if every gate is verified; otherwise use `Refs #176` and list what remains.

Keep #176 open between increments, with each PR's criteria, remaining scope and
dependencies recorded on the issue. #270 remains unassigned and open throughout.
The [design](../../openspec/changes/issue-176-local-records/design.md) specifies
receipt ordering, recovery and retention details; all nine tasks are complete; retained source-bound proof and the final audit are linked below.

## Proof

Planning checks: strict OpenSpec validation, local link/path checks, command/config
inspection, archived-plan blob equality, diff review and remote branch/issue
readback. Documentation-only planning does not require application/browser reruns.

During implementation, follow [verification-policy.md](../verification-policy.md):

- Iterate with new model/storage units plus affected `RunItemSession.test.ts`,
  `runBattle.test.ts`, `dungeon.test.ts`, `exploration.test.ts`, `menuSaves.test.ts`
  and run/dungeon save-envelope coverage in `tests/unit`.
  Cover immutable duplicate IDs, conflicting terminal candidates, all phases,
  unique-floor counts, 100-entry eviction, bounded receipts, corrupt/future data,
  failed read/write/readback, stale reviews and successful/failed/canceled replace.
- Run `npm run verify:pr` for each increment's frozen relevant inputs: all fast
  units, both type scopes, root/prefix build integrations, build and seven core
  journeys. Add all affected storage/envelope/session units as the persistence
  policy requires. Keep failure and reused-evidence identities explicit.
- Discover focused selections before executing them:
  `npm run test:regression -- --list`;
  `npx --no-install playwright test -c playwright.device-acceptance.config.ts --list`;
  `npx --no-install playwright test -c playwright.exploration.config.ts --list`.
  Filters must actually select new records cases, not silently run zero.
- Execute new records/menu and affected run/dungeon/replacement cases on desktop
  Chromium and native-touch portrait/landscape, plus relevant WebKit menu/run and
  dungeon cases. Retain complete legal authored-run and dungeon defeat witnesses,
  exact terminal reload/Continue, repeated callbacks, partial replacement failures,
  continued descent/backtracking and current primary/backup byte preservation.
- Extend `testing routes:` witnesses to spy on records-key reads/writes as well as
  active-save keys across every direct route and diagnostic entry. Menu-origin
  games must record; direct `/run`, `/dungeon`, `/battle`, `/map`, `/qbert` and scene
  diagnostics must not touch records. Standalone battles do not create run records.
- On final inputs retain command/config/project IDs, source/build identity and
  raw reports/screenshots. Preserve actual failures and incomplete runs. Use the
  existing qualified self-hosted VM and per-runner concurrency group, workers 1,
  retries 0; no automatic hosted fallback. Reuse unchanged engine/audio/telemetry
  evidence only under the policy; run new broader checks only for demonstrated
  affected behavior. A new bounded history write does not itself require full
  performance recertification or the entire full-regression matrix.

Physical-device testing was not requested. Playwright device emulation is sufficient
under AGENTS.md. Local `CAN_TEST_MOBILE=android` describes access only; no physical
test was performed. Both registered self-hosted VMs were online/idle at planning;
recheck capacity at execution. This is not a reservation or future-availability claim.

## Final handoff — 2026-11-10

Issue #176 is fully implemented and verified as three focused stacked PRs:

1. [#359](https://github.com/luminari-gurus/tactics-guru-v2/pull/359): immutable model, bounded history storage/recovery and existing records menu.
2. [#360](https://github.com/luminari-gurus/tactics-guru-v2/pull/360), based on #359: authored victory/defeat, terminal Continue and confirmed replacement.
3. [#361](https://github.com/luminari-gurus/tactics-guru-v2/pull/361), based on #360: dungeon endings, root-menu handoff, continued descent, concurrent confirmation and complete acceptance.

All are review-only changes with enhancement/medium-risk classification. Keep
#176 open until the reviewed stack merges. The final PR uses Closes #176 because
every acceptance criterion is proven; earlier increments retain Refs #176.
#270 remains separate for its five full statistics, active playtime and best-run
aggregation. No PR merge, release tag or production operation is authorized.

### Verification and retained limits

- Qualified functional head: 003be9b; clean tested merge: 6dd0e291.
- Standard verification 42845257864 passed 1,279 units, both TypeScript scopes,
  both root/prefix build integrations, production build and seven core journeys.
- Authored qualification 42833420673 passed 65 cases, including complete
  three-encounter victories on all five selected Chromium/WebKit profiles,
  separate legal defeat, immutable reload/Continue/restart and entry isolation.
- Final 83-case acceptance is accounted across 62 retained passes from failed
  capture 42840048098 and 21 fresh passes in 42845257735 attempt 2. It is not a
  clean single 83-case run. The original three failures remain failures. Only one
  assertion's position changed in the re-executed full-floor case; all production,
  helper, config and other case bodies stayed unchanged. All fresh cases retain
  original deadlines, workers 1 and test retries 0.
- Full-health dungeon defeat and complete first-floor/guardian/descent/backtrack
  witnesses passed on three Chromium and three WebKit profiles. Concurrent native
  root-menu confirmations, actual Chromium BFCache, history export/recovery and
  testing-route isolation passed. Browser device emulation is sufficient under
  AGENTS.md; physical devices and WebKit BFCache are not claimed.
- Real discovery/batch contracts preserve all profiles, nine file partitions and
  the approved 24 equivalence mappings. Thirty checks passed on Windows; the
  unchanged POSIX guard required sh and passed separately under WSL. Prior CPU
  timeouts under overlapping host work are retained; controlled runs passed
  without raising limits, not as a general claim of a repaired physical host.

[QA and acceptance mapping](../qa/issue-176/README.md),
[authored evidence](../qa/issue-176/increment-2.json), and
[final evidence](../qa/issue-176/increment-3.json) retain exact source/build IDs,
case identities, raw report hashes, environment, failed/incomplete runs and reuse
comparisons. Raw artifacts remain under the caller checkout's ignored
`tmp/issue-176/`; upstream CI artifact retention is 14 days. The 1.04 GB failed
trace archive remains upstream; source/results/error contexts were selectively
retained locally with per-file hashes.

### Continuation

OpenSpec issue-176-local-records has all nine tasks complete. Do not reselect
another issue or repeat unchanged green suites. Review/merge is the next step;
archive/sync OpenSpec only after acceptance and merge. All functional tests remain
in their explicit matrices and documented CLI commands. The task-only workflow
is retired after qualification; standing CI and the seven core selections remain.

The final documentation/workflow-retirement commit preserves functional inputs,
so the qualified evidence above remains valid under verification-policy.md.
Use branch/issue-176-dungeon-records as the complete frontier. The caller's main
checkout is handed back on that branch; the temporary dungeon worktree can remain
detached at the same final commit for retained receipts. The original estimate
was 4–6 hours including verification and preparing these PRs; the completed scope
is unchanged. No new dependency or active-save migration was introduced.

### November 10 independent merge review

PR #359 merged as `39d461f` after fresh local units/types/builds and 20
Chromium/WebKit menu checks. PR #360 incorporates that main merge, preserving
stack ancestry. Its review reproduces and repairs encounter entry during the
final replacement write, terminal-history loss during unsaved/lock-denied play,
and preparatory feedback invalidating the startup review token. The latter
minimal fix is carried forward from #361 so this increment stands alone.
The existing session, history adapter and regression harnesses cover these
repairs; no additional abstraction, save format or rule change is needed.
Original failed review regressions remain under `tmp/issue-176-review/360/`;
the QA document records final verification before merge. Dungeon review and
full issue closure remain on #361 until its independent review is complete.
