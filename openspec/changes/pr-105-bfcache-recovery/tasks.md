# Tasks

## 1. Validate and repair cached battle restoration

- [x] 1.1 Reproduce the reviewed one-tab sequence on the rebased production build with BFCache enabled, observe persisted pageshow and record the before/after save identities; add the failing regression to the existing persistence browser suite.
- [x] 1.2 Stop departing battle scenes synchronously and reload cached returns through startup; verify exact newer-slot preservation and Continue, unchanged-save return, stale recovery-dialog return, navigation during presentation and ordinary visibility behavior. Update the storage lifecycle documentation with the observed behavior and limits.

## 2. Integrated proof and publication

- [x] 2.1 Run all unit/content/type checks, root and prefixed builds, the full configured root browser suite and relevant prefix checks; record actual counts, skips, retries, screenshots and source identity, and validate OpenSpec, links and whitespace.
- [ ] 2.2 Update the ongoing handoff and PR description, publish the rebased repair with an exact lease, reply to every actionable review finding, and verify current main ancestry, remote parity, clean worktree and mergeable PR state.

## Workflow follow-up

- Leave PR #105 open for merge; retain original acceptance and review evidence. No release tag, merge, manual deployment or unrelated OpenSpec archive is part of this repair.
