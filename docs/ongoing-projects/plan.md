# Issue #145 and PR #150 review handoff

Updated 2026-10-20 (Asia/Jerusalem). Both P2 review findings are reproduced, repaired, locally validated and published. PR #150 is ready to merge, subject to caller review.

## Current state

- [PR #150](https://github.com/luminari-gurus/tactics-guru-v2/pull/150) targets `main` from `branch/issue-145-default-move`; [issue #145](https://github.com/luminari-gurus/tactics-guru-v2/issues/145) remains open until merge.
- Worktree: `C:/Users/apexw/.codex/worktrees/issue-145-default-move/Tactics-Guru`. The caller's root checkout and unrelated worktrees are preserved.
- All seven original commits rebased without conflicts onto `main` `6758d0f9a28575713b523689a5d8fb7636bfbc99`, carrying 13 integration commits. Range-diff preserves the original changes; the one contextual difference follows the renamed upstream run test. No dependent branch contains the old head.
- Original reviewed head: `f625686332ed462d788f410ea7911c3c98ad398d`; rebased baseline: `b4e9de9`; movement repair: `1082658920e4e3fcc6b3f9c99bab127c6e551fdb`; default production test candidate: `c394ee5d650d816d7e9ccbdf649e74886cd3f0b5`; initial integration-test alignment: `1231a8703ba2ee3b22c455a11e0430de49812493`.
- The rebased repair was published with an exact lease against the reviewed head, with matching local/remote SHA, 0/0 divergence and clean status. Local `main` was fast-forwarded too. Remaining delivery commits use a normal fast-forward push. Keep the useful review history; squash merge is suitable when accepted. No new stack or release tag is needed.
- OpenSpec [issue-145-default-move](../../openspec/changes/issue-145-default-move/tasks.md), spec-driven: 7/7 tasks complete. Published repair/evidence `89fcd024220fbaf72389cdf7ff38bdae688c6a38` was verified at exact remote parity and mergeable against current main. This final documentation commit seals tracking; inspect the current PR for its publication head. Keep the change active for later merge/archive.
- The [prior shared plan](plan-before-issue-145.md) is preserved. The [QA record](../qa/issue-145-default-move.md) contains exact results, source identity, commands and original acceptance history.

## Outcome and minimal repair

The shared scene still selects Move once per usable player turn. The HUD's empty option now passes null through existing scene selection, clearing destination, pending intent, hover and stale preview together. Cancel/Escape on movement confirmation clears selected/hovered destination while retaining Move, so native same-destination retry works. Full action and attack-confirmation cancellation semantics remain.

All three new desktop regressions failed before repair; all nine desktop/portrait/landscape cases passed afterward, including in the production broad run. They assert cleared intent/selection/hover, disabled Review, retained Move, unchanged state/replay/save bytes, native popup retry and exactly one accepted command after explicit confirmation. The existing session helper type describes its already-present pending field.

Ablation keeps the existing scene/HUD path, native controls, fixtures and suites. There are no new dependencies, services, configuration, domain rules, save fields, assets or alternate selection paths.

## Local validation

- 762/762 unit tests in 47 files with one worker. Earlier parallel runs hit one unchanged five-second simulation timeout; isolated and serial runs pass original assertions/timeouts.
- Production build with 190 content checks, both TypeScript configurations and Vite passed. Typechecks passed again after test repairs.
- Every one of 609 configured browser cases has passing evidence: 588 broad-run passes plus 21/21 focused rechecks. The original 34.2-minute command was 588 pass / 21 fail, not entirely green. All nine movement regressions passed there.
- Configured posttests: 24/24 encounter and 21/21 run-item cases passed separately.
- All 36 telemetry cases have passing evidence: 33 full-run passes plus 3/3 complete-run rechecks. The original telemetry command was 33 pass / 3 fail.
- Four stale test expectations inherited from main were aligned with traced contracts: privacy disclosure, read-only opt-out access, generated desert map identity and legitimate terminal outcomes. Size/reachability, storage-write isolation, health projections, all three encounters, two rewards, exact event counts and privacy checks remain; telemetry additionally checks emitted outcome against actual state.
- Strict change/main-spec validation, relative links and whitespace passed; repeat non-runtime checks at final publication.

Application/dependency/build inputs have not changed since production candidate `c394ee5`. Only the four affected browser expectations and documentation change afterward; all other passing tests are unchanged. This is combined coverage, not a claim of one clean full rerun. The QA record explains the generated line-ending dirty marker and identifies exact source blobs.

## Remaining workflow

The PR title/description were updated and the [response to both findings](https://github.com/luminari-gurus/tactics-guru-v2/pull/150#issuecomment-6289845095) was published and read back. No implementation or validation remains. PR #150 stays open/non-draft for merge; issue #145 remains open until merge. The next action is reviewer/caller merge assessment and later OpenSpec archive. No release tag, deployment or new stack is needed.

Windows npm uses ignored `tmp/bin/npm.cmd`; prepend it to PATH. OpenSpec and gh are installed in WSL; run gh from `/tmp` with `-R luminari-gurus/tactics-guru-v2` because Linux Git cannot resolve this Windows worktree's .git path. Windows Git owns commits/pushes. Use the existing Edge executable override, keep browser matrices serialized and retain logs under ignored `tmp/pr150-*`.

The repository has no GitHub Actions workflow; Cloudflare's build is covered by the local production build. Hosted CI completion is not a gate. Playwright emulation supplies acceptance under AGENTS.md. Physical hardware, screen-reader behavior, live telemetry ingestion and production deployment are not claimed.
