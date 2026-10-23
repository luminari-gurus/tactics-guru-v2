# Issue #208 phase-A qualification

Date: 2026-10-22 (America/New_York). This is serial tooling qualification, not a
full #200 baseline or a performance speedup claim. See the
[operator and resume guide](../../serial-verification.md).

## Frozen implementation and coverage

Tested implementation: `0f0c3738d6b2752bbc4697f77cf66ac6685772e1`, based on main
`b749ba40f358cf6fa0e8e9acb96f535c6362e938`. Later handoff changes add these
qualification documents and restore the original `qualify`-only partial timing
receipt/comparison step. The serial prepare/batch/aggregate path is unchanged.
Those handoff changes did not execute in the pilot; the restored CPU-only CLI
sequence is checked locally with a passing receipt and parseable self-comparison.

Real Playwright discovery validates the nine whole-file/project Chromium groups
against the canonical selection: **693 unique IDs**, zero missing/extra/duplicate
IDs. The six additional cases since the historical 687-case inventory are retained.
All 19 canonical full stages remain represented as 20 timing rows. The complete
capture uses 19 independently budgeted serial jobs after shared preparation,
including all explicit dev, WebKit, telemetry, asset, performance and prefix modes.
The pilot does not execute those full batches. No application/assets, browser
configuration, dependency versions, assertions, workers, retries or product limits
change in this PR.

Local Node 24.19.0 checks: **49 passed, zero failed, three Linux-only skips**
across 52 tooling/orchestration/reporter contracts. The 22 new batch contracts
include real pilot discovery, altered-build rejection, exact IDs, missing receipts,
independent continuation/restoration, interrupts, latest-execution provenance,
prior-failure retention, unchanged performance evaluation and comparison export.
App TypeScript, JavaScript syntax, workflow YAML parsing and whitespace checks pass.

## Self-hosted pilot and targeted resume: passed

[Run 39881021977](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39881021977)
executed the frozen source on `unraid-tactics-01`: Linux x64 kernel
6.8.0-147-generic, Node 24.22.1, six reported CPUs, Ryzen 7 2700X and
8,174,170,112 bytes RAM. Chromium 153.0.8010.12 and WebKit 26.6 launch preflight
passed. Persistent service-account caches and unverified unrelated host load are
recorded; this is not an otherwise-idle performance baseline.

- Linux tooling/reporting/process contracts **20/20**, new batching contracts
  **22/22**, canonical orchestration contracts **10/10**; all 52 pass on this host.
- Shared preparation passed **934 unit/content cases**, both compiler scopes,
  **two real build integrations** and the root bundle. It uploaded one ordinary
  build artifact; browser jobs verified its source/plan and per-file hashes.
- First pilot attempt passed **3/3 default Chromium profile boot/resize cases**
  and **1/1 setup WebKit boot/resize case**, zero skips/retries/unexpected failures.
  All process-cleanup receipts are complete.
- Reran only WebKit job `120178739030`. [Attempt 2](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39881021977/attempts/2)
  kept the original preparation and Chromium execution intervals and their
  attempt-1 receipts. WebKit passed again with an attempt-2 receipt. Both WebKit
  attempts remain in history; all consumers use build SHA-256
  `d9361ccdf5d50ce74400f8eff490315f4ed5ca977a6a57a4c9015a244ceae9a4`.
- Final aggregate: `scope=partial`, `complete=true`, `passed=true`,
  **`baselineEligible=false`**, no errors. Standard schema-two timing export
  self-comparison parses as JSON with zero warnings/deltas.

The initial pilot job-wall span was 217.879 seconds; after the deliberate resume,
the span was 321.977 seconds, including the manual gap. Final selected job time
was 194.264 seconds; all retained receipt attempts totaled 223.143 seconds.
Actions reported 294 seconds of unique completed-job compute, including setup,
upload and the earlier aggregate. The still-running final aggregate was excluded.
Copied successful job snapshots were deduplicated, and no negative queue duration
was fabricated. These are pilot costs, not full-matrix measurements.

[Final aggregate artifact](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39881021977/artifacts/12470911946),
SHA-256 `c072ef38b7fa417c399480a1a7fce80f71ec83a7d4754f8e1a1669e68717a825`.
[Original preparation/build artifact](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39881021977/artifacts/12470232815),
SHA-256 `639ee7919ade8e7442c8e384582639b75eff504f247d26b8f4f68b49d5a144e3`.
Separate Chromium and both WebKit receipt artifacts retain JSON/JSONL/blob ZIPs.
Artifacts have 30-day retention; preserve them separately if review exceeds it.

## Retained iteration failures and limits

[Initial pilot 39867370639](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39867370639)
failed discovery before browser execution: the smoke grep incorrectly anchored the
beginning of Playwright's full title. The repaired suffix filter has an actual
three-profile/WebKit discovery regression, not just a mocked selector check.

[Run 39868080974, attempt 2](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39868080974/attempts/2)
proved artifact reuse but failed the first scheduler guard. GitHub creates copied
successful-job snapshots under the new attempt number without rerunning those
jobs. The repair validates receipt timestamps against actual execution intervals,
rejects a newer failed/setup/upload execution without its matching receipt,
deduplicates compute and leaves unavailable copied-snapshot queue times null.
Synthetic negative cases and replay of the actual retained job/receipt data pass;
the final live targeted resume above passes with the repair.

The original hosted baseline, both failed/incomplete self-hosted monoliths and
PR #225's two performance-budget failures remain failures. No full capture,
performance resampling, true parallelism or production operation was launched.
#200 remains open for current-source complete comparable coverage and disposition
of failures. #208 phase B still requires qualified isolated capacity/contended-host
measurement. PR #228 requires Brian's approval before merge.
