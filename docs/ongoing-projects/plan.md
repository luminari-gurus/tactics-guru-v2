# Issue #145 and PR #150 review handoff

Updated 2026-10-20 (Asia/Jerusalem). The two PR review findings are reproduced and repaired. Final integrated validation and publication are in progress.

## Current state

- [PR #150](https://github.com/luminari-gurus/tactics-guru-v2/pull/150) targets `main` from `branch/issue-145-default-move`; [issue #145](https://github.com/luminari-gurus/tactics-guru-v2/issues/145) remains open until merge.
- Worktree: `C:/Users/apexw/.codex/worktrees/issue-145-default-move/Tactics-Guru`. The caller's root checkout and other worktrees are preserved.
- The branch was 13 commits behind current `main` `6758d0f9a28575713b523689a5d8fb7636bfbc99`; all seven PR commits rebased without conflicts. No dependent branch contains the old PR head. Original reviewed head: `f625686332ed462d788f410ea7911c3c98ad398d`; rebased pre-repair candidate: `b4e9de9`.
- Repair candidate: `1082658920e4e3fcc6b3f9c99bab127c6e551fdb`. Keep the existing PR and useful review history; publish the rebase with a lease pinned to the old remote head. A release tag or a new stack is unnecessary. Leave merge to the caller; squash merge is suitable when accepted.
- OpenSpec [issue-145-default-move](../../openspec/changes/issue-145-default-move/tasks.md), spec-driven: 6/7 tasks complete. Task 3.3 owns the remaining local integration checks, evidence, publication and review response. Keep the change active until merge and later archive.
- The [prior shared plan](plan-before-issue-145.md) is preserved. Original implementation and acceptance history remain in the [QA record](../qa/issue-145-default-move.md).

## Outcome, files and proof

The default Move behavior stays once per usable player turn. PR review also found that clearing the native selector retained a stale command, and cancelling confirmation retained a destination that could not be re-selected through native input. Both failures reproduced against the rebased integration: placeholder clearing retained the move to `(0, 9)`; Cancel and Escape each left Review disabled after native same-destination retry.

`src/ui/hud.ts` now passes the empty option as null through the existing scene selection callback. `src/phaser/BattleScene.ts` resets the prompt, pending intent, selected destination and hover preview together. Movement-confirmation dismissal resets selected/hovered destination while retaining Move. Full action cancellation and attack-confirmation semantics remain intact. There are no new dependencies, domain rules, save fields, configuration, services or separate selection paths.

The existing `tests/battle-loop.spec.ts` has three native keyboard regressions, run across desktop and Pixel 7 portrait/landscape. They verify pending/selection/hover cleanup, disabled Review, retained Move, unchanged battle/replay/save bytes, native same-destination retry and exactly one accepted command after explicit confirmation. The existing session helper's return type now describes its already-present pending field.

## Verification so far

- Rebased baseline: 3/3 new desktop regressions failed at the reported stale-pending/disabled-Review assertions.
- Repaired Vite dev: 9/9 new cases passed on installed Edge, all three profiles, no retries/skips/page errors.
- Production build: 190 content checks, both TypeScript configurations and Vite passed.
- Strict OpenSpec validation passed for the change and battle-controls spec.
- Full serial-worker unit run: 762/762 tests passed in 47 files (55.50 seconds). Earlier parallel runs had 761 passes and one five-second timeout in unchanged `runBattle.test.ts`; its isolated file also passed 8/8. No assertions or timeouts changed.
- Final production browser matrix, configured posttests and telemetry suite are pending. Do not treat original pre-rebase coverage as current integration proof.

## Local commands and remaining workflow

Windows Node is available. Prepend ignored `tmp/bin` to PATH for the installed npm CLI. OpenSpec/gh run via WSL; run gh from `/tmp` with `-R luminari-gurus/tactics-guru-v2` because Linux Git cannot resolve the Windows worktree's `.git` path. Windows Git owns commits and publication.

Use `npm run test:unit -- --maxWorkers=1`, `npm run build`, `npm test -- --reporter=line`, `npm run test:telemetry`, and strict OpenSpec validation. Use the existing `PLAYWRIGHT_CHROMIUM_EXECUTABLE` override for installed Edge: the prior headless-shell delegate lacked BFCache. Keep browser matrices serialized on the host GPU. The repository has no GitHub Actions workflow; Cloudflare's build is covered by the local production build. Remote CI completion is not a gate for this request.

Finish task 3.3, update this handoff and QA with actual results, publish/read back repairs and the response to review `5583848401`, and verify exact remote parity and mergeability. Playwright emulation provides device acceptance under AGENTS.md. Physical hardware, screen-reader behavior and production deployment are outside this request.
