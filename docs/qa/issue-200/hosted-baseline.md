# Interim GitHub-hosted baseline attempt

Explicitly approved by Brian on 2026-10-21; self-hosted migration follows later.
[Workflow run](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39700595665)
/ [raw reports and logs, retained 30 days](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39700595665/artifacts/12396082054).
Source: `73d34dba1620174837cf15a93812d393abe690aa`, based on main `251db945569e3f1ac957caa091e9fa9eec11a034`.

## Disposition

**Failed bounded attempt; not a complete or passing full-regression baseline.**
All 20 selected timing rows were attempted, but Chromium was interrupted and
eight later suites executed zero tests. The report's `complete=true` means all
selected stages were attempted; `coverageComplete=false` in the published summary
makes the missing case coverage explicit. PR #209 remains draft and #200 stays open.

Capture wall time: **81.56 minutes**. Setup before capture: **70.70 seconds**;
job queue delay: **3.00 seconds**. Separate setup includes checkout/Node, locked
install, browser/OS installation and reporter contracts. The 15-minute target was
not met by this attempt. A successful full-matrix duration and code speedup remain
unknown; the historical matrix/host/source is not a comparable passing reference.

## Environment and successful evidence

Ubuntu 24.04 hosted VM, Linux x64, Node 24.21.0, 4 reported CPUs, AMD EPYC 7763,
16,766,410,752 bytes RAM. Vite 8.3.5, Vitest 5.0.3, Playwright 1.63.0.
All three launch preflights passed: full Chromium and headless Chromium
153.0.8010.12, WebKit 26.6. Default headless-shell path was unavailable and remains
null; executable paths/overrides and host data are retained in the JSON.

Fresh ephemeral host; locked packages and browsers installed; npm download cache
may be warm. App caches began fresh; reporter contracts and browser preflight ran
before timing. Browser/performance work was sequential with a lightweight
five-second progress watcher. The source began clean; verification hashes matched
at completion. Final non-input working-tree dirtiness is recorded without claiming
the entire checkout ended clean.

- All **14 timing/reporter contracts** and **10 orchestration contracts** passed.
- All **907 unit/content cases** and **2 real build-integration cases** passed;
  the content subset was 221 cases, included in units without a duplicate run.
- Both compiler scopes and root/prefix/restored-root ordinary bundles passed.
- **36/36 production** and **36/36 development telemetry cases** passed with
  zero failures, skips or retries: **581.34s / 590.08s** respectively.

## Failure findings and follow-up

1. Chromium reached its existing **3600s process limit**, after the log reached
   **test-start marker 257 of 687**. No final chromium.json was written. This is
   not 257 passes or a complete 687-case result. The text log explicitly records
   four desktop 30-second timeouts: two board/camera cases and two active-bob
   cases; all later outcomes remain unknown. #221 tracks focused diagnosis.
2. Port **4173 remained occupied** after termination. Fixtures, placement-dev,
   both WebKit matrices, health-bars and all three explicit asset checks failed
   before executing tests. Do not call these eight zero-test launches device
   failures or coverage. #219 tracks cleanup of only owned process descendants,
   waiting for cleanup before continuation and durable interrupted-case results.
   The exact surviving PID tree was not retained; detached ownership needs proof.
3. Local performance collection failed after **10.58s** with `Preview failed to
   start`; no performance.json or samples were produced. #220 tracks actual
   startup diagnostics and the collector's brittle stdout-gated readiness logic.
4. Playwright emitted repeated 3s GitCommitInfo base-fetch warnings because the
   checkout was shallow. Future manual capture uses full history to avoid those
   avoidable metadata lookups; these warnings did not invalidate the hashed inputs.

Keep valid unit/type/build/telemetry evidence tied to this source. Repair and
qualify the bounded harness/startup problems, disposition the four observed
browser timeouts, then deliberately capture missing coverage. Do not rerun the
entire matrix solely to obtain better numbers or hide this attempt. The automatic
PR baseline trigger is retired after this approved run; subsequent runs require
an explicit manual dispatch to avoid repeating an 80-minute capture on ordinary
PR updates. Self-hosted qualification and comparison remain separate.

## Stage results

Wall times include each process/server startup and teardown. The port-conflicted
rows are failed launches, not fast browser tests. Telemetry times include their
configured build/server work. Parallel assertion sums are not wall time.

| Stage | Result | Seconds | Counts |
| --- | --- | ---: | --- |
| `tooling` | passed | 0.36 | — |
| `units` | passed | 67.81 | {"total":907,"passed":907,"failed":0,"pending":0,"todo":0} |
| `typecheck-app` | passed | 0.90 | — |
| `typecheck-domain` | passed | 0.12 | — |
| `build-integration` | passed | 6.41 | {"total":2,"passed":2,"failed":0,"pending":0,"todo":0} |
| `build-root` | passed | 0.94 | — |
| `chromium` | failed | 3600.11 | no final JSON |
| `fixtures` | failed | 3.95 | {"total":0,"expected":0,"unexpected":0,"flaky":0,"skipped":0,"retryAttempts":0} |
| `placement-dev` | failed | 3.87 | {"total":0,"expected":0,"unexpected":0,"flaky":0,"skipped":0,"retryAttempts":0} |
| `webkit-acceptance` | failed | 3.92 | {"total":0,"expected":0,"unexpected":0,"flaky":0,"skipped":0,"retryAttempts":0} |
| `webkit-exploration` | failed | 3.92 | {"total":0,"expected":0,"unexpected":0,"flaky":0,"skipped":0,"retryAttempts":0} |
| `health-bars` | failed | 3.93 | {"total":0,"expected":0,"unexpected":0,"flaky":0,"skipped":0,"retryAttempts":0} |
| `telemetry-production` | passed | 581.34 | {"total":36,"expected":36,"unexpected":0,"flaky":0,"skipped":0,"retryAttempts":0} |
| `telemetry-development` | passed | 590.08 | {"total":36,"expected":36,"unexpected":0,"flaky":0,"skipped":0,"retryAttempts":0} |
| `assets-root-dev` | failed | 3.84 | {"total":0,"expected":0,"unexpected":0,"flaky":0,"skipped":0,"retryAttempts":0} |
| `performance` | failed | 10.58 | — |
| `build-prefix` | passed | 0.93 | — |
| `assets-prefix-preview` | failed | 3.86 | {"total":0,"expected":0,"unexpected":0,"flaky":0,"skipped":0,"retryAttempts":0} |
| `assets-prefix-dev` | failed | 3.86 | {"total":0,"expected":0,"unexpected":0,"flaky":0,"skipped":0,"retryAttempts":0} |
| `restore-root` | passed | 0.94 | — |

See [machine-readable summary](hosted-baseline.json) for hashes, browser metadata,
queue/setup timings, errors and exact disposition. Raw evidence remains in the
linked artifact; SHA-256 `748aba4ed5450557980eb652fe2fb496db4664f9529631f173c0b29b0cb01a8b`.
No test/assertion/retry/product threshold was relaxed. No merge or deployment.
