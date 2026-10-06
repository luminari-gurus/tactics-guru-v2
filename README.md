# Tactics Guru v2

Minimal Phaser 4 + TypeScript + Vite browser-project scaffold. The only scene is a responsive startup placeholder; gameplay, legacy assets, saves, and deployment are not implemented. The original Godot project is untouched. Design plans are maintained outside this repository.

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

Tests serve the production build, verify boot, repeated restart, loading/error states and timing markers without console/page errors, and check desktop/mobile-emulated viewport resizing in both orientations. Phaser browser tests run serially to avoid contention between headless renderers on the host GPU. They do not certify real iPhone Safari/Chrome or Android hardware behavior.

If browser downloads are unavailable, an existing compatible Chromium can be selected explicitly:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/absolute/path/to/chrome npm test
```

## Layout

- `src/main.ts`: diagnostic shell, status and controls
- `src/phaser/{start,FitScene}.ts`: Phaser game and restartable proof scene
- `src/diagnostics/`: navigation-relative timings, transfer sizes and bounded active frame sampling
- `src/style.css`: full-viewport canvas container
- `tests/{boot,engine-fit}.spec.ts`: production-browser boot/resize and proof-scene checks
- `tests/unit/`: Node-only unit tests, including measurement reset and visibility behavior
- `playwright.config.ts`: desktop and mobile-emulated test projects

`.gitignore` excludes dependencies, build/test output, logs, local environment files, TypeScript caches and editor/OS files. Lockfiles and source/assets remain tracked; `.env.example` is allowed if needed later. No environment configuration or secrets are required.

## Proof-scene measurements

Open **Measurements** and use **Refresh measurements** for a JSON snapshot, or call `window.fitDiagnostics()` in browser developer tools. Timings are milliseconds relative to navigation start (`0`); `fit:scene-start`, `fit:scene-ready` and `fit:controls-usable` are Performance API marks for the current scene run. Scene-ready means scene creation and asset loading have completed (there are no external assets yet); controls-usable follows the first rendered frame and enables restart. Restart clears the old marks and sample, while timestamps stay relative to the same navigation. Hidden periods reset the previous-frame timestamp so resume gaps do not inflate frame samples.

Frame statistics use the first 600 active scene-update intervals after controls are usable, with nearest-rank p50/p95. This is an idle-shell baseline, not a GPU benchmark or combat performance result. Resource entries report transferred bytes (including response headers), encoded body bytes and decoded body bytes; zero transfer on same-origin assets can indicate a cache hit. Report cache/network conditions alongside the snapshot.

```sh
npm run test:unit
npm run test:unit -- tests/unit/measurements.test.ts
npm run build
npm run measure:fit
```

The collector starts its own localhost production preview on port 4174, runs three fresh-context cold loads and same-context warm reloads for desktop and both mobile-emulated orientations, then writes `test-results/fit-baseline.json`. An optional output path follows `npm run measure:fit -- /absolute/path/result.json`. Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE` as above if using installed Chrome. Do not run other browser workloads during measurement. The JSON includes source/build commit and dirty state, browser version, network/cache method, exact build-file sizes/SHA-256 hashes, and all samples. A normal build requires the Git checkout to capture its source identity.

Local preview is uncompressed loopback HTTP; actual beta compression, network latency, physical devices and gameplay workload require later evidence in #20 and #11. See [the initial baseline](docs/qa/issue-14-baseline.md). No numerical fit budgets are asserted by this scaffold.
