# Issue 206: deduplicate build validation

Base: `3510d1e3db8814b9111b76676e8413c90dedb8a5` (includes #214).
The caller requested the next unblocked performance-epic task; #206 depends only
on completed #201. Browser qualification and #200 remain separate blocked work.

## Change and coverage

- `test:unit` selects 907 unit/content cases without real Vite builds.
- `test:build` selects the two real root/prefix build integrations, moved without
  changing any bytes or assertions. `test:unit:all` retains the complete union.
- Runtime project/file/title comparison preserves every one of the previous 909
  cases, accounting only for the build test's directory move. Static discovery
  also preserves all 455 declarations in the deliberate all-checks command.
- Full verification has 19 stages. It runs units/content once, both type scopes
  once and build integrations once. Root, prefix and restored-root ordinary
  bundles depend on successful units and types. Independent dev/telemetry
  coverage continues after failures; telemetry keeps its distinct safe build.
- Standalone `npm run build` remains unchanged and validates content plus both
  type scopes. No app source, dependencies, browser config, timeout or retry
  settings were changed. The historical PR-213 workflow uses the new build-test
  entry point instead of a removed path.

## Validation and retained failures

[Machine-readable results](validation.json) retain exploratory command timings,
counts and failures; [input hashes](source-hashes.json) identify the candidate.
Node 24.19.0, Vite 8.3.5, Vitest 5.0.3, Linux x64 shared container; two unit
workers, zero retries and unchanged five-second test timeout. These are local
compatibility checks, not #200's qualified-host baseline. Existing pinned
dependencies were reused through an uncommitted local symlink.

- Ten orchestration contracts passed, including prerequisite blocking,
  continuation, one validation pass and independent telemetry.
- Both real build integrations passed; both TypeScript scopes passed.
- Fresh safe standalone build passed: 221 content checks, both type scopes and
  production bundle.
- Exact base full run: 908 passed / 1 timeout out of 909. The unchanged
  `runBattle` legal-defeat case exceeded five seconds. Three safe standalone
  root/prefix/restoration builds passed (22.993s, 24.387s, 23.571s).
- Candidate fast-unit full run: 905 passed / 2 timeouts out of 907. `runBattle`
  timed out again; the telemetry accepted-defeat case also timed out under the
  full two-worker workload. Both build integrations passed separately.
- Focused literal-base comparison reproduced `runBattle` timeout; telemetry
  passed. Candidate focused execution with one worker had the same disposition.
  This establishes the base `runBattle` limitation, not a clean candidate full
  unit pass or a causal explanation for the telemetry full-run timeout.
- The candidate's actual CPU-stage execution correctly marked all ordinary
  bundles blocked after failed units, while types and integrations still ran.
  That failed/incomplete run remains nonzero; no stage was forced green.

## Work removed and readiness

The ordinary aggregate previously invoked the 221-case content selection four
times and each TypeScript scope three times. It now invokes them once: **663
duplicate content case executions and four compiler invocations removed**. Both
real build integrations and mode-specific bundles remain. Telemetry duplication
is intentionally retained because its build configuration differs.

The failed base/candidate timing runs do not support a passing before/after
speedup percentage or the epic's full-regression target. Passing complete CPU
qualification is still required before merge. A scoped CPU-only hosted workflow
is prepared for this branch; the publication commit skips CI while awaiting
explicit caller approval. No hosted job, browser run or performance capture was
started for #206. The self-hosted plan remains unchanged.
