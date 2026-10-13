# Battle autosave and resume merged; certification handoff

Updated 2026-10-13 (Asia/Jerusalem). [PR #95](https://github.com/luminari-gurus/tactics-guru-v2/pull/95) is merged into `main` as `38cb3d9defdef6bac0233dfee290d78ebc391d6f`. GitHub automatically closed [#73](https://github.com/luminari-gurus/tactics-guru-v2/issues/73) and [#92](https://github.com/luminari-gurus/tactics-guru-v2/issues/92) as completed. Battle autosave/resume and the public-asset base repair are complete. No implementation task remains in those two changes.

## Merge and verification

The repository's actual default/base branch is `main`. It had advanced seven commits to `d15caca0f66ed2e956cbf7194bd67a634c2a224f`, including map algorithms and biomes from PRs #100/#101. The merge with reviewed head `03bb3c41c4bbe44a5f8be821c9680b8c6b1b708c` was conflict-free. Its two-parent commit preserves all eight PR commits and the newer main history. No rebase, squash, extra stack or release tag was warranted. The source branch remains available for evidence links.

The GitHub connector returned an integration-permission error. The tested merge was published with existing repository Git credentials by a normal fast-forward push; GitHub's merged state and both completed issues were read back. No application source was changed during closeout.

Fresh checks on the combined merge passed: 446 unit tests, 77 content checks, both TypeScript configurations, root and `/prototype/` production builds, both relevant strict OpenSpec validations, 120 root integration browser cases and 39 prefixed cases. Each browser case passed on its first attempt, with no failures, skips or flaky results. Screenshots were inspected across desktop and emulated Pixel 7 portrait/landscape. See [merge validation and limits](../qa/pr-95-merge.md). The complete current 318-case browser suite was not rerun; the prior complete 309-case run remains historical evidence for the repaired PR head.

References: [battle save format](../battle-save-format.md), [storage and replacement contract](../battle-storage.md), [persistence acceptance](../qa/issue-73-battle-resume.md), [asset-base repair evidence](../qa/issue-92-public-asset-base.md), [completed #73 tasks](../../openspec/changes/issue-73-battle-resume/tasks.md), [completed #92 tasks](../../openspec/changes/issue-92-public-asset-base/tasks.md), and [preserved implementation/review plan](https://github.com/luminari-gurus/tactics-guru-v2/blob/03bb3c41c4bbe44a5f8be821c9680b8c6b1b708c/docs/ongoing-projects/plan.md). Completed OpenSpec records remain at their existing paths.

## Next session: existing readiness gates, then #74 certification

[#74: persistence lifecycle certification](https://github.com/luminari-gurus/tactics-guru-v2/issues/74) is the remaining child of [#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58). Its #72/#73 implementation prerequisites are now satisfied; [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57) acceptance remains a blocker. Do not mark #74 or the parent ready/completed on the strength of this merge.

1. Refresh main, active PRs and #57/#64/#66/#74 before scheduling work. Continue the existing first-battle certification under [#64](https://github.com/luminari-gurus/tactics-guru-v2/issues/64) and retain the unresolved physical Safari restart report under [#66](https://github.com/luminari-gurus/tactics-guru-v2/issues/66). Reuse their existing evidence and plans; no replacement implementation or new ticket is needed merely because #95 merged.
2. Confirm actual device/tester access and pin the candidate URL, served commit, browser/OS versions, orientation, cache and network conditions. Local configuration declares Android capability, but no physical device was used here and physical iOS remains unavailable locally. Android/desktop evidence can contribute to #64; the full iPhone matrix and Safari restart requirement remain explicit. The root checkout's Android-certification draft is uncommitted, historical and unapproved; recheck it before any use and do not create its proposed child automatically.
3. Once #57's prerequisite is accepted, execute #74 against the selected served build. Cover accepted player/enemy boundaries, background/discard/reload during presentation, Continue, ended saves, New battle and outcome restart; compare state, next command/RNG/enemy decisions with uninterrupted fixtures. Exercise corrupt/future data, backup recovery, exact export/reset and unavailable storage while retaining original bytes and failures.
4. Reuse `BattleSession`, `BattlePersistence`, the existing codec/two-slot adapter, `tests/helpers/saveFixtures.ts`, `tests/helpers/battlePolicy.ts` and the persistence/loop browser tests. Keep physical lifecycle evidence separate from emulation. Confirm the agreed measurement budgets before measuring encode/write/restore and cold/warm resume; preserve current budgets and document unavailable checks.

#58 and #57 stay open. The #73 dependency is also satisfied for #79/#80, while their other prerequisites and separate run/reward work remain outside this handoff. No next-phase branch, assignment, proposal, implementation, physical certification or manual deployment was started.

## Local resume point

Use `C:/Users/apexw/.codex/worktrees/merge-pr-95/Tactics-Guru`, branch `branch/merge-pr-95` tracking `origin/main`, or a fresh worktree from merged main. Closeout publication verifies exact remote equality, zero ahead/behind and a clean merge worktree; the local `main` ref is fast-forwarded as well.

The original checkout stays on `work/issue-66-safari-restart` with its unrelated workflow, environment, AGENTS and Android-draft changes preserved. Its older `docs/ongoing-projects/plan.md` is not the current merged handoff. No source branch was deleted and no release tag was created. No deployed-main or hosted-prefix validation is claimed.

Stop here. Next-session execution requires a new instruction.
