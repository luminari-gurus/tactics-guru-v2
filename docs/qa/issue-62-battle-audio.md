# Issue #62 battle audio QA

Implementation authorized by the user request to implement `docs/ongoing-projects/plan.md` using ablation and OpenSpec. Baseline main: `9f785dfd3e9ce703ff8ab46210f84c38890c6f2a`; planning branch: `79590637e2a58bd620fc283f41511bedc240aebf`. On 2026-10-10 remote main matched that revision and PR #61 remained open/unmerged. No unmerged code is required. Initial worktree was clean.

## Verification in progress

Results will be recorded as executed. Automated counters do not prove hardware audibility.

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

Policy RED: missing `battleCues` module. GREEN: `npm run test:unit -- tests/unit/battleCues.test.ts`, 7 tests passed, including full seeded battle equality.

## Adapter lifecycle evidence

RED: `npm run test:unit -- tests/unit/battleAudio.test.ts` failed on the missing adapter module. GREEN: `npm run test:unit -- tests/unit/battleCues.test.ts tests/unit/battleAudio.test.ts` passed 24 tests; `npm run typecheck` passed. Fake-clock checks cover deduplication, muted/loading/hidden/interrupted consumption, late completion/unlock, rejected/thrown/pending resume, failed/stalled playback, missing/corrupt/stalled requests/decode, and five destroyed loading controllers. Initial desktop integration passed all 12 tests, including HTML5 fallback, unsupported audio, failures, repeated restarts and full seed 1/2 sound-on/off battle equality. The final suite adds explicit touch, per-action cue and late decode checks.

Timeouts: 5 s per fetch/body, 6.5 s overall including decode, 2 s gesture unlock, cue logical duration + 500 ms for playback. No automatic fetch retries; scene restart retries unavailable audio. Playback/unlock failures allow explicit Retry sound. Requests are aborted on failure/shutdown; decoder results cannot populate cache after invalidation. Decoded Web Audio cache survives restarts; sound objects and HTML5 media/URLs are owned and destroyed per scene.

## Physical-device handoff for #11

Build under review: issue-62 branch (final commit/PR recorded below). No physical devices or audible output observation are available in this environment. Chromium runs with headless muted output; desktop, Pixel 7 portrait and landscape are automated emulations only.

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

## Integrated checks (in progress)

- `npm run test:unit`: 25 files, 287 tests passed after the final late-priming regression.
- `npm run validate:content`: 2 files, 77 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; existing Vite warning for a minified chunk over 500 kB retained.
- `npm test -- tests/battle-audio.spec.ts --project desktop`: initial 12 tests passed in 3.1 minutes.
- `openspec validate issue-62-battle-audio --strict` and `git diff --check`: passed.
- Full configured browser suite: running, final result to follow.

Expected failure evidence: the policy/adapter RED runs failed on missing modules before implementation. The missing-media browser scenario intentionally receives a 404 (expected browser resource error); corrupt bytes and stalled decode are contained without application exceptions. Injected failures are distinct from unexpected console/page errors in successful flows.

Rendered control evidence: [portrait](issue-62/portrait.png), [landscape](issue-62/landscape.png), inspected from the full desktop HUD regression. Controls remain at least 44 px and the existing panel scrolls in short landscape. Asset regeneration with ffmpeg 8.1.1 reproduced all eight SHA-256 values exactly.

Initial source checkpoint: `2d87b64568cb2a64cf1d528e66de37a38954c841`. The first full browser attempt served that runtime source from its precommit build (`7959063`, dirty). The final repaired runtime and clean measurement/full-suite build is `5b22bf53405316f0e474f98beffae45cc31e0aac`.

## Failure found and repaired during full validation

The first full run passed 90 tests, then was deliberately stopped after the portrait HTML5 fallback remained blocked (one failure, one interrupted battle, 115 not run). The failure was real: Phaser initializes HTML5 sound as locked on touch devices; its loader normally refreshes that state, but owned media loading bypasses that hook. The enabling gesture now calls the existing manager `unlock()` before silently priming media. A new regression test failed RED (0 unlock calls instead of 1), then all 25 focused policy/adapter tests passed GREEN. Final full-suite results will supersede this incomplete run; its failure is retained here.

Further lifecycle review found that Phaser's HTML5 manager resumes its paused sound list on window focus without an AudioContext event. A second RED regression demonstrated the missing blur stop. The final adapter owns HTML5 blur handling using the public `pauseOnBlur` setting (saved/restored per scene), suppresses batches while blurred, and never plays a focus backlog. The browser fallback test counts native media `play()` calls across blur/focus to detect automatic replay independently of adapter counters. Focused unit total is now 26.

The explicit enemy-mute test initially assumed seed 3 opened on an enemy turn; it actually opens on a player. That test-only failure was repaired by advancing real Wait controls with a controlled clock until a committed enemy presentation is observed. All three profiles passed the corrected enemy-mute check.

Final fallback regression command: `npm test -- tests/battle-audio.spec.ts --grep 'HTML5|mute, hidden'` — 6 passed across desktop/portrait/landscape (31.5 s). This includes real commands, immediate mute during player and enemy presentation, context/visibility suspension, HTML5 unlock and native media play-call equality across focus. An intermediate capture-listener approach was removed: it also captured DOM control blur, then still allowed Phaser's saved resume list to replay. The final public-manager policy avoids both dependencies; the proof adapter and Web Audio manager policy remain unchanged.

## Comparable baseline/candidate measurements

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

Final callback audit: an HTML5 priming promise could settle after retry and pause the newer cue. A RED regression observed every old tag receiving an extra pause (7 calls instead of 6). The callback now checks the same live/attempt guard before touching media; all 27 focused tests pass. This narrow HTML5-only correction is verified separately from the already-running 207-test suite, with final HTML5 browser rechecks and a refreshed clean measurement capture to follow.

Intermediate targeted-run counts are retained for clarity: the seed-3 test assumption produced 3 failures / 3 passes; the initial capture listener and the later capture-filter variant each produced 3 HTML5 failures / 3 mute passes. Those implementations were replaced, not accepted. The final public-manager policy then passed 6/6. The later stale-priming unit regression passed 27/27 focused and 287/287 full unit tests after its guard fix.

The full landscape sound-on/off loss comparison reached its 240 s aggregate test timeout during the second battle (round 7), while individual turn checks continued to advance. The comparator now uses 360 s: two times the existing battle-loop suite's 180 s allowance for a full legal UI battle. The 10 s per-turn progress assertion and all product loading/frame budgets are unchanged. The failed case is rechecked after the remaining suite finishes.

Completed full configured run on clean `5b22bf5`: **206 passed, 1 aggregate comparison timeout**, 21.7 minutes. All desktop/portrait cases and the other landscape cases passed. The corrected landscape comparator and final HTML5 guard are rechecked next; no full-suite success is claimed for this run.
