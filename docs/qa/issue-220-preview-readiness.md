# Issue #220 preview readiness

Date: 2026-10-22 (Asia/Jerusalem). Implementation and focused verification complete; isolated production capture pending. OpenSpec: `issue-220-preview-readiness`.

## Reproduction and retained failure

Recovered [original run 39700595665](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39700595665) and [artifact 12396082054](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39700595665/artifacts/12396082054). The locally downloaded ZIP SHA-256 is recorded in [original-failure.json](issue-220/original-failure.json). Its performance row failed nonzero in **10583.642 ms**, and the result file is absent. [Raw performance output](issue-220/original-performance.txt) contains only the generic startup error, without child stdout/stderr. The exact historical cause remains unproved. Other failed/incomplete baseline stages are not reclassified.

At unchanged planning HEAD `233970a8730d886fe4d0fbad05285e0d142dd3b4` (collector equal to main `4f6614e`), pinned Vite **8.3.5** starts under Node **24.19.0 / Windows x64**. [Reproduction receipt](issue-220/reproduction.json) retains complete stdout/stderr, PIDs, exits and independent HTTP observations. Normal piped output serves 200 and satisfies the old predicate. Forced colored output inserts ANSI codes before `4174`: it serves 200 but **never satisfies the old URL predicate**. Controlled single-byte splitting also misses the predicate. This reproduces the fragile gate, not the historical host's cause. The probe used existing dist only to establish startup/HTTP, not as performance or build acceptance.

Setup failures remain in ignored `tmp/issue-220/`: the initial installed dependencies lacked the Windows Rolldown binding; first `npm ci` failed in PostHog CLI extraction because inherited PowerShell module paths prevented the Windows archive module loading. A second lockfile install with the standard Windows module path succeeded (`npm ci --include=optional --no-audit --no-fund`). No package/lockfile change or install-hook bypass was needed.

## Bounded repair

`measure-fit-preview.ts` keeps one direct Node child. The worker loads normal Vite configuration, awaits strict host/port binding, verifies production output and sends an IPC acknowledgement. The parent then accepts HTTP only from the acknowledged live preview within the unchanged ten-second total allowance. Each request is cancelled within the remaining deadline. Human output is diagnostic only; each output tail is capped at 8192 characters. Failures retain PID, exit/signal, last HTTP error and last status.

One lifetime covers startup, browser launch, capture and interruptions. Cleanup requests IPC close, waits one second, then uses bounded TERM (500 ms) and KILL (one second) against only the exact child. It awaits process close and restores temporary signal handlers. Unexpected child death aborts capture; the collector closes its browser on interruption. Original and cleanup errors remain visible together. No SIGKILL/host-crash cleanup guarantee is made.

Remote mode, including explicit loopback origins, creates/stops no process and inventories no local build. Existing options/scene/prefix/mixed-build checks remain. The helper joins the collector source hash set. Sampling, limits, port 4174, application, dependencies, Vite configuration and browser matrices are unchanged.

## Focused evidence

- `node node_modules/vitest/vitest.mjs run tests/unit/measureFitPreview.test.ts tests/unit/measureFitOptions.test.ts tests/unit/measurements.test.ts`: **62/62 pass**, 22 new lifecycle cases plus 40 existing cases. Real processes cover output independence, delayed startup, spawn/child death, non-OK/hanging/no-ack deadlines, bounded tails, cancellation, forced close, error preservation and sibling survival. Real pinned Vite fixtures prove config/base/outDir behavior, missing output, port reuse and foreign-port rejection with **zero requests** to the foreign server. Signal cases emit catchable Node SIGINT/SIGTERM events; they do not claim Windows OS delivery semantics or physical hardware.
- One initial diagnostic assertion failed because a final HTTP timeout hid an earlier 503; the repair retains the status separately. A later startup-interruption assertion exposed a generic AbortError hiding SIGINT; the repair preserves the interrupt reason. Both failed logs remain in `tmp/issue-220/`.
- `npm run build`: **221/221 content cases**, both TypeScript scopes and Vite pass. Subsequent collector/helper/test changes were checked with `tsc --noEmit`; domain/build/application inputs are unchanged. After freezing HEAD, rerun only the production bundle to bake the final clean identity; reuse the unchanged validated prerequisites.
- `node scripts/verify-full.mjs --list`: discovery only, **19 stages**, no full regression executed.
- `node --test tests/tooling/verify-full.test.mjs`: the exact unchanged main base fails **1/10** on Windows because expected paths hard-code `/`. Independent [PR #224](https://github.com/luminari-gurus/tactics-guru-v2/pull/224), commit `39b7a7aefa5b7e96623415f955c31880d60660a8`, changes only that assertion to native `join()`, with **10/10 passing**. The collector branch retains the original tooling test unchanged; no runtime dependency or stacked base is needed.
- `openspec validate issue-220-preview-readiness --strict`: passes. `git diff --check`: passes.

## Capture and handoff

Pending: freeze implementation; qualify otherwise idle local Chromium capacity; rebuild the production bundle from clean HEAD; run the default collector once with FIT_URL unset; evaluate to a distinct output file; retain raw results, source/build/hash identities, host/cache/load conditions and exit status. Do not resample merely to obtain passing budgets. Publish compact receipts here and retain raw data at a retrievable location.

No gameplay/browser matrix, WebKit, telemetry, complete #200 baseline, claimed speedup, physical-device certification, merge or production operation is included. The only transitive production consumer is the unchanged performance stage in `verify-full.mjs`; unmerged PR #209 remains independent.
