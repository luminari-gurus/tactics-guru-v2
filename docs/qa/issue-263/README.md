# WebKit dungeon reload boot investigation (#263)

Updated 2026-11-01 (Asia/Jerusalem). **Investigation active; cause and fix unproven.**
The current handoff is [plan.md](../../ongoing-projects/plan.md); tracked work is
[OpenSpec tasks](../../../openspec/changes/issue-263-webkit-reload-boot/tasks.md).

## Original failure

- [Run 41320149918](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41320149918),
  runtime `9b543cbafecf1cce48f966ff1d8998a46a7ae32d`.
- Artifact `full-verify-41320149918-1`, ID `13093858052`, 590,452,011 bytes.
  Recovered in WSL `/tmp/tactics-issue263-evidence/`; archive SHA-256
  `9f8726d2adcb007beeb6ece633d3bc6dba83b8467fb0d62de2849fba047b61dc`.
- The recovered job log confirms browser qualification (Chromium 153.0.8010.12,
  WebKit 26.6), a failed WebKit exploration stage and passing other stages.
  [Original report](original-webkit.json.gz), [log](original-webkit.log.gz),
  [aggregate](original-summary.json.gz), [job log](original-job.log.gz),
  [browser environment](original-browser-environment.json) and
  [error context](original-error-context.md) are preserved, with hashes in
  [evidence-manifest.json](evidence-manifest.json). Selected ZIP entries were
  extracted with CRC validation. The archive contains no WebKit failure trace.
- The report confirms **98 passed / one failed**, no retries: desktop WASD,
  64.025 seconds, missing `#dungeon-screen` at the 60-second boot assertion.
  Stack: `dungeon-exploration.spec.ts:124` → `load` at line 92 → Continue helper
  line 10. This is a later locked-stair fixture load after successful round-trip
  travel. The [arrival screenshot](original-arrival-before-failure.png) was taken
  **before** that failure; it is not a screenshot of the stalled page.
  The error context confirms the original HTML Loading shell. No underlying
  request/exception evidence was captured, so the cause remains unknown.
  The original full run remains failed; no passing replacement is claimed.

## Local exact-runtime diagnosis

Isolated WSL checkout `/tmp/tactics-issue263-failing` is pinned to `9b543cb`.
`npm ci`, `npm run build` and `npm run check:browsers` passed. Runtime source is
unchanged; diagnostic hooks were appended to the existing exploration test and
a temporary config enables retained failure traces/screenshots. They install
request/error listeners and bounded shell/mount/readiness sampling before
navigation. Existing test bodies, assertions and timeouts are unchanged.

- Five desktop-WebKit WASD repetitions passed in 27.2 seconds, no retries/skips.
- All four stair inputs on desktop/portrait/landscape WebKit, five repetitions
  each, passed **60/60 in 4.9 minutes**, no retries/skips.
- Some passing cases record an `items` module request cancelled by navigation.
  This confirms navigation can interrupt unfinished imports, but cancellation
  alone is not sufficient evidence of the stall: those cases recovered normally.
- A bounded 300-pair goto/reload probe passed in **2.1 minutes**, with no retries.
  Its first invocation selected zero tests because the temporary exploration
  config did not include the probe filename; the corrected config includes it.
  That setup failure is retained as `reload-probe-no-selection.log` locally.

Local logs, reports, hashes and browser qualification receipt are under
`/tmp/tactics-issue263-evidence/`. Portable reports are preserved as
`local-wasd.json.gz`, `local-stairs.json.gz`, `local-reload-probe.json.gz` and
their associated logs/manifest. Local passes do not reproduce the bug, attribute it to
runner load, or satisfy #263's causal/full-verification acceptance.

## Current interpretation

The issue's pre-mount observation still leaves entry/module fetching/evaluation,
CSS preload completion, initialization and browser lifecycle as hypotheses.
Do not change a timeout, add retries or claim an engine defect on this evidence.
No application behavior or production telemetry setting has changed.

## Diagnostic chunk

`tests/helpers/startupDiagnostics.ts` observes the existing exploration cases
before navigation and attaches evidence only on unexpected failure. It records
bounded request completion/failure, safe exception categories, shell/mount/ready
samples, stylesheet availability and completed script/link timings. It does not
intercept requests, read storage, change test waits/retries or enable telemetry.
Only build-owned filenames survive URL filtering; arbitrary messages, hosts,
query/hash and save data are excluded. A two-engine synthetic contract deliberately
fails four cases to check attached evidence, redaction and saturation caps.

This is diagnosis support, not the causal repair. Final #263 acceptance is pending.

Diagnostic qualification so far: main-runtime build/content/both types passed;
the unchanged 54-test selection in each engine was verified; initial WebKit
stairs **12/12** and the full affected Chromium file **54/54** passed. The final
privacy contract passed on both engines, checking four deliberate failures,
same-origin filename filtering, redaction and event saturation. Final metadata
filtering changed after those first positive runs; fresh affected-matrix checks
will qualify that exact helper before marking the diagnostic chunk complete.
