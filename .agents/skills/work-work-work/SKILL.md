---
name: work-work-work
description: Select the best ready-for-work GitHub issue, assign the caller, publish a branch, prepare an OpenSpec plan, wait for approval, then implement and open a PR. Use when the user invokes /work-work-work or asks to pick up the next ready backlog issue.
---

# Work work work

Invoking this workflow authorizes issue assignment, branch publication, and PR
creation. Implementation requires explicit approval of the concrete OpenSpec
plan. Creating this skill or discussing it does not invoke the workflow.

## Select and claim

1. Read repository instructions and inspect Git status/remotes. Resolve the
   repository and default branch with `gh repo view --json nameWithOwner,defaultBranchRef`.
   Resolve the caller with `gh api user --jq .login`, unless the user explicitly
   identifies a different GitHub login. Do not guess the caller from Git author settings.
2. Read the entire open backlog with pagination (`gh api --paginate` or a limit
   verified to include all results), including bodies, labels and assignees.
   Candidates must have the exact `ready for work` label. Inspect relevant
   comments, GitHub dependency relationships, and open PRs. Verify prerequisites
   against merged work on the default branch; a readiness label alone is insufficient.
   Exclude blocked issues, unresolved prerequisites, issues assigned to other
   people, and work already covered by an active branch/PR or this caller's
   ongoing task. Never treat a parent/epic reference as a blocking dependency.
3. Prefer issues that unblock the most actionable downstream work, then critical
   path/release priority, then a clearly scoped and verifiable implementation.
   Use transitive dependencies when evidenced; do not invent links. Break equal
   choices by oldest issue number. Briefly explain the selection using issue
   links and concrete dependencies. If no eligible issue remains, report that
   and stop without assignment or branch creation.
4. Re-read the selected issue immediately before claiming to catch changed
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

## Prepare the OpenSpec plan

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

On continuation, recover the same issue, branch and OpenSpec change from the
conversation and artifacts. Verify explicit caller approval of this plan; do not
select another issue or create another branch. Read OpenSpec apply instructions
and follow its tasks, checking them off only as completed. Record the approval
in the task-specific plan, then implement autonomously within approved scope.
For material scope changes, update the plan and obtain approval before that work.

Follow the issue's delivery guardrails and repository checks. For this repository,
inspect the current package scripts and run relevant focused tests, full configured
unit/browser tests, strict type checking, production build and `git diff --check`
as required by the issue. Record actual results and unverified acceptance criteria;
never claim emulated browser checks prove physical-device acceptance. Compare
the final implementation against every acceptance criterion and OpenSpec task.

## Open the PR

Commit only this issue's changes, push the branch, and create a PR against the
repository default branch with `gh pr create`, honoring any repository template.
Use a body file for multiline descriptions. Include the problem/result, issue
link, OpenSpec change and approval, validation commands/results, and remaining
limitations. Add `Closes #<number>` only if all acceptance criteria are verified.
If blocked or incomplete, open a draft PR with `Refs #<number>` and explain the
remaining work instead of claiming completion. Do not merge the PR, close the
issue manually, or archive OpenSpec before merge.

Check for an existing PR for this branch before creation and reuse it on retries.
Attach the PR to the task with the host's artifact tool when available. Return
the issue, published branch and PR links with a concise implementation/test result.
