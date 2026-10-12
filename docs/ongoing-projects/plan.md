# Issue #72: guarded battle storage implementation handoff

Updated 2026-10-12. The user authorized implementation of the published plan, use of ablation/OpenSpec, autonomous resolution of implementation blockers, and delivery as a review-ready PR. Implementation is in progress; no runtime acceptance is claimed yet.

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

## Resume steps and progress

1. OpenSpec `issue-72-battle-storage`, schema `spec-driven`: 6/8 tasks complete. Adapter, focused failure/continuation tests and API documentation are implemented. All 85 focused adapter/codec/domain checks and both typechecks passed. A test-only tuple-union type error was corrected. Next: full configured validation, QA evidence and PR delivery.
2. Recovery/load is read-only; invalid/unreadable slots block save mutations. Preserve backup before replacing primary. Explicit removal rechecks an inspected value but is not a multi-slot transaction.
3. Record focused and final checks with actual counts/failures in task-specific QA. Configured browsers are desktop, Pixel 7 portrait and landscape emulation. Local physical capability is Android only; #72 requires no physical platform.
4. Before PR publication, re-fetch main, inspect divergence, preserve unrelated changes, inspect the final diff and verify remote HEAD parity/clean status. Reuse a task PR if one exists. Do not merge, tag a release, deploy or archive OpenSpec.

The original checkout contains unrelated Safari/environment/workflow edits and an Android-certification draft; leave it untouched. #58/#57 remain open. #73/#74 own the next integration/certification steps.

## Historical #69 merge handoff (superseded by the implementation status above)

## Completed — 2026-10-12

[PR #70](https://github.com/luminari-gurus/tactics-guru-v2/pull/70) is merged into `main` as `ea58370ceb442b22d7f247bc463c2cdddec12456`. GitHub automatically closed [#69](https://github.com/luminari-gurus/tactics-guru-v2/issues/69) as completed. The bounded snapshot codec and its continuation contract are complete; [parent #58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58) remains open for storage, live session/UI integration and persistence certification.

The merge joins latest main `9d6aeb727d53531b7f17494af2de8add58147026` and reviewed head `fabc13e8ee11cda646c66bd304f7f13de4583990`. Main's two newer commits only synchronize/archive earlier OpenSpec work; integration was conflict-free. A merge commit preserves all ten implementation, repair and evidence commits. No further rebase, squash, stacking or release tag was needed. The feature branch is retained for existing evidence links.

The GitHub connector lacked merge permission. The authorized merge used the repository's existing GitHub credential through the REST API, with the exact PR head pinned and main checked immediately beforehand. The returned merge's parents and tree were read back and matched the locally tested combination. The primary checkout's unrelated Safari/environment/workflow edits were preserved.

## Validation

Fresh checks on the combined tree passed: 316 unit tests, 77 content tests, both TypeScript checks, production build, strict OpenSpec and whitespace checks, plus 24 focused browser cases across desktop, Pixel 7 portrait and 915x412 landscape. Browser checks covered both repaired synchronization cases, audio controls, canonical rendering/restarts, complete legal win/loss battles, gesture replacement and restart during enemy animation. Representative portrait/landscape screenshots were inspected.

See [merge evidence](../qa/issue-69/merge-validation.json), [full QA history](../qa/issue-69-save-envelope.md), [format and adapter contract](../battle-save-format.md), [completed implementation plan](battle-save-envelope/plan.md) and [12 completed OpenSpec tasks](../../openspec/changes/battle-save-envelope/tasks.md). This session did not rerun all 225 browser cases or certify physical devices/live persistence. Historical failures and focused rechecks remain in the QA record. No manual deployment was performed; existing automatic hosting integrations operate separately.

## Next session: #72 guarded local storage and backup recovery

[#72](https://github.com/luminari-gurus/tactics-guru-v2/issues/72) is the existing next dependency under #58. Its #69/PR #70 merge prerequisite is now satisfied. A live check found no competing open storage/resume PR. Refresh main and the issue/PR tracker next session before selecting or assigning work.

1. Read #72 and the merged format's capture/adapter boundary. Reuse `encodeBattleSave` and `decodeBattleSave`; keep domain serialization pure.
2. Prepare the concrete storage-adapter plan: namespaced keys, validation of primary/backup, recovery precedence, interrupted-write ordering, nonfatal storage failures, and preservation of original corrupt/incompatible bytes and legacy Godot keys.
3. Keep live hydration/autosave/Continue/New battle controls in [#73](https://github.com/luminari-gurus/tactics-guru-v2/issues/73), and browser lifecycle/physical-device persistence certification in [#74](https://github.com/luminari-gurus/tactics-guru-v2/issues/74). These remain open.
4. Preserve the feature release gate in [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57), including open physical certification [#64](https://github.com/luminari-gurus/tactics-guru-v2/issues/64) and Safari restart investigation [#66](https://github.com/luminari-gurus/tactics-guru-v2/issues/66).

Stop at this handoff. No #72 planning artifacts, assignment, implementation, device certification or next-phase deployment were started. Unrelated PR #12 remains separate.
