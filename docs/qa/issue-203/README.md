# Issue #203 browser selection evidence

Caller approved `ad1d8d7`'s OpenSpec plan in this conversation on 2026-10-23.
Base main is `958bbd90546e1305aab10e370d5555a1d7c9a43a`. PR #229 (audio)
and #139 (HUD) remained open at implementation start. No production files,
assertion bodies, test titles, timeouts, retries or browser/device descriptors
change. The serial workflow adds only this exact branch to its existing trusted
branch conditions so the approved self-hosted qualification can run.

## Selection proof

Default Chromium discovery changes **693 → 670**. All **23** removed executions
map to retained complete assertions in `coverage-map.json.gz`: nine canonical
resource failure/delay cases lose two mobile duplicates each; five explicit
viewport layout cases lose the equivalent Pixel landscape duplicate each.
Desktop and Pixel layouts remain distinct, with the full five-viewport corpus on
both desktop and mobile portrait. All unclassified cases retain their projects.

`selection-before.json.gz` and `selection-after.json.gz` retain all 15 default,
special-config and mode discoveries, stable IDs, tags and effective project use
settings. Fixture, placement-dev, WebKit, health-bar, telemetry, asset-mode and
compatibility entry point sets are unchanged. Layout mappings contain the full
equivalent effective device configuration, including DPR, touch, mobile, UA,
engine, screen and viewport. WebKit selections remain 52 acceptance + 57
exploration; health-bar selection remains 25. Fixtures remain 57.

`npm run test:verification-batches` executes real discoveries and checks exact
mappings, negative omissions/extras/duplicates, wrong filters, altered device
settings, timeout drift and unchanged assertion bodies against literal base.
It also proves the nine existing serial batches exactly partition all 670 IDs.
No rebalancing or changes to historical #200 receipts were needed.

## Matched local timing

One sample each, same macOS arm64 host, Node 26.11.0, Playwright 1.63.0,
Chromium 153.0.8010.12 and production build (see `build-files.json`).
One worker, zero retries. Both engine launch and actual Phaser boot/resize
qualification passed before measurement. Browser executables and OS are in
`browser-environment.json`. These are browser/device emulations. OS cache and
unrelated background load were not independently controlled; this is not a
cold-cache, physical-device or isolated GPU performance certification.
No other browser suite was run concurrently with these samples.

- Before: **42/42 passed**, 12.949s runner wall, 11.183s summed test durations.
- After: **19/19 passed**, 6.935s runner wall, 5.618s summed test durations.
- Runner wall reduction: **46.4% for this affected group**, not for the whole suite.
- Overall default test-count reduction: **3.3%**. No epic-wide speed target is claimed.

`timings.json` retains every case/profile, result, retry count, duration and
first-test delay. Compressed raw timing reports retain exact commands and
start/end metadata. The difference between wall and summed case durations includes
server/worker/reporting costs; first-test delay is recorded, not represented as
pure server setup time. Both measurements served the same build before the
subsequent validation build; its emitted file hashes are retained separately.

```sh
npm run build
npm run check:browsers
npm run test:browser-smoke
npx --no-install playwright test tests/assets.spec.ts tests/boot.spec.ts tests/engine-fit.spec.ts tests/layout.spec.ts -g 'failed canonical|a proof image|a proof asset|missing engine chunk|shows loading before|shell initially displays|controls stay' --reporter=json
node scripts/verification-selection.mjs capture tmp/selection.json
node scripts/verification-selection.mjs compare tmp/before.json tmp/after.json tmp/coverage-map.json
npm run test:verification-batches
npm run test:verification
npm run test:verification-tooling
npm run typecheck
npm run build
```

Local CPU validation: **27 batching/selection contracts passed**, **10 full-runner
contracts passed**, **17 timing/process/reporter contracts passed with three
platform-specific skips**. Both TypeScript scopes and production build (221
content checks) passed. The existing large-bundle warning remains. Exact logs and
source-bound self-hosted qualification results will be added before acceptance.
The initial discovery command referred to a nonexistent compatibility config;
it failed before browser execution, was corrected to the actual repo filenames,
and the complete 15-mode capture then passed. No application failure or coverage
was hidden by that tooling correction.

## Remaining qualification

Full final default coverage will run through the existing serial self-hosted
workflow on `unraid-tactics-01`, one worker/job, max-parallel 1 and the shared
`tactics-browser-exclusive` lock, with no GitHub-hosted fallback. Preserve all
failures and incomplete runs. Special-mode evidence reuse requires source-bound
consumer comparison and original reports; discovery equality alone is not runtime
acceptance. The prior #200 full capture remains failed, irrespective of this PR.
