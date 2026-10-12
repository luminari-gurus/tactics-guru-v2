# Guarded battle storage merged; next-session handoff

Updated 2026-10-12 (Asia/Jerusalem). [PR #91](https://github.com/luminari-gurus/tactics-guru-v2/pull/91) is merged into `main` as `3e7bf08600c59a09a0f9c37f3c81c7c07b3a6954`. GitHub automatically closed [#72](https://github.com/luminari-gurus/tactics-guru-v2/issues/72) as completed. The storage adapter is complete; live battle autosave/resume remains real, existing work under #73. This session prepares that handoff without starting it.

## Merge and verification

The actual default/base branch is `main`. Base `5d8351468463a9766665f3dce1da35f074e3476f` was already an ancestor of reviewed head `6124ecb55e6ccbb584832602feefbd078bdcbfba`. A merge commit preserves all five PR commits, including planning and validation evidence. No conflict, rebase, squash, stacking change or release tag was needed. The merge tree `543bbd98e219c7543b083c19baa9d3845bd0513e` exactly matches the reviewed/tested head.

The GitHub connector lacked merge permission. The authorized merge was published through existing repository Git credentials with a normal fast-forward push; GitHub's merged state and #72's completed state were read back. The source branch remains available for existing evidence links. No manual deployment was performed or deployed-main validation claimed.

Fresh pre-merge checks passed: 372 unit tests, 77 content checks, both TypeScript checks, production build, strict OpenSpec `issue-72-battle-storage` and whitespace validation. The existing Vite large-chunk warning remains. The retained [225-case browser run](../qa/issue-72/validation.json) was checked for unique passing cases, all five recorded source blobs and documentation-only differences since its tested commit `df1159f`; browsers were not rerun in this merge session. The [adversarial review](https://github.com/luminari-gurus/tactics-guru-v2/pull/91#issuecomment-6127561576) at the exact merged head reported no substantiated findings. Neither check establishes physical persistence or live autosave behavior.

References: [adapter API and limits](../battle-storage.md), [save format](../battle-save-format.md), [completed implementation plan](issue-72-battle-storage/plan.md), [QA and acceptance mapping](../qa/issue-72-battle-storage.md), [merge record](../qa/issue-72/merge-validation.json), [completed OpenSpec tasks](../../openspec/changes/issue-72-battle-storage/tasks.md). The completed OpenSpec change remains available at its existing path; no archive or next-phase change was created here.

## Next session: prepare the existing #73 integration plan

[#73: command-boundary autosave and battle resume controls](https://github.com/luminari-gurus/tactics-guru-v2/issues/73) is the next persistence phase. Its #69/#72 implementation prerequisites are now merged. It remains open and unassigned; no #73 branch, OpenSpec proposal or implementation was created in this session. Release acceptance still depends on #57, and persistence certification remains #74.

1. Refresh `origin/main`, #73, reviews and active branches before claiming or planning. Open PR #93 is independent map work and #12 is deployment work; neither was merged or modified here. Reconcile any newer shared handoff changes and preserve their scope.
2. Read the accepted codec/storage contracts and inspect `src/app/BattleSession.ts`, `src/phaser/BattleScene.ts`, the existing DOM controls and restart flow. Plan hydration of a fully validated committed state, preserving next command/RNG/enemy continuation while rebuilding presentation without replaying historical cues. Reuse `tests/helpers/saveFixtures.ts`; do not add another serializer or simulation.
3. Specify autosave after every accepted player/enemy command, including during presentation. Previews and rejected commands must not save or consume RNG. The current session exposes committed state but has no hydration path; define replay semantics for a resumed session explicitly.
4. Plan accessible Continue/New battle and recovery/export/reset controls with visible nonfatal storage status. `load()` is read-only; a selected backup does not mean both slots are healthy. Invalid/unreadable slots block ordinary saves and original bytes must remain recoverable.
5. Resolve #73's New battle/restart invalidation contract before implementation. `removeSlot` is a guarded single-slot primitive, not an atomic two-slot reset or cross-tab compare-and-swap. Define and test the fallback for partial removal/write denial so an old battle cannot silently reappear. Preserve the approved new-seed behavior and playable in-memory state; do not assume two successful intentions equal a durable reset.
6. Prepare a focused OpenSpec proposal and test plan against all #73 acceptance criteria for the next session's authorization. Include real-control browser reload during player/enemy presentation, ongoing/ended saves, backup recovery, repeated restart, storage failures and unchanged domain/RNG/audio/canvas ownership. Retain unit/content/browser checks, both typechecks and build. Distinguish emulation from #74's physical lifecycle evidence.

## Remaining gates and local state

- [#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58) stays open: codec #69 and adapter #72 are complete; live integration #73 and certification #74 remain.
- [#74](https://github.com/luminari-gurus/tactics-guru-v2/issues/74) stays open for browser lifecycle, supported physical devices and measured persistence acceptance after integration and #57 readiness.
- [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57), physical certification #64 and Safari restart #66 are separate outstanding gates. This adapter-only merge does not complete them.
- Merge/handoff worktree: `C:/Users/apexw/.codex/worktrees/merge-pr-91/Tactics-Guru`, branch `branch/merge-pr-91`, tracking `origin/main`. The original checkout remains on `work/issue-66-safari-restart` with its unrelated AGENTS/environment/workflow edits and Android-certification draft preserved. Use merged main for the next session rather than that checkout's stale handoff.

Stop here. The next phase has not started.
