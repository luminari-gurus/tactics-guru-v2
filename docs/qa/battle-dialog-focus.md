# Battle dialog focus return

Date: 2026-10-14 (Asia/Jerusalem). Base: `d2a1a61abb636b5ab38ddce6c26207f6bcb6d4f5`. Branch: `branch/fix-battle-dialog-focus`. Found during [design PR #112](https://github.com/luminari-gurus/tactics-guru-v2/pull/112); independent of the #108 mockups and #111 runtime redesign.

[PR #113](https://github.com/luminari-gurus/tactics-guru-v2/pull/113) is open for review against main. Original implementation commit: `630d32f`; the review-repair section below records the subsequent implementation and fresh validation. Original retained console logs normalize trailing whitespace only.

## Reproduction and repair

Move → choose a reachable destination → Review action → Escape cancelled the intent correctly but left focus on BODY. `BattleDialogs.close` focused Review before the callback disabled it. The added existing-browser-test assertion failed on baseline: [original failure](battle-dialog-focus/baseline-failure.txt).

The fix captures the original invoker, closes the modal, runs its synchronous state callback, then restores focus only if no replacement modal opened. A disabled/disconnected invoker uses the existing Restart fallback. PR #113 review additionally requires rejecting BODY/documentElement and checking that an eligible invoker actually acquired focus. Repeated Enter/Space keydowns on buttons are consumed so the confirmation key cannot flow into reset after focus moves. No timer, activation latch, new focus service, command rule or persistence change.

## Original verification

- [Focused dev-browser regression](battle-dialog-focus/focused-green.txt): 15/15 passed on the configured desktop, portrait and landscape profiles, one worker, normal timeouts, installed Edge. Escape and Cancel preserve battle state/replay and land on Restart; confirmation retains usable focus while the controlled clock holds presentation; startup reset/cancel retains focus inside replacement modals; the existing enabled-invoker return still passes.
- [Unit/content run](battle-dialog-focus/unit.txt): 561/561 passed in 32 files, including the three content validation files. Vitest rewrote only line endings in the encounter snapshot; that generated no-content change was restored and is not part of this diff.
- `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.domain.json`: passed.
- [Production build](battle-dialog-focus/build.txt): passed. Existing chunk-size warning remains. Unit/content validation was already covered by the full unit run.
- [Affected production-browser suites](battle-dialog-focus/affected-suites.txt): 69/69 passed in one clean run (5.0 minutes), all three configured profiles. Includes legal victory/defeat, restart, modal input capture, save/recovery failures and current-save browser-history behavior.
- [Encounter posttest](battle-dialog-focus/encounter-posttest.txt): 18/18 passed. The asset-decode error messages are expected fault-injection fixtures, not unexplained failures.
- Strict `openspec validate battle-dialog-focus-return --strict` and `git diff --check`: passed before publication.

The normal package-manager equivalent is `npm run test:unit`, `npm run typecheck`, `npm run build`, and `npm test -- tests/battle-loop.spec.ts tests/battle-persistence.spec.ts` (including its encounter posttest). On this Windows host npm is absent from PATH, so direct installed Node entrypoints ran those components. A temporary ignored Playwright config imports the repository config unchanged for profiles, timeouts, assertions and workers, sets an absolute test directory, and replaces only the web-server command with `node node_modules/vite/bin/vite.js [preview] --host 127.0.0.1 --port 4173 --strictPort`, with cwd at the worktree root. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` points to installed Edge. No project configuration or dependency changes were needed.

This is browser-emulated behavioral proof, not physical-device certification. It does not claim a complete repository-wide browser-suite rerun. No deployment, merge or release tag is included.

## PR #113 review repair — 2026-10-14

Both review findings were independently reproduced against `595cc80`: the held Enter sequence changed seed 1 to 2 through unintended reset, and keyboard Continue failed the usable-focus assertion. The new existing-suite tests failed before the repair. The final regression checks compare the exact primary and backup bytes after the intended move against the bytes after repeated keydowns, retain the original seed, and prove a fresh activation still opens reset while holding it cannot also confirm. Space retains native activation on release.

The original cancellation check exposed a browser timing detail during development: immediately after native dialog close, activeElement can still name a newly disabled invoker. The final implementation retains an explicit `:disabled` exclusion as well as checking focus acquisition. The corrected focused dev run passed 12/12 cases across desktop, portrait and landscape: Escape/Cancel, confirmation during presentation lock, keyboard Continue and held-key reset. The document key listener belongs to the existing dialog owner's abort signal and is removed on disposal.

The broader production run completed with 168 passes and nine animation-test failures. Those cases sent fresh Enter then Space to whichever element was focused after confirmation; with usable focus on Restart, this intentionally opened and confirmed reset. Their purpose is to assert board-input gating during presentation. They now assert the Restart fallback, explicitly focus the canvas, then send the same keys. No effect timing, transformed-anchor, accepted-state or saved-byte assertions were removed. The independent held-key regression continues to cover unintended reset protection.

Local checks use the direct Node entrypoints and temporary config described above. Browser plugin not available; installed Edge/Playwright was used. Fresh prototype checks are tracked separately in PR #112. No physical-device or screen-reader testing is claimed.

Final local evidence:

- `node node_modules/vitest/vitest.mjs run`: 561/561 unit/content checks passed. The generated snapshot's line-ending-only rewrite was restored.
- `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.domain.json`: passed. Both were repeated after the disabled-control correction.
- `node node_modules/vite/bin/vite.js build`: passed on the final runtime. The existing chunk-size warning remains.
- `node node_modules/@playwright/test/cli.js test -c tmp/playwright-focus.config.ts tests/battle-loop.spec.ts tests/battle-persistence.spec.ts tests/battle-animations.spec.ts tests/battle-audio.spec.ts`: 168 passed and the nine stale-input-target animation cases failed, as explained above; all 126 non-animation cases passed.
- After the test-only target correction, `node node_modules/@playwright/test/cli.js test -c tmp/playwright-focus.config.ts tests/battle-animations.spec.ts`: 51/51 passed across all three profiles. Combined final evidence covers all 177 affected cases. The entire four-file run was not repeated after this test-only correction.
- `node node_modules/@playwright/test/cli.js test -c tmp/playwright-encounters.config.ts`: 18/18 passed. Asset-decode errors are expected injected faults.
- Strict OpenSpec validation, 59 local document-link targets across both repaired PRs, and whitespace checks passed. Existing color-environment warnings remain.

Main was refreshed at `d2a1a61`; neither PR needed a rebase. A trial merge of the two repairs had no conflicts and retained the runtime/tests from this PR exactly. The branches remain independent, with no release tag or merge performed. Original-checkout edits were preserved.
