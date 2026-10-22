# Issue #220 preview readiness

Date: 2026-10-22 (Asia/Jerusalem). Implementation, focused verification and one isolated production capture complete. [PR #225](https://github.com/luminari-gurus/tactics-guru-v2/pull/225) is ready for review. Collection passed; unchanged performance budgets failed for two samples. OpenSpec: `issue-220-preview-readiness`.

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

Frozen implementation/build: **`33f3595be96dd12a4cfc7fdb3e443352a5f4b30d`, clean**, with the same clean commit served in every sample. `npm run build:bundle` rebaked that identity using the unchanged content/type prerequisites already validated by the ordinary build. Final documentation/receipt commits change none of the 16 recorded collector/test/build inputs; their evidence is reused without another build or capture.

[Qualification receipt](issue-220/qualification.json): Windows 10.0.26300 x64, Node 24.19.0, Intel Core Ultra 9 285H, 16 reported CPUs, 68.3 GB RAM, Chromium **153.0.8010.12**, lockfile-matching Playwright 1.63.0. The collector uses its normal headless launch. No concurrent Vite/Playwright/measure-fit job was observed; qualification and capture ran sequentially. Existing desktop apps remained open, browser caches were warm and a one-second preflight CPU sample was **17.0% busy**. These are explicit background-load limits, not a controlled cross-host baseline or speedup comparison.

The actual collector CLI with a deliberately nonexistent browser executable failed **exit 1**, wrote no performance file and released port 4174 before returning: [launch-failure receipt](issue-220/launch-failure.json), [raw failure](issue-220/launch-failure.log.gz). This proves the integrated browser-launch failure boundary in addition to callback-level contracts.

Exactly one default production capture ran from **17:09:27 to 17:10:10 UTC** (20:09:27–20:10:10 Asia/Jerusalem), with FIT_URL unset and no executable override:

```sh
npm run measure:fit -- tmp/issue-220/performance.json
node --experimental-strip-types scripts/evaluate-fit.ts tmp/issue-220/performance.json tmp/issue-220/evaluation.json
```

Collection returned **exit 0**, retained **18/18** samples (three profiles × three repetitions × cold/warm), no capture/browser failures, matching source/build identities and **zero remaining preview listeners**. [Capture exit](issue-220/capture-exit.json), [raw capture](issue-220/performance.json.gz), [raw output](issue-220/capture.log.gz).

Evaluation returned **exit 1**: **zero capture failures, zero loading warnings, two budget-failing samples**. Desktop/warm/repetition 1 and portrait/warm/repetition 1 each have initial/current idle p50 **16.79999995 ms**, above the unchanged **16.7 ms** F1 limit. These four metric violations across two samples remain failures; no threshold/tolerance change or resampling was performed. [Complete evaluation](issue-220/evaluation.json.gz) and [compact provenance/violation/hash receipt](issue-220/receipts.json) retain the outcome. The source or environmental cause of these small frame overruns has not been established. They belong to #200's outstanding performance acceptance, rather than reopening preview-readiness implementation or claiming a passing baseline.

Representative proof-scene screenshots were inspected at [desktop](issue-220/desktop.png), [portrait](issue-220/mobile-portrait.png) and [landscape](issue-220/mobile-landscape.png). They show the expected scene and readable profile layouts; landscape keeps its existing scrollable controls panel. These are emulated viewport/device checks, not physical testing or complete gameplay certification.

The receipt manifest records SHA-256 of each uncompressed/compressed raw file, the full five-file collector source set, lockfile and other relevant inputs. Gzip streams were decompressed and checked byte-for-byte. Raw snapshots include all sample intervals, measured build, build inventory and per-file hashes. Download any `.gz` from this PR's repository tree and decompress it to recover its original JSON/log; no expiring artifact is needed for current evidence. The 62-test, first-failure, build and portable-tooling logs are retained alongside it. The historical full ZIP remains locally at `tmp/issue-220/original-failure.zip`; its bounded relevant evidence is committed here.

No gameplay/browser matrix, WebKit, telemetry, complete #200 baseline, claimed speedup, physical-device certification, merge or production operation is included. The only transitive production consumer is the unchanged performance stage in `verify-full.mjs`; unmerged PR #209 remains independent.
