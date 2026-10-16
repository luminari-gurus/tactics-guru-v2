# Issue 80: authored run integration

[Issue #80](https://github.com/luminari-gurus/tactics-guru-v2/issues/80), branch `work/issue-80-run-progression`, base `46284e10d18271b2e410e3c2532e27231cd3a8d6`. The caller approved the published OpenSpec plan in the task conversation on 2026-10-15. The caller separately accepted the #57 Playwright baseline as sufficient certification of the current app state; that gate is satisfied.

## Play and persistence

Follow **Play three-encounter run** from the battle panel, or open `/run` beneath the configured public base. Start new run opens party preparation; Start encounter begins the battle. After each of the first two victories, claim one reward, optionally use/equip owned items, then start the next encounter. The third victory has no additional reward. Defeat and final victory offer Start new run directly. In-battle replacement requires confirmation. Single battle remains a separate route and save namespace.

A fresh origin starts at run seed 13. New-run replacement increments the prior run seed modulo uint32 and creates a fresh UUID. This deterministic default was selected using legal simulation and verified through actual browser controls; no encounter/item values were tuned. Approved survivors retain HP with no automatic healing, and defeated heroes stay absent. The seed-13 legal policy uses the existing expected-damage player policy with each encounter's projected catalog, prefers Healing Draught when offered, equips owned charms on the first eligible living hero, and spends draughts on eligible damaged heroes in canonical party order. This reaches victory with fighter 6 HP and the other heroes defeated.

The existing run format 1 and 32,768-code-unit bound are unchanged. RunItemSession owns accepted battle state and atomic completion; RunSnapshot stores entry-party/items plus live activeBattle, never previews/animation. Entry construction projects equipment once; canonical replay reconstructs that exact entry before dispatch. Existing single-battle replay remains strict. Continue reconstructs presentation without historical actions or cues and does not rewrite a restored active snapshot until another command is accepted. Startup reads storage without writing. Corrupt/incompatible bytes remain exportable; storage failure permits unsaved play. Replacement compares reviewed bytes and preserves the live run/seed on a partial reset, retaining original texts for export. This is best-effort local storage, not cross-tab atomicity or durable retention.

## Acceptance mapping

| #80 acceptance | Implementation and evidence |
| --- | --- |
| Create accepted authored battles with HP/party carryover and clean local state | runBattle helper and BattleSession.fromRun; survivor-subset, entry validity, equipment nonaccumulation and replay-tampering unit tests; three legal authored browser encounters |
| Atomic outcomes, reward, next encounter, final victory, defeat and fresh run | RunItemSession owns BattleSession callbacks; aggregate preflight before publication; unit legal run/defeat, duplicate/stale/disposed session and ended-snapshot reconciliation; browser duplicate activation and legal defeat/restart |
| Responsive reward/item and encounter/outcome flow; single battle preserved | Production `/run`, reused runItems and BattleScene host; narrow/portrait/landscape touch/keyboard/modal checks, sound preference and return-to-single-battle independent save test |
| Bounded metadata, ownership and active-battle saves | Existing run codec/storage reused; codec malformed/version/digest/identity/HP/roster/offer/size checks and maximum-shape stress; storage corruption/quota/backup/changed-byte tests |
| Same reload state/next command/RNG without duplicate reward/cues | Real reload before/after reward/preparation/final outcome and player/enemy presentation; uninterrupted browser comparison, snapshot continuation and no historical cues; BFCache replacement test preserves exact primary/backup bytes |
| Integrated legal victory/defeat/restart/resume | run-progression.spec.ts enacts production controls from a fresh run; no forced HP/outcome/progression. Per-encounter replay evidence and screenshots retained with final validation |

## Initial integration verification

Tested implementation revision: `23a98521a4a2337854d8d47f26c0f78c6446aee3`, clean build identity. The initial delivery commit updates evidence/task checkboxes and removes one extra blank line at the end of the shared test policy; no application behavior changes. See [validation manifest and source hashes](issue-80/validation.json).

- `npm run test:unit`: 654 passed across 39 files, including seven new run construction/controller/replay tests.
- `npm run validate:content`: 167 passed.
- `npm run typecheck` and `npm run build`: both typechecks/content/build passed. Existing large-chunk warning remains.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`: 419 passed, one failed in the 420-case main suite. The existing desktop elevated-impact rotation test observed the old viewport immediately after resize, matching the retained #79 handoff limitation. See [initial output](issue-80/browser-initial.txt) and [failure context](issue-80/initial-rotation-failure.md).
- The same executable with `npx playwright test --last-failed`: the one failure passed unchanged. No app/test expectation was changed to obtain that pass. Coverage combines 419 initial passes plus one successful targeted rerun; the full 420-case suite was not repeated afterward.
- The same executable with `npm run posttest`: all 18 authored-encounter and 21 run-item tests passed. Explicitly invoked because npm does not run its posttest hook after a failed main command.
- `npx playwright test -c tmp/issue80-webkit.config.ts`: six passed, covering legal three-encounter victory/rewards/resume/restart, committed-animation reload, narrow controls, native touch and sound preference in iPhone-sized WebKit portrait/landscape. Retained [config](issue-80/webkit.config.ts.txt), [output](issue-80/webkit.txt), [portrait replay receipt](issue-80/webkit-portrait-run-records.json), [reward screenshot](issue-80/webkit-portrait-run-reward.png) and [victory screenshot](issue-80/webkit-portrait-run-victory.png). Restore the config to `tmp/issue80-webkit.config.ts` to preserve its relative paths.
- Strict OpenSpec, document links and whitespace checks pass.

The full main suite includes all 21 new run-flow cases across desktop and both mobile orientations. Command outputs (trailing whitespace normalized) and both WebKit orientations' receipts/screenshots are retained in the evidence directory. No forced state or outcome is used for legal full-run evidence; storage corruption/unavailability cases are explicitly failure injection.

The caller accepted Playwright as sufficient current-state certification. These results identify desktop engines with device emulation accurately; they add no physical-browser claim, deployment, merge or parent-epic closure. #64/#66 remain separate follow-ups and #81 retains broader playtest/tuning. Historical baseline WebKit sizing and performance-collector gaps are retained under #57's accepted disposition; no all-browser hardware frame-budget claim is added here.

## Build size comparison

The exact base archive and implementation were built on the same host with locked
dependencies and equivalent Vite production settings. All emitted JS/CSS totals
401,929 versus 415,123 gzip bytes (+13,194 bytes). Static asset bytes are unchanged.
The run entry is lazy loaded; the all-bundle total includes routes that are not all
fetched by one entry. This is local gzip accounting rather than measured CDN/network
transfer or hardware frame-budget evidence. See [raw inventories](issue-80/build-comparison.json).
The initial baseline comparison failed because npm's prefix invocation selected an
incorrect install context; a direct npm ci in the temporary baseline and a successful
complete build replaced that invalid partial inventory.

Delivery: [PR #120](https://github.com/luminari-gurus/tactics-guru-v2/pull/120). OpenSpec tasks are complete; the PR remains open for review.

## PR review corrections — 2026-10-16

All three [review findings](https://github.com/luminari-gurus/tactics-guru-v2/pull/120#issuecomment-6205563219) were reproduced on the reported application revision `5a9d5e3ffe41860936775bc1cb58daaeac31deef` before app changes. The three new desktop browser regressions failed at the reported hidden-scene, missing-unsaved-control and missing-backup-export assertions. [Pre-fix output](issue-80/review-red.txt) and [test/source identity](issue-80/review-red-source.json) are retained.

The fix at `f0b2e8d` gives the mounted item screen two explicit live-host actions: Continue uses the existing host boundary/battle lifecycle, and recovery uses the same retained-aware UI as startup and in-battle recovery. Failed Continue inspection also uses that host recovery path. The standalone item fixture retains its existing default behavior. Startup now offers Play unsaved run when inspected reads are unavailable and no usable save is selected, covering slot-read errors as well as acquisition failure. The domain, save format and storage adapter are unchanged.

The new browser checks reach defeat through legal Wait actions, remove primary through actual recovery controls and verify the restored backup's exact continuation snapshot with a visible board. Separate read-level failure injection preserves both original stored byte strings with zero writes/removals while play continues unsaved. Partial-reset failure injection deletes backup before primary removal fails; closing/reopening normal recovery still downloads JSON containing the exact deleted backup text. These are controlled read/removal-failure tests, not injected battle outcomes.

Focused desktop verification passed all three regressions; the full unit suite passed 654 tests. The production build includes 167 passing content checks and both passing typechecks. All 30 run-flow cases, 21 standalone item cases and six focused WebKit review regressions passed without retries or skips. See the [review validation receipt and source hashes](issue-80/review-validation.json). Initial integration evidence above remains historical; it is not presented as a full repository-wide rerun of the review-fix revision.

Review verification commands:

- `npm run test:unit`: 654 passed.
- `npm run build`: 167 content checks, both typechecks and production build passed; existing large-chunk warning remains.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npx playwright test tests/run-progression.spec.ts`: 30 passed ([output](issue-80/review-run-matrix.txt)).
- The same executable with `npx playwright test -c playwright.run-items.config.ts`: 21 passed ([output](issue-80/review-item-matrix.txt)).
- `npx playwright test -c tmp/issue120-review-webkit.config.ts`: six passed ([output](issue-80/review-webkit.txt)). The first CLI-filter attempt selected zero tests because it intersected the existing config filter; the retained [focused config](issue-80/review-webkit.config.ts.txt) selects the intended cases. Restore both this config and the original WebKit config to their `tmp/` paths to reproduce.
- Strict OpenSpec, relative documentation links and whitespace checks passed. The full repository-wide browser suite was not rerun for these two UI-module changes; its initial integration results above remain historical.

For `f0b2e8d`, all-bundle local gzip accounting is 415,172 bytes, +13,243 versus the base (49 bytes more than initial delivery), with unchanged media bytes ([review inventory](issue-80/review-build-comparison.json)). This does not assert network-transfer or hardware budgets. No domain/save-format/storage-adapter change, merge or manual deployment is included in the review fix.

## Recovery dismissal focus follow-up — 2026-10-16

The [new review finding](https://github.com/luminari-gurus/tactics-guru-v2/pull/120#issuecomment-6214466687) was reproduced on `85ed3d6`: both Escape and explicit Close failed the focused-control assertion after preparation recovery was dismissed ([pre-fix output](issue-80/focus-red.txt)).

Fix `a8bc639` uses one recovery-close callback for both paths. On boundary screens it renders first and focuses the newly created Save recovery control. In battle mode it does not rerender; existing native modal return focus stays on the mounted recovery button. The shared BattleDialogs and item component are unchanged by this follow-up.

The two keyboard tests verify connected, visible, focused and in-viewport recovery controls after both Escape and Close, at preparation, startup and battle. Run snapshots remain unchanged. Verification on the clean fix revision:

- `npm run test:unit`: 654 passed.
- `npm run build`: 167 content checks, both typechecks and build passed; existing bundle warning remains.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npx playwright test tests/run-progression.spec.ts --grep 'review:|run startup preserves|44px controls'`: all 21 affected checks passed across desktop and mobile portrait/landscape, including previous review regressions ([output](issue-80/focus-matrix.txt)).
- `npx playwright test -c tmp/issue120-focus-webkit.config.ts`: all four focus cases passed in iPhone-sized WebKit portrait/landscape ([output](issue-80/focus-webkit.txt), [config](issue-80/focus-webkit.config.ts.txt)). Restore the existing base WebKit config and focus config to their `tmp/` paths to reproduce.
- Strict OpenSpec, document links and whitespace checks passed. No full repository-wide browser rerun is claimed for this one callback correction. See [source-bound validation](issue-80/focus-validation.json).
