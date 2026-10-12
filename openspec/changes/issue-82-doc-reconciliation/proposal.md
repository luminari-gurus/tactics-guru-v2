# Proposal

## Why

The restart plan and technical design still present October 6 scaffold and branch facts as current, contradicting merged main and the tracker. Issue [#82](https://github.com/luminari-gurus/tactics-guru-v2/issues/82) requests a documentation reconciliation so follow-up work starts from accurate milestones and explicit acceptance gates.

## What Changes

- Refresh current-state summaries in both existing documents using a dated main SHA and live issue/PR evidence; retain the October 6 audit as historical evidence.
- Separate closed battle implementation milestones from outstanding physical readiness #57/#64 and Safari restart #66; summarize merged audio #62 and performance #65/#68 with their limitations.
- Map save/resume and short-run phases to #58–#60 and #69/#72–#81, keeping unmerged PR #70 and unresolved product choices explicit.
- Reconcile D1–D11/T1–T11 only from merged implementation or recorded owner decisions; preserve approved Guarded Strike, Magic Missile and new-seed behavior.
- Distinguish observed Pages delivery from proposed SSH PR #12, preserving production approval and analytics gates.
- Maintain a coherent accepted/deferred/retired feature ledger and verify links, cross-document consistency and whitespace.

## Capabilities

### New Capabilities

None. This is documentation reconciliation; no system behavior changes. The schema's supported `skip_specs: true` marker avoids inventing gameplay requirements.

### Modified Capabilities

None.

## Impact

Implementation edits are limited to `docs/phaser4-restart-plan.md` and `docs/tech_design.phaser4.draft.md`, plus this task's OpenSpec approval/task records. No application, tests, dependencies, deployment configuration, legacy docs or storage changes.

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/82
Caller/assignee: `dubstylee`.
Base: `origin/main` at `cae524e9e7a8c9b617c1259f4b7dc4591562488a`.
Published branch: `work/issue-82-doc-reconciliation`.
Approval: pending explicit caller approval of this plan; implementation has not begun.
