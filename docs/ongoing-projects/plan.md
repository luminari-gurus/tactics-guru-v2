# Issue #127 — restore battle and run performance budgets

Updated 2026-10-18 (Asia/Jerusalem). **Cold-code repair verified; deployed loading work continues.**

## Current execution handoff

Main remains `a009a3ec4c35b3e57adc58ac700e56721af9ae8f`. Review stack: [#129](https://github.com/luminari-gurus/tactics-guru-v2/pull/129) collector (`f1184d5`) -> [#130](https://github.com/luminari-gurus/tactics-guru-v2/pull/130) stock Phaser Arcade (`f28f331`) -> [#132](https://github.com/luminari-gurus/tactics-guru-v2/pull/132) cold-code evidence (`a069328`) -> [#133](https://github.com/luminari-gurus/tactics-guru-v2/pull/133) startup resource reuse, current head **`9382f135be8b845b2a5425c16c3ea1badc5a00f0`**. Performance is bound to clean **`06ad2435c28c96b1614eb083acd8f953f76c8fe7`** at **https://b0761a21.tactics-guru-v2.pages.dev/**. Follow-ups `99ee537` and `9382f13` change only two test fixtures; all application/public/Vite/HTML/package/TypeScript inputs match the measured runtime. No merge, production activation or release tag has been performed.

**Active branch:** `branch/issue-127-startup-evidence`, based on #133, is being prepared for review with the complete receipts and this handoff. Working directory: `C:/Users/apexw/.codex/worktrees/issue-127-performance-plan/Tactics-Guru`. The original checkout and unrelated worktrees are preserved. All browser/test jobs have finished.

**Performance outcome:** the complete 72-sample local/preview matrix is audited, with clean served identities, unchanged collector/limits, zero capture errors and zero duplicate image requests. All 36 local samples and all 18 deployed battle samples pass every gate. Deployed run passes 17/18: portrait repetition 1 warm remains **777.4 ms**, above **750 ms**. Every cold, code, asset and frame gate passes. Deployed code is **380,113–380,261 / 388,744–388,860 bytes** (battle/run); scene assets are 847,929 bytes. Worst deployed warm battle is 691.4 ms. Preserve the failed sample and all earlier attempts. [Performance summary](../qa/issue-127-performance-budgets/startup-final-summary.json), [source binding](../qa/issue-127-performance-budgets/startup-source-binding.json), [QA](../qa/issue-127-performance-budgets.md).

**Implemented:** build-only route-specific JS/CSS/image hints advance required requests. The existing Phaser content loader uses its supported image-element transport, so early hints, scene textures and portraits share one request. The same loader owns timeout, dimension/error validation and shutdown cleanup. Map/proof/content-smoke avoid battle-image hints. V1 fetch-image hints were rejected for duplicate blob-XHR requests; V2 JS/CSS-only hints retained eleven warm failures. No gameplay, audio ownership, animation, first-usable marker, sampling, threshold, dependency, renderer or cache-policy change is made.

**Functional proof:** 697 unit tests, 167 content checks, both typechecks/build and 63 clean prefixed-path cases pass. The original full Edge run was **516 passed / three stale request-count failures**; all three repaired cases pass. All **18 encounter / 21 item posttests** and **54 configured Linux WebKit cases** pass. Test-only `99ee537` replaces the old two-portrait-request expectation with one request for every image across four restarts. Test-only `9382f13` uses native taps on touch profiles in the asset-path check; desktop retains mouse clicks. Its three root, three prefix and twelve WebKit sequence cases pass. [Validation summary](../qa/issue-127-performance-budgets/startup-validation-summary.json) audits counts, source parity and hashes; no skips or automatic retries are hidden.

**Retained WebKit uncertainty:** the first additional 26-case run had 25 passes and one proof readiness timeout (Loading beyond five seconds). That timeout is unreproduced, not causally fixed. The exact proof case passed six times on baseline and six on candidate; 24 diagnostic load/reload visits passed, and the final native-touch sequence passed. An earlier sequence also recorded one synthetic mouse activation remaining muted; its trace and six passing event-logged diagnostic repetitions are preserved. No application audio change or longer wait was used. An initial zero-test selector invocation and an earlier incorrect progress statement about desktop passes are also disclosed in QA. Every current required case has passing evidence, but the initial attempts were not all green.

**Scope decision pending:** the concrete [cache-header proposal](../qa/issue-127-performance-budgets/cache-policy-proposal.patch.txt) would generate immutable rules only for exact content-hashed JS/CSS paths, preserving HTML/fixed-asset policy. Local draft rendering produced thirteen root and thirteen prefixed rules, without changing source or hosted configuration. Current OpenSpec explicitly excludes hosting/cache changes. The caller has been asked to approve that separate source PR and existing-preview testing; **do not apply or publish the cache change without an answer**. The prepared worktree `tmp/cache-followup`, branch `branch/issue-127-hashed-cache`, is clean at `9382f13` and contains no cache implementation. Its `node_modules` is a junction; never recursively delete through it. No production activation is proposed.

OpenSpec `issue-127-performance-budgets` remains **14/15 complete**; task 6.3 and #127 stay open while the warm gate fails. Next actions:

1. Publish this evidence branch as a focused PR on #133; update #133's description and this handoff with the actual evidence PR. Refresh main/review state, validate source parity, document links, strict OpenSpec, whitespace and local/remote parity. No further full functional rerun is justified by documentation-only publication.
2. Await the cache-scope answer. If approved, fast-forward the prepared cache branch to the published evidence head, revise the existing OpenSpec artifacts under that authorization, implement the narrow generated-header proposal, verify actual preview headers and unchanged full performance matrices, then publish a separate dependent PR. Generate rules from the new emitted bundle; never copy stale example hash paths. Keep all earlier failures.
3. If cache scope is declined or still unanswered, leave its proposal unapplied and the measured limitation explicit. Address any actual PR review findings within existing scope. Do not close #127, #57/#64/#81, merge, or archive OpenSpec based on partial performance proof.

Frozen artifacts: `tmp/startup-final-dist` on **4199** (`06ad243`, root); `tmp/startup-prefix-dist` built with `/tactics/`; `tmp/cache-followup/tmp/startup-testfix-dist` on **4201** (clean `99ee537`, used by rechecks/WebKit); `dist` on **4188** (`f28f331`); full-Phaser base on **4174** (`f1184d5`). Keep their bytes intact. If a preview server stops, restart Vite preview with the stated output directory/port; do not rebuild from a dirty checkout. Historical preview `https://86327a77.tactics-guru-v2.pages.dev/` serves clean `13418626`, and #130 preview `https://10caa3ab.tactics-guru-v2.pages.dev/` serves clean `f28f331`.

Test environment: Edge **155.0.4283.45** via `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`; official WebKit **26.6** through existing WSL, with Web Audio and loopback access. Emulation satisfies standing policy; no physical execution is claimed. The original 16.799999952316284 ms idle outlier remains retained and is not causally fixed by Edge's approximately 8.3 ms cadence. The earlier 144-sample matrix/profiles, Windows browser limitations and mobile-WebKit wheel-driver limitation remain in QA. The new landscape Canvas screenshot is byte-identical to the earlier verified one.

## Evidence and source findings

The [2026-10-17 audit](../qa/device-acceptance-2026-10-17.md) and [raw evidence](../qa/device-acceptance-2026-10-17/validation.json) measured clean deployed release `13418626fab4cc40609cd2255d54800c15e34805`, before current main's recovery repair merge. These are retained measurements, not a fresh reproduction in this planning session.

- All nine cold battle samples transfer 408,821–409,064 code bytes; all nine cold run samples transfer 417,188–417,514. Both exceed L3's 400,000-byte limit.
- Run mobile-landscape repetition 3 warm has idle p50 `16.799999952316284` ms, above F1's 16.7 ms. That failure cannot be rounded into a pass. The retained loading, assets, idle p95 and interaction p95 gates pass.
- In the first desktop cold samples, the common `start-B60UKqbD.js` request alone transfers 399,147 bytes for battle and 399,390 for run. Its decoded size is 1,520,176 bytes. This identifies where to inspect; it does not prove which modules account for the bytes or that a particular split will save enough.
- [src/main.ts](../../src/main.ts) already splits the route entries. [src/phaser/start.ts](../../src/phaser/start.ts) statically imports battle, proof and content-smoke scenes while exporting shared engine creation. [startRunApp.ts](../../src/app/startRunApp.ts) imports that engine helper and BattleScene directly. Separating the scene graph is a concrete first hypothesis.
- [BattleScene.ts](../../src/phaser/BattleScene.ts) observes frames at POST_RENDER; [measurements.ts](../../src/diagnostics/measurements.ts) uses bounded raw intervals and nearest-rank percentiles. No cause of the idle outlier is established by source inspection alone.
- The [retained collector](../qa/device-acceptance-2026-10-17/measure.ts.txt) handles warm save prompts and run-start controls; the maintained [measure-fit.ts](../../scripts/measure-fit.ts) needs those bounded behaviors. Its root-only run-path and top-panel gesture assumptions also need checking against prefixed paths and any newly merged HUD geometry.

## Implementation approach

1. **Bind baseline and reproduce.** Refresh main, issue ownership and PR #119/#128 status. Preserve the original receipts and collector hashes, reevaluate their exact failures, then capture the recorded release if still available without redeploying it and a clean current-main baseline. Record browser/host/network/cache/compression and source/build identities. Any unavailable historical reproduction stays explicit; a changed host is not a causal comparison with the old macOS capture.
2. **Maintain one collector and evaluator.** Carry the reviewed warm save isolation and real run-start controls into the existing measurement path. Keep proof mode compatible, recognize prefixed run paths, use real legal board interactions, and reject incomplete/dirty/mixed/error runs or missing metrics/workloads. Preserve HTTP cache and the first usable-control timing; measure saved resume separately. Verify changes against the retained data and meaningful parser/evaluator cases.
3. **Reduce avoidable critical code.** The measured scene-import split was insufficient and is reverted. Select the pinned package's stock Arcade distribution, which removes unused Matter physics while retaining existing game code and engine configuration. Verify all routes, missing engine loads, Canvas fallback and the full audio/persistence/lifecycle suite. Measure aggregate transferred bytes including overhead and all later required loads.
4. **Resolve the idle failure from evidence.** Use matched sequential uninstrumented baseline/candidate captures, plus a separate trace to investigate rendering, diagnostic work, listener accumulation and host scheduling. Apply a minimal hot-path fix only for a demonstrated cost. Retain an unreproduced or unresolved outlier explicitly; do not change the frame method or accepted limits to get a pass.
5. **Prove the final candidate.** Run all required functional checks, then the same complete cold/warm capture matrix for battle and run. Publish source-bound raw data, request inventory, per-sample gate results and exact commands. Verify a deployed candidate only on a separately approved existing origin; local proof alone cannot establish the deployed gate.

The failed scene-split comparison and exact source commit are retained in QA. The revised stock-distribution remedy above is grounded in the module inventory and unused-physics source trace. No dependency upgrade, custom Phaser build, renderer rewrite or idle root cause is selected.

## Acceptance mapping

1. **Reproduce release totals and idle outlier; inspect request inventory.** Tasks 1.1–1.3 and 4.1 retain original JSON/hashes, reproduce when possible and capture a fresh matched baseline. Deliver source/build/collector/browser/host identities, every request's transferred/encoded/decoded sizes and raw interval distributions. If the original build cannot be served, report that gap rather than calling reevaluation a fresh reproduction.
2. **Cold critical code at or below 400,000 bytes without feature loss.** Tasks 3.1–3.2 and 5.1–5.2 require all nine cold samples on each route to pass and preserve gameplay, audio, persistence, rendering, input and accessibility. Test the default battle, run, proof, content-smoke and map routes plus prefixed assets, recovery and missing loads.
3. **Investigate idle without guessed causes or changed limits; retain all samples.** Tasks 2.2 and 4.1–4.2 keep the original 16.799999952316284 ms failure, paired conditions and separate profiling. Preserve any failed attempt; no selective retry replacement or timer/percentile change. Unresolved failures remain open.
4. **Applicable regressions, both typechecks/build and identical capture matrix.** Tasks 5.1–5.3 require the full commands below and 36 samples: two routes × three profiles × three repetitions × cold/warm. Per-sample limits remain L1 cold <=2500 ms, L2 warm <=750 ms, L3 cold code <=400,000 bytes, L4 scene assets <=1,500,000 bytes, F1 idle p50 <=16.7/p95 <=20 ms and F2 pan/zoom/move p95 <=33.4 ms. Ignore only floating arithmetic noise below 1e-6 ms.

## Files and verification

Final implementation files are `vite.config.ts`, `tests/boot.spec.ts`, the maintained measurement scripts and their existing tests, plus these QA/OpenSpec artifacts. The exploratory scene-start edits are reverted. No changes to pure combat rules, authored content, save schemas, dependency versions or release configuration are selected. Runtime hot-path changes still require causal profiling evidence.

Use existing `tests/unit/measureFitOptions.test.ts` and `tests/unit/measurements.test.ts` for collector/metric behavior; extend relevant boot/content-loading/public-asset-base and battle/run browser tests for actual regressions. Reuse `docs/qa/device-acceptance-2026-10-17/` as immutable evidence. Write new QA results under `docs/qa/issue-127-performance-budgets/` with a summary at `docs/qa/issue-127-performance-budgets.md`.

After implementation, run the repository commands on the exact candidate:

```sh
npm run test:unit
npm run validate:content
npm run typecheck
npm run build
npm test
npx playwright test -c playwright.device-acceptance.config.ts
openspec validate issue-127-performance-budgets --strict
git diff --check
```

`npm test` runs the configured Chromium suite and the `posttest` encounter/item configurations. If invoking Playwright directly, also run `npm run posttest`. Keep both TypeScript configurations in `npm run typecheck`. Record actual results, skips/retries and existing warnings; historical test counts are not new proof.

For the retained collector, restore `measure.ts.txt` unchanged to ignored `tmp/device-acceptance/measure.ts` so its relative imports work. Run sequentially with the same browser executable/settings, using an approved exact-build origin in place of `APPROVED_ORIGIN`:

```sh
node --experimental-strip-types tmp/device-acceptance/measure.ts test-results/issue-127-battle.json --scene battle --url APPROVED_ORIGIN
node --experimental-strip-types tmp/device-acceptance/measure.ts test-results/issue-127-run.json --scene battle --url APPROVED_ORIGIN/run
```

The retained evaluator has fixed `/tmp` input/output names; use a scratch copy with explicit receipt paths, preserving the original and comparing its result to the committed gates. Document any maintained replacement's command in the implementation QA report. Do not run performance captures alongside other browser tests or profiling, and do not substitute Vite gzip estimates for actual deployed transfer. Record before/after methods separately when correcting the collector.

## Completion and authorization boundary

The original planning session delivered the assigned issue, kickoff comment, reviewed artifacts and published branch. The implementation session is now authorized; its current status and evidence are recorded above and in the QA report.

The caller's implementation request supplies approval of this concrete plan. Production deployment, release-target changes and closing #57/#64/#81 remain separate. Publish completed focused chunks ready for review, as explicitly requested, with `Refs #127` while any budget or deployed verification is unmet; use `Closes #127` only when all criteria are verified.

Planning validation passed strict OpenSpec, 31 local document links, four acceptance mappings and 12 unchecked implementation tasks. No runtime validation is implied. Final whitespace, staged scope, issue assignment/comment/native branch linkage, clean Git status and local/remote parity are checked at publication; the resulting commit and receipts are recorded in the linked issue comment. The prior project handoff below is preserved as historical context; the #127 plan above governs this branch.

---

# Upstream project handoff — 2026-10-17

## Responsive controls: PR #119 integration

[PR #119](https://github.com/luminari-gurus/tactics-guru-v2/pull/119) integrates the reviewed rail/dock and isolated inspection with main `0b317e3`. Both review findings are repaired and their threads resolved. Integration commit `743bd0a1599df1b3c3e22a746f0b23086d2d1ad5` preserves the original PR ancestry, merged run progression, health bars and WebKit focus fixes.

The startup/style conflicts are reconciled by sharing the existing responsive shell between standalone battles and `/run`. Run boundaries hide that shell; active encounters show the correct encounter heading, actor and drawable board region. The existing run reload test reproduced the missing actor-container failure before repair and passes afterward on desktop, portrait and landscape. [QA and acceptance map](../qa/issue-111-battle-controls.md) record the implementation and review repairs.

Implementation and merge acceptance are complete. The PR records the final merge state and issue #111 closure. A merge commit preserves the reviewed ancestry; no history rewrite or release tag is warranted. The PR branch is retained because existing worktrees reference its history.

Follow-ups `1fe9e09` and `2ba14d9` correct stale encounter labels and keep restored dialog focus visible in the nested scroller. Broad verification passed 675 unit tests and all 480 browser cases. Final verification after those follow-ups passed 97 focused browser executions, 18 encounter and 21 run-item posttests, 167 content checks, both typechecks/build, strict OpenSpec and whitespace checks. The QA record distinguishes source revisions, initial failures, focused rechecks and retained evidence.

[OpenSpec tasks](../../openspec/changes/issue-111-responsive-battle-controls/tasks.md) are complete. The change remains active for its separate sync/archive workflow; preserve the already merged `battle-dialog-focus-return` scenarios when syncing. The [prior repair handoff](https://github.com/luminari-gurus/tactics-guru-v2/blob/2b419eff2f4183c3e9357d45b75caaeceb12bc70/docs/ongoing-projects/plan.md) and [prior main handoff](https://github.com/luminari-gurus/tactics-guru-v2/blob/0b317e3/docs/ongoing-projects/plan.md) preserve earlier evidence and dispositions.

## Follow-up work

- [#123](https://github.com/luminari-gurus/tactics-guru-v2/issues/123) adds mobile collapse/expand behavior. It remains open and should build on the final merged responsive shell and drawable-region contract, including `/run` encounters.
- [#127](https://github.com/luminari-gurus/tactics-guru-v2/issues/127) owns the deployed transfer and idle-budget failures; #57/#64/#81 retain their related acceptance. Preserve that work's ownership and evidence.
- #128 analytics/error logging, #59/#60 broader run/reward epics, and #83–#85 with PR #12 retain their separate scope. This merge does not establish release acceptance.

The standing [AGENTS.md](../../AGENTS.md) policy accepts Playwright/device emulation for device testing unless the caller specifically requests hardware. [PR #125](https://github.com/luminari-gurus/tactics-guru-v2/pull/125) recorded that policy; [PR #126](https://github.com/luminari-gurus/tactics-guru-v2/pull/126) delivered WebKit recovery-focus repairs and its own device-acceptance closeout. The [device audit](../qa/device-acceptance-2026-10-17.md) retains actual failures and source-bound measurements. This integration does not claim physical hardware, screen-reader or production deployment testing.

Delivered foundations remain: save/storage/Continue (#69/#72/#73), run progression and reward/item controls (#75–#80), map work (#87/#96–#99), signature effects (#106), responsive design (#108), shared geometry (PR #118), and unit health bars (#121/PR #124). See the [restart plan](../phaser4-restart-plan.md) and [technical design](../tech_design.phaser4.draft.md) for their contracts.
