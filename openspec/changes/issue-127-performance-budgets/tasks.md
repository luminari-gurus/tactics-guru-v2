# Tasks

Implementation of the concrete [plan](../../../docs/ongoing-projects/plan.md) is explicitly authorized by the caller. See the current QA report for evidence and remaining gates.

## 1. Reproduce and bind the baseline

- [x] 1.1 Refresh main, #127 ownership and PR #119/#128 status; record the approved plan and exact source/browser/host identities in `docs/qa/issue-127-performance-budgets.md`. Verify no duplicate claim or unrelated branch changes before implementation.
- [x] 1.2 Restore the retained collector/evaluator in isolated scratch, verify their recorded hashes and reevaluate both historical JSON files. Confirm 18 samples per route, nine cold L3 failures on each and the run landscape repetition-3 warm F1 failure; retain all original bytes.
- [x] 1.3 Capture the recorded release if still accessible without deploying it, then a clean current-main baseline on the same host/browser intended for candidate comparison. Inventory navigation, JS/CSS, encoding, request overhead, deferred loads and bundle module contributions; record any unavailable historical-build reproduction distinctly from retained-data analysis.

## 2. Maintain the capture protocol

- [x] 2.1 Integrate the retained warm save isolation and real run-start controls into the existing collector, with correct root/prefixed route recognition and playable-region gestures. Extend the existing option tests and focused actual-control collector checks; document the exact commands and method differences.
- [x] 2.2 Add or adapt the bounded evaluator to reject incomplete/dirty/mixed/error captures, missing workloads or metrics, and to retain all numeric failures. Verify against the original receipts plus meaningful invalid-input fixtures; use unchanged limits, nearest-rank percentiles and only sub-1e-6 ms arithmetic tolerance.

## 3. Reduce measured critical transfer

- [x] 3.1 Evaluate the scene-isolation hypothesis and retain its measured comparison. Apply the revised minimal stock-Phaser-distribution remedy after the split proves insufficient; verify default battle, proof, content-smoke, run and map entry/loading errors, both renderers, prefixed assets, restart and audio lifecycle with focused browser tests and both typechecks. Document module/request changes.
- [x] 3.2 Compare full cold transfer totals on both routes, including response overhead and any newly deferred requests. Record a before/after artifact-bound receipt and preserve any failing candidate; if the bounded change is insufficient, revise the concrete remedy before expanding into dependency/custom-engine/renderer changes.

## 4. Investigate the idle failure

- [x] 4.1 Repeat the complete uninstrumented matrix sequentially and collect a separate profile of the run landscape warm case, checking render/diagnostic work and lifecycle listener accumulation. Publish distributions and trace conditions; distinguish a reproduced cost, an unreproduced outlier and an unresolved failure without erasing any sample.
- [x] 4.2 Apply a minimal hot-path fix only if the evidence supports it, with a regression covering the demonstrated cause and state/events/RNG and lifecycle equivalence. Verify matched before/after captures and document the causal evidence; if no runtime change is warranted, record that disposition and leave any unmet idle gate explicit.

## 5. Integrated acceptance and delivery

- [x] 5.1 On the exact final candidate run configured unit/content/browser checks, encounter/item posttests, both typechecks, production build and the WebKit device-acceptance matrix. Retain actual commands, failures, retries and limitations; confirm battle/run/recovery/audio/replay and all entry routes still work.
- [x] 5.2 Capture and evaluate all 36 battle/run cold/warm samples sequentially on the exact candidate and comparable baseline. Verify every L1/L2/L3/L4/F1/F2 result, clean served identity, raw intervals, source hashes, workload completeness and absence of browser errors; separately identify local versus approved deployed evidence.
- [x] 5.3 Complete the QA report and acceptance map, run strict OpenSpec and whitespace checks, commit/push focused changes and verify remote parity. Open a PR with `Refs #127` if any deployed or budget gate remains, or `Closes #127` only when all criteria are verified; reference #57/#64/#81 without closing them by proxy.

## 6. Resolve the remaining deployed loading gates

- [x] 6.1 Trace the current preview's navigation, dependency and scene-asset sequence against the measured loading failures. Select a bounded client-side early-loading experiment from the emitted bundle graph and existing asset registry; preserve the authoritative loader and keep the map route lightweight.
- [x] 6.2 Implement and measure route-specific resource hints only if they reduce the demonstrated wait. Preserve both renderers, error handling, persistence, audio, startup movement and the original controls-usable marker; include every requested byte and reject any duplicate-load or route regression. Cache policy is handled only by the separately approved section 7; production activation remains outside this change.
- [ ] 6.3 Verify the resulting source with appropriate full functional, prefixed-route and unchanged complete performance matrices, preserving all earlier failures. Publish a focused dependent PR when ready and reconcile the loading gates without changing limits or substituting diagnostic retries for acceptance.

## 7. Approved versioned-asset cache follow-up

- [x] 7.1 Emit exact content-hashed JS/CSS one-year immutable rules through the existing build plugin; verify every rule against actual root and `/tactics/` outputs and exclude HTML/fixed assets. Verify runtime-source parity before reusing functional results, and run focused route checks, both typechecks and production builds.
- [x] 7.2 Commit and publish the focused dependent source PR, inspect its exact preview headers and warm cache reuse, then capture the unchanged complete battle/run matrix without request interception or overlapping test workloads. Preserve every failed attempt and bind source/build/browser/collector identities.
- [x] 7.3 Publish the acceptance receipts and current handoff, reconcile task 6.3 only from complete passing evidence, and verify strict OpenSpec, document links, Git scope and remote parity. Leave the full stack ready for review without merging or production activation.

## 8. Reduce remaining measured engine startup work

- [x] 8.1 Compare the pinned package's stock minified Arcade build and direct stock source entry against the current candidate with the same browser and real cold/warm control workload; retain every diagnostic and actual output-size result. Reject the ineffective minified-file/minifier alternatives; select direct bundling with the published feature flags, without changing audio ownership, animation, measurement markers or budgets.
- [ ] 8.2 Verify any retained engine-distribution change with applicable full functional, Canvas/WebGL, audio/lifecycle, prefixed-route and device checks, both typechecks/build, then clean complete local/preview performance matrices. Publish source and evidence in focused dependent PRs; reconcile task 6.3 only when all gates pass.

## Review repair: PR #129

- [x] R129.1 Gate the initial idle p50/p95 as well as the final window so later frames cannot erase an observed failure; prove initial-only and final-only failures with raw intervals.
- [x] R129.2 Exclusively create evaluator output to preserve raw captures across case, hard-link and symlink aliases; prove the CLI refuses aliases without changing input bytes.
- [x] R129.3 Run local measurement regressions and both typechecks, validate OpenSpec, publish the focused repair and verify the exact remote head. Carry the repair through each dependent PR in order.

## Review stack integration

- [ ] RS.1 After carrying the verified evaluator and save-recovery repairs through PRs #132-#137, run applicable final functional checks and source-bound complete battle/run performance matrices on the combined runtime; retain prior failures and record current acceptance in PR #138.

## Workflow follow-up

- Any production target/build/activation decision remains separately authorized under #83-#85.
- Sync/archive this OpenSpec change only after the implementation is merged and the repository's completion requirements are met.
