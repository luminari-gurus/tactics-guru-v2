# Issue #62 battle audio QA

Implementation authorized by the user request to implement `docs/ongoing-projects/plan.md` using ablation and OpenSpec. Baseline main: `9f785dfd3e9ce703ff8ab46210f84c38890c6f2a`; initial worktree clean. Remote main still matched that revision and [PR #61](https://github.com/luminari-gurus/tactics-guru-v2/pull/61) remained open/unmerged at the latest check. No unmerged code or deployment change is required.

Final runtime revision: `ca1923a6ca34971af57af3608f0b0dd2b43fb6f8`. All configured browser cases have passing coverage (206 in the full run plus the corrected restart case rechecked across all profiles); final measurements and their limitations are recorded below. Hardware audibility and #11 frame acceptance remain explicitly unverified.

## Verification

| Command | Result |
| --- | --- |
| `npm run test:unit` | 25 files, 288 tests passed; includes 28 focused policy/adapter checks |
| `npm run validate:content` | 2 files, 77 tests passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; existing Vite warning for a minified chunk over 500 kB retained |
| `npm test -- tests/battle-audio.spec.ts --grep "mute, hidden\|gesture unlock"` | 9 passed across all profiles, 34.0 s, final `ca1923a` build |
| `npm test` | 206 passed / 1 incorrect existing-test assertion, 25.9 min; corrected case passed 3/3 across profiles (5.9 s), see below |
| `openspec validate issue-62-battle-audio --strict` | Passed |
| `git diff --check` | Passed |

The runner emits its existing NO_COLOR/FORCE_COLOR environment warning. Successful flows assert no unexpected console/page errors. Missing-media scenarios intentionally receive a 404 or bad bytes; expected resource failures are distinct from application exceptions. Rendered controls were inspected in [portrait](issue-62/portrait.png) and [landscape](issue-62/landscape.png); targets remain at least 44 px and the existing panel scrolls in short landscape.

## Acceptance audit

| Criterion | Implementation and proof |
| --- | --- |
| AC1 | Pure accepted-event mapping; committed token hook beside HUD log. Policy fixtures cover every signature, attack result, grouping, outcomes and four-cue cap. Legal UI win/loss comparisons check exact sound-on/off state, RNG/replay and per-action cues. |
| AC2 | HUD opt-in, accessible pressed/status/retry controls; real pointer, keyboard and touch tests, modal capture, preview/cancel silence, player/enemy mute, five restarts and reload reset. |
| AC3 | Consume-before-eligibility tokens, one active cue, bounded sequence; generation/attempt guards, blur/hide/context suppression and teardown. Fake clocks, native HTML5 play counts and actual-control lifecycle cases cover late callbacks and no resume backlog. |
| AC4 | Optional owned requests/decode, useful unavailable/blocked status and explicit retry. Browser missing/corrupt/stalled/unsupported/late media and rejected/pending unlock scenarios keep legal commands usable. |
| AC5 | Eight cues, fixed typed manifest, existing Phaser cache/sound APIs, no new runtime dependency or domain changes. Raw comparable measurements preserve all samples and unchanged budgets. |
| AC6 | RED-first regressions plus configured unit/content/browser/typecheck/build/spec/diff checks; all 207 configured cases covered by passing full-run/recheck results below. Physical matrix is explicit; no hardware audibility or frame certification is inferred. |

The ablation outcome is one pure mapper and one disposable scene adapter, reusing existing HUD styles and legal-control test helpers. `src/domain`, `BattleSession`, `ProofAudio`, package manifests and lockfile are unchanged. Audio never joins the animation-completion promise or dispatches a command.

## Cue recipe and mapping

Run `python3 scripts/generate-battle-audio.py` (Python stdlib and ffmpeg/libmp3lame). Original mono synthesized PCM at 22,050 Hz, 32 kbit/s MP3 with fades and a peak envelope of 0.24; no external media or runtime dependency. `src/audio/battleCues.ts` defines logical durations and fixed URLs. Durations below are the values reported by ffprobe.

Movement → move; recorded attack result → miss/hit/critical (including Guarded Strike/High Shot); Magic Missile ability kind → one magic; any defeats → one unit-defeat; battleEnded → victory/loss. Damage, missile rolls, turn and guard events add no cues. Maximum four; defeat/outcome retained at the end.

| Cue | Encoded seconds | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| critical | 0.220000 | 1376 | `f419892404a9224fd4bf984892eb69f33a2c0704d8776873ee21bc58bd5901f8` |
| hit | 0.120000 | 958 | `607244384c2d238211fa46631325a07232728d15fbfca68bcaaa87a5b65bee41` |
| loss | 0.420091 | 2212 | `cee68cbe441f8622a7b559414305e3bcc459fb48f46115951f9f5097291ca6a5` |
| magic | 0.260000 | 1481 | `ddab11c45966c473523560aed11b3722cca9e8108b4eb49f1e46387dcc2a6a65` |
| miss | 0.140000 | 1063 | `46c4680c22025042552972330e4237ce23c5480eac6db0e08a65e2ca0e8381e6` |
| move | 0.120000 | 958 | `987ac8ce55959343212675696e3201821717fca9718ad7e5b26bd420f45e5d34` |
| unit-defeat | 0.240000 | 1481 | `a9a5264dacbfacba180c562dbfe4f4aeed8848f73171c3413009a8e2a2396df4` |
| victory | 0.420091 | 2212 | `1d6e4fd2177d1013b4cce4c9ee480ba67cf107a81e6ae1033b561f6619790758` |

Total: 11741 bytes (limit 32768).

## Lifecycle bounds and ownership

Timeouts: 5 s per fetch/body, 6.5 s overall including decode, 2 s gesture unlock, cue logical duration + 500 ms for playback. Scene restart retries unavailable media; unlock/playback failures permit Retry sound. There are no automatic request retries or feedback backlogs.

Requests abort on failure/shutdown; decoder results cannot populate cache after invalidation. Decoded Web Audio cache survives restarts. Sound instances, HTML5 tags/object URLs, event listeners and timers belong to the scene adapter and are released. HTML5 temporarily delegates blur handling to the adapter through the public `pauseOnBlur` setting, restored on teardown. Web Audio availability follows its live context state, avoiding Phaser's stale initial lock after a rejected gesture.

Asset regeneration with ffmpeg 8.1.1 reproduced all eight SHA-256 values exactly.

## Failures found and repaired

- Original policy and adapter RED runs failed on missing modules. GREEN began with 24 focused tests; subsequent lifecycle regressions bring that set to 28.
- First full browser attempt (initial `2d87b64` source, precommit build identified as dirty `7959063`): 90 passed, 1 failed, 1 interrupted, 115 not run. Touch HTML5 stayed locked because owned loading bypassed Phaser's loader refresh. A unit regression failed RED; the enabling gesture now calls the manager's existing unlock method.
- HTML5 focus automatically replayed Phaser's private paused-sound list. A RED blur regression led to the public `pauseOnBlur` ownership policy, with native media play counts proving no focus replay. The test's seed-3 enemy-turn assumption caused 3 failures / 3 passes; two intermediate capture-listener approaches each caused 3 HTML5 failures / 3 mute passes and were removed. The final policy passed 6/6 across profiles (31.5 s).
- A late HTML5 priming promise paused a newer cue after retry. RED observed 7 pause calls instead of 6; the existing live/attempt guard now runs before touching media. All 27 then-current focused and 287 full unit tests passed.
- Full configured run on clean `5b22bf5`: 206 passed, 1 failure (21.7 minutes). The landscape seed-1 sound-on/off comparison reached its 240 s aggregate allowance during the second progressing battle, at round 7. The comparison now has 360 s, twice the existing single-battle 180 s allowance. Its per-turn 10 s assertion and product budgets are unchanged. Final-guard landscape recheck on `6cd67e2`: 3/3 passed in 1.5 minutes; that comparison took 1.3 minutes.
- Next full run on clean `6cd67e2`: 14 passed, 2 failed, 1 interrupted, 190 not run. Playwright's `clock.pauseAt(Date.now()+100)` target had passed by the next protocol call. Fixed future clock anchors remove that fixture race. Three traced desktop repetitions of interruption/retry then passed 6/6 (1.1 minutes).
- The other failure exposed a real Web Audio retry defect: Phaser removes its body unlock listeners after rejection and can leave its initial manager lock set even after a later direct resume succeeds. A new unit test and deterministic real-control browser test both failed RED (blocked instead of ready). The redundant Web Audio manager-lock predicate was removed; live context state is authoritative, while HTML5 retains its lock check. On clean `ca1923a`, all 288 unit tests and nine interruption/rejected/pending-unlock browser checks pass.

- The first final-build full run (`ca1923a`) stopped at 32 passed, 2 failed, 1 interrupted, 172 not run (6.5 minutes). Both failures were 30 s aggregate deadlines in existing composite board tests: four restarts plus two orientation screenshots, and multiple DPR/resize/pan/drag combinations. They expired at `Wait / End turn` and `mouse.move` respectively, with usable battle controls; all 13 desktop audio cases had passed. A subsequent experiment used `npm test -- --timeout=60000` for a 60 s runner allowance. Per-assertion deadlines, explicit 180/360 s battle allowances, 10 s per-turn checks, audio watchdogs and product budgets are unchanged. No existing board test or repository runner configuration was edited. After the unrelated compiler workload ended, both cases passed unchanged with normal defaults in 7.2 s and 5.5 s respectively. A trace-every-action attempt was stopped after 11 passes / 1 interrupted / 195 not run after substantial canvas/snapshot overhead was observed; later host inspection also found unrelated CPU saturation, so tracing alone is not established as the cause; no test failed in that attempt. Tracing is reserved for a focused unresolved failure.

- The normal 60 s runner attempt was stopped at 9 passed / 1 interrupted / 197 not run (1.7 minutes) after host inspection showed many unrelated `cc1plus` processes and load average 57.31. Unchanged proof cases had risen from approximately 1 s to 10 s. No unrelated process was modified. The unrelated compilation later finished (zero compiler processes, 95.2% CPU idle); final validation resumes with the normal-default `npm test` command. The interrupted run supplies no new failure claim. Logs: `/tmp/guru-issue62-complete-browser.log` (trace attempt), `/tmp/guru-issue62-browser-60s.log` (normal attempt).

- Final normal-default full run on runtime `ca1923a`: **206 passed, 1 failed**, 25.9 minutes (`/tmp/guru-issue62-final-quiet-browser.log`). All 39 battle-audio cases and proof-audio regressions passed. The existing landscape initial-enemy restart test inferred the acting side from the current initiative entry, which already points to the player after an enemy end-turn commit, while that enemy presentation is still active. Its assertion now uses the committed replay command's actor. `npm test -- tests/battle-loop.spec.ts --grep "restart during initial enemy"`: **3 passed** across all profiles (5.9 s); typecheck and diff check pass. This is a test-only correction; runtime remains `ca1923a`. All 207 configured cases have passing coverage across the full run and rechecks; no single clean 207-pass full run is claimed. Existing unaffected results are reused.

Prior local logs: `/tmp/guru-issue62-final-browser.log` (206/1), `/tmp/guru-issue62-recheck-landscape.log` (3/3), `/tmp/guru-issue62-green-browser.log` (14/2, stopped), `/tmp/guru-issue62-clock-unlock-recheck.log` (6/6), `/tmp/guru-issue62-manager-lock-red.log` (deterministic browser RED), `/tmp/guru-issue62-final-unlock-check.log` (9/9). No incomplete run is claimed as a full-suite success.

## Physical-device handoff for #11

Runtime build under review: clean `ca1923a6ca34971af57af3608f0b0dd2b43fb6f8` on `work/issue-62-battle-audio`; [draft PR #63](https://github.com/luminari-gurus/tactics-guru-v2/pull/63). No physical devices or audible output observation are available in this environment. Chromium runs with headless muted output; desktop, Pixel 7 portrait and landscape are automated emulations only.

| Browser/device | Orientation | Device / OS / build evidence | Gesture / audible cues / mute / background-interruption-resume / restart / controls |
| --- | --- | --- | --- |
| iPhone Safari | Portrait | Device and OS unavailable; review build pending physical run | Unverified |
| iPhone Safari | Landscape | Device and OS unavailable; review build pending physical run | Unverified |
| iPhone Chrome | Portrait | Device and OS unavailable; review build pending physical run | Unverified |
| iPhone Chrome | Landscape | Device and OS unavailable; review build pending physical run | Unverified |
| Android Chrome | Portrait | Physical device and OS unavailable; review build pending physical run | Unverified |
| Android Chrome | Landscape | Physical device and OS unavailable; review build pending physical run | Unverified |
| Desktop browser | Portrait | No physical audible output observation; review build pending physical run | Unverified |
| Desktop browser | Landscape | No physical audible output observation; review build pending physical run | Unverified |

Handoff: #11 should run each row on the PR build, record device/OS/browser/full served commit, and observe distinct movement/attack/signature/defeat/outcome cues after Enable sound, immediate mute, background/OS interruption/resume without stale feedback, and five restarts with usable controls. Record failures without replacing them with playback counters. Existing #11 F1 idle p50/p95 and F2 workload failures remain open; #61 is unmerged and no equivalent battle frame collector exists on this baseline. Do not infer frame acceptance from audio tests.

## Initial comparable baseline/candidate measurements

[Raw 72 samples, resource transfers, file hashes and build identities](issue-62/baseline-candidate.json). Baseline: clean `9f785dfd3e9ce703ff8ab46210f84c38890c6f2a`; candidate: clean `5b22bf53405316f0e474f98beffae45cc31e0aac`. Chromium 153.0.8010.12 on the same Linux/WSL host, sequential runs with no competing task browser, localhost, unthrottled CPU/network. Three fresh-context cold loads and same-context warm reloads per profile and sound mode; no routing (preserves HTTP cache). Baseline has no audio toggle; its requested-on rows remain silent controls. Candidate enables with a trusted click after Ready; reload starts muted before that click. All 72 samples have complete timestamps and zero unexpected console/page errors. Every enabled candidate sample is ready and started one cue; every muted sample started zero.

Reproduce after building each revision in isolated worktrees (reuse local `node_modules`):

```sh
node --experimental-strip-types scripts/measure-battle-audio.ts /tmp/guru-issue62-baseline/dist /tmp/guru-issue62-candidate/dist docs/qa/issue-62/baseline-candidate.json
```

The collector selects a free localhost port, uses the same origin for both builds, and records only its own preview. An initial fixed-port attempt collided with an existing unrelated preview on 4175; no samples were collected, and that server was left untouched. The collector also now handles an already-exited child and bounds page waits at 15 s.

Timing definitions: **Ready** is observed `#game[data-ready=true]` (canvas/input bindings/restart ready). **Player** is the first `data-phase=player`, after initial enemy animations. Neither substitutes for #61's unmerged frame/controls instrumentation. Control-response timings run from capture to bubbling after the trusted Move/Confirm handler; they measure synchronous UI/command work, not display scanout or input-to-frame latency.

Medians of three, milliseconds, **Ready / first player turn**:

| Profile | Requested sound | Cache | Baseline | Candidate |
| --- | --- | --- | ---: | ---: |
| desktop | off | cold | 195.3 / 596.4 | 223.7 / 629.4 |
| desktop | off | warm | 182.5 / 598.4 | 202.8 / 588.7 |
| desktop | on | cold | 200.2 / 617.8 | 223.9 / 638.1 |
| desktop | on | warm | 181.5 / 585.5 | 216.4 / 619.6 |
| mobile-portrait | off | cold | 193.1 / 581.9 | 229.1 / 630.0 |
| mobile-portrait | off | warm | 184.9 / 561.3 | 208.1 / 624.5 |
| mobile-portrait | on | cold | 202.9 / 614.2 | 304.3 / 804.2 |
| mobile-portrait | on | warm | 201.8 / 595.0 | 376.3 / 951.6 |
| mobile-landscape | off | cold | 218.7 / 621.5 | 222.7 / 667.4 |
| mobile-landscape | off | warm | 184.1 / 588.9 | 191.9 / 576.2 |
| mobile-landscape | on | cold | 211.2 / 602.3 | 223.0 / 617.1 |
| mobile-landscape | on | warm | 181.1 / 567.2 | 188.9 / 599.8 |

| Budget / measure | Baseline | Candidate | Assessment |
| --- | ---: | ---: | --- |
| Cue file bytes ≤32768 | 0 | 11741 | Pass, +11741 |
| Gzip JS+CSS bytes ≤400000 (`gzipSync` per file) | 389236 | 391851 | Pass, +2615 |
| Cold scene asset transfer ≤1500000 (includes headers) | 834688 | 848829 | Pass, +14141 |
| Total cold transfer (all captured resources) | 1226521 | 1243278 | +16757 including headers |
| Total warm transfer | 6900 | 9300 | +2400 (eight audio cache validations) |
| Cold Ready maximum ≤2500 ms | 254.4 | 355.7 | Ready proxy passes |
| Warm Ready maximum ≤750 ms | 244.2 | 388.2 | Ready proxy passes |
| First player turn, cold maximum | 689.9 | 845.9 | Separate animation-inclusive signal |
| First player turn, warm maximum | 656.1 | 959.6 | Candidate exceeds 750 ms if this defines usability |
| Move handler maximum | 3.9 | 2.8 | Synchronous response only |
| Confirm handler maximum | 5.8 | 7.4 | +1.6 ms worst observed; not frame latency |

Ready medians across all profiles/modes rose from 202.8 to 223.8 ms cold and 183.3 to 203.3 ms warm. Preserve the slower samples; a single-host comparison does not identify causation or prove physical performance. 3 candidate warm first-player samples exceed 750 ms; those rows remain in the raw evidence. The 750 ms limit is unchanged; Ready and first-player availability are reported separately rather than treating them as interchangeable gates. Final #11 usability/frame acceptance remains open.

F1 idle p50 ≤16.7 ms / p95 ≤20 ms and F2 workload p95 ≤33.4 ms remain unchanged and unverified for this build: merged main has no battle frame sampler. Existing failures in [PR #61](https://github.com/luminari-gurus/tactics-guru-v2/pull/61) are retained under #11; these loading results do not clear them.

## Contended runtime refresh

The [contended refresh](issue-62/contended-baseline-candidate.json) compares clean baseline `9f785df` with clean runtime `ca1923a`, using the same collector, host, Chromium, profiles, cache sequence and unthrottled setup as the initial capture. No other task browser runs concurrently. Before capture there were no compiler processes and approximately 64% CPU idle. An unrelated C++ workload resumed during baseline collection (observed at 2026-10-10 21:25 UTC: nine compiler processes, load average 23.97). This shared-host variation is a limitation of the refreshed timing comparison: retain every sample, report observed deltas without assigning them to audio, and do not infer #11 performance acceptance. Asset/code bytes and hashes are independent of that contention. The initial capture and its failures remain separately available.

The refresh contains 72 complete, error-free samples with the expected clean build identities and enabled/muted playback counts. It records **five baseline and one candidate warm Ready samples above 750 ms**, plus 15 baseline and eight candidate warm first-player samples above 750 ms. Cold Ready maxima were 1012.7 / 714.4 ms (baseline / candidate); warm Ready maxima 920.1 / 958.3 ms; warm first-player maxima 1834.5 / 1620.4 ms. These failures remain in the raw file. Code is 389236 / 391852 gzip bytes and cues 0 / 11741 bytes.

A final capture starts after the unrelated compilation finishes again (zero compiler processes, 97.3% CPU idle). The collector now records per-sample system CPU busy percentage and load averages so reviewers can see contention instead of assuming stable conditions. This adds observation to the task-specific collector only; application/test behavior is unchanged.

## Final comparable configuration capture

[Final 72 samples with per-sample host activity](issue-62/final-baseline-candidate.json), captured 2026-10-10 21:31:55 UTC. Clean baseline `9f785dfd3e9ce703ff8ab46210f84c38890c6f2a`; clean runtime `ca1923a6ca34971af57af3608f0b0dd2b43fb6f8`; Chromium 153.0.8010.12. The hardware, browser, profile, cache and legal-command sequence match the earlier method. All 72 tuples are unique and complete, with zero unexpected errors. All 18 enabled candidate samples are ready and start one cue; all 18 muted samples start zero.

Per-sample system CPU busy percentages (including browser work) are baseline 46.0–60.4%, median 51.3%, and candidate 39.4–76.9%, median 57.0%. These readings make host variation visible; they do not isolate an audio CPU cost or establish physical performance. No loading, transfer or frame budget was relaxed.

Medians of three, milliseconds, **Ready / first player turn**:

| Profile | Requested sound | Cache | Baseline | Candidate |
| --- | --- | --- | ---: | ---: |
| desktop | off | cold | 221.1 / 639.1 | 261.8 / 676.6 |
| desktop | off | warm | 213.8 / 606.0 | 212.3 / 630.7 |
| desktop | on | cold | 215.2 / 616.5 | 215.5 / 621.8 |
| desktop | on | warm | 209.0 / 618.6 | 205.2 / 613.9 |
| mobile-portrait | off | cold | 203.6 / 596.4 | 219.1 / 636.9 |
| mobile-portrait | off | warm | 197.6 / 608.3 | 200.6 / 605.5 |
| mobile-portrait | on | cold | 210.9 / 618.9 | 278.3 / 682.0 |
| mobile-portrait | on | warm | 185.0 / 583.9 | 257.0 / 670.4 |
| mobile-landscape | off | cold | 205.7 / 594.4 | 225.0 / 627.3 |
| mobile-landscape | off | warm | 182.2 / 567.1 | 345.8 / 801.3 |
| mobile-landscape | on | cold | 201.8 / 592.8 | 309.8 / 753.3 |
| mobile-landscape | on | warm | 206.3 / 591.4 | 326.5 / 769.9 |

| Budget / measure | Baseline | Candidate | Assessment |
| --- | ---: | ---: | --- |
| Cue file bytes ≤32768 | 0 | 11741 | Pass |
| Gzip JS+CSS bytes ≤400000 | 389236 | 391852 | Pass, +2616 |
| Cold scene asset transfer ≤1500000 | 834688 | 848829 | Pass, +14141 |
| Total cold transfer | 1226521 | 1243278 | +16757 including headers |
| Total warm transfer | 6900 | 9300 | +2400 including cache validations |
| Cold Ready maximum ≤2500 ms | 255.7 | 2302.2 | Ready proxy passes |
| Warm Ready maximum ≤750 ms | 216.4 | 559.1 | Ready proxy passes |
| Cold first-player maximum | 667.9 | 2832.2 | One candidate sample exceeds 2500 ms |
| Warm first-player maximum | 639.1 | 975.5 | Four candidate samples exceed 750 ms |
| Move handler maximum | 3.7 | 2.9 | Synchronous response only |
| Confirm handler maximum | 3.6 | 11.9 | Synchronous response only |

The first-player failures are all landscape: warm sound-off repetitions 2/3 (848.9/801.3 ms), warm sound-on repetitions 1/2 (769.9/975.5 ms), and cold sound-on repetition 3 (2832.2 ms). Ready and first-player availability remain distinct; passing the Ready proxy does not clear these later usability observations. The initial capture's three warm first-player failures and the contended capture's warm Ready failures are preserved, not replaced. #11 must resolve/accept the intended usability signal and obtain frame/device evidence before first-battle performance acceptance.

Reproduce the final comparison after building the exact revisions in isolated worktrees:

```sh
node --experimental-strip-types scripts/measure-battle-audio.ts /tmp/guru-issue62-baseline/dist /tmp/guru-issue62-candidate/dist docs/qa/issue-62/final-baseline-candidate.json
```

Use a new output path for subsequent measurements to preserve this evidence. The collector records build identities, resource/file hashes, cold/warm timing, handler response, playback states and host activity. The two task-owned worktrees can be recreated from the revisions above after cleanup.
