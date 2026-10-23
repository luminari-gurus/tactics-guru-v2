# Verification timing baselines

Issue #200, part of epic #199. This tooling measures the existing verification
plan; it does not change gameplay selection, workers, retries or performance
limits. The runner setup from merged PR #210 is qualified on `unraid-tactics-01`
(labels `[self-hosted, tactics-browser]`), under the `actions` service account:
[qualification run 39717745142](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39717745142).

## Self-hosted qualification and capture

For resumable self-hosted capture, use the [serial batch workflow](serial-verification.md).
Its manual `pilot`/`capture` modes replace the single 100-minute capture shell;
`batches` now selects job IDs, not the former workflow `stages` input. The direct
local timing CLI and its `--stages` interface below remain available unchanged.

`.github/workflows/issue-200-baseline.yml` is manual-dispatch-only on trusted
`main` or `work/issue-200-verification-timings` refs. It targets the qualified
runner labels, shares `tactics-browser-exclusive` with browser setup and lifecycle
qualification, and has no GitHub-hosted fallback or automatic PR execution.
OS libraries are administrator-provisioned; jobs install locked Chromium/WebKit
binaries into the runner service account's persistent cache without `--with-deps`.

The default `mode: qualify` checks process/reporting/orchestration contracts,
diagnostics retention, the production build, two-engine Phaser smoke, preview/dev
Chromium timeout recovery, and a CPU-only partial timing receipt/comparison. This
makes reporting changes reviewable without launching another hour-long matrix.
Qualification receipts are explicitly partial and are not a new full baseline.

Choose `mode: capture` deliberately for serial timed coverage after qualification.
Empty `batches` selects the complete canonical plan; a comma-separated list selects
only those jobs, after shared preparation, and remains partial. The workflow uses a unique run/attempt output
path, a bounded foreground capture, failure-preserving artifact upload for 30 days,
and an explicit conditions field. Never merge receipts from different hosts into
one comparable performance baseline. Persistent npm/browser caches and per-job
setup/preflight conditions are recorded; coordinate unrelated host workloads.
Setup/qualification duration is recorded separately from capture. Queue time is
null in local reports; obtain it from the linked Actions run/job timestamps.

The original [81.56-minute hosted attempt](qa/issue-200/hosted-baseline.md) remains
failed/incomplete historical evidence. #219's descendant cleanup/checkpoints from
PR #222 are integrated here; #221's focused repair arrived through merged PR #223.
#220 still owns the independent performance collector startup finding. Review of
this tooling does not establish complete #200 case coverage or erase that finding.
The remaining comparable self-hosted baseline is tracked in #200, rather than
being silently claimed by a passing qualification run.

After this workflow reaches main, dispatch from Actions. Before then, use the same
commands directly at the reviewed SHA under the runner service account, or a
temporary maintainer-only trigger pinned to that exact reviewed checkout and
removed after qualification. See [browser setup](browser-testing.md) for trust,
cache and host requirements.

```sh
npm run test:verification-tooling
npm run measure:verification -- --list
npm run measure:verification -- --out verification-receipts/timings/provisioned-baseline --conditions "qualified host; idle; describe dependency/build/browser cache state"
```

The timing manifest derives from `scripts/verify-full.mjs`, the same maintained
coverage plan as `npm run verify:full`. Every full stage is represented, in the
same order and mode. Only `typecheck` is split into two process timings, so the
19-stage full plan currently produces 20 timing rows:

| Timing stages | Existing work measured |
| --- | --- |
| `tooling` | Existing verification orchestration contracts |
| `units` | Fast unit suite, including all content validation |
| `typecheck-app`, `typecheck-domain` | Both `tsc --noEmit` boundaries |
| `build-integration` | The two real root/prefix Vite build tests |
| `build-root` | Ordinary bundle after successful units/content and both type scopes |
| `chromium` | Default production-preview matrix |
| `fixtures` | Combined authored-encounter, ability-picker and run-item dev fixtures |
| `placement-dev` | The explicit dev-only failure/retry case |
| `webkit-acceptance`, `webkit-exploration`, `health-bars` | Required engine/device matrices, including mixed Chromium/WebKit health-bar coverage |
| `telemetry-production`, `telemetry-development` | Separate configured telemetry modes and their own server/build behavior |
| `assets-root-dev` | Root asset behavior in development |
| `performance` | Isolated local production collector, after the root build |
| `build-prefix`, `assets-prefix-preview`, `assets-prefix-dev` | Prefixed bundle and asset behavior at `/prototype/` |
| `restore-root` | Final root bundle restoration, including after a prefix consumer fails |

Ordinary bundles reuse successful unit/content and type prerequisites exactly as
#206 specifies. The timing runner does not reintroduce a standalone content pass.
Content case counts and summed assertion durations are reported as a subset of
`units`, derived from the current `validate:content` command. That duration is
work already included in units, **not separate elapsed wall time**. Both compiler
scopes execute once. Their direct process timings omit the single `npm run
typecheck` wrapper overhead; the other rows retain their canonical npm commands.
The configured telemetry production build remains separate and self-validating.

Independent stages continue after failures; only consumers of failed prerequisites
are blocked. A failed unit/type gate therefore cannot qualify stale build output.
The last root restoration still runs after a failed prefixed build or browser
consumer when its unit/type prerequisites passed. Interrupts stop the capture and
retain partial evidence. Individual stages default to a one-hour timeout;
`--timeout-ms` changes the capture process limit, not test timeouts.

## Focused preparation

`--stages` selects timing rows and expands their prerequisites once. A CPU-only
reporting check that does not launch browsers or claim a full baseline is:

```sh
npm run measure:verification -- --stages tooling,typecheck-app,typecheck-domain --out verification-receipts/timings/cpu-check --conditions "CPU-only preparation; not a baseline"
```

Use current IDs from `--list`. The old `content`, `unit`, `bundle`, `encounters`,
`items`, `webkit` and `telemetry` stage names belonged to the historical ten-stage
capture and are no longer accepted. Schema-one reports remain readable by the
comparison command; changed schema/coverage produces a warning, not a claim that
an old partial matrix qualified the new plan.

Stage environments reuse `verify:full` isolation: inherited remote `FIT_URL`,
telemetry and prior base/server/report settings are cleared, then the stage's
explicit root/prefix/dev/telemetry mode is applied. The local collector cannot
silently measure a prior deployment. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` remains an
explicit supported override. No caller environment values are dumped in reports.

## Preflight and receipt retention

Browser preflight runs outside stage timings. It distinguishes full Chromium
(`channel: chromium`), the default headless Chromium launch used by health/performance
checks, and WebKit. A mixed-engine stage requires both of its engines. Failed
launches block their stages and remain visible. Launch preflight warms browser
caches, so do not describe this as cold OS/browser-startup timing.

Metadata records version, channel, executable override and executable path when
known. The default headless-shell executable path is null because Playwright's
Chromium `executablePath()` is not proof of the actual shell path. This limitation
is explicit; an installation path is not fabricated as an observed executable.
Actual runner qualification and installation receipts remain required under #207.

Use a **new** directory beneath `verification-receipts/timings/`. Logs, JSON,
sidecars and isolated Playwright output directories are saved there, outside
ordinary `test-results/` cleanup. Existing capture directories are refused.
The per-checkout `.capture.lock` prevents overlapping timing captures in this
checkout; it does not detect workloads in other checkouts or applications. If
forcibly killed, inspect its PID before removing a stale lock. Windows process
termination remains best-effort for descendants; inspect for surviving servers.

## Reports and comparison

Schema two records full/partial scope, requested/expanded stages and coverage-plan
provenance, source commit/dirty state/input hashes, Node/OS/CPU/memory, browser
metadata, exact commands, per-stage wall times, counts/results/retries, workers
and slow tests/files. Vitest's sidecar retains module/setup/import diagnostics,
observed worker IDs and peak concurrent modules. Unknown fields remain null.
No `.env` or arbitrary untracked files are read. Relevant source hashes are checked
at completion; changed inputs prevent a passing receipt.

`complete` means every selected stage executed, not that it passed. `passed` is a
separate gate; a passing `scope: partial` capture is **not** the full baseline.
Any failed/blocked stage, missing/malformed report, zero selected tests, timeout,
interrupt or changed input produces a nonzero result. Expected/unexpected
failures, retries, flaky outcomes and skips remain distinct.

Stage wall time includes process/server startup and teardown. Parallel assertion
duration sums are work, not elapsed time. Queue time is null without scheduler
data. Dependency/browser installation is outside these stages; record it separately
when comparing fresh hosts. Telemetry includes its configured build/server work.

```sh
npm run measure:verification -- compare verification-receipts/timings/before/report.json verification-receipts/timings/after/report.json
```

Comparison warns about changed coverage plans/scopes, environments, source,
conditions, counts, selected IDs and workers. Playwright selection uses case IDs
and projects; historical reports without IDs fall back to file and title.
Missing/failed/blocked stages do not
get a passing speedup. Deltas are descriptive, not statistical acceptance or proof
of causality. Do not rerun the full matrix just to obtain a nicer measurement.

Retain raw logs/JSON in PR or CI artifacts for 30 days and through review, whichever
is longer; keep a compact source-bound summary in `docs/qa/`. This task configures
no uploader or retention service. Archive receipts before cleaning the checkout.

`npm run test:verification-tooling` checks canonical coverage, dependencies,
continuation/restoration after failures, mode isolation, comparison compatibility,
subprocess failure/timeout handling and real synthetic Vitest/Playwright reporting.
The reporter fixtures intentionally contain failures, retries and skips; they use
no browser fixture or server and do not alter production retry configuration.

## Timeout recovery and per-case checkpoints (#219)

On Linux, the timing runner observes descendants through `/proc` every 100 ms
and again before termination. It retains PID/start-time identity and observed
ancestry across detached process groups and reparenting; namespace-local PIDs are
translated when `/proc` exposes an outer namespace. Cleanup sends TERM to verified
owned processes, allows three seconds, escalates remaining identities to KILL,
and waits for exit before returning the stage. Early launcher closure does not
cancel escalation. Normal completion also cleans observed leftovers. The receipt
records observed identities, escalated PIDs, survivors, errors and sampling mode.
A cleanup error stops the capture rather than starting suites against a potentially
contaminated host; ordinary test failures/timeouts still allow independent stages
when cleanup succeeds. No port owners are killed and stale-server reuse stays off.

This is observed-process lifecycle cleanup, not a containment boundary: a process
that forks and reparents between observations can escape ancestry discovery.
Unobserved inherited pipes are bounded and fail the capture. Linux qualification
covers the actual long-lived Playwright/npm/Vite ancestry. Other platforms retain
best-effort group/direct-child signaling and report `cleanup.complete=null`;
detached descendants there are unverified. SIGKILL of the timing runner itself
cannot execute cleanup. Inspect surviving workloads before removing its stale lock.

Playwright additionally writes `<stage>-cases.jsonl` beside its final JSON, with
planned count, test starts, completed attempts (including status, retry, project,
worker, duration and errors), global errors and an end event when available. Each
callback appends synchronously. The stage's `caseCheckpoint` reports completed
attempts/unique IDs and whether the reporter ended. These are partial observations,
not final outcome counts or passing coverage: missing final JSON, timeout and
interrupt still fail the stage. A forcibly interrupted append or host loss can
leave the final line incomplete; earlier lines remain raw evidence.

`test:verification-tooling` includes detached-server timeout/interrupt/normal-exit
contracts, unrelated sibling-process survival and real browser-free reporter
interruption. A separate bounded qualification runs:

```sh
npm run build
node --test tests/tooling/verification-browser.test.mjs
```

It launches actual Chromium and Vite preview/dev on port 4173, retains one completed
canvas smoke before deliberately timing out a second case, then proves a fresh
Playwright server can own that same port with `reuseExistingServer=false` and pass
the smoke. Each mode has a 90-second contract bound. The dedicated #219 workflow now uses the same self-hosted labels and exclusive
concurrency group (15-minute job ceiling), with manual dispatch only. Its bounded install uses `npm ci
--ignore-scripts --no-audit --no-fund`: the release-only PostHog CLI installer is
not needed by these checks; Chromium is installed explicitly. This is not
release-CLI or security-audit qualification. It does not repeat the gameplay matrix,
CPU/telemetry baseline, or replace #220/#221 follow-ups. Its logs, checkpoint JSONL,
final reports and cleanup receipts are uploaded for 30 days.
