# Chromium baseline timeout investigation — 2026-10-22

## Finding

This capture timed out because its serial browser workload exceeds the orchestration
budgets. It was not stuck on a failing Chromium assertion. Repeating the unchanged
monolithic run is not the next step.

[Attempt 2](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39767156870/attempts/2),
job 119849080072, tested `6f20a3d6a8087e40777cccb6ee7c2cf4a09ece89` on
`unraid-tactics-01`: Node 24.22.1 / Playwright 1.63.0 / Chromium 153.0.8010.12,
6 reported vCPUs and approximately 8.17 GB RAM. All recorded verification-input
hashes match the inspected branch `a0185e492d558c29ead872414ffebc6129516876`.
No application/test/config code changed for this investigation.

[Raw artifact](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39767156870/artifacts/12435277901)
was downloaded and SHA-256 verified:
`92c312b7a6294b1d6ee8d0046f9d193fda77e8320169427901f5612c8702a1d0`.
It expires 2026-11-21 10:02:33 EST. The source-bound
[analysis and batch manifest](chromium-timeout-investigation.json) retain the
selection proof, measured costs, commands and limitations.

## What the hour contained

The configured default matrix has **229 cases × 3 projects = 687 selections**,
executed with one worker. Its per-case JSONL retained **471 starts, 470 completed
attempts: 468 passed, two skipped, zero completed unexpected failures/retries**.
There are **217 incomplete cases**, including one started without an end event.
The two skips are the explicit preview-mode placement case; that dev-only owner
ran separately and passed all three profiles. Discovery's synthetic skipped
statuses are not used as execution results.

| Project | Completed / planned | Passed / skipped | Observed test work |
| --- | ---: | ---: | ---: |
| Desktop | 229 / 229 | 228 / 1 | 34.86 min |
| Mobile portrait | 229 / 229 | 228 / 1 | 24.19 min |
| Mobile landscape | 12 / 229 | 12 / 0 | 0.64 min |

Completed-case durations sum to **3,580.93 seconds**, **99.46%** of the
3,600.26-second Chromium stage. This rules out startup/teardown overhead or a
single unreported hour-long hang as the primary explanation for this attempt.
The longest passed case was a legitimate two-floor dungeon journey at **310.4s**;
its authored test limit is 600s. Full-battle audio and run-outcome cases also take
minutes. There is no evidence here to justify raising individual test timeouts,
adding retries, removing journeys, or weakening assertions.

| Largest observed files, primarily desktop + portrait | Completed test work |
| --- | ---: |
| `dungeon-exploration.spec.ts` | 10.89 min |
| `battle-audio.spec.ts` | 10.19 min |
| `run-progression.spec.ts` | 7.87 min |
| `battle-loop.spec.ts` | 7.74 min |

Those four files account for **61.47%** of observed Chromium test time. Using
matching portrait cases as the proxy for uncompleted landscape cases projects
about **83.24 minutes of Chromium test work**, before additional batch/CI setup.
This is an estimate, not a completed landscape measurement or a speedup claim.

## The outer timeout is a second, separate problem

Chromium hit the 60-minute **stage** limit. Cleanup succeeded, and independent
coverage continued:

| Later suite | Result | Stage wall time |
| --- | --- | ---: |
| Combined dev fixtures | 57 passed | 3.53 min |
| Dev placement | 3 passed | 0.17 min |
| WebKit acceptance | 52 passed | 8.07 min |
| WebKit exploration | 51 passed | 15.45 min |
| Health bars | 25 passed | 5.42 min |
| Production telemetry | 24 / 36 completed, all 24 passed | interrupted at 6.54 min |

The separate **100-minute outer capture limit** then sent TERM during telemetry
(exit 124). Development telemetry, root-dev assets, the performance collector,
prefix build/assets and root restoration were not reached. The 188 passed cases
in the five completed later suites remain useful source-bound evidence. Partial
Chromium/telemetry callbacks remain partial observations, not passing stage JSON
or a clean full baseline. Missing final JSON is expected after forced termination.

Even the Chromium projection plus the five measured later suites totals roughly
**116 minutes**, excluding telemetry and remaining work. Splitting Chromium inside
the same 100-minute shell would therefore leave another aggregate cutoff.

## Coverage-preserving batches prepared

The manifest groups whole files by project and measured duration, with three
batches per project. It preserves file-local ordering/hooks and does not enable
`fullyParallel`. Every command was checked with real Playwright `--list` JSON:
**687 canonical IDs = 687 selected unique IDs; missing/extra/duplicates all zero**.
Only discovery ran; no browser batch or parallel benchmark was launched.

| Batch | Selected cases | Test-work basis, excluding startup/setup |
| --- | ---: | ---: |
| desktop-1 | 77 | 11.63 min measured |
| desktop-2 | 68 | 11.62 min measured |
| desktop-3 | 84 | 11.61 min measured |
| mobile-portrait-1 | 73 | 8.06 min measured |
| mobile-portrait-2 | 100 | 8.06 min measured |
| mobile-portrait-3 | 56 | 8.06 min measured |
| mobile-landscape-1 | 74 | 8.07 min observed + estimated |
| mobile-landscape-2 | 95 | 8.06 min observed + estimated |
| mobile-landscape-3 | 60 | 8.06 min observed + estimated |

These are proposed batches, not nine passing results or a guaranteed 15-minute CI
budget. They require a source-matched production build before execution. The JSON
contains each exact selection command, file membership, count and test-ID digest.

## Parallelism and execution plan

Playwright supports `--workers` and `--shard`, but CPU count alone does not qualify
multiple concurrent Phaser/browser workloads. Only one isolated runner has been
qualified here. The current config deliberately sets `workers:1`; most suites own
4173, telemetry owns 4288, and the host/browser resources are shared.

1. **#208 phase A: serial, resumable jobs.** Use this nine-batch manifest with
   `max-parallel:1` on the current runner, one worker per job, and shared
   `tactics-browser-exclusive` protection for the entire workflow. Build once
   after unit/type/content gates, upload the exact ordinary build with hashes,
   then verify/download that artifact for each preview batch. Keep instrumented
   telemetry and prefix builds distinct. Upload JSONL/final JSON/blob reports per
   batch even on failure; `fail-fast:false`. Give each job its own bounded budget
   and independent retry. Do not place all jobs beneath the old 100-minute parent
   process. Gate aggregation on every planned batch and exact 687-ID coverage,
   preserving failures/skips, host/source/build identity and timing boundaries.
2. **Recover missing evidence, not another whole monolith.** Reuse unchanged
   complete CPU and five-suite receipts. Qualify the new packaging with a bounded
   real-browser pilot, then prioritize landscape's missing coverage and a separate
   telemetry/assets/prefix/restore capture. Preserve original failed stages; a
   composite coverage ledger is not a single uninterrupted passing baseline.
   #220's performance collector finding remains independently actionable.
3. **True parallelism after qualification.** Add genuinely isolated hosts (or
   benchmark a limited two-worker functional experiment with matched inputs,
   CPU/RAM/renderer/load and failure counts). Multiple agents/containers on this VM
   do not prove isolation. Keep performance baseline/budget captures serial until
   comparability is established. Distinct jobs on one registered runner queue
   serially; batching improves reliability/retry granularity, not total test work.
4. **#204/#205/#203 can proceed with focused baselines.** Start legal-boundary run
   fixtures and audio-equivalence design from the completed per-case evidence;
   measure missing affected landscape cases and matched before/after consumers.
   Prioritize #205 alongside #204 because audio already consumed 10.19 observed
   minutes. #203 has an exact 687-ID inventory for its coverage mapping. Retain real
   gesture/touch/orientation/WebKit/persistence boundaries and representative full
   journeys; measure candidate gains instead of assuming all device duplication
   is removable. The remaining full #200 baseline is not closed by this analysis.

The immediate unblock is job/batch packaging and targeted recovery. Reducing the
expensive repeated journeys/matrix work is what lowers total compute; hardware
isolation is what can make true concurrent shards lower critical-path time.
