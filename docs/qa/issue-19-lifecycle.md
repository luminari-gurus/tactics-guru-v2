# Issue #19: proof-scene audio unlock and browser lifecycle

Implemented from `origin/main` at `e752e72` on `issue-19-audio-lifecycle`. Implementation commits: `1fd66c8` (tone asset and catalog), `19090d1` (audio reducer and adapter), `06d5772` (lifecycle), `39f8930` (layout and page gestures), `b14ac57` (browser tests). Plan and decision history: `docs/ongoing-projects/issue-19-audio-lifecycle-plan.md`.

This note is the evidence for the PR. Section 6 is the physical-device checklist that #20 executes; nothing in Chromium emulation closes those items.

## 1. Unlock tone source

The tone is generated from a synthetic signal with ffmpeg. The commands were run on 2026-10-07 with `ffmpeg version 8.1.1` (Ubuntu build, gcc 13). Metadata and encoder tags are disabled so the outputs are byte-reproducible; a second run of both encodes produced identical hashes.

```sh
ffmpeg -f lavfi -i "sine=frequency=880:sample_rate=44100:duration=0.15" \
  -af "afade=t=in:st=0:d=0.01,afade=t=out:st=0.14:d=0.01" -ac 1 -ar 44100 -c:a pcm_s16le \
  -fflags +bitexact -flags:a +bitexact -map_metadata -1 unlock-tone.wav
ffmpeg -i unlock-tone.wav -c:a libmp3lame -b:a 64k -fflags +bitexact -flags:a +bitexact \
  -map_metadata -1 -id3v2_version 0 -write_xing 0 unlock-tone.mp3
ffmpeg -i unlock-tone.wav -c:a libvorbis -q:a 3 -fflags +bitexact -flags:a +bitexact \
  -map_metadata -1 unlock-tone.ogg
```

| File | Role | Bytes | SHA-256 | Decoded duration |
| --- | --- | ---: | --- | --- |
| `unlock-tone.wav` (intermediate, not committed) | source | 13,274 | `c239beef43de20d41d2623febd877559608331fd75d018df51b99826401f6cd6` | 0.150 s |
| `public/proof/unlock-tone.mp3` | played | 1,462 | `0af0c3a2d1ef4eb91cce55ab6b4a9668b74274741e5c20cbd2e24b4d096d31ec` | 0.183 s (encoder padding) |
| `public/proof/unlock-tone.ogg` | decode-only probe, never played | 3,768 | `e57491c81c51e2a1f81fad699be7cbcc5916866cf48a1b1075aebe9a6956668d` | 0.150 s |

Signal: 880 Hz sine, 150 ms, 10 ms linear fade in and out, mono, 44.1 kHz. MP3 is the only compressed audio format the restart plan allows for shipped assets (§5.1); the OGG exists so an iPhone can answer the codec question in restart plan D1 by reporting `audio.device.ogg` and `audio.cached.ogg`. The same facts sit in a comment next to the catalog in `src/diagnostics/proofAssets.ts`.

Four ElevenLabs-generated alternatives, with their prompts, provider bytes, ffmpeg processing and hashes, are recorded in [issue-19-unlock-tone-candidates.md](issue-19-unlock-tone-candidates.md). None is adopted; the sine tone above is still the played asset.

## 2. Decisions taken

The plan proposed D-A to D-H. Taken as proposed unless noted.

- **D-A generated tone.** As proposed. The OGG probe cost nothing extra.
- **D-B pure reducer.** As proposed, with two additions: an initial `loading` state (before the loader reports) and an `unlocking` state between the gesture and `playStarted`, so the button is disabled while `context.resume()` is pending. `canRetry` is true for `locked`, `ready`, `played` and `blocked` only.
- **D-C thin scene-owned adapter.** As proposed, corrected after review (R-1 and R-3 below). The adapter detects `NoAudioSoundManager` (unsupported), resumes the WebAudio context synchronously inside the click and awaits it under a 2,000 ms wall-clock watchdog (`UNLOCK_TIMEOUT_MS`), plays one `BaseSound` instance, waits for `Phaser.Sound.Events.COMPLETE`, and arms a scene-clock timeout of duration plus 1,000 ms. Any throw or rejection becomes `blocked` with the message. It subscribes to the context's `statechange` event so the reducer follows the context between presses. `play()` has exactly one caller: the button.
- **D-D non-fatal audio load.** As proposed, plus the decode case: Phaser 4.2.1 does not emit `FILE_LOAD_ERROR` for a decode failure (`fileProcessComplete` only moves the file to the failed set), so after `preload` the adapter treats a missing `cache.audio` key as `Could not decode` when `device.audio.mp3` is true and as unsupported when it is false. An XHR failure arrives through the loader event and reads `Could not load unlock-tone`. Corrected after review (R-2): the audio files no longer share the images' loader pass. `preload` queues only the four images; `create()` starts a second pass for the tone and the OGG probe with a 5,000 ms XHR timeout per file (`AUDIO_LOAD_TIMEOUT_MS`) and constructs the adapter when that pass settles. The board, `fit:scene-ready` and Restart never wait on audio; the control reads Loading meanwhile. A request that neither completes nor errors times out, Phaser retries it twice (the loader's default `maxRetries`), and the control then reads `Unavailable: Could not load unlock-tone`, about 15 s after the pass started. Phaser's HTML5 fallback manager loads through `<audio>` elements without this timeout; every supported browser uses WebAudio here.
- **D-E move in flight: freeze, then continue. Changed.** The plan assumed Phaser pauses its loop on hidden. In 4.2.1, `TimeStep.pause()` only records the pause time; the loop keeps stepping as long as the browser delivers animation frames. Physical devices freeze because the browser stops frames, but emulation does not (Playwright disables renderer backgrounding), and relying on the browser leaves the behaviour undefined. The scene now pauses the move tween on `Core.Events.HIDDEN`, records `lifecycle.moveFrozenAt` from `tween.progress`, and resumes it on `VISIBLE`; `TimeStep.resume()` still resets the delta so there is no jump. Window blur without hiding does not freeze. Cancel-and-reset and wall-clock catch-up stay rejected.
- **D-F pointer state dropped on hide.** As proposed, through `canvas.ownerDocument` so the unit test's fake canvas carries a fake document.
- **D-G top-docked panel that scrolls. Adjusted.** The cap is `min(70dvh, 100dvh − insets)` in every orientation and `45dvh` in landscape under 500 px tall, so the board always keeps at least 30% (55% in short landscape) of the height. The disclosure group is named **Board controls** because the aside is already labelled "Proof scene diagnostics". The measurements JSON keeps `user-select: text` so testers can copy it. `fitBoard` was unchanged: it already reads the panel's rendered bottom.
- **D-H DOM button.** As proposed.

Review corrections ([PR #31 review](https://github.com/luminari-gurus/tactics-guru-v2/pull/31#pullrequestreview-5444000832), 2026-10-07). Each was reproduced with a failing spec before the change; the specs are named in `tests/audio.spec.ts`.

- **R-1 unlock watchdog (medium).** `AudioContext.resume()` is allowed never to settle: Chrome keeps the promise pending while the context is not allowed to start, and WebKit until an interruption ends. The only watchdog was armed after the await, so such an attempt stayed `unlocking` with the button disabled, and "retry on the same button" did not hold. The adapter now arms a `setTimeout` of `UNLOCK_TIMEOUT_MS` (2,000 ms) before the await; a scene-clock timer would not do, because the scene clock does not advance while animation frames are stopped. On expiry the attempt is abandoned (a late settlement is ignored), the reducer reports `Blocked: Audio context did not resume in time`, and the button is enabled again. The reducer's `timeout` event now names the phase that timed out. Cleared on settlement and on SHUTDOWN. Spec: *a resume() that never settles is reported as blocked with retry, then plays once it can*.
- **R-2 audio pass (medium).** Described under D-D. Spec: *a stalled tone request never holds the board; the control reports unavailable after the load timeout*, which also restarts the scene while the pass is stalled; the new run starts its own pass and settles the same way.
- **R-3 context state (low).** The diagnostics were a copy taken at the last reducer dispatch, and nothing observed the context between presses, so after Phaser's own body-gesture unlock the control still read Locked with `contextState: "suspended"` while the context was running. The adapter now subscribes to `statechange` (removed on SHUTDOWN); the reducer moves `locked → ready` when the context runs and `ready → locked` when it stops running, while `played` and `blocked` keep the last attempt's result; `setAudioDiagnostics` takes a provider so `contextState`, `locked` and `cached` are read when `fitDiagnostics()` runs. A state change that blocks an attempt while `resume()` is pending wins over a later settlement. Spec: *the control follows the audio context: a body gesture unlock reads Ready and a suspension reads Locked, with no attempt*.

## 3. Behaviour reference

Audio states, as shown beside **Play test sound** and in `audio.state`:

| State | Status text | Button | Meaning |
| --- | --- | --- | --- |
| `loading` | Loading | disabled | The audio pass for this run has not settled; it starts once the board is created and never gates Ready |
| `unavailable` | Unavailable: *reason* | disabled | No audio manager, MP3 unsupported, file failed to load or decode |
| `locked` | Locked | enabled | Tone cached; context not `running` (autoplay policy, or suspended by Phaser while the window is blurred); the button press is the gesture |
| `ready` | Ready | enabled | Tone cached; context `running` |
| `unlocking` | Unlocking | disabled | Gesture received; `context.resume()` pending |
| `playing` | Playing | disabled | `play()` returned true; waiting for COMPLETE |
| `played` | Played | enabled | COMPLETE received; `playedCount` incremented |
| `blocked` | Blocked: *reason* | enabled | Context not `running` after the gesture, `resume()` not settled within 2 s, play refused or threw, or no COMPLETE in time |

Restart returns to `loading` and the new run reports again (normally `ready`, because the context is already running). `attempts` and `playedCount` are per run.

Diagnostics (`window.fitDiagnostics()` and the Measurements panel):

- `audio`: the reducer fields plus `manager` (`webaudio`, `html5`, `none`), `locked` (Phaser's flag), `device: { mp3, ogg, webAudio }` (`canPlayType` answers) and `cached: { mp3, ogg }`. `contextState`, `locked` and `cached` are read when the snapshot is taken, not at the last state change; `null` while the audio pass is in flight.
- `lifecycle`: `hidden`, `visible`, `blur`, `focus` counts for this run, `moveFrozenAt` (tween progress 0–1 at the last hide during a move, else `null`) and `moveCompleted`.

Lifecycle rules: a move freezes while hidden and completes exactly once after resume; `#move-status` stays `Moving` and the locked controls stay locked throughout. Captured pointers are released and the pointer map cleared when the document becomes hidden. Nothing starts audio from `visibilitychange`, `blur`, `focus`, the context's `statechange`, Phaser's `unlocked`, `VISIBLE` or any other event. Every listener and the sound instance are removed on scene `SHUTDOWN`. Phaser 4.2.1 suspends the context on window blur (`pauseOnBlur`) and resumes a suspended or interrupted context on every step while the game has focus, so the control reads Locked while the window is blurred and Ready again on focus, with no attempt counted.

Layout rules: panel controls are at least 44 CSS px tall; the panel scrolls within its cap; `html, body { overscroll-behavior: none }`; `user-select: none` and no touch callout on `#game` and `#fit-panel`; `touch-action: manipulation` on panel buttons, select, summaries and the slider; `disableContextMenu: true` in the Phaser config.

## 4. Validation

Host: Linux 6.6.114.1 (WSL2), Intel Core Ultra 9 285H, Node v24.15.0. Browser: Playwright 1.63.0 with its own Chromium (Chrome for Testing 153.0.8010.12), headless, no `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. No CI exists; every command ran locally.

- `npm ci`: installed the pinned dependencies (the earlier local `node_modules` lacked Vitest).
- RED: `npm run test:unit -- tests/unit/audioState.test.ts` failed before increment 2 because `src/diagnostics/audioState.ts` did not exist. `npm run test:unit -- tests/unit/input.test.ts` failed 3 tests before increment 3 (`expected [] to deeply equal ['visibilitychange']`).
- `npm run test:unit`: 29 passed (17 before this issue, 10 reducer, 2 hidden-pointer).
- `npm run build`: strict `tsc --noEmit` and Vite production build passed; the Phaser bundle-size warning remains.
- `npx playwright install chromium`: installed `chromium-1243`.
- `npx playwright test tests/lifecycle.spec.ts tests/audio.spec.ts --project=desktop`: 8 passed. The first run failed one lifecycle test because the spec attached a second MutationObserver on the second run and counted the transition twice; fixed in the spec, not in the scene. The same two specs on `mobile-portrait` and `mobile-landscape`: 16 passed.
- `npx playwright test tests/layout.spec.ts --project=desktop`: 6 passed, after two spec fixes (open collapsed `<details>` before measuring their controls; store the context-menu result instead of awaiting it before the click).
- `npm test`: 81 passed in 3.5 min across desktop, mobile-portrait and mobile-landscape (39 existing plus 14 new per project).
- `npm run measure:fit`: see section 5.
- `git diff --check`: clean.

Review corrections, 2026-10-07, same host and browser:

- RED: `npm run test:unit -- tests/unit/audioState.test.ts` failed the two new reducer cases (`ready` stayed `ready` on a suspended context; the unlock timeout read `Playback did not complete in time`). `npx playwright test tests/audio.spec.ts --project=desktop -g "never settles|stalled tone|follows the audio context"` failed all three new specs against the unchanged build: status stuck at `Unlocking`; `#fit-status` still `Loading` 5 s after navigation with the tone stalled; `Locked` after a fixture click with the context running.
- A scratch spec that logged every `XMLHttpRequest.send` confirmed that Phaser sets `timeout` on the two audio requests, that Chromium fires `ontimeout` for a request held open by a Playwright route, and that Phaser retries the file twice before `FILE_LOAD_ERROR`; it also showed that a bare `context.suspend()` is resumed by Phaser within a frame (see the observations), which is why the spec models a suspension through window blur.
- `npm run test:unit`: 31 passed. `npm run build`: passed. `npx playwright test tests/audio.spec.ts --project=desktop`: 7 passed.
- `npm test`: 90 passed in 2.8 min across desktop, mobile-portrait and mobile-landscape (81 before, plus the three new audio specs per project); the stalled-tone spec takes about 17 s per project because of the two loader retries.
- `git diff --check`: clean.

Observations during validation:

- Phaser's `AudioContext` started `suspended` (status Locked) in some headless runs and `running` (Ready) in others: the collector shows `ready` on every cold navigation and `locked` on every reload. A Playwright click is trusted input, and every press resumed the context. So the `locked → played` path exercises Chromium's gesture gate, but not iOS Safari's rules.
- Playwright starts Chromium with `--disable-renderer-backgrounding` and `--disable-background-timer-throttling`, so the browser never throttles frames in tests. `lifecycle.spec.ts` redefines `document.hidden`/`visibilityState` and dispatches `visibilitychange`; Phaser's `VisibilityHandler` reads `document.hidden`, so this drives Phaser and the scene alike.
- Pre-existing console warnings (not errors) remain: Phaser's `Mask.setMask ... not supported in WebGL` from the board's 16 surface masks (#16) and the GL driver's `GPU stall due to ReadPixels`. Not in #19's scope; noted for the maintainer.
- A missing tone logs the browser's own `Failed to load resource: net::ERR_FAILED` console errors, like the existing missing-image check, so that spec captures `pageerror` only.
- Phaser 4.2.1's `WebAudioSoundManager.update()` calls `onFocus()` on every step while the game has focus, which resumes any suspended or interrupted context once audio is unlocked. A bare `context.suspend()` is therefore undone within a frame; a window blur sets `gameLostFocus` and keeps the context suspended until focus returns.

Screenshots from the desktop project (DPR 1), supporting evidence only: [390×844](issue-19/layout-390x844.png) and [915×412](issue-19/layout-915x412.png), both with Measurements open and the panel scrolled to its last control.

## 5. Fit measurements

`npm run measure:fit` ran twice on this host under the same conditions, a few minutes apart, each from a clean build whose baked `build.commit` matches the measured source: first the branch at `b14ac57` (its JSON reports `sourceDirty: true` only because this note was being written in the tree; the build itself was clean), then `origin/main` at `e752e72` in a separate clean worktree. Raw results: [fit-branch-b14ac57.json](issue-19/fit-branch-b14ac57.json), [fit-main-e752e72.json](issue-19/fit-main-e752e72.json). Chrome for Testing 153.0.8010.12 headless on WSL2 with software rendering; these are not physical-device or GPU numbers, and the macOS figures in earlier notes are not comparable.

Medians of three repetitions per profile and cache state. Timings are milliseconds from navigation start; frame columns are medians of the per-run p50/p95 of active frame intervals.

| Profile | Cache | Transferred bytes main → branch | Controls usable ms main → branch | Frame p50 ms main → branch | Frame p95 ms main → branch |
| --- | --- | ---: | ---: | ---: | ---: |
| desktop | cold | 7,759,410 → 7,767,267 | 736.3 → 637.5 | 30.7 → 21.4 | 48.6 → 40.0 |
| desktop | warm | 3,000 → 3,600 | 699.6 → 665.2 | 23.6 → 24.3 | 34.3 → 40.8 |
| mobile-portrait | cold | 7,759,410 → 7,767,267 | 720.2 → 564.9 | 16.7 → 17.4 | 47.9 → 34.3 |
| mobile-portrait | warm | 3,000 → 3,600 | 958.0 → 508.3 | 16.7 → 17.8 | 25.9 → 28.4 |
| mobile-landscape | cold | 7,759,410 → 7,767,267 | 393.2 → 648.4 | 16.7 → 16.8 | 16.9 → 27.7 |
| mobile-landscape | warm | 3,000 → 3,600 | 354.0 → 478.4 | 16.7 → 16.7 | 16.9 → 29.4 |

Reading: the two tone files add 5,830 transferred bytes on a cold load (MP3 1,762 and OGG 4,068 including headers) and two revalidations on a warm load; the build grew by 11,967 raw bytes. Controls-usable moves in both directions by hundreds of milliseconds between the two runs, which is this host's run-to-run noise, not a trend; frame medians stay at the 16.7 ms frame interval on the mobile profiles. All 36 captures had zero console or page errors. The `audio` block was `ready` on every cold load and `locked` on every warm reload, so the context's initial state in headless Chromium depends on the navigation, not on the scene.


## 6. Physical-device checklist for #20

These cannot be verified in Chromium emulation. #20 runs them on iPhone Safari, iPhone Chrome, Android Chrome and a desktop browser, in portrait and landscape, and records device, OS, browser, build commit (`build.commit` in Measurements) and the `audio` and `lifecycle` blocks for each row.

| Check | What to observe | Why emulation is not enough |
| --- | --- | --- |
| First-gesture unlock | Fresh load, no prior tap: press **Play test sound**; tone audible; status `Played`; `audio.attempts` 1, `playedCount` 1 | Chromium's gate accepted a scripted trusted click; iOS requires a real touch |
| Pan-first unlock | Fresh load, pan the board first (status may change from Locked to Ready), then press the button; tone audible | Confirms Phaser's body unlock plus the button's resume on the real policy |
| Retry after block | If any press shows `Blocked`, press again; record whether the second press plays | The blocked path was produced by stubbing `resume()` |
| Silent switch (iPhone) | Ringer switch on silent: does the tone play? Record either way; not a bug | WebAudio on iOS follows the switch unless `navigator.audioSession` is set; a later decision |
| Interrupted state | Start the tone, take a call or invoke Siri, return; status should read `Locked` while the context is `interrupted` and the page visible, `Ready` once it runs again; press again; plays; `audio.contextState` recorded | `interrupted` does not exist on desktop |
| Slow network | Throttle the connection (or stall it after the images are cached): board usable with the audio control at `Loading`, then `Unavailable: Could not load unlock-tone` after about 15 s; Restart during that wait gives a new run that settles the same way | Emulation stalls one request with a route; real radio and proxy behaviour differ |
| Backgrounded during move | Start the move, press Home at about 1 s, wait 10 s, return: hero frozen while away, completes once, `Completed` shown once, `lifecycle.moveFrozenAt` between 0 and 1, `moveCompleted` 1 | OS suspension and real frame throttling differ from a dispatched `visibilitychange` |
| Pointer across app switch | Hold a finger on the board, switch apps, return, drag: the board does not pan until a new press | Real touch cancellation differs from mouse emulation |
| Tab discarded | Background for several minutes under memory pressure; return: page may reload; expect `Loading` then `Ready`, no error | Not simulable |
| Browser chrome | Scroll and toolbar collapse in Safari and Chrome: canvas keeps filling the visual viewport; panel controls stay reachable | `dvh` and toolbar behaviour are engine-specific |
| Safe areas | Notch and home-indicator devices in both orientations: no control under the notch or behind the indicator; panel scrolls within the insets | `env()` resolves to 0 in emulation |
| Page gestures | Double-tap, pinch and long-press on the board and the panel: no page zoom, no text selection, no callout, no pull-to-refresh, no context menu | Chromium emulation does not reproduce iOS gesture defaults |
| Ogg probe (D1) | Read `audio.device.ogg` and `audio.cached.ogg` from Measurements on each iPhone | Codec support is per OS version |
| Low Power Mode | Off during timing checks; note if it was on | Caps rendering at 30 fps |

Record template per device:

```
Device / OS / browser / build.commit:
First-gesture unlock:        pass | fail | note
Pan-first unlock:            pass | fail | note
Retry after block:           n/a | pass | fail
Silent switch:               plays | silent | n/a
Interrupted state:           pass | fail | n/a
Slow network:                pass | fail | n/a
Backgrounded during move:    pass | fail (moveFrozenAt=…, moveCompleted=…)
Pointer across app switch:   pass | fail
Tab discarded:               pass | fail | not reached
Browser chrome:              pass | fail
Safe areas:                  pass | fail
Page gestures:               pass | fail
Ogg probe:                   device.ogg=… cached.ogg=…
Low Power Mode:              off | on
```
