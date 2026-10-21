# Issue #200: verification timing tooling

Implementation: `b992b4be85a4beb8f375cd1a048ae28d5782bbbf`, based on main `162034997ed5fd0f3788531a4217b1b010b4dd27`.
Caller approved the concrete plan and publication of this validation summary on 2026-10-21. Parent epic: #199.

## Disposition

Tooling implemented; **full comparable baseline remains incomplete**. Keep the PR draft and issue open until a provisioned browser host captures the matrix and the recorded failures are dispositioned. No application source, existing assertions, worker limits, retries or product performance thresholds changed.

## Validation

- Six Node tooling tests pass: report normalization, retry/failure preservation, malformed input, comparisons, prerequisite expansion, child nonzero exits/timeouts and missing executables.
- A real Playwright reporter contract (no browser fixture) produced exactly one pass, one intentional failure, one intentional flaky result and one skip, with two retry attempts. The normalizer retained all counts, one configured worker and timing fields. This fixture uses retries to test reporting; production suite retries are unchanged. Its first read used the wrong relative output location; reading the actual config-relative file corrected the harness without changing reporter code or rerunning the fixture.
- Playwright discovery lists 675 cases in 27 files; listing is not browser execution.
- Both TypeScript scopes pass on the frozen implementation. Syntax and Git whitespace checks pass.
- The earlier tooling-qualification run passed 190 content checks and Vite bundling; unit tests recorded 826 passes and two timeouts. Reporting code was still being edited, and source-change detection marks that receipt unsuitable as a baseline. It is retained as qualification evidence, not a second accepted benchmark.
- The final capture below started from a clean implementation commit and verified unchanged relevant input hashes through completion. A pre-existing unit test writes `docs/qa/procedural-grids/simulations.json`; that generated diff was restored after capture and is not part of this PR.

## Frozen capture

Host: Node v24.19.0, Linux x64 container, 9 reported CPUs. Cache conditions: Linux x64 container; locked dependencies installed; warm build/unit caches after tooling qualification; browser preflight outside stage timings; no concurrent workloads.
Total runner wall time: 137.37s. `complete=false`, `passed=false`, `inputsUnchanged=true`.
Input hash: `dac57305747500cf60f24f70697745558e4aa9ef81f0ba8e81e05c4547fbfafc`.

| Stage | Result | Seconds | Counts |
| --- | --- | ---: | --- |
| content | failed | 37.00 | {"total": 190, "passed": 188, "failed": 2, "pending": 0, "todo": 0} |
| typecheck-app | passed | 2.59 | {} |
| typecheck-domain | passed | 0.40 | {} |
| bundle | blocked | 0.00 | {} |
| unit | failed | 95.72 | {"total": 828, "passed": 811, "failed": 8, "pending": 9, "todo": 0} |
| chromium | blocked | 0.00 | {} |
| encounters | blocked | 0.00 | {} |
| items | blocked | 0.00 | {} |
| webkit | blocked | 0.00 | {} |
| telemetry | blocked | 0.00 | {} |

The two content failures are 5s timeouts in authored encounter survivor fixtures. The final unit run has eight timed-out tests and a battleStorage beforeAll hook timeout leaving nine skipped tests. These are failures of unchanged game tests on this host; no application regression cause or causal fix is claimed. Every original failure is retained in raw JSON/logs. The bundle correctly did not use stale output after failed content validation.

Chromium download attempts returned invalid ZIP archives; its expected executable is absent. WebKit 26.6 downloaded via the installer's fallback mirror, but the container lacks required system libraries. Actual browser launch preflights fail, so browser suites are explicitly blocked. There is no claim of actual browser-suite acceptance or timing.

Comparison was exercised against qualification/final receipts and reports changed conditions/source, incomplete runs, missing stages and changed outcomes. These are not comparable passing runs and no speedup is claimed.

## Receipts and remaining action

Only this validation summary is published, as approved by the caller. Raw JSON/log receipts remain in the local ignored `test-results/timings/` directory and are not included in this PR. Those local receipts are transient; readers cannot inspect them from this PR. Reproduction on a provisioned host and durable retention of its receipts remain outstanding.

On a supported host with the locked dependencies and Chromium/WebKit plus OS libraries installed, run:

```sh
npm run test:verification-tooling
npm run measure:verification -- --out test-results/timings/provisioned-baseline --conditions "describe host load and cache state"
```

Retain failures rather than weakening tests. The implementation's [capture guide](../../verification-timings.md) describes reproduction, comparison, partial results and artifact retention. Refs #200; no issue closure or deployment.
