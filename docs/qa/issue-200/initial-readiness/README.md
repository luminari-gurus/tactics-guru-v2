# Initial proof readiness: functional setup and diagnostics

Main was updated to `b169112` after PR #232. The retained failures from runs 39999417958 and 40000400640 occurred before scene restart, at the first audio test's five-second Ready assertion. The original #200 landscape unavailable-status timeout remains a separate, causally unresolved observation.

## Findings and retained failures

The old traces showed quick script downloads followed by a 5–13 second gap before proof-image requests. Screenshot tracing was investigated as a hypothesis; it was not established as the cause. All nine screenshot/off/snapshot-only comparison cases passed, as did six later traced cases with post-test-only observations.

Run [40004220451](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40004220451) then reproduced the desktop failure **without tracing** (two mobile cases passed). Its failure-only attachment records scene init at 16,767 ms, with no scene-ready or controls-usable mark yet. A deliberately stalled portrait produced a second, intentional failed result proving that the failure snapshot survives; its successful diagnostic contract is not a passing browser test.

Native-call timing run [40004852329](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40004852329) passed three cases. Desktop's first `getContext('webgl')` took 3,785.5 ms; AudioContext construction took 40.1 ms and the next WebGL context 6.5 ms. Controls became usable at 4,316.6 ms. This locates substantial startup cost in first-context initialization, but does not prove that the entire earlier 16.77-second delay had the same cause. CPU/memory pressure was low in that later observation; it cannot establish historical load conditions.

A graphics preflight in a **separate** browser process was tried and discarded: run 40005461119 still failed the first desktop case. Its successful capability check did not qualify the test's browser process. A diagnostic-only TypeScript failure in 40004621949 ran no browser cases. All outcomes remain in the evidence ledger.

## Final change and coverage boundary

Only `tests/audio.spec.ts` changes execution setup. It qualifies graphics once in the actual Playwright browser worker, using an isolated temporary context, before yielding that same browser to the suite. It renders/reads back a real pixel with WebGL or Canvas fallback; a mismatch or 15-second setup deadline fails the fixture. Setup context closure occurs before any app context opens. Browser version, project, initialization time, pixel and outcome are retained under the invocation's `graphics-setup/` artifacts.

The existing five-second readiness assertion and every audio assertion remain unchanged, with zero retries and the same 21 test IDs. The functional assertion now starts **after recorded graphics setup**. This is an explicit functional-setup change, not equivalent cold GPU coverage: it warms graphics state in that browser. It neither fixes nor certifies cold GPU startup for players. App-cache performance captures, product loading/frame/byte budgets, browser configuration, application/assets and dependencies remain unchanged. Stage wall time still includes worker setup; no speedup is claimed.

The initial audio test also attaches marks, completed resource timings, portrait state and live diagnostics only when it fails. Snapshot errors are retained without replacing the original failure. No prototype wrappers or global preflight changes remain. Temporary manual workflow changes are restored byte-for-byte to main.

## Qualification and reuse

- [40005996661](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40005996661), tested code `1aa5e51`: **21/21 audio cases passed** across desktop, portrait and landscape; zero failures/skips/retries. Desktop graphics context setup took 4,017.2 ms, portrait 545.2 ms and landscape 356.6 ms. All pixel checks passed.
- [40006450165](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40006450165), final test code `408c98b`: **3/3 initial audio cases passed**, zero failures/skips/retries. Setup receipts were downloaded and verified under each invocation's retained browser artifact directory; desktop context creation took 4,405.2 ms, portrait 558.3 ms and landscape 267.4 ms.
- The only test-code difference between those two revisions is the receipt destination, moved into the configured invocation output directory so #200's per-batch uploads include it. The other 18 case results reuse the unchanged qualified functional code, not a fresh final full-file run.
- Both TypeScript scopes passed locally. Self-hosted builds passed 221 content cases, both TypeScript scopes and ordinary production bundling. No application/engine/build/lockfile inputs changed; unrelated #200 gameplay evidence is retained, not newly rerun. WebKit acceptance does not select this proof-audio file or its local fixture.

All browser evidence is from the qualified exclusive self-hosted runner, one worker, zero retries and production preview. Device profiles are emulated. Host caches/background workload were not independently controlled. [evidence.json](evidence.json) contains report SHA-256 hashes, raw artifact links (30 days, expiring November 22, 2026), phase snapshots and setup receipts. The tracing comparisons are diagnostics, not comparable performance samples. Neither these results nor the earlier focused recoveries convert #200's historical failed aggregate into a clean full baseline.
