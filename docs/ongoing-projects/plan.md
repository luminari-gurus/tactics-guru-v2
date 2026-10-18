# Issue #127 — restore battle and run performance budgets

Updated 2026-10-18 (Asia/Jerusalem). **Cold-code repair verified; deployed loading work continues.**

## Current execution handoff

Cache implementation is published in [PR #135](https://github.com/luminari-gurus/tactics-guru-v2/pull/135), stacked on #134, at clean **`ab513ce6197e9f94923840f4de3610652bfe38f9`**. Its exact automatic preview is **https://7129419b.tactics-guru-v2.pages.dev/**. All 13 generated JS/CSS paths serve one-year immutable headers and match local build hashes. HTML and representative fixed image/audio responses retain `public, max-age=0, must-revalidate`; generated rules cannot match those paths. Every warm deployed sample transfers zero JS/CSS bytes. No dashboard setting, production activation, merge or release tag changed.

**Current measured result: 68/72 pass.** All 18 preview battle and 18 local battle samples pass. Preview run has three warm failures (790.6, 818.6 and 780.8 ms); local run has one warm failure (751.1 ms), against the unchanged 750 ms limit. All cold/code/asset/frame gates pass. The complete source-bound matrix, every failure and original 777.4 ms failure are retained. Edge is now **155.0.4283.62**, updated from the prior phase's `.45`; do not call the phase-to-phase timing difference a matched causal comparison. [Summary](../qa/issue-127-performance-budgets/cache-final-summary.json), [source/build binding](../qa/issue-127-performance-budgets/cache-source-binding.json), [header/cache verification](../qa/issue-127-performance-budgets/cache-preview-verification.json), [QA](../qa/issue-127-performance-budgets.md).

**Active evidence branch:** `branch/issue-127-cache-evidence`, based on #135, in `C:/Users/apexw/.codex/worktrees/issue-127-performance-plan/Tactics-Guru/tmp/cache-followup`. Its `node_modules` is a junction; never recursively delete through it. Original checkouts and all previous evidence are preserved. The caller approved the cache proposal and directed autonomous remaining decisions without further questions.

**Validation:** 699 unit tests, 167 content checks, both typechecks, root/prefix builds and 18 root plus 18 prefixed actual-control checks pass without skips/retries. The two new tests validate the real emitted rule set. Application/public/package/collector trees match `9382f13`; the prior broad functional proof remains applicable. Precommit focused checks are identified as such; final root/prefix builds and performance captures are bound to clean `ab513ce`. A checkout-only evaluator newline mismatch was corrected to the previous exact collector bytes before capturing. A diagnostic probe initially read the wrong resource field (`transferSize` instead of `transferBytes`); its error and source are retained separately and are not an application failure. The summary's initial old-browser assertion detected the version change; all four fresh captures use `.62` consistently.

**Next work:** publish this evidence chunk, then compare the package's stock minified Arcade distribution against the current unminified source. Separate diagnostics reproduce 804.4 ms and identify substantial module initialization plus a 56 ms AudioContext constructor; the minified/unminified package builds share an entry and feature flags. Measure this bounded build-only candidate before considering audio/lifecycle changes. Select only a measured bottleneck, preserve gameplay/startup movement, audio/recovery, the original usable marker and every limit, implement a focused repair, and run the appropriate regressions plus complete unchanged matrices. Do not replace failed acceptance samples with diagnostics or retries. Task 6.3 and #127 remain open; no further approval is pending. Source/build cache behavior is verified, but caching alone has not completed the loading objective.

**Review stack:** #129 collector (`f1184d5`) -> #130 stock Phaser Arcade (`f28f331`) -> #132 cold-code evidence (`a069328`) -> #133 startup resource reuse (`9382f13`) -> #134 startup evidence (`5e6ff2d`) -> #135 exact cache rules (`ab513ce`) -> this evidence follow-up. Main was `a009a3e` at the last fetch. Preserve these dependencies; refresh refs/reviews before publication. #127 and parent #57/#64/#81 remain open. No OpenSpec archive or merge is authorized by completion of a measurement phase.

**Historical uncertainties:** retain the original run idle p50 16.799999952316284 ms outlier and the earlier WebKit proof readiness timeout as unreproduced, not causally fixed. The prior full Edge run had 516 passes and three stale request-count assertions, subsequently repaired and rechecked; the 54 configured WebKit cases passed, while an additional proof timeout and one synthetic mouse activation were separately retained. Final native-touch checks passed. See the prior startup validation summary and QA for all attempts; no physical execution is claimed.

**Frozen artifacts:** current clean `tmp/cache-final-dist` is served on port **4202**, with `tmp/cache-final-prefix-dist` for `/tactics/`. Keep these bytes intact. Earlier `tmp/startup-final-dist` (`06ad243`), `tmp/startup-prefix-dist`, `tmp/cache-followup/tmp/startup-testfix-dist` (`99ee537`), `dist` in the parent worktree (`f28f331`) and baseline `tmp/baseline/dist` (`f1184d5`) remain historical artifacts; old server availability is not assumed. The exact prior startup preview is https://b0761a21.tactics-guru-v2.pages.dev/; historical release is https://86327a77.tactics-guru-v2.pages.dev/. Use their source identities, never rebuild from dirty source and call it the same artifact.

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
