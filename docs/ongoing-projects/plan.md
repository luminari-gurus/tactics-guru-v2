# Active work: battle-save envelope (#69)

## Review repair handoff — 2026-10-12

The user authorized addressing all review details on [PR #70](https://github.com/luminari-gurus/tactics-guru-v2/pull/70), using ablation and OpenSpec, including Git management and publication. Continue on `work/issue-69-save-envelope` in `C:/Users/apexw/.codex/worktrees/save-envelope-plan/Tactics-Guru`. Its seven commits were rebased without conflicts onto main `30331e6`; range-diff confirmed every original patch was preserved. The original checkout holds unrelated Safari/environment/workflow edits; preserve them.

Source of truth: [implementation plan](battle-save-envelope/plan.md), [OpenSpec tasks](../../openspec/changes/battle-save-envelope/tasks.md). The sole finding was valid and is repaired in `2d23526`: seed 2/command 29 now preserves the queued Wait. Decoded snapshots match uninterrupted commands/events/state across five full battles (258 commands), whose complete original traces remain unchanged. Validation: 94 focused tests, 316 unit tests, 77 content checks, both typechecks, build and strict OpenSpec pass. Browser evidence covers all 225 configured cases: the full run had 224 passes and one existing restart synchronization race; test-only `d651b10` waits for the replacement seed before its settled player phase and passed nine repetitions across all three profiles. The full suite was not rerun after that isolated test repair. All 12 OpenSpec tasks are complete; see [QA](../qa/issue-69-save-envelope.md) and [retained review evidence](../qa/issue-69/review-repair.json). Outcome: correct state-only continuation without new payload fields. Files: existing planner/tests, format/enemy docs and current OpenSpec/plans/QA. Non-goals: storage, live hydration, UI, deployment, migration or parent #58 closure. Parent #58 remains open, with storage/session/lifecycle children #72–#74.

Ablation: reuse the existing planner and state flags, validators, canonical hashing and battle policy. No queue serialization, second resume planner, new dependency or general test infrastructure is needed. Git delivery uses an exact lease against pre-rebase head `6c798411980bc16af99f3284674f976e6b30cef1`, followed by remote parity and review-reply readback. Preserve useful implementation/test/evidence commits; no stacked branch, release tag, merge or manual deployment is needed. The existing Cloudflare integration may create its normal branch preview on push. The child is ready for merge after this verified publication; leave #58 and OpenSpec archive decisions for their appropriate integration steps.

Local tools: `node` is available; npm CLI is `C:/Users/apexw/AppData/Local/node/corepack/v1/npm/12.0.2/bin/npm-cli.js`. OpenSpec 1.14.1 CLI is `C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js`. Invoke both with `node`; the existing ignored `tmp/tool-bin/npm.cmd` enables npm's nested commands. Browser tests use installed Edge through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Remote CI is not a completion gate; run configured checks locally.

## Historical audio/performance handoff

The notes below are the prior session's record, not the current task. Main now includes PR #67 at `e955e9d`; its integration instructions below have been superseded.

## Current status — 2026-10-11

[PR #63](https://github.com/luminari-gurus/tactics-guru-v2/pull/63) is merged into `main` as `de7385842ee50beb936a9eb7396cd1deeb351f51`. GitHub automatically marked [#62](https://github.com/luminari-gurus/tactics-guru-v2/issues/62) completed. The merge joins main `d60659d03b940c20e380eeda3f226ba2b649ef6f` and the reviewed audio head `1609de5dcf71ec9e7aee8756bd4b82a13950a00e`; its tree exactly matches that tested head.

The merge commit preserves all twelve implementation, repair and evidence commits. Main had no additional changes, so no further rebase or conflict resolution was needed. The GitHub connector returned an integration-permission error; the authorized merge was published with the repository's Git credentials using a normal fast-forward push to main, and GitHub's merged state was read back. The audio branch is retained to preserve existing evidence links. No release tag is warranted by this feature merge.

The audio implementation is complete. Its [QA report](../qa/issue-62-battle-audio.md), retained raw captures and [17 completed OpenSpec tasks](../../openspec/changes/issue-62-battle-audio/tasks.md) remain the evidence record. Physical audibility remains unverified under #64; broader frame-budget acceptance belongs to #65 and intermittent physical Safari restart investigation to #66. #57 remains open. Live verification found #1 already closed on 2026-10-11 before this session; that historical state was preserved and does not establish completion of the open follow-ups.

## Merge validation

Fresh checks on the exact PR head: 293 unit tests, 77 content tests, both TypeScript checks, production build, whitespace checks and 21 focused browser cases passed. The browser run used the repository's desktop/portrait/landscape profiles, one worker and normal timeouts with installed Edge; the temporary ignored config only points the preview command directly at the installed Vite CLI because npm is absent from PATH. Existing chunk-size and color-environment warnings remain.

The retained full-browser report was independently checked for coverage: 225 unique configured cases have a passing result across the original 220-pass/5-failure run and six-case restart-synchronization recheck. This session did not rerun the complete 225-case suite or certify physical hardware. The merge required no runtime change.

## Next session: review and integrate existing PR #67

[PR #67](https://github.com/luminari-gurus/tactics-guru-v2/pull/67), **Reduce battle frame cost with shared tile textures**, already implements [#65](https://github.com/luminari-gurus/tactics-guru-v2/issues/65) on `work/issue-65-frame-budgets`. Its current head is `ad9a499412532094f399067ac06940ab81c92db9`. Review this existing work before proposing another performance implementation.

Preparation performed here was read-only: a merge-tree preview against audio merge `de73858` completed without conflicts, and GitHub subsequently reported mergeable. No PR #67 branch update, code repair, test run, approval or merge was performed. Refresh both heads next session; mergeability alone does not prove combined behavior.

1. Read PR #67's review state, approved OpenSpec plan and `docs/qa/issue-65-frame-budgets.md` from its branch. Its recorded 171-browser-test validation and deployed frame results concern the performance branch before audio integration.
2. Integrate current main into that existing branch after checking for newer commits. The shared changed files are `src/diagnostics/browser.ts` and `tests/battle-loop.spec.ts`; preserve battle-audio diagnostics, the new post-render measurement metadata, committed-command enemy detection and both sets of restart/error assertions. Retain the renderer cancellation fix and audio teardown/recovery ownership.
3. Validate the actual combined tree: configured unit/content/browser checks, typecheck/build, relevant strict OpenSpec checks and the existing matched proof/battle measurements. Include audio lifecycle/restart regressions and unchanged loading, transfer and F1/F2 limits. The prior frame evidence excludes the new audio payload, so retain both original captures and new combined evidence with exact source/served commits. Use the existing release path if publishing measurements; do not invent a deployment mechanism or relax budgets.
4. Only then decide readiness to merge #67 and complete #65. Neither action is authorized as part of this session's handoff.

## Remaining acceptance after integration

- [#64: physical-device certification](https://github.com/luminari-gurus/tactics-guru-v2/issues/64): test the selected integrated build on physical iPhone Safari/Chrome, Android Chrome and desktop in both orientations, including actual win/loss/restart and audible unlock/mute/interruption/resume. Record exact device/browser/build/cache conditions and unavailable checks. Emulation cannot complete this ticket.
- [#66: intermittent iPhone Safari restart](https://github.com/luminari-gurus/tactics-guru-v2/issues/66): retain the original failure and successful retry; capture the exact error and lifecycle conditions when reproducible. Neither #63's audio repairs nor #67's renderer cancellation fix establishes the cause or resolution of that physical report.
- [#57: performance/audio readiness](https://github.com/luminari-gurus/tactics-guru-v2/issues/57) remains the open parent acceptance tracker. Avoid closing it by proxy or duplicating its existing children. Unrelated deployment PR #12 remains separate.

Stop here. No next-phase implementation, hardware certification or manual deployment was started in this session.
