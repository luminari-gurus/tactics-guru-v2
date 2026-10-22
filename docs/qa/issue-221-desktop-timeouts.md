# Issue #221 desktop timeout investigation

## Retained original observation

Recovered artifact `12396082054` from run `39700595665`. ZIP SHA-256: `748aba4ed5450557980eb652fe2fb496db4664f9529631f173c0b29b0cb01a8b`. Local raw recovery is under ignored `tmp/issue-221/original/`; the original 30-day GitHub artifact remains the shared raw source.

Its `issue200-ci/source.txt` identifies `73d34dba1620174837cf15a93812d393abe690aa`. Direct Git comparison with literal base `251db945569e3f1ac957caa091e9fa9eec11a034` confirms no differences in `src/`, `tests/helpers/`, either reported test file, `playwright.config.ts` or `package-lock.json`.

`timings/github-hosted-baseline/chromium.log` retains all four 30-second timeouts. Hover fails waiting for player phase after restart; camera expires clicking Wait; first bob expires reading the report at line 447 (after the 2,000ms reduced-motion advance); second bob at line 480 (after the hidden-page advance). These locations are observations, not causal conclusions. The full Chromium invocation was interrupted at start marker 257/687 and remains incomplete.

## Original host qualification

At kickoff, runner `unraid-tactics-01` was online and not busy, labels `[self-hosted, Linux, X64, tactics-browser]`. PR #210 provided prior Chromium/WebKit setup qualification; its tooling was unmerged at that checkpoint. The historical branch-scoped workflow rechecked actual Chromium launch and recorded runtime/host/input identity, then built and ran exactly the four desktop cases untraced with one worker and zero retries. Review later merges #210 through current main and uses its local wrapper, as documented below.

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

Repair changes only the two bob test bodies. Fast-forward the same 2,000ms reduced-motion/hidden intervals after those modes have disabled bobbing, keeping their final zero-offset and exact state/save assertions. Run the real actor transition on live frames, then pause again before controlled sampling. PR review correctly identified that the first version used the default five-second readiness assertion instead of preserving the original three-second animation checkpoint. The review repair applies an explicit 3,000ms readiness timeout and checks browser-clock elapsed time from before resume before pausing. No product speed, fixture, assertion or sample count changes; other readiness checks retain their existing limits.

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

The two historical final runs provide **27 passing checks**, not a complete regression matrix or proof of the subsequently restored actor-transition bound. Commands and selectors remain available in the workflow at the tested commits and in the local recipe below. No blanket retry, forced click, assertion deletion or test split was introduced.

## Source binding, artifacts and delivery

[Machine-readable receipts](issue-221/evidence.json) retain per-case results, host/browser metadata, relevant input hashes, report/log hashes, aggregate clock timings and emitted-build receipt hashes. API ZIP digests are labeled separately from independently hashed local files. Shared retained artifacts (30 days, through 2026-11-21):

- [Literal base](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39750405032/artifacts/12413277869).
- [Diagnostic base](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39750995870/artifacts/12413003662).
- [12 reported + 12 neighboring cases, build hashes and screenshots](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39751877999/artifacts/12414715905).
- [Preceding-workload probe](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39752731873/artifacts/12414118130).

The original delivery removed temporary diagnostic reporting and PR/label triggers and retained a manual workflow. PR review retires that workflow entirely: its new-file manual dispatch was unavailable before merge, and branch-selected execution exposed the persistent runner to branch code. Local execution supplies equivalent coverage without a new CI entry point. Historical source bindings apply to the recorded runs; fresh review proof must cover the changed actor bound. The passing run executed `34c86fc`, not later evidence commits. Existing bundle-size and future Vite-native-loader warnings remain; no new warning or product-budget qualification is claimed.

Workflow setup failures `39750301292` and `39752480564` executed no browser cases; both YAML defects were corrected before their respective useful runs. The two failed literal-base executions and original interrupted hosted baseline remain failures. #199/#200's full baseline, missing coverage and unrelated follow-ups remain open. No merge, production deployment or physical-device run was performed; pushes triggered the repository's ordinary Cloudflare branch previews.

## Local rerun

Main's #207 browser tooling is now merged into this branch. Follow [browser setup](../browser-testing.md) for prerequisites; run from the repository root on a trusted local checkout. These commands retain the workflow's exact four reported and four neighboring titles across all three Chromium profiles, one worker, zero retries and tracing off. The wrapper retains unique JSON/artifact directories and preserves failure exit status. Stop before browser execution if the build fails.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check:browsers
npm run build
reported='(hovered origins show only ability reach without changing selection, pending commands or saves|selection labels retain the zoomed and panned camera without gameplay commands|active bob: targets, cancel, inspection, camera and live reduced motion preserve authoritative state|active bob: presentation, actor change, hidden page and restart restore anchors without duplicate loops)$'
neighbors='(target overlays follow invalid selection, action changes, keyboard, cancellation and board taps without resolving commands|active bob: initial reduced motion keeps sprite and static actor marker anchored|authored camera keeps zoom bounds and refits on real orientation changes|default authored board renders canonical units, highlights and stable restarts)$'
npx --no-install playwright test tests/battle-board.spec.ts tests/battle-animations.spec.ts --grep "$reported" --list
npm run test:browser -- tests/battle-board.spec.ts tests/battle-animations.spec.ts --grep "$reported" --workers=1
npm run test:browser -- tests/battle-board.spec.ts tests/battle-animations.spec.ts --grep "$neighbors" --workers=1
```

The variables use POSIX shell syntax; in PowerShell use `$reported = '...'` and `$neighbors = '...'`. No GitHub dispatch or CI wait is required. The retired workflow's historical runs and artifacts remain linked above.

## PR #223 review qualification

All five review findings were valid. Main `419ebcdd3ddf5eefb0786dfc4231a7ae476b17b9` was merged cleanly as `edf9ba0`; published evidence history was preserved. Review implementation `611fcf02d1162696730f6bb0f70bfac0c1a5b8ae` restores the local three-second actor bound, corrects the OpenSpec non-reproduction disposition, retargets both issue-159 acceptance links and removes the temporary workflow. Its dispatch and runner-exposure issues are eliminated by removal; the local recipe above preserves all 24 selected checks. No replacement CI trigger, hosted fallback, runtime/helper/config/dependency change or release tag is added.

Fresh local WSL2 qualification uses Node 24.15.0, Playwright 1.63.0, full Chromium 153.0.8010.12, one worker, zero retries, tracing off, root production preview:

- `npm ci --ignore-scripts --no-audit --no-fund` and `npm run build` pass: **221** content tests, both TypeScript scopes and production bundle. Existing Vite warnings remain.
- Reported cases: **12/12 pass**, 162.7s including setup. Lifecycle bob passes in **17.4s desktop / 12.1s portrait / 12.2s landscape** with the restored bound. Neighboring cases: **12/12 pass**, 115.5s including setup. Both runs have zero skips/retries.
- Sensitivity probe: temporarily withhold only the DOM readiness signal for **3,500ms** in the real lifecycle case. The old default readiness check passes; the repaired check fails at its **3,000ms** assertion with `review-delay` still present. This deliberately injected failure is retained separately from the 24 positive checks. Probe source, both reports and restoration hash are retained; the original tested file bytes were restored exactly. No runtime delay hook remains.
- Desktop, portrait and landscape screenshots were inspected for board/HUD readability and anchors. This is device emulation. WebKit passed environment launch only; no new WebKit gameplay, physical-device, full-matrix or product-performance claim is made.
- Both affected OpenSpec changes validate strictly. Relative Markdown targets, exact 12-case discovery and `git diff --check` pass. The preserved issue-159 plan has Git blob `947a6cb6a14afff756652fa3b29619ee27abba64`, identical to the original plan on main.

[Review source/report/build manifest](issue-221/review/evidence.json) binds the compressed raw reports, probe source, build log, environment, all relevant input hashes and emitted-build hashes. The source receipt records `dirty: true` from WSL Git treating CRLF files as changes; native Windows Git was clean at the source checkpoint, normalized WSL status was empty and the native relevant-input diff against `611fcf0` was empty. Later handoff/receipt edits do not change application, tests, helpers, configs, dependencies, assets or build inputs. Fresh checks executed the recorded source, not later evidence commits. Historical failed/incomplete runs and the unproved hover/camera cause remain unchanged above.
