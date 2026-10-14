# Battle dialog focus return

Date: 2026-10-14 (Asia/Jerusalem). Base: `d2a1a61abb636b5ab38ddce6c26207f6bcb6d4f5`. Branch: `branch/fix-battle-dialog-focus`. Found during [design PR #112](https://github.com/luminari-gurus/tactics-guru-v2/pull/112); independent of the #108 mockups and #111 runtime redesign.

## Reproduction and repair

Move → choose a reachable destination → Review action → Escape cancelled the intent correctly but left focus on BODY. `BattleDialogs.close` focused Review before the callback disabled it. The added existing-browser-test assertion failed on baseline: [original failure](battle-dialog-focus/baseline-failure.txt).

The fix captures the original invoker, closes the modal, runs its synchronous state callback, then restores focus only if no replacement modal opened. A disabled/disconnected invoker uses the existing Restart fallback. No timer, new focus service, command rule or persistence change.

## Verification

- [Focused dev-browser regression](battle-dialog-focus/focused-green.txt): 15/15 passed on the configured desktop, portrait and landscape profiles, one worker, normal timeouts, installed Edge. Escape and Cancel preserve battle state/replay and land on Restart; confirmation retains usable focus while the controlled clock holds presentation; startup reset/cancel retains focus inside replacement modals; the existing enabled-invoker return still passes.
- [Unit/content run](battle-dialog-focus/unit.txt): 561/561 passed in 32 files, including the three content validation files. Vitest rewrote only line endings in the encounter snapshot; that generated no-content change was restored and is not part of this diff.
- `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.domain.json`: passed.
- [Production build](battle-dialog-focus/build.txt): passed. Existing chunk-size warning remains. Unit/content validation was already covered by the full unit run.
- [Affected production-browser suites](battle-dialog-focus/affected-suites.txt): 69/69 passed in one clean run (5.0 minutes), all three configured profiles. Includes legal victory/defeat, restart, modal input capture, save/recovery failures and current-save browser-history behavior.
- [Encounter posttest](battle-dialog-focus/encounter-posttest.txt): 18/18 passed. The asset-decode error messages are expected fault-injection fixtures, not unexplained failures.
- Strict `openspec validate battle-dialog-focus-return --strict` and `git diff --check`: passed before publication.

The normal package-manager equivalent is `npm run test:unit`, `npm run typecheck`, `npm run build`, and `npm test -- tests/battle-loop.spec.ts tests/battle-persistence.spec.ts` (including its encounter posttest). On this Windows host npm is absent from PATH, so direct installed Node entrypoints ran those components. A temporary ignored Playwright config imports the repository config unchanged for profiles, timeouts, assertions and workers, sets an absolute test directory, and replaces only the web-server command with `node node_modules/vite/bin/vite.js [preview] --host 127.0.0.1 --port 4173 --strictPort`, with cwd at the worktree root. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` points to installed Edge. No project configuration or dependency changes were needed.

This is browser-emulated behavioral proof, not physical-device certification. It does not claim a complete repository-wide browser-suite rerun. No deployment, merge or release tag is included.
