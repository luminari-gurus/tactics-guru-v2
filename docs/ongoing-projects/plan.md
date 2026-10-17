# Issue #127 — restore battle and run performance budgets

Updated 2026-10-17 (Asia/Jerusalem). **Implementation authorized and in progress.**

## Current execution handoff

The caller explicitly requested implementation with OpenSpec, ablation, autonomous issue repair and focused PR publication. That supersedes the historical planning-only pause below. Use OpenSpec change `issue-127-performance-budgets` and [current QA](../qa/issue-127-performance-budgets.md). No deployment, release tag or parent-issue closure is implied.

Main advanced to `a009a3ec4c35b3e57adc58ac700e56721af9ae8f` after PR #119 merged. This base branch now incorporates that reviewed responsive HUD and its integration fixes without changing their runtime source. #127 remains assigned to `moshehbenavraham`; #128 remains separately owned. Integration uses the previously created `tmp/baseline` worktree; old `0b317e3` receipts remain immutable historical evidence.

[PR #129](https://github.com/luminari-gurus/tactics-guru-v2/pull/129) is the collector prerequisite. [PR #130](https://github.com/luminari-gurus/tactics-guru-v2/pull/130) contains the measured stock-Phaser-Arcade remedy and the current runtime handoff. Carry this updated base into that branch before final acceptance. The collector must use the new `#battle-board-region` for gestures; retain the old top-panel fallback only for the historical builds used in the evidence. The persistence comparison now uses the configured `baseURL` and asserts that both pages report the same served build.

**Outcome:** preserve the complete game while producing reliable source-bound budget evidence and the measured critical-code remedy. **Non-goals:** runtime redesign, new assets, dependency updates, deployment or release configuration. **Files:** existing measurement scripts/tests, selected scene boot modules, these OpenSpec/QA documents. **Proof:** retained-data equivalence, actual-control complete capture matrices, required functional suites, both typechecks and production builds. The ablation pass retains the planned seams and removes any need for a second collector or speculative frame-loop optimization.

Publication sequence: finish and publish the collector/evaluator chunk on the requested branch, then stack the measured scene-loading chunk. Completed chunks are review-ready per the caller; all unmet deployed/budget acceptance remains explicit with `Refs #127`. The aggregate issue remains open until its gates pass.

Progress: **5/12 OpenSpec tasks complete** (baseline and collector/evaluator). Historical gate reevaluation exactly matches the original. Complete fresh local and deployed-main matrices plus rejected attempts are retained in QA. Local cold code remains 407,286 battle / 415,497 run bytes. Current deployed main still fails transfer and has warm-loading/frame failures; the old deployed build is no longer served. The collector handles real run startup, warm storage isolation, prefixed paths and source identity; 36 focused unit tests, both typechecks, 45 root-route tests and six prefixed collector tests pass. A real trailing-slash collector bug found in the prefix check was fixed and its failed run retained. Next: publish this completed collector chunk, stack `branch/issue-127-scene-loading`, isolate scene imports, and measure the result before selecting further optimization. Full final suites, profiling and candidate matrices remain pending.

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
3. **Reduce avoidable critical code.** Inspect the production bundle module graph and per-request transfer before editing imports. If confirmed, extract scene-independent engine initialization and dynamically load only the selected scene. Update run startup to import the engine helper directly; retain the existing Phaser/audio configuration, startup error handling, restart and BFCache lifecycle. Verify all routes and missing-chunk errors. Measure aggregate bytes including new request overhead and later required loads; do not equate a smaller named chunk with meeting L3.
4. **Resolve the idle failure from evidence.** Use matched sequential uninstrumented baseline/candidate captures, plus a separate trace to investigate rendering, diagnostic work, listener accumulation and host scheduling. Apply a minimal hot-path fix only for a demonstrated cost. Retain an unreproduced or unresolved outlier explicitly; do not change the frame method or accepted limits to get a pass.
5. **Prove the final candidate.** Run all required functional checks, then the same complete cold/warm capture matrix for battle and run. Publish source-bound raw data, request inventory, per-sample gate results and exact commands. Verify a deployed candidate only on a separately approved existing origin; local proof alone cannot establish the deployed gate.

The first import split may not save the run's required 17,514 bytes. If it is insufficient, retain the comparison and use its module evidence to propose the next bounded remedy. Dependency upgrades, custom Phaser distributions and renderer rewrites require a revised concrete plan. This plan does not preselect those changes or assert an idle root cause.

## Acceptance mapping

1. **Reproduce release totals and idle outlier; inspect request inventory.** Tasks 1.1–1.3 and 4.1 retain original JSON/hashes, reproduce when possible and capture a fresh matched baseline. Deliver source/build/collector/browser/host identities, every request's transferred/encoded/decoded sizes and raw interval distributions. If the original build cannot be served, report that gap rather than calling reevaluation a fresh reproduction.
2. **Cold critical code at or below 400,000 bytes without feature loss.** Tasks 3.1–3.2 and 5.1–5.2 require all nine cold samples on each route to pass and preserve gameplay, audio, persistence, rendering, input and accessibility. Test the default battle, run, proof, content-smoke and map routes plus prefixed assets, recovery and missing loads.
3. **Investigate idle without guessed causes or changed limits; retain all samples.** Tasks 2.2 and 4.1–4.2 keep the original 16.799999952316284 ms failure, paired conditions and separate profiling. Preserve any failed attempt; no selective retry replacement or timer/percentile change. Unresolved failures remain open.
4. **Applicable regressions, both typechecks/build and identical capture matrix.** Tasks 5.1–5.3 require the full commands below and 36 samples: two routes × three profiles × three repetitions × cold/warm. Per-sample limits remain L1 cold <=2500 ms, L2 warm <=750 ms, L3 cold code <=400,000 bytes, L4 scene assets <=1,500,000 bytes, F1 idle p50 <=16.7/p95 <=20 ms and F2 pan/zoom/move p95 <=33.4 ms. Ignore only floating arithmetic noise below 1e-6 ms.

## Files and verification

Expected implementation files are `src/phaser/start.ts`, a small new engine-creation module, `src/app/startBattleApp.ts`, `src/app/startRunApp.ts`, `scripts/measure-fit.ts`, `scripts/measure-fit-options.ts` and existing tests. Change `vite.config.ts`, `BattleScene.ts`, `BoardRenderer.ts` or diagnostics only when the measured graph/profile warrants it. No changes to pure combat rules, authored content, save schemas, dependencies or release configuration are selected.

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
