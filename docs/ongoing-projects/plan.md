# Battle-save envelope merged; next-session handoff

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
