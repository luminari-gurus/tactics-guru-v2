# Backlog selection - 2026-10-12

Repository: `luminari-gurus/tactics-guru-v2`. Caller: `moshehbenavraham`, independently verified through the GitHub connector and repository credential. Default branch: `main`; inspected tip `3f3792025f29716c977cbdebff9d1c94b750ec3c`.

## Coverage and selection rules

Read all open issue bodies, labels, assignees and native dependency/sub-issue summaries. REST page 1 contained 22 issues plus two PRs; page 2 was empty. GraphQL independently reported 22 open issues and `hasNextPage: false`. Read both open PR descriptions, enumerated remote branches and every open issue's linked-branch count. Only #66 had a native linked branch; its comment explicitly withdraws the old claim because physical iOS is unavailable. #87 is assigned to another contributor and implemented in open PR #93. Neither open PR covers #73.

No open issue had native dependency edges; prerequisites are recorded in issue bodies, so the audit used those explicit relationships and merged ancestry rather than inferring blockers from parent references. #69 and #72 are closed as completed; their PR #70/#91 merges are on main. #73 is allowed to implement before release acceptance; #57 is its release gate, and physical persistence certification is #74.

Only `CAN_TEST_MOBILE` was read from local developer configuration. Its normalized value is `android`: Android physical access, no iOS access. This is capability, not completed device evidence. Tasks requiring both platforms remain ineligible. No local `.env` content is copied into this worktree or commit.

Private GitHub Project-only drafts could not be enumerated: the existing credential lacks `read:project`, and the connector has no Projects enumeration tool. This is a complete repository issue/PR review, not a claim to have inspected inaccessible private project drafts.

## Disposition of every open issue

- [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57): readiness epic, with #64/#66 hardware/restart gaps; keep as parent, not a standalone implementation candidate.
- [#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58): save/resume epic; codec #69 and adapter #72 are complete, integration #73 and certification #74 remain. Select its scoped child.
- [#59](https://github.com/luminari-gurus/tactics-guru-v2/issues/59): authored-run epic with unresolved contracts and dependent children; do not claim the aggregate.
- [#60](https://github.com/luminari-gurus/tactics-guru-v2/issues/60): rewards/items epic; depends on the run contract and its scoped children.
- [#64](https://github.com/luminari-gurus/tactics-guru-v2/issues/64): globally ready physical certification, but requires iPhone Safari/Chrome as well as Android; not eligible for this caller.
- [#66](https://github.com/luminari-gurus/tactics-guru-v2/issues/66): globally ready Safari investigation, but physical iPhone verification is mandatory. The retained historical branch is not active work for this caller. Leave unchanged.
- [#73](https://github.com/luminari-gurus/tactics-guru-v2/issues/73): selected. #69/#72 merged, no assignee/active PR/linked branch at claim, five concrete acceptance criteria, no physical-platform prerequisite. Resolve failed-invalidation behavior in the scoped plan; promote to `ready for work`, assign the caller and post kickoff.
- [#74](https://github.com/luminari-gurus/tactics-guru-v2/issues/74): blocked by #73 and #57 acceptance; also requires unavailable physical iOS.
- [#75](https://github.com/luminari-gurus/tactics-guru-v2/issues/75): useful contract planning, but reviewed HP/defeated-hero/healing/reward choices are unresolved. Leave unlabelled rather than inventing product decisions.
- [#76](https://github.com/luminari-gurus/tactics-guru-v2/issues/76): blocked by #75's accepted encounter/carryover contract.
- [#77](https://github.com/luminari-gurus/tactics-guru-v2/issues/77): blocked by #75 and reviewed item/balance choices.
- [#78](https://github.com/luminari-gurus/tactics-guru-v2/issues/78): blocked by #77 and #75.
- [#79](https://github.com/luminari-gurus/tactics-guru-v2/issues/79): blocked by #78, #73 and #75; #73 removes its persistence-integration prerequisite, not all blockers.
- [#80](https://github.com/luminari-gurus/tactics-guru-v2/issues/80): blocked by #75, #76, #78, #73 and #57 acceptance; coordinate with #79 for final acceptance.
- [#81](https://github.com/luminari-gurus/tactics-guru-v2/issues/81): blocked by #80, #79, #58 and #57; physical iOS is also required.
- [#83](https://github.com/luminari-gurus/tactics-guru-v2/issues/83): release planning epic; scoped review and separately approved execution belong to #84/#85.
- [#84](https://github.com/luminari-gurus/tactics-guru-v2/issues/84): read-only investigation can start, but an owner production-target/path decision is needed to complete it; leave unlabelled.
- [#85](https://github.com/luminari-gurus/tactics-guru-v2/issues/85): blocked by #84, #57 and explicit target/build/operations authorization.
- [#87](https://github.com/luminari-gurus/tactics-guru-v2/issues/87): assigned to `dubstylee`, covered by open [PR #93](https://github.com/luminari-gurus/tactics-guru-v2/pull/93); exclude active work.
- [#88](https://github.com/luminari-gurus/tactics-guru-v2/issues/88): eligible, ready, unassigned art-template documentation; no evidenced dependency chain it immediately supplies.
- [#92](https://github.com/luminari-gurus/tactics-guru-v2/issues/92): eligible, ready, unassigned asset-base defect with reproduction and no dependencies; keep separate from persistence.
- [#94](https://github.com/luminari-gurus/tactics-guru-v2/issues/94): awaits authorized provider logs/root-cause evidence; no verified ready repair scope. It no longer blocks #87.

[PR #12](https://github.com/luminari-gurus/tactics-guru-v2/pull/12) is separately gated deployment work; it is not a prerequisite for this application change and is not selected for merge or installation.

## Why #73 wins

After the readiness refresh, eligible implementation candidates are #73, #88 and #92. #73 directly supplies named prerequisites of #74, #79 and #80, with a transitive path to #81. Those children retain their other gates. #88/#92 are concrete and useful but have no recorded downstream prerequisite chain. This follows the repository ordering of downstream value, critical path, then scoped verification. #75 could have broad downstream value once product decisions are reviewed; its unresolved choices do not make it an implementation-ready alternative today.

The reset decision uses existing primitives: require successful old-slot invalidation before committing a new session; otherwise retain current play and report incomplete reset. No new product rule, serializer, storage format or dependency is needed. Physical iOS remains excluded. Only #73 receives readiness/assignment changes; preserve all other issue labels and assignments.

Planning record: [active plan](../plan.md), [kickoff comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/73#issuecomment-6128412106), [task branch](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-73-battle-resume).
