# Tasks

Implementation authorized by the caller on 2026-11-10, including autonomous fixes,
verification, commits/pushes and incremental labeled PRs. No merge/deployment.
See [plan.md](../../../docs/ongoing-projects/plan.md) for the three-PR scope and
all acceptance gates. Checkboxes represent implemented and verified work only.

## 1. Record model, storage and existing menu — PR 1

- [x] 1.1 Add the bounded immutable record schema and pure authored/dungeon projections; verify unique identity, conflicting duplicates, every phase, distinct floor counts, bounds and stable ordering in focused units.
- [x] 1.2 Implement the separate primary/backup history store, 100-entry retention and bounded pending/sealed receipts with injected providers and serialized verified writes; verify eviction, current-terminal deduplication, concurrent candidates, corrupt/future versions, quota/security/readback failures and preserved bytes in storage units.
- [x] 1.3 Replace the existing menu placeholder with accessible history and honest empty/degraded/unavailable states plus explicit reviewed records-only recovery; document the contract in docs/run-records.md and verify keyboard focus, touch portrait/landscape, recovery cancellation and unchanged active-save bytes through the existing menu browser suite.
- [x] 1.4 Run proportional PR-readiness checks including verify:pr and affected Chromium/WebKit menu cases; record source/build identities, discovery and actual results in docs/qa/issue-176/README.md, then publish a focused PR with Refs #176 and the remaining recording work stated.

## 2. Authored-run terminal and replacement boundaries — PR 2

- [x] 2.1 Integrate persistent-entry-gated recording with accepted authored victory/defeat, explicit terminal Continue and reviewed replacement, including bounded pending replacement reconciliation; verify repeated callbacks, cancellation, stale review, partial failure and nonfatal history failure in affected session/storage units.
- [x] 2.2 Extend existing real-input run/menu witnesses to prove a complete legal ending, terminal reload/Continue deduplication, confirmed abandonment, byte-preserved saves/RNG and no historical effects; verify relevant Chromium and WebKit profiles plus records-key isolation on every testing entry, update the contract/QA evidence and publish a proportionally verified Refs #176 PR leaving dungeon gates open.

## 3. Dungeon endings and complete acceptance — PR 3

- [x] 3.1 Integrate dungeon defeat and accepted replacement through the existing session/app and root-menu handoff; verify unfinished/terminal distinctions, placeholder exclusion, cancel/stale/partial reset behavior, continued descent/backtracking and pending-receipt recovery in focused session units, and update documentation alongside the change.
- [x] 3.2 Extend existing dungeon/menu/lifecycle browser cases to prove a legal defeat, one immutable record after reload, root-menu and in-flow replacement, no record on guardian/floor win or menu departure, active-save isolation and a bounded two-tab history-write case; run desktop/touch portrait/landscape and relevant WebKit selections and retain exact-source results and failures.
- [x] 3.3 Audit every #176 criterion and spec scenario against the final combined inputs; run required PR/affected persistence checks, strict OpenSpec validation, links and git diff --check, record evidence/reuse/limitations and publish the last focused PR using Closes #176 only if all criteria are verified. Keep #270 open for its separate statistics requirements.

## Workflow follow-up

- [x] 3.4 Correct replacement of a distinct reviewed save and admitted live journey in both owners; validate the bounded paired intent and retained seals with legacy v1 compatibility, accepted/refused/interrupted/racing/eviction regressions, real menu reload recovery, final affected persistence checks and publish a qualified follow-up for #176.

- Obtain review and merge authorization through the normal repository process; implementation authorization does not authorize merge or production changes.
- The caller's maintenance authorization covers merging the qualified #176 follow-up, resolving its review thread, reconciling issue completion and verified-safe cleanup; finish these operations before declaring the maintenance goal complete.
- Archive/sync this OpenSpec change only after the complete implementation is accepted and merged under the repository workflow.
