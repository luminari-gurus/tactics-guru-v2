# PR risk reassessment and merge gate

The risk assessor and the GitHub merge gate have separate jobs. The assessor
reviews the complete current diff and explains a risk level. The gate does not
infer risk from labels, changed paths, author, or CI success.

## Assessment contract

An assessment uses one task-owned PR conversation comment, starting exactly with:

```text
<!-- tactics-guru-pr-risk -->
<!-- tactics-guru-pr-risk:v1 head=FULL_40_CHARACTER_LOWERCASE_SHA level=low -->
```

Replace the SHA with the assessed head and use one of `low`, `medium`, `high`,
`critical`. Follow the two header lines with the human-readable explanation,
changed files/behaviors, validation status, uncertainty, and assessed head SHA.
Legacy comments without this versioned header do not authorize merging.

The creator and, if edited, the actual latest editor must currently have Maintain
or Admin. REST comment `user` only identifies the creator, so the gate also reads
GraphQL `IssueComment.editor` and rejects a lower-trust or unknown editor. The
existing Maintain/Admin requirements for the PR author and last low-label actor
are retained. No GitHub Actions bot or generic app is implicitly allowlisted.
Duplicate trusted task comments, malformed metadata, or a mismatch between REST
and GraphQL comment reads block merging.

Before assessment, fetch the live open, non-draft PR. For a changed head, mark
`risk:pending` and remove only the four assessment labels. Review the complete
current diff. Immediately before every publication step, re-fetch PR state and
head. Discard an outdated result; do not publish it as an assessment of the new
head. Write/verify the current-head comment first, then add its risk label,
remove other risk levels, and remove `risk:pending` last. Re-read the comment,
head and labels after publishing. If a concurrent run changed them, reconcile
against the newest head instead of blindly overwriting it. Never overwrite a
human comment or remove unrelated labels. Drafts are not assessed.

## Gate behavior

- API-only `pull_request_target`; no checkout or execution of PR contents.
- Open/reopen, synchronize and ready-for-review events invalidate old labels
  and add pending when there is no valid current-head record. Draft-only PRs
  remain untouched; converting a previously assessed PR to draft invalidates it.
- A delayed synchronize event reads live state and does not intentionally clear
  a completed assessment of a newer head. Concurrent label writes can still
  cause a fail-closed pending state; the assessor must reconcile that state.
- Only a sole `risk:low` risk label plus the exact current head's trusted low
  record admits consideration. Pending, high, medium, critical, and unknown
  risk labels block, including contradictory combinations.
- Require an open, non-draft same-repository PR; retain author/labeler trust and
  outstanding-requested-changes checks across all review pages.
- Require the latest `pr-verification.yml` pull-request run for that head,
  associated with this PR and base ref, to be completed/successful, with exactly
  one completed/successful `verify` job. Failed, missing, skipped or in-progress
  runs/jobs never qualify. A later failed/pending rerun supersedes old success.
- Recheck assessment, label actor, CI, reviews, PR state/head/base and labels
  immediately before merging. Merge uses the API's `sha` precondition, so a push
  after the final read cannot merge an unassessed commit. No auto-merge is queued.
- Label add/remove, assessment comment create/edit/delete, and CI completion all
  re-evaluate live evidence, handling either CI/assessment completion order.
- All event families use the same repository concurrency group with `queue: max`
  and no running cancellation, rather than separate PR-number/SHA groups.

GitHub cannot atomically lock comments, labels, reviews and a merge together.
Protected-branch rules remain the authoritative enforcement of required checks
and reviews. This change does not configure or weaken those rules. API failures
fail closed. A base ref change blocks the final merge; this protocol does not
claim that a SHA-only risk assessment certifies every future base-branch change.

## Deployment and verification

The workflow only takes effect after reviewed merge to the default branch.
Update the existing assessor's prompt to the versioned contract while preserving
its webhook subscriptions; synchronize events have already been observed in
its run history. This repository change does not itself create or resubscribe
an external automation. Old comments require a fresh assessment/migration;
never synthesize approval from their labels.

Run `node --test tests/tooling/risk-gate.test.mjs`. These dependency-free tests
execute the actual inline workflow script against a mocked GitHub API, including
rapid pushes, late deliveries, stale writes, final-read/merge races, editor
impersonation, contradictory labels, drafts/forks, failures, CI association and
both completion orders. They run as a separate PR verification step before
package installation. They do not perform real merges and are not evidence of a
live production webhook end-to-end test. YAML parsing is also checked locally.
No gameplay/browser behavior is changed; the existing PR verification pipeline
still performs its normal application checks.
