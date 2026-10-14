# Backlog selection — 2026-10-14

Repository: [luminari-gurus/tactics-guru-v2](https://github.com/luminari-gurus/tactics-guru-v2). Authenticated caller: `moshehbenavraham`. Default branch: `main`, inspected at `6292b1c808fc7d18aab2a70da7cfe8bbdef87837`. Local `CAN_TEST_MOBILE=android`; this declares physical access, not test results.

## Coverage and method

Read all 18 open issues, their bodies/labels/assignees and all comments; paginated issue, PR, branch and dependency endpoints to exhaustion. GraphQL independently confirmed 18 open issues and no next page. Read all linked branch records and checked 50 remote branches and the one open PR, #12. Native blocked-by/blocking relationships were empty, so dependency evidence comes from issue text and merged main. Re-fetched main and refreshed the backlog immediately before claiming #106.

The Projects API rejected enumeration because the available credential lacks `read:project`. The public repository Projects page displayed zero open and zero closed projects. Private project-only drafts are outside verified coverage; no credential permissions were changed. GitHub CLI was unavailable, so repository Git credentials were used in memory for REST/GraphQL requests without printing or persisting secrets.

Closed prerequisites #69/#72/#73/#75 and map work #87/#96/#97/#98/#99 were checked against live issue state and current main's merged code/documents. #88 and #92 are also completed. In particular, the merged #75 contract explicitly leaves item definitions, balance, choice count and effects to #77; its closure does not resolve those choices. Prior handoff recommendations were rechecked rather than treated as current ownership.

## Disposition of every open issue

- [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57): first-battle readiness epic; remaining physical certification #64 and Safari #66 gates. Not an independently ready implementation task.
- [#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58): save/resume epic; #69/#72/#73 implementation is merged, but #74 certification and its gates remain.
- [#59](https://github.com/luminari-gurus/tactics-guru-v2/issues/59): authored-run epic; #75 is now merged despite stale unchecked parent text. #76/#78/#79/#80/#81 and readiness acceptance remain.
- [#60](https://github.com/luminari-gurus/tactics-guru-v2/issues/60): rewards/items epic; concrete work belongs to #77–#79, with reviewed item choices outstanding.
- [#64](https://github.com/luminari-gurus/tactics-guru-v2/issues/64): globally ready, ineligible for this caller because acceptance requires physical iPhone Safari/Chrome as well as Android. Readiness label retained.
- [#66](https://github.com/luminari-gurus/tactics-guru-v2/issues/66): globally ready but requires physical iPhone Safari. Earlier caller claim was withdrawn; linked `work/issue-66-safari-restart` is explicitly historical planning. No renewed claim.
- [#74](https://github.com/luminari-gurus/tactics-guru-v2/issues/74): #72/#73 implementation prerequisites are complete; still blocked by #57 and requires unavailable physical iOS. New #105 BFCache evidence is supporting automation, not certification.
- [#76](https://github.com/luminari-gurus/tactics-guru-v2/issues/76): #75 prerequisite is merged; already assigned to `dubstylee` with `work/issue-76-authored-encounters`. Preserve their work and labels.
- [#77](https://github.com/luminari-gurus/tactics-guru-v2/issues/77): #75 prerequisite is now complete, and this would unlock #78, then #79/#80/#81. However, reviewed item/balance/choice/slot/effect decisions are not recorded; it is not ready for implementation under the readiness rule. Leave unlabeled rather than inventing product choices.
- [#78](https://github.com/luminari-gurus/tactics-guru-v2/issues/78): still blocked by #77 even though #75 is complete.
- [#79](https://github.com/luminari-gurus/tactics-guru-v2/issues/79): #73/#75 are complete, but #78 remains. Coordinate the single run-save extension with #80 when eligible.
- [#80](https://github.com/luminari-gurus/tactics-guru-v2/issues/80): #73/#75 are complete; #76/#78 and #57 acceptance remain. Final integration also waits for #79.
- [#81](https://github.com/luminari-gurus/tactics-guru-v2/issues/81): blocked by #79/#80, #58 and #57 acceptance; also needs the full physical iOS/Android matrix.
- [#83](https://github.com/luminari-gurus/tactics-guru-v2/issues/83): release epic with target/owner and activation gates; not an implementation candidate.
- [#84](https://github.com/luminari-gurus/tactics-guru-v2/issues/84): read-only research can proceed, but target/path/ownership decisions are required to finish its acceptance. No ready label or owner-approved production choice exists.
- [#85](https://github.com/luminari-gurus/tactics-guru-v2/issues/85): blocked by #84, #57 and concrete production authorization. Open PR #12 is neither installed infrastructure nor an accepted release decision.
- [#106](https://github.com/luminari-gurus/tactics-guru-v2/issues/106): ready, initially unassigned, no dependency, linked branch or active PR, bounded presentation scope, no physical-iOS requirement. **Selected.**
- [#108](https://github.com/luminari-gurus/tactics-guru-v2/issues/108): ready, unassigned, separate battle-controls design work. Coordinate visible feedback with #106; neither issue establishes a blocking dependency on the other.

## Selection and changes

#106 and #108 are the eligible ready choices. Neither has an evidenced downstream blocker or higher explicit release priority; #106 has a concrete, verifiable implementation and wins the oldest-issue tie-break. Do not claim it unblocks the run/release chain. No new readiness promotions were justified and no labels were removed or changed.

Assigned #106 to `moshehbenavraham` and verified the [claim comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/106#issuecomment-6165482833). After completing the plan, created `branch/issue-106-ability-animations` at the revalidated main tip through GitHub's linked-branch operation and verified the native #106 Development link. The [plan](../plan.md) is committed on that branch. No other issue is claimed or closed. Original checkout edits and other worktrees remain untouched. The final fetch also confirmed new activity on #76's existing branch, reinforcing its exclusion.
