# Verification timing baselines

Issue #200, part of epic #199. This is measurement tooling, not a new test-selection
policy. Existing build/test commands, assertions, projects, workers and retries are
unchanged. The caller approved this implementation plan on 2026-10-21.

## Capture

Install locked dependencies with `npm ci` and compatible browsers with
`npx playwright install chromium webkit` (plus the platform's browser libraries).
Run from a Git checkout with Node >=22.12. Stop other browser tests, profiling and
game-performance captures first. This runner prevents another timing capture in
the same checkout; it cannot detect workloads in other checkouts or applications.

```sh
npm run measure:verification -- --conditions "idle host; dependencies installed; first run after checkout"
```

The default capture runs these stages sequentially:

| Stage | Existing work measured |
| --- | --- |
| `content` | The seven `validate:content` Vitest files |
| `typecheck-app` | `tsc --noEmit` |
| `typecheck-domain` | `tsc --noEmit -p tsconfig.domain.json` |
| `bundle` | `vite build`, after all three build prerequisites pass |
| `unit` | Complete configured Vitest suite, including its build-output checks |
| `chromium` | Default Playwright production-preview matrix |
| `encounters` | Encounter dev fixture matrix |
| `items` | Run-item dev fixture matrix |
| `webkit` | `playwright.device-acceptance.config.ts` |
| `telemetry` | Configured telemetry matrix, including its separate instrumented build |

The first four stages represent the existing build chain, with separate process
timings. They omit npm wrapper overhead, so their sum is not a direct measurement
of `npm run build`. Browser suites are invoked directly to avoid accidentally
executing npm's posttest twice. Unlike the existing lifecycle hook, independent
stages still run after a test failure so the report exposes all stage results.
Preview stages are blocked when their build prerequisites fail; stale dist output
is never counted as a valid baseline. Telemetry owns its separate configured build.

The baseline is specifically this named matrix, not every possible acceptance
configuration: exploration/health-bar WebKit matrices, dev-only placement probes,
prefixed builds and game-performance collectors are not silently added. Record
additional task-specific checks separately. `--stages` selects a subset and
automatically includes build prerequisites for preview suites:

```sh
npm run measure:verification -- --stages content,typecheck-app,typecheck-domain,bundle,unit --out test-results/timings/build-unit --conditions "idle host; warm dependency cache"
```

Use a **new** output directory under `test-results/timings/`. Existing directories
are refused. A stage timeout defaults to one hour; `--timeout-ms` overrides it.
Interrupts terminate the active process group and retain an incomplete receipt.
On Windows termination is best-effort for descendants: check for surviving Vite
servers before a later capture. If forcibly killed, inspect the PID in
`test-results/timings/.capture.lock` before removing a stale lock.

Unset `PLAYWRIGHT_BASE_PATH`, `PLAYWRIGHT_SERVER_MODE` and
`PLAYWRIGHT_TELEMETRY_DEV` for the root production baseline. A compatible installed
Chromium can still be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The runner
records its actual version through a separate preflight, outside stage timings.
Preflight warms browser launch caches; do not call this a cold OS/browser-launch
benchmark. If a browser cannot launch, its stages are blocked rather than emitting
hundreds of meaningless launch failures.

## Reports and interpretation

Each capture saves `report.json`, `summary.md`, individual raw JSON reports/logs,
and isolated Playwright output directories. Receipt fields include source commit,
dirty state, SHA-256 hashes of tracked and nonignored new verification inputs,
Node/OS/CPU/memory, actual browser versions, exact commands, configured workers,
counts, failures/skips/retries and slowest tests/files. Vitest's sidecar also
retains module setup/import/collection diagnostics, distinct observed worker IDs
and peak simultaneous test modules (not a measurement of peak CPU utilization).
An unset configured worker limit remains null. Fields unavailable from a
runner are null, never invented zero values. No `.env` or arbitrary untracked
files are read. The source hash is checked again at completion to detect edits
during a capture; no pass is claimed if inputs changed.

Stage wall time includes process/server startup and teardown. Reporter duration
and summed test durations are separately identified: parallel test duration sums
are work, not elapsed time. Local queue time is null; CI queue time would require
external scheduler data. Dependency/browser installation is a prerequisite and
excluded from these stages. Record it separately when comparing fresh CI hosts.
The telemetry stage includes its internal build/startup; it is not pure browser
test time. Preserve condition notes for filesystem caches, host load and external
browser overrides; the runner does not clear caches or change concurrency.

Exit status is nonzero for any failed/blocked stage, missing/malformed test report,
zero selected tests, timeout, interrupt or changed inputs. Expected failures,
unexpected failures, skips and flaky retry outcomes remain distinct in JSON.
`complete` means all selected stages executed, not that they passed; `passed` is
the separate gate. Partial captures are useful diagnostics, not a full baseline.

## Compare

```sh
npm run measure:verification -- compare test-results/timings/before/report.json test-results/timings/after/report.json
```

Comparison prints per-stage milliseconds/percentage changes and warns on changed
environments, browser versions, source inputs, conditions, counts, selection or
worker settings. Missing/failed/blocked stages do not get a passing speedup.
Changed source is expected for an optimization, but inspect coverage and host
differences before attributing a delta. This command is descriptive, not a
statistical performance gate. Do not repeatedly run the full matrix solely to
obtain a nicer result.

Retain raw logs and JSON with the associated PR/CI artifact for 30 days and
through review, whichever is longer. Keep a compact source-bound summary in
`docs/qa/` for accepted baselines. Large raw artifacts remain in ignored
`test-results/`; archive them to the PR's artifact store before cleaning the
checkout. No upload or retention service is configured by this task.

## Tooling validation

```sh
npm run test:verification-tooling
```

Tests cover nonzero child exits, timeout termination, missing executables,
malformed reports, retries/flaky results, dependency expansion and comparisons
that must not present a failed run as an improvement. The reporting sidecar is
also exercised by real content/unit captures.
