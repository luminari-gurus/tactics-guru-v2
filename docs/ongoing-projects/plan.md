# Issue #127 — restore battle and run performance budgets

Updated 2026-10-18 (Asia/Jerusalem). **Cold-code repair verified; deployed loading work continues.**

## Current execution handoff

Main is `a009a3ec4c35b3e57adc58ac700e56721af9ae8f`. Collector [PR #129](https://github.com/luminari-gurus/tactics-guru-v2/pull/129) is at `f1184d5ab474a97df418183edb4f56f4831a4366`; runtime [PR #130](https://github.com/luminari-gurus/tactics-guru-v2/pull/130) is frozen at **`f28f33181f2d1d4cb6eacf284e7753e56c674397`**. Its exact preview is **https://10caa3ab.tactics-guru-v2.pages.dev/**. Both PRs are non-draft and mergeable. The active `branch/issue-127-performance-evidence` is publishing the completed cold-code evidence above #130; preserve the runtime head.

**Completed:** the stock Phaser Arcade distribution removes unused Matter physics without changing application source relative to main. 697 unit tests, 167 content checks, both typechecks/build, 501 Edge cases, 54 Linux WebKit cases, 39 encounter/item posttests and 45 prefixed-path cases all pass without skips/retries. The source-bound **144-sample** matrix is complete and has zero capture/browser errors. Local candidate code transfer is **378,879 / 387,151 bytes** (battle/run), saving **33,104 / 33,105** against the matched current base; all 36 local candidate samples meet every gate. Deployed candidate cold code is **379,469–379,607 / 388,088–388,220 bytes**, also below 400,000.

**Remaining:** deployed loading still fails: one battle cold sample is 2592.7 ms; six battle warm samples exceed 750 ms (worst 1896.6); nine run warm samples exceed 750 ms (worst 1183.1). Keep #127 open. Frame/asset gates pass under the final Edge conditions, but the original 16.799999952316284 ms outlier is not causally fixed: original and earlier failures remain retained, and Edge's approximately 8.3 ms cadence differs from the earlier approximately 16.7 ms captures. Separate profiles show unchanged state, stable listeners over scene runs 2/3/4 and byte-identical baseline/candidate screenshots; no hot-path change is justified.

OpenSpec `issue-127-performance-budgets` has **11/15 tasks complete** before evidence publication. Task 5.3 is finishing; section 6 tracks the remaining loading work. See [QA](../qa/issue-127-performance-budgets.md), especially the final performance summary, source binding, request inventories and loading diagnostic. An immutable original release was recovered and freshly captured at **https://86327a77.tactics-guru-v2.pages.dev/**, bound to `13418626`; no redeployment was needed.

Next actions:

1. Finish and publish the documentation-only evidence PR on top of #130, update task 5.3 and verify clean remote parity. The runtime source must remain at its tested head.
2. Start `branch/issue-127-startup-preload` from that evidence head and apply OpenSpec section 6. The warm diagnostic shows significant wait before Phaser scene initialization and repeated 304 validations. Existing Vite output already preloads each asynchronous entry once its caller runs, so merely adding the same entry to `resolveDependencies` is a no-op and is rejected.
3. Investigate a bounded **early, route-specific HTML resource-hint** experiment. Derive JS/CSS dependencies from the emitted bundle and blocking battle image paths from the existing `battleAssets` registry. Preserve the lightweight map route, proof/content-smoke behavior, CSP/nonce policy and the authoritative loader. Do not execute either app before its normal DOM/style boundary. Validate that hints are reused rather than causing duplicate transfer, then measure whether the actual startup wait falls.
4. Preserve all earlier failed attempts. Do not shorten startup movement, move the usability marker, change frame sampling or limits, drop required assets/features, or change hosting/cache policy to manufacture a pass. Only retain an experiment supported by measured improvement and functional proof; publishing a source PR does not authorize production activation.
5. Run the appropriate full functional/prefix checks and the unchanged complete performance matrices on a clean new candidate, then publish the next focused dependent PR. Refresh main/other ownership before publication; do not close #57/#64/#81 by proxy or archive OpenSpec before completion.

Testing environment: Edge **155.0.4283.45** via `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`; official WebKit **26.6** through WSL, where Web Audio and loopback access are verified. Packaged Windows Chromium's cached-history failures and Windows WebKit's audio failures reproduce on baseline and remain archived. The actual wrong-origin comparison fixture is fixed in #129 with configured `baseURL` and a same-build assertion.

Our existing previews are port 4174 for base `f1184d5` and 4188 for stock candidate `f28f331`. Preserve a separate copy/output directory for the stock artifact before new experiments; do not silently change either baseline while measuring. Functional helpers use 4187; prefix checks use 4193. Keep other worktrees' port 4173 untouched. Never run performance capture alongside browser tests/profiling. All helper sources, raw receipts, hashes and exact commands are retained under `docs/qa/issue-127-performance-budgets/`; ignored `tmp/` scripts provide executable copies.

- Issue: [#127 — Resolve deployed cold-code transfer and run idle-budget failures](https://github.com/luminari-gurus/tactics-guru-v2/issues/127).
- Owner: `moshehbenavraham`; [we're-on-it comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/127#issuecomment-6238136484).
- Task branch: [`work/issue-127-performance-budgets`](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-127-performance-budgets), published from the base below and natively linked to #127 in GitHub's Development section.
- Planning/base revision: `main` at `0b317e35bb5c4ce713c242311f0673fc27923637`; [base tree](https://github.com/luminari-gurus/tactics-guru-v2/tree/0b317e35bb5c4ce713c242311f0673fc27923637).
- Isolated worktree: `C:/Users/apexw/.codex/worktrees/issue-127-performance-plan/Tactics-Guru`. The original checkout and other task worktrees are preserved.
- Supporting artifacts: [backlog review](issue-127-performance-budgets/backlog-review.md), [proposal](../../openspec/changes/issue-127-performance-budgets/proposal.md), [design](../../openspec/changes/issue-127-performance-budgets/design.md), [evidence requirements](../../openspec/changes/issue-127-performance-budgets/specs/battle-performance-evidence/spec.md), [performance requirements](../../openspec/changes/issue-127-performance-budgets/specs/battle-frame-performance/spec.md), [implementation tasks](../../openspec/changes/issue-127-performance-budgets/tasks.md).

## Why this is the best available work

The review covered all 12 open repository issues without filtering by readiness label, all comments, both open PRs, 64 remote branches, native dependency/sub-issue relationships and current main. #127 directly holds up [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57), [#64](https://github.com/luminari-gurus/tactics-guru-v2/issues/64) and [#81](https://github.com/luminari-gurus/tactics-guru-v2/issues/81), with further acceptance implications for #59 and #85. It is unblocked and has concrete failure evidence and fixed limits.

#111 is already covered by PR #119; #123 requires that PR to merge; #128 belongs to another contributor. #84's read-only release planning is possible but needs owner choices to finish, while #83/#85 retain release authorization gates. Parent acceptance reconciliation is useful but does not remove the measured performance failures. No new readiness labels were justified; existing labels and other claims were preserved. Private project-only drafts could not be enumerated because the credential lacks `read:project`.

Local physical capability is Android only. Current [AGENTS.md](../../AGENTS.md) and merged PR #125 accept Playwright/device emulation, including for this issue. No physical platform is required by #127. Device availability therefore does not block it, and no physical test is claimed.

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
