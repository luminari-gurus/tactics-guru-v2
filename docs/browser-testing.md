# Reproducible browser setup and focused diagnosis

Use Node 24 LTS (package minimum: 22.12.0). From a clean checkout:

```sh
npm ci
npm run setup:browsers                 # macOS / Windows; Linux with dependencies already installed
# Linux hosts with permission to install OS packages:
npm run setup:browsers:linux
npm run check:browsers
npm run build
npm run test:browser-smoke
```

The setup commands invoke the locally installed, lockfile-compatible Playwright CLI.
Do not install an unrelated latest global CLI. Repeat installation after lockfile
updates. Linux setup uses Playwright's `--with-deps` installer; it needs package
manager privileges and access to OS package repositories and Playwright download
hosts. Invalid/truncated ZIP downloads are setup failures, not test failures.
An unprivileged runner needs a pre-provisioned environment; the CI job installs
browser binaries but does not install privileged OS packages;
do not disable package-manager security or treat missing libraries as test skips.
See [Playwright browsers](https://playwright.dev/docs/browsers).

`check:browsers` independently launches Chromium and WebKit, renders a page, and
writes a unique ignored `verification-receipts/browser-environment/run-*/environment.json`.
It records the commit, Node/Playwright/OS versions, resolved executable paths,
actual launched browser versions and launch failures. A failed engine makes the
command fail. This is only environment qualification; the two-engine smoke test
also boots Phaser and checks viewport resizing. Production smoke tests require a
successful build; do not use an old `dist/` after validation fails.

Chromium projects select `channel: 'chromium'` (full Chromium), matching PR #198's
BFCache setup. Do not use `--only-shell`: the cached-history tests require actual
BFCache returns. The explicit `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/absolute/path/to/chrome`
override remains supported and is recorded by preflight. Set the same override
for preflight and the test command. WebKit keeps its own engine and launch options;
never substitute a Chromium binary for WebKit. Existing BFCache assertions and
native-select tests are unchanged; native-select repair belongs to #190.

## Proof audio functional setup

`tests/audio.spec.ts` qualifies graphics once in each actual Playwright browser
worker, before opening the test's isolated app context. The bounded setup creates
WebGL (or Canvas 2D fallback), renders and reads back a known pixel, and fails the
worker if setup exceeds 15 seconds or the pixel is wrong. Setup failures remain
failures; no case retry, skip or assertion-timeout relaxation is added.

Each worker writes a graphics setup receipt under its configured output directory's
`graphics-setup/`, alongside the existing retained browser artifacts. The receipt
records browser version, project, setup time and outcome. This avoids conflating
first-context initialization with the suite's audio behavior assertions. It warms
graphics state in that browser, so these cases are not cold GPU/driver startup
measurements. Stage wall time still includes setup. Cold app-cache performance
captures and their budgets remain separate and unchanged; no performance speedup
or cold GPU acceptance follows from these functional results.

A failed initial test also attaches scene marks, resource timings, portrait state
and a live diagnostics snapshot. It does not change startup, gameplay or rendering.

## Bounded diagnostics

```sh
# Run one focused test with durable receipts:
npm run test:browser -- tests/boot.spec.ts --project=desktop -g 'boots a Phaser scene'
# Only for a focused failure reproduction:
npm run test:browser -- tests/boot.spec.ts --project=desktop -g 'boots a Phaser scene' --diagnostics
```

Each invocation gets a unique directory under `verification-receipts/browser-runs/` with
`results.json` and per-test `artifacts/`. A subsequent run cannot erase those
receipts. This root is outside Playwright's disposable `test-results/`, so ordinary
`npm test` and direct Playwright runs do not clear it. Retain or prune receipts
explicitly after review; unique paths do not protect them from checkout cleanup
or manual deletion on persistent runners. The wrapper preserves failure exit codes, forces zero retries, and
leaves tracing off by default. `--diagnostics` enables `retain-on-failure` for
that focused run: successful traces are discarded, failed traces remain.
Trace collection still adds overhead while the test runs; traced runs are not
performance baselines. Open a retained trace with `npx --no-install playwright
show-trace <trace.zip>`. Do not publish raw traces without inspecting their contents.
The wrapper owns output/reporter/trace/retry CLI flags; use the direct Playwright
CLI for other custom reporting workflows. `npm test` now runs only its selected cases; use `npm run test:fixtures` for the explicit dev fixtures from #202.

## Compare an isolated failure against the exact base

1. Record the failing commit, its base SHA, config, test title, project, server
   mode/base path, executable override, untraced JSON and environment receipt.
   Resolve the base once (for example `git merge-base HEAD origin/main`) and retain
   the literal SHA; do not compare against a moving branch name later.
2. Create a separate worktree at that SHA with `git worktree add ../tg-base <SHA>`.
   Run `npm ci`, install the matching browsers and build there. Use the same host,
   Node version, viewport, server mode and browser override as the candidate.
3. Run only the failing case in each worktree, sequentially (both use port 4173).
   For a base that predates this wrapper, use the direct CLI with explicit unique
   paths, for example:

   ```sh
   PLAYWRIGHT_JSON_OUTPUT_FILE=verification-receipts/base-case/results.json npx --no-install playwright test tests/boot.spec.ts --project=desktop -g 'boots a Phaser scene' --retries=0 --trace=off --reporter=list,json --output=verification-receipts/base-case/artifacts
   ```

4. Keep the original failure. If needed, repeat only that case with
   `--trace=retain-on-failure` and a different output directory. Compare the same
   assertion, not merely exit codes. A base failure is evidence, not permission
   to skip or relax the test. If the failure is environmental, fix the runner and
   repeat the focused comparison before expanding the run.

## CI and resuming #200

Brian provisions the self-hosted runner. Register it with the default `self-hosted`
label and the custom `tactics-browser` label. OS/architecture are intentionally
not fixed until the host is selected; use a Playwright-supported platform.
Provide Node 24 and install OS browser libraries during provisioning (Linux:
`npm ci && npm run setup:browsers:linux`). Install browser binaries as the runner
service account so its browser cache is accessible.

`.github/workflows/browser-setup.yml` targets `[self-hosted, tactics-browser]`
with no GitHub-hosted fallback. Each run uses `npm ci` and installs the
lockfile-matching browser binaries, reusing the persistent download cache.
The workflow does not invoke privileged OS package installation per job.
It checks launch metadata, diagnostics, builds, then runs both engine smoke cases.
Receipts are retained for seven days with unique run/attempt names.

Initially the workflow is manual (`workflow_dispatch`, available after the workflow
exists on the default branch). Dispatch only a reviewed, trusted ref: this is a
public repository and automatic fork PR execution must not reach the persistent
self-hosted machine. Automatic PR routing and isolated workers belong to #208.
Checkout does not persist repository credentials.

Before the workflow reaches main, qualify the reviewed PR revision directly on
the provisioned host under the runner service account. Use a separate clean
worktree at the literal reviewed SHA, then run the same steps as the workflow:

```sh
npm ci
npm run setup:browsers
npm run check:browsers
node --test tests/tooling/browser-diagnostics.test.mjs
npm run build
npm run test:browser-smoke -- --diagnostics
```

Stop and fix a failed prerequisite before running its dependent checks. Retain
command logs and `verification-receipts/`, including any failed preflight. The
diagnostics contract must verify that ordinary Playwright cleanup removes its
sentinel while preserving the environment/JSON/failure-trace hashes. A successful
smoke report must contain both setup projects with zero retries or skips. This
direct qualification does not require merging the PR or adding an automatic
trigger to the persistent runner.

The `tactics-browser-exclusive` concurrency group serializes browser jobs across
refs. Reuse that exact group in future timing workflows on this repository, and
keep unrelated host workloads idle during measurement. A single host starts with
one browser job; extra runner registrations on it do not create independent GPUs.
Do not assume 3–4 shards until #208 establishes actual isolated capacity.

Re-run qualification on the self-hosted machine before collecting #200's baseline.
The previous hosted CI smoke results remain historical setup evidence; they do
not qualify the new host. Record host CPU/RAM, OS/architecture, Node/browser
versions, cache state and background load with the new baseline. Keep queue and
setup duration separate from test execution. Establish workspace/cache cleanup
and disk limits as part of runner provisioning.

After setup smoke passes on the runner that will measure #200, apply these setup
changes to the #200 branch and run its timing command on that same runner. Its
preflight must use the same full-Chromium channel as the test configuration.
Keep environment receipts alongside the timing report. Passing CI smoke alone
does not establish a complete timing baseline or repair unrelated content/unit
failures. Do not widen timeouts or change workers merely to label the baseline green.

## Qualified runner and timing integration (2026-10-22)

PR #210 is merged. `unraid-tactics-01` passed setup, diagnostics retention,
Chromium/WebKit preflight and both Phaser smoke cases in
[run 39717745142](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39717745142).
This clears the provisioning blocker; it is not a full regression or timing baseline.
PR #209's manual timing workflow uses `[self-hosted, tactics-browser]`,
`tactics-browser-exclusive`, the same service-account cache, and no privileged
OS installation or hosted fallback. See [timing qualification/capture](verification-timings.md).
