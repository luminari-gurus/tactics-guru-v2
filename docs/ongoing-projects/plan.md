# Issue #127 — restore battle and run performance budgets

Updated 2026-10-17 (Asia/Jerusalem). **Implementation authorized and in progress.**

## Current execution handoff

The caller explicitly requested implementation with OpenSpec, ablation, autonomous issue repair and focused PR publication. That supersedes the historical planning-only pause below. Use OpenSpec change `issue-127-performance-budgets` and [current QA](../qa/issue-127-performance-budgets.md). No deployment, release tag or parent-issue closure is implied.

Refreshed `origin/main` remains `0b317e35bb5c4ce713c242311f0673fc27923637`; planning head is `c4ec0d0`. #127 remains assigned to `moshehbenavraham`; PR #119 remains open at `2b419eff`, and #128 remains assigned to `florysaxz`. Their work is preserved. The clean baseline worktree is `tmp/baseline` at exact main; it is a detached checkout with ignored build/dependencies.

**Outcome:** preserve the complete game while producing reliable source-bound budget evidence and the measured critical-code remedy. **Non-goals:** runtime redesign, new assets, dependency updates, deployment or release configuration. **Files:** existing measurement scripts/tests, selected scene boot modules, these OpenSpec/QA documents. **Proof:** retained-data equivalence, actual-control complete capture matrices, required functional suites, both typechecks and production builds. The ablation pass retains the planned seams and removes any need for a second collector or speculative frame-loop optimization.

Publication: [PR #129](https://github.com/luminari-gurus/tactics-guru-v2/pull/129) contains the completed collector/evaluator chunk at `6477ac5`, ready for review with clean remote parity. The active branch is now `branch/issue-127-runtime-budget`, stacked on `work/issue-127-performance-budgets`. Completed chunks are review-ready per the caller; all unmet deployed/budget acceptance remains explicit with `Refs #127`. The aggregate issue remains open until its gates pass.

The scene-isolation experiment at `6c18fa7` passed 84 focused browser cases but saved only **223 battle / 1,143 run bytes** in cold route probes (407,063 / 414,354 bytes). Request overhead consumed most of the removed code. Ablation therefore removes that experiment from the final source: existing startup, errors, audio recovery, restart and BFCache logic remain intact.

**Revised bounded remedy:** use the already-installed, unmodified Phaser 4.2.1 `dist/phaser-arcade-physics.js` distribution via an exact Vite alias for `phaser`. Its source differs from the full distribution by excluding Matter.js; both Canvas/WebGL renderers, sound and scene APIs remain enabled. No project source uses Phaser physics: deterministic combat/grid rules remain outside the renderer. This is a stock package selection, not a custom build or dependency upgrade. The first build estimate drops the shared start gzip size from 399.32 to 365.98 kB; actual complete matrices are still required. Final source scope is Vite configuration plus actual boot/error/Canvas-fallback checks; full suites, separate profiling and final matrices remain pending.

Progress: **5/12 OpenSpec tasks complete** (baseline and collector/evaluator), with the revised runtime remedy implemented. Historical and fresh baseline evidence is preserved in QA. Current candidate checks pass **696 unit tests, 167 content checks, both typechecks, production build and 18 boot/error/Canvas-fallback browser cases**. Next: publish the dependent runtime chunk, run the full configured browser and encounter/item/WebKit suites, collect separate baseline/candidate profiles, then capture complete local and existing preview matrices. Verify actual source identities and every gate; keep remaining failures explicit.

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

# Prior project handoff — 2026-10-16 (retained history)

## Device acceptance policy and closeout — 2026-10-17

[PR #125](https://github.com/luminari-gurus/tactics-guru-v2/pull/125) merged the standing caller instruction: Playwright/device emulation is sufficient for all existing and future device acceptance unless the caller explicitly requests physical testing for that task. Historical hardware-only gates below are superseded.

[Current device audit](../qa/device-acceptance-2026-10-17.md) records WebKit recovery-focus repairs in [PR #126](https://github.com/luminari-gurus/tactics-guru-v2/pull/126), verified persistence acceptance (#74/#58, closes on merge), and the unreproduced #66 restart disposition. #64/#81/#57 remain open for actual deployed transfer/idle failures in [#127](https://github.com/luminari-gurus/tactics-guru-v2/issues/127), not hardware availability. Original failures and source-bound measurements are retained. Release decisions remain separate.

Main is `b175ddb5dabed2ee8457e132e345e9a2fc2affdb` after [PR #120](https://github.com/luminari-gurus/tactics-guru-v2/pull/120) merged the playable three-encounter run. Initial local source inspection used `work/issue-79-reward-item-controls` at `3060060`; the documentation PR is based on the main revision above. Tracker status was checked on 2026-10-16; no runtime tests or physical certification were performed for this documentation refresh.

## Delivered

- Battle save envelope, guarded storage and autosave/Continue: #69/#72/#73, merged PRs #70/#91/#95.
- Run contract, three authored encounters, reward/item catalog, atomic commands, resumable controls and integrated progression: #75–#80, merged PRs #107/#109/#114/#115/#116/#120.
- Standalone `/map` with layout, biome and art selection: #87/#96–#99 complete.
- Signature effects #106 and responsive-controls design #108 complete. PR #113 fixed dialog focus/held-key resets; PR #118 delivered drawable board regions.

## Remaining work

#111 remains open; [PR #119](https://github.com/luminari-gurus/tactics-guru-v2/pull/119) contains the ongoing responsive-control/inspection work. #121 requests unit health bars. Preserve existing ownership and review progress before selecting work.

#57/#64/#66 retain first-battle physical readiness and Safari restart acceptance. #58/#74 retain persistence lifecycle certification. #59/#60 and full-run certification #81 remain open despite completed implementation children. #83–#85 and open PR #12 retain separate release-path and production-approval scope. Merged implementation is not evidence that these acceptance gates passed.

The maintained [restart plan](../phaser4-restart-plan.md) and [technical design](../tech_design.phaser4.draft.md) summarize current delivery. Task QA and historical records keep their original source/build/device limits.

## Prior #111 handoff — 2026-10-15

The detailed review handoff below is retained from main. Its #80 ownership statement describes that earlier checkpoint; #80 has since merged as recorded above. Refresh PR #119 before acting on its recorded review state.

# Issue #111 — PR #118 merged; PR #119 follow-up

Updated 2026-10-15 (Asia/Jerusalem). **The geometry prerequisite is merged. Issue #111 remains open.** The remaining responsive HUD/input implementation already exists in PR #119; continue from that PR and its two review findings.

- [PR #118](https://github.com/luminari-gurus/tactics-guru-v2/pull/118) merged into `main` as `ffb0d0a4dd0bb1989ac4572d82a9edf08f61585b`, preserving its three commits and the ancestry used by #119.
- [PR #119](https://github.com/luminari-gurus/tactics-guru-v2/pull/119), branch `branch/issue-111-responsive-hud`, is the remaining delivery for [issue #111](https://github.com/luminari-gurus/tactics-guru-v2/issues/111). Its reviewed implementation head is `c7f02f9389aa7ed945b237ffbb22b6b5c95123a6`; source repair and verification remain necessary before merge.
- [Fresh PR #118 merge verification](../qa/pr-118-merge.md) records the exact tested tree, commands and limits. Main contains the shared rectangle API and migrated callers; the responsive rail/dock is still in #119.
- [Original implementation plan and acceptance map](https://github.com/luminari-gurus/tactics-guru-v2/blob/ba47b0a95ff315fd3f38e7d628f99ffbe5ef3307/docs/ongoing-projects/plan.md), [PR #119 delivery record](https://github.com/luminari-gurus/tactics-guru-v2/blob/c7f02f9389aa7ed945b237ffbb22b6b5c95123a6/docs/ongoing-projects/plan.md), [accepted design](issue-108-battle-controls-design/design.md), and [implementation QA](https://github.com/luminari-gurus/tactics-guru-v2/blob/c7f02f9389aa7ed945b237ffbb22b6b5c95123a6/docs/qa/issue-111-battle-controls.md) preserve the detailed scope and earlier evidence. The earlier statement that no work remains predates the two review findings below.
- OpenSpec remains active: [proposal](../../openspec/changes/issue-111-responsive-battle-controls/proposal.md), [design](../../openspec/changes/issue-111-responsive-battle-controls/design.md), [delta](../../openspec/changes/issue-111-responsive-battle-controls/specs/battle-controls/spec.md), [tasks](../../openspec/changes/issue-111-responsive-battle-controls/tasks.md). Main has only task 1.1 complete; #119's checked implementation tasks do not resolve later review findings or close the issue.

## Concrete next-session work

1. Refresh `main`, PR #119's head/base, review threads and working-tree state. #119 now targets `main`; its handoff conflict has been reconciled without changing runtime/test source. Preserve the original implementation commits and reconcile newer work if the branch has changed. The source checkout is `C:/Users/apexw/.codex/worktrees/issue-111-responsive-controls/Tactics-Guru`; inspect it before reuse because it may belong to active work.
2. Address [target-identity finding](https://github.com/luminari-gurus/tactics-guru-v2/pull/119#discussion_r4286775892): when a defeated unit and living unit share a cell, dropdown/target feedback, inspection, confirmation and the committed command must identify the same living target. Prefer the living occupant and derive confirmation identity from the prepared command. Add the legal seed-1 shared-cell regression described in the review.
3. Address [feedback-overlap finding](https://github.com/luminari-gurus/tactics-guru-v2/pull/119#discussion_r4286775908): at a panned drawable edge, Guarded and the target's damage feedback must remain separately readable. Resolve intersections across visible units' feedback stacks and assert pairwise non-overlap, including the reviewed 320x568 legal Guarded Strike scenario.
4. Verify each repair and the affected target/inspection/confirmation and board/animation paths. Run the repository's required unit/content checks, both typechecks, production build and applicable browser/posttest acceptance on the resulting branch. Record exact revisions and results; prior 420-case browser and 48-case prefix reports are retained evidence, not fresh validation of new fixes. Resolve review threads only after proving the repairs.
5. Merge #119 when its repairs, verification and current repository rules permit. Only then reconcile #111's acceptance checklist and close the completed issue. Sync/archive the OpenSpec change when the complete change is delivered. Keep the geometry-only merge from being mistaken for completion of the rail/dock issue.

## Scope and Git decisions

#118 needed no conflict resolution or history rewrite: current main was already its ancestor. A merge commit preserved the stack. No release tag is warranted for this partial feature delivery. #119 targets `main`; integrating this handoff into it changed documentation only and preserved its runtime/test source objects and both unresolved review threads.

GitHub automatically closed #111 when #118 merged. Final status verification caught the premature closure; #111 was reopened and verified open because #119 and its two findings are still outstanding.

The requested #118 merge session does not start either #119 repair. There is no new work item to invent: the existing PR and findings describe the remaining work. Preserve current combat/RNG, command/confirmation, save/audio, native dialog and reward/item contracts. #80 remains separately owned; physical-device, screen-reader and release/deployment acceptance remain outside this handoff.
