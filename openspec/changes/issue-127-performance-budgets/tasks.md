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

- [ ] 3.1 Evaluate the scene-isolation hypothesis and retain its measured comparison. Apply the revised minimal stock-Phaser-distribution remedy after the split proves insufficient; verify default battle, proof, content-smoke, run and map entry/loading errors, both renderers, prefixed assets, restart and audio lifecycle with focused browser tests and both typechecks. Document module/request changes.
- [ ] 3.2 Compare full cold transfer totals on both routes, including response overhead and any newly deferred requests. Record a before/after artifact-bound receipt and preserve any failing candidate; if the bounded change is insufficient, revise the concrete remedy before expanding into dependency/custom-engine/renderer changes.

## 4. Investigate the idle failure

- [ ] 4.1 Repeat the complete uninstrumented matrix sequentially and collect a separate profile of the run landscape warm case, checking render/diagnostic work and lifecycle listener accumulation. Publish distributions and trace conditions; distinguish a reproduced cost, an unreproduced outlier and an unresolved failure without erasing any sample.
- [ ] 4.2 Apply a minimal hot-path fix only if the evidence supports it, with a regression covering the demonstrated cause and state/events/RNG and lifecycle equivalence. Verify matched before/after captures and document the causal evidence; if no runtime change is warranted, record that disposition and leave any unmet idle gate explicit.

## 5. Integrated acceptance and delivery

- [ ] 5.1 On the exact final candidate run configured unit/content/browser checks, encounter/item posttests, both typechecks, production build and the WebKit device-acceptance matrix. Retain actual commands, failures, retries and limitations; confirm battle/run/recovery/audio/replay and all entry routes still work.
- [ ] 5.2 Capture and evaluate all 36 battle/run cold/warm samples sequentially on the exact candidate and comparable baseline. Verify every L1/L2/L3/L4/F1/F2 result, clean served identity, raw intervals, source hashes, workload completeness and absence of browser errors; separately identify local versus approved deployed evidence.
- [ ] 5.3 Complete the QA report and acceptance map, run strict OpenSpec and whitespace checks, commit/push focused changes and verify remote parity. Open a PR with `Refs #127` if any deployed or budget gate remains, or `Closes #127` only when all criteria are verified; reference #57/#64/#81 without closing them by proxy.

## Review repair: PR #129

- [x] R129.1 Gate the initial idle p50/p95 as well as the final window so later frames cannot erase an observed failure; prove initial-only and final-only failures with raw intervals.
- [x] R129.2 Exclusively create evaluator output to preserve raw captures across case, hard-link and symlink aliases; prove the CLI refuses aliases without changing input bytes.
- [x] R129.3 Run local measurement regressions and both typechecks, validate OpenSpec, publish the focused repair and verify the exact remote head. Carry the repair through each dependent PR in order.

## Workflow follow-up

- Any production target/build/activation decision remains separately authorized under #83-#85.
- Sync/archive this OpenSpec change only after the implementation is merged and the repository's completion requirements are met.
