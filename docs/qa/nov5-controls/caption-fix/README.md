# Caption review correction

The review of PR #328 found that cached HUD rendering skipped the caption reset
while BattleScene kept prepending an overlap hint. The scene now owns the entire
caption and composes it from the current picking hint, action and danger state on
every refresh. It assigns text only when changed; live controls remain cached.

The new `battle-board.spec.ts` regression checks repeated hover, no battle-state
changes, clearing the hint on picking reset, and action/danger legend updates.
It fails against previous head `125c239` (two hints instead of at most one).
The previous review also compared the literal original base `8fd1686`, which
retained a single hint under the same hover sequence.

## Current correction results

Source/build/test hashes and the failed-run trace identity are in
[receipt.json](receipt.json). Runs use Node 22.21.1 and Playwright 1.64.1 on macOS
arm64, ordinary root production preview, one browser worker and zero retries.
Touch profiles are browser emulation; no physical devices were tested.

| Check | Result | Evidence |
| --- | --- | --- |
| Regression against previous PR build | Expected failure (duplicate overlap hint) | [before](before.log.gz) |
| Final build | 226 content checks, both TypeScript scopes, production bundle passed | [build](build.log.gz) |
| Affected selection/action/presentation/radial units | 23 passed in five files | [units](units.log.gz) |
| Chromium desktop / portrait / landscape | 18 passed: caption, overlap cycling, first-click controls, rejected moves, danger, radial switch | [Chromium](chromium.log.gz) |
| WebKit portrait / landscape | 8 passed: caption, overlap cycling, first-click controls, rejected moves | [WebKit](webkit.log.gz) |
| Seven core journeys | 6 passed; run journey timed out in presenting at its existing 15-second readiness gate | [initial core run](core-initial.log.gz), [error context](run-error-context.md.gz) |
| Focused unchanged run journey rerun | 1 passed in 15 seconds | [focused rerun](run-focused-retry.log.gz) |

Commands:

```sh
npm run build
npm run test:unit -- tests/unit/battleSelection.test.ts tests/unit/battleActions.test.ts tests/unit/boardPresentation.test.ts tests/unit/radialLabels.test.ts tests/unit/radialGesture.test.ts
npx --no-install playwright test -c playwright.regression.config.ts tests/battle-board.spec.ts tests/battle-loop.spec.ts tests/battle-radial.spec.ts --grep 'overlap caption stays singular|repeated map selection reaches|QA:|enemy danger inspection toggles|radial switching to rail preserves'
cp docs/qa/nov5-controls/caption-fix/webkit.config.ts.txt tmp/caption-webkit.config.ts
npx --no-install playwright test -c tmp/caption-webkit.config.ts
npm test
npx --no-install playwright test -c playwright.pr.config.ts tests/run-progression.spec.ts --project=pr-desktop -g 'run battle undo survives reload and a legal terminal journey'
```

The original failed core result remains a failure; the focused passing rerun is
not a clean seven-test run. No assertions, retries or timeouts were changed.
The full original trace remains locally at the receipt's recorded path. The
cause of the intermittent presenting timeout is unestablished and tracked as
local follow-up `tg-build-wk8`. The other six core results remain valid; nothing changed between
the failed run and the focused retry.

Original 1,186-unit/progression evidence in the parent directory is reused for
unchanged domain, progression, storage and formatter behavior. This correction
moves only caption rendering between the scene and HUD; fresh build/type checks,
UI units, browser caption/control cases and shared route journeys cover it.
Only documentation was added after the tested source; this is focused acceptance,
not a full release/performance rerun. The existing engine bundle warning remains.
