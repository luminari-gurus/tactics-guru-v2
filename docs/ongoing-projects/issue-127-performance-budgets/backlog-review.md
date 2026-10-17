# Backlog review — 2026-10-17

Repository: [luminari-gurus/tactics-guru-v2](https://github.com/luminari-gurus/tactics-guru-v2). Authenticated caller: `moshehbenavraham`. Planning base: `0b317e35bb5c4ce713c242311f0673fc27923637`.

## Coverage and current policy

Read all 12 open repository issues, including bodies, labels, assignees and all five existing comments; both open PRs; all 64 remote branch names/tips; native linked-branch, blocker and sub-issue relationships; current main, OpenSpec task status and retained QA evidence. The REST inventories were below their 100-item page size; the independent GraphQL issue count was 12 with `hasNextPage: false`, and all comment pages were complete. No native blocker edges were present, so body/comment dependencies were evaluated explicitly rather than inferred from parent membership. No open issue had a native linked branch before this claim; active PR #119 still provides clear ownership evidence.

The repository's GitHub Projects query returned `INSUFFICIENT_SCOPES`: the credential lacks `read:project`. Private project-only drafts are therefore outside this review's coverage; no claim is made that they were empty. No permission expansion was attempted.

The caller checkout has `CAN_TEST_MOBILE=android`. Current main's AGENTS.md and merged [PR #125](https://github.com/luminari-gurus/tactics-guru-v2/pull/125) accept Playwright/device emulation for all work unless physical testing is explicitly requested for that task. Older hardware-only wording in the local skill, issue history and specs does not disqualify these issues. #127 explicitly accepts Playwright evidence.

## Disposition of every open issue

- [#127 — performance-budget failures](https://github.com/luminari-gurus/tactics-guru-v2/issues/127): selected. Unassigned, ready, concrete limits and retained source-bound failures, no competing branch/PR or prerequisite. Directly holds up #57/#64/#81. Assigned to the caller after a fresh ownership check; kickoff comment linked from the plan.
- [#111 — responsive battle controls](https://github.com/luminari-gurus/tactics-guru-v2/issues/111): already assigned to the caller and implemented in open [PR #119](https://github.com/luminari-gurus/tactics-guru-v2/pull/119), head `2b419eff2f4183c3e9357d45b75caaeceb12bc70`. Excluded from a new claim. PR reports repaired findings and local verification; this review does not revalidate or merge it.
- [#123 — collapsible mobile HUD](https://github.com/luminari-gurus/tactics-guru-v2/issues/123): explicit prerequisite is the final merged #111/#119 HUD. PR #118 geometry is merged, but #119 is open. Do not promote or duplicate the pending layout work.
- [#128 — PostHog analytics/error logging](https://github.com/luminari-gurus/tactics-guru-v2/issues/128): assigned to `florysaxz`, with active discussion. Excluded; project/region/collection-policy decisions remain its planning work. Coordinate later on transfer budgets; do not treat its suggested code as verified repository structure.
- [#64 — battle certification](https://github.com/luminari-gurus/tactics-guru-v2/issues/64): latest issue update retains actual #127 performance gates and references pending #111 touch sizing. The device matrix is evidenced under the accepted emulation policy. Do not start duplicate measurements as a competing performance fix or mark complete.
- [#81 — complete-run certification](https://github.com/luminari-gurus/tactics-guru-v2/issues/81): #79/#80 and persistence prerequisites are merged; legal full-run evidence is retained. Latest update expressly keeps #81 open for #127. Promote only after the real failure is resolved and its own acceptance is reviewed.
- [#57 — first-battle readiness](https://github.com/luminari-gurus/tactics-guru-v2/issues/57): parent acceptance currently waits on #127. Earlier accepted baseline does not override newer failures; no independent implementation slice is created.
- [#59 — authored run epic](https://github.com/luminari-gurus/tactics-guru-v2/issues/59): #75/#76/#80 children are closed and integrated, #81 remains open. Preserve the epic's own acceptance; #127 removes a downstream performance obstacle through #81, not every remaining gate.
- [#60 — rewards/items epic](https://github.com/luminari-gurus/tactics-guru-v2/issues/60): #77/#78/#79 are closed; run/reward evidence exists. This is an acceptance reconciliation candidate, not a missing feature implementation. Its body requests no ready label on the parent, and #81's evidence expressly does not close it by proxy.
- [#84 — release-target review](https://github.com/luminari-gurus/tactics-guru-v2/issues/84): read-only investigation can proceed, but completing a target-specific runbook needs owner choices. Lower priority than a concrete software failure that directly blocks three acceptance trackers; no invented target choice or readiness promotion.
- [#85 — approved cutover execution](https://github.com/luminari-gurus/tactics-guru-v2/issues/85): requires accepted #84, accepted #57 and explicit target/build/operations authorization. Not eligible.
- [#83 — release/cutover epic](https://github.com/luminari-gurus/tactics-guru-v2/issues/83): owned by #84/#85's decision and authorization chain. No implementation-ready parent or production authorization inferred.

## Readiness result and selection

No new readiness label was justified: #123 has an unmerged prerequisite, #84 has unresolved owner decisions, other unlabelled entries are assigned work or acceptance/production parents with their own remaining gates. Existing labels and other ownership were preserved. A second all-open issue read confirmed the same 12 issues before claiming #127. The ready label was not the initial filter or the reason for the selection.

#127 has the strongest evidenced unblocking value: direct gates in #57/#64/#81, then the #59 run-acceptance and #85 release chains subject to their independent requirements. It offers measurable, bounded work on merged main without requiring a product decision. #84's useful read-only investigation and #60's acceptance reconciliation remain alternatives, but neither removes these demonstrated software failures.

Merged prerequisites were verified from GitHub and the fetched main: #125 at `13418626fab4cc40609cd2255d54800c15e34805`, #126 at `0b317e35bb5c4ce713c242311f0673fc27923637`, #120 at `b175ddb5dabed2ee8457e132e345e9a2fc2affdb`, and #116 at `46284e10d18271b2e410e3c2532e27231cd3a8d6`. Open [PR #12](https://github.com/luminari-gurus/tactics-guru-v2/pull/12) remains a separately gated SSH release proposal and is not selected infrastructure.

Completed OpenSpec task sets are retained historical delivery, not additional unclaimed implementation. The only pre-existing in-progress change on current main is #111; its active PR owns the remaining delivery. No closed issue, completed branch or checklist was reopened merely because it still exists locally.

## Publication scope

The session assigns and comments on #127, writes [the implementation plan](../plan.md), prepares its OpenSpec artifacts, and publishes `work/issue-127-performance-budgets` from the fetched main tip, natively linked to #127. Downstream issues are rationale and acceptance consumers, not additional claimed scope. No application code, tests, production settings or unrelated issue state is changed.
