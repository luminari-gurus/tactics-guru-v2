# Issue #221 desktop timeout investigation

## Retained original observation

Recovered artifact `12396082054` from run `39700595665`. ZIP SHA-256: `748aba4ed5450557980eb652fe2fb496db4664f9529631f173c0b29b0cb01a8b`. Local raw recovery is under ignored `tmp/issue-221/original/`; the original 30-day GitHub artifact remains the shared raw source.

Its `issue200-ci/source.txt` identifies `73d34dba1620174837cf15a93812d393abe690aa`. Direct Git comparison with literal base `251db945569e3f1ac957caa091e9fa9eec11a034` confirms no differences in `src/`, `tests/helpers/`, either reported test file, `playwright.config.ts` or `package-lock.json`.

`timings/github-hosted-baseline/chromium.log` retains all four 30-second timeouts. Hover fails waiting for player phase after restart; camera expires clicking Wait; first bob expires reading the report at line 447 (after the 2,000ms reduced-motion advance); second bob at line 480 (after the hidden-page advance). These locations are observations, not causal conclusions. The full Chromium invocation was interrupted at start marker 257/687 and remains incomplete.

## Current qualification

At kickoff, runner `unraid-tactics-01` is online and not busy, labels `[self-hosted, Linux, X64, tactics-browser]`. PR #210 provides prior Chromium/WebKit setup qualification; this branch does not import its unmerged tooling. The branch-scoped workflow rechecks actual Chromium launch and records runtime/host/input identity, then builds and runs exactly the four desktop cases untraced with one worker and zero retries.

## Literal-base reproduction

[Run 39750405032](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39750405032) tested literal main `251db945569e3f1ac957caa091e9fa9eec11a034` on `unraid-tactics-01`: Node v24.22.1, npm 11.19.1, Chromium 153.0.8010.12, Linux 6.8.0-139-generic, six reported CPUs (Ryzen 7 2700X), 8,174,178,304 bytes RAM. Load averages before launch: 1.62/1.15/1.05. Actual browser executable: `/home/actions/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`.

Production build passed. Four-case discovery passed; untraced execution used preview, one worker, zero retries and unchanged 30-second limits. **3 passed, 1 failed, zero skips/retries**: hover 16.7s, camera 20.0s, first bob 26.7s; bob lifecycle 30.1s, timing out at line 494 during post-restart sampling. This is the same case but a later location than the original hosted observation. Other failures did not reproduce in isolation on this host; no causal repair is yet claimed.

Raw receipt download: ignored `tmp/issue-221/baseline/issue-221-39750405032-1/`. A separate diagnostic invocation adds a temporary reporter of existing API/assertion steps; its timings are identified separately. Initial run `39750301292` failed YAML parsing before any job/case execution, corrected in `cbe576e`.

This failed base result remains distinct from the passing repair below.

## Measured diagnosis and bounded repair

[Diagnostic run 39750995870](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39750995870) uses the same literal base/host, with an additional temporary step reporter and no tracing. Again 3/4 pass and the lifecycle bob case reaches its 30-second deadline during repeated-restart sampling. These instrumented timings are separate from the initial untraced result.

- First bob: 21.766s total; `clock.runFor(2000)` in settled reduced motion costs 6.882s. API work totals 20.434s; report reads and fixture gaps are small. The 16 moving samples remain required.
- Lifecycle bob: 30.147s, timed out. Its fixed `runFor(3000)` actor transition costs 8.762s, hidden `runFor(2000)` costs 5.674s, and repeated 300ms sampling advances cost about 0.8s apiece. The long inactive windows and surplus frames dominate the deadline; the final report read is where the deadline lands, not a demonstrated missing-report defect.
- Hover 16.482s and camera 19.581s pass again. Restart readiness completes normally; camera waits consume about 1s per accepted transition. No runtime defect is demonstrated for these observations, and no board edit is justified.

Repair changes only the two bob test bodies. Fast-forward the same 2,000ms reduced-motion/hidden intervals after those modes have disabled bobbing, keeping their final zero-offset and exact state/save assertions. Run the real actor transition on live frames until the existing player-readiness check succeeds, then pause again before controlled sampling. No product speed, deadline, expectation timeout, fixture, assertion or sample count changes.

Assertion mapping: all `bobFrame` sprite/health/anchor checks are unchanged; all 16 initial samples and both five-sample restart loops remain. Target/cancel/inspection/camera and both live media changes remain; presentation at 288ms and completion at 800ms remain; actor identity, hidden-page state/save invariance, restored bobbing, replacement seed, object counts and browser-error checks remain. Hover/camera tests are byte-identical. Their original hosted failures remain retained; their cause on the original host/workload is unproved. Qualified-host non-reproductions do not establish a runtime repair.

Consumer scope: three Chromium projects execute these local tests. Runtime, shared helpers, configs and lockfile are unchanged. Neighboring target/cancel, camera/rotation, canonical-unit/restart and initial-reduced-motion cases cover the adjacent paths. No WebKit/route/full-baseline rerun is triggered by a case-local clock edit; no new WebKit acceptance claim is made.

## Final qualification

[Run 39751877999](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39751877999) executed candidate `34c86fc8051ce02b30a3dc88910e692edb120fcb` on the same qualified runner/browser:

- `npm ci --ignore-scripts --no-audit --no-fund` and `npm run build` passed: 221 content cases, both TypeScript scopes and the production Vite bundle.
- Exact four-case discovery selected **12 cases**, four per desktop/Pixel 7 portrait/Pixel 7 landscape project. Execution passed **12/12**, 162.497s including setup, one worker, zero retries/skips, trace off. The temporary diagnostic reporter was also enabled for comparison.
- The four neighboring target/cancel, initial-reduced-motion, authored camera/rotation and canonical-unit/restart cases passed **12/12** across those same profiles, 120.987s including setup. This invocation uses ordinary list/JSON reporting.
- Desktop first bob: **16.301s** vs diagnostic base **21.766s**. Its disabled 2,000ms interval now costs **189ms**, vs **6,882ms**. Lifecycle bob: **18.152s** vs base **30.147s timeout**; its hidden interval costs **4ms**, vs **5,674ms**. These are test-driver timing observations, not a product performance claim.
- Screenshots from desktop and both mobile orientations were inspected: board, hero/health anchors, readable HUD and unobstructed playfield are retained. Mobile screenshots are emulation, not physical-device evidence.

[Preceding-workload run 39752731873](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39752731873) at `85f1fe08c76ab4e203164c050526f21138d3dbfb` tests the immediately preceding `layout clamping resets overlap history when the actual camera changes`, then the original hover and camera cases: **3/3 pass**, 48.3s, zero skips/retries, untraced. Hover takes 17.0s, camera 19.7s. This is the smallest evidenced preceding workload; the original board failures still do not reproduce. It does not claim reproduction of the one-hour hosted workload or prove its host/resource cause.

The two final runs provide **27 passing checks**, not a complete regression matrix. Commands and selectors are retained in the workflow at the tested commits; the final manual workflow selects the same 12 reported and 12 neighboring cases. No blanket retry, timeout increase, forced click, assertion deletion or test split was introduced.

## Source binding, artifacts and delivery

[Machine-readable receipts](issue-221/evidence.json) retain per-case results, host/browser metadata, relevant input hashes, report/log hashes, aggregate clock timings and emitted-build receipt hashes. API ZIP digests are labeled separately from independently hashed local files. Shared retained artifacts (30 days, through 2026-11-21):

- [Literal base](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39750405032/artifacts/12413277869).
- [Diagnostic base](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39750995870/artifacts/12413003662).
- [12 reported + 12 neighboring cases, build hashes and screenshots](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39751877999/artifacts/12414715905).
- [Preceding-workload probe](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39752731873/artifacts/12414118130).

Later delivery changes remove temporary diagnostic reporting and the PR/label triggers, restore the same 24-case selection under manual dispatch, and update documentation/OpenSpec progress. Candidate application, tests, helpers, configs, dependencies, assets and build inputs remain unchanged; final Git-blob hashes are checked against the candidate receipt. The passing run executed `34c86fc`, not the later evidence commits. Existing bundle-size and future Vite-native-loader warnings remain; no new warning or product-budget qualification is claimed.

Workflow setup failures `39750301292` and `39752480564` executed no browser cases; both YAML defects were corrected before their respective useful runs. The two failed literal-base executions and original interrupted hosted baseline remain failures. #199/#200's full baseline, missing coverage and unrelated follow-ups remain open. No merge, production deployment or physical-device run was performed; pushes triggered the repository's ordinary Cloudflare branch previews.
