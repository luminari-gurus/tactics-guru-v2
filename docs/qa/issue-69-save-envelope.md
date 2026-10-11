# Issue #69: bounded battle-save contract evidence

## Scope and provenance

Implementation started 2026-10-11 from planning head `cc4859d`, based on merged main `e955e9d9f182a76f057ea69057c7a1ac6c0bd682`. This report covers a pure unused-by-UI contract, not browser persistence or physical-device acceptance. Parent #58 remains open.

`tests/helpers/saveFixtures.ts` is shared by tests and the measurement harness. Authored seeds 1 and 2 use the existing `BattleSession` and `playerDecision` policy. It captures empty starts, the first accepted enemy/player commands during presentation, the first active Guarded boundary, and legal seed-1 loss/seed-2 win. The maximum fixture uses the existing turn test's 32x32, six-spawn, seed-7 setup with 10,000 accepted Wait commands, retaining the independently dispatched final state. It uses the authored catalog's stats, validates its synthetic map, and carries a separate catalog digest. Every fixture is semantically replayed and compared to its retained state during construction.

## Contract and focused verification

The retained [raw comparison](issue-69/comparison.json) was measured at clean commit `bc53bba1afe6f3ec24ec416f22eb0fa78dd508e6`, Node v24.19.0, Windows x64, Intel Core Ultra 9 285H. Snapshot versus replay at 10,000 commands: 1,130 versus 301,272 code units/UTF-8 bytes; median decode approximately 0.07 versus 703 ms. Legal win/loss replay medians are about 3.60/8.45 ms; snapshots about 0.12/0.10 ms. The selected [snapshot format](../battle-save-format.md) has the exact same envelope overhead as the measured candidate. These are host observations, not mobile budgets.

The codec is pure and unused by application code (source search finds only its own definitions). It retains no replay variant. The semantic replay path is exercised by fixture construction and a correctly shaped illegal-command regression. The format document records the trust boundary, limitations of snapshot invariants/checksums, and all deferred storage/session/UI/device acceptance. GitHub readback confirmed parent #58 remains open.

Commands completed successfully:

```text
node node_modules/vitest/vitest.mjs run tests/unit/saveEnvelope.test.ts
# 16 tests passed.
node node_modules/vitest/vitest.mjs run tests/unit/saveEnvelope.test.ts tests/unit/turns.test.ts tests/unit/battleSession.test.ts tests/unit/rng.test.ts tests/unit/ai.test.ts tests/unit/domainBoundary.test.ts
# 89 tests across 6 files passed.
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.domain.json
# Both typechecks passed.
```

Configured unit/content/build and strict OpenSpec validation also pass:

```text
npm run test:unit
# 311 tests across 27 files passed.
npm run validate:content
# 77 tests across 2 files passed.
npm run build
# Both configured typechecks and Vite production build passed.
node <openspec-1.14.1>/bin/openspec.js validate battle-save-envelope --strict
# Change is valid.
```

The host's packaged `npm.cmd` has a broken relative path; its first invocation failed before running tests. An ignored `tmp/tool-bin/npm.cmd` shim invokes the installed npm 12.0.2 CLI with `node`, preserving configured scripts and dependencies. The shim directory was prepended to PATH for the successful commands and browser webServer. No package/lockfile/configuration was changed. The normal Vite large-chunk warning remains; this unused codec is not imported into the runtime bundle.

Browser run in progress: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`, `PLAYWRIGHT_JSON_OUTPUT_NAME=tmp/issue-69-browser.json`, `npm test -- --reporter=line,json`. It uses the unchanged configuration's three profiles, one worker and normal timeouts against the clean `1b310be` production build. Final browser and whitespace results remain pending.

## Reproduction

Run from the issue worktree with Node on PATH:

```text
node --experimental-strip-types scripts/measure-save-envelope.ts docs/qa/issue-69/comparison.json
```

The existing Vite loader resolves source TypeScript without adding a dependency. Each candidate uses the same outer shape, canonical serialization and SHA-256 digest, one discarded warmup and five serial samples per fixture. Snapshot validation includes its owned-state reconstruction; the separate snapshot reconstruction timing measures only returning that state. Replay reconstruction includes `replayBattle`'s repeated structural validation and command execution. Encode validates shape; semantic replay cost is in decode. Fixture generation and catalog-hash warmup are outside timings. Each output records exact source/tree, dirty paths, runtime/OS/CPU, catalog and state/log hashes, sizes and every timing sample.
