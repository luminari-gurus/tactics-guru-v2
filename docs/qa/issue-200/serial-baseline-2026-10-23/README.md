# Current issue #200 results — 2026-10-23

[Full serial capture 39952038146](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39952038146)
at `fb7b7db34ba6bc278ca6ba7cf97dede506cf99f6` attempted all **19 execution batches**, plus preparation:
**17 passed, two failed**, in approximately **159.6 minutes** of workflow elapsed
time. This supersedes the older truncated captures as the timing reference.
It remains a **failed full capture**, with original aggregate flags
`scope:full`, `complete:false`, `passed:false`, `baselineEligible:false`.
Focused repairs below do not change those flags or establish a passing current-main baseline.
Reviewed main after #233: `ab20b7d`.

## Durable evidence and conditions

[Compact results](results.json) records source/input/plan identity, environment,
counts, stage timings and ranked Chromium files. [Per-case results](case-results.json)
retain test identity, outcome and duration, including failures and skips.
These are explicit extracts rather than replacement raw timing receipts;
runner filesystem paths, process records and detailed environment diagnostics
are omitted. Original commands, scheduling, full input maps and attempt metadata
remain available in the linked Actions artifact until expiry.
The [original aggregate artifact](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39952038146/artifacts/12510098124)
expires **2026-11-22 14:55:37 UTC**. These committed extracts survive that expiry;
individual traces, videos and logs in Actions artifacts do not.

Host: `unraid-tactics-01`, Linux x64 6.8.0-147-generic, Node 24.22.1,
Playwright 1.63.0, Chromium 153.0.8010.12, WebKit 26.6, six reported CPUs
(AMD Ryzen 7 2700X), 8,174,170,112 bytes RAM. Browser work used one worker,
zero retries and exclusive `tactics-browser` execution. Persistent caches and
unrelated background load were not independently verified; this is not a cold-cache benchmark.

Measured stage walls sum to **147.19 minutes**. Workflow elapsed includes setup,
preflight, artifact handling and scheduling outside those stage measurements.
Per-job queue intervals overlap while serial jobs wait; summing them would
misrepresent elapsed time. No isolated setup-speed or host-contention claim is made.

## Measured stages

| Stage | Outcome | Seconds |
| --- | --- | ---: |
| tooling | passed | 0.40 |
| units | passed | 35.17 |
| typecheck-app | passed | 0.81 |
| typecheck-domain | passed | 0.13 |
| build-integration | passed | 6.77 |
| build-root | passed | 0.99 |
| chromium | failed | 5170.96 |
| fixtures | passed | 212.03 |
| placement-dev | passed | 11.41 |
| webkit-acceptance | passed | 485.83 |
| webkit-exploration | passed | 957.53 |
| health-bars | passed | 324.99 |
| telemetry-production | passed | 460.98 |
| telemetry-development | passed | 444.11 |
| assets-root-dev | passed | 234.50 |
| performance | failed | 45.56 |
| build-prefix | passed | 0.91 |
| assets-prefix-preview | passed | 202.14 |
| assets-prefix-dev | passed | 235.44 |
| restore-root | passed | 0.92 |

Chromium accounts for **86.18 minutes** and records all **693 selected IDs**:
689 expected passes, one unexpected failure, three expected preview skips,
zero flaky outcomes/retries. The separate dev placement run passed all three
profiles; preview skips alone are not that coverage. Both WebKit suites,
fixtures, health bars, both telemetry modes and explicit asset modes passed.
Preparation passed 934 units, both compiler scopes and two build integrations.

## Failures and merged follow-ups

| Finding | Preserved outcome | Follow-up evidence and limit |
| --- | --- | --- |
| Landscape stalled proof tone remained Loading after 20 seconds | Original full-run audio failure retained | [#232 investigation](../stalled-audio-investigation/README.md) proves and repairs restart XHR leakage. Original timeout causality remains unproven; exact-base repetitions passed. |
| Performance source/build identity differed | 18 samples, zero budget failures, **39 capture-integrity failures**; invalid performance capture | [#231 recovery](../performance-provenance-recovery/README.md): 18/18 isolated samples pass with clean matching provenance. Partial scope, not a new full baseline. |
| Intermittent initial proof-audio readiness | Occurs on unchanged base and repaired runtime | [#233 qualification](../initial-readiness/README.md): 21 audio cases pass; final receipt-path revision has three startup cases pass. Functional audio setup now qualifies the actual worker browser GPU first. Cold GPU startup remains unresolved. |

#233 changes the audio measurement boundary: a bounded graphics setup precedes
functional readiness. Its stage wall includes that setup; its passing readiness
assertion does not prove player-facing cold startup meets the same deadline.
The original 20-second stalled-tone failure, later startup failures, rejected
experiments and partial evidence remain in their linked reports. No overall
speedup or clean full-suite acceptance is claimed.

## Acceptance and next recommendation

#200's timing inventory, metadata/failure retention and comparison workflow are
implemented. Its requirement for a comparable baseline on current code remains
**open**: this failed capture plus changed-source focused recoveries cannot be
relabeled as a passing full current-main run. Keep #200 open and reuse valid
unaffected evidence under the [verification policy](../../../verification-policy.md).
No additional full matrix was launched for this documentation update.

The next optimization is to **review existing [PR #229](https://github.com/luminari-gurus/tactics-guru-v2/pull/229)
for #205**, rather than duplicate its battle-audio refactor. The full capture
measured battle-audio at 858.65 seconds across Chromium profiles. PR #229 reports
its own matched local before/after reduction; that host-specific result must not
be combined with this runner's numbers as a measured overall saving.
After that, #204's legal saved-state fixtures address repeated run journeys;
#203 should change device selection only with an explicit behavior/coverage map.
Dungeon exploration (958.52 seconds), battle audio (858.65), run progression
(685.35) and battle loop (650.58) together consume **61.70% of observed Chromium
case durations**. Those file sums identify investigation targets, not guaranteed
removable cost. Batching is already delivered by #228; further packaging alone
does not reduce these serial test durations.

For a later comparable measurement, freeze affected inputs and selection, record
host/cache/load conditions, retain graphics setup separately when relevant, and
run the smallest affected selection on the qualified exclusive runner. Preserve
failed results and changed-boundary warnings. Download and retain the original timing report before artifact expiry. Use the existing comparison command (the compact extracts are not comparator inputs):

```sh
npm run measure:verification -- compare path/to/original/timing-report.json path/to/after/timing-report.json
```

A failed baseline, partial selection, changed input identity or setup boundary
limits comparison; command output cannot establish comparability by itself.
See the [serial guide](../../../serial-verification.md) and
[timing guide](../../../verification-timings.md) for deliberate captures and retention.
