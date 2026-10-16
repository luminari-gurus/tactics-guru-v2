# Current project handoff — 2026-10-16

Main is `b175ddb5dabed2ee8457e132e345e9a2fc2affdb` after [PR #120](https://github.com/luminari-gurus/tactics-guru-v2/pull/120) merged the playable three-encounter run. Initial local source inspection used `work/issue-79-reward-item-controls` at `3060060`; the documentation PR is based on the main revision above. Tracker status was checked on 2026-10-16; no runtime tests or physical certification were performed for this documentation refresh.

## Delivered

- Battle save envelope, guarded storage and autosave/Continue: #69/#72/#73, merged PRs #70/#91/#95.
- Run contract, three authored encounters, reward/item catalog, atomic commands, resumable controls and integrated progression: #75–#80, merged PRs #107/#109/#114/#115/#116/#120.
- Standalone `/map` with layout, biome and art selection: #87/#96–#99 complete.
- Signature effects #106 and responsive-controls design #108 complete. PR #113 fixed dialog focus/held-key resets; PR #118 delivered drawable board regions.

## Remaining work

#111 remains open; [PR #119](https://github.com/luminari-gurus/tactics-guru-v2/pull/119) contains the ongoing responsive-control/inspection work. #121 requests unit health bars. Preserve existing ownership and review progress before selecting work.

#57/#64/#66 retain first-battle physical readiness and Safari restart acceptance. #58/#74 retain persistence lifecycle certification. #59/#60 and full-run certification #81 remain open despite completed implementation children. #83–#85 and open PR #12 retain separate release-path and production-approval scope. Merged implementation is not evidence that these acceptance gates passed.

The maintained [restart plan](../phaser4-restart-plan.md) and [technical design](../tech_design.phaser4.draft.md) summarize current delivery. Task QA and historical records keep their original source/build/device limits.

## Prior #111 handoff — 2026-10-15

The detailed review handoff below is retained from main. Its #80 ownership statement describes that earlier checkpoint; #80 has since merged as recorded above. Refresh PR #119 before acting on its recorded review state.

# Issue #111 — PR #118 merged; PR #119 follow-up

Updated 2026-10-15 (Asia/Jerusalem). **The geometry prerequisite is merged. Issue #111 remains open.** The remaining responsive HUD/input implementation already exists in PR #119; continue from that PR and its two review findings.

- [PR #118](https://github.com/luminari-gurus/tactics-guru-v2/pull/118) merged into `main` as `ffb0d0a4dd0bb1989ac4572d82a9edf08f61585b`, preserving its three commits and the ancestry used by #119.
- [PR #119](https://github.com/luminari-gurus/tactics-guru-v2/pull/119), branch `branch/issue-111-responsive-hud`, is the remaining delivery for [issue #111](https://github.com/luminari-gurus/tactics-guru-v2/issues/111). Its reviewed implementation head is `c7f02f9389aa7ed945b237ffbb22b6b5c95123a6`; source repair and verification remain necessary before merge.
- [Fresh PR #118 merge verification](../qa/pr-118-merge.md) records the exact tested tree, commands and limits. Main contains the shared rectangle API and migrated callers; the responsive rail/dock is still in #119.
- [Original implementation plan and acceptance map](https://github.com/luminari-gurus/tactics-guru-v2/blob/ba47b0a95ff315fd3f38e7d628f99ffbe5ef3307/docs/ongoing-projects/plan.md), [PR #119 delivery record](https://github.com/luminari-gurus/tactics-guru-v2/blob/c7f02f9389aa7ed945b237ffbb22b6b5c95123a6/docs/ongoing-projects/plan.md), [accepted design](issue-108-battle-controls-design/design.md), and [implementation QA](https://github.com/luminari-gurus/tactics-guru-v2/blob/c7f02f9389aa7ed945b237ffbb22b6b5c95123a6/docs/qa/issue-111-battle-controls.md) preserve the detailed scope and earlier evidence. The earlier statement that no work remains predates the two review findings below.
- OpenSpec remains active: [proposal](../../openspec/changes/issue-111-responsive-battle-controls/proposal.md), [design](../../openspec/changes/issue-111-responsive-battle-controls/design.md), [delta](../../openspec/changes/issue-111-responsive-battle-controls/specs/battle-controls/spec.md), [tasks](../../openspec/changes/issue-111-responsive-battle-controls/tasks.md). Main has only task 1.1 complete; #119's checked implementation tasks do not resolve later review findings or close the issue.

## Concrete next-session work

1. Refresh `main`, PR #119's head/base, review threads and working-tree state. #119 now targets `main`; its handoff conflict has been reconciled without changing runtime/test source. Preserve the original implementation commits and reconcile newer work if the branch has changed. The source checkout is `C:/Users/apexw/.codex/worktrees/issue-111-responsive-controls/Tactics-Guru`; inspect it before reuse because it may belong to active work.
2. Address [target-identity finding](https://github.com/luminari-gurus/tactics-guru-v2/pull/119#discussion_r4286775892): when a defeated unit and living unit share a cell, dropdown/target feedback, inspection, confirmation and the committed command must identify the same living target. Prefer the living occupant and derive confirmation identity from the prepared command. Add the legal seed-1 shared-cell regression described in the review.
3. Address [feedback-overlap finding](https://github.com/luminari-gurus/tactics-guru-v2/pull/119#discussion_r4286775908): at a panned drawable edge, Guarded and the target's damage feedback must remain separately readable. Resolve intersections across visible units' feedback stacks and assert pairwise non-overlap, including the reviewed 320x568 legal Guarded Strike scenario.
4. Verify each repair and the affected target/inspection/confirmation and board/animation paths. Run the repository's required unit/content checks, both typechecks, production build and applicable browser/posttest acceptance on the resulting branch. Record exact revisions and results; prior 420-case browser and 48-case prefix reports are retained evidence, not fresh validation of new fixes. Resolve review threads only after proving the repairs.
5. Merge #119 when its repairs, verification and current repository rules permit. Only then reconcile #111's acceptance checklist and close the completed issue. Sync/archive the OpenSpec change when the complete change is delivered. Keep the geometry-only merge from being mistaken for completion of the rail/dock issue.

## Scope and Git decisions

#118 needed no conflict resolution or history rewrite: current main was already its ancestor. A merge commit preserved the stack. No release tag is warranted for this partial feature delivery. #119 targets `main`; integrating this handoff into it changed documentation only and preserved its runtime/test source objects and both unresolved review threads.

GitHub automatically closed #111 when #118 merged. Final status verification caught the premature closure; #111 was reopened and verified open because #119 and its two findings are still outstanding.

The requested #118 merge session does not start either #119 repair. There is no new work item to invent: the existing PR and findings describe the remaining work. Preserve current combat/RNG, command/confirmation, save/audio, native dialog and reward/item contracts. #80 remains separately owned; physical-device, screen-reader and release/deployment acceptance remain outside this handoff.
