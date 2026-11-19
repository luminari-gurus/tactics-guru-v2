# Issue #435 — Preserve dungeon save feedback during playtime checkpoints

- Date: 2026-11-19 (Asia/Jerusalem)
- Issue: [#435](https://github.com/luminari-gurus/tactics-guru-v2/issues/435)
- Assignee: [@moshehbenavraham](https://github.com/moshehbenavraham)
- Branch: [work/issue-435-dungeon-save-feedback](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-435-dungeon-save-feedback)
- Base: `origin/main` at `0e29532dc3920b420bcb27453d26443c608a0997`
- Status: implementation and acceptance checks complete on [PR #445](https://github.com/luminari-gurus/tactics-guru-v2/pull/445). [OpenSpec tasks](../../openspec/changes/issue-435-dungeon-save-feedback/tasks.md) are complete. The previous handoff is preserved in [the #376 plan](issue-376-floor-progress-plan.md).

## Selection

Reviewed 41 open issues, including bodies, labels, assignees and relevant comments.
GitHub's open-issue count matched the issue list and reported no additional page.
Checked all three open PRs, remote branch refs, recent merges, and GitHub issue
dependencies, sub-issues, development links and project membership. The repository
reported zero project boards. #435 was unassigned, with no open PR, development
branch or outstanding prerequisite. It had a bug label and was eligible without a
readiness label.

#435 is a player-facing defect on the primary dungeon route. It can leave the player
unsure whether a battle action or level-up was saved. The production code still
contains the race, and the injected serializer offers deterministic proof in one
focused PR. [#434](https://github.com/luminari-gurus/tactics-guru-v2/issues/434)
concerns the document unloading before a lock callback can run and needs its own
durability design. [#208](https://github.com/luminari-gurus/tactics-guru-v2/issues/208)
is already owned and has active work. The remaining reported enemy disappearance
in [#417](https://github.com/luminari-gurus/tactics-guru-v2/issues/417) still needs
reproduction after [PR #444](https://github.com/luminari-gurus/tactics-guru-v2/pull/444).

## Outcome and code path

After an accepted dungeon battle action, `DungeonSession` queues a non-quiet save
with any level-up feedback. While the Web Lock is pending, blur, a visibility
change, or the five-second tick can sample playtime and replace `current` with
a copy that adds elapsed time. The queued save's reference guard then rejects
its snapshot. The follow-up quiet write can persist the data and leave the
pending message in place. The regression below reproduces that sequence.

An accepted save should finish with its success or failure status and original
feedback, and the persisted state should include the accepted battle progress and
the elapsed playtime. The dungeon shell already observes session status and renders
it in the exploration and battle views.
[Session](../../src/app/DungeonSession.ts) · [Browser lifecycle](../../src/app/ActivePlaytime.ts) · [Dungeon shell](../../src/app/startDungeonApp.ts)

## Implementation

1. Extend [dungeon.test.ts](../../tests/unit/dungeon.test.ts). Continue a real
   persisted fixture with the existing in-memory storage, inject a manual lock queue
   and fake clock, call `save(false, feedback)`, and deliver a blur or tick before
   releasing the writer. Assert the resolved save result, final status with feedback,
   and decoded durable playtime. Exercise storage and lock refusal and confirm the
   original feedback accompanies the actual failure. Confirm the success case fails
   on the literal base before fixing it.
2. Update [DungeonSession.ts](../../src/app/DungeonSession.ts). Keep a reference to the
   current queued autosave request. When a playtime-only capture derives directly
   from that request's snapshot, advance its snapshot to include the sampled time
   and let the same locked write settle the original promise and feedback. With
   no matching request, retain the existing quiet-checkpoint path. Clear the
   request on grant or refusal before notifying observers. After review, the
   latest request finishes when teardown precedes a lock grant, whether or not a
   clock sample happened.
3. Keep the snapshot guard for genuine state changes. A later battle action,
   Continue, reset, or a different save owner must still invalidate stale work
   where it does today. Route both successful writes and failures through the
   existing status/report path. Ensure the recovery flush still waits for the
   latest queued work, including writes queued by observers.

### Ablation and scope

Coalescing only a playtime-derived snapshot keeps one admitted write and one
completion message. A HUD fix could conceal the stale message while leaving the
save promise and feedback wrong. Removing the reference guard could let a
superseded save publish over a different continuation. Keep the existing
[storage lock and compare-and-swap](../../src/persistence/dungeonStorage.ts), save
format, history and lifecycle wiring. The unload durability work in #434 is
outside this fix. The OpenSpec change records the save completion contract and
tracks the implementation and acceptance checks.

## Proof before opening the implementation PR

- Run `npm run test:unit -- tests/unit/dungeon.test.ts tests/unit/ActivePlaytime.test.ts tests/unit/dungeonLootSession.test.ts tests/unit/runRecords.test.ts tests/unit/runRecordsStorage.test.ts`.
  Cover the race, storage refusal, stale primary and backup Continue, two-writer
  conflict, a queued checkpoint finishing after disposal, nested flush and the
  automatic loot consumer's reliance on durable progress.
- Run `npm run verify:pr` on the implementation head for all fast units, both
  TypeScript scopes, build integrations, production build and the core browser
  journeys. Follow the [verification policy](../verification-policy.md) for the
  focused checks in addition to the core suite.
- Discover and run the affected cases through `playwright.regression.config.ts`
  and `playwright.exploration.config.ts` against that production build. Use
  `dungeon.spec.ts` for the existing hero progression and reload, legal defeat
  and battle resume, and active-time recovery and menu transitions. Use
  `dungeon-lifecycle.spec.ts` for save recovery, terminal visibility, and
  two-tab stale writes. Include the persistent automatic-loot witness in
  `dungeon-loot.spec.ts` because it gates on saved progress. Keep each case's
  applicable Chromium and WebKit profiles and the config's native-focus
  exclusions. Run the real Chromium BFCache case `cached dungeon record history
  preserves the replacement and one old result` in `battle-persistence.spec.ts`
  through the regression config. Record selected IDs and results. The unit
  regression forces the race without making browser tests depend on its timing.
- Run affected browser checks on qualified capacity and report Chromium desktop,
  Pixel portrait/landscape and WebKit device emulation as applicable. Local
  physical Android access is declared. Playwright emulation meets device
  acceptance for this task.
- Run `git diff --check` and record exact source/build identities, failures and
  skips. One implementation PR can close #435 once both issue criteria and the
  affected persistence checks are verified.

## Progress and evidence

- On the literal base `0e29532d` with only the new test applied, the targeted
  `settles a dungeon autosave` run failed all five cases as expected. Blur and
  tick left the pending status visible. Both refusal cases lost the original
  feedback, and the disposed session's original save resolved `false`. The
  Linux test checkout retains the log in `tmp/issue-435/red.log`.
- The implementation keeps one queued request and preserves the existing Web Lock
  and storage writer. A clock-only change advances the request's snapshot. A
  different state invalidates it. Both lock refusal and storage refusal report the
  action feedback through the normal status renderer.
- The five focused unit files passed 150 tests during iteration. A narrower rerun
  after extending the stale-Continue cases passed all nine selected race and flush
  cases. Browser discovery selected 36 Chromium and 30 WebKit executions.
- The clean WSL Ubuntu x86-64 checkout at
  `a7e509f5dee5b2100d4b7fcf971f8700079884a2` passed `npm run verify:pr` in
  143 seconds, including 1,509 units, both TypeScript scopes, two build
  integrations, a production bundle and seven core browser journeys. The
  [self-hosted PR run](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/44533036892)
  passed on the same head.
- Focused Chromium passed all 36 executions against the same root-path build.
  Focused WebKit passed 27 of 30. The existing held-defeat-save case failed at
  the `data-phase="ended"` assertion on desktop, portrait and landscape.
  The same three failures reproduced on the clean pinned base. Changing only
  that test's hook to install on the `LockManager` prototype yielded three
  passing WebKit results on the base. The repair is local to the failing test.
  Its assertions, browser profiles, and timeout are retained.
- The repaired held-defeat-save test passed all six Chromium and WebKit profiles
  against the same `a7e509f5` production build, with zero skips or retries. The
  rerun used the final test blob `fce581f15cbb876c759a80e984783b3e5296d479`.
  The other focused cases retain their original results because their page
  fixtures and runtime inputs are identical. The initial WebKit run remains
  recorded as 27 passed and 3 failed.
- Local receipts are under `/tmp/tactics-435-kziYC0` in WSL Ubuntu. The PR
  receipt is `verification-receipts/pr/1795094602942-3709386/summary.json`.
  Exact focus selections, reports and source/bundle checksums are under
  `tmp/issue-435/`. See `webkit-base.json` for the three matching failures,
  and `webkit-base-harness-verified.json`, `chromium-harness-verified.json`,
  and `webkit-harness-verified.json` for the corrected cases.
  Runtime is Node 24.15.0 with Playwright 1.64.1, Chromium 156.0.8078.4 and
  WebKit 27.2. The focused runs used the root production preview and one worker.
  [Current PR checks](https://github.com/luminari-gurus/tactics-guru-v2/pull/445/checks).

## Review follow-up

The [adversarial review](https://github.com/luminari-gurus/tactics-guru-v2/pull/445#issuecomment-7013057696)
at `3b30d270` reported five findings. All five were reproduced by reading the code.
Items 2–5 are in this PR's scope:

- **Disposal durability (2):** the clock-dependent `finishesAfterDispose` flag is
  removed. The latest request finishes after disposal, still guarded by the snapshot
  reference and the storage compare-and-swap.
- **Superseded feedback (3):** a newer save inherits a pending request's feedback and
  visible status. Continue and reset clear the request.
- **Boundary rejection (4):** the fold moved into `capturePlaytime`, so the sample an
  accepted battle command takes before a rejected boundary advances the pending save.
- **Stale Continue coverage (5):** the case runs granted and refused locks for both slots.

New unit cases for items 2–4 failed against `3b30d270` and pass with the change.
Item 1 is the same symptom in `RunItemSession`, outside #435's dungeon scope, and
is tracked separately.

## Estimate and open questions

**60–90 minutes of active implementation and verification**, plus any self-hosted
runner queue time. No open product or rules questions.
