# Performance build-provenance recovery — 2026-10-23

The full capture [39952038146](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39952038146) collected 18 samples but rejected their dirty build identity. Its failed aggregate remains unchanged. The unit simulation test rewrote tracked `docs/qa/procedural-grids/simulations.json` before bundling; current generated output differs from the historical receipt. Vite therefore correctly embedded `dirty:true` although preparation began clean.

Fresh simulation and full-corpus receipts now go to ignored `verification-receipts/procedural-grids/`. Historical QA evidence, test assertions, Vite dirty-source checks, collector/evaluator limits and sample counts remain unchanged.

## Self-hosted recovery

[Run 39991089115](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39991089115) passed at `5a161daa59c71e7929df20c574ee9cf3b723d98a` on `unraid-tactics-01`. Manual capture selected only `performance`, with its required preparation. All 934 units, both TypeScript scopes, two build integrations and the ordinary bundle passed. The performance stage took 45.716 seconds: all 18 cold/warm samples across desktop, portrait and landscape passed evaluation, with zero capture failures, zero budget failures, matching clean source/build identity, unchanged input hashes and complete collector/evaluator cleanup.

The run used the exclusive self-hosted browser lock and persistent caches; unrelated host workloads were not independently verified. This is emulated browser evidence. Aggregate scope is partial, complete and passed, with `baselineEligible:false`; it does not replace the full run or resolve its landscape audio assertion. No speedup or complete regression pass is claimed.

[Raw performance receipts](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39991089115/artifacts/12518245670) expire November 22, 2026 at 17:00:47 UTC. [Aggregate](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39991089115/artifacts/12517444570) and build artifact retain provenance. Compact results and raw-file SHA-256 hashes are in [evidence.json](evidence.json).

A temporary exact branch allowance enabled the trusted manual capture. It was removed after success; the final workflow is restored to main's original branch restrictions. Later documentation and guard-removal changes did not alter the qualified test-output repair or application/build/collector inputs.

## Local validation

Affected simulation/corpus tests: 3 passed. Batch contracts: 23 passed. Content: 221 passed; both TypeScript scopes, production build and root/prefix build integrations (2) passed. A post-commit bundle embedded the tested commit with `dirty:false`. The additional local full-unit invocation stalled and was stopped; it is incomplete, not a passing result. The authoritative self-hosted preparation subsequently passed all 934 units. No other browser suites were repeated.
