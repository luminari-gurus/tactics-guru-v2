# Issue #72: guarded battle storage implementation handoff

Updated 2026-10-12. The user authorized implementation of the published plan, use of ablation/OpenSpec, autonomous resolution of implementation blockers, and delivery as a review-ready PR. Implementation and required local checks are complete; PR publication is the remaining delivery step.

## Current branch and scope

- Issue: [#72](https://github.com/luminari-gurus/tactics-guru-v2/issues/72), assigned to `moshehbenavraham`.
- Branch: `branch/issue-72-battle-storage`; attached worktree: `C:/Users/apexw/.codex/worktrees/issue-72-storage-plan/Tactics-Guru`.
- Published plan: `d602d82`. Current main `5d83514` (documentation-only #90/#82) was merged without conflicts as `736ffa7`. Preserve the published history; no force push or release tag is needed.
- [Detailed plan](issue-72-battle-storage/plan.md), [OpenSpec design](../../openspec/changes/issue-72-battle-storage/design.md), [requirements](../../openspec/changes/issue-72-battle-storage/specs/battle-storage/spec.md), [tasks](../../openspec/changes/issue-72-battle-storage/tasks.md).
- The prior codec #69/PR #70 is merged; its historical evidence below remains available. No competing storage PR was open at implementation start.

## Outcome, non-goals, files and proof

Outcome: a guarded two-slot browser-storage adapter reusing the existing codec, preserving undecodable bytes and a validated recovery point, and reporting typed nonfatal failures without changing in-memory play. Non-goals: live hydration/autosave/Continue/restart UI (#73), lifecycle/device certification (#74), run/reward features, legacy keys/imports, deployment and parent closure.

Files: `src/persistence/battleStorage.ts`, `tests/unit/battleStorage.test.ts`, `docs/battle-storage.md`, a format-guide link, task-specific QA and maintained handoff/OpenSpec artifacts. Proof: failure injection at each storage step, recovery precedence/raw preservation, namespace isolation, deterministic fixture continuation, full configured unit/content/browser suites, both typechecks, build, strict OpenSpec, links and whitespace.

Ablation: retain one adapter, two fixed keys and the accepted codec/fixtures. The provider seam is needed to guard acquisition and test each failure; typed results and explicit removal are required recovery boundaries. No archive key, second serializer, generalized storage framework, locks, UI route or dependency is needed. The plan is already minimal for its full acceptance; no criterion was dropped.

## Verification and remaining delivery

1. OpenSpec `issue-72-battle-storage`, schema `spec-driven`: 8/8 tasks complete. Implementation committed as `df1159f`. Passed: 85 focused checks, 372 unit tests, 77 content checks, both typechecks, production build and the full 225-case browser suite (75 per profile, no failures/skips/flaky results). A test-only tuple-union type error was corrected before final validation. See [QA](../qa/issue-72-battle-storage.md) and [retained source/case evidence](../qa/issue-72/validation.json).
2. Recovery/load is read-only; invalid/unreadable slots block save mutations. Preserve backup before replacing primary. Explicit removal rechecks an inspected value but is not a multi-slot transaction.
3. Configured browsers are desktop, Pixel 7 portrait and landscape emulation, using Edge 155.0.4283.45 on Windows/Node 24.19.0. Local physical capability is Android only; #72 requires no physical platform. This unused-by-UI adapter does not establish live persistence or cross-tab/disk durability.
4. Publish the verified implementation/evidence and create the review-ready PR against main, then record its URL and verify remote HEAD parity/clean status. Current main `5d83514` remains included without conflicts. Do not merge, tag a release, deploy or archive OpenSpec.

The original checkout contains unrelated Safari/environment/workflow edits and an Android-certification draft; leave it untouched. #58/#57 remain open. #73/#74 own the next integration/certification steps.

## Prior codec completion

#69 was completed by merged PR #70 (`ea58370`), with its merge handoff preserved in commit `d167ac9`. The [format contract](../battle-save-format.md), [codec QA history](../qa/issue-69-save-envelope.md) and [merge evidence](../qa/issue-69/merge-validation.json) remain authoritative for that earlier work. Its checks do not substitute for this task's verification.
