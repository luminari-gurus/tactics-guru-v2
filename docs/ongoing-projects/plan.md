# Issue #62: Battle audio implementation and handoff

## Identity and current status

| Field | Value |
| --- | --- |
| Issue | [#62 — Battle audio](https://github.com/luminari-gurus/tactics-guru-v2/issues/62) |
| Parent / acceptance trackers | [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57), [#11](https://github.com/luminari-gurus/tactics-guru-v2/issues/11), [#1](https://github.com/luminari-gurus/tactics-guru-v2/issues/1) |
| Owner | `moshehbenavraham` |
| Branch | `work/issue-62-battle-audio` |
| Main baseline | `9f785dfd3e9ce703ff8ab46210f84c38890c6f2a` |
| Current runtime source | `a0beaab` (late HTML5 guard), committed and pushed; full suite still serving `5b22bf5` |
| OpenSpec | [`issue-62-battle-audio`](../../openspec/changes/issue-62-battle-audio/proposal.md), spec-driven, 8/13 tasks complete (measurement task reopened for the final guard build) |
| Current step | Full suite finished: 206 passed / 1 aggregate test timeout; targeted recheck, final capture and PR remain |
| QA / raw comparison | [Report](../qa/issue-62-battle-audio.md), [72 samples](../qa/issue-62/baseline-candidate.json) |

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
| Unit tests | `tests/unit/battleCues.test.ts`, `tests/unit/battleAudio.test.ts`; 27 focused tests including RED-first HTML5 regressions |
| Browser tests | `tests/battle-audio.spec.ts`; real legal controls, sound-on/off seeded equality, all signatures/outcomes, touch/keyboard, failures, five restarts, late decode, native HTML5 play counting across focus |
| Existing regressions | `tests/audio.spec.ts`, `tests/battle-loop.spec.ts`; shared session/control helpers moved to `tests/helpers/battlePolicy.ts` for the second caller |
| Measurement / QA | `scripts/measure-battle-audio.ts`, `docs/qa/issue-62-battle-audio.md`, raw JSON and inspected portrait/landscape screenshots under `docs/qa/issue-62/` |

`src/domain`, `BattleSession`, `ProofAudio`, package manifests and lockfile are unchanged. Audio is called beside the HUD log; only the existing animation promise completes a presentation. Request timeout is 5 s, overall load/decode 6.5 s, unlock 2 s, and playback cue duration + 500 ms. Failed loading retries on a new scene; unlock/playback failures permit explicit Retry sound. No automatic backlog or request retries.

The [OpenSpec tasks](../../openspec/changes/issue-62-battle-audio/tasks.md) remain the checkbox source of truth. AC1 is proven by policy fixtures and desktop complete wins/losses with identical sound-on/off state/replay; the final all-profile run is pending. AC2–AC4 have focused unit and browser proof, including all-profile fallback/mute checks; full regressions are pending. AC5 measurements and AC6 physical-gap documentation are complete; the final suite and publication audit remain.

## Verification results and commands

| Command | Latest result |
| --- | --- |
| `npm run test:unit -- tests/unit/battleCues.test.ts tests/unit/battleAudio.test.ts` | 27 passed; original mapper/adapter and later HTML5 regressions failed RED first |
| `npm run test:unit` | 287 passed in 25 files |
| `npm run validate:content` | 77 passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; existing >500 kB chunk warning retained |
| `npm test -- tests/battle-audio.spec.ts --project desktop` | Initial 12-test implementation suite passed; final suite adds more assertions |
| `npm test -- tests/battle-audio.spec.ts --grep 'HTML5\|mute, hidden'` | Final six targeted checks passed across desktop/portrait/landscape |
| `npm test` | 206 passed / 1 aggregate timeout on `5b22bf5`; corrected comparison and final HTML5 guard recheck next |
| `openspec validate issue-62-battle-audio --strict` | Passed |
| `git diff --check` | Passed |

The full suite includes the focused `tests/battle-audio.spec.ts tests/audio.spec.ts tests/battle-loop.spec.ts` regression set. Do not rerun a separate complete copy of that subset after the full suite passes unless a relevant change/failure requires it.

Failures were fixed and retained in QA: the first full run stopped after 90 passes when touch HTML5 stayed locked; one in-progress battle was interrupted and 115 tests had not run. Subsequent focused checks exposed the engine focus-resume behavior and a test-only assumption about seed 3's initiative. The final implementation and corrected legal-control test passed all six targeted checks. Missing-media tests intentionally generate a resource failure; successful paths require no unexpected console/page errors.

## Measurements and acceptance boundaries

Clean baseline/candidate captures use the same host and Chromium 153.0.8010.12, localhost, no CPU/network throttling, no routing, three repetitions, three profiles, both sound modes and cold/warm caches. Both served revisions and every resource/file hash are in the [raw evidence](../qa/issue-62/baseline-candidate.json). All 72 samples have complete timings and no unexpected errors.

| Measure / unchanged limit | Baseline | Candidate |
| --- | ---: | ---: |
| Cue files ≤32768 B | 0 | 11741 |
| Compressed JS/CSS ≤400000 B | 389236 | 391851 |
| Cold scene asset transfer ≤1500000 B | 834688 | 848829 |
| Total cold transfer | 1226521 | 1243278 |
| Total warm transfer | 6900 | 9300 |
| Cold Ready maximum ≤2500 ms | 254.4 | 355.7 |
| Warm Ready maximum ≤750 ms | 244.2 | 388.2 |
| Warm first player turn maximum | 656.1 | 959.6 |

Ready observes `data-ready=true` (bound controls/canvas/restart), while first-player availability includes initial enemy animation. Three sound-enabled portrait warm samples exceed 750 ms for that later signal. Preserve that result; do not equate these signals or claim final #11 usability acceptance. Move/Confirm measurements cover synchronous handler response, not frame/display latency. Main lacks #61's battle frame instrumentation: F1 p50 ≤16.7 ms / p95 ≤20 ms and F2 p95 ≤33.4 ms remain unverified here, with #61's existing failures still open. No budget was relaxed.

The [physical matrix](../qa/issue-62-battle-audio.md#physical-device-handoff-for-11) explicitly marks iPhone Safari, iPhone Chrome, Android Chrome and desktop in both orientations unverified. Headless counters and emulation do not prove audibility. #11 needs device/OS/browser/served-build observations for gesture, audible cues, mute, interruption/background/resume, restart and controls. Use a draft PR with `Refs #62` while these acceptance gaps remain; keep #57/#11/#1 open.

## Resume and delivery procedure

- Full browser process `99724` / PID `1922848` is terminal: 206 passed / 1 aggregate comparison timeout. Log: `/tmp/guru-issue62-final-browser.log`. Run the corrected landscape seed-1 comparison and final HTML5/mute cases against the current build, then capture final clean measurements. Reuse the unaffected full-suite results and state full/recheck results separately.
- Baseline worktree: `/tmp/guru-issue62-baseline`; candidate clean runtime worktree: `/tmp/guru-issue62-candidate`. The comparison is finished; raw evidence is committed with final QA. The collector now selects a free port and handles an already-exited preview child. It preserved the unrelated pre-existing server on port 4175.
- After the full run: update its exact result in this plan and QA; mark verified OpenSpec tasks 3.2, 3.3 and 4.1. Audit AC1–AC6 and the complete diff, validate documentation links/OpenSpec/whitespace and confirm only task-owned changes remain.
- Commit/push remaining collector/evidence/docs changes; open the PR against main with `Refs #62`, QA links, validation and explicit physical/performance gaps. Verify remote head, PR/issue/branch links, then mark task 4.4 and publish the final handoff update. Keep the OpenSpec change unarchived until merged/accepted.
- Existing commits: planning `7959063`, implementation `2d87b64`, fallback repair `5b22bf5`. No release tag is warranted for an unmerged review branch; the repository had no tag convention to advance. Do not merge, close issues or alter deployment.

### Latest continuation note

A final HTML5 callback audit reproduced late priming settlement pausing a newer cue after retry (RED). The callback now checks live/attempt before touching its media; 27 focused tests and typecheck pass. The full process above is still testing build `5b22bf5`; finish that run, then build the correction and run the affected HTML5/mute browser checks across all profiles. Reuse unaffected full-suite results, rerun the unit suite, and refresh clean baseline/candidate measurements because the bundle bytes changed. Preserve the earlier raw samples and their three warm first-player failures; do not replace them with a favorable later run.

- Full-run follow-up: landscape seed-1 sound-on/off comparison timed out at its aggregate 240 s during the second advancing battle. Its allowance is now 360 s (two existing 180 s battle allowances), with the 10 s per-turn invariant retained. Finish the current run and recheck this exact case plus the final HTML5 guard path; record full and rerun results separately.
