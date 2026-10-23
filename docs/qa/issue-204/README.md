# Issue #204: legal saved boundaries for run recovery

Base: `6669331fbd470db640de6438c1d42d2ef9aea40b` (fresh origin/main).
The previous `work/issue-200-current-report` branch has no commits beyond this
base and no different run-progression/save-fixture inputs. No user edits were present.
Tested source is this branch's implementation with the exact dirty input hashes in
[tested-inputs.json](tested-inputs.json); subsequent additions are evidence only.
Production source, assets, dependencies, configs and emitted build remain unchanged.
The ordinary production build from this base is reused for before/after and journey
checks; emitted artifact hashes are included. No stale or failed build was served.

Two tests now construct a seed-13 full-health defeat through `RunItemSession` and
accepted Wait/enemy commands. Actual `createRunStorage` rotation and validated
serialization supply terminal primary and immediately preceding ongoing backup.
The helper validates the terminal replay; focused units verify determinism, exact
replayed state/events, both serialization round-trips and the backup's exact replay
prefix. There are no arbitrary state patches or production bypasses.

The browser loads those bytes, uses real Continue, checks both slots remain exact,
and then performs the original recovery/removal/export/reset actions and assertions.
Complete victory/reward/terminal-resume and defeat/keyboard-restart journeys remain
unchanged. Presentation, command/RNG, focus and stale-write cases are unchanged;
this report does not claim fresh execution of every unchanged run-progression case.
The helper has only these two browser consumers and its focused unit consumer, so
PR-readiness scope is bounded; a full regression is not warranted by this test-only
setup change. No animation timings, retries, gameplay or performance budgets changed.
The 90-second fight-specific overrides were removed from the two shortened tests;
they use the existing 30-second default.

## Matched measurements

One sequential sample before and after on the same macOS arm64 host, Node
26.11.0, Playwright 1.63.0, Chromium 153.0.8010.12 and WebKit 26.6.
One worker, zero retries, production preview at root on port 4173, existing default
profiles and WebKit acceptance profiles. Both engines are Playwright emulation;
physical devices were not tested. Browser executables and OS are in
[browser-environment.json](browser-environment.json). Application/OS caches and
unrelated background load were not independently controlled; these are matched
functional timings, not cold-cache or isolated GPU performance certification.
No other browser suite ran concurrently with these samples. Baseline instrumentation
only wrapped existing start/fight in the same `reach legal outcome` step; its exact
source is retained in `baseline-run-progression.spec.ts.gz`. The after step includes
fixture generation, navigation, installing saves, reload, real Continue and byte checks.

| Case | Profile | Setup before → after (s) | Test before → after (s) |
| --- | --- | --- | --- |
| Continue backup | desktop | 14.370 → 2.586 | 14.987 → 3.305 |
| Partial reset/export | desktop | 14.078 → 2.439 | 14.320 → 2.674 |
| Continue backup | mobile-portrait | 14.189 → 2.469 | 14.799 → 3.140 |
| Partial reset/export | mobile-portrait | 13.898 → 2.367 | 14.174 → 2.614 |
| Continue backup | mobile-landscape | 14.190 → 2.634 | 14.913 → 3.310 |
| Partial reset/export | mobile-landscape | 14.057 → 2.424 | 14.332 → 2.656 |
| Continue backup | acceptance-webkit-portrait | 13.405 → 2.392 | 14.118 → 3.043 |
| Partial reset/export | acceptance-webkit-portrait | 13.297 → 2.308 | 13.576 → 2.579 |
| Continue backup | acceptance-webkit-landscape | 14.415 → 2.403 | 15.049 → 3.149 |
| Partial reset/export | acceptance-webkit-landscape | 13.346 → 2.456 | 13.625 → 2.730 |

All 10 before and all 10 after cases passed, with no retries or skips.
Combined test durations: **143.893 → 29.200 seconds (79.7% reduction)**.
[Structured timings](timings.json) and compressed raw Playwright JSON reports retain
commands, project IDs, timestamps, setup steps and outcomes. Decompress with
`gzip -dc <report>.json.gz`.

## Verification

Commands executed from repository root (each browser invocation sequential):

```sh
npm run build
npm run test:unit -- tests/unit/runRecoveryFixtures.test.ts tests/unit/runBattle.test.ts tests/unit/runStorage.test.ts tests/unit/runSaveEnvelope.test.ts
npm run typecheck
npm run check:browsers
npx --no-install playwright test tests/run-progression.spec.ts -g 'review: in-flow|review: reopened' --reporter=json
npx --no-install playwright test -c playwright.device-acceptance.config.ts tests/run-progression.spec.ts -g 'review: in-flow|review: reopened' --reporter=json
npx --no-install playwright test tests/run-progression.spec.ts -g 'legal run outcomes|legal defeat reload' --reporter=json
npx --no-install playwright test -c playwright.device-acceptance.config.ts tests/run-progression.spec.ts -g 'legal defeat reload' --reporter=json
```

Build passed (221 content tests and both TypeScript scopes), with the existing
large-bundle warning. Focused units: **28 passed**. Final typecheck: passed.
Build/unit/typecheck logs are retained as gzip files. Representative complete journeys:
**6 Chromium cases passed** (victory/rewards/resume and defeat/keyboard restart
on all three profiles), plus **2 WebKit defeat/restart cases passed**. No skips or
retries; their raw reports are `journeys-chromium.json.gz` and `journeys-webkit.json.gz`.

Preserved unsuccessful attempts: sandboxed browser launch/preflight aborted before
application assertions; see [sandbox-browser-failure.json](sandbox-browser-failure.json).
Unsandboxed engine qualification and matched samples passed. The first new unit
attempt exceeded Vitest's default 5-second timeout (5.069 seconds) while constructing
the deterministic fixture twice; its explicit unit-only timeout is now 20 seconds.
The subsequent four-file focused run passed in 8.13 seconds. No browser retry or
assertion timeout was relaxed. These focused results do not turn the prior issue
#200 full capture into a passing full regression.
