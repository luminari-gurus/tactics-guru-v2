# Issue #127 performance repair evidence

## PR #129 review repair (2026-10-18)

Both reported evaluator defects reproduced before repair: the new regressions failed in three cases. Repair `3fe5a53` gates initial idle p50/p95 independently of the final snapshot and exclusively creates CLI output (`wx`), refusing existing paths including Windows case and hard-link aliases. Raw captures are unchanged. The original run capture also contains an initial landscape repetition-3 **cold** p50 of 16.799999952316284 ms; the old final-only report concealed that F1 violation, although the same sample already failed L3. Cold/warm initial failures and the final warm failure are now retained separately; the original total remains 10 failing run samples.

Fresh local proof: `node node_modules/vitest/vitest.mjs run tests/unit/measurements.test.ts tests/unit/measureFitOptions.test.ts` passes 39 tests, including initial-only p50/p95, final-only failure, CLI alias refusal, byte preservation, new-output creation, and historical gates. Both `tsc --noEmit` configurations, strict OpenSpec, and `git diff --check` pass. These script-only changes do not alter the served runtime. Publication uses a forward commit on the existing PR branch; downstream carries follow in order. No new browser timing capture is claimed.

Updated 2026-10-17 (Asia/Jerusalem). Work in progress; no deployed acceptance or runtime remedy is claimed yet.

## Authority, source and scope

The caller authorized implementation of [the plan](../ongoing-projects/plan.md), OpenSpec, ablation and focused review-ready PRs. `origin/main` was refreshed at `0b317e35bb5c4ce713c242311f0673fc27923637`; task branch `work/issue-127-performance-budgets` began clean at `c4ec0d0`. Main's runtime is unchanged by that planning commit. A clean detached main checkout at `tmp/baseline` supplies the local comparison build. PR #119 remains open at `2b419eff2f4183c3e9357d45b75caaeceb12bc70`; issue #128 is separately assigned to `florysaxz`, while #127 remains assigned to `moshehbenavraham`.

Host: Windows x64, Node 24.19.0, Playwright Chromium **153.0.8010.12**; detailed OS/CPU and source hashes are in [retained-hashes.json](issue-127-performance-budgets/retained-hashes.json). Browser identity is recorded in each new receipt. This host differs from the retained macOS capture: a new passing sample cannot establish a causal fix for that historical idle outlier.

The application lockfile was installed with npm 12.0.2 (`npm ci --ignore-scripts`, 44 packages, no audit vulnerabilities). An ignored `tmp/bin/npm.cmd` supplies the installed CLI missing from PATH. No dependency or lockfile change is made. OpenSpec runs via the installed Node entrypoint at `C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js`.

## Retained evidence verification

The five original Git blobs (collector, evaluator, battle/run JSON and gates) exactly match `device-acceptance-2026-10-17/validation.json` SHA-256 values. Windows checkout CRLF conversion changes text-file hashes, so `git show HEAD:<path>` restores the exact recorded bytes into ignored `tmp/device-acceptance/`. The committed original evidence is unchanged.

The original Python evaluator was copied with only its three fixed `/tmp` paths replaced by scratch input/output paths. Running it with the bundled Python 3.12 and comparing parsed output using Node `assert.deepEqual` reproduces the committed gates exactly: 18 samples per route; all 9 cold battle and 9 cold run samples fail L3; run mobile-landscape repetition 3 warm additionally fails idle p50 at **16.799999952316284 ms**. This is retained-data analysis, not a fresh reproduction.

## Live work and pending proof

Current-main baseline build passed content validation, both typechecks and Vite production build. Its shared start chunk is about 1,520 kB decoded (Vite estimates 399.32 kB gzip); these are build observations, not measured transfer acceptance. The existing >500 kB warning remains. The capture validator subsequently rejected the first baseline artifact because content validation rewrote a snapshot from CRLF to LF and the build baked `dirty: true`. `git diff` confirms no normalized content change. Those complete attempted captures are retained as invalid evidence; restoring the task-generated snapshot rewrite and rebuilding without rerunning the already-passed content check provides the clean baseline.

The existing deployed origin now identifies itself as clean main `0b317e3`, not historical release `13418626`. No deployment was performed. Its current HTML therefore cannot reproduce the historical build. The exact original receipts remain preserved and independently reevaluated.

An initial fresh 18-sample battle capture with the retained collector evaluated to **17 budget-failing samples, zero capture failures**. The first cold navigation took 3551.7 ms, and the common start request transferred 399,576 bytes. A run capture also completed 18 samples, but both raw files were inadvertently removed by Playwright's automatic `test-results/` cleanup before archival; the run was not evaluated. Those attempts cannot establish acceptance, and their full distributions are unavailable. Subsequent complete captures go directly under this QA directory, outside Playwright cleanup. They are new runs, not replacements for individual failing samples. The original historical evidence was unaffected.

Collector changes preserve proof default, recognize root/prefixed run paths, use real run-start controls, and clear only four v2 save slots in collector-owned warm contexts. Existing top-panel gesture coordinates remain appropriate on current main; both drag endpoints now must hit the canvas. PR #119's different HUD is not integrated. Each new capture records collector hashes and passive response headers (encoding/status/length/cache policy) without request interception. The evaluator requires complete unique matrices, clean consistent idle/final build identity, valid raw nearest-rank frame summaries, first-usable timing, navigation/code inventory and real workloads; it retains every numeric violation.

Focused measurement tests: **36 passed**. Both TypeScript configurations passed. Root production browser asset/route suite: **45 passed**, no skips/retries/failures; this includes the real cold/warm battle/run collector controls and legacy-key preservation. [Browser report](issue-127-performance-budgets/collector-browser-root.json). Strict OpenSpec and whitespace checks passed.

## Complete baseline captures

All matrices below contain 18 samples (desktop/portrait/landscape × repetitions 1–3 × cold/warm), captured sequentially without another browser test or profile launched by this session. The host is shared; no claim of OS-wide workload isolation is made. Collector sources [v1](issue-127-performance-budgets/collector-v1/measure-fit.ts.txt) and [v2](issue-127-performance-budgets/collector-v2/measure-fit.ts.txt), including all four imported script hashes, are archived byte-for-byte. V2 centralizes startup checks in the evaluator, binds source identity before capture, and correctly labels loopback cache conditions; gestures, frame sampling and limits are unchanged.

- **Clean local main, gzip over loopback:** [battle raw](issue-127-performance-budgets/baseline-battle.json) / [gates](issue-127-performance-budgets/baseline-battle-gates.json): 407,286 cold code bytes in every sample; worst usable 830.6/741.5 ms cold/warm; worst idle p50 16.7 ms. 12 samples fail (all nine cold transfer samples, plus movement p95 failures). [Run raw](issue-127-performance-budgets/baseline-run.json) / [gates](issue-127-performance-budgets/baseline-run-gates.json): 415,497 cold code bytes; worst usable 857.7/842.9 ms; worst idle p50 16.7 ms. 12 samples fail across code, movement and warm loading. Both matrices have zero capture-validation errors and every idle gate passes.
- **Fresh deployed main, Brotli responses over HTTPS:** [battle raw](issue-127-performance-budgets/deployed-main-battle.json) / [gates](issue-127-performance-budgets/deployed-main-battle-gates.json): cold code 408,990–409,245 bytes, 17 failed samples; [run raw](issue-127-performance-budgets/deployed-main-run.json) / [gates](issue-127-performance-budgets/deployed-main-run-gates.json): 417,439–417,756 bytes, 18 failed samples. Both retain additional warm-loading, movement-p95 and 16.8 ms idle-median failures, with zero capture-validation errors. They are current-main evidence, not a reproduction of the old `13418626` build.
- **Rejected dirty baseline attempts:** [battle](issue-127-performance-budgets/baseline-dirty-battle.json) and [run](issue-127-performance-budgets/baseline-dirty-run.json), with adjacent `-gates.json` files, retain all 36 samples. They are excluded from clean-build acceptance, not erased or replaced sample-by-sample.

[Module inventory](issue-127-performance-budgets/baseline-modules.json) confirms that the shared startup chunk includes all three scenes, ProofBoardRenderer, ProofAudio and proof-only fixtures. Phaser's bundled ESM module is the dominant contribution. [Build-file hashes](issue-127-performance-budgets/baseline-build-files.json) bind the clean local `dist` (71 files); absolute module IDs identify the baseline worktree. Vite's per-module rendered lengths are pre-final-minification contributions, not independently additive gzip savings.

Exact capture pattern (run each route sequentially; all file paths below are beneath this QA directory):

```sh
node --experimental-strip-types scripts/measure-fit.ts docs/qa/issue-127-performance-budgets/baseline-battle.json --scene battle --url http://127.0.0.1:4174/
node --experimental-strip-types scripts/measure-fit.ts docs/qa/issue-127-performance-budgets/baseline-run.json --scene battle --url http://127.0.0.1:4174/run
node --experimental-strip-types scripts/measure-fit.ts docs/qa/issue-127-performance-budgets/deployed-main-battle.json --scene battle --url https://tactics-guru-v2.pages.dev/
node --experimental-strip-types scripts/measure-fit.ts docs/qa/issue-127-performance-budgets/deployed-main-run.json --scene battle --url https://tactics-guru-v2.pages.dev/run
node --experimental-strip-types scripts/evaluate-fit.ts CAPTURE.json EVALUATION.json
```

The evaluator exits 1 on numeric failures as well as invalid captures; a collector exit 0 only establishes a complete valid capture, not passing budgets. Compare all row violations. Requests made after initial usable timing remain in the final inventory.

The first prefixed-route test invocation ran zero tests because another task's `merge-pr119` preview occupied port 4173. Its [error report](issue-127-performance-budgets/collector-browser-prefix-port-conflict.json) is retained; that process was not killed. An ignored configuration inherits the original test projects/settings and changes only test/output paths and the preview port to 4187. This configuration is also used when the shared default port is unavailable during final validation.

The prefixed test then reproduced a real URL-parser bug: stripping the trailing slash from `/tactics/` navigated to the wrong document on Vite preview (three battle cases failed, all three run cases passed). The [failed report](issue-127-performance-budgets/collector-browser-prefix-before-fix.json) is preserved. Collector v3 preserves path trailing slashes while keeping origin-root compatibility; it adds no change to root battle/run timing, gestures or frame limits. The [final prefix run](issue-127-performance-budgets/collector-browser-prefix.json) passes all **6 cases**, no retries/skips. [Exact v3 source](issue-127-performance-budgets/collector-v3/measure-fit.ts.txt) and [isolated-port configuration](issue-127-performance-budgets/playwright-owned.config.ts.txt) are retained. Both typechecks and 36 focused unit tests pass after the repair.

Collector chunk is complete and ready for review. Next: the measured scene-import split and the final functional/performance proof. No causal fix is assigned to the idle outlier. No deployment or release tag is authorized by this work.

## Current-main collector integration

PR #119 merged as `a009a3ec4c35b3e57adc58ac700e56721af9ae8f` during the runtime follow-up. This branch merges that exact main without changing its reviewed runtime files. The only merge conflict was the handoff: the #127 plan is retained above the latest upstream handoff.

The maintained collector now obtains its zoom/drag anchor from the actual `#battle-board-region` used by the responsive renderer/input gate. Its top-panel fallback is retained for the already-recorded older builds. Existing actual-control tests exercise zoom and pan on both battle/run routes, including prefixed deployments. A confirmed validation defect is also fixed: the interrupted/uninterrupted persistence comparison uses the configured `baseURL` for both pages and asserts matching served build identities, rather than silently opening another worktree on port 4173.

Fresh integration checks: 36 focused measurement tests, both typechecks, production builds, [12 root cases](issue-127-performance-budgets/collector-responsive-root.json) (six collector + six corrected persistence comparisons), and [six prefixed collector cases](issue-127-performance-budgets/collector-responsive-prefix.json) all pass with no retries/skips. Browser checks use installed Edge 155.0.4283.45 through the existing executable override. Exact collector v4 receipts are retained. Runtime optimization, fresh complete performance matrices and the active implementation handoff remain in [PR #130](https://github.com/luminari-gurus/tactics-guru-v2/pull/130); older `0b317e3` measurements are not claims about this updated main.
