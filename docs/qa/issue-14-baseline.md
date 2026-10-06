# Issue #14: empty proof-scene baseline

## Build and conditions

- Measured implementation commit: `eea4b799995a0970375d187eea38d9f9c9efe05f`; clean checkout at build and capture. Raw results and build-file SHA-256 hashes: [issue-14-baseline.json](issue-14-baseline.json).
- Host: macOS 26.6.2, Intel(R) Core(TM) i5-10600 CPU @ 3.30GHz, x64; Node v26.4.0.
- Browser: installed Chrome 154.0.8037.98, headless through Playwright. Desktop viewport 1280×720, DPR 1; Pixel 7 emulation 412×839 portrait and 915×412 landscape, DPR 2.625. These profiles are not physical Android or iPhone evidence.
- Network: `http://127.0.0.1:4174`, production build served by Vite preview; unthrottled loopback HTTP, no TLS. HTTP content compression is negotiated by preview. Build files total 1,382,861 bytes before transfer compression; the Phaser chunk remains about 1.38 MB raw / 358 kB gzip.
- Three independent contexts per profile. Each context navigates once (cold browser cache), then reloads once (warm browser cache). No routing/interception or network throttling. Host/OS disk caches are not flushed. Warm responses in this run report 300 bytes per resource and zero encoded body bytes on cached assets, consistent with cache revalidation rather than another body transfer.
- Capture after at least 120 visible scene-update intervals. Statistics use nearest-rank p50/p95 of active intervals after controls are usable. Sampling is bounded to the first 600 intervals per scene run and excludes hidden-tab gaps. This shell is idle; there is no board, animation or combat workload yet.

## Results

The table gives medians across the three repetitions for each profile/cache pair. Timings are milliseconds from navigation start. Frame columns are medians of the per-run p50/p95 values; raw JSON contains individual values and timestamps.

| Profile | Cache | Transferred bytes | Scene/assets ready ms | Controls usable ms | Frame p50 ms | Frame p95 ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| desktop | cold | 360,339 | 188.1 | 197.5 | 16.7 | 18.4 |
| desktop | warm | 1,500 | 101.9 | 118.0 | 16.6 | 18.3 |
| mobile-portrait | cold | 360,339 | 173.9 | 183.7 | 16.7 | 18.3 |
| mobile-portrait | warm | 1,500 | 104.3 | 116.5 | 16.7 | 18.5 |
| mobile-landscape | cold | 360,339 | 183.3 | 193.7 | 16.7 | 18.5 |
| mobile-landscape | warm | 1,500 | 103.8 | 116.4 | 16.7 | 18.1 |

All 18 captures had zero console/page errors. Scene/assets-ready is recorded at scene creation (no external assets yet); controls-usable is recorded after the first rendered frame and enables the restart button. They are independent milestones, and neither loading nor a partially created scene is counted as usable.

## Verification

- RED: `npm run test:unit` failed because the measurement implementation did not exist; the desktop proof-controls test failed because the placeholder had no restart control.
- GREEN: `npm run test:unit` — 3 passed.
- `npm run typecheck` and `npm run build` — passed; the existing Phaser bundle-size warning remains.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test` — 12 passed with configured serial workers. Coverage includes existing boot/resize smoke checks, six consecutive scene runs in each profile, one canvas, correct size after each resize, one controls-ready mark per run, measurement snapshots, visible loading and controlled engine-load failure.
- An initial run with six parallel headless workers had four boot/readiness timeouts; all checks passed sequentially. The suite now serializes Phaser renderers to avoid host GPU contention; this is not evidence of mobile runtime performance.
- `git diff --check` — passed.
- Production baseline collector — 18 cold/warm samples; source/build identity assertions and zero-error assertions passed.
- Restart screenshot visually checked; the diagnostic controls remain visible and the empty scene fits the resized viewport.

## Reproduce

```sh
npm ci
npm run test:unit
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run measure:fit
```

A compatible Playwright-installed Chromium can be used without the executable override. Build before collecting; run with other browser workloads stopped. The collector owns preview port 4174 and writes to `test-results/fit-baseline.json` by default. Use `npm run measure:fit -- /absolute/path/results.json` to choose another destination. On-page **Measurements → Refresh measurements** captures the current run interactively.

## Remaining proof-of-fit work

This verifies issue #14's empty-scene shell and measurement setup. It does not certify deployed loading, real mobile hardware, audio policy, gestures, suspend/resume or gameplay. Issue #20 must repeat measurements on the approved beta release and physical devices, compare to this baseline, and document agreed numerical budgets. Parent #2 stays open until its original acceptance gates are verified.
