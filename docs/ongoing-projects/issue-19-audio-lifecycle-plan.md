# Issue #19 plan: proof-scene audio unlock and browser lifecycle

Status: Implemented on `issue-19-audio-lifecycle`, PR open for review, 2026-10-07. Owner: moshehbenavraham (assigned on the tracker). See §9 for the handover state.

Issue: [#19 P1: Verify proof-scene audio unlock and browser lifecycle](https://github.com/luminari-gurus/tactics-guru-v2/issues/19).
Parent: #2 (proof-of-fit), within epic #1. Depends on #18 (merged). Blocks #20.

This document is a working plan under `docs/ongoing-projects/`. It is not
project evidence; the PR, its QA note under `docs/qa/` and the issue carry
the evidence. Fold anything durable into the README or the design docs when
the issue closes.

## 1. Where things stand

Checked against GitHub and `origin/main` on 2026-10-07.

### Tracker

| Item | State | Effect on this work |
| -- | -- | -- |
| #14, #15, #16, #17, #18 | Closed; merged as PRs #21–#25 | `main` at `55908a5` has the full proof scene: board, assets, picking/pan/zoom, scripted move, restart. This is the base. |
| #19 | Open, assigned to us, `ready for work` | This plan. |
| #20 | Open, unassigned, depends on #19 | The physical-device gate. #19 must leave it a diagnostic it can run and a checklist it can follow. |
| #2 | Open, parent | Stays open until #20. We do not touch its acceptance boxes. |
| #3–#11 | Open, all downstream of #2 | Untouched. Nothing in #19 may start battle content, rules or HUD. |

### Branches and PRs

| Ref | State | Effect on this work |
| -- | -- | -- |
| `origin/main` `55908a5` | Current | Branch from here. Local `main` is fast-forwarded to it. |
| PR #12 `feat/signed-main-deploy` | Open since 2026-10-06; the PR says it must stay unmerged pending separate authorization | Touches only `deploy/`, `.github/workflows/release.yml`, `README.md`, `.dockerignore`. No overlap with `src/`, `tests/`, `index.html` or `public/`. Do not base on it, do not depend on it, do not resolve its README conflict for it. The README section we add goes next to the existing proof-scene sections, so any later rebase of #12 is trivial. |
| `codex/issue-14…18` | Merged, stale | Ignore. Do not reuse the `codex/` prefix; those were dubstylee's agent branches. |
| `docs` | Merged via PR #13 | The restart plan and tech design are on `main` under `docs/`. Cite them; do not import more of them. |

### Repository facts that shape the work

- No CI exists on `main` (no `.github/`). Every validation command runs
  locally and is named with its result in the PR, as PRs #21–#25 did.
- `playwright.config.ts` serves the production build on `127.0.0.1:4173`
  with three Chromium projects: desktop, Pixel 7 portrait, Pixel 7 landscape
  (915×412). Full suite is currently 39 tests. On this WSL2 host, run
  `npx playwright install chromium` first or set
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
- Unit tests are Vitest in Node (`tests/unit/**/*.test.ts`), no DOM. Anything
  we want unit-tested must be a pure module.
- `vite.config.ts` bakes the git commit and dirty flag into the build;
  `tests/engine-fit.spec.ts` asserts a 40-hex commit. Build from a checkout.
- `ffmpeg` is installed at `/usr/local/bin/ffmpeg`. Node is v24.15 (engines
  require ≥22.12).
- The legacy SFX under `ORIGINAL/audio/sfx/` have **no provenance entry** in
  the legacy `docs/asset_licenses.md`. Restart plan D3 says no legacy asset is
  committed without recorded origin and licence. That rules them out for #19.

### What the current scene already does (and does not do)

From `src/phaser/FitScene.ts`, `BoardInput.ts`, `start.ts`, `style.css`:

| Area | Present on `main` | Gap for #19 |
| -- | -- | -- |
| Audio | None. No `load.audio`, no `this.sound` use, no audio config. | Everything in AC1. |
| Visibility | Scene listens to `visibilitychange` only to reset the frame sampler. Phaser's own `VisibilityHandler` emits `HIDDEN`/`VISIBLE` and `Game.onHidden` calls `TimeStep.pause()`, but **(corrected 2026-10-07)** that only records a pause timestamp: the loop keeps stepping while the browser still delivers animation frames. On a hidden tab the browser stops frames, so the tween freezes; `TimeStep.resume()` calls `resetDelta()`, so there is no catch-up jump on return. | No diagnostics for hidden/visible/blur/focus; no defined behaviour for a move in flight; no test. |
| Pointer state | `BoardInput` tracks pointers in a `Map`, clears on `pointerup`/`pointercancel`/`lostpointercapture`. | A pointer that is down when the page is hidden can survive to resume as a stuck drag. Nothing clears it on `visibilitychange`. |
| Move | Tween-driven (`this.tweens.add`), `moving` flag, controls locked while moving, restart stops the tween. | Behaviour while hidden is implicit (loop paused, so the tween freezes). Needs to be stated, tested and surfaced. |
| Layout | Panel is `position: fixed`, top/left/right use `env(safe-area-inset-*)`; `button, summary` have `min-height: 44px`; select and slider are 44px tall; `body { height: 100dvh }`. | Panel has no `max-height`/scroll. In 915×412 landscape the panel's six control rows plus caption and Measurements likely exceed the viewport and hide the lower controls; only `#fit-restart` is asserted in-viewport today. No `overscroll-behavior`, no `touch-action: manipulation` on controls, no `user-select`/callout suppression. |
| Restart | `SHUTDOWN` removes every scene-owned DOM listener, tween, observer and Phaser listener. | New audio and lifecycle listeners must follow the same pattern. |
| Error handling | Any `FILE_LOAD_ERROR` in `preload` is fatal and shows "Error: Could not load proof asset …". | An audio load or decode failure must be visible but **not** fatal: the board is still useful without sound. |

### Phaser 4.2.1 behaviour we rely on (verified in `node_modules/phaser/src`)

- `WebAudioSoundManager` starts `locked` when `context.state === 'suspended'`
  and installs body listeners for `touchstart`/`touchend`/`mousedown`/
  `mouseup`/`keydown` that call `context.resume()` and emit `unlocked`. So the
  first tap anywhere, including a board pan, unlocks the **context**. That is
  acceptable for AC1 because unlocking is not playback; our rule is that
  `play()` is only ever called from the audio button's click handler.
- `pauseOnBlur` (default `true`): on `BLUR` the manager suspends the context;
  on `FOCUS`, and on every `update()` while the game has focus, it resumes a
  context that is `suspended` or `interrupted` (the iOS state after a call or
  Siri). On `VISIBLE` it also does a `suspend(); resume()` after 100 ms (the
  iOS 17/18 workaround for phaser#6829).
- Sounds are owned by the global manager, not the scene. A scene must stop
  and destroy its own sound instances on `SHUTDOWN`.
- `AudioFile.getAudioURL` uses `canPlayType`; if no URL is playable it logs
  `No audio URLs for "key" can play on this device` and **does not** raise a
  load error. Decode failures call `onProcessError` → load error. So
  "unsupported format" and "decode failed" surface differently; the
  diagnostic must report both.
- `game.device.audio.{mp3, ogg, m4a, opus, wav, webAudio}` are the
  `canPlayType` answers.

## 2. Scope

### In scope (maps to the four acceptance criteria)

1. **AC1 Audio unlock.** One small generated tone, committed with provenance,
   loaded by the scene, played only from an explicit "Play test sound" button.
   Visible states for locked/blocked/unsupported/unavailable/playing/played,
   retry on the same button, no uncaught errors in any path.
2. **AC2 Usable layout.** Portrait, restart, move and audio controls remain
   reachable and ≥44 CSS px in portrait and landscape on phone sizes, with
   safe-area spacing; the panel scrolls instead of hiding controls; canvas
   tracks viewport/browser-chrome changes; page gestures do not fight the
   board.
3. **AC3 Background and resume.** Defined and tested behaviour for hidden →
   visible and blur → focus while idle and while moving; pointer state reset
   on hide; no duplicate callbacks; no audio starts on resume.
4. **AC4 Automated checks + physical checklist.** Browser tests for what
   Chromium can simulate; a written physical-device checklist in
   `docs/qa/issue-19-lifecycle.md` that #20 executes.

### Out of scope (say so in the PR)

- Battle HUD, mute/volume controls, music, a general audio adapter
  (tech design §7.4 is for the battle tranche, issue #10).
- Saves/resume of game state (#11 follow-up).
- Explicit `Phaser.WEBGL` and context-loss recovery (listed for #2 in the
  restart plan §4.2, but not in #19's criteria; leave for #20 to decide).
- Side-docking the panel in landscape (a `fitBoard` change; defer to #10's HUD).
- Any physical-device certification. Emulation is supporting evidence only.
- Deployment. PR #12 stays untouched.

## 3. Design decisions

Decisions below are proposed; the PR records the ones taken.

### D-A. The sound is a generated tone, not legacy SFX

- Restart plan §4.2: "A generated test tone answers the codec question
  without publishing legacy audio." D3 blocks legacy SFX until provenance is
  signed off, and the legacy licence doc has no SFX entries.
- Generate with ffmpeg, record the exact command, ffmpeg version, byte size
  and SHA-256 in the QA note and in a comment next to the asset table in
  `src/diagnostics/proofAssets.ts`. Proposed: 880 Hz sine, 150 ms, 10 ms
  fade in/out, mono, 44.1 kHz, MP3 (the only compressed format the restart
  plan allows, §5.1) as `public/proof/unlock-tone.mp3`.
- Also generate `public/proof/unlock-tone.ogg` from the same source as a
  **decode-only probe** for D1 ("try an Ogg Vorbis file on each iPhone and
  record whether it decodes"). It is never played. Its presence in
  `cache.audio` and `device.audio.ogg` are reported, nothing more. Drop this
  if it costs more than an hour; it is secondary.
- ElevenLabs SFX (`docs/media-gen/sound-fx-api.md`) is not used here: it adds
  rights and budget questions that a diagnostic tone does not need.

### D-B. Audio state lives in a pure reducer

`src/diagnostics/audioState.ts` exports a state type and a pure `reduce`
over events. No Phaser, DOM or browser globals, so Vitest covers it.

States: `unavailable` (no manager, file missing or undecodable),
`locked` (context not running yet), `ready`, `playing`, `played`,
`blocked` (gesture happened but context did not reach `running`, or play
threw/never completed). Events: `loaded`, `loadFailed(reason)`,
`unsupported`, `gesture`, `contextState(state)`, `playStarted`,
`playCompleted`, `playFailed(reason)`, `timeout`, `restart`. Every state
has a user-facing label and a `canRetry` flag; `blocked` always retries.

### D-C. The Phaser/DOM adapter is thin and scene-owned

`src/phaser/ProofAudio.ts` binds `#audio-play`, owns one sound instance, and
publishes diagnostics. On click (the explicit gesture):

1. If the manager is `NoAudioSoundManager` → `unsupported`.
2. If WebAudio: call `context.resume()` synchronously inside the handler,
   await it, read `context.state`. Not `running` → `blocked`.
3. `sound.play()`; listen for `Phaser.Sound.Events.COMPLETE` → `played`.
   Guard with a scene-clock timeout of duration + 1000 ms → `blocked`.
4. Any throw or rejection → `blocked` with the message; never rethrow.

The button stays enabled in `ready`, `played` and `blocked`; disabled in
`playing`, `unavailable`, and while the scene is loading. The status text
is an `aria-live="polite"` span. `SHUTDOWN` stops and destroys the instance,
removes the click listener and resets the UI to the reducer's initial state
(then immediately to `ready` if the context is already running, which it
will be after the first run).

Nothing calls `play()` from `visibilitychange`, `focus`, `unlocked`,
`VISIBLE` or any Phaser event. That is the "no unsolicited playback" rule,
and the lifecycle test asserts it.

### D-D. Audio load failure is visible and non-fatal

`FitScene.preload` currently treats every `FILE_LOAD_ERROR` as fatal.
Change: errors for audio keys route to the audio reducer as `loadFailed`;
errors for image keys stay fatal (keeps `tests/assets.spec.ts` green). If
`cache.audio` lacks the key after load with no error (the `canPlayType`
path), emit `unsupported`. The rest of the scene proceeds to `ready`.

### D-E. Move in flight while hidden: freeze, then continue

**Corrected 2026-10-07.** Phaser 4.2.1 does not pause its loop on `HIDDEN`
(`TimeStep.pause()` only records a timestamp); the tween freezes on a real
hidden tab only because the browser stops animation frames, and Playwright
disables that throttling. So the scene freezes explicitly: on
`Core.Events.HIDDEN` it records `tween.progress` as `moveFrozenAt` and calls
`tween.pause()`; on `VISIBLE` it calls `tween.resume()`. `TimeStep.resume()`
still resets the delta, so there is no jump. Window blur alone does not
freeze. **Defined behaviour:** the move freezes while hidden and completes
exactly once after resume; `#move-status` stays `Moving` throughout;
controls stay locked until completion. Alternatives rejected:
cancel-and-reset (hides the thing #20 needs to observe) and wall-clock
catch-up (forbidden by tech design §5.6).

The scene adds counters to diagnostics so a test and a human can see what
happened: `lifecycle: { hidden, visible, blur, focus, moveFrozenAt, moveCompleted }`.

### D-F. Pointer state is dropped on hide

`bindBoardInput` adds a `document` `visibilitychange` listener: on hidden,
release captures, clear the pointer map, reset `gesture`. Removed in the
cleanup function. The unit test's fake canvas gains a fake `document` so it
can assert the listener count on both. Rationale: a finger down at the
moment of an app switch may never deliver `pointerup`; after resume the
next move would pan without a press.

### D-G. Layout: top-docked panel that scrolls

Keep the current top-docked panel. Add `max-height: calc(100dvh - <top
inset> - 12px)` and `overflow-y: auto`, and in short landscape
(`@media (orientation: landscape) and (max-height: 500px)`) cap it at
`45dvh` so at least half the height stays for the board. Controls below the
fold are reached by scrolling the panel, which is a `fixed` element and so
unaffected by `overscroll-behavior: none` on the page. Group the fixture,
opacity and move rows under a single `<details open>` "Diagnostics" so a
tester can collapse them on a phone; the Measurements `<details>` already
exists. `fitBoard` keeps using `panel.getBoundingClientRect().bottom`, which
now reflects the capped height.

Page-level CSS from tech design §5.7, applied now because they are
one-liners and #20 will otherwise record them as failures: `html, body {
overscroll-behavior: none; }`, `#fit-panel button, #fit-panel select,
#fit-panel summary { touch-action: manipulation; }`, `#game, #fit-panel {
-webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }`.
Phaser config gains `disableContextMenu: true`.

### D-H. Where the "explicit gesture" lives

The button is DOM, in the panel, not a canvas hit area. DOM buttons are
≥44 px, keyboard reachable and announced by screen readers, and they do not
interact with the board's tap-versus-drag logic. Matches the existing
restart/move/fixture controls.

## 4. Work breakdown

Six increments, each a commit, RED-first where there is behaviour to test.
Order matters: 1–3 are independent of layout; 4 is independent of audio;
5 wires the browser tests; 6 is docs.

### Increment 1: tone asset and provenance (`chore`)

- Generate `public/proof/unlock-tone.mp3` and `.ogg` with ffmpeg. Record
  command, version, bytes, SHA-256.
- Add both to `PROOF_ASSETS` with a `kind: 'audio'` discriminator (images
  keep `kind: 'image'`), so `preload` can branch.
- Update `tests/assets.spec.ts` `assetCount` if the diagnostic exposes it
  (currently 4; decide whether audio counts, and keep `objectCount` at 72 —
  sounds are not display objects).

### Increment 2: audio reducer and adapter (`feat`)

- RED: `tests/unit/audioState.test.ts` — initial state; `loaded` → `locked`
  or `ready` depending on context state; `gesture` + `contextState('running')`
  + `playStarted` + `playCompleted` → `played`; `gesture` +
  `contextState('suspended')` → `blocked` with `canRetry`; `playFailed` and
  `timeout` → `blocked`; `loadFailed`/`unsupported` → `unavailable` with no
  retry; `restart` returns to initial; every state has a non-empty label.
- `src/diagnostics/audioState.ts`, then `src/phaser/ProofAudio.ts`.
- `index.html`: `<button id="audio-play">Play test sound</button>` and
  `<span id="audio-status" aria-live="polite">`. `main.ts` `setStatus`
  disables the button while loading, like the move controls.
- `FitScene`: non-fatal audio load path (D-D); create/destroy the adapter;
  publish `audio` diagnostics: `{ manager, locked, contextState, state,
  attempts, playedCount, lastError, device: { mp3, ogg, webAudio },
  cached: { mp3, ogg } }`.

### Increment 3: lifecycle behaviour (`feat`)

- RED: extend `tests/unit/input.test.ts` — the fake `document` receives one
  `visibilitychange` listener; firing it with `hidden` clears captures and
  pointers; cleanup removes it.
- `BoardInput`: D-F.
- `FitScene`: lifecycle counters from `Phaser.Core.Events.HIDDEN/VISIBLE/
  BLUR/FOCUS` on `this.game.events`, removed on `SHUTDOWN`; `moveFrozenAt`
  recorded from the tween's progress at `HIDDEN`; `moveCompleted` increments
  in `onComplete`. No behaviour change to the tween itself (D-E).

### Increment 4: layout and page gestures (`style`)

- `style.css` and `index.html` per D-G. `start.ts`: `disableContextMenu`.
- No unit test; covered by the layout browser test in increment 5.

### Increment 5: browser tests (`test`)

New specs, each with `pageerror` and console-error capture like the
existing ones:

- `tests/audio.spec.ts`
  - After `Ready`, button enabled; click → status reaches `Played`,
    `audio.playedCount === 1`, no errors; click again → 2.
  - Blocked path: `page.addInitScript` stubs
    `AudioContext.prototype.resume` to reject until `window.__allowAudio`
    is set; click → status shows the blocked label, button enabled,
    `audio.state === 'blocked'`, no uncaught error; set the flag, click →
    `played`.
  - Missing file: route-abort `**/proof/unlock-tone.mp3` → `audio.state ===
    'unavailable'`, status text visible, board `Ready`, restart enabled.
  - Restart during playback: start a play, click restart immediately →
    `Ready`, audio status back to `ready`, no error, `playedCount` reset
    for the new run.
  - Headless Chromium starts `AudioContext` in `running` without a gesture,
    so the real autoplay policy is not exercised here. The spec says so in
    a comment; the physical checklist covers it.
- `tests/lifecycle.spec.ts`
  - Helper `setHidden(page, hidden)`: `Object.defineProperty(document,
    'hidden', { get })` + same for `visibilityState`, then dispatch
    `visibilitychange`. Phaser's handler reads `document.hidden`, so this
    drives both Phaser and our listeners.
  - Idle: hide/show ×3 → counters match, frames resume, no errors, no play.
  - Moving: start move, hide at ~500 ms, sample `proof.heroTile` twice
    300 ms apart while hidden → equal; show → `Completed` exactly once
    (MutationObserver in page counts transitions), `moveCompleted === 1`,
    controls restored.
  - Stuck pointer: `mouse.down()` on the board, hide, show, `mouse.move` →
    `board.transform` unchanged; `mouse.up` → `selected` unchanged.
  - Blur/focus: `window.dispatchEvent(new Event('blur'))` then `focus`
    while idle and while playing audio → no error, `playedCount` unchanged.
  - Repeat the moving case after a restart.
- `tests/layout.spec.ts`
  - Viewports: 390×844, 844×390, 360×640, 915×412, 1280×720. For each:
    every `button, select, summary, input[type=range]` in `#fit-panel` has
    a bounding box ≥44 px tall (and ≥44 wide for buttons); each is either
    in viewport or becomes so after `panel.scrollTo`; panel `bottom` ≤ 55%
    of `innerHeight` in the two short-landscape sizes; canvas rect matches
    `innerWidth`/`innerHeight` (existing assertion); `document.documentElement.scrollWidth <= innerWidth`.
  - Safe area: emulate with `page.addStyleTag` overriding
    `env(safe-area-inset-top)` is not possible; instead assert the computed
    `top` of the panel ≥ 12 px and document that notch insets are physical
    checks.
- Existing specs: `engine-fit.spec.ts` restart loop and `assets.spec.ts`
  counts must still pass; update `assetCount` if changed.

### Increment 6: docs and PR (`docs`)

- `docs/qa/issue-19-lifecycle.md`: implemented-from commit, tone
  provenance, decisions D-A…D-H in two lines each, validation commands and
  results, and the **physical-device checklist** for #20 (section 6 below).
- README: a "Proof-scene audio and lifecycle" section after "Diagnostic
  hero move", in the same voice; update the Layout list and the test count.
- PR titled `Verify proof-scene audio unlock and browser lifecycle`, body
  in the PR #24/#25 shape: Change, Validation (every command and result),
  Mobile acceptance. Reference `Related to #19`, not `Closes`, because the
  physical items stay open by design; the maintainer closes #19 when they
  accept that those items are documented for #20.

## 5. Validation gate (run before the PR, name each in the PR)

```sh
npm ci
npm run test:unit -- tests/unit/audioState.test.ts   # RED before increment 2
npm run test:unit -- tests/unit/input.test.ts        # RED before increment 3
npm run test:unit
npm run build                                        # strict tsc + vite build
npx playwright install chromium                      # once, or set PLAYWRIGHT_CHROMIUM_EXECUTABLE
npm test -- tests/audio.spec.ts tests/lifecycle.spec.ts tests/layout.spec.ts
npm test                                             # full suite, all three projects
npm run measure:fit                                  # confirm the tone does not move the idle baseline materially
git diff --check
```

Expected: unit count rises from 17; browser count rises from 39 by the new
specs × 3 projects; the Phaser bundle-size warning remains; `measure:fit`
shows two new small resources (tone MP3/OGG) and no change in
`controlsUsableMs` beyond noise. Record actual numbers, not these
expectations.

## 6. Physical-device checklist handed to #20

These cannot be verified in Chromium emulation and are listed as open in
the QA note. #20 runs them on iPhone Safari, iPhone Chrome, Android Chrome
and desktop, portrait and landscape, and records device/OS/browser/build.

| Check | What to observe | Why emulation is not enough |
| -- | -- | -- |
| First-gesture unlock | Fresh load, no prior tap: press **Play test sound**; tone plays; status `Played` | Headless Chromium starts audio unlocked |
| Pan-first unlock | Fresh load, pan the board first, then press the button; tone plays | Confirms Phaser's body unlock plus our resume path on real policy |
| Silent switch (iPhone) | Switch on: does the tone play? Record either way; do not file as a bug | WebAudio on iOS follows the ringer switch unless `navigator.audioSession.type` is set; a follow-up decision |
| Interrupted state | Start the tone, take a call or invoke Siri, return; press again; plays | iOS `interrupted` context state does not exist on desktop |
| Backgrounded during move | Start move, press Home at ~1 s, wait 10 s, return: hero frozen while away, completes once, `Completed` shown once | OS-level suspension differs from `visibilitychange` |
| Tab discarded | Background for several minutes under memory pressure; return: page may reload; expect `Loading` → `Ready`, no error | Not simulable |
| Browser chrome | Scroll/toolbar collapse in Safari and Chrome: canvas keeps filling the visual viewport; panel controls stay reachable | `dvh`/toolbar behaviour is engine-specific |
| Safe areas | Notch and home-indicator devices in both orientations: no control under the notch or behind the indicator | `env()` resolves to 0 in emulation |
| Page gestures | Double-tap, pinch and long-press on the board and the panel: no page zoom, no text selection, no callout, no pull-to-refresh | Chromium emulation does not reproduce iOS gesture defaults |
| Ogg probe (D1) | Read `audio.device.ogg` and `audio.cached.ogg` from Measurements on each iPhone | Codec support is per OS version |
| Low Power Mode | Off during timing checks; note if it was on | Caps rendering at 30 fps |

## 7. Risks and open points

| Risk | Mitigation |
| -- | -- |
| Headless Chromium has no audio output; `COMPLETE` may still fire on a null sink. If it does not, the `played` path cannot be asserted in CI-like runs | Spike first in increment 2: a one-off Playwright run that plays the tone and waits for `COMPLETE`. If it never fires, assert `playing` + `contextState === 'running'` and move `played` to the physical checklist. |
| Monkeypatching `document.hidden` may not trigger Phaser's handler if it checks a vendor-prefixed property | Phaser's `VisibilityHandler` picks `document.hidden` when defined; verified. Keep the helper in one place. |
| `onGameVisible`'s 100 ms `suspend(); resume()` could glitch a tone playing at resume | Accept; the tone is 150 ms and diagnostic. Note in QA. |
| Panel `max-height` changes `panel.getBoundingClientRect().bottom`, which changes `fitBoard` output and the `board.transform` values existing tests read | Tests derive points from the live transform, not constants. Re-run `input.spec.ts` early in increment 4. |
| `assetCount` or `objectCount` assertions in `assets.spec.ts` drift | Decide in increment 1 whether `assetCount` includes audio; keep `objectCount` 72. |
| Scope creep toward a real audio adapter or mute control | Out-of-scope list in the PR; the reducer stays diagnostic-only. |
| PR #12 lands first and rewrites README | Our README edit is one new section; rebase is mechanical. |

## 8. Branch and process

```sh
git switch main && git pull --ff-only
git switch -c issue-19-audio-lifecycle
```

One task, one branch, from `origin/main`. Commit per increment with the
repository's `type: subject` style (`chore:`, `feat:`, `style:`, `test:`,
`docs:`). No `Closes #19`. Push, open the PR, post a one-line comment on
#19 linking it. Leave the issue assigned to us until the maintainer closes
it; then move this plan's durable content into the README/QA note and
delete or archive this file.

## 9. Updates

### 2026-10-07: implementation complete, PR open

All six increments are on `issue-19-audio-lifecycle`, one commit each, in
the planned order: `24a5507` chore (tone + catalog), `c76d3a5` feat
(reducer + adapter), `c87ca47` feat (lifecycle), `6a10a13` style (layout),
`9c3fbf2` test (three new specs), then the docs commit that carries this
entry, `docs/qa/issue-19-lifecycle.md`, the README section and two
screenshots under `docs/qa/issue-19/`. The QA note holds the provenance
record, the decision log, the validation results, the measurements and the
physical checklist for #20; this file is only the plan and its corrections.

Deviations from the plan, all recorded in the QA note §2:

- D-E is implemented as an explicit `tween.pause()`/`resume()` on
  `HIDDEN`/`VISIBLE` (see the corrected section above). The plan's "no
  behaviour change to the tween itself" no longer holds.
- D-B gained a `loading` initial state and an `unlocking` state so the
  button is disabled while `context.resume()` is pending.
- D-D also covers decode failures: Phaser 4.2.1 emits no loader event for
  them, so a missing `cache.audio` key after preload reads `Could not
  decode` (or unsupported when `device.audio.mp3` is false).
- D-G caps the panel at `min(70dvh, 100dvh − insets)` in every
  orientation and `45dvh` in short landscape; the disclosure is named
  **Board controls**; `#fit-report` stays selectable.
- `assetCount` keeps counting the four images (`PROOF_IMAGES`); audio is
  reported through `audio.cached` instead. `objectCount` stays 72.
- Headless Chromium creates Phaser's `AudioContext` suspended in some runs
  and running in others, and a Playwright click is trusted input, so the
  `locked → played` path does exercise Chromium's gesture gate. The plan's
  §4 note that headless "starts running without a gesture" was wrong; the
  spec comment and QA note say what is and is not exercised.
- `canvas.ownerDocument` carries the visibility listener (D-F), so
  `bindBoardInput`'s signature is unchanged.
- The scratch check with console warnings enabled showed two pre-existing
  Phaser/GL warnings (`Mask.setMask` in WebGL, `GPU stall due to
  ReadPixels`). Not errors, not in scope; noted for the maintainer.

Validation as run (details and numbers in the QA note §4–5): unit 29
passed (RED first for the reducer and the hidden-pointer test); build
passed; focused specs 8 + 16 + 6 passed; full suite 81 passed; `git diff
--check` clean; `measure:fit` run on this WSL2 host for both `origin/main`
and the branch under identical conditions.

Handover: nothing is left to implement for #19's four criteria in
emulation. Remaining work is review of the PR, then #20's physical
checklist (QA note §6). If review asks for changes, branch state is clean
at the docs commit; re-run `npm run build && npm test` after any change to
`src/`, `index.html` or `tests/`. Do not add `Closes #19`. When the
maintainer closes #19, fold QA note §3 into the README if it is still
accurate and delete this file.

### 2026-10-07: media-generation references audited

The five documents under `docs/media-gen/` came from another project and
were rebound to this repository on this branch:
a new `docs/media-gen/README.md` carries the shared rules (keys only in
`.env`, pre-build only, `tmp/` scratch, MP3-only compressed audio, the D3
provenance gate with `docs/qa/issue-16-assets.md` as the record format);
dead links to the other project's ADRs, manifests and "autonomous
acceptance suite" are gone; `tmp/` is now ignored; the README's claim that
no `.env.example` exists was corrected. Provider facts re-checked: ElevenLabs
`sound-generation` is unchanged (model `eleven_text_to_sound_v2`, 0.5–30 s);
MusicAPI.ai's live `mv` enum is `sonic-v6`/`-wild`/`-mini` (older ids map to
v6 since 2026-09-09), create costs 20 credits, and a new approximate
`duration` field exists, so `.env.example`'s `sonic-v6` default is valid.

Effect on this plan: none of its decisions change. D-A stands: the unlock
tone is an ffmpeg-generated file, and no media service is used by #19.
Text-to-speech is out of scope for the first slice; the twelve-cue table in
tech design §7.4 and the one optional music track are the only future
consumers of these references, and both sit behind D3.
