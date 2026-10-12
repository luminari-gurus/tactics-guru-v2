# Issue #69: bounded battle-save contract evidence

## Merge verification — 2026-10-12

PR #70 merged as `ea58370ceb442b22d7f247bc463c2cdddec12456`; issue #69 is completed. Its parents are main `9d6aeb727d53531b7f17494af2de8add58147026` and reviewed head `fabc13e8ee11cda646c66bd304f7f13de4583990`. The published tree `01ae3c3b55b6e8f1b75da383de59585c9ac7f0ef` exactly matches the tested local merge. Main was two documentation-only commits ahead, so integration required no conflict resolution or runtime/test edits.

Fresh checks: **316 unit tests, 77 content tests, both typechecks, production build, strict OpenSpec, whitespace checks and 24 focused browser cases passed**. Browser testing used installed Edge, the existing three desktop/portrait/landscape profiles, one worker and unchanged timeouts. It covered the two repaired camera/audio synchronization cases, sound controls, canonical rendering/restarts, complete legal win/loss battles, gesture replacement and restart during initial enemy animation. Portrait/landscape screenshots were inspected for rendered art and playfield/HUD separation. Existing chunk-size and color-environment warnings remain.

[Retained merge evidence](issue-69/merge-validation.json) records commands, exact source/tree, report statistics and local log hashes. This is a focused merge validation, not a new full 225-case run, physical-device certification or live persistence proof. The earlier failures/rechecks below remain part of the record. All ten PR commits and the source branch are preserved; no release tag or manual deployment was made. The [current handoff](../ongoing-projects/plan.md) identifies existing #72 as the next storage-adapter phase, with #58/#73/#74 and first-battle release gates remaining open. No next-phase work was started.

## PR #70 review repair — 2026-10-12

The single [review finding](https://github.com/luminari-gurus/tactics-guru-v2/pull/70#discussion_r4246425650) was reproduced after rebasing onto main `30331e6`: seed 2/command 29 captures archer 5 at `(3,4)`, acted but not moved. The original queue dispatches `endTurn` and activates unit 6; the old reconstruction selects a move to `(2,6)` and leaves unit 5 active. A new permanent regression failed on precisely this difference before the runtime repair (four other authored seeds passed).

Repair `2d23526e39b9aee81af4c64eeca22cdd437610da` keeps the existing policy's ordered optional move, optional attack, then Wait. A validated actor with `hasActed: true` returns only Wait. Existing AI fixtures also verify that replanning accepted prefixes reproduces their remaining commands. The new save tests compare independently selected decoded commands to the uninterrupted `BattleSession` queue, then compare dispatch events/state and RNG at each presentation boundary through completion for seeds 1–5 (258 accepted commands). Full original-versus-fixed replay/event/final-state hashes match for all five seeds. The snapshot format, state/command/rules/RNG identities, fresh-turn choices and live session queue behavior remain unchanged; no schema/version bump is needed for this reconstruction bug fix.

Fresh local validation: 94 focused tests, 316 configured unit tests, 77 content checks, both TypeScript checks, production build and strict OpenSpec pass. The full browser run on installed Edge 155.0.4283.45 used the repository's desktop, Pixel 7 portrait and 915×412 landscape profiles, one worker, no retries and default timeouts: **224 passed, one failed** in 12.5 minutes. The desktop late-decode test accepted the outgoing scene's player phase after clicking Restart, then compared audio counters while the replacement seed was legitimately running enemy commands (`lastToken` 1→3, `generation` 1→3, `dropped` 1→2). This is test synchronization, not stale decoding: runtime teardown already checks `live` after asynchronous decoding, and the replacement scene was still presenting in the retained failure DOM.

Separate test-only repair `d651b105bc08b764dbb9e42bf71b53c684ca9b99` waits for replacement seed 2 before its settled player phase. It preserves the full audio snapshot equality assertion and timeouts. The repaired case passed **9/9** repetitions (three per profile) in 28.3 seconds. Combined reports cover **225 unique configured cases, no missing cases**; the full suite was **not** rerun after this isolated test correction. Runtime/build/config inputs are unchanged from `2d23526`, so the other 224 passing results remain applicable. The [retained review evidence](issue-69/review-repair.json) contains both report summaries, the original failure, per-profile coverage, pre/post battle hashes and SHA-256 identities for raw local logs. Representative authored portrait/landscape screenshots were inspected; unit/terrain art rendered with the HUD separate from the playfield. Existing Vite chunk-size and color-environment warnings are informational.

Commands (npm resolved through the existing ignored `tmp/tool-bin` wrapper):

```text
node node_modules/vitest/vitest.mjs run tests/unit/saveEnvelope.test.ts tests/unit/turns.test.ts tests/unit/battleSession.test.ts tests/unit/rng.test.ts tests/unit/ai.test.ts tests/unit/domainBoundary.test.ts --no-color
# 94 passed
npm run test:unit -- --no-color
# 316 passed
npm run validate:content -- --no-color
# 77 passed
npm run build
# Both configured typechecks and Vite production build passed
npm test -- --reporter=line,json
# 224 passed, 1 restart synchronization failure
npm test -- tests/battle-audio.spec.ts --grep "late decode from a destroyed scene" --repeat-each=3 --reporter=line,json
# 9 passed after test-only correction
node <openspec-1.14.1>/bin/openspec.js validate battle-save-envelope --strict
git diff --check
# Both passed; relative documentation links also verified
```

Both browser commands used `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. Raw reports are `tmp/pr70-repair-browser.json` and `tmp/pr70-repair-audio-recheck.json`. The original failed DOM and reviewed screenshots are preserved under the ignored `tmp/pr70-repair-*` paths named in the evidence file. No application change was needed for this local gate repair.

Git: the branch was nine commits behind main. All seven feature patches were rebased without conflicts and retained unchanged according to `git range-diff e955e9d..6c79841 30331e6..d3fdc33`. Preserve implementation, test and measurement history; no stacked dependency or release tag is needed. Only the PR branch will be updated, with an exact lease against `6c798411980bc16af99f3284674f976e6b30cef1`; no merge or manual deployment is part of this repair. The existing Cloudflare integration may publish a branch preview automatically. Original checkout edits remain untouched. Parent #58 remains open; physical devices and live storage/hydration remain outside this evidence.

## Original implementation evidence — 2026-10-11

The sections below retain the original implementation and browser-race evidence. The review repair above supersedes the earlier continuation-proof claim and validation counts.

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

## Original publication — 2026-10-11

[PR #70](https://github.com/luminari-gurus/tactics-guru-v2/pull/70) is open and non-draft against main. The connector lacked PR-creation permission (HTTP 403); the same authorized PR was created with the repository's existing GitHub credential, then read back through the connector and attached to the chat. No merge, tag or deployment was performed. Original checkout edits remain untouched. The implementation worktree is the review branch; all subsequent edits after the tested source are tests/documentation only.
