# Tasks

Caller approved [proposal.md](proposal.md) and [design.md](design.md) on 2026-10-12 (plan commit `d405ac7`). Planning completion is separate from the implementation tasks below.

## 1. Approval and current evidence

- [x] 1.1 Record the caller's explicit approval in proposal.md and verify the same issue #82, branch and change are being continued.
- [x] 1.2 Refresh main SHA, #1/#2–#11/#57–#60/#62/#64–#66/#68–#69/#72–#85 and PR #12/#70 status; record the date/SHA in both document snapshots and verify every closed/merged assertion against live GitHub and merged-tree evidence (AC1–AC4).

## 2. Reconcile the two existing documents

- [x] 2.1 Correct headers, present-tense scaffold/toolchain/OpenSpec/branch claims and current-state sections in both docs; verify package scripts and tree, and compare the preserved October 6 audit and revision notes against the base (AC1).
- [x] 2.2 Update implementation/readiness summaries and audio/performance dispositions; verify #62/#65/#68 QA links, retained baseline after #68, and explicit outstanding #57/#64/#66 physical/restart gates (AC2).
- [x] 2.3 Update P6b/P7 roadmap and D1–D11/T1–T11 tables in both docs; verify every dependency against #58–#60/#69/#72–#81 and every resolved row against merged code or an explicit recorded owner decision, retaining unmerged PR #70 and unsettled product choices (AC3).
- [x] 2.4 Reconcile delivery, risk and D9/D10 sections; verify Pages evidence is dated and distinct from unmerged PR #12, with production target, operator/cutover approval and analytics gates still explicit (AC4).
- [x] 2.5 Align the accepted/deferred/retired feature ledger and approved rule summaries; verify preserved legacy SHA/source numbering and Guarded Strike −2/+2, Magic Missile and new-seed restart against merged implementation/docs, without adding new retirement or feature decisions (AC5).

## 3. Integrated documentation review and delivery

- [x] 3.1 Check relative Markdown targets/internal headings and referenced source numbers in both docs and planning artifacts; verify accessible GitHub evidence links read-only and record private/unavailable reference limitations without claiming a fresh legacy audit (AC6).
- [x] 3.2 Cross-review both documents against all six acceptance mappings; verify no contradictory current-state/roadmap/register claims, run `openspec validate issue-82-doc-reconciliation --strict` and `git diff --check`, and audit changed paths for the documentation-only boundary (AC6).
- [ ] 3.3 Record actual verification/remaining limitations in task-specific records; commit only the two requested docs and this change, push and create/reuse a PR against main, attach it to this task and use `Closes #82` only if all six documentation criteria are verified.

## Workflow follow-up

- Do not merge the PR or manually close the issue.
- Archive this OpenSpec change only after merge and when requested by the applicable workflow.
