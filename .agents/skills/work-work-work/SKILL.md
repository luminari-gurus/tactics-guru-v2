---
name: work-work-work
description: Refresh backlog readiness, select the best ready-for-work GitHub issue, assign the caller, publish a branch, prepare a proportional plan, wait for approval, then implement and open a PR. Use when the user invokes /work-work-work or asks to pick up the next ready backlog issue.
---

# Work work work

Invoking this workflow authorizes evidence-backed backlog readiness labeling,
issue assignment, branch publication, and PR creation. Implementation requires
explicit approval of the concrete implementation plan. Creating this skill or
discussing it does not invoke the workflow.

## Select and claim

1. Read repository instructions and inspect Git status/remotes. Resolve the
   repository and default branch with `gh repo view --json nameWithOwner,defaultBranchRef`.
   Resolve the caller with `gh api user --jq .login`, unless the user explicitly
   identifies a different GitHub login. Do not guess the caller from Git author settings.
2. **Refresh backlog readiness before selecting any issue.** Read the entire
   open backlog with pagination (`gh api --paginate` or a limit verified to
   include all results), including bodies, labels and assignees. Do not filter
   the initial scan to issues already labeled `ready for work`: check new and
   previously unready issues for newly satisfied prerequisites. Inspect relevant
   comments, GitHub dependency relationships, merged work on the default branch,
   and active branches/open PRs. Never treat a parent/epic reference as a blocker.
   An unmerged prerequisite PR is not a completed prerequisite.

   Promote an issue only when its implementation scope and acceptance criteria
   are concrete and verifiable, every actual prerequisite is complete, and no
   unresolved product decision or blocker remains. Do not relabel another
   person's assigned work or issues already covered by an active branch/PR.
   Re-read each proposed promotion immediately before updating it to catch
   changed status, assignments, dependencies or ongoing work. Add only the exact
   `ready for work` label with
   `gh issue edit <number> --repo <owner/repo> --add-label "ready for work"`;
   preserve all existing labels/assignees and do not close issues. Read back the
   exact issue to verify the label, and record the issue link plus evidence for
   its readiness. If evidence is incomplete, leave it unchanged and report the
   gap rather than guessing or broadening scope. If the label/update cannot be
   performed, report the blocker; do not claim promotion succeeded.
3. Refresh the backlog after the readiness pass so newly promoted issues compete
   with existing ready issues. Candidates must have the exact `ready for work`
   label; a label alone is insufficient. Recheck prerequisites against merged
   work on the default branch. Exclude blocked issues, unresolved prerequisites,
   issues assigned to other people, and work already covered by an active
   branch/PR or this caller's ongoing task.
4. Prefer issues that unblock the most actionable downstream work, then critical
   path/release priority, then a clearly scoped and verifiable implementation.
   Use transitive dependencies when evidenced; do not invent links. Break equal
   choices by oldest issue number. Briefly explain the selection using issue
   links and concrete dependencies. If no eligible issue remains, report that
   and stop without assignment or branch creation.
5. Re-read the selected issue immediately before claiming to catch changed
   assignments/status. Assign with `gh issue edit <number> --add-assignee <login>`
   and verify the assignment. If it was claimed by someone else, reselect.
   Preserve labels and existing assignees; do not close the issue.

## Publish the work branch

Fetch the default branch. Create a clean single-task branch from its current
remote tip named `work/issue-<number>-<short-slug>`. Preserve all existing local
changes and commits; use an isolated worktree when the current checkout is dirty
or hosts other work. Follow the host's worktree lifecycle if available.

Check local/remote branches before creation. Resume an existing branch only after
verifying it belongs to this issue/caller and has no active PR or unrelated work;
otherwise use a unique suffix. Publish immediately with
`git push --set-upstream origin <branch>`, even before the plan exists. Never
force-push. Confirm the remote branch and record the issue, caller, base and branch
in the plan. If assignment or publishing fails, report the actual partial state
and stop before implementation; do not claim publication succeeded.

## Choose the planning scope

Inspect the real code and acceptance criteria before choosing the planning path.
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

Follow the issue's delivery guardrails and repository checks. For this repository,
inspect the current package scripts and run relevant focused tests, full configured
unit/browser tests, strict type checking, production build and `git diff --check`
as required by the issue. Record actual results and unverified acceptance criteria;
never claim emulated browser checks prove physical-device acceptance. Compare
the final implementation against every acceptance criterion and approved plan,
including OpenSpec tasks when present.

## Open the PR

Commit only this issue's changes, push the branch, and create a PR against the
repository default branch with `gh pr create`, honoring any repository template.
Use a body file for multiline descriptions. Include the problem/result, issue
link, planning path and approval (link the OpenSpec change when present), validation commands/results, and remaining
limitations. Add `Closes #<number>` only if all acceptance criteria are verified.
If blocked or incomplete, open a draft PR with `Refs #<number>` and explain the
remaining work instead of claiming completion. Do not merge the PR, close the
issue manually, or archive an OpenSpec change before merge.

Check for an existing PR for this branch before creation and reuse it on retries.
Attach the PR to the task with the host's artifact tool when available. Return
the issue, published branch and PR links with a concise implementation/test result.
