---
name: work-work-work
description: Pick up the next ready Tactics Guru issue, pick up a named issue, or continue an established issue workflow. Check readiness, claim and publish the branch, obtain plan approval, then implement and open a PR. Use for /work-work-work, $work-work-work, or the corresponding issue pickup and continuation requests.
---

# Work work work

Invoking this workflow authorizes evidence-backed backlog readiness labeling,
issue assignment, branch publication, and PR creation. Implementation requires
explicit approval of the concrete implementation plan. Creating this skill or
discussing it does not invoke the workflow.

## Resolve the request

- **Next ready issue** or a bare invocation: run the backlog selection below.
- **Pick up #N**: fetch that issue, its dependencies and related active work.
  Apply the same readiness, device and ownership checks to it directly. If it
  lacks the ready label but meets the promotion rules, verify and promote only
  that issue. Report the specific blocker if it cannot be picked up.
- **Continue or retry**: recover the issue, caller, branch and plan from the
  task conversation, persisted task context and verified remote state. Recover
  the explicit approval of that exact plan separately. If assignment or branch
  publication was interrupted, resume that step. If there is no plan yet, prepare
  one after confirming publication. If approval is pending or cannot be verified,
  present the recovered plan for approval. If the approved scope was completed
  and the caller requests the next increment, reuse the issue, check the previous
  increment's merge state and dependencies, and plan the next increment for
  approval. Start a fresh branch from the default branch when the prior branch
  was merged. If the prior task
  identity is ambiguous, ask which issue or branch to resume.

Read repository instructions and inspect Git status/remotes. Resolve the repository
and default branch with `gh repo view --json nameWithOwner,defaultBranchRef`.
Resolve the caller with `gh api user --jq .login`, unless the user names another
GitHub login. Use GitHub identity for ownership checks.

### Device testing

Apply AGENTS.md's standing browser/device emulation policy. Only when the caller
explicitly requires physical-device testing, read `CAN_TEST_MOBILE` from the
caller's local `.env` and use the contract in `.env.example`. Read only that
variable, including when using an isolated worktree. Strip surrounding whitespace
and quotes, normalize case and trim comma-separated platforms. `ios` and
`android` name individual platforms. `all` means both and `none` means neither.
Use `all` and `none` alone. Treat missing, empty, unknown or conflicting values
as `none`. Report missing required platforms without changing global readiness.
Record requested and available platforms in the plan only for an explicit
physical-device request. Availability is separate from completed testing.

## Select the next ready issue

1. **Refresh backlog readiness before selecting any issue.** Build one inventory
   of all open issues and open PRs using `gh api --paginate` or limits verified
   to include every result. Include issue bodies, labels and assignees, including
   unlabeled issues. Index PRs by their linked issues and head branches. Inspect
   relevant comments, GitHub dependency relationships, active branches, and merged
   work on the default branch. Cache evidence for shared prerequisites and merge
   checks within this invocation. A parent/epic reference alone is not a blocker.
   An unmerged prerequisite PR is not a completed prerequisite.

   Promote an issue only when the scope and acceptance criteria are concrete and
   verifiable, actual prerequisites are complete, and no product decision or blocker
   remains. Leave another person's assigned work and issues with active branches
   or PRs unchanged. Immediately before each promotion, check live issue status,
   assignments, dependencies and active work for that issue. Add only the exact
   `ready for work` label with
   `gh issue edit <number> --repo <owner/repo> --add-label "ready for work"`.
   Preserve existing labels and assignees. Reread the issue after the write and
   replace its inventory entry with the returned state. Treat the promotion as
   successful only if that read confirms the label. Record the issue link and
   readiness evidence, or report the gap or failed write.

2. Rank candidates from the updated inventory without another bulk backlog read.
   Candidates must carry the exact `ready for work` label and satisfy the
   readiness criteria above. Exclude work assigned to others, covered by an
   active branch/PR, or already in progress for this caller. Apply the
   device testing rules above.

3. Prefer issues that unblock the most actionable downstream work, then critical
   path/release priority, then a clearly scoped and verifiable implementation.
   Use transitive dependencies when evidenced; do not invent links. Break equal
   choices by oldest issue number. Briefly explain the selection using issue
   links and concrete dependencies. If no eligible issue remains, report that
   and stop without assignment or branch creation.

## Claim the issue and publish the branch

Immediately before claiming, check live eligibility, including the label, status,
assignments, dependencies and active work. For backlog selection, skip a candidate
that has become ineligible and try the next ranked candidate from the inventory.
For a named issue or continuation, report the blocker for that issue.

Record the repository, issue, caller and intended branch name in the task context
before mutating GitHub. Reuse that record on retries. Assign with
`gh issue edit <number> --repo <owner/repo> --add-assignee <login>` if the issue
is unassigned. Reread the issue after the write and require the caller to be the
sole assignee before publishing. If the reread finds another assignee alongside
the caller, preserve both assignments and stop before publishing. On continuation,
verify the existing sole assignment and distinguish the caller's own resumed work
from a separate task on the same issue.

Fetch the default branch. Start new work from its current remote tip using a clean
single-task branch named `work/issue-<number>-<short-slug>`. Preserve existing
local changes and commits. Use an isolated worktree when the checkout is dirty or
hosts other work, following the host's worktree lifecycle where available.

Check local and remote branches against the recorded claim before creating or
publishing a branch. Confirm matching ownership from task context or associated
GitHub work and verify the branch belongs to this issue. If a matching remote
branch exists and contains the intended head, reuse it and confirm its remote
ref. If the branch has an active PR for this task, resume that PR when directed
to continue it. If the recorded branch is local only, retry publishing it with
`git push --set-upstream origin <branch>`. If neither ref exists after an
interrupted initial publication, recreate the recorded name. For a new task,
use a suffix only after establishing that an existing branch belongs to separate
work and the issue is otherwise eligible. If the branch identity or divergence
cannot be resolved, report the conflict. Never force-push.

Record the exact branch name and intended head before pushing. Publish the branch
as soon as it is prepared, before planning, and verify the remote ref.
Record the issue, caller, base and verified branch in the plan. If assignment or
publication fails, state what succeeded and what failed. Stop before implementation
and retry the same claim when the caller asks to continue.

## Choose the planning scope

Inspect the real code and acceptance criteria before choosing the planning path.
Follow AGENTS.md's small, incremental PR guidance. When an issue needs multiple
PRs, identify the current increment, map criteria to increments, and record the
remaining work and dependencies on the issue. Keep each increment independently
reviewable, verifiable, and safe to merge.
Use a brief plan in chat when the change is small, localized and well understood,
its acceptance criteria can be verified directly, and OpenSpec artifacts would
add bulk without resolving meaningful design or requirements questions. Examples
include a focused bug fix, copy adjustment or straightforward configuration edit.
Judge by scope and uncertainty, not a fixed file or line count. Use OpenSpec for
broader behavior changes, cross-cutting work, significant design decisions, or
when the user or repository instructions explicitly require it.

For the small-change path, do not initialize OpenSpec or create spec, proposal,
design or task files solely for this issue. Present the issue and selection
rationale, published branch link, reason OpenSpec is unnecessary, affected files,
implementation steps and verification covering every acceptance criterion.
Ask the caller to approve this concrete plan and **end the turn awaiting
approval**. Do not edit application code or implement tests before approval.

## Prepare the OpenSpec plan (when needed)

Use existing OpenSpec instructions/configuration and installed skills if present.
Otherwise check `openspec --version` and CLI help; if the CLI is missing, arrange
installation through the normal execution/approval mechanism before proceeding.
Do not substitute an ordinary chat plan for OpenSpec or add it to game dependencies.
Initialize OpenSpec in the worktree if absent using the installed CLI's supported
Codex integration options. This invocation authorizes task-specific OpenSpec
setup, not importing legacy requirements or external design plans.

Create or resume `issue-<number>-<short-slug>` with `openspec new change <id>`.
Use `openspec status --change <id> --json` and
`openspec instructions <artifact> --change <id> --json` to create the schema's
required proposal, capability specs, design and checkbox tasks in dependency
order. Read the installed CLI's help when syntax differs.

The artifacts must tie every issue acceptance criterion to implementation and
verification, state affected files, dependencies, scope exclusions, and risks,
and include the issue URL and branch identity. Inspect the real code before
planning. Validate with `openspec validate <id> --strict` and resolve failures.
Commit only task-specific planning/setup files, obey the repository attribution
rule, and push them so the plan is reviewable on the published branch.

Present the selected issue, selection rationale, branch link, artifact links,
implementation summary and validation result. Ask the caller to approve this
specific plan and **end the turn awaiting approval**. Do not edit application
code or implement tests before approval. The initial invocation, elapsed time,
OpenSpec structural validation and another agent's opinion are not approval.
Revise requested plan changes and obtain approval of the revised plan.

## Implement after approval

On continuation, recover the same issue, branch and approved plan from the
conversation and any artifacts. Verify explicit caller approval of this plan;
do not select another issue or create another branch. For OpenSpec work, read
OpenSpec apply instructions and follow its tasks, checking them off only as
completed, and record approval in the task-specific plan. For small changes,
follow the approved chat plan without adding planning files. Implement
autonomously within approved scope. For material scope changes, reassess whether
OpenSpec is needed, update the plan and obtain approval before that work.

Follow the issue's delivery guardrails and
[verification policy](../../../docs/verification-policy.md). Inspect current
scripts/configs, choose iteration/PR/full coverage by affected behavior and
transitive consumers, and record the selection rationale. Explicit issue gates
remain required. Use test discovery to check filters and account for every
required suite/mode, including dev fixtures, placement, WebKit and telemetry.
Do not assume `npm test` is focused or covers full regression.

Run final affected checks against the final relevant source/build inputs. Reuse
prior evidence only under the policy's input/provenance rules, stating its original
tested commit and remaining failures. Do not rerun the full matrix merely because
prose or unrelated inputs changed, and do not claim focused repairs make an earlier
failed full run green. Documentation-only work needs link/command/config checks,
not application execution. Retain strict typechecks/build and browser journeys
where the selected change scope requires them. Run `git diff --check`.

Use self-hosted browser capacity with no automatic GitHub-hosted fallback. Keep
performance captures exclusive. Report actual results and unverified acceptance
criteria; describe emulation accurately without claiming physical-device proof.
Compare the final implementation against every acceptance criterion and approved
plan, including OpenSpec tasks when present.

## Open the PR

Commit only this issue's changes, push the branch, and create a PR against the
repository default branch with `gh pr create`, honoring any repository template.
Use a body file for multiline descriptions. Include the problem/result, issue
link, planning path and approval (link the OpenSpec change when present), validation commands/results, and remaining
limitations. Add `Closes #<number>` only if all acceptance criteria are verified.
For a complete, validated increment that leaves issue criteria outstanding, open
a ready-for-review PR with `Refs #<number>` and state the criteria addressed,
remaining work, and dependencies. Keep the issue open until all criteria are met
and verified. If the increment itself is blocked or incomplete, open a draft PR
with `Refs #<number>` and explain what remains before it is ready. Do not merge
the PR, close the issue manually, or archive an OpenSpec change before merge.

Check for an existing PR for this branch before creation and reuse it on retries.
Attach the PR to the task with the host's artifact tool when available. Return
the issue, published branch and PR links with a concise implementation/test result.
