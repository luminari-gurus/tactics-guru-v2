# PR #131 run save recovery review repair

The three findings in review 5559916119 and comment 6250967439 were reproduced against `f04093e9bb3c20d05025b616b0b07272f69396fb`, based on main `a009a3e`. The original visual-design files are unchanged; all 77 guide-local paths and all three PNG hashes still match. The caller authorized addressing every review finding and carrying the runtime repair through the performance stack.

## Repair and regression proof

- Explicit unsaved play retains one controller flag that blocks automatic battle/item boundary writes and manual retries. Recovering read access cannot overwrite either stored slot. A reviewed Continue or successful replacement clears the flag; tests verify both paths and preserve the stale-review guard.
- Cancel, Escape and export refresh startup controls after their inspection invalidates the old review. Rejected Continue opens visible recovery. Returning from an unsaved live battle first stops the obsolete scene before rendering or starting the selected saved state.
- Start reacquires storage inspection. If the controller was loaded from saved progress and both slots are now empty, the existing fresh replacement path supplies a new identity/next seed, full party, empty ownership and no active battle. First launch still starts at seed 13.

All six new real-control desktop cases failed before runtime repair ([retained red report](pr-131-run-recovery/pr131-red.json)): Cancel, Escape, Export, removal of both slots, and recovered-read unsaved play followed by either explicit Continue or replacement. After repair all 18 cases pass across desktop/portrait/landscape ([focused report](pr-131-run-recovery/pr131-green.json)). Assertions check exact original save bytes, actual command controls, fresh run state and subsequent normal persistence.

## Local validation

- All 677 unit tests pass ([receipt](pr-131-run-recovery/pr131-unit.txt)), including unsaved item/retry boundaries, stale reviews and both explicit recovery transitions.
- Both TypeScript configurations pass; the production build passes ([build receipt](pr-131-run-recovery/pr131-build.txt)). The existing large engine chunk warning is retained on this branch; subsequent performance PRs address it.
- All 54 Edge run-progression checks pass with no retries/skips ([report](pr-131-run-recovery/pr131-run-suite.json)), including legal three-encounter victory, defeat/restart, reload/RNG equality, storage failures, retained exports, recovery focus and all six new cases in three profiles.
- All 54 Linux WebKit run-progression checks pass with no retries/skips across desktop Safari, iPhone portrait and landscape ([report](pr-131-run-recovery/pr131-webkit.json)).
- Desktop and portrait fresh-battle screenshots were inspected: board, actor and action controls remain visible and reachable. [Portrait screenshot](pr-131-run-recovery/fresh-after-removal-portrait.png).

Commands ran from the isolated review worktree using installed Node 24.19.0 and Edge via `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`:

```text
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.domain.json
node node_modules/vite/bin/vite.js build
node node_modules/@playwright/test/cli.js test -c tmp/review/playwright.config.ts tests/run-progression.spec.ts --reporter=json
wsl --exec env -u PLAYWRIGHT_CHROMIUM_EXECUTABLE node node_modules/@playwright/test/cli.js test -c tmp/review/playwright-run-webkit.config.ts --reporter=json
openspec validate repair-run-save-recovery --strict
git diff --check
```

[Source binding](pr-131-run-recovery/source-binding.json) identifies runtime repair `6767be1` and the exact tested file hashes. [Edge driver](pr-131-run-recovery/playwright-edge.config.ts.txt) and [WebKit driver](pr-131-run-recovery/playwright-webkit.config.ts.txt) preserve the test configuration.

The Edge driver inherits repository projects and serial execution, using a dedicated preview on port 4196. WebKit uses the same frozen production output on port 4197 with desktop Safari, iPhone portrait and landscape profiles. This is local browser/emulation proof, not physical-device or deployed performance certification. Prior performance receipts remain tied to their original source; the final stack must measure its updated runtime separately.
