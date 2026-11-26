# Resumable serial verification (#208 phase A)

The manual `issue-200-baseline.yml` workflow has seven modes:

- `qualify` (default): bounded tooling, diagnostics, build, two-engine smoke and
  timeout-recovery checks. It does not launch a baseline.
- `pilot`: prepare the real root artifact and exercise its download/verification
  in two serial browser jobs, with three Chromium boot/resize cases and two
  portrait WebKit battle journeys. The aggregate is explicitly partial.
- `parallel-pilot`: run the same two browser batches on separate VMs using one
  verified build. The aggregate requires measured overlap between passing browser
  cases. See [Two-runner pilot](#two-runner-pilot).
- `serial-pair` and `parallel-pair`: compare two full browser batches on the
  same pair of VMs. See [Matched two-runner comparison](#matched-two-runner-comparison-208).
- `parallel-full` runs the full manifest on two isolated runners. VM 01 builds
  the root artifact and measures performance before releasing either browser job.
  The build artifact lists byte-identical checkout assets in `build.json` under
  `fromPublic`. Each runner restores those files from `public/` and verifies the
  SHA-256 manifest for the complete build before running the browser checks.
  VM 02 runs the verification-tooling and batch tests during preparation. Both
  browser jobs require those tests to pass. VM 01 then runs Chromium while VM 02 runs WebKit and the asset checks, including
  the prefix rebuild and root restoration. Each browser uses one worker. The
  aggregate checks the complete case list, build identity, overlap and performance
  result. A completed over-budget measurement still allows browser results to be collected.
- `capture`: prepare once, then run all 19 serial jobs, or a deliberately selected
  comma-separated `batches` subset. A subset cannot qualify the full baseline.

All seven modes are available on `main`. Use `work/208-full-parallel` to qualify
`parallel-full` before merging. Use `work/issue-208-matched-pair` to
dispatch the two matched-pair modes before merging. The older
`work/issue-208-serial-batches` branch supports `qualify`, `pilot`,
`parallel-pilot` and `capture`. `work/issue-200-verification-timings` supports
`qualify`, and `work/issue-208-parallel-pilot` supports both pilot modes.
Unsupported manual dispatches fail in a hosted job that reports the ref error
without checking out repository code. Browser jobs require `self-hosted` and
`tactics-browser`, with `runner` set to `tactics-browser-01` or
`tactics-browser-02` (default `tactics-browser-01`). In `pilot` and `capture`,
the selected unique label pins preparation, batches and aggregation to one VM;
do not give both VMs the same unique label.
The shared per-runner concurrency group reserves that VM across job boundaries,
while an independent run selecting the other VM can execute concurrently.
Push-triggered full verification has no dispatch inputs and selects VM 01.
`max-parallel: 1`, one Playwright worker and `fail-fast: false` keep browser jobs
serial without starving later jobs
after an ordinary test failure. Manual runs are not automatically superseded;
cancel an obsolete run explicitly. PR verification checks the current PR head before
canceling queued or running verification for other commits of that PR, including
reruns. Each PR job also rechecks the head before runner setup, which handles a
job-only retry that reuses an earlier cancellation check. All verification
jobs share VM 01's reservation with the other browser workflows. The per-VM group uses `queue: max` and
`cancel-in-progress: false` to preserve up to 100 waiting jobs or runs. Beyond
that bound, new entries are canceled.

Before using this workflow, an administrator must add `tactics-browser-01` only
to VM 01 and `tactics-browser-02` only to VM 02, alongside the shared labels, and
qualify each VM. These custom labels are not inferred from runner names. A missing
label leaves jobs queued; do not add it to another VM to unblock an existing
baseline. Keep one runner service per VM, with separate workspaces and browser/
tool caches. Existing receipt checks still reject runner/runtime/browser drift.

## Two-runner pilot

Run `qualify` from `main` on both labeled VMs first. Confirm the labels map one-to-one to
`unraid-tactics-01` and `unraid-tactics-02`, the VM clocks are synchronized, and
their CPU/RAM assignments and GPU or software rendering arrangements are known.
Keep unrelated load steady and run the pilot outside performance-collection
windows. Record the actual conditions in the workflow input.

Dispatch `parallel-pilot` with an empty batch filter. The runner choice is
ignored in this mode. VM 01 prepares the build, runs Chromium and aggregates
results. VM 02 runs WebKit. Both browser jobs take the normal per-VM reservation
and use one worker. Each job first validates its source, build, browser versions
and discovery, samples its clock against the Actions API, then uploads a
readiness artifact scoped to the current run and attempt. Both jobs wait up to
four minutes for both artifacts and use a common release time ten seconds after
the later upload. Receipts retain VM identity,
browser executable paths, source/build hashes, coverage, failures and cleanup
diagnostics. Each parallel batch records local request timestamps and the
Actions API's HTTP Date from preflight and takes a second sample after browser
execution. Both pilot modes pin the same Node patch and use matching packaged
browsers and dependency versions.

Run `pilot` on VM 01 at the same commit for a serial reference. Compare
job wall span, completed Actions compute, individual stage wall and scheduler
timestamps. The parallel aggregate reports the largest lower bound on overlap
between two passing cases in the same attempt. It accounts for HTTP Date
precision, round-trip time and the range of offsets measured before and after
each batch. Keep the VM clocks synchronized throughout the pilot. Dispatch a
fresh pilot if one runner misses the rendezvous.

These bounded results qualify the shared artifact and scheduler path. A representative
contention comparison with broader batches, production capture isolation and a
full-suite measurement against #200 remain part of #208.

## Coverage and build provenance

`scripts/verification-batches.mjs` derives 15 timing rows from the
14-stage `verify-full.mjs` plan. Preparation runs tooling, fast units (including
content), both TypeScript scopes, real build integrations and the root bundle.
It uploads that ordinary root output once, with source/input identity, a complete
per-file SHA-256 inventory, the discovery plan and preparation receipts. Every
consumer verifies the plan, exact checkout/input hash and downloaded build bytes
before copying `dist`. Builds from another commit, altered/missing files and
stale local `dist` are rejected.

Nine whole-file groups partition Dungeon and shared menu and asset cases across
the three Chromium profiles. Fresh discovery verifies their exact union with the
current canonical selection and rejects missing, extra or duplicate test IDs.

The other browser jobs cover WebKit menu and Dungeon and root-dev assets. `prefix-assets` runs the canonical prefix build,
prefix preview/dev consumers and final root restoration in one job. Failed prefix
builds block only their preview consumer; dev coverage and eligible root
restoration still run. Failed preparation
gates block their consumers; independent dev asset coverage can still run from
the retained preparation report.

Each batch has its own 65-minute foreground budget and 85-minute job ceiling,
including setup/upload allowance. The existing one-hour subprocess limit and all
product/test deadlines remain unchanged. There is no 100-minute parent shell over
the whole matrix. Matrix ordering is not a scheduling guarantee; select a partial
set explicitly when prioritizing missing landscape or tail coverage.

## Receipts, failures and resume

Every invocation writes a new receipt directory. Browser stages retain final
JSON, per-case JSONL checkpoints and Playwright blob ZIPs, as well as process logs,
cleanup diagnostics, test outcomes/skips/retries and slowest-case/file summaries.
Missing final reports or interrupted JSONL are incomplete evidence, never passes.
Ordinary failures allow other jobs to continue. A failed cleanup records a
persistent `RUNNER_TOOL_CACHE/issue208-unsafe-host` marker; qualification, serial
jobs and the separate browser-setup/process-cleanup workflows refuse
execution until an administrator inspects owned workloads and clears it. The
marker survives job temp-directory cleanup. Stage and evaluator cleanup failures
stop subsequent work even if writing the marker fails; the receipt retains the
cleanup diagnostics and marker-write error, and requires manual runner inspection.
The local CLI also shares the timing
capture lock with the original timing tool; inspect stale locks before removal.

Build artifacts, per-batch receipts and aggregates are retained for 30 days.
Artifact names include run ID, batch and attempt. For serial modes, resume an
interrupted or failed run by rerunning the affected jobs:

```sh
gh run rerun RUN_ID --failed --repo luminari-gurus/tactics-guru-v2
gh run rerun RUN_ID --job JOB_ID --repo luminari-gurus/tactics-guru-v2
```

GitHub reuses successful preparation outputs and reruns downstream aggregation.
The collector downloads every retained batch attempt from that run, validates
source/build/plan/runner/browser provenance, chooses the latest attempt per batch,
and keeps prior outcomes in `history`. A successful explicit rerun can recover the
current result; its earlier failure remains visible. Missing, malformed, duplicate
or mismatched receipts fail the stable **Serial verification aggregate** check.
The aggregate also checks the latest Actions job execution timestamps: a newer setup or
upload failure without a receipt cannot fall back to an older passing artifact.
If that Actions API check fails, CI fails closed instead of guessing success.
GitHub copies successful job snapshots into a new attempt during a targeted
rerun; those copied attempt numbers are not evidence of re-execution. Receipt
timestamps must fit the actual job interval. Identical execution intervals are
counted once for compute, and copied snapshots cannot create negative queue time.
Reports merge by canonical stage and case ID/project; intentional coverage of the
same test in different root/prefix/dev modes is not deduplicated. Native blob ZIPs
remain separate so a cross-mode HTML merge cannot overwrite those distinctions.

Resuming the same run requires unchanged source and the original build artifact.
After source changes or artifact expiry, start a new plan. In `parallel-pilot`,
`parallel-pair` and `parallel-full`, both batches must publish readiness in the same attempt.
Dispatch a fresh run or rerun all jobs together. A targeted rerun of one batch
will time out waiting for its peer's readiness artifact.

A new targeted dispatch is partial and covers only that dispatch. Preserve raw
artifacts beyond expiry if review or a baseline obligation still needs them.

## Timing and performance acceptance

The aggregate artifact includes a compact stage/count table and schema-two
`timing-report.json` for the existing comparison CLI. Chromium stage time sums its
nine invocations; setup/preflight remains separate. Compare equivalent serial
plans, not a partial monolith against a complete batched run:

```sh
npm run measure:verification -- compare before/timing-report.json after/timing-report.json
```

The export preserves canonical stage rows and selected IDs. Different batch plans
warn about coverage; missing/failed rows cannot receive a passing speedup.

Each receipt separates setup from execution and records host/runtime/browser
identity, load, commands and conditions. Browser preflight warms caches in every
job. The aggregate includes job wall time, total attempt time and Actions API
timestamps/compute, including earlier attempts. Creation-to-start includes
scheduling/dependency delay; unavailable scheduler data is disclosed rather than
invented. API totals exclude the still-running aggregate job. Per-runner cross-workflow
locking does not establish that unrelated host workloads are idle; coordinate
those separately and document them in `conditions`.

Full capture runs the standalone proof-scene collector and evaluates the
source-bound samples against the documented budgets. The evaluation JSON and
its exit status are recorded separately. The budget failures from PR #225 and
earlier failed runs remain in the historical receipts.

`complete` describes accounted execution/coverage; `passed` also requires all
current gates to pass. `baselineEligible` additionally requires a full scope and
clean source. A pilot or subset can pass only its selected scope. No complete,
comparable historical baseline exists for a speedup ratio. Serial packaging does
not claim the epic's <=15-minute target: Chromium alone was estimated at about
83 minutes of test work in the historical investigation. #200 remains open until
the actual current-source coverage/timing ledger and failures are dispositioned.
True parallelism and its contention/capacity experiment remain #208 phase B.

Local discovery and contracts (no gameplay execution):

```sh
npm run test:verification-batches
npm run verify:batches -- discover verification-receipts/serial/discovery
```

For deliberate Actions execution, select the workflow's `pilot` or `capture` mode,
record host conditions and inspect its aggregate. Start with the bounded pilot
before launching expensive full coverage after changes to this tooling.


### Matched two-runner comparison (#208)

Dispatch `serial-pair` and `parallel-pair` separately on the same commit, leaving
`batches` empty and `extra_job` at `none`. Each mode runs the complete
`chromium-desktop-2` batch on VM 01 and `webkit-acceptance` on VM 02. The
serial control allows one active batch at a time. The parallel arm allows two
and requires clock-bounded overlap between passing browser cases. Each arm
builds once and restores its verified bundle for both batches.

Compare the source SHA, build digest and per-batch case-ID and outcome digests
in the run summaries. The outcome digest includes each project's outcome for
each case, so matching skip counts alone cannot hide different skipped cases.
If the digests differ, compare case outcomes in the aggregate's `summary.json`.
Use run creation to final completion for end-to-end time and sum completed
non-skipped job durations for runner time, including preparation, setup, retries
and aggregation. Report queues and outside runner load alongside the results.
Only comparable passing runs can support a speedup for this pair. The full-suite
target still requires broader coverage.
