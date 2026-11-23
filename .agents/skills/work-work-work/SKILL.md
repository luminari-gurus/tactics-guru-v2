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
   Read only `CAN_TEST_MOBILE` from the developer's local `.env`, using the value
   contract in `.env.example`; never print or copy unrelated environment values.
   It describes access to physical devices, not emulation or proven test results.
   Parse case-insensitively with surrounding whitespace/quotes removed and
   comma-separated platform names trimmed. `none` means no mobile platforms;
   `ios` and `android` name individual platforms; `all` means both. `none`/`all`
   must be used alone. Treat a missing, empty, unknown or conflicting value as
   `none` and report that limitation; the example file is not local availability.
   When using an isolated worktree, retain the capability value from the caller's
   checkout without copying the rest of `.env` or committing local configuration.
2. **Refresh backlog readiness before selecting any issue.** Build one inventory
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

3. Rank candidates from the updated inventory without another bulk backlog read.
   Candidates must carry the exact `ready for work` label and satisfy the
   readiness criteria above. Exclude work assigned to others, covered by an
   active branch/PR, or already in progress for this caller. Apply AGENTS.md's
   standing device instruction: browser/device emulation is sufficient unless
   the caller explicitly requires physical testing. For an explicit request,
   check the requested `CAN_TEST_MOBILE` platforms and report missing access
   without changing global readiness.

4. Prefer issues that unblock the most actionable downstream work, then critical
   path/release priority, then a clearly scoped and verifiable implementation.
   Use transitive dependencies when evidenced; do not invent links. Break equal
   choices by oldest issue number. Briefly explain the selection using issue
   links and concrete dependencies. If no eligible issue remains, report that
   and stop without assignment or branch creation.
5. Check live eligibility for the selected issue immediately before claiming,
   including the label, status, assignments, dependencies and active work. If it
   has become ineligible, skip it and try the next ranked candidate without
   repeating the bulk backlog read. Assign with `gh issue edit <number> --add-assignee <login>`
   and verify the assignment. If it was claimed by someone else, reselect.
   Preserve labels and existing assignees; do not close the issue.
   Recheck device eligibility before assignment and record the available and
   required platforms in the plan.

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
