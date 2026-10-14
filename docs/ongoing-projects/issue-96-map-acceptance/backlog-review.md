# Backlog review — 2026-10-13

Repository: [luminari-gurus/tactics-guru-v2](https://github.com/luminari-gurus/tactics-guru-v2). Caller verified through the GitHub connector and repository credential: `moshehbenavraham`. Default branch: `main`, fetched at `79f7d983ff3a12ca38e93efdc72f3f317dfb789c`.

## Coverage and limits

Enumerated the complete open repository REST issue list with `per_page=100`: one terminal page, 19 records, comprising 18 issues and one PR. Read all issue bodies, labels, assignees, native dependency/subissue summaries, the relevant #66 comment, live branches/associated PRs and merged main. The native dependency summaries contain no blocking edges; the documented body dependencies below remain authoritative and were not ignored. #96's native subissue summary is 3/3 completed.

Private project-only drafts could not be enumerated: GraphQL `projectsV2` returned `INSUFFICIENT_SCOPES` because `read:project` is absent. This is a complete repository-issue review, not a claim of complete private project-board coverage.

Local `.env` declares `CAN_TEST_MOBILE=android` under the documented platform contract. Android access is a capability declaration, not a physical test result. Required iOS platforms are unavailable; emulation does not replace them. No unrelated environment values were read or copied into the worktree.

## Disposition of all 18 open issues

- [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57): first-battle readiness parent; #64/#66 hardware gaps remain despite completed audio/performance work. Its native completed-child count does not override body acceptance.
- [#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58): save/resume parent; #69/#72/#73 merged, but #74 certification remains.
- [#59](https://github.com/luminari-gurus/tactics-guru-v2/issues/59): short-run parent, split into #75/#76/#80/#81 and dependent rewards; not a replacement for those children.
- [#60](https://github.com/luminari-gurus/tactics-guru-v2/issues/60): rewards parent; depends on the unresolved #75 contract and #77–#79 delivery.
- [#64](https://github.com/luminari-gurus/tactics-guru-v2/issues/64): globally ready, locally ineligible because acceptance requires physical iPhone Safari/Chrome as well as Android/desktop. Readiness label preserved.
- [#66](https://github.com/luminari-gurus/tactics-guru-v2/issues/66): globally ready, locally ineligible physical iPhone Safari investigation. Earlier caller claim was explicitly withdrawn; retained planning branch is historical.
- [#74](https://github.com/luminari-gurus/tactics-guru-v2/issues/74): #72/#73 now complete, but #57 remains an explicit prerequisite and the device matrix includes unavailable iOS.
- [#75](https://github.com/luminari-gurus/tactics-guru-v2/issues/75): highest downstream contract value, but assigned to `dubstylee` and already covered by `work/issue-75-run-contract` at `1aa4b03` (not merged). Do not take over or use its draft as an accepted prerequisite.
- [#76](https://github.com/luminari-gurus/tactics-guru-v2/issues/76): blocked by accepted #75.
- [#77](https://github.com/luminari-gurus/tactics-guru-v2/issues/77): blocked by #75 and reviewed item/balance decisions.
- [#78](https://github.com/luminari-gurus/tactics-guru-v2/issues/78): blocked by #75/#77.
- [#79](https://github.com/luminari-gurus/tactics-guru-v2/issues/79): #73 complete; #75/#78 and coordinated run-save ownership remain.
- [#80](https://github.com/luminari-gurus/tactics-guru-v2/issues/80): #73 complete; #75/#76/#78/#57 remain. #79 is coordinated final acceptance, not an invented reciprocal implementation blocker.
- [#81](https://github.com/luminari-gurus/tactics-guru-v2/issues/81): blocked by #80/#79/#58/#57 and requires unavailable physical iOS.
- [#83](https://github.com/luminari-gurus/tactics-guru-v2/issues/83): release planning parent with #84/#85 and explicit activation gates.
- [#84](https://github.com/luminari-gurus/tactics-guru-v2/issues/84): read-only investigation can begin, but target/path/owner decisions remain necessary to finalize acceptance. Do not invent these choices or promote it as fully ready.
- [#85](https://github.com/luminari-gurus/tactics-guru-v2/issues/85): blocked by #84/#57 and explicit target/build production authorization.
- [#96](https://github.com/luminari-gurus/tactics-guru-v2/issues/96): selected for combined acceptance review and closeout. All children are completed and merged, the shared product contract is approved, the issue is unassigned with no linked branch or active PR, and it has no physical-iOS prerequisite.

The only open PR is [#12](https://github.com/luminari-gurus/tactics-guru-v2/pull/12), the restricted-SSH release proposal. Its installation/merge/activation gates remain separate; it is not the selected task.

## Readiness refresh and selection

Only #96 was promoted, adding exactly `ready for work` and preserving `enhancement`. Evidence: #97 / [PR #100](https://github.com/luminari-gurus/tactics-guru-v2/pull/100) merged at `be7094a`; #99 / [PR #101](https://github.com/luminari-gurus/tactics-guru-v2/pull/101) at `d15caca`; #98 / [PR #104](https://github.com/luminari-gurus/tactics-guru-v2/pull/104) at `79f7d98`, after inventory PR #103 at `63c2321`. These commits are in fetched main. The algorithm roster, biome roster and inventoried `legacy-8bit` style resolve the epic's original readiness conditions.

Refreshed the full open list after promotion and reread #96 immediately before assignment. Assigned `moshehbenavraham` and posted the [kickoff comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/96#issuecomment-6152871668); both assignment and readiness were read back. The connector rejected label mutation with integration 403, so existing repository credentials performed the authorized additive updates.

There is no evidenced new downstream dependency unlocked by #96. It wins as the remaining self-contained, unclaimed item whose scope and acceptance can be completed with available capabilities. The expected work is evidence reconciliation and focused verification, with no assumed missing feature. Existing #98 evidence may satisfy much of it; adding code is not a completion requirement. No new child issue was created and no issue was closed.

The unrelated root checkout on `work/issue-66-safari-restart`, its local instruction/environment edits and Android-certification draft are preserved. Planning uses a new managed worktree from current main.

After validating the plan, created [branch/issue-96-map-acceptance](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-96-map-acceptance) at the unchanged main tip with GitHub's native `createLinkedBranch` mutation, linking it directly to #96. The branch prefix follows the host convention. No other issue assignment or branch was changed.
