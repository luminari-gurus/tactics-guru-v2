# Tasks

Issue: [#62](https://github.com/luminari-gurus/tactics-guru-v2/issues/62). Branch: `work/issue-62-battle-audio`. Checkboxes reflect implementation evidence, not merely the existence of planning artifacts. See [the human plan](../../../docs/ongoing-projects/plan.md) for acceptance mapping and validation commands.

## 1. Approval and cue contract

- [x] 1.1 Record explicit approval of this concrete plan, verify the branch/base and current #61 merge status, and note the baseline revision in the QA report; verify no unmerged code is required and no unrelated changes are included.
- [x] 1.2 Add RED-first `tests/unit/battleCues.test.ts` cases for movement, attack results, all signatures, multiple missiles/defeats, outcomes, ignored events and the four-cue bound; implement `src/audio/battleCues.ts` until those behavior cases pass, including unchanged input/state/RNG fixtures (AC1, AC5).
- [x] 1.3 Generate the eight MP3 cues and typed manifest; document generation commands, durations, sizes, hashes and event mapping in `docs/qa/issue-62-battle-audio.md`; verify every manifest entry exists, total files are at most 32 KiB and no runtime dependency was added (AC5).

## 2. Disposable audio adapter

- [x] 2.1 Add RED-first adapter tests for token deduplication, consumed suppressed batches, bounded sequencing and superseding old feedback; implement `BattleAudio` playback against a narrow fake sound/context boundary and verify all cases plus read-only domain behavior (AC1, AC3).
- [x] 2.2 Implement gesture-local unlock, rejected/never-settling promises, mute and visibility/context suppression; verify fake-clock tests stop playback immediately, allow explicit retry and ignore late settlements without gameplay calls (AC2, AC3, AC4).
- [x] 2.3 Add optional bounded loading/decode and teardown handling; verify missing, stalled, unsupported and corrupt media, restart during load, late loader completion and repeated destroy with focused adapter tests; document exact timeout/retry behavior alongside the tests (AC3, AC4).

## 3. Battle and accessible control integration

- [x] 3.1 Wire one audio call to each committed `BattleScene.present` batch and destroy the adapter with its scene; retain sound preference on the scene instance and leave presentation completion independent; verify browser controls execute the same seeded battle/replay with sound on and off (AC1, AC3).
- [x] 3.2 Add the HUD sound control/status and bounded battle-audio diagnostics; verify real pointer/keyboard activation, initial disabled state, mute during player/enemy presentation, restart preference, reload reset, modal focus and no canvas click-through in desktop/portrait/landscape browser cases (AC2).
- [x] 3.3 Add `tests/battle-audio.spec.ts` actual-control coverage for movement, basic attacks, all signatures, unit/battle outcomes, preview/cancel silence, unlock failures, failed media, background/resume and at least five restarts; verify the focused suite and existing proof-audio/battle-loop regressions pass without console/page errors, and record results in the QA note (AC1–AC4, AC6).

## 4. Integrated validation and acceptance handoff

- [x] 4.1 Run the configured unit/content/browser suites, strict typecheck, production build, OpenSpec strict validation and diff check using the commands in the human plan; record actual counts, warnings and failures in the QA report (AC6).
- [x] 4.2 Capture comparable baseline/candidate code, cue, cold/warm readiness and first-interaction data under identical host/browser/cache conditions, retaining build identifiers and raw samples; verify the 32 KiB cue cap and unchanged agreed limits, report any regression and preserve existing #11 frame failures. Use only available merged instrumentation; document any unavailable measurement instead of depending on #61 (AC5, AC6).
- [x] 4.3 Record audio unlock, audibility, mute, suspend/resume and restart results for iPhone Safari/Chrome, Android Chrome and desktop in both orientations when available; verify each row has device/build evidence or is explicitly unverified, and prepare a concise linked handoff for #11 (AC6).
- [ ] 4.4 Audit AC1–AC6 against the committed implementation and QA evidence, push only issue-specific changes and open/reuse the PR; verify its issue/branch links and use a draft with `Refs #62` while any acceptance requirement is unverified. Do not close #57/#11/#1 by proxy.

## Workflow follow-up

- Keep this change unarchived until implementation is merged and its applicable acceptance requirements are satisfied.
