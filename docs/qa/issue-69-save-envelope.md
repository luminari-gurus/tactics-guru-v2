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

Browser environment: `http://127.0.0.1:4173`, Microsoft Edge 155.0.4283.45, `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. `npm test -- --reporter=line,json` used the unchanged configuration's desktop/Pixel-7 portrait/915x412 landscape profiles, one worker and normal timeouts against the clean `1b310be` production build. Result: **223 passed, 2 failed** in 12.6 minutes, both failures in the same pre-existing camera test. No skips. The complete suite was not rerun after its test-only repair.

## Browser gate repair and final coverage

Browser plugin not available (no Browser skill in this session); use the repository's configured Playwright workflow. Target flow: `/` -> select/pan/zoom -> Wait -> committed command and settled next player phase -> unchanged camera.

The original portrait and landscape cases `battle-board.spec.ts:17`, "selection labels retain the zoomed and panned camera without gameplay commands", failed at line 62: expected `commandCount > 2`, received `2`. The retained portrait Playwright failure DOM showed "Enemy turn ... Animating" with controls disabled. `BoardRenderer.animate` deliberately calls `present(before)` before the tween and `present(after)` on completion; `BattleScene` publishes the committed state separately in `data-session`. Three requestAnimationFrame callbacks settle layout but do not guarantee tween completion. The test read the visual snapshot too early.

The separate repair commit `3841ae2bfcf02bb61b54286a3cf8d5bd2cca60bd` waits for the accepted session command and settled player phase, then asserts camera/command progress relative to each prior turn. Assertions and timeouts were preserved; progress was strengthened from the initial battle count to the previous turn count. The application and save contract remain unchanged.

```text
PLAYWRIGHT_JSON_OUTPUT_NAME=tmp/issue-69-camera-recheck.json
npm test -- tests/battle-board.spec.ts --grep "selection labels retain" --repeat-each=3 --reporter=line,json
# 9 passed: 3 repetitions on each of the 3 configured profiles; 1.1 minutes.
```

The [retained validation summary](issue-69/browser-validation.json) contains original failures, all nine repair results, full local report hashes, exact build/test commits and a coverage reconciliation: **225 unique configured cases have passing evidence**, with no missing cases. This combines the unaffected original passes and repeated repaired cases, not a green rerun of all 225. Raw local reports remain in the ignored paths named in that summary. The first-run error DOMs remain in `tmp/issue-69-camera-{portrait,landscape}-failure.md`.

The configured regressions prove the visible controls, legal battles, restarts, loading/error paths and browser lifecycle still work on this host. They do not exercise persistence (there is none), establish physical audibility, or certify physical mobile browsers. No UI design changed and no new visual-fidelity claim is made.

Final application typecheck after the browser-test repair passed. The full 311-unit suite passed again after the validated-catalog test correction; other unit/domain code did not change afterward. Strict OpenSpec, relative document links and `git diff --check` passed. Only expected chunk-size and color-environment warnings remain.

## Acceptance audit

- AC1: eight pinned state/replay fixtures, serialized sizes and all five timing samples per stage in `comparison.json`; explicit snapshot decision with host-only limitations.
- AC2: format document and codec define independent identity/version, compatibility, exact payload/digest and finite text/collection/number limits.
- AC3: pre-parse cap and staged exact validation; malformed, unsafe, unknown-ID, invariant, integrity and compatibility rejection fixtures; illegal shaped replay rejected semantically in the comparison path, and replay payloads unsupported by the chosen codec.
- AC4: eight boundary tests compare state, next legal command/events, next RNG/cursor and enemy plans; live session fixture excludes previews and captures committed presentation state; ended/command-limit cases reject further actions.
- AC5: frozen valid inputs and retained failing text remain unchanged; no migration or persistent side effect.
- AC6: source search confirms no application import; format handoff preserves all #58 storage/session/UI/device acceptance, including legacy-key isolation. Parent read back open.
- AC7: focused/configured checks above pass with the explicit browser repair/coverage reconciliation. No dependency, combat-rule, deployment or runtime persistence change.

## Reproduction

Run from the issue worktree with Node on PATH:

```text
node --experimental-strip-types scripts/measure-save-envelope.ts docs/qa/issue-69/comparison.json
```

The existing Vite loader resolves source TypeScript without adding a dependency. Each candidate uses the same outer shape, canonical serialization and SHA-256 digest, one discarded warmup and five serial samples per fixture. Snapshot validation includes its owned-state reconstruction; the separate snapshot reconstruction timing measures only returning that state. Replay reconstruction includes `replayBattle`'s repeated structural validation and command execution. Encode validates shape; semantic replay cost is in decode. Fixture generation and catalog-hash warmup are outside timings. Each output records exact source/tree, dirty paths, runtime/OS/CPU, catalog and state/log hashes, sizes and every timing sample.
