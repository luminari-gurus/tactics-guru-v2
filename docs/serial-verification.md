# Resumable serial verification (#208 phase A)

The manual `issue-200-baseline.yml` workflow now has three modes:

- `qualify` (default): bounded tooling, diagnostics, build, two-engine smoke and
  timeout-recovery checks. It does not launch a baseline.
- `pilot`: prepare the real root artifact and exercise its download/verification
  in two separate serial browser jobs: the default three-profile boot/resize case
  and the setup WebKit boot/resize case. The aggregate is explicitly partial.
- `capture`: prepare once, then run all 19 serial jobs, or a deliberately selected
  comma-separated `batches` subset. A subset cannot qualify the full baseline.

Only trusted manual dispatch on `main` or `work/issue-208-serial-batches` can run
the serial pipeline. No PR/fork trigger, privileged OS install, hosted fallback,
release publication or deployment is introduced. The old qualification branch is
also allowed for `qualify`. All jobs use `[self-hosted, tactics-browser]` and one
workflow-wide `tactics-browser-exclusive` lock. `max-parallel: 1`, one Playwright
worker and `fail-fast: false` keep browser jobs serial without starving later jobs
after an ordinary test failure. Manual runs are not automatically superseded;
cancel an obsolete run explicitly. No automatic PR jobs need cancellation.

## Coverage and build provenance

`scripts/verification-batches.mjs` derives the 20 timing rows from the existing
19-stage `verify-full.mjs` plan. Preparation runs tooling, fast units (including
content), both TypeScript scopes, real build integrations and the root bundle.
It uploads that ordinary root output once, with source/input identity, a complete
per-file SHA-256 inventory, the discovery plan and preparation receipts. Every
consumer verifies the plan, exact checkout/input hash and downloaded build bytes
before copying `dist`. Builds from another commit, altered/missing files and
stale local `dist` are rejected.

The historical nine whole-file/project groups from the #200 investigation supply
the Chromium partition. They are not test-level shards and do not alter fixtures,
assertions or project configuration. Fresh discovery must prove their exact union
equals the current canonical selection, with zero missing, extra or duplicate IDs.
At main `b749ba4`, this includes **693** cases (231 per profile), not the historical
687. WebKit exploration similarly now selects 57 cases rather than 51.

The other jobs retain fixtures, explicit dev placement, both WebKit matrices,
health bars, separate production/development telemetry, root dev assets and the
local performance collector. `prefix-assets` runs the canonical prefix build,
prefix preview/dev consumers and final root restoration in one job. Failed prefix
builds block only their preview consumer; dev coverage and eligible root
restoration still run. Telemetry retains its own configured build/server, rather
than treating the ordinary artifact as its instrumented build. Failed preparation
gates block their consumers; independent dev/telemetry coverage can still run from
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
Artifact names include run ID, batch and attempt. To resume an interrupted or
failed run, rerun the failed job(s), not the entire workflow:

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
After source changes or artifact expiry, start a new plan. A new targeted dispatch
is partial, not an implicit combination with old runs or hosts. Preserve raw
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
invented. API totals exclude the still-running aggregate job. Cross-workflow
locking does not establish that unrelated host workloads are idle; coordinate
those separately and document them in `conditions`.

The performance job runs both the collector and the existing `evaluate-fit.ts`.
Collection success alone cannot pass a sample that violates unchanged performance
limits. Evaluation JSON and its nonzero result are retained separately. The two
budget failures in PR #225's Windows capture remain historical failures; that
capture is not a self-hosted comparison baseline. Both earlier 100-minute failed
captures and the hosted failure remain recorded in every aggregate.

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
