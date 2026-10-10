# Issue #62: Battle audio implementation and handoff

## Identity and current status

| Field | Value |
| --- | --- |
| Issue | [#62 — Battle audio](https://github.com/luminari-gurus/tactics-guru-v2/issues/62) |
| Parent / acceptance trackers | [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57), [#11](https://github.com/luminari-gurus/tactics-guru-v2/issues/11), [#1](https://github.com/luminari-gurus/tactics-guru-v2/issues/1) |
| Owner | `moshehbenavraham` |
| Branch | `work/issue-62-battle-audio` |
| Review | [Draft PR #63](https://github.com/luminari-gurus/tactics-guru-v2/pull/63), final validation pending |
| Main baseline | `9f785dfd3e9ce703ff8ab46210f84c38890c6f2a` |
| Current runtime source | `ca1923a` (Web Audio retry and fixed clock anchors), committed and pushed |
| OpenSpec | [`issue-62-battle-audio`](../../openspec/changes/issue-62-battle-audio/proposal.md), spec-driven, 12/13 tasks complete; final publication audit remains |
| Current step | Implementation and evidence complete; final PR/head verification and handoff publication remain |
| QA / raw comparison | [Report](../qa/issue-62-battle-audio.md), [initial](../qa/issue-62/baseline-candidate.json), [contended](../qa/issue-62/contended-baseline-candidate.json), [final](../qa/issue-62/final-baseline-candidate.json) captures |

The user explicitly requested implementation of this concrete plan, use of ablation and OpenSpec, autonomous issue resolution, commits/pushes and a reviewable PR. That supersedes the earlier planning-only approval checkpoint. No additional implementation approval is pending.

Selection history: #62 was explicitly authorized and created as a child of #57 after the backlog scan found no eligible unassigned implementation issue. It was assigned, labeled ready and [claimed](https://github.com/luminari-gurus/tactics-guru-v2/issues/62#issuecomment-6101189721). #10/PR #55 and #19/PR #31 were already merged. #61 remains an open measurement PR, not a prerequisite; its code was not imported. Main still matched the baseline at the latest remote check. The initial worktree was clean.

## Required outcome and ablation decisions

The full outcome remains all six issue criteria:

1. Derive movement, recorded attack miss/hit/critical, one Magic Missile cast, grouped unit defeat and victory/loss cues from accepted presentation batches only. Guarded Strike and High Shot use recorded attack results. Preserve domain state, RNG and replay. Preview, cancellation, invalid input and duplicate callbacks must remain silent.
2. Start disabled; provide accessible pointer/touch/keyboard Enable sound / Mute and retry/status controls. Unlock directly in the gesture. Mute immediately. Preserve preference across in-page restarts; reset on reload.
3. Consume each token once even when suppressed; keep at most four cues and one active cue. New batches replace older feedback. Mute, lock, interruption, blur, hide and teardown discard queued feedback; resume never plays a backlog. Audio must not gate animation or command completion.
4. Optional loading, decoding, unlock and playback have deadlines and nonfatal status. Missing/corrupt/stalled/unsupported media, rejected/pending promises and late callbacks must leave legal battle controls usable. Release owned sounds, requests, media URLs, listeners and timers on shutdown.
5. Eight reproducibly generated MP3s total at most 32 KiB; fixed typed mapping, existing Phaser sound/cache APIs, no runtime dependency or domain/browser coupling. Retain comparable code/assets/loading measurements and all failures against unchanged budgets.
6. RED/GREEN policy/lifecycle checks, actual-control battle/audio and proof regressions, all configured unit/content/browser checks, typecheck/build/OpenSpec/diff checks, and an honest physical-device handoff to #11.

**Ablation:** one pure mapper plus one scene-owned adapter remains the simplest complete implementation. The proof controller stays separate because its controls/lifetime are proof-specific. Reuse existing HUD styles and real-control test helpers. No generic audio service, library, storage or new runtime configuration was added.

Inspection justified two implementation refinements: owned abortable fetch/decode avoids Phaser loader callbacks that cannot be invalidated safely after restart; decoded data still enters Phaser cache/sound APIs. HTML5 fallback explicitly refreshes the manager's lock in the gesture, and temporarily owns blur handling using the public `pauseOnBlur` setting, restoring it at destroy. This replaces the failed capture-listener ordering approach and avoids the engine's stale focus-resume list. The [design](../../openspec/changes/issue-62-battle-audio/design.md) records these decisions.

**Non-goals:** music/voice, broad asset packs, gameplay/rules/RNG changes, save/resume, rewards, renderer/performance rewrites, backend, dependency/toolchain upgrades and deployment/Access changes. No attribution/co-author/sign-off trailers. No issue or epic closure by proxy.

## Implemented files and evidence

| Area | Files / proof |
| --- | --- |
| Cue policy | `src/audio/battleCues.ts`; independent fixtures for every cue/signature, grouping/priority/cap and full seeded state/RNG equality |
| Adapter | `src/phaser/BattleAudio.ts`; token/generation guards, owned requests/decode/media, Web Audio and HTML5 gesture paths, immediate suppression and cleanup |
| Integration | `src/phaser/BattleScene.ts`, `src/ui/hud.ts`, `src/diagnostics/browser.ts`; accepted-batch hook, scene preference, accessible controls, bounded diagnostics |
| Assets | `public/audio/battle/*.mp3`, `scripts/generate-battle-audio.py`; eight original synthesized cues, 11741 bytes, hashes/recipe in QA; regeneration produced identical hashes |
| Unit tests | `tests/unit/battleCues.test.ts`, `tests/unit/battleAudio.test.ts`; 28 focused tests including RED-first HTML5 and Web Audio regressions |
| Browser tests | `tests/battle-audio.spec.ts`; real legal controls, sound-on/off seeded equality, all signatures/outcomes, touch/keyboard, failures, five restarts, late decode, native HTML5 play counting across focus |
| Existing regressions | `tests/audio.spec.ts`, `tests/battle-loop.spec.ts`; shared session/control helpers moved to `tests/helpers/battlePolicy.ts` for the second caller |
| Measurement / QA | `scripts/measure-battle-audio.ts`, `docs/qa/issue-62-battle-audio.md`, raw JSON and inspected portrait/landscape screenshots under `docs/qa/issue-62/` |

`src/domain`, `BattleSession`, `ProofAudio`, package manifests and lockfile are unchanged. Audio is called beside the HUD log; only the existing animation promise completes a presentation. Request timeout is 5 s, overall load/decode 6.5 s, unlock 2 s, and playback cue duration + 500 ms. Failed loading retries on a new scene; unlock/playback failures permit explicit Retry sound. No automatic backlog or request retries.

The [OpenSpec tasks](../../openspec/changes/issue-62-battle-audio/tasks.md) remain the checkbox source of truth. AC1–AC4 have policy/lifecycle and actual-control proof across all profiles. AC5 measurements and AC6 physical-gap documentation are complete; the publication audit remains. Runtime is `ca1923a`; the final existing-test actor assertion correction is `799f28d`.

## Verification results and commands

| Command | Result |
| --- | --- |
| `npm run test:unit` | 288 passed in 25 files, including 28 focused policy/adapter cases |
| `npm run validate:content` | 77 passed |
| `npm run typecheck` | Passed, including the final test-only correction |
| `npm run build` | Passed; existing >500 kB chunk warning retained |
| `npm test` | Final runtime: 206 passed / 1 incorrect existing-test actor assertion (25.9 min); all 39 battle-audio cases passed |
| `npm test -- tests/battle-loop.spec.ts --grep "restart during initial enemy"` | Corrected assertion: 3/3 passed across profiles (5.9 s) |
| `npm test -- tests/battle-audio.spec.ts --grep "mute, hidden\|gesture unlock"` | 9/9 passed across profiles (34.0 s) |
| `openspec validate issue-62-battle-audio --strict` | Passed |
| `git diff --check` | Passed |

All 207 configured browser cases have passing coverage across the full run and targeted rechecks; no single clean 207-pass full run is claimed. The last failure was in an existing test: enemy end-turn commits advance initiative before presentation ends, so the actor must come from the committed command. The correction changes only that assertion. Reuse the 206 unaffected results; do not rerun them without new evidence.

The [QA report](../qa/issue-62-battle-audio.md#failures-found-and-repaired) retains all RED and intermediate failures, including repaired HTML5/Web Audio defects, the fixed clock fixture, aggregate deadlines during unrelated host compilation and interrupted attempts. Existing composite board tests passed unchanged with normal defaults after host capacity recovered. No product loading/frame limit or per-turn assertion was relaxed. Expected missing-media resource failures remain distinct from unexpected console/page errors.

## Measurements and acceptance boundaries

The [QA report](../qa/issue-62-battle-audio.md#final-comparable-configuration-capture) contains all 216 raw samples from three captures, exact clean revisions, file/resource hashes, methods and failures. Final configuration comparison uses main `9f785df` and runtime `ca1923a`, Chromium 153.0.8010.12, the same host/profiles/cache/command sequence, three repetitions and both sound modes. All final samples have complete timings and zero unexpected errors; playback counters match sound preference. Per-sample CPU activity records the variation in this shared host.

| Measure / unchanged limit | Baseline | Candidate |
| --- | ---: | ---: |
| Cue files ≤32768 B | 0 | 11741 |
| Compressed JS/CSS ≤400000 B | 389236 | 391852 |
| Cold scene asset transfer ≤1500000 B | 834688 | 848829 |
| Total cold transfer | 1226521 | 1243278 |
| Total warm transfer | 6900 | 9300 |
| Cold Ready maximum ≤2500 ms | 255.7 | 2302.2 |
| Warm Ready maximum ≤750 ms | 216.4 | 559.1 |
| Cold first-player maximum | 667.9 | 2832.2 |
| Warm first-player maximum | 639.1 | 975.5 |

Ready observes bound controls/canvas/restart; first-player availability includes initial enemy animation. One final cold first-player sample exceeds 2500 ms and four warm samples exceed 750 ms. The initial capture's three warm first-player failures and the contended refresh's warm Ready failures remain recorded. Do not treat these signals as interchangeable or infer an audio cause from shared-host timing variation. Handler measurements cover synchronous response, not input-to-frame/display latency.

Main lacks #61's battle frame instrumentation: F1 p50 ≤16.7 ms / p95 ≤20 ms and F2 p95 ≤33.4 ms remain unverified here, with #61's existing failures open. The [physical matrix](../qa/issue-62-battle-audio.md#physical-device-handoff-for-11) marks iPhone Safari/Chrome, Android Chrome and desktop in both orientations unverified. Headless counters and emulation do not prove audibility. #11 needs device/OS/browser/served-build observations for gesture, audible cues, mute, interruption/background/resume, restart, usable controls and performance.

Keep PR #63 a draft with `Refs #62` while those acceptance gaps remain. #57/#11/#1 remain open; the OpenSpec change stays unarchived until merged and accepted.

## Delivery audit remaining

- Verify all raw samples, local links, asset hashes, strict OpenSpec and whitespace. Commit/push the task-specific collector/evidence/docs changes.
- Update draft PR #63 with the exact full-run/recheck result, budget evidence and remaining hardware/usability/frame gaps. Verify its head equals the pushed branch and its base remains main; then complete OpenSpec task 4.4 and publish the final handoff note.
- Both browser and measurement processes are terminal. Remove only `/tmp/guru-issue62-baseline` and `/tmp/guru-issue62-candidate` after confirming evidence is committed. Preserve the unrelated worktree and pre-existing preview on 4175.
- No release tag is warranted for this unmerged review branch. Do not merge, close issues or alter deployment as part of this handoff.
