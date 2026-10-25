# Issue #220: reliable collector-owned preview startup

Date: 2026-10-22 (Asia/Jerusalem). Status: implementation and required qualification complete; both [PR #225](https://github.com/luminari-gurus/tactics-guru-v2/pull/225) review findings are repaired, published and resolved. The PR is ready to merge. OpenSpec change: `issue-220-preview-readiness`, 8/8 tasks complete. No merge or production operation performed.

- Issue: [#220](https://github.com/luminari-gurus/tactics-guru-v2/issues/220), DevOps: repair local performance collector preview readiness [P2].
- Owner: `moshehbenavraham`; [kickoff comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/220#issuecomment-6346084262).
- Base: `main` at `4f6614edee382def5f284a17e7f5872aafbbb02e`.
- Work branch: [branch/issue-220-preview-readiness](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-220-preview-readiness), created from that base and natively linked in the issue's Development section. This planning commit publishes the plan on that branch.
- Coordination: [#199](https://github.com/luminari-gurus/tactics-guru-v2/issues/199), [#200](https://github.com/luminari-gurus/tactics-guru-v2/issues/200) and [PR #209](https://github.com/luminari-gurus/tactics-guru-v2/pull/209). These remain separately owned/tracked; this branch claims only #220.
- Previous root plan: [issue-221-desktop-timeouts-plan.md](issue-221-desktop-timeouts-plan.md), preserved byte-for-byte. Its historical open-PR statements remain historical; PR #223 is now merged. Its OpenSpec proposal points to the preserved plan.

## Outcome

Make `npm run measure:fit` start exactly one owned local Vite preview, recognize that preview within a bounded deadline independently of human-readable output, and await its cleanup on success or failure. Preserve actionable startup diagnostics, source/build identity, remote-origin behavior, strict port 4174 and all current measurement sampling and limits. Prove the startup/failure contract and one isolated local production capture without erasing prior failures or claiming the whole #200 baseline is complete.

The caller has now authorized implementation, focused tests, one capture, commits, pushes and review-ready PR publication. Use the existing OpenSpec root and [issue-220 change](../../openspec/changes/issue-220-preview-readiness/proposal.md) to track implementation. No merge or production operation is authorized.

## Continuation checkpoint

- Review repair: both P2 findings reproduced against `1882cec` (five failing regressions) and repaired in `47baafb1ebcff4a493482bb0a524a33f7c8756b1`. Preserve the initiating abort alongside secondary capture/cleanup errors; abort promptly on preview exit and defer its diagnostic snapshot until bounded close/pipe drain. Final affected contracts pass 67/67; both type scopes and two real Chromium browser-close checks pass. [Repair receipt](../qa/issue-220/review-repair.json) binds source/tests and compressed RED/GREEN/iteration/browser logs. Fourteen original input hashes and all app/assets are unchanged; reuse the earlier build/capture only for unchanged measurement behavior. No new sampling/build/full regression. Fix and replies are published, both threads resolved, and head/base/merge tree/parity verified. OpenSpec is complete at 8/8. Preserve existing history/capture provenance; no rebase, stack or tag is needed. Final tracking commit changes documentation only.
- Clean starting branch/HEAD: `233970a8730d886fe4d0fbad05285e0d142dd3b4`; fetched main remains `4f6614edee382def5f284a17e7f5872aafbbb02e`. #220 still assigned to `moshehbenavraham`; no existing implementation PR. #209 remains separate and open.
- Recovered original artifact to ignored `tmp/issue-220/original-failure.zip`; extract bounded relevant receipts for durable QA records.
- Initial Windows probe at unchanged collector source failed before binding because installed dependencies lack the Windows Rolldown native binding. Raw normal/colored stderr and `reproduction.json` are retained under `tmp/issue-220/`; repair via lockfile install before useful startup reproduction. This is a local setup failure, not an explanation of the historical hosted failure.
- Tool paths in this session: Node is bundled on PATH. npm CLI: `C:/Users/apexw/AppData/Local/node/corepack/v1/npm/11.19.1/bin/npm-cli.js`; OpenSpec CLI: `C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js` (run both with Node). WSL also has npm/OpenSpec/gh available.
- Scope remains minimal: private Vite IPC worker + lifecycle, collector integration, focused contracts, QA receipts. No shared harness, dependencies, runtime, assets or budgets need changing.
- Reproduction and lifecycle implementation are complete. [QA reference](../qa/issue-220-preview-readiness.md) retains historical raw failure/metadata and actual normal/colored/chunked observations. Colored pinned Vite output deterministically misses the old predicate despite HTTP 200. Historical root cause remains unproved.
- Focused final contracts: 62/62 pass (22 new + 40 existing). Production build passed 221 content cases, both type scopes and Vite; final helper/tests pass app TypeScript. Reuse unchanged content/domain evidence and bundle once after freezing HEAD to bake clean final identity. Default full-run discovery still has 19 stages; do not execute the full matrix.
- Independent Windows orchestration assertion defect reproduced at exact main and repaired in [PR #224](https://github.com/luminari-gurus/tactics-guru-v2/pull/224), commit `39b7a7aefa5b7e96623415f955c31880d60660a8`; 10/10 portable contracts pass. This branch retains the unmodified test and its 9/10 Windows result. No collector dependency on that test-only PR.
- Delivered collector implementation: `33f3595be96dd12a4cfc7fdb3e443352a5f4b30d`, pushed in [PR #225](https://github.com/luminari-gurus/tactics-guru-v2/pull/225), targeting main. This exact clean source was bundled and served throughout the one default production capture. Subsequent commits contain only evidence/docs/OpenSpec tracking, so reuse the recorded relevant input hashes without rerunning the app.
- Qualification: local Windows/Node 24.19.0, Chromium 153.0.8010.12, Playwright 1.63.0; desktop/portrait/landscape screenshots inspected. No concurrent browser-test/collector/Vite job; existing desktop apps and 17.0% preflight CPU load are recorded limitations. Actual CLI launch-failure injection exits 1 and leaves no result file/listener.
- **Capture complete, acceptance distinguished:** one capture retained 18/18 default samples in 43.3 seconds, exit 0, no browser/capture failure and no preview listener left. Evaluator exit 1 preserves two F1 budget-failing samples (desktop/warm/1 and portrait/warm/1, initial/current p50 16.8 ms > unchanged 16.7 ms), zero loading warnings. Do not rerun for greener numbers or claim #200/performance acceptance. Original historical failure also remains failed.
- Durable [receipts](../qa/issue-220/receipts.json), [raw capture](../qa/issue-220/performance.json.gz), [evaluation](../qa/issue-220/evaluation.json.gz), screenshots and compressed logs live under `docs/qa/issue-220/`. The QA reference explains decompression, commands, provenance, limitations, original failures and follow-up ownership. No release tag is appropriate for this tooling repair.
- Remaining work is review/integration of #225 and independent #224, with merges separately authorized. #199/#200's other coverage and performance acceptance and PR #209 remain independently tracked. Do not archive the OpenSpec change or close coordinating issues during this handoff.
- Final delivery checks: #225 is open/non-draft against `main`, with published evidence at `2fbdba3c1ab54f7fb46938958005e0dd49e0baa3`; #224 is also open/non-draft and independent. Local/remote branch parity is `0 0`, worktree clean before this completion-marker commit. Strict OpenSpec validation, 31 local links, 23 raw receipt/hash checks and all 16 relevant input hashes pass. No PR-triggered hosted workflow runs are reported; local evidence is the qualification used here.

## Selection from the complete backlog (planning snapshot)

Reviewed all **42 open issue bodies**, labels and assignees, all **three open PRs**, current remote branches, native blocked-by/Development links and repository/organization Projects V2. The GraphQL inventory reports 42 issues and `hasNextPage: false`; both project inventories report zero projects and all issue project memberships are empty. The initial review included issues without `ready for work`. Labels were not changed.

#220 was unassigned, had no linked branch, no comments and no implementation PR. It is independently actionable: #199 is a parent, not a prerequisite, and the collector sources are byte-identical between current main and PR #209's branch (`a0185e492d558c29ead872414ffebc6129516876`). #210 and #223 are merged; #219's cleanup is integrated into #209 but has not reached main.

The judgment is to remove a concrete missing-baseline failure before expanding gameplay. #200 explicitly tracks #220 as missing work; #203, #204, #205 and #208 require the comparable #200 baseline. This repair removes one obstacle, not all of those prerequisites. #160 is the strongest gameplay alternative: the encounter-identity prerequisites are merged and progression supports later class/reward work, but it changes shared saves, combat projection and multiple routes. #220 is more bounded and directly improves confidence in subsequent work.

Every open item is accounted for:

- **Owned/in flight:** #85 release operations, #123 / PR #139 mobile HUD, #128 telemetry, #161 effects, #162 ability picker, #200 / PR #209 timing and #219 process cleanup belong to `dubstylee`. PR #12 is a separately held deployment alternative. Do not duplicate or claim them.
- **Selected:** #220 collector preview readiness.
- **Available alternatives, with their own planning decisions:** #153 menu, #155 enemy movement, #160 progression, #172 consumables/revival, #176 records, #177 tactical planning/undo, #179 log export, #181 presentation conveniences, #183 rules docs, #184 generator profiles, #187 direct confirmation, #195 compass and #218 Guarded indicator. #155's only native blocker is already-closed #154. Small UI/docs tasks have less downstream verification value; the broader alternatives introduce more behavior or design work.
- **Dependent or awaiting contracts:** #163-#169 and #171 require unfinished progression/effects/content contracts; #173 needs growth/effect ordering; #174 needs functioning upgrade consumers and currency decisions; #175 depends on #174; #185 explicitly awaits class-stat mapping and #160. #203/#204/#205/#208 still require incomplete #200. Some foundations already exist on main; absence of a native blocker does not settle the body-level prerequisites.
- **Coordination epics:** #170 requires bounded biome implementation issues; #199 coordinates separate verification tasks. Neither is one implementation patch.
- **Explicit adoption/destination decisions:** #178 rotation, #180 optional music/Settings and #182 editor/practice retain decisions or prerequisites. They do not outrank the demonstrated collector gap.

The Actions API now reports [self-hosted run 39767156870, attempt 2](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39767156870/attempts/2) as completed/failure. Earlier issue/PR prose saying it is running is stale. Its raw failure artifact has not been independently audited in this planning pass; do not infer a new collector failure, a successful performance stage or the actual tested checkout from the workflow-head SHA alone.

## Source findings

- [measure-fit.ts](../../scripts/measure-fit.ts) spawns the pinned Vite CLI directly with Node, `127.0.0.1:4174` and `--strictPort`. It sets `previewListening` only when one stdout chunk contains the exact expected URL, and attempts HTTP only after that flag. Formatting, alternate display spelling or chunk boundaries can block a live endpoint. The nominal startup loop is 100 attempts separated by 100 ms, but each `fetch` has no explicit deadline, so it is not a hard total bound.
- Spawn/exit errors append stderr or a message; the final startup timeout discards those details and stdout is not retained. The outer `finally` calls `server.kill()` without waiting for exit/port release. Early startup errors occur before a sample file is written. These are direct code observations, not proof of the historical host's exact startup cause.
- A replacement that merely accepts any HTTP 200 while the new child is alive can race an unrelated listener: that listener may answer before Vite reports its strict-port failure. Ownership must be established before accepting HTTP readiness; an arbitrary sleep is insufficient.
- Inspected the locally installed Vite 8.3.5 implementation and CLI: `preview()` awaits its own strict-port `httpServerStart()` before returning, exposes `httpServer` and an awaited `close()`, and the CLI prints URLs afterwards. This supplies an existing binding boundary without parsing formatted logs. Preserve its normal config/plugin loading and production `dist` behavior.
- [measure-fit-options.ts](../../scripts/measure-fit-options.ts) owns local/remote selection, prefixed URLs, scene/route handling and identity checks. An explicit `--url` or `FIT_URL`, even a loopback URL, is remote mode and must not start, stop or inventory a local preview. Keep this distinction.
- [measure-fit-controls.ts](../../scripts/measure-fit-controls.ts) supplies legal proof/battle/run navigation; [measure-fit-evaluate.ts](../../scripts/measure-fit-evaluate.ts) and [evaluate-fit.ts](../../scripts/evaluate-fit.ts) own acceptance evaluation. Preserve all three.
- [verify-full.mjs](../../scripts/verify-full.mjs) calls the same collector for its performance stage, requires the successful root build, clears inherited `FIT_URL` and writes `performance.json`. PR #209's unmerged timing wrapper is another consumer of the same command, not a new dependency of this repair.
- [measureFitOptions.test.ts](../../tests/unit/measureFitOptions.test.ts), [measurements.test.ts](../../tests/unit/measurements.test.ts) and [verify-full.test.mjs](../../tests/tooling/verify-full.test.mjs) already protect parsing, identity/evaluation and stage isolation. None directly proves preview startup and cleanup.

The [original failed run](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39700595665) is issue-reported evidence: performance failed after 10.58 seconds, emitted `Preview failed to start` and produced no performance.json at source `73d34dba1620174837cf15a93812d393abe690aa`. Its [retained artifact](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39700595665/artifacts/12396082054) has bounded retention. Recover relevant logs/metadata during implementation before they expire. Do not replace that failed observation with an assumed stdout cause.

## Non-goals

No gameplay, save schema, assets, dependency updates, product budgets, sample counts, viewport projects, renderer diagnostics, action UX or remote deployment changes. Do not incorporate PR #209, build a generic process manager, redo #219 descendant containment, change full-matrix selection, provision runners or add a workflow merely for this repair. Do not run a new full regression or baseline for cleaner numbers. Leave #199/#200 and all unrelated issues open. This plan does not authorize merging or production operations.

Physical-device access in the caller checkout is `android`; it is capability information, not completed testing. Physical devices are not required for this issue. AGENTS.md accepts Playwright/browser-device emulation; retain desktop, portrait and landscape collector profiles and describe them accurately.

## Ablation decisions

- **Keep** exact-base reproduction and raw output/HTTP observations: otherwise the reported failure would be assumed rather than dispositioned. Use one bounded startup probe, not another whole baseline.
- **Keep** a positive bind acknowledgement plus live-child and bounded HTTP checks: removing bind ownership can accept an unrelated server; removing HTTP can accept a bound but unusable endpoint; removing liveness can accept a dying preview.
- **Simplify** ownership to one private collector-specific lifecycle module/worker using Vite's existing awaited `preview()` binding boundary. The worker sends a structured IPC bound/error message; stdout/stderr remain diagnostic only. This small handshake replaces log parsing and avoids a general orchestration layer. Preserve the current separate preview process; no detached subprocess tree or npm shell wrapper.
- **Keep** explicit bounded cleanup and diagnostics: sending a signal alone does not prove release of the preview port. Scope escalation to the exact owned child; unrelated processes must survive.
- **Keep** the collector's source/build checks. If the private helper contains collector behavior, include its bytes in `collectorSha256` so the recorded provenance still covers all loaded collector sources.
- **Drop** a new public timeout/configuration surface, new dependencies, generic retry policy, unrelated browser matrices, timing-tool integration and speculative process abstractions. None is needed to satisfy #220.
- **Simplify** verification to the collector lifecycle, existing parsing/evaluation/orchestration contracts, the ordinary build and one isolated production capture. The full application's gameplay matrix has unchanged inputs.

## Files

Implementation files used, with completed proof in the QA reference:

- `scripts/measure-fit.ts`: integrate owned-preview lifecycle, bound startup, retain diagnostic failures, await cleanup and extend source hashing if a helper is added.
- `scripts/measure-fit-preview.ts` (new): one private collector lifecycle boundary, including the child entry that starts the existing Vite preview and acknowledges its own bind. Use the current config, host/strict port and production output; explicitly reject missing build output rather than relying on the CLI-only missing-dist check.
- `tests/unit/measureFitPreview.test.ts` (new): focused real process/HTTP contracts; reuse the existing Vitest selection. Temporary fixture roots/processes belong to each test and are cleaned up. Do not build the game in fast-unit contracts.
- Existing `tests/unit/measureFitOptions.test.ts` or `tests/tooling/verify-full.test.mjs` only if an uncovered changed boundary needs proof; preserve current mode/identity assertions.
- `docs/qa/issue-220-preview-readiness.md` and bounded source-bound receipts under `docs/qa/issue-220/`: reproduction, changes, commands, startup/cleanup and capture results, original failures and limits. Keep bulky raw logs in durable receipt storage with hashes/retrievable locations.
- `docs/ongoing-projects/plan.md`: update progress/evidence during implementation. Update current collector usage documentation only if observable command/failure guidance changes.

Application code, `package.json`, lockfile, Vite config, browser projects and full/timing runners should remain unchanged. If actual reach expands, record the demonstrated cause and revise the affected-consumer proof before continuing.

## Implementation sequence (completed; see continuation checkpoint)

1. **Rebind and reproduce.** Refresh main, #220 ownership/comments, PR #209 and active captures; preserve this branch and plan. Record literal base/current inputs, Node/Vite/OS and child PID. Retain the original failure record. Run the existing pinned CLI startup with piped normal/colored output and controlled chunk splitting; record complete raw stdout/stderr, the old URL predicate and independent HTTP outcomes. Distinguish a deterministic reproduction of the fragile predicate from a proven explanation of the historical run.
2. **Make owned readiness explicit.** Start one direct Node child for the private Vite worker. Await Vite's strict `127.0.0.1:4174` bind before its structured acknowledgement, then poll the existing local document endpoint while the child is alive. Preserve config/plugin and `dist` semantics. Use the existing nominal 10-second startup allowance as a hard monotonic total deadline, with per-request cancellation bounded by the remaining time. Spawn failure, child exit, bind failure, timeout and persistent non-OK/hanging HTTP must fail with bounded stdout/stderr tails, PID/exit/signal and last HTTP error/status. Do not inflate measurement or startup limits, shift to another port or accept a foreign listener.
3. **Make lifecycle completion observable.** Wrap startup and the complete capture in the same owned-resource lifetime. On normal completion, startup/capture/browser-launch failure or catchable interruption, request graceful close, await child exit and bound forced termination of that exact child if needed. Remove temporary signal/listener/timer state. Keep failures nonzero and preserve the original error alongside any cleanup error. No guarantee of cleanup after SIGKILL/host crash is claimed. Remote mode must create no owned preview and kill no process.
4. **Prove the boundaries.** Add the focused contracts below. Use ephemeral ports/static fixture roots internally to isolate tests; production port stays fixed. Exercise the actual pinned Vite path for successful bind and occupied-port rejection. Avoid a permanent fake preview path in production. Include a child that ignores graceful termination so the bounded cleanup path is proven.
5. **Qualify one real capture and hand off.** Commit/freeze implementation before building/capturing so the served build can match source HEAD. Run only the affected checks below and the one default local production capture. Preserve any budget/capture failure and stop rather than repeatedly sampling for a pass. Publish one focused implementation PR later, referencing only #220 for completion; do not merge or close coordinating work in this task.

## Proof and acceptance

Follow [verification-policy.md](../verification-policy.md). The initial planning publication was documentation-only. Implementation and the proof below have now executed; the QA reference and machine-readable receipts give exact results and limitations. Final evidence/docs changes reuse the unchanged collector/app/build inputs instead of repeating the capture or full application suites.

Iteration contracts must prove:

- Ready owned HTTP is accepted with colored, split, URL-free or silent stdout; formatting never controls readiness. Slow startup within the unchanged allowance succeeds.
- Spawn error, child exit before/during probing, strict-port collision, missing `dist`, non-OK HTTP, hanging response and total timeout fail promptly with useful bounded diagnostic output. An already-listening unrelated server may respond 200 before the new child exits; it must never be measured, stopped or signaled.
- Graceful success/failure cleanup releases the owned process/port before returning. Failed browser launch/capture and catchable SIGINT/SIGTERM also clean up; forced termination is bounded and does not mask the original failure. An unrelated sibling survives. A second start can reuse the released owned port.
- Remote mode remains independent, including explicit loopback `--url`/`FIT_URL`; no local process or local dist inventory is used. Existing scene, prefix, source/build and mixed-build checks remain intact. No samples or missing result file are converted into a passing result.

Proposed final commands, from the implementation checkout with lockfile-matched dependencies:

```sh
npm ci
npm run test:unit -- tests/unit/measureFitPreview.test.ts tests/unit/measureFitOptions.test.ts tests/unit/measurements.test.ts
npm run test:verification
node scripts/verify-full.mjs --list
npm run build
# After the successful build, with FIT_URL unset and no competing browser workload:
npm run measure:fit -- tmp/issue-220/performance.json
node --experimental-strip-types scripts/evaluate-fit.ts tmp/issue-220/performance.json tmp/issue-220/evaluation.json
git diff --check
```

The new preview contract path becomes valid only when implemented; the other command paths/scripts were checked in current main. `npm run build` includes content validation and both TypeScript scopes, so do not repeat them separately. The orchestration list is discovery only; do not execute `verify:full`. The evaluator requires distinct paths and refuses to overwrite its output; choose a unique receipt directory for an intentional later run.

Use qualified, otherwise idle local/self-hosted capacity for the single capture, with no automatic GitHub-hosted fallback and no overlapping GPU workloads. If a runner dispatch is genuinely needed later, reuse authorized trusted-code execution and `tactics-browser-exclusive`; do not add an ad hoc branch-code trigger. Record Node/OS/browser/CPU, cache/background-load limitations, exact collector source/hash set, served build commit/dirty flag, build inventory and raw exit/output. The default proof capture must retain all **18 samples** (three profiles, three repetitions, cold/warm) and unchanged evaluator limits. Preserve nonzero results and distinguish successful collection from budget acceptance.

No battle/run/dungeon gameplay, WebKit, telemetry or full regression rerun is selected for the bounded collector lifecycle change. Their implementation/config inputs are unchanged. If any of those inputs changes, or lifecycle reach becomes shared/unbounded, expand according to the policy and document why. Neither focused contracts nor a completed 18-sample capture constitutes a complete #200 baseline, a claimed speedup, physical-device proof or production acceptance.

Every #220 implementation acceptance bullet now has an evidence-backed disposition in the QA reference: reproduction, bounded owned HTTP readiness/diagnostics, preserved identity/modes/strict port/limits, awaited cleanup/foreign survival, focused contracts and one retained isolated production capture. The 10.58-second historical failure and current evaluator budget failures remain preserved. Review PRs and final Git parity are the handoff boundaries; no full-baseline or performance-budget pass is claimed.
