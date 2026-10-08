# Tactics Guru v2

Minimal Phaser 4 + TypeScript + Vite browser-project scaffold. The only scene is a restartable proof-of-fit diagnostic with a fixed elevated isometric board, loading/error status and timing diagnostics; gameplay, legacy assets, saves, and deployment are not implemented. The original Godot project is untouched. Design plans are maintained outside this repository.

## Requirements

Node.js **22.12 or newer** (prefer a supported LTS release) and npm. Dependencies are pinned and `package-lock.json` is tracked.

## Development

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Development and preview bind to localhost by default; pass `-- --host 0.0.0.0` only when intentionally testing on a trusted LAN.

```sh
npm run typecheck
npm run build
npm run preview
```

`dist/` is generated static output, not committed. Vite currently warns about the single Phaser bundle size; production load-time optimization requires later measurement and is not claimed by this scaffold.

## Browser smoke tests

```sh
npx playwright install chromium
npm run build
npm test
```

Tests serve the production build, verify boot, repeated restart, loading/error states and timing markers without console/page errors, check desktop/mobile-emulated viewport resizing in both orientations, and cover the proof board, assets, input, hero move, audio unlock, hidden/visible lifecycle and panel layout (90 checks across the three projects). Phaser browser tests run serially to avoid contention between headless renderers on the host GPU. They do not certify real iPhone Safari/Chrome or Android hardware behavior.

If browser downloads are unavailable, an existing compatible Chromium can be selected explicitly:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/absolute/path/to/chrome npm test
```

## Layout

- `src/main.ts`: diagnostic shell, status and controls
- `src/phaser/{start,FitScene,BoardRenderer}.ts`: Phaser game, proof scene and shape-based tile renderer
- `src/phaser/{BoardInput,ProofAudio}.ts`: scene-owned pointer/wheel input and the unlock-tone adapter
- `src/diagnostics/audioState.ts`: pure audio state reducer (no Phaser or DOM), unit-tested
- `src/geometry/iso.ts`: pure projection, joined tile faces, stable depth order and viewport fitting
- `src/diagnostics/boardFixture.ts`: immutable authored 4×4 fixture with elevations 0, 1 and 2
- `src/diagnostics/`: navigation-relative timings, transfer sizes and bounded active frame sampling
- `src/style.css`: full-viewport canvas container, capped scrolling panel, page-gesture rules
- `public/proof/`: the four proof images as originals, the display-size exports the scene loads (`tree-grass-v1-480.webp`, `fighter-portrait-96.webp`) plus the `grass-material-v1-348.png` test fixture (rule and record in [issue #35 QA](docs/qa/issue-35-proof-asset-export.md)), and the generated unlock tone (MP3 played, OGG decode probe)
- `tests/*.spec.ts`: production-browser checks for boot/resize, proof scene, board, assets, input, move, audio, lifecycle and layout
- `tests/unit/`: Node-only unit tests, including measurement reset, visibility behavior, input cleanup and the audio reducer
- `playwright.config.ts`: desktop and mobile-emulated test projects

`.gitignore` excludes dependencies, build/test output, logs, local environment files, the `tmp/` scratch directory, TypeScript caches and editor/OS files. Lockfiles and source/assets remain tracked. `.env.example` lists optional media-generation API keys for hand-run asset tooling (see `docs/media-gen/`); nothing in the game, build or tests reads them, and no environment configuration or secrets are required.

## Proof-scene measurements

Open **Measurements** and use **Refresh measurements** for a JSON snapshot, or call `window.fitDiagnostics()` in browser developer tools. Timings are milliseconds relative to navigation start (`0`); `fit:scene-start`, `fit:scene-ready` and `fit:controls-usable` are Performance API marks for the current scene run. Scene-ready means scene creation and asset loading have completed (there are no external assets yet); controls-usable follows the first rendered frame and enables restart. Restart clears the old marks and sample, while timestamps stay relative to the same navigation. Hidden periods reset the previous-frame timestamp so resume gaps do not inflate frame samples.

Frame statistics use the first 600 active scene-update intervals after controls are usable, with nearest-rank p50/p95. This is an idle-shell baseline, not a GPU benchmark or combat performance result. Resource entries report transferred bytes (including response headers), encoded body bytes and decoded body bytes; zero transfer on same-origin assets can indicate a cache hit. Report cache/network conditions alongside the snapshot.

```sh
npm run test:unit
npm run test:unit -- tests/unit/measurements.test.ts
npm run build
npm run measure:fit
```

The collector starts its own localhost production preview on port 4174, runs three fresh-context cold loads and same-context warm reloads for desktop and both mobile-emulated orientations, then writes `test-results/fit-baseline.json`. An optional output path follows `npm run measure:fit -- /absolute/path/result.json`. To measure a deployed origin instead, add `--url` (or set `FIT_URL`): `npm run measure:fit -- /absolute/path/result.json --url https://tactics-guru-v2.pages.dev`; no preview is started, `buildFiles` is `null`, and `measuredBuild` records the commit baked into the served bundle. In local mode the collector refuses a `dist` built from a commit other than the checked-out source. Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE` as above if using installed Chrome. Do not run other browser workloads during measurement. The JSON includes source/build commit and dirty state, browser version, network/cache method, exact build-file sizes/SHA-256 hashes, and all samples. A normal build requires the Git checkout to capture its source identity.

Local preview uses loopback HTTP and negotiates HTTP content compression; actual beta compression, network latency, physical devices and gameplay workload require later evidence in #20 and #11. See [the initial baseline](docs/qa/issue-14-baseline.md) and [the deployed measurements and physical-device gate for #20](docs/qa/issue-20-fit-gate.md), which proposes budgets; none is asserted by code.

## Diagnostic board

The board uses generated filled polygons, with named 80×40 tile dimensions, 24-pixel elevation steps and a common 12-pixel base. Complete columns draw back to front by grid depth (`x + y`), then by `y` and `x` for deterministic ties; elevation shifts the top surface instead of changing this order. The immutable elevation table is a diagnostic fixture, not gameplay content or a procedural map.

Resize fits every top and side face below the current diagnostics panel with a 16-pixel margin. The Measurements snapshot includes tile count, elevation levels, scale and rendered board bounds. The proof board includes diagnostic selection, camera gestures, authored art fixtures and one scripted hero move. See [issue #15 visual QA](docs/qa/issue-15-board.md).

## Proof board input

Tap/click a solid tile to select its visible top or side face. Picking uses the same back-to-front column order as rendering; trees and characters pass input through to the visible board beneath them (canopy pixels outside the board select nothing). A yellow outline marks the selected top surface. Selection is diagnostic state only.

Drag with the primary mouse button or one finger to pan; wheel or pinch to zoom between the fitted size and four times that size. Pan is clamped so the board remains reachable at the center of the area below the panel. A six scene-pixel movement begins a drag; drag, cancellation, and pinch release never select. Resize refits the view while retaining zoom and selection. Coordinates use the canvas CSS rectangle rather than device pixels. Scene shutdown removes all six canvas input listeners and releases pointer captures.

Issue 17 validation includes pure elevated-face picking, inverse transforms and view bounds, listener cleanup, and Chromium interactions across desktop/mobile DPR and portrait/landscape. Physical iPhone Safari/Chrome and Android touch hardware remain unverified.

## Diagnostic hero move

Choose **Raised tile (2, 2)** in **Move destination** to preview its yellow outline, then press **Start diagnostic move**. The two-second authored path starts at (0, 0), passes through (1, 0), (1, 1) and (2, 1), and ends at elevation 2 on (2, 2). The tree uses the raised fixture at (1, 1). Hero feet use the shared tile projection throughout; depth ordering and tree opacity update each frame as the hero crosses the canopy.

The controls report Idle, Moving and Completed. Move/destination/fixture controls lock during animation, then restore; pan, zoom, tile selection and tree opacity remain available. Restart cancels the scene-owned tween and returns to the ground-behind fixture. This is a rendering/input diagnostic, without pathfinding or battle rules. `tests/move.spec.ts` exercises the controls, repeated starts and restarts, fractional elevation, projection and canopy depth/opacity in desktop and mobile emulation. Physical devices remain unverified.

## Proof-scene audio and lifecycle

**Play test sound** plays a generated 880 Hz, 150 ms tone (`public/proof/unlock-tone.mp3`; generation record in [issue #19 QA](docs/qa/issue-19-lifecycle.md)). The button is the only code path that starts playback: it resumes the WebAudio context inside the click, plays the tone once and waits for Phaser's completion event. The status beside it reports Loading, Locked, Ready, Unlocking, Playing, Played, Blocked or Unavailable, and follows the audio context between presses: Phaser's own gesture unlock reads Ready, and a context suspended while the window is blurred reads Locked. Blocked means the gesture happened but the context did not reach `running` or did not resume within 2 s, playback was refused or threw, or completion never arrived; the button stays enabled so the tester can retry. Unavailable means the file did not load or decode, or the device has no audio; the board stays usable. The tone and a same-source OGG decode-only probe load in their own loader pass after the board is created, each with a 5 s request timeout, so the board and Restart never wait on audio and the control reads Loading until that pass settles. The `audio` block in Measurements records the manager, lock state, context state, attempts, completed plays, the last error, the device's codec answers and which files are cached, reading the context and cache state when the snapshot is taken.

While the page is hidden, a move in flight freezes at its current progress and resumes when the page is visible again, completing exactly once; `#move-status` stays Moving throughout and the locked controls stay locked. Window blur alone does not freeze the move. Pointers that are down when the page is hidden are dropped, so returning to the page cannot pan without a new press. Hidden, visible, blur and focus events are counted per scene run in the `lifecycle` block, with the tween progress at the last freeze and the number of completions. Nothing starts audio on visibility, focus or unlock events.

The diagnostics panel is capped at 70% of the viewport height (45% in landscape under 500 px tall) and scrolls instead of hiding controls; **Board controls** collapses the fixture, opacity, move and audio rows. Every panel control is at least 44 CSS px tall. The page suppresses overscroll, selection and long-press callouts over the board and panel (the measurements JSON stays selectable), and the canvas has no context menu. `tests/audio.spec.ts`, `tests/lifecycle.spec.ts` and `tests/layout.spec.ts` cover these in Chromium emulation; safe-area insets, the iOS autoplay rules, OS-level suspension, browser-chrome changes and real touch gestures are physical checks listed for #20 in the QA note.
