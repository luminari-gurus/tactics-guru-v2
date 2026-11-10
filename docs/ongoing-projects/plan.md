# Issue #176 — Device-local Hall of Records

Date: 2026-11-10 (Asia/Jerusalem). Assigned to @moshehbenavraham.
Issue: [#176](https://github.com/luminari-gurus/tactics-guru-v2/issues/176).
Related follow-up: [#270](https://github.com/luminari-gurus/tactics-guru-v2/issues/270).
Branch: [`branch/issue-176-local-records`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-176-local-records).
Current implementation branch: `branch/issue-176-authored-records`, based on the
review-ready first increment at `7d73d35`; its PR will target the branch above.
Authored implementation and qualification are now complete in PR #360.
Continue remaining dungeon/final acceptance work on the
[frontier plan](https://github.com/luminari-gurus/tactics-guru-v2/blob/branch/issue-176-dungeon-records/docs/ongoing-projects/plan.md)
in `C:/Users/apexw/.codex/worktrees/issue-176-dungeon/Tactics-Guru` (PR #361).
Base: `origin/main`, `491f92a080d8577aca882c3e48ddaf910cf30369`.
OpenSpec: [proposal](../../openspec/changes/issue-176-local-records/proposal.md),
[design](../../openspec/changes/issue-176-local-records/design.md),
[requirements](../../openspec/changes/issue-176-local-records/specs/run-records/spec.md),
[tasks](../../openspec/changes/issue-176-local-records/tasks.md).

**Status:** implementation authorized on 2026-11-10. The caller requested autonomous
implementation, verification, commits/pushes and focused labeled PRs as each chunk
is ready, stacking dependent increments. Using OpenSpec change `issue-176-local-records`;
6/9 implementation tasks complete on this branch. No merge or deployment is authorized.
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
receipt ordering, recovery and retention details; all implementation tasks remain
unchecked until work and proof actually complete.

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

## Estimate and handoff

### Increment 1 progress — 2026-11-10

- Model/projections and bounded primary/backup history adapter are implemented;
  new model/storage units and existing menu-save units pass (21 tests), as do
  both TypeScript scopes. Pure projections avoid importing dungeon runtime/content
  into the menu bundle. No active save format changed.
- Existing Hall of Records now renders immutable summaries, local scope,
  empty/degraded/unavailable states, export and reviewed restore/reset.
  [PR #359](https://github.com/luminari-gurus/tactics-guru-v2/pull/359) supplies the
  completed first increment, with enhancement and medium-risk classification.
  Standard self-hosted verification passed 1,257 units, both type scopes, both
  build integrations and seven core journeys; focused qualification passed all
  20 Chromium/WebKit cases, with no skips, retries or flakes. Tasks 1.1–1.4 are done.
- A task-scoped self-hosted workflow on VM-02 runs the three new menu cases plus
  the affected existing read-only root/settings/focus case on Chromium and WebKit.
  VM-01 retains normal `verify:pr`; both share existing runner concurrency groups.
- Initial local iteration found a test assumption that Node lacked Web Locks;
  Node 24 provides them, so the missing-lock test now explicitly removes navigator.
  A staged terminal test also needed its null pending-reward discriminator.
  Corrected focused checks pass; no assertion was weakened.
- Tested head is `35cb55d`, clean merge source `c241544`; final handoff edits are
  documentation-only and preserve every runtime/test/config input. Browser
  screenshots on desktop/Pixel portrait/landscape were inspected and remain
  readable with vertical scrolling and no horizontal clipping. Exact identities,
  report hashes, case IDs and source-bound timings are in
  [the portable receipt](../qa/issue-176/increment-1.json).
- Browser evidence and PR handoff are recorded in
  [the issue QA record](../qa/issue-176/README.md). Later recording increments
  remain unimplemented, and #176/#270 stay open.

### Increment 2 complete — 2026-11-10

The authored owner now gates recording by persistent entry, records accepted
terminal states and explicit terminal Continue, and awaits bounded replacement
receipts around the existing validated replacement. Replacement is asynchronous;
its actual active-save mutation remains serialized under the existing run lock.
Startup placeholders and testing sessions never record. The new shared
`RunHistory` application helper owns history effects only; it has a real second
consumer in the planned dungeon increment. No active-save migration was added.

Focused iteration passes 43 units and both type scopes, including real accepted
defeat, exact terminal continuation, immutable first result, pending recovery,
failed/stale replacements, a changed-live-state race and null-storage gating.
Tasks 2.1 and 2.2 are complete. PR #360 is ready for review, stacked on #359.
The task-scoped workflow
extends the existing legal run/outcome and route-isolation cases rather than
creating another full-journey harness. Existing five storage-condition variants
remain configured; the bounded affected browser selection executes valid and
unavailable storage across all direct/diagnostic routes, including Q*bert.
The expanded job allows 45 minutes for 45 focused selections on one VM; original
per-case deadlines, retries 0 and the ordinary PR job's budget are unchanged.

PR #360 is open as a draft stacked on #359. Its initial standard check failed
one new continuation unit because fixture construction simulated a complete legal
defeat inside the default five-second unit budget. The unit now stages validated
terminal data; complete legal defeat remains a browser obligation. Preserve run
42826784671 as failed and qualify the repaired source without raising deadlines.
Retention/replacement regressions were reproduced and repaired: a frozen result
must keep its seal even after eviction and an accepted/refused replacement.
Known frozen results now skip pending preparation entirely. A real terminal
transition seals its own pending intent, so a later refused replacement cannot
remove that protection. No schema field or additional recovery layer was added.

The history observer now notifies only when its visible status changes. Successful
receipt writes have no new status to display; rebuilding the active controls on
every successful write could detach an in-progress confirmation/double-click.
The superseded queued capture was canceled. Original focused run 42826784471
finished failed before cancellation: two desktop isolation sweeps exceeded 30s
after Q*bert was added; 25 menu and the other ten Chromium cases passed. Q*bert is
split into its own fully audited group, retaining original case IDs/assertions,
all five conditions and unchanged deadlines. The affected selection is now
33 Chromium + 22 WebKit cases. Superseded captures remain failed/incomplete.
The next capture (42829329281) localized remaining desktop timeouts to the later
diagnostic battle entry in the original seven-route sweep; the isolated Q*bert
cases and mobile/full-run cases passed. Ordinary and diagnostic entries are now
separate complete audit groups, with all original route assertions and all five
storage conditions preserved. The latest authored selection is 39 Chromium +
26 WebKit cases; no timeout or retry was changed.

Qualification now passes all 65 cases on `eaf85f7` / clean merge `1d58eb6`,
including three-encounter victories on every selected Chromium/WebKit profile,
legal defeats, terminal Continue/restart, confirmed abandonment and all entry
isolation groups. Standard run 42833420593 attempt 2 passed all 1,272 units,
both type scopes/build integrations and seven core journeys. Attempt 1 remains
failed: three unchanged CPU-heavy cases exceeded 5s while the other VM rendered
battles. With that browser VM held idle, the unchanged unit phase passed in
59.26s versus 122.85s in the failed attempt. This is controlled qualification,
not a claim that physical-host contention has been universally diagnosed.

[Portable authored evidence](../qa/issue-176/increment-2.json) retains source,
report hashes, complete victory witnesses and the exact 65 case IDs/attempts.
The one-off workflow for these completed increments is retired after capturing
evidence; all tests remain in their explicit regression matrices and CLI commands.
Final handoff edits change only documentation and that temporary entry point,
so runtime/test evidence is reused under the verification policy.

**My implementation estimate: 4–6 hours total**, including focused regression,
browser evidence, documentation and preparing the three reviewable PRs. First
increment: about 60–90 minutes; authored integration: 60–90 minutes; dungeon,
replacement edge cases and final acceptance: about 2–3 hours. This excludes runner
queue time, external review and merge/deployment. Storage/replacement failure
handling is the main uncertainty; retain failures and revise the estimate if it
reveals materially broader work.

Planning publication is a documentation-only commit with `Refs #176`, on the
branch above, natively linked from the issue's Development section. The issue
comment links the pushed plan and explains the incremental acceptance boundary.
The planning commit is `0f1c2e9`. Implementation and verification progress will be
recorded here and in the OpenSpec tasks as each increment is completed.

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
