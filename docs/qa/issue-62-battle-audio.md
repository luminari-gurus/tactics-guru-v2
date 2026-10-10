# Issue #62 battle audio QA

Implementation authorized by the user request to implement `docs/ongoing-projects/plan.md` using ablation and OpenSpec. Baseline main: `9f785dfd3e9ce703ff8ab46210f84c38890c6f2a`; planning branch: `79590637e2a58bd620fc283f41511bedc240aebf`. On 2026-10-10 remote main matched that revision and PR #61 remained open/unmerged. No unmerged code is required. Initial worktree was clean.

## Verification in progress

Results will be recorded as executed. Automated counters do not prove hardware audibility.

## Cue recipe and mapping

Run `python3 scripts/generate-battle-audio.py` (Python stdlib and ffmpeg/libmp3lame). Original mono synthesized PCM at 22,050 Hz, 32 kbit/s MP3 with fades and a peak envelope of 0.24; no external media or runtime dependency. `src/audio/battleCues.ts` defines logical durations and fixed URLs. Encoded durations below include MP3 frame padding.

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

- `npm run test:unit`: 25 files, 284 tests passed.
- `npm run validate:content`: 2 files, 77 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; existing Vite warning for a minified chunk over 500 kB retained.
- `npm test -- tests/battle-audio.spec.ts --project desktop`: initial 12 tests passed in 3.1 minutes.
- `openspec validate issue-62-battle-audio --strict` and `git diff --check`: passed.
- Full configured browser suite: running, final result to follow.

Expected failure evidence: the policy/adapter RED runs failed on missing modules before implementation. The missing-media browser scenario intentionally receives a 404 (expected browser resource error); corrupt bytes and stalled decode are contained without application exceptions. Injected failures are distinct from unexpected console/page errors in successful flows.
