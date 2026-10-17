# Issue #127 performance repair evidence

Updated 2026-10-18 (Asia/Jerusalem). **Cold-code repair verified; deployed loading gates remain open.** The accepted runtime head is `f28f331`; the evidence below distinguishes completed checks from remaining work.

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

Collector chunk is published ready for review in [PR #129](https://github.com/luminari-gurus/tactics-guru-v2/pull/129) at `6477ac5`, with clean Git status and local/remote parity. The configured Cloudflare integration automatically created a branch preview; no deployment command, production configuration change or release tag was issued.

## Scene-isolation experiment (not retained)

Branch `branch/issue-127-scene-loading` depends on #129. `createGame.ts` imports no scenes and preserves the existing engine/audio configuration. Single-battle startup awaits only the selected scene and retains existing error, restart and BFCache behavior; authored runs import the engine helper directly. Both typechecks and the production build pass. The [focused browser run](issue-127-performance-budgets/split-browser.json) passes **84/84 cases** without retries/skips: boot, independent scene loading, missing selected chunks, content loading/failures and public asset bases/controls. The [split module inventory](issue-127-performance-budgets/split-modules.json) confirms separate proof/content-smoke chunks.

The exploratory [battle](issue-127-performance-budgets/split-probe-battle.json) and [run](issue-127-performance-budgets/split-probe-run.json) probes transferred **407,063 / 414,354 bytes**, saving only 223 / 1,143 bytes. They each contain one desktop cold sample and are correctly rejected as incomplete matrices. [Exact probe source](issue-127-performance-budgets/split-probe.ts.txt) differs from the maintained collector only by the one-sample limit, scratch imports and its own hash. The actual scene-split artifact is clean commit `6c18fa7a30f68f7f6480fa7ae6416e90b913443e`.

### Revised remedy and ablation

The final branch is `branch/issue-127-runtime-budget`. Revert the scene-start experiment and select the pinned package's stock `phaser-arcade-physics.js` via one exact Vite alias. That distribution excludes Matter.js and retains the APIs, audio and both renderers the game uses. No source under `src/` consumes Phaser physics. The shipped package's own entry/configuration establishes this boundary; no custom engine, dependency upgrade or vendor edit is involved.

This removes the new async startup boundary, engine-creation module and extra chunk requests. Existing game initialization, restart, BFCache and audio recovery code remains byte-identical to the collector PR. The initial stock-distribution build estimates 365.98 kB gzip for the shared start chunk, versus 399.32 kB baseline; this estimate is not acceptance. **696 unit tests, 167 content checks, both typechecks, production build and 18 boot checks pass** (including every route's missing-engine error and real Canvas fallback). Full functional checks, separate profiling and complete candidate matrices are next. No causal fix is assigned to the idle outlier.

### Separate idle/lifecycle profiles

The final runtime candidate is clean `b9108cb7e978119592c2986ab6d5259a4ff600ec`, published as [PR #130](https://github.com/luminari-gurus/tactics-guru-v2/pull/130), stacked on #129. The existing Cloudflare integration automatically created [its exact preview](https://71112cea.tactics-guru-v2.pages.dev/); this task issued no deployment command or production change.

Before browser regression/acceptance runs, [profile-run.mjs.txt](issue-127-performance-budgets/profile-run.mjs.txt) captured a separate 5-second CPU profile of the warm run at 915×412, then three real new-run/encounter restarts with explicit GC before DOM counter snapshots. [Baseline summary](issue-127-performance-budgets/baseline-profile.json) / [CPU trace](issue-127-performance-budgets/baseline-profile.cpuprofile) and [candidate summary](issue-127-performance-budgets/candidate-profile.json) / [CPU trace](issue-127-performance-budgets/candidate-profile.cpuprofile) are diagnostic evidence, **not acceptance samples**.

Both traces report clean served identities, no browser errors, unchanged serialized battle state across the idle window, and the same listener progression: 154 before restart, then 155/155/155. This does not show a growing DOM-listener leak over the measured three restarts. Both report ANGLE/SwiftShader software rendering. Neither trace identifies a repeated application/diagnostic hot path sufficient to attribute the retained 16.8 ms outlier; these observations do not establish a host-scheduler or renderer root cause.

The [baseline](issue-127-performance-budgets/baseline-profile.png) and [candidate](issue-127-performance-budgets/candidate-profile.png) warm landscape screenshots are byte-identical (SHA-256 `56a657849210241a39d197dea781e9e9fe609b8ceca7b0561934ce59bdf50c40`) and visually inspected. Accordingly no speculative hot-path change, timer adjustment, percentile change, sample filtering or budget relaxation is selected. Final uninstrumented matrices will retain any recurring frame/loading failures explicitly.

## Pre-integration regression run and environment diagnosis

These runs tested runtime `b9108cb`, before main advanced with PR #119, and remain historical evidence:

- [Chromium 153](issue-127-performance-budgets/pre-main-browser.json): 449 passed / 25 failed, no skips/retries. Failures are 21 cached-history assertions and four interrupted/uninterrupted comparisons. All six comparison cases (including two that passed) are invalidated because their control page hard-coded another worktree's port 4173.
- [Encounter posttests](issue-127-performance-budgets/pre-main-encounters.json): 18 passed; [item posttests](issue-127-performance-budgets/pre-main-items.json): 21 passed.
- [Windows WebKit](issue-127-performance-budgets/pre-main-webkit.json): 46 passed / 8 failed. Four failures concern unavailable audio; four use the same wrong-origin comparison fixture.

Cached-history failures reproduce on unchanged full-Phaser baseline in packaged Chromium 153 and pass on installed Edge 155.0.4283.45. Both an animation and a persistence baseline case were checked, with all [nine candidate animation-history cases](issue-127-performance-budgets/bfcache-candidate-edge-all.json) passing in Edge. The downloaded full Chrome binary could not launch; those attempts are retained. No game behavior is changed to bypass these browser differences.

[Windows WebKit capabilities](issue-127-performance-budgets/webkit-windows-capabilities.json) report no AudioContext. The full-Phaser current-main baseline also [fails its initial audio expectation](issue-127-performance-budgets/webkit-windows-baseline-audio.json), so this is not attributed to the Arcade distribution. The same official WebKit 26.6 in WSL has [Web Audio support](issue-127-performance-budgets/webkit-linux-capabilities.json) and [passes that baseline audio case](issue-127-performance-budgets/webkit-linux-baseline-audio.json). Only the browser cache was installed in the existing WSL environment; no system-package or application dependency change was needed. Final WebKit verification uses this supported Linux build, with the same configured emulated devices and tests.

Main is now `a009a3e`. Collector PR #129 incorporates it at `f1184d5`, fixes the comparison origin with an explicit same-build assertion, and uses the new drawable-board rectangle for pan/zoom. Its 12 root and six prefixed checks pass. Carry that base into #130 and rerun complete final acceptance on the combined revision; do not present the earlier runs as proof of the new HUD.

## Current-main collector integration

PR #119 merged as `a009a3ec4c35b3e57adc58ac700e56721af9ae8f` during the runtime follow-up. This branch merges that exact main without changing its reviewed runtime files. The only merge conflict was the handoff: the #127 plan is retained above the latest upstream handoff.

The maintained collector now obtains its zoom/drag anchor from the actual `#battle-board-region` used by the responsive renderer/input gate. Its top-panel fallback is retained for the already-recorded older builds. Existing actual-control tests exercise zoom and pan on both battle/run routes, including prefixed deployments. A confirmed validation defect is also fixed: the interrupted/uninterrupted persistence comparison uses the configured `baseURL` for both pages and asserts matching served build identities, rather than silently opening another worktree on port 4173.

Fresh integration checks: 36 focused measurement tests, both typechecks, production builds, [12 root cases](issue-127-performance-budgets/collector-responsive-root.json) (six collector + six corrected persistence comparisons), and [six prefixed collector cases](issue-127-performance-budgets/collector-responsive-prefix.json) all pass with no retries/skips. Browser checks use installed Edge 155.0.4283.45 through the existing executable override. Exact collector v4 receipts are retained. Runtime optimization, fresh complete performance matrices and the active implementation handoff remain in [PR #130](https://github.com/luminari-gurus/tactics-guru-v2/pull/130); older `0b317e3` measurements are not claims about this updated main.

## Verified cold-code repair on current main

Runtime `f28f33181f2d1d4cb6eacf284e7753e56c674397` includes current main `a009a3e` through collector base `f1184d5`. [Source binding](issue-127-performance-budgets/current-source-binding.json), [base build inventory](issue-127-performance-budgets/current-base-build-files.json) and [candidate inventory](issue-127-performance-budgets/current-candidate-build-files.json) verify identical application, public-asset and package inputs. Vite's stock-distribution selection is the runtime difference. Collector v4-final preserves the exact executed script bytes, including checkout line endings; `sourceDirty` in captures reflects accumulating QA documents, while every **served build is clean**.

All fresh functional checks pass, with no retries/skips:

- 697 unit tests and 167 content checks; both TypeScript configurations; production build. [Unit receipt](issue-127-performance-budgets/current-unit.txt), [build receipt](issue-127-performance-budgets/current-build.txt).
- [501 Edge cases](issue-127-performance-budgets/final-browser.json), [18 encounter posttests](issue-127-performance-budgets/final-encounters.json), [21 item posttests](issue-127-performance-budgets/final-items.json), and [54 Linux WebKit cases](issue-127-performance-budgets/final-webkit.json).
- [45 prefixed-path cases](issue-127-performance-budgets/final-prefix.json), on a clean `f28f331` build with `--base=/tactics/`. The prefix build has its own output directory, preserving the root artifact.
- Representative [Canvas fallback](issue-127-performance-budgets/final-canvas-fallback.png) and [portrait reward](issue-127-performance-budgets/final-run-reward-portrait.png) screenshots were inspected. The game, controls and progression remain readable and usable.

The existing test configurations were inherited with isolated ports/output directories. Windows runs used Edge 155.0.4283.45 via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; WebKit 26.6 ran through WSL against the same frozen Windows-served artifact. [Windows driver](issue-127-performance-budgets/playwright-owned.config.ts.txt), [WebKit driver](issue-127-performance-budgets/playwright-external-webkit.config.ts.txt), [prefix driver](issue-127-performance-budgets/playwright-prefix.config.ts.txt). WebKit was installed in the existing WSL browser cache; no system packages, application dependencies, physical-device testing or production settings were changed.

### Complete performance matrices

[Final summary and raw hashes](issue-127-performance-budgets/final-performance-summary.json) cover **144 fresh samples**: four source/origin pairs × two routes × 18 samples. Every capture has the expected clean served commit, identical collector hashes, browser 155.0.4283.45, a complete unique matrix and zero console/page/capture errors. All samples and numeric failures are retained. [Exact capture commands](issue-127-performance-budgets/final-captures.ps1.txt) and [audit script](issue-127-performance-budgets/summarize-final.mjs.txt) reproduce the collection/evaluation process.

The exact historical release was recovered through its [GitHub deployment check](issue-127-performance-budgets/historical-deployment.json) at [immutable preview 86327a77](https://86327a77.tactics-guru-v2.pages.dev/), without redeployment. Earlier statements about the mutable main URL describe that earlier inspection, not the availability of this recovered immutable deployment.

- **Historical release `13418626`, deployed:** [battle](issue-127-performance-budgets/historical-release-battle.json) cold code 408,717–408,911 bytes; [run](issue-127-performance-budgets/historical-release-run.json) 417,165–417,415. All nine cold L3 samples on each route still fail. The new host also records loading failures; the original Mac receipt is preserved separately.
- **Current base `f1184d5`, local:** [battle](issue-127-performance-budgets/baseline-edge-battle.json) 411,983 cold code bytes; [run](issue-127-performance-budgets/baseline-edge-run.json) 420,256. Both exceed L3.
- **Candidate `f28f331`, local:** [battle](issue-127-performance-budgets/candidate-edge-battle.json) **378,879 bytes**; [run](issue-127-performance-budgets/candidate-edge-run.json) **387,151 bytes**. The reductions are **33,104 / 33,105 bytes** in aggregate route transfer. All **36 samples pass every L1/L2/L3/L4/F1/F2 gate**. Worst warm usability is 615.7 / 696.8 ms.
- **Same candidate, [deployed preview 10caa3ab](https://10caa3ab.tactics-guru-v2.pages.dev/):** [battle](issue-127-performance-budgets/candidate-preview-battle.json) cold code **379,469–379,607 bytes**; [run](issue-127-performance-budgets/candidate-preview-run.json) **388,088–388,220**. Every cold code, asset and frame gate passes. Loading remains incomplete: battle has **one cold L1 failure** (2592.7 ms) and **six warm L2 failures** (worst 1896.6 ms); run has **nine warm L2 failures** (worst 1183.1 ms). Adjacent `-gates.json` files retain every per-sample decision.

### Idle disposition and loading diagnosis

Separate [Edge baseline profile](issue-127-performance-budgets/baseline-edge-profile.json) and [candidate profile](issue-127-performance-budgets/candidate-edge-profile.json), with adjacent CPU traces, show unchanged battle state across idle and stable listener counts across three explicitly verified new scene runs (2, 3, 4): 155 initially, then 156/156/156. Both use Intel Arc/D3D11. Their screenshots are byte-identical (SHA-256 `baa936772f50d0b36b9426bfac4be7f8d49a824bff593a15e15c97ee6858c691`). No supported application hot-path cost or growing listener leak was identified, so no runtime frame-loop change is made.

Edge's observed idle cadence is approximately 8.3–8.4 ms, unlike the earlier approximately 16.7 ms Chromium/Mac captures. Passing Edge intervals therefore **do not prove a causal fix** for the original 16.799999952316284 ms outlier. The historical failure remains retained and the outlier is unreproduced under the final matched conditions. Limits, nearest-rank calculation, observation point and arithmetic tolerance are unchanged.

The separate [loading diagnostic](issue-127-performance-budgets/preview-loading-diagnostic.json) is not an acceptance retry. One warm battle trace records HTML response completion at 95.1 ms, scene start at 515.5 ms, scene readiness at 647.7 ms, and usable controls at 999.8 ms, with nine HTTP 304 validations. A diagnostic run warm sample of 732 ms does not replace any of the nine failed run acceptance samples. Startup presentation remains about 350 ms and is preserved. The evidence supports investigating earlier client resource loading; it does not establish a single cause for the cold navigation outlier or authorize hosting/cache changes.

### Acceptance map and remaining work

1. Historical source and failures: exact original hashes/reevaluation plus fresh source-bound captures are complete.
2. Cold critical code: all nine samples per route pass locally and on the deployed candidate, with complete functional preservation.
3. Idle investigation: paired matrices, separate profiles, state/lifecycle checks and honest unreproduced-outlier disposition are complete; no unsupported causal fix is claimed.
4. Functional checks and unchanged full matrices: complete. **Full deployed acceptance is not complete because L1/L2 loading failures remain.**

Keep #127 open with `Refs #127`; #57/#64/#81 retain their own acceptance decisions. OpenSpec section 6 tracks a focused follow-up: test route-specific early hints derived from emitted JS/CSS dependencies and existing blocking-image paths, preserve the map route's light loading and the authoritative loader, and measure before retaining any change. Do not move the usability marker, shorten startup movement, relax limits, hide failures, or change hosting/cache policy as a shortcut.


## Startup follow-up: bounded resource-hint experiment

The startup branch is based on evidence head `a069328`. Vite already preloads the async entry and its static dependencies when the dynamic import runs; adding that entry again through `resolveDependencies` cannot advance those requests. The candidate instead emits a small build-only head script using the actual output chunk/CSS graph, selecting battle or run by the existing base/path rules and returning immediately for map. It requests modules without executing either application, leaves the authoritative loader unchanged and propagates the supplied CSP nonce. No application source, timing marker, timer, threshold, cache header or deployment configuration changes.

Ablation removed image hints after a concrete reuse failure: Phaser loads images through blob XHR, and the browser warned that the fetch preloads were unused. V1 added fifteen validations / 4,500 bytes without local benefit. Preserve the [source/HTML binding](issue-127-performance-budgets/startup-preload-v1-binding.json), [reuse diagnostic](issue-127-performance-budgets/startup-preload-reuse-v1.json), [probe source](issue-127-performance-budgets/probe-preload-reuse.mjs.txt), and [stock](issue-127-performance-budgets/startup-probe-v1-stock.json)/[hint](issue-127-performance-budgets/startup-probe-v1-hints.json) results.

V2 contains only JS/CSS hints. A separate controlled 75 ms CDP-latency diagnostic reports warm battle 1161.9 -> 1062.9 ms and run 1190.8 -> 1102.6 ms ([stock](issue-127-performance-budgets/startup-probe-v2-latency-stock.json), [hints](issue-127-performance-budgets/startup-probe-v2-latency-hints.json)). This uses loopback HTTP/1.1 and a dirty exploratory build: it is hypothesis evidence, not deployed acceptance or a replacement for any failed sample. Actual preview measurement is required before retaining the runtime change.

Both typechecks and the V2 production build pass. The focused boot/public-asset run had [63 passing / three failing cases](issue-127-performance-budgets/startup-preload-v2-browser-before-url-fix.json); all three failures occurred before navigation because the test joined an origin without a trailing slash to `run`. The test now resolves the route with `new URL`, and [all three repaired cases pass](issue-127-performance-budgets/startup-preload-v2-browser.json). [All 48 prefixed-path cases pass](issue-127-performance-budgets/startup-preload-v2-prefix.json). [Linux WebKit](issue-127-performance-budgets/startup-preload-v2-webkit.json) passes the new map and nonce cases in both orientations; four extra collector cases stop at Playwright's unsupported mobile-WebKit `mouse.wheel` operation. This limits that extra harness run and does not establish warm collector behavior on WebKit. The configured WebKit acceptance suite remains the appropriate functional gate.

Implementation follows Vite's [build HTML hook](https://vite.dev/guide/api-plugin.html#transformindexhtml) and installed output metadata types. Browser [modulepreload](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload) prepares the required module graph without executing the application. The existing startup import remains responsible for execution and errors.
