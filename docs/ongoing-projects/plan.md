# Issue #62: Battle audio implementation and review handoff

## Current status — 2026-10-11

[PR #63](https://github.com/luminari-gurus/tactics-guru-v2/pull/63) implements [#62](https://github.com/luminari-gurus/tactics-guru-v2/issues/62) on `work/issue-62-battle-audio`. It has been rebased onto main `d60659d03b940c20e380eeda3f226ba2b649ef6f`, including merged PR #61. The scene conflict preserves performance instrumentation and audio teardown. Runtime repair: `515ac85be1fd8e0294394e2f8805fc8788d7c901`.

The current user explicitly authorizes all review repairs, Git history management, publication, and leaving the PR ready to merge. This supersedes the original draft-only handoff. #11's automated milestone is closed; remaining physical certification, frame budgets and intermittent Safari restart work are tracked in #64, #65 and #66. This PR does not certify those follow-ups. The parent epics (#57 and #1) remain open.

## Outcome and ablation

Preserve all six issue acceptance criteria: committed-event cues with unchanged battle/RNG/replay; accessible opt-in/mute/retry; at-most-once bounded feedback; nonfatal bounded optional audio; eight small documented cues; automated validation with honest physical-device gaps.

The review needs three focused code repairs and one PR metadata correction:

1. Battle startup disables Phaser's unhandled focus, per-frame and delayed visibility recovery hooks once for the game. The existing adapter owns bounded context/focus/visibility recovery. Refusal/timeout exposes Retry without repeated automatic attempts, stale cues or disabled battle controls. The unrelated fatal-error handler is unchanged.
2. Every HTML5 media element tracks successful gesture priming. Early enable and enabled restart retain preference but expose Retry until all current elements are primed. Generation/attempt guards reject stale callbacks.
3. The collector inventories normalized relative paths and counts cue bytes consistently on Windows and POSIX. Its small inventory module is shared with a real-file regression, rather than launching a browser from the test.
4. The PR description uses ordinary references to the epics. GitHub's closing-issue list was checked before and after: #57 was removed and the intended #62 link remains.

**Files:** `src/phaser/start.ts`, `src/phaser/BattleAudio.ts`, `scripts/measure-battle-audio.ts`, `scripts/battle-audio-inventory.ts`, existing browser tests, one inventory unit test, OpenSpec and this QA/handoff documentation. The rebase additionally reconciles `BattleScene` with main.

**Non-goals:** New audio services/dependencies, music/voice, domain/combat/RNG changes, renderer/performance rewrites, new storage, deployment settings or first-battle hardware certification. Keep the existing pure cue mapper and adapter; no new timer framework, configuration surface or retry queue is needed.

**Proof:** Reproduce failures first; exercise real Phaser with rejected/pending recovery after successful unlock, strict per-element gesture policy, late callbacks, restart and unrelated fatal errors. Run all configured unit/content/browser checks, typecheck/build, strict OpenSpec validation and whitespace checks. Capture the repaired collector against exact clean baseline/candidate builds; preserve all old raw evidence.

## Verification and evidence

[QA and retained historical evidence](../qa/issue-62-battle-audio.md) is the detailed source for commands, results, measurements and limitations. The [OpenSpec tasks](../../openspec/changes/issue-62-battle-audio/tasks.md) are the implementation checklist: 17/17 complete. The PR is open, ready for review and mergeable; the [published response](https://github.com/luminari-gurus/tactics-guru-v2/pull/63#issuecomment-6110106240) addresses all four findings.

- Four new desktop regressions failed on the rebased old runtime: both recovery modes attempted resume 35 times; both HTML5 cases incorrectly became ready before priming.
- The repaired focused run passed 21 cases across desktop, portrait and landscape. Tests also cover late pending recovery after restart and successful HTML5 retry before the existing blur test.
- Unit suite: 293 passed in 26 files. Content validation: 77 passed. Both TypeScript checks and the production build pass; existing chunk-size and runner color warnings remain.
- All 225 configured browser cases have passing coverage: 220 passed in the full run (12.4 minutes); five failures in the new restart synchronization assertion were corrected by waiting for data-run=2, then both recovery modes passed all six profile combinations (32.6 seconds). Runtime code was unchanged. No single clean 225-pass full rerun is claimed.
- Original Windows predicate: 0 cue bytes; actual files and repaired Windows/POSIX inventories: 11,741 bytes, below 32 KiB. The new 72-sample clean-build comparison has no application errors or loading-limit failures: candidate cold/warm Ready maxima 197.8/147.4 ms, first-player maxima 524.3/476.0 ms, compressed code 392,635 bytes and cold scene assets 848,829 bytes.
- Three original 72-sample JSON files remain byte-for-byte unchanged. Original `9f785df`/`ca1923a` measurements and failed samples are historical, not measurements of the new main/repaired runtime.

## Git and acceptance handoff

The existing implementation commits are retained for review traceability, followed by the focused repair and evidence/handoff commits. This branch targets main directly; no stacking onto the unrelated #65 branch and no release tag are needed. The rebase was published with an exact lease on the reviewed remote head `0344dc767f2ebbc95795b9e773d7f818be62cc97`. Local/remote parity and a clean tree were verified, and GitHub reports MERGEABLE with draft=false and no inline review threads. The final checklist completion is folded into the evidence commit with an exact lease. The PR was marked ready after local validation, without waiting for remote CI.

Retain `Refs #62`. Hardware audibility remains unverified in the physical matrix under #64; the per-element policy shim is automated evidence, not Safari/Android hardware proof. Existing frame/usability failures remain in the evidence and #65; #66 owns the separately observed Safari restart issue. OpenSpec stays unarchived until merge/applicable acceptance. No merge, issue closure, manual deployment or attribution trailers are part of this handoff.
